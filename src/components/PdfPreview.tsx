'use client';

import { Loader2, AlertTriangle } from 'lucide-react';

interface PdfPreviewProps {
  pdfUrl: string | null;
  compiling: boolean;
  error?: string;
}

export default function PdfPreview({ pdfUrl, compiling, error }: PdfPreviewProps) {
  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
      {pdfUrl ? (
        <iframe src={pdfUrl} title="Compiled resume PDF" className="w-full h-full" />
      ) : (
        !compiling &&
        !error && (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            Start editing to see a live preview
          </div>
        )
      )}

      {compiling && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Compiling...
          </div>
        </div>
      )}

      {error && !compiling && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 p-4">
          <div className="flex items-start gap-2 text-red-300 text-sm max-w-sm">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
