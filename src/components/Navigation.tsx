'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { FileText, User, History, Settings, LayoutDashboard, Menu, X, LogOut } from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/editor', label: 'Editor', icon: FileText },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname === '/signin') return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800 h-14 flex items-center px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2 mr-10 shrink-0">
        <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-brand-600 rounded-md flex items-center justify-center shadow-glow">
          <FileText size={14} className="text-white" />
        </div>
        <span className="font-semibold text-white text-sm tracking-wide">ResTrack</span>
      </Link>

      {/* Desktop links */}
      <div className="hidden sm:flex items-center gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                active
                  ? 'text-brand-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
              }`}
            >
              {active && (
                <span className="absolute inset-0 bg-brand-500/15 border border-brand-500/30 rounded-md" />
              )}
              <Icon size={14} className="relative" />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* User menu (desktop) */}
      {session?.user && (
        <div className="hidden sm:flex items-center gap-2 ml-auto">
          {session.user.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.name ?? 'User avatar'}
              className="w-6 h-6 rounded-full border border-slate-700"
            />
          )}
          <span className="text-xs text-slate-400 max-w-[10rem] truncate">{session.user.name}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/signin' })}
            className="text-slate-500 hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-800/70 transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      )}

      {/* Mobile toggle */}
      <button
        className="sm:hidden ml-auto text-slate-400 hover:text-slate-200 p-1.5"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle navigation menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="sm:hidden absolute top-14 left-0 right-0 bg-slate-900/98 backdrop-blur border-b border-slate-800 p-3 flex flex-col gap-1 animate-fade-in">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-brand-500/15 border border-brand-500/30 text-brand-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
          {session?.user && (
            <button
              onClick={() => signOut({ callbackUrl: '/signin' })}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <LogOut size={16} />
              Sign out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
