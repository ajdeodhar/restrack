'use client';

import { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import type { ImportSourceDetail } from '@/types';

interface Props {
  sourceId: string;
  onClose: () => void;
}

export default function SourceViewerModal({ sourceId, onClose }: Props) {
  const [detail, setDetail] = useState<ImportSourceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    fetch(`/api/import-sources/${sourceId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDetail(d?.source ?? null))
      .finally(() => setLoading(false));
  }, [sourceId]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl max-h-[80vh] flex flex-col p-5 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 gap-2">
          <h3 className="text-sm font-semibold text-slate-200 truncate">
            {detail?.fileName ?? 'Source'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 shrink-0"
            aria-label="Close source viewer"
          >
            <X size={14} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm py-8 justify-center">
            <Loader2 size={14} className="animate-spin" /> Loading...
          </div>
        ) : !detail ? (
          <p className="text-sm text-slate-500">Couldn&apos;t load this source.</p>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-3">
              Uploaded {new Date(detail.uploadedAt).toLocaleString()}
              {detail.itemsFound > 0 &&
                ` — ${detail.itemsFound} profile item${detail.itemsFound === 1 ? '' : 's'} from this file`}
            </p>
            <pre className="flex-1 overflow-y-auto text-xs text-slate-300 bg-slate-900/50 border border-slate-800 rounded-lg p-3 whitespace-pre-wrap font-mono">
              {detail.extractedText}
            </pre>
            {detail.kind === 'file' && (
              <a
                href={`/api/import-sources/${detail.id}/file`}
                className="btn-secondary btn-sm mt-3 self-start"
              >
                <Download size={13} /> Download original file
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
