'use client';

import { useState, useRef, useEffect } from 'react';
import { Comment, User } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Pencil, Trash2, Send } from 'lucide-react';

function renderContent(content: string) {
  // Render @mentions as highlighted text
  const parts = content.split(/(@\S+)/g);
  return parts.map((part, i) =>
    /^@\S+$/.test(part) ? (
      <span key={i} className="text-honey-600 font-semibold">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

interface MentionDropdownProps {
  members: User[];
  query: string;
  onSelect: (name: string) => void;
}

function MentionDropdown({ members, query, onSelect }: MentionDropdownProps) {
  const filtered = members.filter((m) =>
    m.name.toLowerCase().startsWith(query.toLowerCase()),
  );
  if (filtered.length === 0) return null;
  return (
    <div
      className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-card shadow-lg z-50 overflow-hidden"
      style={{ borderRadius: '8px', minWidth: '160px' }}
    >
      {filtered.slice(0, 5).map((m) => (
        <button
          key={m.id}
          type="button"
          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 text-left"
          onMouseDown={(e) => { e.preventDefault(); onSelect(m.name.split(' ')[0]); }}
        >
          <Avatar name={m.name} avatarUrl={m.avatarUrl} color={m.color} size="xs" />
          {m.name}
        </button>
      ))}
    </div>
  );
}

interface CommentThreadProps {
  taskId: string;
  comments: Comment[];
  currentUserId: string | null;
  taskCreatorId: string;
  listMembers: User[];
  onAdd: (comment: Comment) => void;
  onUpdate: (comment: Comment) => void;
  onRemove: (commentId: string) => void;
}

export function CommentThread({
  taskId,
  comments,
  currentUserId,
  taskCreatorId,
  listMembers,
  onAdd,
  onUpdate,
  onRemove,
}: CommentThreadProps) {
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new comments appear
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [comments.length]);

  function handleInputChange(value: string) {
    setNewContent(value);
    // Detect @mention trigger
    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const textBefore = value.slice(0, cursorPos);
    const mentionMatch = textBefore.match(/@(\S*)$/);
    setMentionQuery(mentionMatch ? mentionMatch[1] : null);
  }

  function handleMentionSelect(firstName: string) {
    const cursorPos = textareaRef.current?.selectionStart ?? newContent.length;
    const textBefore = newContent.slice(0, cursorPos);
    const textAfter = newContent.slice(cursorPos);
    const replaced = textBefore.replace(/@(\S*)$/, `@${firstName} `);
    setNewContent(replaced + textAfter);
    setMentionQuery(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function handleSubmit() {
    if (!newContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent.trim() }),
      });
      if (res.ok) {
        const comment: Comment = await res.json();
        onAdd(comment);
        setNewContent('');
        setMentionQuery(null);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(commentId: string) {
    if (!editContent.trim()) return;
    const res = await fetch(`/api/comments/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim() }),
    });
    if (res.ok) {
      const updated: Comment = await res.json();
      onUpdate(updated);
      setEditingId(null);
    }
  }

  async function handleDelete(commentId: string) {
    const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) onRemove(commentId);
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Comments ({comments.length})
      </label>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-3 mb-3 max-h-64 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div
              key={c.id}
              className="flex gap-2.5 group animate-in slide-in-from-bottom-1 duration-200"
            >
              <Avatar name={c.author.name} avatarUrl={c.author.avatarUrl} color={c.author.color} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-semibold text-gray-700">{c.author.name}</span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(parseISO(c.createdAt), { addSuffix: true })}
                  </span>
                  {c.updatedAt !== c.createdAt && (
                    <span className="text-xs text-gray-400">(edited)</span>
                  )}
                </div>

                {editingId === c.id ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full text-sm bg-gray-50 border border-honey-300 rounded-button px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-honey-500"
                      style={{ borderRadius: '8px' }}
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(c.id)}
                        className="text-xs bg-honey-500 text-white px-2.5 py-1 rounded-chip font-medium hover:bg-honey-600 transition-colors"
                        style={{ borderRadius: '6px' }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-500 px-2.5 py-1 rounded-chip hover:bg-gray-100 transition-colors"
                        style={{ borderRadius: '6px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed break-words">
                    {renderContent(c.content)}
                  </p>
                )}
              </div>

              {/* Action buttons (own comments or task creator) */}
              {editingId !== c.id && (
                <div className="flex items-start gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {c.authorId === currentUserId && (
                    <button
                      type="button"
                      onClick={() => { setEditingId(c.id); setEditContent(c.content); }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                  {(c.authorId === currentUserId || currentUserId === taskCreatorId) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input area */}
      <div className="relative">
        {mentionQuery !== null && (
          <MentionDropdown
            members={listMembers}
            query={mentionQuery}
            onSelect={handleMentionSelect}
          />
        )}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newContent}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
                if (e.key === 'Escape') setMentionQuery(null);
              }}
              placeholder="Write a comment… (Ctrl+Enter to send)"
              rows={2}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-button px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-honey-500 focus:border-transparent placeholder-gray-400"
              style={{ borderRadius: '8px' }}
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!newContent.trim() || submitting}
            className="p-2.5 bg-honey-500 text-white rounded-button hover:bg-honey-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            style={{ borderRadius: '8px' }}
            title="Send (Ctrl+Enter)"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
