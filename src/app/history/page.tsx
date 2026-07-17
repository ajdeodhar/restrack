'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Trash2, Clock } from 'lucide-react';
import { useToast } from '@/components/Toast';
import type { Application } from '@/types';

export default function HistoryPage() {
  const toast = useToast();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const load = () =>
    fetch('/api/applications')
      .then((r) => r.json())
      .then((d) => {
        setApps(d.applications ?? []);
        setLoading(false);
      });

  useEffect(() => {
    load();
  }, []);

  const del = async (id: string) => {
    await fetch('/api/applications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setApps((prev) => prev.filter((a) => a.id !== id));
    toast.info('Application entry deleted.');
  };

  const filtered = apps.filter(
    (a) =>
      !filter ||
      a.company.toLowerCase().includes(filter.toLowerCase()) ||
      a.role.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 animate-fade-up">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center shrink-0">
          <Clock size={18} className="text-brand-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Application History</h1>
          <p className="text-slate-400 text-sm">Every resume change, organized by company and role.</p>
        </div>
      </div>

      <div className="mb-5">
        <input
          className="input max-w-sm"
          placeholder="Filter by company or role..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-700 rounded-xl">
          <p className="text-slate-500 text-sm">
            {apps.length === 0
              ? 'No applications tracked yet. Tailor your first resume in the Editor.'
              : 'No results for this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <div key={app.id} className="card overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <div className="truncate">
                    <span className="font-medium text-slate-100 text-sm">{app.role}</span>
                    <span className="text-slate-400 text-sm"> @ </span>
                    <span className="font-medium text-slate-100 text-sm">{app.company}</span>
                  </div>
                  {app.changes[0] && (
                    <span className="hidden md:block text-xs text-slate-500 italic truncate">
                      {app.changes[0].summary}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">
                      {new Date(app.appliedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    {app.commitHash && (
                      <a
                        href={app.commitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-400 hover:text-brand-300 font-mono flex items-center gap-1"
                      >
                        {app.commitHash}
                        <ExternalLink size={9} />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                      className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded transition-colors"
                      aria-label={expanded === app.id ? 'Collapse details' : 'Expand details'}
                    >
                      {expanded === app.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => del(app.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
                      aria-label="Delete application"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded */}
              {expanded === app.id && (
                <div className="border-t border-slate-700/80 px-4 py-4 space-y-4 animate-fade-in">
                  {app.commitMessage && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Commit Message</div>
                      <code className="text-xs text-slate-300 bg-slate-900 px-2 py-1 rounded block">
                        {app.commitMessage}
                      </code>
                    </div>
                  )}

                  {app.instruction && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Edit Request</div>
                      <p className="text-sm text-slate-300">{app.instruction}</p>
                    </div>
                  )}

                  {app.changes.map((change, i) => (
                    <div key={i}>
                      <div className="text-xs text-slate-500 mb-2">
                        Change in <span className="text-slate-400 font-medium">{change.section}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg overflow-hidden border border-red-900/40">
                          <div className="text-xs px-2 py-1 bg-red-950/30 text-red-400 font-medium">
                            Before
                          </div>
                          <pre className="text-xs p-2 text-red-300 bg-red-950/10 whitespace-pre-wrap font-mono overflow-x-auto">
                            {change.oldText}
                          </pre>
                        </div>
                        <div className="rounded-lg overflow-hidden border border-emerald-900/40">
                          <div className="text-xs px-2 py-1 bg-emerald-950/30 text-emerald-400 font-medium">
                            After
                          </div>
                          <pre className="text-xs p-2 text-emerald-300 bg-emerald-950/10 whitespace-pre-wrap font-mono overflow-x-auto">
                            {change.newText}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}

                  {app.jobDescription && (
                    <details className="text-xs">
                      <summary className="text-slate-500 cursor-pointer hover:text-slate-400">
                        Job Description
                      </summary>
                      <pre className="mt-2 text-slate-400 whitespace-pre-wrap bg-slate-900 p-3 rounded-lg overflow-x-auto">
                        {app.jobDescription}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
