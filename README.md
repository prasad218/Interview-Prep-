<div align="center">

<img src="docs/images/banner.png" alt="Interview Prep - From Preparation to Get Hired" width="100%" />

# Interview Prep

### From Preparation to Get Hired

Upload your resume once. Get a personalized day-by-day roadmap, practice with a live AI interviewer, pass readiness tests, and earn a certificate.

![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![OpenRouter](https://img.shields.io/badge/AI-OpenRouter-6366F1)
![Auth](https://img.shields.io/badge/Auth-JWT%20%2B%20Google-F59E0B)
![Status](https://img.shields.io/badge/Status-In%20Development-orange)

A product from **Aakara.AI**

</div>

---

## Table of Contents

- [Why Interview Prep?](#why-interview-prep)
- [Features](#features)
- [Screenshots](#screenshots)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Google Sign-In Setup (Optional)](#google-sign-in-setup-optional)
- [API Reference](#api-reference)
- [Important: Data Storage](#important-data-storage)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## Why Interview Prep?

Most candidates prepare with scattered resources and no clear plan. Interview Prep turns your resume, target role, and deadline into **one structured plan**, then lets you practice and get tested against it, all in one place.

---

## Features

| | Feature | What you get |
|---|---|---|
| 🗺️ | **Personalized Roadmap** | A phase-by-phase, day-by-day study schedule sized to your timeline and daily study hours |
| 🏢 | **Company-Specific Rounds** | Interview-round breakdowns for each target company, based on commonly reported public patterns |
| 🎤 | **Live AI Mock Interview** | A conversational interviewer that gives feedback after every answer and a wrap-up report at the end |
| 📚 | **Question Bank** | Generate a Q&A set with model answers tailored to your resume and role |
| 📝 | **Test Center** | 8-question readiness tests, general-role or styled after a target company |
| 🏆 | **Certificate** | Score 70% or higher to unlock a downloadable PDF certificate and badge |
| 🔐 | **Secure Auth** | Email/password or Google sign-in with JWT sessions |

---

## Screenshots

<div align="center">

### Personalized Roadmap
<img src="docs/images/roadmap.png" alt="Personalized roadmap view" width="85%" />

### Live AI Mock Interview
<img src="docs/images/live-interview.png" alt="Live AI mock interview" width="85%" />

### Test Center
<img src="docs/images/test-center.png" alt="Test center with readiness test" width="85%" />

### Certificate
<img src="docs/images/certificate.png" alt="Downloadable certificate" width="85%" />

</div>

---

## How It Works

1. **Sign up / sign in** with email and password or Google. Sessions are JWTs stored in the browser. Your OpenRouter key stays on the server and is never exposed to the client.
2. **Onboarding:** upload or paste your resume, then set your target role, days until your placement deadline, daily study hours, and (optionally) target companies.
3. **Roadmap:** your profile is sent to an LLM, which returns a personalized phase-by-phase schedule plus an interview-round breakdown for each company you named.
4. **Practice:** run a conversational mock interview, or generate a static Q&A set with model answers.
5. **Test Center:** take an 8-question multiple-choice readiness test. Passing (70% or above) unlocks a certificate.
6. **Certificate:** download a PDF certificate and badge.

> **Note:** Company-specific round breakdowns are a general guide based on commonly reported public patterns, not insider information. Certificates are issued by **Interview Prep (Aakara.AI)** based on practice-test performance. They are **not** official credentials from any target company, and the certificate says so.

<div align="center">
<img src="docs/images/architecture.png" alt="Architecture diagram" width="85%" />
</div>

---

## Tech Stack

- **Frontend:** React, Vite
- **Backend:** Node.js, Express
- **AI:** OpenRouter (any supported model, e.g. `anthropic/claude-3.5-sonnet`)
- **Auth:** JWT, optional Google OAuth 2.0
- **Storage:** Flat-file JSON (`server/data/db.json`), see [Data Storage](#important-data-storage)

---

## Project Structure

```
interview-prep/
├── server/     Express API: auth, roadmap/test generation via OpenRouter, storage
└── client/     React (Vite) UI
```

---

## Getting Started

### Prerequisites

- Node.js 18 or newer
- An [OpenRouter](https://openrouter.ai) account and API key

### 1. Clone the repository

```bash
git clone https://github.com/prasad218/Interview-Prep-.git
cd Interview-Prep-
```

### 2. Get an OpenRouter API key

Sign up at [openrouter.ai](https://openrouter.ai) and create a key at [openrouter.ai/keys](https://openrouter.ai/keys). Add credit, or use their free-tier models, so requests succeed.

### 3. Configure your environment

```bash
cd server
cp .env.example .env
```

Open `server/.env` and fill in:

```env
OPENROUTER_API_KEY=sk-or-v1-...
JWT_SECRET=<a long random string, e.g. output of: openssl rand -hex 32>
```

Optional client config:

```bash
cd ../client
cp .env.example .env
```

Leave `VITE_API_URL` empty for local development (Vite proxies `/api` to the server automatically). In production, set it to your deployed server URL.

### 4. Install dependencies

From the project root:

```bash
npm run install:all
```

### 5. Run it

```bash
npm run dev
```

| Service | URL |
|---|---|
| API | http://localhost:3001 |
| UI | http://localhost:5173 |

Open the UI URL in your browser and you're ready to go.

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | Your OpenRouter API key |
| `JWT_SECRET` | Yes | Signs login sessions. Changing it later logs everyone out |
| `DEFAULT_MODEL` | No | Any OpenRouter model id. See the [model list](https://openrouter.ai/models) |
| `GOOGLE_CLIENT_ID` | No | Needed only for "Sign in with Google" |

### Client (`client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No | Leave empty in dev. Set to your server URL in production |
| `VITE_GOOGLE_CLIENT_ID` | No | Needed only for "Sign in with Google" |

---

## Google Sign-In Setup (Optional)

1. Go to the [Google Cloud credentials page](https://console.cloud.google.com/apis/credentials) and create an **OAuth 2.0 Client ID** (type: Web application).
2. Under **Authorized JavaScript origins**, add `http://localhost:5173` and your production URL once deployed.
3. Copy the client ID into **both**:
   - `server/.env` → `GOOGLE_CLIENT_ID`
   - `client/.env` → `VITE_GOOGLE_CLIENT_ID`
4. Restart both dev servers.

Without this, email/password sign-in still works fully. The Google button simply shows a small "not configured" note.

---

## API Reference

Routes marked ✓ require an `Authorization: Bearer <token>` header.

### Auth, Roadmap, and Tests

| Method | Route | Auth | Description |
|---|---|:---:|---|
| POST | `/api/auth/signup` | | `{ name, email, password }` |
| POST | `/api/auth/login` | | `{ email, password }` |
| POST | `/api/auth/google` | | `{ credential }`, a Google ID token |
| GET | `/api/auth/me` | ✓ | Current user |
| PATCH | `/api/auth/profile` | ✓ | `{ resumeText, targetRole, daysToPlacement, dailyHours, targetCompanies }` |
| POST | `/api/roadmap/generate` | ✓ | Generate or regenerate the roadmap from the saved profile |
| GET | `/api/roadmap` | ✓ | Get the saved roadmap |
| PATCH | `/api/roadmap/progress` | ✓ | `{ rangeLabel, completed }`, toggles a schedule block |
| POST | `/api/test/start` | ✓ | Start a role-based or company-style test |
| POST | `/api/test/submit` | ✓ | `{ testId, answers }`, grades and returns a certificate if passed |
| GET | `/api/test/results` | ✓ | Past test result summaries |

### Chat and Interview Practice

| Method | Route | Auth | Description |
|---|---|:---:|---|
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

> The chat, interview-prep, and live-interview features were built before accounts existed, so they are not yet scoped per user. The Roadmap and Test Center features are fully account-scoped.

---

## Important: Data Storage

Accounts, profiles, roadmaps, and test results are stored in a flat file at `server/data/db.json`. This is fine for local development and small deployments, but:

> ⚠️ **Not production-safe as-is.** On hosts with an ephemeral filesystem (for example, Render's free tier without a persistent disk), all accounts and data are wiped on every redeploy or restart.

Before relying on this for real users, either attach a persistent disk (Render, Fly.io volumes, etc.) or migrate `server/src/db.js` to a real database such as Postgres. The functions there are already isolated to make that swap straightforward.

---

## Roadmap

- [ ] Scope existing chat and interview features to user accounts
- [ ] Migrate to a real database (Postgres)
- [ ] Per-user rate limiting and cost controls (OpenRouter bills per token)
- [ ] Email verification and password reset
- [ ] Deployment guide (client to Vercel/Netlify, server to Render/Fly.io/Railway)

### Deployment notes

The client builds to static files (`npm run build` in `client/`) that you can host anywhere (Vercel, Netlify, S3 + CDN). The server is a plain Node process you can run on Render, Fly.io, Railway, or a VPS.

---

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to open an issue or submit a pull request.

---

<div align="center">

Built by [prasad218](https://github.com/prasad218) · A product from **Aakara.AI**

If you found this useful, consider giving it a ⭐

</div>

