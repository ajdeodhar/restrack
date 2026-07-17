# ResTrack

A multi-user, AI-powered tool for tailoring a LaTeX resume to each job application. Sign in with GitHub, build a structured "master profile" of your experience, and let Claude make precise, grounded edits — pushed straight to your own GitHub repo as reviewable commits.

**Live at:** https://web-production-c741f.up.railway.app

## Features

- **Sign in with GitHub** — one login gives you an account and push access to your resume repo; no separate password or manually-pasted token.
- **AI-assisted editing** — describe what you want changed in plain English; Claude proposes a precise, verbatim-verified diff against your LaTeX source.
- **Master profile** — a structured store of your experience, projects, education, skills, hackathons, and achievements.
- **Bulk resume import** — upload multiple old resume files at once (PDF, DOCX, TXT, MD, TEX) — or paste text — and Claude extracts every item. Already-known items are automatically skipped (even when reworded across versions), so importing overlapping resume copies never creates duplicates.
- **Newest-first profile** — items are sorted by their own date (not when you added them), so recent experience always shows up first.
- **GitHub sync** — fetches and pushes your `.tex` file directly to your repo using your GitHub OAuth session, so every tailored version is a real, reviewable commit.
- **PDF compile** — optional local `pdflatex` compilation with a graceful fallback if it's not installed.
- **Application history** — every push is logged with the company, role, job description, instruction, diff, and commit link.
- **Free / paid plan** — free plan users bring their own Anthropic API key; paid plan uses ResTrack's shared server key (billing itself isn't wired up yet — it's just a per-user flag for now).

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma + Postgres · NextAuth (GitHub OAuth) · Anthropic SDK · Octokit · pdf-parse · mammoth

Deployed on [Railway](https://railway.com) (app + Postgres in one project).

## Getting started locally

```bash
npm install
npx prisma migrate deploy   # or `prisma migrate dev` against a fresh DB
npm run dev
```

You'll need a `.env.local` with:

```
DATABASE_URL=              # Postgres connection string
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=           # any random string
GITHUB_CLIENT_ID=          # from a GitHub OAuth App (repo scope)
GITHUB_CLIENT_SECRET=
ANTHROPIC_API_KEY=         # optional — only used for "paid" plan users
```

GitHub OAuth Apps only support one callback URL each, so local dev and production need **separate** OAuth Apps (same pattern if you fork this to your own deployment): callback URL is `{origin}/api/auth/callback/github`.

## Typical workflow

1. Sign in with GitHub.
2. **Profile** — import your resume(s) (upload files or paste text; Claude extracts and dedupes structured items) or add entries manually.
3. **Settings** — point at the GitHub repo/file/branch your resume lives in.
4. **Editor** — fetch your resume, describe the edit you want (optionally with a job description for context), review the AI-proposed diff, then push it as a commit.
5. **History** — see every past tailored version, its commit, and the diff that produced it.

## Project structure

```
prisma/
  schema.prisma        User (plan, GitHub repo config), ProfileItem, Application — all user-scoped
src/
  app/                  Pages (dashboard, editor, profile, settings, history, signin) + API routes
  components/           Navigation, Toast, SessionProviderWrapper, DiffViewer, LatexViewer, ProfileItemCard
  lib/
    auth.ts             NextAuth config — GitHub OAuth (repo scope) + Prisma adapter
    session.ts          getAuthedUser() helper used by every API route
    storage.ts           Prisma-backed, per-user queries (settings, profile, applications)
    claude.ts            Structured AI editing, profile import, and semantic dedup (all via tool use)
    github.ts             Fetch/push the LaTeX file via Octokit, using the session's OAuth token
    parseResumeFile.ts   Extracts text from uploaded PDF/DOCX/TXT/MD/TEX files
    dates.ts             Best-effort parsing of free-text resume dates, used for newest-first sorting
    latex.ts              Optional PDF compilation via pdflatex
  middleware.ts          Redirects unauthenticated page requests to /signin
```

Every user's data (profile, applications, GitHub repo config) lives in Postgres, scoped by `userId` — nothing is shared between accounts.
