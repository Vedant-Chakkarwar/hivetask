'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarGroup } from '@/components/ui/AvatarGroup';
import { Plus, X, List } from 'lucide-react';
import { useCryptoStore } from '@/stores/cryptoStore';
import { generateListKey, encryptLEKForMember, importPublicKey } from '@/lib/crypto';

interface ListSummary {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  createdById: string;
  members: { id: string; name: string; avatarUrl: string | null; color: string }[];
  taskCount: number;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  color: string;
}

const PRESET_COLORS = [
  '#F59E0B', '#EF4444', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#6366F1', '#84CC16',
];

const EMOJI_OPTIONS = ['📋', '🚀', '💡', '🎯', '📌', '🔥', '⭐', '🏆', '🌟', '💎', '🛠️', '📊'];

interface ListsClientProps {
  initialLists: ListSummary[];
  allUsers: User[];
  currentUserId: string;
}

export function ListsClient({ initialLists, allUsers, currentUserId }: ListsClientProps) {
  const router = useRouter();
  const [lists, setLists] = useState<ListSummary[]>(initialLists);
  const { privateKey, publicKeyJwk, cacheListKey } = useCryptoStore();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState('📋');

  function resetForm() {
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0]);
    setIcon('📋');
    setShowCreate(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      // Generate LEK and encrypt for the creator (self) if crypto keys are available
      let keyShares: Array<{ userId: string; encryptedLEK: string; iv: string; senderUserId: string }> | undefined;
      let lek: CryptoKey | undefined;
      if (privateKey && publicKeyJwk) {
        try {
          lek = await generateListKey();
          const myPublicKey = await importPublicKey(publicKeyJwk);
          const { encryptedLEK, iv } = await encryptLEKForMember(lek, privateKey, myPublicKey);
          keyShares = [{ userId: currentUserId, encryptedLEK, iv, senderUserId: currentUserId }];
        } catch {
          // Crypto setup failed — create list without encryption
        }
      }

      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          icon,
          keyShares,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        // Cache the LEK immediately so the new board doesn't need to re-fetch
        if (lek) cacheListKey(created.id, lek);
        const summary: ListSummary = {
          id: created.id,
          name: created.name,
          description: created.description,
          color: created.color,
          icon: created.icon,
          createdById: created.createdById,
          members: created.members,
          taskCount: 0,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        };
        setLists((prev) => [summary, ...prev]);
        resetForm();
        router.push(`/lists/${created.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Lists</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {lists.length} {lists.length === 1 ? 'list' : 'lists'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-button shadow-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#F59E0B', borderRadius: '8px' }}
        >
          <Plus size={16} />
          New List
        </button>
      </div>

      {/* Lists grid */}
      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">🐝</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No lists yet</h2>
          <p className="text-gray-400 mb-6">Create your first task list to get started</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-button"
            style={{ backgroundColor: '#F59E0B', borderRadius: '8px' }}
          >
            <Plus size={16} /> Create a List
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => router.push(`/lists/${list.id}`)}
              className="bg-white rounded-card shadow-card hover:shadow-card-hover transition-all duration-200 text-left overflow-hidden group hover:-translate-y-0.5"
              style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            >
              {/* Color header */}
              <div
                className="h-2 w-full"
                style={{ backgroundColor: list.color }}
              />
              <div className="p-4">
                <div className="flex items-start gap-2.5 mb-3">
                  <span className="text-2xl flex-shrink-0">{list.icon ?? '📋'}</span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate group-hover:text-honey-600 transition-colors">
                      {list.name}
                    </h3>
                    {list.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{list.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <AvatarGroup users={list.members} max={4} size="xs" />
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <List size={11} />
                    {list.taskCount}
                  </span>
                </div>
              </div>
            </button>
          ))}

          {/* Create new card */}
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="bg-white/60 rounded-card border-2 border-dashed border-gray-200 hover:border-honey-300 hover:bg-white text-gray-400 hover:text-honey-600 transition-all duration-200 p-4 flex flex-col items-center justify-center gap-2 min-h-[120px]"
            style={{ borderRadius: '12px' }}
          >
            <Plus size={24} />
            <span className="text-sm font-medium">New List</span>
          </button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card w-full max-w-md shadow-2xl" style={{ borderRadius: '12px' }}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Create New List</h2>
              <button
                type="button"
                onClick={resetForm}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-button"
                style={{ borderRadius: '8px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">List Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Product Roadmap"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-honey-500"
                  style={{ borderRadius: '8px' }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this list for?"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button resize-none focus:outline-none focus:ring-2 focus:ring-honey-500 placeholder-gray-400"
                  style={{ borderRadius: '8px' }}
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        outline: color === c ? `3px solid ${c}` : 'none',
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Icon</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setIcon(e)}
                      className={`w-9 h-9 text-xl rounded-button transition-all hover:bg-gray-100 ${
                        icon === e ? 'bg-honey-100 ring-2 ring-honey-400' : 'bg-gray-50'
                      }`}
                      style={{ borderRadius: '8px' }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-card overflow-hidden border border-gray-100" style={{ borderRadius: '12px' }}>
                <div className="h-1.5" style={{ backgroundColor: color }} />
                <div className="p-3 flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <span className="font-semibold text-gray-800 text-sm">{name || 'List Name'}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={!name.trim() || creating}
                  className="flex-1 py-2.5 text-sm font-semibold text-white rounded-button disabled:opacity-50"
                  style={{ backgroundColor: '#F59E0B', borderRadius: '8px' }}
                >
                  {creating ? 'Creating...' : 'Create List'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-button hover:bg-gray-50"
                  style={{ borderRadius: '8px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
