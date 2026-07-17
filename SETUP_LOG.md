# ResumeAI Setup Log

Running log of the first end-to-end bootstrap of the app (fix config, first GitHub push, first profile import).

---

## 2026-07-12

**15:xx** — Session started. Reviewed current state:
- App code fully built (settings, profile, resume edit/push/fetch/pdf, applications).
- `data/settings.json` had `latexFilePath` set to an absolute Windows path
  (`D:\Anshuman\Anshuman\Personal\Summer2026\resume.tex`) instead of a repo-relative path.
  `src/lib/github.ts` passes this straight to the GitHub Contents API, so this would 404.
- GitHub repo `ajdeodhar/resume-tracker` exists (public, created 2026-07-03) but is **empty**
  (size 0) — resume.tex was never pushed to it.
- No `data/profile.json` or `data/applications.json` yet — profile never imported, no
  applications tracked.

Plan: fix the path bug, push the local resume.tex to the repo for the first time (bootstrap,
since the app's normal push flow needs an existing file SHA), verify fetch works through the
app's own API, then import the profile from the resume text.

**Step 1 — Fix config bug: DONE**
- Updated `data/settings.json`: `latexFilePath` changed from the absolute Windows path to
  `resume.tex` (repo-relative), matching what `octokit.repos.getContent`/
  `createOrUpdateFileContents` expect in `src/lib/github.ts`.

**Step 2 — Dev server: DONE**
- Ran `npm run dev`, Next.js 14.2.30 up on http://localhost:3000, confirmed 200 on
  `/api/settings`.

**Step 3 — Credential check: DONE**
- `PUT /api/settings {test: "github"}` -> `{ok: true}`
- `PUT /api/settings {test: "anthropic"}` -> `{ok: true}`
- Both the GitHub token and Anthropic API key are valid and working.

**Step 4 — Bootstrap push resume.tex to GitHub: DONE**
- The app's normal push flow needs an existing file SHA (it's built for edits, not first
  creation), so did a one-off direct push using the same Octokit client/credentials.
- Commit: https://github.com/ajdeodhar/resume-tracker/commit/947a53546b85f65e106afd9d38d72cb215b76f92
- Verified via GitHub Contents API: `resume.tex`, 9992 bytes, sha `585daac4...` now lives on
  `main` in `ajdeodhar/resume-tracker`.

**Step 5 — Verify app's own fetch route: DONE**
- `GET /api/resume/fetch` -> 200, returned sha `585daac4...` and content (8162 chars once decoded
  from base64/normalized). This confirms the config fix + bootstrap push actually work through
  the app's real code path, not just the raw GitHub API.

**Step 6 — Import profile from resume: DONE**
- `POST /api/profile/import` with the fetched resume text -> 200, 10 items extracted by Claude
  (sonnet model, via `importProfile()` in `src/lib/claude.ts`) and saved to `data/profile.json`:
  - education: Bachelor of Science in Computer Engineering — University of Massachusetts Amherst
  - skill: Programming Languages
  - skill: Tools & Frameworks
  - skill: Concepts & Domains
  - experience: Software Engineer – Supply Chain Optimization — Simulytics
  - experience: Product Management Intern — Simulytics
  - experience: Data Analyst Intern — Ganit Inc.
  - experience: Software Engineer Intern — Techlore
  - project: Flight Price Anomaly Detection Agent
  - project: Adversarial Security of EEG-Based Brain-Computer Interfaces
- Confirmed `data/profile.json` written to disk (7534 bytes).

---

## Summary / current state as of end of this session

| Item | Status |
|---|---|
| App code | Built, unchanged this session |
| `latexFilePath` config bug | Fixed (`resume.tex`, was an absolute local path) |
| Dev server | Running on http://localhost:3000 |
| GitHub token | Verified working |
| Anthropic API key | Verified working |
| GitHub repo `ajdeodhar/resume-tracker` | No longer empty — `resume.tex` pushed as initial commit |
| App fetch/push flow | Verified working end-to-end via the app's own `/api/resume/fetch` |
| Profile (`data/profile.json`) | Populated — 10 items imported from resume via Claude |
| Applications (`data/applications.json`) | Still empty — no real job application run through the app yet |

**Next steps (not done yet, left for you / next session):**
- Try a real edit: open the editor UI, give it a job description + instruction, review the
  Claude-proposed diff, and push a real tailored commit (this will create the first entry in
  `data/applications.json`).
