'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Loader2,
  Sparkles,
  ExternalLink,
  CheckCircle,
  Download,
  AlertCircle,
  Plus,
  RotateCcw,
} from 'lucide-react';
import LatexViewer from '@/components/LatexViewer';
import { useToast } from '@/components/Toast';
import { openInOverleaf } from '@/lib/overleaf';
import type { ResumeDraft } from '@/types';

const SECTIONS = ['Skills', 'Experience', 'Projects', 'Summary'];

interface AppliedEdit {
  section: string;
  changeDescription: string;
}

interface SaveResult {
  commit_url: string;
  commit_hash: string;
  pdf_url: string | null;
  tex_download_url: string;
}

function DraftPageInner() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draftId');

  const [draft, setDraft] = useState<ResumeDraft | null>(null);
  const [loading, setLoading] = useState(true);

  // Left panel — inputs
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [section, setSection] = useState(SECTIONS[0]);
  const [changeDescription, setChangeDescription] = useState('');
  const [appliedEdits, setAppliedEdits] = useState<AppliedEdit[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Working tex + Overleaf hand-off
  const [currentTex, setCurrentTex] = useState('');
  const [finalTex, setFinalTex] = useState('');

  // Save
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);

  useEffect(() => {
    if (!draftId) return;
    fetch(`/api/resume-drafts/${draftId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
          return;
        }
        setDraft(data.draft);
        setCurrentTex(data.draft.editedTex);
        setFinalTex(data.draft.editedTex);
      })
      .finally(() => setLoading(false));
  }, [draftId, toast]);

  const hasEdits = appliedEdits.length > 0;

  const generateEdits = async () => {
    if (!changeDescription.trim()) return;
    setGenerating(true);
    setGenerateError('');

    const res = await fetch('/api/generate-edits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        original_tex: currentTex,
        role,
        company,
        section,
        change_description: changeDescription,
      }),
    });
    const data = await res.json();
    setGenerating(false);

    if (data.error) {
      setGenerateError(data.error);
      toast.error(data.error);
      return;
    }

    setCurrentTex(data.edited_tex);
    setFinalTex(data.edited_tex);
    setAppliedEdits((prev) => [...prev, { section, changeDescription }]);
    setChangeDescription('');
  };

  const saveToRestrack = async () => {
    if (!draftId) return;
    setSaving(true);
    setSaveError('');

    const res = await fetch('/api/save-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft_id: draftId,
        final_tex: finalTex,
        role,
        company,
        section: Array.from(new Set(appliedEdits.map((e) => e.section))).join(', '),
        change_description: appliedEdits.map((e) => e.changeDescription).join('; '),
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (data.error) {
      setSaveError(data.error);
      toast.error(data.error);
      return;
    }

    toast.success('Committed to GitHub successfully.');
    setSaveResult(data);
  };

  const discard = () => router.push('/editor');

  if (!draftId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-slate-500 text-sm">
        No draft specified.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <Loader2 size={20} className="animate-spin text-slate-500" />
      </div>
    );
  }

  if (saveResult) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] text-center p-8">
        <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-center mb-4">
          <CheckCircle size={20} className="text-emerald-400" />
        </div>
        <h2 className="font-semibold text-slate-200 mb-1">Committed Successfully!</h2>
        <p className="text-xs text-slate-500 mb-6">
          <a
            href={saveResult.commit_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300"
          >
            View commit {saveResult.commit_hash.slice(0, 7)} <ExternalLink size={10} className="inline" />
          </a>
        </p>
        <div className="flex gap-2 flex-wrap justify-center">
          <a
            href={saveResult.tex_download_url}
            download={`${company || 'resume'}.tex`}
            className="btn-secondary"
          >
            <Download size={14} />
            Download .tex
          </a>
          <a
            href={saveResult.pdf_url ?? undefined}
            download={`${company || 'resume'}.pdf`}
            className={`btn-secondary ${!saveResult.pdf_url ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <Download size={14} />
            Download PDF
          </a>
          <button onClick={() => router.push('/editor')} className="btn-primary">
            <Plus size={14} />
            Upload Another
          </button>
        </div>
        {!saveResult.pdf_url && (
          <p className="text-xs text-slate-600 mt-3">PDF preview unavailable — the .tex committed fine.</p>
        )}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col lg:flex-row overflow-hidden">
      {/* LEFT PANEL — inputs */}
      <div className="w-full lg:w-[300px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col p-5 overflow-y-auto">
        <h2 className="text-sm font-semibold text-slate-200 mb-1">Resume Edit Inputs</h2>
        <p className="text-xs text-slate-500 mb-4">
          Describe an edit, generate it, then repeat for as many changes as you need.
        </p>

        <div className="space-y-3">
          <div>
            <label className="field-label">Role</label>
            <input className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="SWE Intern" />
          </div>
          <div>
            <label className="field-label">Company</label>
            <input
              className="input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="DoorDash"
            />
          </div>
          <div>
            <label className="field-label">Section</label>
            <select className="input" value={section} onChange={(e) => setSection(e.target.value)}>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Change Description</label>
            <textarea
              rows={5}
              className="textarea"
              placeholder="e.g. Add Python and Rust skills for backend role"
              value={changeDescription}
              onChange={(e) => setChangeDescription(e.target.value)}
            />
          </div>

          {generateError && (
            <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-900/40 rounded-lg text-red-400 text-xs">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              {generateError}
            </div>
          )}

          <button
            onClick={generateEdits}
            disabled={generating || !changeDescription.trim()}
            className="btn-primary w-full"
          >
            {generating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generate Edits
              </>
            )}
          </button>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          {hasEdits ? (
            <span className="text-emerald-400">Ready to review in Overleaf</span>
          ) : (
            <span>Waiting for Overleaf...</span>
          )}
        </div>

        {hasEdits && (
          <div className="mt-4 space-y-1.5">
            <p className="field-label mb-1">Applied edits</p>
            {appliedEdits.map((e, i) => (
              <div key={i} className="text-xs text-slate-400 card p-2">
                <span className="text-slate-300 font-medium">{e.section}</span>: {e.changeDescription}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT PANEL — Overleaf hand-off */}
      <div className="flex-1 flex flex-col overflow-y-auto p-5">
        {!hasEdits ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="text-slate-600 text-sm max-w-xs">
              Enter your inputs on the left, then click Generate Edits.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                Edited resume — {currentTex.split('\n').length} lines
              </div>
              <button onClick={() => openInOverleaf(currentTex, company || 'resume')} className="btn-secondary btn-sm">
                <ExternalLink size={12} />
                Open in Overleaf
              </button>
            </div>

            <div className="h-64 shrink-0 bg-slate-950 rounded-lg border border-slate-800 p-3">
              <LatexViewer content={currentTex} className="h-full" />
            </div>

            <div className="shrink-0">
              <label className="field-label">
                Final .tex (edit in Overleaf, then paste your final version back here)
              </label>
              <textarea
                rows={8}
                className="textarea font-mono"
                value={finalTex}
                onChange={(e) => setFinalTex(e.target.value)}
              />
            </div>

            {saveError && (
              <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-900/40 rounded-lg text-red-400 text-sm shrink-0">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {saveError}
              </div>
            )}

            <div className="flex gap-2 flex-wrap shrink-0">
              <button onClick={saveToRestrack} disabled={saving} className="btn-success flex-1">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {saving ? 'Saving...' : 'Save to ResTrack'}
              </button>
              <button onClick={discard} className="btn-secondary">
                <RotateCcw size={14} />
                Discard & Start Over
              </button>
              <button onClick={discard} className="btn-secondary">
                <Plus size={14} />
                Upload Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DraftPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-56px)]">
          <Loader2 size={20} className="animate-spin text-slate-500" />
        </div>
      }
    >
      <DraftPageInner />
    </Suspense>
  );
}
