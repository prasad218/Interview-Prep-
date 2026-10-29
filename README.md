<p align="center">
  <img src="docs/images/banner.png" alt="LevelUp - Make your move. A product from Aakara.AI" width="100%">
</p>

<p align="center">
  <a href="https://interview-prep-1-bb0z.onrender.com/"><b>Live demo</b></a>
  &nbsp;|&nbsp;
  <a href="#how-it-works">How it works</a>
  &nbsp;|&nbsp;
  <a href="#getting-started">Getting started</a>
  &nbsp;|&nbsp;
  <a href="#api-reference">API</a>
</p>

# LevelUp: Make your move

**LevelUp** is an AI-powered interview preparation platform from **Aakara.AI**. Upload your resume once and LevelUp builds a personalized day-by-day roadmap, puts you in front of a live AI mock interviewer, tests your readiness in role or company style, and awards a certificate when you pass.

Most candidates prepare without a plan, practice without feedback, and walk into interviews unsure where they stand. LevelUp replaces guesswork with a clear path: know what to study today, practice answering out loud, measure your progress, and show it.

> **Try it now:** [interview-prep-1-bb0z.onrender.com](https://interview-prep-1-bb0z.onrender.com/)
> The demo runs on a free host, so the first load may take around 30 seconds to wake up.

---

## How it works

<p align="center">
  <img src="docs/images/architecture.png" alt="How LevelUp works, from resume to certificate" width="100%">
</p>

1. **Upload your resume.** Paste it or upload a file once. Tell LevelUp your target role, how many days you have, how many hours you can study each day, and (optionally) the companies you are aiming for.
2. **Get your roadmap.** LevelUp turns your profile into a phase-by-phase schedule sized to your deadline, plus a round-by-round breakdown for each target company.
3. **Practice live.** Answer questions from a conversational AI interviewer and get feedback after every response, or generate a question bank with model answers.
4. **Take the readiness test.** An 8-question multiple-choice test, either role-based or styled after a company's process.
5. **Get certified.** Score 70% or more and download a PDF certificate.

---

## Features

### Personalized roadmap

A plan built from your resume, your timeline, and your time budget, not a generic checklist. Tick off schedule blocks as you finish them and watch your progress climb. For each company you name, LevelUp outlines the typical interview rounds based on commonly reported public patterns.

<p align="center">
  <img src="docs/images/roadmap.png" alt="Personalized roadmap with phases, progress bar and company rounds" width="90%">
</p>

> Company round breakdowns are a general guide drawn from public patterns, not insider information.

### Live AI mock interview

Talk through real interview questions tailored to your resume and role. After each answer you get scores for clarity, depth, and structure, along with a concrete tip to improve. End early at any time to get a wrap-up report.

<p align="center">
  <img src="docs/images/live-interview.png" alt="Live mock interview with instant feedback on each answer" width="90%">
</p>

### Question bank

Prefer to study first? Generate a focused set of interview questions with model answers for your role, experience level, and focus areas.

### Test Center and certificate

Check your readiness with an 8-question test, either general for your role or styled after a target company's process. Pass with 70% or higher to unlock a downloadable PDF certificate and badge.

<p align="center">
  <img src="docs/images/test-center.png" alt="Test Center readiness test" width="90%">
</p>

<p align="center">
  <img src="docs/images/certificate.png" alt="Certificate awarded on passing" width="90%">
</p>

> The certificate is issued by LevelUp (Aakara.AI) based on practice-test performance. It is not an official credential from any company, and the certificate says so.

---

## Tech stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | React with Vite |
| Backend | Node.js and Express |
| AI | LLMs via [OpenRouter](https://openrouter.ai) (model is configurable) |
| Auth | Email and password, optional Google sign-in, JWT sessions |
| Storage | Flat-file JSON store (swappable, see [data storage](#data-storage-note)) |

```
interview-prep/
├── server/     Express API: auth, roadmap and test generation, storage
└── client/     React (Vite) UI
```

---

## Getting started

### 1. Get an OpenRouter API key

Sign up at <https://openrouter.ai> and create a key at <https://openrouter.ai/keys>. Add credit, or use a free-tier model, so requests succeed.

### 2. Configure your environment

```bash
cd server
cp .env.example .env
```

Open `server/.env` and fill in:

```env
OPENROUTER_API_KEY=sk-or-v1-...
JWT_SECRET=<a long random string, e.g. output of: openssl rand -hex 32>
```

- `JWT_SECRET` is required. It signs login sessions, and changing it later logs everyone out.
- `DEFAULT_MODEL` is optional. Set any OpenRouter model id (see <https://openrouter.ai/models>).
- `GOOGLE_CLIENT_ID` is optional and only needed for the "Sign in with Google" button (see below).

**Client environment (optional)**

```bash
cd client
cp .env.example .env
```

Leave `VITE_API_URL` empty for local development, since Vite proxies `/api` to the server. In production, set it to your deployed server's URL.

### 3. Install dependencies

From the project root:

```bash
npm run install:all
```

### 4. Run it

```bash
npm run dev
```

The API starts on **http://localhost:3001** and the UI on **http://localhost:5173**. Open the UI URL in your browser.

### Google sign-in setup (optional)

1. Go to <https://console.cloud.google.com/apis/credentials> and create an **OAuth 2.0 Client ID** (type: Web application).
2. Under **Authorized JavaScript origins**, add `http://localhost:5173` and your production URL once deployed.
3. Copy the client ID into both `server/.env` (`GOOGLE_CLIENT_ID`) and `client/.env` (`VITE_GOOGLE_CLIENT_ID`).
4. Restart both dev servers.

Without this, email and password sign-in still works fully.

---

## Data storage note

Accounts, profiles, roadmaps, and test results are stored in a flat `server/data/db.json` file. That is fine for local development and small deployments, but:

- **It is not production-ready for real users as-is.** On hosts with an ephemeral filesystem (for example Render's free tier without a persistent disk), all data is wiped on every redeploy or restart.
- Before opening LevelUp to real users, attach a persistent disk or migrate `server/src/db.js` to a real database such as Postgres. The functions there are already isolated to make that swap straightforward.

---

## API reference

Routes marked with a check require an `Authorization: Bearer <token>` header.

| Method | Route | Auth | Description |
| ------ | ----- | :--: | ----------- |
| POST | `/api/auth/signup` | | `{ name, email, password }` |
| POST | `/api/auth/login` | | `{ email, password }` |
| POST | `/api/auth/google` | | `{ credential }` (Google ID token) |
| GET | `/api/auth/me` | ✓ | Current user |
| PATCH | `/api/auth/profile` | ✓ | `{ resumeText, targetRole, daysToPlacement, dailyHours, targetCompanies }` |
| POST | `/api/roadmap/generate` | ✓ | Generate or regenerate the roadmap from the saved profile |
| GET | `/api/roadmap` | ✓ | Get the saved roadmap |
| PATCH | `/api/roadmap/progress` | ✓ | `{ rangeLabel, completed }` to toggle a schedule block |
| POST | `/api/test/start` | ✓ | Start a role-based or company-style test |
| POST | `/api/test/submit` | ✓ | `{ testId, answers }`: grades and returns a certificate if passed |
| GET | `/api/test/results` | ✓ | Past test result summaries |
| GET | `/api/conversations` | | List chat conversations |
| GET | `/api/conversations/:id` | | Get one conversation with messages |
| POST | `/api/conversations` | | Create a conversation `{ model }` |
| PATCH | `/api/conversations/:id` | | Rename `{ title }` |
| DELETE | `/api/conversations/:id` | | Delete a conversation |
| POST | `/api/chat` | | Send a message and stream the reply (SSE) |
| GET | `/api/models` | | List models available via OpenRouter |
| POST | `/api/interview/extract` | | Extract text from an uploaded resume (multipart, field `resume`) |
| POST | `/api/interview/generate` | | Generate a Q&A set `{ resumeText, role, experience, numQuestions, focusAreas, model }` |
| POST | `/api/live-interview/start` | | Start a live mock interview session |
| POST | `/api/live-interview/answer` | | Submit an answer, get feedback and the next question |
| POST | `/api/live-interview/end` | | End early and get a wrap-up report |

The Roadmap and Test Center features are fully account-scoped. The chat, question bank, and live interview features predate accounts and are not yet tied to a specific user.

---

## Roadmap

- [ ] Scope chat, question bank, and live interview features to user accounts
- [ ] Move storage to a real database (Postgres)
- [ ] Rate limiting and per-user cost controls
- [ ] Email verification and password reset
- [ ] Deployment guide for the client (Vercel, Netlify) and server (Render, Fly.io, Railway)

---

<p align="center">
  <b>LevelUp</b>, a product from <b>Aakara.AI</b><br>
  Make your move.
</p>