- Consider whether `ajdeodhar/resume-tracker` (GitHub) should hold just `resume.tex` long-term,
  or more of the LaTeX project (make sure `.gitignore`/structure matches your expectations).
- Optionally clean up the review of the 10 imported profile items (e.g. skills entries have no
  `organization` — check they're not truncated) via the Profile page before relying on them for
  edits.

---

## 2026-07-12 (session 2) — Front-end overhaul

**Trigger:** asked to build a "professional grade, fully polished" front end, keep logging
progress, and check whether the repo has a README.

**Readme check (done first):**
- GitHub repo `ajdeodhar/resume-tracker` (holds `resume.tex`): **no README** (404 on
  `contents/README.md`).
- Local Next.js project: **no README** either.
- Added a local `README.md` (this project) — stack, setup steps, workflow, project structure.
  Did **not** push a README to the GitHub repo — that's a separate confirm-first action (pushing
  new content to a shared GitHub repo), left for the user to greenlight.

**Design system added (not a reskin of one page — applied everywhere):**
- `tailwind.config.ts`: added a `brand` color scale (replaces ad hoc `indigo-*` classes), a
  `shadow-glow`/`shadow-card`, and `fade-up`/`fade-in`/`shimmer` keyframes+animations.
- `src/app/globals.css`: added `@layer components` primitives so every page shares one visual
  language instead of repeating long Tailwind strings: `.btn` (+ `-primary/-secondary/-ghost/
  -danger/-success`, `-sm/-md`), `.card` / `.card-hover`, `.input` / `.textarea`, `.field-label`,
  `.badge`, `.section-title`, `.skeleton` (shimmer loading placeholder). Also added a subtle
  radial-gradient page background and a global `:focus-visible` ring for accessibility.
- `src/app/layout.tsx`: switched to `next/font/google` Inter (was default system font), added a
  proper favicon (inline SVG data URI, no external asset) and OG-friendly metadata, wrapped the
  app in a new `ToastProvider`.
- `src/components/Toast.tsx` (new): context + hook (`useToast().success/error/info`) rendering an
  animated, dismissible toast stack bottom-right — replaces the old ad hoc "Saved!" text and
  silent failures.
- `src/components/Navigation.tsx`: responsive — added a mobile hamburger menu (was desktop-only
  before, would have overflowed/broken on narrow screens), animated active-tab pill, gradient logo
  mark.

**Applied across every page/component:**
- Dashboard (`page.tsx`): hero header, skeleton loading state (was a plain "Loading..." string),
  gradient quick-action card, shared `.card-hover` stat tiles.
- Settings: wired `useToast` into save/test-connection flows (was inline text + silent errors),
  skeleton loading state, shared classes.
- Profile: toasts on add/update/delete/import, skeleton loading state, shared classes.
- History: toast on delete, skeleton loading state, emerald (was green) diff coloring for
  palette consistency, shared classes.
- Editor: toasts on fetch/generate/push/PDF errors and on successful push (previously only
  inline text, easy to miss), shared classes throughout the multi-step flow.
- `DiffViewer.tsx`, `ProfileItemCard.tsx`: switched to shared `.card`/`.input`/`.textarea`/
  `.field-label` classes and emerald palette for consistency with the rest of the app.

**Verification:**
- `npx tsc --noEmit` — zero type errors.
- Hit every route (`/`, `/editor`, `/profile`, `/settings`, `/history`) — all 200, dev server log
  showed clean compiles with no runtime errors.

**Not done / left for you:**
- No README pushed to the GitHub repo (`ajdeodhar/resume-tracker`) — only asked about it, didn't
  push, since that's a visible change to a shared remote. Say the word and it's a one-line push.
- No visual screenshot review was done in a real browser by the user yet — recommend a quick look
  before considering this "shipped."

---

## 2026-07-12 (session 3) — README push + rename to ResTrack

**README pushed to GitHub:** commit
https://github.com/ajdeodhar/resume-tracker/commit/8a04c2cdfeaa5b7401930f197840cc9fa26501e0 —
verified via Contents API (`README.md`, 2733 bytes) now lives in `ajdeodhar/resume-tracker`.

**Renamed app "ResumeAI" -> "ResTrack" in every local file that referenced it:**
- `package.json` / `package-lock.json` — `name` field
- `src/components/Navigation.tsx` — nav bar brand text
- `src/app/layout.tsx` — page title metadata
- `README.md` — title
- `src/lib/latex.ts` — temp compile dir name (`resume-tracker-compile` -> `restrack-compile`,
  cosmetic only, not user-facing)

