'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';

interface SearchResult {
  id: string;
  title: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  listId: string;
  list: { id: string; name: string; color: string; icon: string | null };
  assignees: { id: string; userId: string; user: { id: string; name: string; avatarUrl: string | null; color: string }; completed: boolean }[];
}

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
        setResults([]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.slice(0, 8));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }

  function handleSelect(result: SearchResult) {
    router.push(`/lists/${result.listId}?task=${result.id}`);
    setOpen(false);
    setQuery('');
    setResults([]);
  }

  function handleViewAll() {
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm hidden md:block">
      {/* Trigger / input */}
      {open ? (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search tasks…"
            autoFocus
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-honey-500 focus:border-transparent"
            style={{ borderRadius: '8px' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-button hover:border-gray-300 transition-colors"
          style={{ borderRadius: '8px' }}
        >
          <Search size={14} />
          <span>Search…</span>
          <span className="ml-auto text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-mono">⌘K</span>
        </button>
      )}

      {/* Results dropdown */}
      {open && (results.length > 0 || loading) && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-card shadow-lg z-50 overflow-hidden"
          style={{ borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
        >
          {loading && results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
          ) : (
            <>
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: r.list.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                    <p className="text-xs text-gray-400">
                      {r.list.icon ?? '📋'} {r.list.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <PriorityBadge priority={r.priority} size="sm" />
                    {r.assignees.length > 0 && (
                      <div className="flex -space-x-1">
                        {r.assignees.slice(0, 2).map((a) => (
                          <Avatar
                            key={a.id}
                            name={a.user.name}
                            avatarUrl={a.user.avatarUrl}
                            color={a.user.color}
                            size="xs"
                          />
                        ))}
                        {r.assignees.length > 2 && (
                          <span className="w-4 h-4 rounded-full bg-gray-200 text-[8px] font-bold text-gray-600 flex items-center justify-center">
                            +{r.assignees.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {results.length >= 8 && (
                <button
                  type="button"
                  onClick={handleViewAll}
                  className="w-full px-3 py-2 text-xs text-honey-600 font-medium hover:bg-honey-50 transition-colors text-center"
                >
                  View all results for &quot;{query}&quot;
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
