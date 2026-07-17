'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, User, GitBranch, Key, Clock, ArrowRight, Zap, Sparkles } from 'lucide-react';
import type { Application } from '@/types';

interface DashboardData {
  profileCount: number;
  applicationCount: number;
  recentApplications: Application[];
  aiKeyConfigured: boolean;
  settings: {
    plan: 'free' | 'paid';
    githubOwner: string;
    githubRepo: string;
    latexFilePath: string;
    branch: string;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/profile').then((r) => r.json()),
      fetch('/api/applications').then((r) => r.json()),
    ]).then(([settingsRes, profileRes, appsRes]) => {
      setData({
        aiKeyConfigured: settingsRes.settings.plan === 'paid' || settingsRes.hasOwnAnthropicKey,
        settings: settingsRes.settings,
        profileCount: profileRes.items?.length ?? 0,
        applicationCount: appsRes.applications?.length ?? 0,
        recentApplications: (appsRes.applications ?? []).slice(0, 5),
      });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="h-8 w-48 skeleton mb-2" />
        <div className="h-4 w-72 skeleton mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-20 skeleton rounded-xl" />
          <div className="h-20 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  const d = data!;
  const githubConfigured = d.settings.githubOwner && d.settings.githubRepo;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-up">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-glow shrink-0">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Dashboard</h1>
          <p className="text-slate-400 text-sm">Tailor your resume for every application.</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatusCard
          icon={<Key size={16} />}
          label="Anthropic API"
          value={d.aiKeyConfigured ? (d.settings.plan === 'paid' ? 'Shared key' : 'Connected') : 'Not set'}
          ok={d.aiKeyConfigured}
          href="/settings"
        />
        <StatusCard
          icon={<GitBranch size={16} />}
          label="GitHub Repo"
          value={
            githubConfigured ? `${d.settings.githubOwner}/${d.settings.githubRepo}` : 'Not set'
          }
          ok={!!githubConfigured}
          href="/settings"
        />
        <StatusCard
          icon={<User size={16} />}
          label="Profile Items"
          value={`${d.profileCount} items`}
          ok={d.profileCount > 0}
          href="/profile"
        />
        <StatusCard
          icon={<Clock size={16} />}
          label="Applications"
          value={`${d.applicationCount} tracked`}
          ok={true}
          href="/history"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          href="/editor"
          className="group flex items-center justify-between p-5 bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 rounded-xl transition-all shadow-glow"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-brand-100" />
              <span className="font-semibold text-white">Tailor Resume</span>
            </div>
            <p className="text-brand-100/90 text-sm">Edit with AI and push to GitHub</p>
          </div>
          <ArrowRight size={18} className="text-brand-100 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link href="/profile" className="group flex items-center justify-between p-5 card-hover">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <User size={16} className="text-slate-400" />
              <span className="font-semibold text-slate-100">Update Profile</span>
            </div>
            <p className="text-slate-400 text-sm">Add new experiences and projects</p>
          </div>
          <ArrowRight size={18} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Recent Applications */}
      {d.recentApplications.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Recent Applications</h2>
            <Link href="/history" className="text-xs text-brand-400 hover:text-brand-300">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {d.recentApplications.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between px-4 py-3 card-hover"
              >
                <div>
                  <span className="text-slate-100 text-sm font-medium">{app.role}</span>
                  <span className="text-slate-400 text-sm"> at </span>
                  <span className="text-slate-100 text-sm font-medium">{app.company}</span>
                  {app.changes[0] && (
                    <p className="text-slate-500 text-xs mt-0.5">{app.changes[0].summary}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-500">
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </div>
                  {app.commitHash && (
                    <a
                      href={app.commitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-400 hover:text-brand-300 font-mono"
                    >
                      {app.commitHash}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {d.recentApplications.length === 0 && d.profileCount === 0 && (
        <div className="text-center py-16 border border-dashed border-slate-700 rounded-xl">
          <FileText size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            Get started by{' '}
            <Link href="/settings" className="text-brand-400 hover:text-brand-300">
              configuring your settings
            </Link>{' '}
            and{' '}
            <Link href="/profile" className="text-brand-400 hover:text-brand-300">
              building your profile
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  ok,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok: boolean;
  href: string;
}) {
  return (
    <Link href={href} className="card-hover p-4 block">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-500">{icon}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
      </div>
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-slate-200 truncate">{value}</div>
    </Link>
  );
}
