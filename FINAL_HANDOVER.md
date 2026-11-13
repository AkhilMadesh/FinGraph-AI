# GraFi AI — Final Handover

**Date:** 2026-11-12 · **Status:** Presentable from the Bolt Preview on the analyst's laptop with Personal Presentation Mode; hosted mode optional.

## 0. Two-mode architecture (2026-11-12, final session)

**Mode A — Personal Presentation Mode (primary, for tomorrow):** the browser on
the analyst's machine talks directly to Ollama at `http://localhost:11434`
(phi3:latest chat, nomic-embed-text:latest embeddings, 768 dims). Selected
explicitly in AI Settings; stored per-browser. The public site never touches
localhost — only this explicitly selected mode does.

**Mode B — Hosted Bolt Mode (optional):** requests go through the deployed
`ai-proxy` edge function (Ollama-only). With no tunnel configured it returns
"Hosted AI is not configured. Use Personal Presentation Mode on your own
machine." — never a blocker, never a fake answer.

**Blank-preview fix:** the previous build crashed at import time when
environment variables were missing. The client now initialises safely with
placeholders, auth degrades gracefully, and no AI credential is required to
load the app.

**Copilot grounding (Part 4):** phi3 receives an EVIDENCE block built from the
existing deterministic tools (transactions, merchants, customers, alerts,
graph, cases, datasets, demo scenarios, Knowledge Base passages). Explicit
prompt rule: never invent ids, names, metrics or figures. Offline -> honest
deterministic fallback, streaming/Stop/history preserved.

**Embeddings (Part 5):** all embedding calls go through the mode layer;
dimension is verified against 768 before retrieval; pgvector schema, RLS and
owner-scoped RPC untouched. Failed documents keep their real error message.

**Datasets (Part 6):** ANZ_2018 (AUD, Australia, no fraud labels) and
SAMPLE_2023 (currency unknown, no fraud labels) remain strictly isolated; no
supervised accuracy claims anywhere.

**AI Settings (Part 7):** mode selector, Ollama URL, both model names,
connection status (CONNECTED / OFFLINE / CONNECTION_ERROR / NOT_CONFIGURED),
per-model availability, embedding dimensions, Test Chat (real phi3 question),
Test Embedding, Refresh Models. Green requires a real successful request.

## Windows setup for tomorrow

### Step 1 — Start the secure local proxy (REQUIRED for tunnel use)

`local-proxy/ollama_secure_proxy.py` listens on `127.0.0.1:11435` and enforces
bearer-token auth before forwarding ONLY `/api/tags`, `/api/generate`,
`/api/chat`, `/api/embeddings` to Ollama at `127.0.0.1:11434`. Stock Ollama
ignores Authorization headers, so this proxy is the actual auth layer. **VERIFIED
IN TESTS:** missing token -> 401, wrong token -> 401, valid token -> 200,
non-whitelisted path -> 404, streaming relay + 768-dim embeddings pass.

```powershell
# One-time stable token (choose your own random string; never commit it):
setx GRAFI_PROXY_TOKEN "<paste-a-long-random-string-here>"
# Start a NEW PowerShell after setx, then:
cd <repo-root>\local-proxy
python ollama_secure_proxy.py
# Health check (no token needed, exposes no data):
curl http://127.0.0.1:11435/health
```

Verify rejection before trusting it (both must print 401):

```powershell
curl http://127.0.0.1:11435/api/tags
curl -H "Authorization: Bearer wrong-token" http://127.0.0.1:11435/api/tags
```

### Step 2 — Tunnel the PROXY only (never port 11434)

```powershell
cloudflared tunnel --url http://127.0.0.1:11435
```

Copy the printed `https://<something>.trycloudflare.com` URL.

### Step 3 — Point GraFi AI at the tunnel

AI Settings -> Personal Presentation Mode -> paste the tunnel URL into
**Ollama URL** -> Apply, paste `GRAFI_PROXY_TOKEN` into **Bearer token** -> Save
-> **Refresh Models** -> **Test Chat** -> **Test Embedding**. Green = ready.
For pure localhost use (no tunnel), the Ollama URL stays
`http://localhost:11435` with the proxy running, or `http://localhost:11434`
only when the browser is on the same machine.

Ollama CORS (`OLLAMA_ORIGINS`) is no longer required when going through the
proxy — the proxy adds CORS headers itself.

---

## 0. Ollama-only hosted architecture (2026-11-12, latest session)

Ollama is the ONLY AI provider. OpenAI/Anthropic/Gemini support was removed —
no third-party or paid hosted LLM exists anywhere in the codebase.

- **`ai-proxy` Supabase Edge Function** (deployed, Ollama-only) is the
  production AI path: status/health (verifies BOTH models are installed before
  reporting connected), streaming chat, and embeddings — all server-side.
  Models are fixed: `OLLAMA_CHAT_MODEL` (default phi3),
  `OLLAMA_EMBEDDING_MODEL` (default nomic-embed-text),
  `OLLAMA_EMBEDDING_DIMENSIONS` (default 768, matches the pgvector store).
