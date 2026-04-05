'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';

interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  listId: string;
  list: { id: string; name: string; color: string; icon: string | null };
  column: { id: string; name: string } | null;
  assignees: { id: string; userId: string; user: { id: string; name: string; avatarUrl: string | null; color: string }; completed: boolean }[];
  labels: { id: string; name: string; color: string }[];
}

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  // Run search on mount if URL has ?q=
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    if (q) {
      setQuery(q);
      doSearch(q);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (value) params.set('q', value);
      router.replace(`/search${value ? `?${params.toString()}` : ''}`, { scroll: false });
      doSearch(value);
    }, 300);
  }

  // Group results by list
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const key = r.list.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-gray-800 mb-4">Search</h1>

      {/* Search input */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search tasks across all your lists…"
          autoFocus
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-card shadow-sm focus:outline-none focus:ring-2 focus:ring-honey-500 focus:border-transparent"
          style={{ borderRadius: '12px' }}
        />
      </div>

      {/* Results */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-card animate-pulse" style={{ borderRadius: '12px' }} />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Search size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-sm">No results for &quot;{query}&quot;</p>
          <p className="text-xs mt-1">Try different keywords or check your filters</p>
        </div>
      )}

      {!loading && !searched && (
        <div className="text-center py-12 text-gray-400">
          <Search size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Type to search across all your tasks</p>
          <p className="text-xs mt-1 font-mono">⌘K from anywhere to focus search</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-6">
          <p className="text-xs text-gray-500">{results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;</p>
          {Object.entries(grouped).map(([, groupResults]) => {
            const list = groupResults[0].list;
            return (
              <div key={list.id}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: list.color }} />
                  <span className="text-sm font-semibold text-gray-600">
                    {list.icon ?? '📋'} {list.name}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {groupResults.map((r) => (
                    <Link
                      key={r.id}
                      href={`/lists/${r.listId}?task=${r.id}`}
                      className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-card hover:border-honey-200 hover:shadow-sm transition-all"
                      style={{ borderRadius: '10px' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                        {r.column && (
                          <p className="text-xs text-gray-400 mt-0.5">{r.column.name}</p>
                        )}
                        {r.labels.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {r.labels.slice(0, 3).map((l) => (
                              <span
                                key={l.id}
                                className="text-xs px-1.5 py-0.5 rounded-chip text-white font-medium"
                                style={{ backgroundColor: l.color, borderRadius: '4px' }}
                              >
                                {l.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
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
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400 text-sm">Loading…</div>}>
      <SearchPageInner />
    </Suspense>
  );
}
