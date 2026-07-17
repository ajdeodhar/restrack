'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, Download, ExternalLink } from 'lucide-react';
import TexEditor from '@/components/TexEditor';
import PdfPreview from '@/components/PdfPreview';
import DiffViewer from '@/components/DiffViewer';
import ApprovalForm from '@/components/ApprovalForm';
import { useToast } from '@/components/Toast';
import { useDebouncedCompile } from '@/lib/useDebouncedCompile';
import type { ResumeDraft } from '@/types';

interface ApproveResult {
  commitUrl: string;
  texContent: string;
}

function PreviewPageInner() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draftId');

  const [draft, setDraft] = useState<ResumeDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [tex, setTex] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [section, setSection] = useState('');
  const [changeDescription, setChangeDescription] = useState('');
  const [repoLabel, setRepoLabel] = useState('');
  const [approving, setApproving] = useState(false);
  const [approveResult, setApproveResult] = useState<ApproveResult | null>(null);

  const { pdfUrl, compiling, error: compileError } = useDebouncedCompile(tex);

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
        setTex(data.draft.editedTex);
      })
      .finally(() => setLoading(false));

    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => setRepoLabel(`${data.settings?.githubOwner}/${data.settings?.githubRepo}`));
  }, [draftId, toast]);

  const approve = async () => {
    if (!draftId) return;
    setApproving(true);
    const res = await fetch(`/api/resume-drafts/${draftId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tex_content: tex,
        role,
        company,
        section,
        change_description: changeDescription,
      }),
    });
    const data = await res.json();
    setApproving(false);

    if (data.error) {
      toast.error(data.error);
      return;
    }

    toast.success('Committed to GitHub successfully.');
    setApproveResult(data);
  };

  const discard = () => router.push('/editor');

  const downloadTex = () => {
    const blob = new Blob([tex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${company || 'resume'}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `${company || 'resume'}.pdf`;
    a.click();
  };

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

  if (approveResult) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] text-center p-8">
        <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-center mb-4">
          <CheckCircle size={20} className="text-emerald-400" />
        </div>
        <h2 className="font-semibold text-slate-200 mb-1">Committed Successfully!</h2>
        <p className="text-xs text-slate-500 mb-6">
          <a
            href={approveResult.commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300"
          >
            View commit <ExternalLink size={10} className="inline" />
          </a>
        </p>
        <div className="flex gap-2">
          <button onClick={downloadTex} className="btn-secondary">
            <Download size={14} />
            Download .tex
          </button>
          <button onClick={downloadPdf} disabled={!pdfUrl} className="btn-secondary">
            <Download size={14} />
            Download PDF
          </button>
          <button onClick={() => router.push('/editor')} className="btn-primary">
            Back to Editor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-slate-800">
          <TexEditor value={tex} onChange={setTex} className="h-full" />
        </div>
        <div className="w-1/2 p-3">
          <PdfPreview pdfUrl={pdfUrl} compiling={compiling} error={compileError} />
        </div>
      </div>

      <div className="border-t border-slate-800 max-h-64 overflow-auto p-4">
        <DiffViewer oldText={draft?.originalTex ?? ''} newText={tex} section="Full document" />
      </div>

      <div className="border-t border-slate-800 p-4">
        <ApprovalForm
          role={role}
          company={company}
          section={section}
          changeDescription={changeDescription}
          onChange={(patch) => {
            if (patch.role !== undefined) setRole(patch.role);
            if (patch.company !== undefined) setCompany(patch.company);
            if (patch.section !== undefined) setSection(patch.section);
            if (patch.changeDescription !== undefined) setChangeDescription(patch.changeDescription);
          }}
          repoLabel={repoLabel}
          approving={approving}
          onApprove={approve}
          onDiscard={discard}
        />
      </div>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-56px)]">
          <Loader2 size={20} className="animate-spin text-slate-500" />
        </div>
      }
    >
      <PreviewPageInner />
    </Suspense>
  );
}