- **Secure tunnel requirement:** a Bolt-hosted edge function CANNOT reach a
  private laptop's `localhost:11434`. The verified-safe pattern is an
  authenticated tunnel from the Ollama machine: Cloudflare Tunnel with Access
  service-token headers, or ngrok behind basic auth. The edge function sends
  the tunnel's auth automatically from secrets. No tunnel URL is invented and
  connectivity is never claimed before a live check succeeds.
- **Secrets the edge function accepts** (all currently unset — status returns
  configured:false with setup steps):
  `OLLAMA_BASE_URL` (tunnel HTTPS URL), optional `OLLAMA_API_KEY`
  (Bearer), optional `OLLAMA_CF_ACCESS_CLIENT_ID`/`OLLAMA_CF_ACCESS_CLIENT_SECRET`
  (Cloudflare Access service token), plus the model-name overrides above.
- **Frontend routing:** on the published site all AI (Copilot, Knowledge Base
  research, RAG embeddings, report generation, health checks, AI Settings)
  goes through the edge function; on localhost development the browser talks
  to local Ollama directly. Both paths share one stream parser.
- **AI Settings page** displays: Provider Ollama, chat model phi3, embedding
  model nomic-embed-text, dimension 768, real connection status, last
  successful health check, generation test and embedding test — plus the
  tunnel setup instructions when not yet configured.
- **Honest states:** when the tunnel is absent or Ollama is offline, every AI
  surface says so and the deterministic evidence engine answers instead. No
  fabricated AI responses anywhere.
- All other functionality is unaffected by the tunnel: auth, dashboard,
  transactions, customers, merchants, alerts, graph, entity 360,
  investigations, audit, model registry, demo lab, regulatory radar,
  presentation mode, dataset registrations.


## 0. Local AI integration changes (2026-11-12, later session)

- **Vector store re-dimensioned 1536 → 768** to match `nomic-embed-text:latest`
  (migration applied to the Supabase project; table was empty, so lossless).
  The `match_knowledge_chunks` RPC was re-created for vector(768) with the same
  owner-scoped security and grants. RAG indexing/retrieval now works with the
  configured embedding model.
- **AI Settings page now talks only to the FastAPI backend** (backend status,
  Ollama status, model discovery, generation test, embedding test with live
  dimension report). The browser never calls Ollama directly.
- **New backend endpoint** `POST /api/v1/ai/test-embedding` returns the real
  embedding dimension and whether it matches the vector store.
- Three pre-existing frontend type errors fixed (missing import, wrong
  property names, stray prop). Typecheck now passes with 0 errors.

---

## 1. Architecture

- **Frontend:** React 18 + TypeScript + Vite + Tailwind (`src/`), dev server on
  `http://localhost:5173`. Talks to Supabase (auth + investigations/audit
  storage) and, when `VITE_API_BASE_URL` is set, to the Python backend.
- **Backend:** FastAPI (`backend/app/main.py`, module `app.main:app`) on
  `http://localhost:8000`, Swagger at `/docs`. Routers under
  `app/api/v1/` (transactions, entities, alerts, dashboard, graph,
  investigations, copilot, knowledge, datasets, demo, models, ai, health).
- **Database:** Supabase (Postgres) — migrations in `supabase/migrations/`.
- **AI:** local Ollama at `http://localhost:11434` — chat `phi3:latest`,
  embeddings `nomic-embed-text:latest` (see `backend/app/services/ollama/client.py`).
- **ML:** scikit-learn Isolation Forest, artifacts + registry in
  `backend/.ml-artifacts/` (`backend/app/services/ml/engine.py`).

## 2. What is implemented (state per area)

| Area | Status |
|---|---|
| Backend intelligence engines (behavioural / temporal / graph / risk) | **VERIFIED** (70 backend tests green) |
| ML training, registry, persistence, inference | **VERIFIED** (tests load the real `.pkl` artifact) |
| Copilot tool registry + grounded answers | **VERIFIED** (tool-level, mocked LLM) |
| Investigations lifecycle + audit trail (Supabase RLS) | **VERIFIED** at unit level; **NOT TESTED** live against your Supabase project from this sandbox |
| Dataset Intelligence upload / quality / analytics / isolation | **VERIFIED** at unit level (see `backend/tests/test_datasets.py`) |
| Frontend production build, TypeScript, ESLint | **VERIFIED** (0 lint errors) |
| Live Ollama chat/embeddings/streaming | **BLOCKED** here — needs your machine |
| Live end-to-end with Supabase auth + real browser session | **NOT TESTED** here — needs your machine |
| Presentation mode (9-step walkthrough) | **VERIFIED** as UI code; **NOT TESTED** in a live browser from this sandbox |
| Fraud-detection accuracy | **NOT IMPLEMENTED** by design — no dataset has fraud labels; no precision/recall is claimed anywhere |

