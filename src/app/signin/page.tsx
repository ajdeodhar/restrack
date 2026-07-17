'use client';

import { signIn } from 'next-auth/react';
import { Github, FileText } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center animate-fade-up">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-glow mb-5">
          <FileText size={24} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-1">ResTrack</h1>
        <p className="text-slate-400 text-sm mb-8">
          Tailor your resume with AI and keep every version in your own GitHub repo.
        </p>
        <button
          onClick={() => signIn('github', { callbackUrl: '/' })}
          className="btn-primary w-full"
        >
          <Github size={16} />
          Sign in with GitHub
        </button>
        <p className="text-slate-600 text-xs mt-4">
          We request repo access so ResTrack can commit tailored resumes directly to your GitHub
          repository.
        </p>
      </div>
    </div>
  );
}
