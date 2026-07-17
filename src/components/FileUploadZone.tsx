'use client';

import { useRef, useState } from 'react';
import { UploadCloud, AlertTriangle, Loader2 } from 'lucide-react';

const MAX_BYTES = 5 * 1024 * 1024;

interface FileUploadZoneProps {
  repoLinked: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
}

export default function FileUploadZone({ repoLinked, uploading, onUpload }: FileUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const disabled = !repoLinked || uploading;

  const validateAndUpload = (file: File | undefined) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.tex') && !lower.endsWith('.pdf')) {
      setLocalError('Only .tex and .pdf files are supported.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError('File exceeds the 5MB limit.');
      return;
    }
    setLocalError(null);
    onUpload(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) validateAndUpload(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`card flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed transition-colors ${
          disabled
            ? 'opacity-60 cursor-not-allowed border-slate-800'
            : dragOver
              ? 'border-brand-400 bg-brand-500/5 cursor-pointer'
              : 'border-slate-700 hover:border-slate-600 cursor-pointer'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".tex,.pdf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            validateAndUpload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {uploading ? (
          <Loader2 size={22} className="animate-spin text-brand-300" />
        ) : (
          <UploadCloud size={22} className="text-slate-500" />
        )}
        <p className="text-sm text-slate-300">
          {uploading ? 'Uploading and processing...' : 'Drag & drop a .tex or .pdf, or click to browse'}
        </p>
        <p className="text-xs text-slate-500">Max 5MB</p>
      </div>

      {!repoLinked && (
        <div className="flex items-center gap-2 mt-2 text-xs text-amber-400">
          <AlertTriangle size={13} />
          Link a GitHub repo in Settings before uploading a resume.
        </div>
      )}
      {localError && <div className="text-xs text-red-400 mt-2">{localError}</div>}
    </div>
  );
}
