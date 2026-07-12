# ResumeAI

An AI-powered tool for tailoring a LaTeX resume to each job application. It edits your resume with Claude, keeps every change grounded in your real experience via a structured "master profile," pushes the result straight to a GitHub repo, and tracks which edits went out for which company/role.

## Features

- **AI-assisted editing** — describe what you want changed in plain English; Claude proposes a precise, verbatim-verified diff against your LaTeX source.
- **Master profile** — a structured store of your experience, projects, education, skills, hackathons, and achievements. Import an existing resume to auto-populate it, or add items by hand.
- **GitHub sync** — fetches and pushes your `.tex` file directly to a GitHub repo via a Personal Access Token, so every tailored version is a real, reviewable commit.
- **PDF compile** — optional local `pdflatex` compilation with a graceful fallback if it's not installed.
- **Application history** — every push is logged with the company, role, job description, instruction, diff, and commit link.

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Anthropic SDK · Octokit

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and go to **Settings** to configure:

- An Anthropic API key
- A GitHub Personal Access Token (needs `repo` scope)
- The GitHub owner/repo and file path where your `resume.tex` lives
- The branch to commit to

Use the **Test API Key** / **Test Connection** buttons to verify both before doing anything else.

## Typical workflow

1. **Profile** — import your existing resume (Claude extracts structured items) or add entries manually.
2. **Editor** — fetch your resume from GitHub, describe the edit you want (optionally with a job description for context), review the AI-proposed diff, then push it as a commit.
3. **History** — see every past tailored version, its commit, and the diff that produced it.

## Project structure

```
src/
  app/                 Pages (dashboard, editor, profile, settings, history) + API routes
  components/          Navigation, Toast, DiffViewer, LatexViewer, ProfileItemCard
  lib/
    claude.ts          Structured AI editing (apply_resume_edit tool) + profile import + validation
    github.ts          Fetch/push the LaTeX file via Octokit
    latex.ts           Optional PDF compilation via pdflatex
    storage.ts         JSON file storage in data/ (gitignored) — settings, profile, applications
```

`data/` holds local state (API keys, profile, application history) and is gitignored — it never leaves your machine except for the resume file itself, which is pushed to your configured GitHub repo.