## 3. Existing test results (as last run, 2026-11-12)

- Backend: **70 passed** (`python -m pytest tests/ -q`, ~50 s).
- Frontend: **production build succeeds** (`npm run build`); **typecheck 0 errors**;
  ESLint: **0 errors**, 5 advisory fast-refresh warnings.

## 4. What has only been tested with mocks

- Ollama chat generation, streaming and stop-generation (tests mock the HTTP
  client; the honest-offline fallback path is covered).
- Supabase REST data access in the backend adapter (tests stub responses).
- End-to-end Copilot conversations, RAG retrieval quality, dataset anomaly
  quality on your real CSVs — all need live services.

## 5. What requires your Windows machine

1. Live Ollama: connection check, model pull, chat + embeddings (section 9).
2. Live Supabase: fill `.env`, run the frontend login, confirm investigations
   and audit logs persist.
3. Real dataset uploads through the UI (section 11).
4. A full presentation dry-run (section 12).

## 6. Exact installation commands (PowerShell)

Prerequisites: **Python 3.11+** (`py -3.12` works), **Node.js 18+**, Ollama
installed. From the repo root:

```powershell
# Backend
cd backend
py -3.12 -m venv .venv
.venv\Scripts\pip install -r requirements.txt
copy .env.example .env
# edit .env — see section 10

# Frontend (second step, repo root)
cd ..
npm install
```

## 7. Backend startup (PowerShell)

```powershell
cd backend
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Swagger: <http://localhost:8000/docs>

## 8. Frontend startup (PowerShell)

```powershell
# repo root
npm run dev
```

Before first run, create `.env.local` in the repo root so the frontend uses the
Python backend:

```
VITE_API_BASE_URL=http://localhost:8000
```

Frontend: <http://localhost:5173>

## 9. Ollama verification commands

```powershell
ollama --version
ollama list                 # must show phi3:latest and nomic-embed-text:latest
ollama pull phi3:latest
ollama pull nomic-embed-text:latest
curl http://localhost:11434/api/tags
```

Then open <http://localhost:8000/docs> and use `POST /api/v1/ai/test` (generation)
and `POST /api/v1/ai/test-embedding` (reports the live dimension, must be 768).
The AI Settings page in the app shows the same checks with Connect/Refresh
buttons — it displays "Operational" only after a real successful response. The
Copilot page shows an honest offline banner if the endpoint is unreachable; it
never fabricates answers.

## 10. Database configuration

Backend `backend/.env` (values from Supabase → Project Settings → API):

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_JWT_SECRET=<JWT secret>        # optional: enables HS256 verification
# DATABASE_URL=                          # leave unset: REST adapter keeps RLS on
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

Frontend `.env` already contains its Supabase keys in this project. Migrations
in `supabase/migrations/` have been applied to the provisioned project; if you
create a fresh Supabase project, apply them in filename order (Supabase CLI or
SQL editor).

## 11. Dataset upload

Dataset Intelligence page → upload:

- `anz.csv` → select dataset **anz_2018** (schema-checked: 23 columns expected,
  AUD, Australia, labelled as user-supplied — *not* Indian/UPI data).
- `sample_dataset.csv` → select dataset **sample_2023** (9 columns; currency
  unknown and shown as such).

Each upload gets an ID, a data-quality report, and is analysed **strictly in
isolation** — the two datasets are never merged. Files are not committed to the
repository; uploads land in `backend/.datasets-uploads/` at runtime.

## 12. End-to-end presentation checklist (~6 minutes)

1. **Login** (Supabase email/password) → Dashboard loads live KPIs.
2. **Transactions** — open a high-risk transaction; walk through the risk
   breakdown and explanations.
3. **Customers / Merchants** — profile, baseline, deviation signals.
4. **Graph Explorer** — shared-device/IP links; observed vs inferred labelled.
5. **AI Copilot** — ask: *"What is the current financial risk situation?"*,
   *"Show the highest-risk transactions."*, *"Why was this transaction flagged?"*
6. **Dataset Intelligence** — show the quality report of one uploaded dataset.
7. **Investigations** — create a case, attach evidence, generate the report.
8. **Demo Lab** — run the velocity scenario, watch alerts appear, then Reset.
9. **Close with Risk Intelligence → Explainability** tab.

## 13. Known limitations

- Risk scores are explainable triage heuristics — **not** fraud probabilities.
- No dataset here has verified fraud labels, so no supervised accuracy metrics
  exist anywhere in the app (by design).
- ANZ 2018 and the 2023 sample are user-supplied foreign datasets, clearly
  labelled; they are never presented as Indian UPI records.
- Graph links from shared devices/IPs are investigative **leads**, not proof.
- Predictive risk is linear extrapolation of recent trajectories — prototype.
- Ollama offline → the Copilot says so honestly; it does not invent answers.
- Live integration (Ollama, Supabase, real uploads) was **not** executed from
  this sandbox — run sections 7–9 before presenting.