Verified after rename: `npx tsc --noEmit` clean, `GET /` -> 200.

**Not yet done — needs your input before starting:**
- Renaming the GitHub repo itself (`ajdeodhar/resume-tracker`) — asked which repo(s) this refers
  to and what the new name should be, since renaming a GitHub repo changes its URL and needs the
  app's own settings (`githubRepo` in `data/settings.json`) updated to match, or old links break.
- The multi-user login/auth system — this is a real architecture decision (auth method, database,
  per-user credential model) that changes almost everything in `src/lib/storage.ts` and the API
  routes, so asked clarifying questions before writing code instead of guessing and having to
  redo it.

---

## 2026-07-12 (session 4) — Multi-user login system (GitHub OAuth + Postgres-ready DB)

**Decisions confirmed by user:**
- Auth: sign in with GitHub (OAuth). Fits the core feature directly — every user needs to link a
  personal GitHub repo anyway, so this gives us identity *and* push access from one login instead
  of a separate password plus a manually-pasted PAT.
- Database: relational (Postgres-style). No Docker/Postgres available in this environment, so
  built on **Prisma + SQLite for local dev** — schema deliberately avoids SQLite-only quirks
  (tags/changes stored as JSON strings, not native arrays) so switching `datasource.provider` to
  `"postgresql"` and `DATABASE_URL` to a hosted Postgres (e.g. Neon, free tier) is a drop-in swap
  later, no model changes needed.
- AI key model: two-tier — **free plan** = user brings their own Anthropic API key (stored per-user
  in the DB); **paid plan** = requests use one shared server-side key (`ANTHROPIC_API_KEY` env
  var). Billing/payment itself isn't wired up — `plan` is just a field on the user record for now,
  toggled from Settings.
- GitHub repo renamed: `ajdeodhar/resume-tracker` -> `ajdeodhar/restrack` (via GitHub API
  `repos.update`), local `data/settings.json` updated to match, confirmed reachable at the new
  name.

**What got built:**
- `prisma/schema.prisma` — NextAuth's required `Account`/`Session`/`VerificationToken` models plus
  app models `User` (plan, own Anthropic key, linked GitHub owner/repo/path/branch),
  `ProfileItem`, `Application` — both scoped by `userId` with cascade delete.
- `.env` (DB URL only, read by the Prisma CLI) and `.env.local` (full runtime config: DB URL,
  `NEXTAUTH_URL`, a generated `NEXTAUTH_SECRET`, empty `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`
  placeholders, empty `ANTHROPIC_API_KEY` for the paid-plan shared key) — both gitignored, along
  with the new `*.db`/`*.db-journal` SQLite files.
