'use client';

import { useState, useCallback, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Wifi, WifiOff, UserPlus, X, Check, Search } from 'lucide-react';
import { TaskList, Task, Label, Column } from '@/types';
import { ViewToggle, ViewType } from './ViewToggle';
import { useCryptoStore } from '@/stores/cryptoStore';
import { encryptField, encryptTask, decryptTask, decryptTasks, importPublicKey, encryptLEKForMember } from '@/lib/crypto';
import { KanbanBoard } from './KanbanBoard';
import { ListView } from '@/components/list-view/ListView';
import { CalendarView } from '@/components/calendar/CalendarView';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { TaskForm } from '@/components/tasks/TaskForm';
import { FilterBar, FilterControls, parseFiltersFromParams, applyFiltersToList } from './FilterBar';
import { Avatar } from '@/components/ui/Avatar';
import { useSocket } from '@/hooks/useSocket';
import { Filter } from 'lucide-react';

interface BoardViewProps {
  initialList: TaskList;
  currentUserId: string | null;
}

// Inner component — uses useSearchParams (requires Suspense boundary)
function BoardViewInner({ initialList, currentUserId }: BoardViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawView = searchParams.get('view');
  const currentView: ViewType =
    rawView === 'list' || rawView === 'calendar' ? rawView : 'board';

  const [list, setList] = useState<TaskList>(initialList);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskFormColumnId, setTaskFormColumnId] = useState<string | null>(null);
  const [showFilterControls, setShowFilterControls] = useState(false);
  // Increment to force KanbanBoard re-mount after each refresh (resets DnD local state)
  const [boardKey, setBoardKey] = useState(0);

  // Invite member modal
  interface AllUser { id: string; name: string; email: string; avatarUrl: string | null; color: string; publicKey: string | null; }
  const [showInvite, setShowInvite] = useState(false);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviting, setInviting] = useState<string | null>(null); // userId being added

  const { getListKey } = useCryptoStore();

  // ─── Decrypt helpers ────────────────────────────────────────────────────────
  async function decryptListData(rawList: TaskList): Promise<TaskList> {
    const lek = await getListKey(rawList.id);
    if (!lek) return rawList;
    const decryptedColumns = await Promise.all(
      rawList.columns.map(async (col) => ({
        ...col,
        tasks: await decryptTasks(col.tasks, lek),
      })),
    );
    return { ...rawList, columns: decryptedColumns };
  }

  async function decryptOneTask(task: Task): Promise<Task> {
    const lek = await getListKey(list.id);
    if (!lek) return task;
    const decrypted = await decryptTask({ title: task.title, description: task.description }, lek);
    return { ...task, title: decrypted.title, description: decrypted.description ?? task.description };
  }

  // Decrypt initial list on mount (server sends encrypted data)
  useEffect(() => {
    decryptListData(initialList).then((decrypted) => {
      setList(decrypted);
      setBoardKey((k) => k + 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialList.id]);

  // Auto-open task from ?task= URL param (e.g., from search result navigation)
  useEffect(() => {
    const taskId = searchParams.get('task');
    if (!taskId) return;
    const allTasks = list.columns.flatMap((c) => c.tasks);
    const found = allTasks.find((t) => t.id === taskId);
    if (found) {
      setSelectedTask(found);
      // Remove the ?task= param from URL without triggering navigation
      const params = new URLSearchParams(searchParams.toString());
      params.delete('task');
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('task')]);

  // Parse filters from URL search params
  const filters = parseFiltersFromParams(searchParams);
  const filteredList = applyFiltersToList(list, filters);
  const totalTaskCount = list.columns.reduce((sum, c) => sum + c.tasks.length, 0);
  const filteredTaskCount = filteredList.columns.reduce((sum, c) => sum + c.tasks.length, 0);
  const hasFilters = filters.assignees.length > 0 || filters.priorities.length > 0 ||
    filters.labelIds.length > 0 || filters.dueDate !== null || filters.statuses.length > 0;

  // ─── Refresh ─────────────────────────────────────────────────────────────────
  const refreshList = useCallback(async () => {
    const res = await fetch(`/api/lists/${list.id}`);
    if (res.ok) {
      const updated: TaskList = await res.json();
      const decrypted = await decryptListData(updated);
      setList(decrypted);
      if (selectedTask) {
        const allTasks = decrypted.columns.flatMap((c) => c.tasks);
        setSelectedTask(allTasks.find((t) => t.id === selectedTask.id) ?? null);
      }
      setBoardKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.id, selectedTask]);

  // ─── Socket real-time handlers ────────────────────────────────────────────────
  const { isConnected, onlineUsers } = useSocket(list.id, currentUserId, {
    onTaskCreated: async (task) => {
      const decrypted = await decryptOneTask(task);
      setList((prev) => ({
        ...prev,
        columns: prev.columns.map((col) =>
          col.id === decrypted.columnId ? { ...col, tasks: [...col.tasks, decrypted] } : col,
        ),
      }));
    },
    onTaskUpdated: async (task) => {
      const decrypted = await decryptOneTask(task);
      setList((prev) => ({
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => (t.id === decrypted.id ? decrypted : t)),
        })),
      }));
      if (selectedTask?.id === decrypted.id) setSelectedTask(decrypted);
    },
    onTaskDeleted: (taskId) => {
      setList((prev) => ({
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        })),
      }));
      if (selectedTask?.id === taskId) setSelectedTask(null);
    },
    onTaskMoved: ({ taskId, toColumnId, newPosition }) => {
      setList((prev) => {
        let movedTask: Task | undefined;
        const cols = prev.columns.map((col) => {
          const filtered = col.tasks.filter((t) => {
            if (t.id === taskId) { movedTask = t; return false; }
            return true;
          });
          return { ...col, tasks: filtered };
        });
        if (!movedTask) return prev;
        const updatedTask = { ...movedTask, columnId: toColumnId, position: newPosition };
        return {
          ...prev,
          columns: cols.map((col) =>
            col.id === toColumnId
              ? { ...col, tasks: [...col.tasks, updatedTask].sort((a, b) => a.position - b.position) }
              : col,
          ),
        };
      });
      setBoardKey((k) => k + 1);
    },
    onTasksReordered: ({ columnId, tasks: orderedTasks }) => {
      const positionMap = new Map(orderedTasks.map((t) => [t.id, t.position]));
      setList((prev) => ({
        ...prev,
        columns: prev.columns.map((col) => {
          if (col.id !== columnId) return col;
          return {
            ...col,
            tasks: col.tasks
              .map((t) => ({ ...t, position: positionMap.get(t.id) ?? t.position }))
              .sort((a, b) => a.position - b.position),
          };
        }),
      }));
      setBoardKey((k) => k + 1);
    },
    onSubtaskCreated: ({ taskId, subtask }) => {
      setList((prev) => ({
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) =>
            t.id === taskId ? { ...t, subtasks: [...t.subtasks, subtask] } : t,
          ),
        })),
      }));
    },
    onSubtaskToggled: ({ taskId, subtaskId, completed }) => {
      setList((prev) => ({
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) =>
            t.id === taskId
              ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, completed } : s)) }
              : t,
          ),
        })),
      }));
    },
    onSubtaskDeleted: ({ taskId, subtaskId }) => {
      setList((prev) => ({
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) =>
            t.id === taskId
              ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) }
              : t,
          ),
        })),
      }));
    },
    onColumnCreated: (column) => {
      setList((prev) => ({
        ...prev,
        columns: [...prev.columns, { ...column, tasks: column.tasks ?? [] }],
      }));
    },
    onColumnUpdated: (partial) => {
      setList((prev) => ({
        ...prev,
        columns: prev.columns.map((c) =>
          c.id === partial.id ? { ...c, ...partial } : c,
        ),
      }));
    },
    onColumnDeleted: (columnId) => {
      setList((prev) => ({
        ...prev,
        columns: prev.columns.filter((c) => c.id !== columnId),
      }));
      setBoardKey((k) => k + 1);
    },
    onLabelCreated: (label) => {
      setList((prev) => ({ ...prev, labels: [...prev.labels, label] }));
    },
    onLabelUpdated: (label) => {
      setList((prev) => ({
        ...prev,
        labels: prev.labels.map((l) => (l.id === label.id ? label : l)),
      }));
    },
    onLabelDeleted: (labelId) => {
      setList((prev) => ({
        ...prev,
        labels: prev.labels.filter((l) => l.id !== labelId),
      }));
    },
  });

  // ─── Task operations ─────────────────────────────────────────────────────────
  async function handleTaskCreate(columnId: string, title: string) {
    const lek = await getListKey(list.id);
    const encryptedTitle = lek ? await encryptField(title, lek) : title;
    const res = await fetch(`/api/lists/${list.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: encryptedTitle, columnId }),
    });
    if (res.ok) await refreshList();
  }

  async function handleTaskFormSubmit(data: {
    title: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    assigneeIds?: string[];
    dueDate?: string | null;
    labelIds?: string[];
    columnId?: string;
  }) {
    const lek = await getListKey(list.id);
    const encryptedData = lek
      ? { ...data, ...(await encryptTask({ title: data.title, description: data.description }, lek)) }
      : data;
    const res = await fetch(`/api/lists/${list.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(encryptedData),
    });
    if (res.ok) await refreshList();
  }

  async function handleTaskUpdate(taskId: string, updates: Partial<Task>): Promise<Task> {
    const lek = await getListKey(list.id);
    let encryptedUpdates = { ...updates };
    if (lek) {
      if (updates.title !== undefined) {
        encryptedUpdates.title = await encryptField(updates.title, lek);
      }
      if (updates.description !== undefined && updates.description !== null) {
        encryptedUpdates.description = await encryptField(updates.description, lek);
      }
    }
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(encryptedUpdates),
    });
    if (!res.ok) throw new Error('Failed to update task');
    const rawUpdated: Task = await res.json();
    const updated = await decryptOneTask(rawUpdated);
    setList((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) => (t.id === taskId ? updated : t)),
      })),
    }));
    return updated;
  }

  async function handleTaskDelete(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    if (res.ok) {
      setList((prev) => ({
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        })),
      }));
      setSelectedTask(null);
    }
  }

  // ─── Column operations ────────────────────────────────────────────────────────
  async function handleColumnRename(columnId: string, name: string) {
    const res = await fetch(`/api/columns/${columnId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok)
      setList((prev) => ({
        ...prev,
        columns: prev.columns.map((c) => (c.id === columnId ? { ...c, name } : c)),
      }));
  }

  async function handleColumnChangeColor(columnId: string, color: string) {
    const res = await fetch(`/api/columns/${columnId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color }),
    });
    if (res.ok)
      setList((prev) => ({
        ...prev,
        columns: prev.columns.map((c) => (c.id === columnId ? { ...c, color } : c)),
      }));
  }

  async function handleColumnDelete(columnId: string) {
    if (!confirm('Delete this column? Tasks will be moved to the first column.')) return;
    const res = await fetch(`/api/columns/${columnId}`, { method: 'DELETE' });
    if (res.ok) await refreshList();
  }

  async function handleAddColumn(name: string) {
    const res = await fetch(`/api/lists/${list.id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const col: Column = await res.json();
      setList((prev) => ({
        ...prev,
        columns: [...prev.columns, { ...col, tasks: [] }],
      }));
    }
  }

  // ─── Label operations ─────────────────────────────────────────────────────────
  async function handleCreateLabel(name: string, color: string): Promise<Label> {
    const res = await fetch(`/api/lists/${list.id}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) throw new Error('Failed to create label');
    const label: Label = await res.json();
    setList((prev) => ({ ...prev, labels: [...prev.labels, label] }));
    return label;
  }

  async function openInviteModal() {
    setInviteSearch('');
    setShowInvite(true);
    if (allUsers.length === 0) {
      try {
        const res = await fetch('/api/users');
        if (res.ok) setAllUsers(await res.json());
      } catch { /* ignore */ }
    }
  }

  async function handleAddMember(user: AllUser) {
    setInviting(user.id);
    try {
      // Encrypt the list key for the new member if crypto is available
      let keyShare: { encryptedLEK: string; iv: string; senderUserId: string } | undefined;
      const { privateKey, getListKey } = useCryptoStore.getState();
      if (privateKey && user.publicKey && currentUserId) {
        try {
          const lek = await getListKey(list.id);
          if (lek) {
            const recipPubKey = await importPublicKey(user.publicKey);
            const { encryptedLEK, iv } = await encryptLEKForMember(lek, privateKey, recipPubKey);
            keyShare = { encryptedLEK, iv, senderUserId: currentUserId };
          }
        } catch { /* proceed without key share */ }
      }

      const res = await fetch(`/api/lists/${list.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, keyShare }),
      });

      if (res.ok) {
        const members = await res.json();
        setList((prev) => ({ ...prev, members }));
      }
    } finally {
      setInviting(null);
    }
  }

  function handleCalendarQuickAdd(_date: Date) {
    const firstCol = list.columns[0];
    if (firstCol) setTaskFormColumnId(firstCol.id);
  }

  // Online member avatars — members of this list who are currently online
  const onlineSet = new Set(onlineUsers);
  const onlineMembers = list.members.filter((m) => onlineSet.has(m.id) && m.id !== currentUserId);

  return (
    <div className="h-full flex flex-col">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 flex-shrink-0">
        {/* Top row: back + title + members + invite */}
        <div className="flex items-center gap-2 px-3 py-2 md:px-6 md:py-3 md:gap-3">
          <Link
            href="/lists"
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            title="Back to lists"
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
          <span className="text-lg flex-shrink-0">{list.icon ?? '📋'}</span>
          <h1 className="font-semibold text-gray-800 text-sm md:text-base truncate min-w-0">{list.name}</h1>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
            {list.members.length} member{list.members.length !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={openInviteModal}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-honey-700 bg-honey-50 hover:bg-honey-100 rounded-button transition-colors flex-shrink-0"
            style={{ borderRadius: '6px' }}
            title="Invite member"
          >
            <UserPlus size={13} />
            <span className="hidden sm:inline">Invite</span>
          </button>

          {/* Online presence avatars — hidden on small screens */}
          {onlineMembers.length > 0 && (
            <div className="hidden md:flex items-center gap-1 ml-1">
              <span className="text-xs text-gray-400">{onlineMembers.length + 1} online</span>
              <div className="flex -space-x-1.5">
                {onlineMembers.slice(0, 3).map((member) => (
                  <div key={member.id} className="relative" title={`${member.name} — Online`}>
                    <Avatar
                      name={member.name}
                      avatarUrl={member.avatarUrl}
                      color={member.color}
                      size="sm"
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Socket connection indicator */}
          <div className="ml-auto flex-shrink-0">
            {!isConnected && (
              <span title="Disconnected" className="text-amber-500">
                <WifiOff size={14} />
              </span>
            )}
          </div>
        </div>

        {/* Second row: Filter + ViewToggle */}
        <div className="flex items-center gap-2 px-3 pb-2 md:px-6 md:pb-3">
          <button
            type="button"
            onClick={() => setShowFilterControls((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-button transition-colors ${
              hasFilters
                ? 'bg-honey-100 text-honey-700 hover:bg-honey-200'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            style={{ borderRadius: '8px' }}
            title="Filters"
          >
            <Filter size={14} />
            {hasFilters ? `Filters (${[filters.assignees.length, filters.priorities.length, filters.labelIds.length, filters.dueDate ? 1 : 0, filters.statuses.length].reduce((a, b) => a + b, 0)})` : 'Filter'}
          </button>
          <ViewToggle currentView={currentView} />
        </div>
      </div>

      {/* Filter controls (shown when toggled) */}
      {showFilterControls && (
        <div className="px-4 py-2 bg-white border-b border-gray-100">
          <FilterControls filters={filters} listMembers={list.members} listLabels={list.labels} />
        </div>
      )}

      {/* Active filter chips bar */}
      <FilterBar
        filters={filters}
        listMembers={list.members}
        listLabels={list.labels}
        totalCount={totalTaskCount}
        filteredCount={filteredTaskCount}
      />

      {/* ── View content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto" style={{ backgroundColor: '#FFFBF0' }}>
        {currentView === 'board' && (
          <KanbanBoard
            key={boardKey}
            list={filteredList}
            onTaskClick={setSelectedTask}
            onTaskCreate={handleTaskCreate}
            onTaskFormOpen={setTaskFormColumnId}
            onColumnRename={handleColumnRename}
            onColumnChangeColor={handleColumnChangeColor}
            onColumnDelete={handleColumnDelete}
            onAddColumn={handleAddColumn}
            onRefresh={refreshList}
          />
        )}

        {currentView === 'list' && (
          <ListView
            list={filteredList}
            onTaskClick={setSelectedTask}
            onTaskUpdate={handleTaskUpdate}
            onRefresh={refreshList}
            currentUserId={currentUserId ?? undefined}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView
            list={filteredList}
            onTaskClick={setSelectedTask}
            onTaskUpdate={handleTaskUpdate}
            onQuickAdd={handleCalendarQuickAdd}
          />
        )}
      </div>

      {/* ── Task Form Modal ───────────────────────────────────────────────────── */}
      {taskFormColumnId && (
        <TaskForm
          listId={list.id}
          columnId={taskFormColumnId}
          members={list.members}
          labels={list.labels}
          onSubmit={handleTaskFormSubmit}
          onClose={() => setTaskFormColumnId(null)}
        />
      )}

      {/* ── Task Detail Slide-over ────────────────────────────────────────────── */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          listMembers={list.members}
          listLabels={list.labels}
          currentUserId={currentUserId}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
          onCreateLabel={handleCreateLabel}
          onRefresh={refreshList}
        />
      )}

      {/* ── Invite Member Modal ───────────────────────────────────────────────── */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card w-full max-w-sm shadow-2xl" style={{ borderRadius: '12px' }}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Invite Members</h2>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-button"
                style={{ borderRadius: '6px' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-honey-500"
                  style={{ borderRadius: '8px' }}
                />
              </div>

              {/* User list */}
              <div className="max-h-64 overflow-y-auto space-y-1">
                {allUsers.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Loading users…</p>
                ) : (
                  (() => {
                    const currentMemberIds = new Set(list.members.map((m) => m.id));
                    const filtered = allUsers.filter(
                      (u) =>
                        !currentMemberIds.has(u.id) &&
                        (u.name.toLowerCase().includes(inviteSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(inviteSearch.toLowerCase())),
                    );
                    if (filtered.length === 0)
                      return <p className="text-xs text-gray-400 text-center py-4">No users found</p>;
                    return filtered.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-2.5 rounded-button hover:bg-gray-50"
                        style={{ borderRadius: '8px' }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                          style={{ backgroundColor: user.color }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{user.name}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddMember(user)}
                          disabled={inviting === user.id}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-honey-500 hover:bg-honey-600 rounded-button disabled:opacity-50 transition-colors flex-shrink-0"
                          style={{ borderRadius: '6px' }}
                        >
                          {inviting === user.id ? (
                            'Adding…'
                          ) : (
                            <><Check size={11} /> Add</>
                          )}
                        </button>
                      </div>
                    ));
                  })()
                )}
              </div>

              {/* Current members */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-400 mb-2">Current members</p>
                <div className="flex flex-wrap gap-2">
                  {list.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-full">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-600">{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BoardView({ initialList, currentUserId }: BoardViewProps) {
  return (
    <Suspense fallback={<div className="h-full" style={{ backgroundColor: '#FFFBF0' }} />}>
      <BoardViewInner initialList={initialList} currentUserId={currentUserId} />
    </Suspense>
  );
}
