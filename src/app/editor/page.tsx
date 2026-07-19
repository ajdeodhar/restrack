'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GitCommit, Loader2, AlertCircle } from 'lucide-react';
import FileUploadZone from '@/components/FileUploadZone';
import { useToast } from '@/components/Toast';

type LoadMode = 'github' | 'upload';

export default function EditorPage() {
  const toast = useToast();
  const router = useRouter();
  const [loadMode, setLoadMode] = useState<LoadMode>('github');
  const [repoLinked, setRepoLinked] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => setRepoLinked(Boolean(data.settings?.githubOwner && data.settings?.githubRepo)));
  }, []);

  const uploadResume = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/resume-drafts', { method: 'POST', body: formData });
    const data = await res.json();
    setUploading(false);

    if (data.error) {
      toast.error(data.error);
      return;
    }

    router.push(`/editor/draft?draftId=${data.draftId}`);
  };

  const fetchFromGithub = async () => {
    setFetching(true);
    setFetchError('');

    const fetchRes = await fetch('/api/resume/fetch');
    const fetchData = await fetchRes.json();
    if (fetchData.error) {
      setFetchError(fetchData.error);
      toast.error(fetchData.error);
      setFetching(false);
      return;
    }

    const draftRes = await fetch('/api/resume-drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tex: fetchData.content }),
    });
    const draftData = await draftRes.json();
    setFetching(false);

    if (draftData.error) {
      toast.error(draftData.error);
      return;
    }

    router.push(`/editor/draft?draftId=${draftData.draftId}`);
  };

  return (
    <div className="h-[calc(100vh-56px)] flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <div className="flex gap-1 mb-6 p-1 bg-slate-900/60 rounded-lg self-center mx-auto w-fit">
          <button
            onClick={() => setLoadMode('github')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              loadMode === 'github' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fetch from GitHub
          </button>
          <button
            onClick={() => setLoadMode('upload')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              loadMode === 'upload' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload Resume
          </button>
        </div>

        {loadMode === 'github' ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-brand-500/15 border border-brand-500/30 rounded-xl flex items-center justify-center mb-4">
              <GitCommit size={20} className="text-brand-300" />
            </div>
            <h2 className="font-semibold text-slate-200 mb-1">Fetch Your Resume</h2>
            <p className="text-slate-500 text-sm mb-6">
              Load your LaTeX file from GitHub to begin tailoring it.
            </p>
            <button onClick={fetchFromGithub} disabled={fetching} className="btn-primary">
              {fetching && <Loader2 size={14} className="animate-spin" />}
              {fetching ? 'Fetching...' : 'Fetch from GitHub'}
            </button>
            {fetchError && (
              <div className="mt-4 flex items-start gap-2 text-red-400 text-sm text-left">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {fetchError}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="font-semibold text-slate-200 mb-1 text-center">Upload Resume</h2>
            <p className="text-slate-500 text-sm mb-6 text-center">
              Upload a .tex file, or a PDF for Claude to convert to LaTeX. You&apos;ll land on the
              draft editor to review and tailor it before committing.
            </p>
            <FileUploadZone repoLinked={repoLinked} uploading={uploading} onUpload={uploadResume} />
          </div>
        )}
      </div>
    </div>
  );
}
