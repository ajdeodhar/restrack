'use client';

import { useState, useCallback } from 'react';
import {
  RefreshCw,
  Sparkles,
  GitCommit,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
} from 'lucide-react';
import DiffViewer from '@/components/DiffViewer';
import LatexViewer from '@/components/LatexViewer';
import { useToast } from '@/components/Toast';
import type { EditResult } from '@/types';

type Step = 'load' | 'edit' | 'review' | 'done';

interface PushResult {
  commitSha: string;
  commitUrl: string;
  shortSha: string;
}

export default function EditorPage() {
  const toast = useToast();
  const [step, setStep] = useState<Step>('load');

  // Context
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jd, setJd] = useState('');
  const [showJd, setShowJd] = useState(false);

  // Resume
  const [latex, setLatex] = useState('');
  const [latexSha, setLatexSha] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [fetching, setFetching] = useState(false);

  // Edit
  const [instruction, setInstruction] = useState('');
  const [saveToProfile, setSaveToProfile] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editError, setEditError] = useState('');
  const [editWarning, setEditWarning] = useState('');

  // Review
  const [editResult, setEditResult] = useState<EditResult | null>(null);
  const [commitMsg, setCommitMsg] = useState('');
  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  // Done
  const [pushResult, setPushResult] = useState<PushResult | null>(null);

  const fetchResume = useCallback(async () => {
    setFetching(true);
    setFetchError('');
    const res = await fetch('/api/resume/fetch');
    const data = await res.json();
    if (data.error) {
      setFetchError(data.error);
      toast.error(data.error);
    } else {
      setLatex(data.content);
      setLatexSha(data.sha);
      setStep('edit');
    }
    setFetching(false);
  }, [toast]);

  const generateEdit = async () => {
    if (!instruction.trim()) return;
    setGenerating(true);
    setEditError('');
    setEditWarning('');

    const res = await fetch('/api/resume/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latexContent: latex, company, role, jobDescription: jd, instruction }),
    });
    const data = await res.json();
    setGenerating(false);

    if (data.error) {
      setEditError(data.error);
      toast.error(data.error);
      return;
    }

    if (saveToProfile && data.result) {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'achievement',
          title: instruction.slice(0, 60),
          description: instruction,
          tags: [company, role].filter(Boolean),
        }),
      });
    }

    const result: EditResult = data.result;
    setEditResult(result);
    setEditWarning(data.warning ?? '');

    const msg = `[${company || 'Application'}] ${role || 'Role'}: ${result.changeSummary}`;
    setCommitMsg(msg);
    setStep('review');
  };

  const push = async () => {
    if (!editResult) return;
    setPushing(true);
    setPushError('');

    const res = await fetch('/api/resume/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedLatex: editResult.updatedLatex,
        sha: latexSha,
        commitMessage: commitMsg,
        company,
        role,
        jobDescription: jd,
        instruction,
        change: {
          section: editResult.section,
          oldText: editResult.oldText,
          newText: editResult.newText,
          summary: editResult.changeSummary,
        },
      }),
    });
    const data = await res.json();
    setPushing(false);

    if (data.error) {
      setPushError(data.error);
      toast.error(data.error);
      return;
    }

    setPushResult(data);
    toast.success('Pushed to GitHub successfully.');
    setStep('done');
  };

  const downloadPdf = async () => {
    if (!editResult) return;
    setPdfLoading(true);
    setPdfError('');
    const res = await fetch('/api/resume/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latexContent: editResult.updatedLatex }),
    });

    if (!res.ok) {
      const data = await res.json();
      setPdfError(data.error ?? 'PDF compilation failed');
      toast.error(data.error ?? 'PDF compilation failed');
      setPdfLoading(false);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-${company || 'output'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setPdfLoading(false);
  };

  const reset = () => {
    setStep('edit');
    setInstruction('');
    setEditResult(null);
    setEditError('');
    setEditWarning('');
    setPushResult(null);
    setPushError('');
    setPdfError('');
    setLatex(editResult?.updatedLatex ?? latex);
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="flex gap-3 flex-1">
          <input
            className="input w-40"
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <input
            className="input flex-1"
            placeholder="Role / Position"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowJd((v) => !v)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Job Description {showJd ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {step !== 'load' && (
          <button
            onClick={fetchResume}
            disabled={fetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
          >
            <RefreshCw size={12} className={fetching ? 'animate-spin' : ''} />
            Reload Resume
          </button>
        )}
      </div>

      {/* JD Dropdown */}
      {showJd && (
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/50 animate-fade-in">
          <textarea
            rows={4}
            className="textarea"
            placeholder="Paste the job description here (optional — Claude will use it to contextualize your edits)"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
        </div>
      )}

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-96 shrink-0 border-r border-slate-800 flex flex-col">
          {step === 'load' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 bg-brand-500/15 border border-brand-500/30 rounded-xl flex items-center justify-center mb-4">
                <GitCommit size={20} className="text-brand-300" />
              </div>
              <h2 className="font-semibold text-slate-200 mb-1">Fetch Your Resume</h2>
              <p className="text-slate-500 text-sm mb-6">
                Load your LaTeX file from GitHub to begin editing.
              </p>
              <button onClick={fetchResume} disabled={fetching} className="btn-primary">
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
          )}

          {(step === 'edit' || step === 'review') && (
            <div className="flex-1 flex flex-col p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-1">Edit Request</h2>
              <p className="text-xs text-slate-500 mb-4">
                Describe what to change — be specific about which section and what outcome you
                want.
              </p>

              {step === 'edit' ? (
                <>
                  <textarea
                    rows={8}
                    className="textarea flex-1"
                    placeholder={`Examples:\n• "Reword the Google bullet about search ranking to emphasize scalability"\n• "Add my RAG project — I built a chatbot over internal docs using LangChain + ChromaDB"\n• "Pick the most ML-relevant project from my profile for this role"`}
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                  />

                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-slate-600 bg-slate-700 text-brand-500 focus:ring-brand-500/40"
                      checked={saveToProfile}
                      onChange={(e) => setSaveToProfile(e.target.checked)}
                    />
                    <span className="text-xs text-slate-400">
                      Save this new content to master profile
                    </span>
                  </label>

                  {editError && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-red-950/30 border border-red-900/40 rounded-lg text-red-400 text-sm">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      {editError}
                    </div>
                  )}

                  <button
                    onClick={generateEdit}
                    disabled={generating || !instruction.trim()}
                    className="btn-primary mt-4"
                  >
                    {generating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        Generate Edit
                      </>
                    )}
                  </button>
                </>
              ) : (
                /* Review step left panel */
                editResult && (
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-auto">
                      <DiffViewer
                        oldText={editResult.oldText}
                        newText={editResult.newText}
                        section={editResult.section}
                      />
                      {editResult.validationNote && (
                        <div className="mt-3 text-xs text-slate-400 card p-3">
                          {editResult.validationNote}
                        </div>
                      )}
                      {editWarning && (
                        <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-950/30 border border-yellow-900/40 rounded-lg text-yellow-400 text-xs">
                          <AlertCircle size={12} className="shrink-0 mt-0.5" />
                          {editWarning}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="field-label">Commit Message</label>
                        <input
                          className="input"
                          value={commitMsg}
                          onChange={(e) => setCommitMsg(e.target.value)}
                        />
                      </div>

                      {pushError && (
                        <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-900/40 rounded-lg text-red-400 text-sm">
                          <AlertCircle size={14} className="shrink-0 mt-0.5" />
                          {pushError}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={push} disabled={pushing} className="btn-success flex-1">
                          {pushing ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Pushing...
                            </>
                          ) : (
                            <>
                              <GitCommit size={14} />
                              Push to GitHub
                            </>
                          )}
                        </button>
                        <button onClick={() => setStep('edit')} className="btn-secondary">
                          Back
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {step === 'done' && pushResult && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle size={20} className="text-emerald-400" />
              </div>
              <h2 className="font-semibold text-slate-200 mb-1">Pushed Successfully!</h2>
              <div className="text-xs text-slate-500 mb-6 space-y-1">
                <p>
                  Commit:{' '}
                  <a
                    href={pushResult.commitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-400 hover:text-brand-300 font-mono"
                  >
                    {pushResult.shortSha}
                  </a>{' '}
                  <ExternalLink size={10} className="inline" />
                </p>
                <p className="text-slate-600 italic">&ldquo;{commitMsg}&rdquo;</p>
              </div>

              <div className="space-y-2 w-full">
                <button onClick={downloadPdf} disabled={pdfLoading} className="btn-secondary w-full">
                  {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {pdfLoading ? 'Compiling...' : 'Download PDF'}
                </button>
                {pdfError && <p className="text-red-400 text-xs">{pdfError}</p>}
                <button onClick={reset} className="btn-primary w-full">
                  <Plus size={14} />
                  Make Another Edit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel — LaTeX / Updated Preview */}
        <div className="flex-1 overflow-auto bg-slate-950 p-5">
          {step === 'load' && (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-600 text-sm">Fetch your resume from GitHub to see it here.</p>
            </div>
          )}

          {(step === 'edit' || step === 'done') && latex && (
            <>
              <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                Current resume — {latex.split('\n').length} lines
              </div>
              <LatexViewer content={latex} className="h-full" />
            </>
          )}

          {step === 'review' && editResult && (
            <>
              <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                Updated resume — review before pushing
              </div>
              <LatexViewer
                content={editResult.updatedLatex}
                highlightText={editResult.newText}
                className="h-full"
              />
            </>
          )}
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 py-2 border-t border-slate-800">
        {(['load', 'edit', 'review', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-medium transition-colors ${
                step === s
                  ? 'bg-brand-500 text-white'
                  : ['load', 'edit', 'review', 'done'].indexOf(step) > i
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-600'
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${step === s ? 'text-slate-300' : 'text-slate-600'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 3 && <div className="w-6 h-px bg-slate-700" />}
          </div>
        ))}
      </div>
    </div>
  );
}
