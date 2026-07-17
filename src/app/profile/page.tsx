'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Upload, Loader2, X, File as FileIcon, History, ChevronDown } from 'lucide-react';
import ProfileItemCard from '@/components/ProfileItemCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import SourceViewerModal from '@/components/SourceViewerModal';
import { useToast } from '@/components/Toast';
import type { ProfileItem, ProfileItemType, ImportSourceSummary } from '@/types';

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.txt,.md,.tex';

const TYPES: ProfileItemType[] = [
  'experience',
  'project',
  'education',
  'skill',
  'hackathon',
  'achievement',
];

const BLANK_FORM = {
  type: 'experience' as ProfileItemType,
  title: '',
  organization: '',
  startDate: '',
  endDate: '',
  description: '',
  tags: '',
};

export default function ProfilePage() {
  const toast = useToast();
  const [items, setItems] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [addForm, setAddForm] = useState(BLANK_FORM);
  const [importText, setImportText] = useState('');
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [filterType, setFilterType] = useState<ProfileItemType | 'all'>('all');
  const [existingSources, setExistingSources] = useState<ImportSourceSummary[]>([]);
  const [pendingDuplicates, setPendingDuplicates] = useState<
    { file: File; source: ImportSourceSummary }[]
  >([]);
  const [viewingSourceId, setViewingSourceId] = useState<string | null>(null);
  const [showSourceHistory, setShowSourceHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () =>
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        setLoading(false);
      });

  const loadSources = () =>
    fetch('/api/import-sources')
      .then((r) => r.json())
      .then((d) => setExistingSources(d.sources ?? []));

  useEffect(() => {
    load();
    loadSources();
  }, []);

  const addItem = async () => {
    if (!addForm.title || !addForm.description) return;
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...addForm,
        tags: addForm.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });
    setAddForm(BLANK_FORM);
    setShowAdd(false);
    toast.success('Profile item added.');
    load();
  };

  const updateItem = async (id: string, data: Partial<ProfileItem>) => {
    await fetch(`/api/profile/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    toast.success('Profile item updated.');
    load();
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/profile/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.info('Profile item deleted.');
  };

  const addImportFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    // Snapshot synchronously — the caller resets input.value right after this
    // call, which clears the live FileList, and setState's updater callback
    // runs later (after that reset), so it must not read from `fileList` directly.
    const files = Array.from(fileList);

    const clean: File[] = [];
    const dupes: { file: File; source: ImportSourceSummary }[] = [];
    for (const f of files) {
      const match = existingSources.find((s) => s.fileName.toLowerCase() === f.name.toLowerCase());
      if (match) dupes.push({ file: f, source: match });
      else clean.push(f);
    }

    if (clean.length > 0) setImportFiles((prev) => [...prev, ...clean]);
    if (dupes.length > 0) setPendingDuplicates((prev) => [...prev, ...dupes]);
  };

  const removeImportFile = (name: string) => {
    setImportFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const confirmPendingDuplicate = () => {
    const next = pendingDuplicates[0];
    if (!next) return;
    setImportFiles((prev) => [...prev, next.file]);
    setPendingDuplicates((prev) => prev.slice(1));
  };

  const cancelPendingDuplicate = () => {
    setPendingDuplicates((prev) => prev.slice(1));
  };

  const importItems = async () => {
    if (!importText.trim() && importFiles.length === 0) return;
    setImportLoading(true);

    const formData = new FormData();
    for (const file of importFiles) formData.append('files', file);
    if (importText.trim()) formData.append('text', importText);

    const res = await fetch('/api/profile/import', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.error) {
      toast.error(data.error);
    } else {
      const skipped: string[] = (data.sources ?? [])
        .filter((s: { error?: string }) => s.error)
        .map((s: { name: string; error?: string }) => `${s.name}: ${s.error}`);

      if (data.addedCount > 0) {
        toast.success(
          `Added ${data.addedCount} new item${data.addedCount === 1 ? '' : 's'}` +
            (data.duplicateCount > 0 ? ` — skipped ${data.duplicateCount} already in your profile.` : '.')
        );
      } else if (data.duplicateCount > 0) {
        toast.info('Everything found was already in your profile — nothing new to add.');
      } else {
        toast.info('No profile items were found in what you provided.');
      }
      if (skipped.length > 0) toast.error(`Couldn't read: ${skipped.join('; ')}`);

      setImportText('');
      setImportFiles([]);
      setShowImport(false);
      load();
      loadSources();
    }
    setImportLoading(false);
  };

  const filtered = filterType === 'all' ? items : items.filter((i) => i.type === filterType);
  const counts = TYPES.reduce(
    (acc, t) => ({ ...acc, [t]: items.filter((i) => i.type === t).length }),
    {} as Record<ProfileItemType, number>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 animate-fade-up">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Master Profile</h1>
          <p className="text-slate-400 text-sm mt-1">
            {items.length} items — your complete professional history.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport((v) => !v)} className="btn-secondary btn-sm">
            <Upload size={14} />
            Import Resume
          </button>
          <button onClick={() => setShowAdd((v) => !v)} className="btn-primary btn-sm">
            <Plus size={14} />
            Add Item
          </button>
        </div>
      </div>

      {/* Import Panel */}
      {showImport && (
        <div className="mb-6 card p-5 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200">Import from Existing Resume</h3>
            <button
              onClick={() => setShowImport(false)}
              className="text-slate-500 hover:text-slate-300"
              aria-label="Close import panel"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Upload one or more resume files (PDF, Word, or plain text/LaTeX) — old copies from
            anywhere on your machine work fine. Claude extracts every experience, project,
            education entry, and skill, and automatically skips anything already in your
            profile so uploading overlapping versions won&apos;t create duplicates.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={(e) => {
              addImportFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 py-8 border border-dashed border-slate-700 hover:border-brand-500/50 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Upload size={18} />
            <span className="text-sm">Click to choose resume files</span>
            <span className="text-xs text-slate-600">PDF, DOCX, TXT, MD, TEX — multiple allowed</span>
          </button>

          {importFiles.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {importFiles.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon size={14} className="text-slate-500 shrink-0" />
                    <span className="text-sm text-slate-300 truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeImportFile(file.name)}
                    className="text-slate-500 hover:text-red-400 shrink-0"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 my-3">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs text-slate-600">or paste text</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <textarea
            rows={6}
            className="textarea font-mono"
            placeholder="Paste your resume text here..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button
            onClick={importItems}
            disabled={importLoading || (!importText.trim() && importFiles.length === 0)}
            className="btn-primary btn-sm mt-3"
          >
            {importLoading && <Loader2 size={13} className="animate-spin" />}
            {importLoading ? 'Extracting...' : 'Extract & Import'}
          </button>

          {existingSources.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowSourceHistory((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <History size={13} />
                Previously uploaded ({existingSources.length})
                <ChevronDown
                  size={13}
                  className={`transition-transform ${showSourceHistory ? 'rotate-180' : ''}`}
                />
              </button>
              {showSourceHistory && (
                <div className="mt-2 space-y-1.5">
                  {existingSources.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon size={13} className="text-slate-500 shrink-0" />
                        <span className="text-sm text-slate-300 truncate">{s.fileName}</span>
                        <span className="text-xs text-slate-600 shrink-0">
                          {new Date(s.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={() => setViewingSourceId(s.id)}
                        className="text-xs text-brand-300 hover:text-brand-200 shrink-0"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Item Panel */}
      {showAdd && (
        <div className="mb-6 card p-5 border-brand-500/40 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Add Profile Item</h3>
            <button
              onClick={() => setShowAdd(false)}
              className="text-slate-500 hover:text-slate-300"
              aria-label="Close add item panel"
            >
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="field-label">Type</label>
              <select
                className="input"
                value={addForm.type}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, type: e.target.value as ProfileItemType }))
                }
              >
                {TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Title *</label>
              <input
                className="input"
                value={addForm.title}
                onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Software Engineer Intern"
              />
            </div>
            <div>
              <label className="field-label">Organization</label>
              <input
                className="input"
                value={addForm.organization}
                onChange={(e) => setAddForm((f) => ({ ...f, organization: e.target.value }))}
                placeholder="Google"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="field-label">Start Date</label>
                <input
                  className="input"
                  value={addForm.startDate}
                  onChange={(e) => setAddForm((f) => ({ ...f, startDate: e.target.value }))}
                  placeholder="June 2024"
                />
              </div>
              <div>
                <label className="field-label">End Date</label>
                <input
                  className="input"
                  value={addForm.endDate}
                  onChange={(e) => setAddForm((f) => ({ ...f, endDate: e.target.value }))}
                  placeholder="Present"
                />
              </div>
            </div>
          </div>
          <div className="mb-3">
            <label className="field-label">Description *</label>
            <textarea
              rows={4}
              className="textarea"
              value={addForm.description}
              onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe what you did, what you built, what impact you had..."
            />
          </div>
          <div className="mb-4">
            <label className="field-label">Tags (comma-separated)</label>
            <input
              className="input"
              value={addForm.tags}
              onChange={(e) => setAddForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="Python, Machine Learning, PyTorch"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addItem}
              disabled={!addForm.title || !addForm.description}
              className="btn-primary btn-sm"
            >
              Add Item
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setAddForm(BLANK_FORM);
              }}
              className="btn-secondary btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <FilterChip
          label={`All (${items.length})`}
          active={filterType === 'all'}
          onClick={() => setFilterType('all')}
        />
        {TYPES.filter((t) => counts[t] > 0).map((t) => (
          <FilterChip
            key={t}
            label={`${t.charAt(0).toUpperCase() + t.slice(1)} (${counts[t]})`}
            active={filterType === t}
            onClick={() => setFilterType(t)}
          />
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-700 rounded-xl">
          <p className="text-slate-500 text-sm">
            No items yet. Click &ldquo;Add Item&rdquo; or &ldquo;Import Resume&rdquo; to get
            started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <ProfileItemCard
              key={item.id}
              item={item}
              onUpdate={updateItem}
              onDelete={deleteItem}
              onViewSource={setViewingSourceId}
            />
          ))}
        </div>
      )}

      {pendingDuplicates.length > 0 && (
        <ConfirmDialog
          title="File already uploaded"
          message={`"${pendingDuplicates[0].file.name}" was already uploaded on ${new Date(
            pendingDuplicates[0].source.uploadedAt
          ).toLocaleDateString()}. Would you like to view the contents before reuploading it?`}
          confirmLabel="Upload anyway"
          cancelLabel="Cancel"
          extraAction={{
            label: 'View contents',
            onClick: () => setViewingSourceId(pendingDuplicates[0].source.id),
          }}
          onConfirm={confirmPendingDuplicate}
          onCancel={cancelPendingDuplicate}
        />
      )}

      {viewingSourceId && (
        <SourceViewerModal sourceId={viewingSourceId} onClose={() => setViewingSourceId(null)} />
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`badge transition-colors ${
        active
          ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
          : 'bg-transparent border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}