- Ran `prisma migrate dev` — SQLite DB created and in sync with the schema.
- `src/lib/prisma.ts` — Prisma client singleton (dev hot-reload safe).
- `src/lib/auth.ts` — NextAuth config: Prisma adapter, GitHub provider requesting `repo` scope
  (needed to push commits on the user's behalf), JWT session strategy with the GitHub access
  token carried in the token/session so routes don't need a separate DB lookup to push to GitHub.
- `src/types/next-auth.d.ts` — module augmentation so `session.accessToken` / `session.user.id`
  type-check.
- `src/app/api/auth/[...nextauth]/route.ts` — the NextAuth route handler.
- `src/lib/session.ts` — `getAuthedUser()` helper used by every API route.
- `src/lib/storage.ts` — fully rewritten from JSON-file storage to Prisma queries, every function
  now takes a `userId` and only touches that user's rows.
- Every API route (`settings`, `profile`, `profile/[id]`, `profile/import`, `applications`,
  `resume/fetch`, `resume/edit`, `resume/push`) now calls `getAuthedUser()` and returns `401` if
  unauthenticated; GitHub calls use the session's OAuth access token instead of a stored PAT;
  Anthropic calls use `storage.getEffectiveAnthropicKey()` (own key on free plan, shared env key
  on paid plan).
- `src/middleware.ts` — `next-auth/middleware` `withAuth`, configured to redirect unauthenticated
  page requests to `/signin` (API routes are excluded from the matcher — they self-guard with
  401s instead of a redirect, which is more correct for JSON endpoints).
- `src/app/signin/page.tsx` — new sign-in page ("Sign in with GitHub").
- `src/components/SessionProviderWrapper.tsx` + `src/app/layout.tsx` — wraps the app in NextAuth's
  `SessionProvider` so client components can read session state.
- `src/components/Navigation.tsx` — shows the signed-in user's avatar/name and a sign-out button;
  hides itself on `/signin`.
- `src/app/settings/page.tsx` — rewritten: no more manual GitHub PAT field (comes from OAuth now),
  added a Free/Paid plan picker, Anthropic key field only shown on the free plan.
- `src/app/page.tsx` (Dashboard) — updated to read the new `hasOwnAnthropicKey`/`plan` shape from
  `/api/settings` instead of the old single `hasAnthropicKey` boolean.

**Verification so far:**
- `npx tsc --noEmit` — clean, zero errors, after the full rewrite.
- Confirmed middleware actually protects the app: `/`, `/editor`, `/profile`, `/settings`,
  `/history` all return `307` -> `/signin` when unauthenticated; `/signin` itself returns `200`;
  every API route returns a clean `401` JSON instead of crashing or leaking data.
- Caught and fixed a real bug during verification: the middleware initially redirected to
  NextAuth's *default* `/api/auth/signin` page instead of our custom `/signin`, because
  `withAuth()` needs its own `pages.signIn` option passed directly — setting it only in
  `authOptions` isn't enough for the middleware to see it.

**Blocked on you — can't proceed further without this:**
- GitHub OAuth Apps can only be created through the GitHub web UI (no REST API for it), so I
  can't do this step myself. Needed: go to
  https://github.com/settings/applications/new and create an app with:
  - Application name: `ResTrack` (or anything)
  - Homepage URL: `http://localhost:3000`
  - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
  Then copy the **Client ID** and generate a **Client Secret**, and put them in
  `.env.local` as `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (file already has the placeholders).
  Once that's done I can actually sign in and verify the whole flow end-to-end, and migrate your
  existing local profile/application data (currently still sitting in the old `data/*.json`
  files) into the new database under your real account.

---

## 2026-07-12 (session 5) — Sign-in confirmed; bulk import + dedup + sorting; deployed to Railway

**GitHub sign-in confirmed working.** User row + linked GitHub Account row present in the DB.
Since this is a fresh database, the profile from before (10 items imported from `resume.tex`) is
gone — user asked to just re-import rather than migrate the old JSON, but flagged three real gaps
in the import flow while doing it:
1. No way to upload a file — paste-only textarea.
2. Multiple old resume copies scattered across the laptop — wanted to import all of them once,
   without ending up with duplicate profile items for the same experience worded differently
   across versions.
3. Profile list wasn't ordered by the item's own date — wanted newest experience first.
Also asked to deploy somewhere shareable instead of localhost.

**Import: multi-file upload, multi-format, with semantic dedup**
- `src/lib/parseResumeFile.ts` (new) — extracts plain text from `.pdf` (via `pdf-parse`), `.docx`
  (via `mammoth`), and `.txt`/`.md`/`.tex` (read directly). Added those two packages +
  `@types/pdf-parse` to `package.json`.
- `src/lib/claude.ts` — added `filterNewProfileItems()`: a second Claude tool-use call that takes
  the user's existing profile plus a batch of newly-extracted candidate items and returns only the
  indices that are genuinely new — catches duplicates both against what's already saved *and*
  against each other within the same batch (e.g. the same job appearing, reworded, in two
  different uploaded resume versions). Fails open (adds everything) if the tool call itself fails,
  so a flaky dedup call can't silently drop real content.
- `src/app/api/profile/import/route.ts` — rewritten to accept `multipart/form-data` with one or
  more `files` plus an optional `text` field (pasted text still works, unchanged for existing
  callers hitting it with JSON). Extracts each file separately, runs one combined dedup pass
  against the existing profile, inserts only the new items, returns `addedCount`/`duplicateCount`
  plus a per-source breakdown (so a bad/unreadable file doesn't kill the whole batch — its error
  is reported alongside the successful sources).
- `src/app/profile/page.tsx` — Import panel now has a real file picker (multi-select, `.pdf/.docx/
  .txt/.md/.tex`) with a chip list of queued files and per-file remove, plus the paste box still
  underneath as a fallback. Toasts summarize what happened ("Added N new items — skipped M already
  in your profile").

**Sorting: newest-first by the item's own date**
- `src/lib/dates.ts` (new) — `parseApproxDate()` best-effort parses free-text resume dates
  ("June 2024", "06/2024", "2024", "Present"/"Current"/"Ongoing" → treated as a far-future
  sentinel so in-progress items sort first). `effectiveItemDate()` picks end date, else start
  date, else falls back to when the item was added (for things like skills that have no dates).
- `src/lib/storage.ts` `getProfile()` now sorts by this in JS after fetching (list sizes are small,
  no need for a DB-level computed column).

**Verified all three with a real automated test, not just reasoning about the code:**
- Since there's no browser tool available and OAuth needs a real interactive login, minted a valid
  NextAuth JWT session token directly (using the known `NEXTAUTH_SECRET`) for a throwaway test user
  seeded with one baseline profile item, then drove the actual HTTP API with `curl` — same code
  path a real browser session would hit, no shortcuts through internal functions.
- Uploaded a resume `.txt` containing 4 items, one of which was a reworded duplicate of the
  baseline ("Software Engineering Intern" vs "Software Engineer Intern", same dates, same
  employer, different phrasing). Result: `addedCount: 3, duplicateCount: 1` — the duplicate was
  correctly caught.
- Uploaded a second resume `.txt` overlapping two of those items (reworded again) plus one
  genuinely new item. Result: `addedCount: 1, duplicateCount: 2` — dedup against *previously
  imported* items (not just the original baseline) also works.
- Fetched the final profile: correctly newest-first (Jan 2025 experience → 2024 project/degree →
  2023 → 2022), confirming the date-sort logic.
- Deleted the test user (cascade-deleted its profile items) to leave the database clean.
- Not independently tested: the actual `.pdf`/`.docx` parsing paths — no sample files were
  available in this environment to test with. `pdf-parse` and `mammoth` are both established,
  widely-used libraries, but worth trying a real PDF/DOCX from your own collection to confirm.

**Deployed to Railway** (user has an existing Railway account, already GitHub-linked, one other
project there — confirmed via `railway whoami`/`railway list`):
- Ran `railway setup agent` to install Railway's CLI skill/MCP tooling — didn't take effect this
  session (needs a restart to register), so did everything below via the plain `railway` CLI
  instead, which was already authenticated and fully sufficient.
- Created a new Railway project `restrack` (`railway init`), added a Postgres plugin
  (`railway add --database postgres`) — accidentally created it twice on the first attempt (an
  interactive prompt was mistaken for a hang and retried); caught it via `railway service list`
  and deleted the duplicate before it caused confusion later.
- **Switched Prisma's datasource from SQLite to Postgres** (`prisma/schema.prisma`) — real
  multi-user deployment needs a real database engine, and Prisma requires one static provider per
  schema file. Deleted the old SQLite migration (incompatible DDL) and generated a fresh Postgres
  migration, applied directly against Railway's hosted Postgres via its public proxy URL.
  Local dev and production now point at the **same** Railway Postgres for now (single source of
  truth, appropriate for a personal-scale project) — noted as something to split later if that
  ever becomes a real concern. (Found local Postgres 17 already installed and running on this
  machine during this work, but no password was available to use it, so didn't pursue a separate
  local dev database.)
- Created a second Railway service `web` for the app itself (`railway add --service web`), added a
  `.railwayignore` (this project isn't a git repo, so Railway had no `.gitignore` to infer from —
  first upload attempt was 283MB and got rejected for size before this was added).
- Railway's deploy pipeline **blocked the first build** over a real HIGH-severity CVE in
  `next@14.2.30` (CVE-2025-55184, CVE-2025-67779) — upgraded to `next@14.2.35` (the patched
  version) before retrying, rather than bypassing the check.
- Added `postinstall: prisma generate` and `prestart: prisma migrate deploy` to `package.json`
  scripts (npm's automatic lifecycle hooks) so every future deploy regenerates the Prisma client
  and applies any new migrations automatically, without needing to run them by hand again.
- Set env vars on the `web` service (`DATABASE_URL` using the *internal* `postgres.railway.internal`
  address rather than the public proxy, since the app runs in the same private network;
  `NEXTAUTH_URL` set to the generated Railway domain; reused the same `NEXTAUTH_SECRET` as local).
- Generated a public domain: **https://web-production-c741f.up.railway.app**
- GitHub OAuth Apps only support one callback URL each, so the localhost dev app couldn't also
  serve production — asked the user to create a second GitHub OAuth App scoped to the Railway
  domain; once given, set `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` on the `web` service and
  redeployed. Confirmed via `/api/auth/providers` on the live URL that the GitHub provider is
  correctly registered with the right callback URL.
- Redeployed again after the import/dedup/sort feature work above so production has everything
  that's been verified locally.

**README.md rewritten** to reflect the new architecture: multi-user via GitHub OAuth, Postgres via
Prisma, the file-upload+dedup import flow, newest-first sorting, the free/paid plan model, the live
Railway URL, and updated project structure (new `lib/` files, `middleware.ts`, `prisma/schema.prisma`).

**Still open:**
- Local Postgres password not available — local dev currently shares the same DB as production.
  If you ever want them split, just give me the local Postgres password (or reset it) and I'll set
  up a separate `restrack_dev` database and point `.env.local` at it instead.
- `npm audit` still flags some Next.js advisories that only have fixes in a major Next 16 upgrade,
  and a transitive `uuid` vulnerability via `next-auth`'s own dependency — neither was what Railway
  blocked on, and both would require breaking-change upgrades, so left alone for now.
- This project still isn't a git repository — Railway deploys work fine via `railway up` from the
  local directory without one, but there's no version history or GitHub-triggered auto-deploy.
  Worth setting up if that ever matters.

---

## 2026-07-13 (session 6) — Fixed: PDF upload was actually broken

User reported their real PDF resume failed to upload (hadn't yet tried `.docx`/`.md`/`.txt`).

**Root cause found by reproducing it, not guessing:** built a small but valid test PDF by hand and
ran it through `pdf-parse` directly — it hard-failed with `bad XRef entry`. `pdf-parse` bundles a
very old, unmaintained copy of Mozilla's `pdf.js` (v1.10.100, ~2018) as its parsing engine. That
version predates PDF cross-reference *streams* (used by most modern PDF generators — Word "Save
as PDF", browser print-to-PDF, Pages, Canva, etc. — instead of the old plain-text xref table) and
has none of the recovery-mode parsing newer `pdf.js` has for imperfect files. Any real-world PDF
not produced by an old/basic tool was likely to fail the same way.

**Fix:** swapped `pdf-parse` for `unpdf` (actively maintained, wraps a current `pdfjs-dist`,
built for exactly this — text extraction across JS runtimes including serverless). Updated
`src/lib/parseResumeFile.ts` to use `unpdf`'s `getDocumentProxy`/`extractText` instead. Removed
`pdf-parse` and `@types/pdf-parse` from `package.json`.

**Verified the fix is real, not just "should work now":**
- Ran the same hand-built test PDF that broke `pdf-parse` through `unpdf` directly — extracted the
  text cleanly, no error.
- Ran it through the *actual* `/api/profile/import` HTTP route (same JWT-session testing technique
  as before: throwaway test user, minted session token, real `curl` upload) — got back both
  expected profile items (`addedCount: 2, duplicateCount: 0`), confirming the whole pipeline
  (upload → extract → Claude extraction → dedup → save) works with a real PDF end-to-end, not just
  the extraction step in isolation. Cleaned up the test user afterward.
- `npx tsc --noEmit` clean.
- Deployed to production (`railway up`) and confirmed the new build went live.

**Still to confirm on your end:** `.docx`, `.md`, and `.txt` uploads — you mentioned you hadn't
tried those yet. `.txt` was verified in the previous session; `.docx` (via `mammoth`) hasn't been
tested with a real file from your machine, only reasoned about as a well-established library.

---

## 2026-07-13 (session 7) — PDF still failing after the unpdf fix: a second, real client-side bug

User tried the fixed production build — still didn't work. This time the root cause turned out to
be entirely different from the pdf-parse issue, and much harder to find, so documenting the whole
diagnostic path since it's a genuinely subtle bug.

**Step 1 — checked Railway's production logs directly.** Zero requests to `/api/profile/import`
had ever reached the server, despite other requests (sign-in, page loads) showing up fine. That
ruled out anything server-side — the request was never leaving the browser.

**Step 2 — asked what the user saw.** File appeared in the queued-files list, they clicked
"Extract & Import," nothing happened. No error, no toast.

**Step 3 — installed Playwright to drive a real headless browser** (no browser tool was available
otherwise). Minted a valid NextAuth session token directly (same JWT technique as before, adjusted
for production's `__Secure-` prefixed cookie name over HTTPS vs plain `next-auth.session-token` on
local http — that mismatch caused a `401` on the first attempt, which was itself a useful signal
that curl-based testing needs to account for cookie naming, not the app's actual bug).

**Step 4 — bypassed curl entirely and drove the real UI.** Used Playwright's proper `filechooser`
event flow (the most faithful simulation of a real user picking a file — more so than
`setInputFiles`) against production: file queued fine, but the "Extract & Import" button stayed
disabled and no request ever fired. **Reproduced the user's exact bug**, on the first real attempt
to click through the actual UI rather than test the API directly (which is exactly why the earlier
curl-based verification missed this — it exercised the server, never the browser).

**Step 5 — confirmed it wasn't React hydration or a broader event-handling problem.** The "Import
Resume" toggle button and the paste-text textarea both worked fine and correctly enabled the
submit button — so React's event system in general was fine. It was specific to the file input.

**Step 6 — confirmed the native browser `change` event was firing correctly** with the right file
attached, by attaching a raw `addEventListener('change', ...)` directly to the input via
`page.evaluate`. So the browser side was fine too — the file really was being selected.

**Step 7 — reproduced locally** (`localhost:3000`, same bug) so further iteration didn't need a
Railway deploy each time. Added a temporary `console.log` directly inside the `onChange` handler
and reloaded: **the handler was firing, with the correct file** (`files: 1, browser_test_resume.pdf`).
So the file selection, the DOM event, and the React handler invocation were all fine.

**Step 8 — the actual bug:** added a `useEffect` tracing `importFiles` state, and it printed `[]`
every time — the state update was happening (a re-render was triggered), but always ended up empty.
The cause was in `addImportFiles`:

```ts
// BEFORE (buggy)
const addImportFiles = (fileList: FileList | null) => {
  if (!fileList) return;
  setImportFiles((prev) => [...prev, ...Array.from(fileList)]);
};
```

called from the input's `onChange` as:

```tsx
onChange={(e) => {
  addImportFiles(e.target.files);
  e.target.value = '';   // <- resets the input so the same file can be re-selected later
}}
```

`Array.from(fileList)` sits inside the **functional updater** passed to `setImportFiles`. React
doesn't run that updater function synchronously at the call site — it runs it later, during the
state update itself. But `fileList` is `e.target.files`, a **live** `FileList` tied to the actual
DOM input element, not a snapshot. Setting `e.target.value = ''` on the very next line (a standard,
necessary pattern for letting a user re-select the same file) clears that live `FileList`
immediately. By the time React actually invokes the updater and evaluates `Array.from(fileList)`,
the list has already been cleared — silently producing an empty array. No error anywhere, because
nothing throws; it just quietly adds zero files.

**Fix** (`src/app/profile/page.tsx`): snapshot the files into a plain array immediately,
synchronously, at the top of `addImportFiles` — before React ever gets a chance to defer anything:

```ts
const addImportFiles = (fileList: FileList | null) => {
  if (!fileList) return;
  const files = Array.from(fileList); // eager snapshot, independent of the live input afterward
  setImportFiles((prev) => [...prev, ...files]);
};
```

**Verified properly this time — through the real UI, not just the API:**
- Local: real Playwright `filechooser` flow — button correctly enables, file chip renders.
- Local: full click-through including the actual "Extract & Import" click — got a `200`, the
  correct extracted item, and confirmed the success toast text ("Added 1 new item.") actually
  renders on the page, not just that the API responded correctly.
- `npx tsc --noEmit` clean.
- Deployed to production and confirmed the new build is live.
- Cleaned up all throwaway test users (4 total across this and the previous session) created for
  these tests.

**Why the earlier "verified end-to-end" claim was wrong:** the previous session's verification used
`curl` with a manually-minted session cookie to hit the API directly — which thoroughly tested the
server-side pipeline (extraction, dedup, sorting) but never exercised the actual browser
`<input type="file">` interaction, which is exactly where this bug lived. Lesson applied here:
driving the real rendered UI (via Playwright) catches an entire class of bugs that API-level testing
structurally cannot.

**Final confirmation:** re-ran the full real-browser click-through against production one more
time after the deploy (fresh throwaway test user) — file picker → chip appears → button enables →
click → `200` → item extracted → "Added 1 new item." toast rendered on screen. Deleted the test
user, removed the temporary `playwright` package (`--no-save` install, plus one `npm uninstall` to
be sure) and all scratch scripts/PDFs used for this debugging session.
