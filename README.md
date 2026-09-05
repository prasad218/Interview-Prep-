# Interview Prep — From Preparation to Get Hired

A product from **Aakara.AI**. Upload a resume once, get a personalized
day-by-day prep roadmap, practice with a live AI mock interviewer, take
role- or company-specific readiness tests, and download a certificate when
you pass.

```
interview-prep/
├── server/     Express API — auth, roadmap/test generation via OpenRouter, storage
└── client/     React (Vite) UI
```

## 1. Get an OpenRouter API key

Sign up at https://openrouter.ai and create a key at
https://openrouter.ai/keys. Add credit (or use their free-tier models) so
requests succeed.

## 2. Configure your environment

```bash
cd server
cp .env.example .env
```

Open `server/.env` and fill in:

```
OPENROUTER_API_KEY=sk-or-v1-...
JWT_SECRET=<a long random string, e.g. `openssl rand -hex 32`>
```

`JWT_SECRET` is required — it signs login sessions. Changing it later logs
everyone out.

`GOOGLE_CLIENT_ID` is optional and only needed for the "Sign in with Google"
button — see **Google sign-in setup** below.

You can also set `DEFAULT_MODEL` (any OpenRouter model id, e.g.
`anthropic/claude-3.5-sonnet`) — see the full model list at
https://openrouter.ai/models.

### Client env (optional)

```bash
cd client
cp .env.example .env
```

Leave `VITE_API_URL` empty for local dev (Vite proxies `/api` to the server
automatically). In production, set it to your deployed server's URL.

## 3. Install dependencies

From the project root:

```bash
npm run install:all
```

## 4. Run it

```bash
npm run dev
```

Starts the API on **http://localhost:3001** and the UI on
**http://localhost:5173**. Open the UI URL in your browser.

## Google sign-in setup (optional)

1. Go to https://console.cloud.google.com/apis/credentials and create an
   **OAuth 2.0 Client ID** (type: Web application).
2. Under "Authorized JavaScript origins", add your dev URL
   (`http://localhost:5173`) and your production URL once deployed.
3. Copy the client ID into **both**:
   - `server/.env` → `GOOGLE_CLIENT_ID`
   - `client/.env` → `VITE_GOOGLE_CLIENT_ID`
4. Restart both dev servers.

Without this, email/password sign-in still works fully — the Google button
just shows a small "not configured" note instead.

## How the product works

1. **Sign up / sign in** — email+password or Google. Sessions are JWTs
   stored in the browser; the server never sees your OpenRouter key exposed
   to the client.
2. **Onboarding** — upload or paste a resume, set your target role, days
   until your placement deadline, daily study hours, and (optionally) target
   companies.
3. **Roadmap** — the server sends your profile to an LLM which returns a
   personalized, phase-by-phase schedule sized to your timeline, plus a
   company-specific interview-round breakdown for each company you named
   (based on commonly reported public patterns — explicitly framed as a
   general guide, not insider information).
4. **Live Interview / Question Bank** — practice with a conversational AI
   mock interviewer, or generate a static Q&A set with model answers.
5. **Test Center** — take an 8-question multiple-choice readiness test,
   either general-role or styled after a target company's process. Passing
   (≥70%) unlocks a certificate.
6. **Certificate** — a downloadable PDF certificate + badge. It's clearly
   issued by **Interview Prep (Aakara.AI)** based on practice-test
   performance — not an official credential from the target company, and the
   certificate itself says so.

## Important operational note: user data storage

Accounts, profiles, roadmaps, and test results are stored in a flat
`server/data/db.json` file — the same approach the original chat storage
used. This is fine for local development and small deployments, but:

- **It is not safe for production with real users as-is.** If you deploy to
  a host with an ephemeral filesystem (e.g. Render's free tier without a
  persistent disk), all accounts and data are wiped on every redeploy or
  restart.
- Before relying on this for real users, either attach a persistent disk
  (Render, Fly.io volumes, etc.) or migrate `server/src/db.js` to a real
  database (Postgres, etc.) — the function signatures there are already
  isolated to make that swap straightforward.

## API reference

| Method | Route                        | Auth | Description |
|--------|------------------------------|------|--------------|
| POST   | `/api/auth/signup`           | —    | `{ name, email, password }` |
| POST   | `/api/auth/login`            | —    | `{ email, password }` |
| POST   | `/api/auth/google`           | —    | `{ credential }` — Google ID token |
| GET    | `/api/auth/me`                | ✓    | Current user |
| PATCH  | `/api/auth/profile`          | ✓    | `{ resumeText, targetRole, daysToPlacement, dailyHours, targetCompanies }` |
| POST   | `/api/roadmap/generate`      | ✓    | Generate/regenerate the roadmap from the saved profile |
| GET    | `/api/roadmap`                | ✓    | Get the saved roadmap |
| PATCH  | `/api/roadmap/progress`      | ✓    | `{ rangeLabel, completed }` — toggle a schedule block |
| POST   | `/api/test/start`            | ✓    | `{ mode: "role"|"company", company? }` — generates questions |
| POST   | `/api/test/submit`           | ✓    | `{ testId, answers }` — grades, returns certificate if passed |
| GET    | `/api/test/results`          | ✓    | Past test result summaries |
| GET    | `/api/conversations`         | —    | List chat conversations |
| GET    | `/api/conversations/:id`     | —    | Get one conversation with messages |
| POST   | `/api/conversations`         | —    | Create a conversation `{ model }` |
| PATCH  | `/api/conversations/:id`     | —    | Rename `{ title }` |
| DELETE | `/api/conversations/:id`     | —    | Delete a conversation |
| POST   | `/api/chat`                  | —    | Send a message, stream the reply (SSE) |
| GET    | `/api/models`                | —    | List models available via OpenRouter |
| POST   | `/api/interview/extract`     | —    | Extract text from an uploaded resume file (multipart, field `resume`) |
| POST   | `/api/interview/generate`    | —    | Generate a static Q&A set `{ resumeText, role, experience, numQuestions, focusAreas, model }` |
| POST   | `/api/live-interview/start`  | —    | Start a live mock interview session |
| POST   | `/api/live-interview/answer` | —    | Submit an answer, get feedback + next question |
| POST   | `/api/live-interview/end`    | —    | End early, get a wrap-up report |

Routes marked **Auth** require an `Authorization: Bearer <token>` header.
Note: the chat / interview-prep / live-interview features are not yet scoped
per-user (they were built before accounts existed) — they work for anyone
using the app, logged in or not, and aren't tied to a specific account. The
new Roadmap/Test Center features are fully account-scoped.

## Next steps for a real product

- **Scope existing chat/interview features to accounts** — currently only
  Roadmap/Test Center are tied to the logged-in user.
- **Real database** — see the storage note above; this matters more here
  than in a typical demo since real user accounts are involved.
- **Rate limiting / cost controls** — OpenRouter bills per token; add
  per-user limits before opening this up publicly.
- **Email verification / password reset** — not implemented; signup accepts
  any email without confirming ownership.
- **Deploy** — the client builds to static files (`npm run build` in
  `client/`) you can host anywhere (Vercel, Netlify, S3+CDN); the server is a
  plain Node process you can run on Render, Fly.io, Railway, a VPS, etc.
