'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, Eye, EyeOff, KeyRound, Github, Sparkles } from 'lucide-react';
import { useToast } from '@/components/Toast';
import type { Plan } from '@/types';

interface SettingsForm {
  plan: Plan;
  ownAnthropicApiKey: string;
  githubOwner: string;
  githubRepo: string;
  latexFilePath: string;
  branch: string;
}

type TestStatus = 'idle' | 'loading' | 'ok' | 'error';

export default function SettingsPage() {
  const toast = useToast();
  const [form, setForm] = useState<SettingsForm>({
    plan: 'free',
    ownAnthropicApiKey: '',
    githubOwner: '',
    githubRepo: '',
    latexFilePath: 'resume.tex',
    branch: 'main',
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ghTest, setGhTest] = useState<{ status: TestStatus; error?: string }>({ status: 'idle' });
  const [aiTest, setAiTest] = useState<{ status: TestStatus; error?: string }>({ status: 'idle' });
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setForm((f) => ({ ...f, ...data.settings }));
        setLoaded(true);
      });
  }, []);

  const save = async (silent = false) => {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!silent) toast.success('Settings saved.');
  };

  const testGithub = async () => {
    await save(true);
    setGhTest({ status: 'loading' });
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'github' }),
    });
    const data = await res.json();
    setGhTest({ status: data.ok ? 'ok' : 'error', error: data.error });
    if (data.ok) toast.success('GitHub repo access verified.');
    else toast.error(data.error ?? 'GitHub connection failed.');
  };

  const testAnthropic = async () => {
    await save(true);
    setAiTest({ status: 'loading' });
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'anthropic' }),
    });
    const data = await res.json();
    setAiTest({ status: data.ok ? 'ok' : 'error', error: data.error });
    if (data.ok) toast.success('Anthropic API key verified.');
    else toast.error(data.error ?? 'Anthropic API key invalid.');
  };

  const set =
    (key: keyof SettingsForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  if (!loaded) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="h-8 w-40 skeleton mb-2" />
        <div className="h-4 w-64 skeleton mb-8" />
        <div className="space-y-6">
          <div className="h-40 skeleton rounded-xl" />
          <div className="h-64 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">
          Your plan, AI key, and the GitHub repo your resume lives in.
        </p>
      </div>

      <div className="space-y-6">
        {/* Plan */}
        <Section icon={<Sparkles size={15} />} title="Plan" description="Controls which Anthropic key powers your AI edits.">
          <div className="grid grid-cols-2 gap-3">
            <PlanCard
              active={form.plan === 'free'}
              title="Free"
              description="Bring your own Anthropic API key."
              onClick={() => setForm((f) => ({ ...f, plan: 'free' }))}
            />
            <PlanCard
              active={form.plan === 'paid'}
              title="Paid"
              description="Use ResTrack's shared key — no key of your own needed."
              onClick={() => setForm((f) => ({ ...f, plan: 'paid' }))}
            />
          </div>
          {form.plan === 'paid' && (
            <p className="text-xs text-slate-500">
              Billing isn&apos;t wired up yet — this just switches which Anthropic key your
              requests use.
            </p>
          )}
        </Section>

        {/* Anthropic (only relevant on free plan) */}
        {form.plan === 'free' && (
          <Section
            icon={<KeyRound size={15} />}
            title="Anthropic"
            description="Powers the AI editing and profile import."
          >
            <Field label="API Key">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="input pr-9"
                  value={form.ownAnthropicApiKey}
                  onChange={set('ownAnthropicApiKey')}
                  placeholder="sk-ant-..."
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </Field>
            <div className="flex items-center gap-3">
              <TestButton onClick={testAnthropic} status={aiTest.status} label="Test API Key" />
              <TestResult status={aiTest.status} error={aiTest.error} />
            </div>
          </Section>
        )}

        {/* GitHub */}
        <Section
          icon={<Github size={15} />}
          title="GitHub Repository"
          description="Where your LaTeX resume lives. GitHub access itself comes from your sign-in — just tell us which repo and file."
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="GitHub Username / Org">
              <input
                className="input"
                value={form.githubOwner}
                onChange={set('githubOwner')}
                placeholder="your-username"
              />
            </Field>
            <Field label="Repository Name">
              <input
                className="input"
                value={form.githubRepo}
                onChange={set('githubRepo')}
                placeholder="restrack"
              />
            </Field>
            <Field label="LaTeX File Path">
              <input
                className="input"
                value={form.latexFilePath}
                onChange={set('latexFilePath')}
                placeholder="resume.tex"
              />
            </Field>
            <Field label="Branch">
              <input className="input" value={form.branch} onChange={set('branch')} placeholder="main" />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <TestButton onClick={testGithub} status={ghTest.status} label="Test Connection" />
            <TestResult status={ghTest.status} error={ghTest.error} />
          </div>
        </Section>

        <div className="flex items-center gap-3">
          <button onClick={() => save()} disabled={saving} className="btn-primary">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-3 rounded-lg border transition-colors ${
        active
          ? 'bg-brand-500/15 border-brand-500/50'
          : 'bg-slate-900/40 border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className={`text-sm font-medium mb-0.5 ${active ? 'text-brand-300' : 'text-slate-200'}`}>
        {title}
      </div>
      <div className="text-xs text-slate-500">{description}</div>
    </button>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/30 text-brand-300 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function TestButton({
  onClick,
  status,
  label,
}: {
  onClick: () => void;
  status: TestStatus;
  label: string;
}) {
  return (
    <button onClick={onClick} disabled={status === 'loading'} className="btn-secondary btn-sm">
      {status === 'loading' && <Loader2 size={13} className="animate-spin" />}
      {label}
    </button>
  );
}

function TestResult({ status, error }: { status: TestStatus; error?: string }) {
  if (status === 'ok')
    return (
      <span className="flex items-center gap-1 text-emerald-400 text-sm">
        <CheckCircle size={13} /> Connected
      </span>
    );
  if (status === 'error')
    return (
      <span className="flex items-center gap-1 text-red-400 text-sm">
        <XCircle size={13} /> {error ?? 'Failed'}
      </span>
    );
  return null;
}
