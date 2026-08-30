# Chat Startup — ChatGPT-style chat app powered by OpenRouter

A minimal, working starting point: React chat UI on the frontend, a small
Node/Express backend that streams responses from **OpenRouter** (so you can
call GPT-4o, Claude, Gemini, Llama, and dozens of other models through one
API key). Conversations persist to a local JSON file so nothing is lost on
refresh.

```
chat-startup/
├── server/     Express API — talks to OpenRouter, stores conversations
└── client/     React (Vite) chat UI
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

Open `server/.env` and paste in your key:

```
OPENROUTER_API_KEY=sk-or-v1-...
```

You can also set `DEFAULT_MODEL` (any OpenRouter model id, e.g.
`anthropic/claude-3.5-sonnet`) — see the full model list at
https://openrouter.ai/models.

## 3. Install dependencies

From the project root:

```bash
npm run install:all
```

(This runs `npm install` at the root — for `concurrently`, used by `npm run dev` — plus inside `server/` and `client/`.)

## 4. Run it

From the project root:

```bash
npm run dev
```

This starts the API on **http://localhost:3001** and the UI on
**http://localhost:5173** at the same time. Open the UI URL in your browser.

If you'd rather run them in two separate terminals:

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev
```

## How it works

- The browser never sees your OpenRouter key — it only talks to your own
  `server/`, which attaches the key server-side when calling OpenRouter.
- `POST /api/chat` streams the model's reply token-by-token back to the
  browser using Server-Sent Events, so responses appear incrementally like
  ChatGPT.
- Each conversation stores its own `model`, and you can switch models from
  the header dropdown at any time — including mid-project, per message.
- Conversations are stored in `server/data/db.json`. It's a flat JSON file,
  not a real database — good enough to develop with, but swap it out before
  you have real users (see "Next steps" below).

## Resume-based Interview Prep

Click **"Interview Prep"** in the header to switch views. This feature acts
as an AI interviewer agent:

1. Upload a resume (PDF / DOCX / TXT) — or paste the text directly — and the
   server extracts the raw text.
2. Pick a target role, experience level, number of questions, and which
   sections to cover (Resume & Projects, Technical Knowledge, DSA & Problem
   Solving, System Design, Behavioral).
3. The server sends your resume text to OpenRouter with a prompt instructing
   the model to act as a technical interviewer, referencing your actual
   projects/stack by name, and to return a structured JSON set of questions —
   each with a difficulty tag, a model answer, and a likely follow-up
   question.
4. Questions are grouped by category in the UI; click a question to reveal
   its model answer.

Nothing here is stored server-side beyond the request/response — resume text
lives only in the browser tab's state, so refreshing clears it (by design,
so you're not leaving resumes sitting in a JSON file).

## API reference

| Method | Route                       | Description                          |
|--------|------------------------------|---------------------------------------|
| GET    | `/api/conversations`         | List conversations (no messages)      |
| GET    | `/api/conversations/:id`     | Get one conversation with messages    |
| POST   | `/api/conversations`         | Create a conversation `{ model }`     |
| PATCH  | `/api/conversations/:id`     | Rename `{ title }`                    |
| DELETE | `/api/conversations/:id`     | Delete a conversation                 |
| POST   | `/api/chat`                  | Send a message, stream the reply (SSE)|
| GET    | `/api/models`                | List models available via OpenRouter  |
| POST   | `/api/interview/extract`     | Extract text from an uploaded resume file (multipart, field `resume`) |
| POST   | `/api/interview/generate`    | Generate a Q&A set from resume text `{ resumeText, role, experience, numQuestions, focusAreas, model }` |

## Next steps for a real product

- **Auth** — add user accounts (e.g. sessions + a users table) so
  conversations belong to a specific person, not to whoever opens the app.
- **Real database** — swap `server/src/db.js` for Postgres/SQLite once you
  have concurrent users; the function signatures are already isolated there
  to make that swap easy.
- **Rate limiting / cost controls** — OpenRouter bills per token; add
  per-user limits before opening this up publicly.
- **Retry/stop generation** — the UI has room for a "stop generating" button
  next to the input; wire it to `AbortController` on the fetch in
  `client/src/api/client.js`.
- **Deploy** — the client builds to static files (`npm run build` in
  `client/`) you can host anywhere (Vercel, Netlify, S3+CDN); the server is a
  plain Node process you can run on Render, Fly.io, Railway, a VPS, etc.
