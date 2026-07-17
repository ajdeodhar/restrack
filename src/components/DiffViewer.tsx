'use client';

interface DiffViewerProps {
  oldText: string;
  newText: string;
  section: string;
}

export default function DiffViewer({ oldText, newText, section }: DiffViewerProps) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        Section: {section}
      </div>

      <div className="rounded-lg overflow-hidden border border-red-900/50 shadow-card">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/40 border-b border-red-900/30">
          <span className="text-red-400 font-bold text-sm">−</span>
          <span className="text-red-400 text-xs font-medium">Before</span>
        </div>
        <pre className="p-3 text-xs text-red-300 bg-red-950/20 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
          {oldText}
        </pre>
      </div>

      <div className="rounded-lg overflow-hidden border border-emerald-900/50 shadow-card">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/40 border-b border-emerald-900/30">
          <span className="text-emerald-400 font-bold text-sm">+</span>
          <span className="text-emerald-400 text-xs font-medium">After</span>
        </div>
        <pre className="p-3 text-xs text-emerald-300 bg-emerald-950/20 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
          {newText}
        </pre>
      </div>
    </div>
  );
}
