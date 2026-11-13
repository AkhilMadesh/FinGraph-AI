# GraFi AI — JARVIS for Finance

Financial risk intelligence platform with a local AI Copilot and a **RAG Knowledge Base** powered by **Ollama**.
All intelligence runs on your machine — no paid APIs, nothing leaves your computer.

## Knowledge Base (RAG)

Upload regulatory documents, fraud research, and operational guidelines; the Copilot and a dedicated
Research Mode then answer questions grounded in the actual extracted text, citing document, page, or section.

- **Formats**: PDF, DOCX, TXT, Markdown, CSV (25 MB limit — processed entirely in-browser).
- **Pipeline**: upload → text extraction → heading/paragraph-aware chunking (~800-token chunks, 120-token overlap) → local Ollama embeddings → pgvector storage (Supabase) → cosine similarity retrieval with keyword reranking → grounded streaming answer with citations.
- **Vector storage**: PostgreSQL `vector(1536)` via the `match_knowledge_chunks` RPC — owner-scoped by RLS.
- **Embedding model**: install one that outputs 1536 dimensions and select it in **AI Settings** (embedding model field), e.g. `ollama pull mxbai-embed-large`. If the model changes, reindex documents from the document detail view.
- **Security**: per-analyst ownership on every table and storage object, duplicate-content detection via SHA-256, scanned-PDF detection (marked NEEDS_OCR rather than silently indexed), prompt-injection guardrails (retrieved text is untrusted content, never instructions).
- **Investigations**: each case has a **Generate Report** action that combines real case evidence with relevant Knowledge Base passages and persists the report.

### Setup for Knowledge Base

```bash
# One-time: an embedding model (1536-dim)
ollama pull mxbai-embed-large
# A chat model
ollama pull qwen3:4b
```

Then in the app: **AI Settings** → Connect → select both models → Test generation.
Upload documents from **Knowledge Base**; once a document shows INDEXED, ask questions in Research Mode or the main Copilot.

## Investigation Intelligence (Phase 3)

- **Entity 360**: click any entity in Graph Explorer (or via Copilot tool results) to open a full profile drawer — identity, transaction statistics, behavioural deviations, direct vs inferred relationships, sliding-window activity, and the event timeline.
- **Relationship engine**: relationships are extracted from real transaction records. Direct relationships (transacted-with, used-device) are labelled **Direct**; derived links (shared device/IP) are labelled **Inferred** — a shared link is a lead, not proof of wrongdoing.
- **Graph intelligence**: on the Graph Explorer page, "Run analysis" computes degree, betweenness, and PageRank (on the real transaction graph, on demand), community structure, and shared-neighbour patterns — each with an explanation of what the algorithm does and does not show.
- **Behavioural baselines**: robust statistics (median + MAD, minimum 8 transactions of history). Deviations state their method and limitation; when history is insufficient, no deviations are assumed.
- **Temporal analysis**: sliding-window activity (5 min → 30 days) and event timelines built from actual transaction, alert, case, note, and action records. Descriptive only — no forecasting.
- **Investigation workspace**: each case opens a tabbed workspace — Overview, Transactions, Timeline, Evidence, Recommendations, Reports, Activity — with evidence review (Reviewed/Dismissed), activity logging, and human-approved recommendations.
- **Copilot tools**: the registry now includes `get_investigation_context`, `get_entity_360`, `get_behavioural_baseline`, and `get_temporal_analysis` (18 tools total), all reading real records.
- **Reports**: report generation produces the full structured report (overview, executive summary, facts, transaction/behavioural/network findings, timeline, document references, contradictions and gaps, assessment, next steps, limitations). Risk scores are labelled model outputs, never probabilities or verdicts; next steps are suggestions for the human analyst.

## What it does

- **Risk monitoring**: transactions, merchants, customers, alerts, graph exploration — computed by the in-browser multi-layer risk engine on synthetic Indian-payments data.
- **Investigations**: case management with audit trail, persisted in Supabase (per-analyst sign-in).
- **Demo Mode**: five fraud scenarios run through a real staged controller (start / pause / resume / stop / reset).
- **AI Copilot**: asks questions in natural language; retrieves real records via a tool registry; generates grounded answers streamed from a local Ollama model. Falls back honestly to a deterministic evidence engine when Ollama is offline.
- **AI Settings**: live Ollama status, installed-model discovery, model selection, generation test.

## Python Backend (Stage 1 — foundation)

A FastAPI backend now lives in `backend/`. It is the beginning of the migration
described in the master plan: React → FastAPI → Python services → Postgres/pgvector/Ollama.

**Stage 1 scope (implemented and tested):**
- Typed configuration (`app/core/config.py`) with `.env.example` documentation.
- Server-side authentication: Supabase access tokens verified independently (HS256 secret or JWKS fallback) — identity never comes from request bodies.
- Database access with two supported modes: Supabase REST adapter (default — carries the user's bearer token so **RLS stays fully enforced**) and optional direct Postgres via SQLAlchemy when `DATABASE_URL` is set.
- Health endpoints that measure, never assert: `/health/live`, `/health/ready`, `/api/v1/health/services` (database, Ollama, chat/embedding model presence, vector retrieval).
- Python Ollama client: connection check, model discovery, generation, streaming, embeddings, timeouts.
- First API endpoints: `GET /api/v1/dashboard/summary`, `GET /api/v1/ai/status`, `GET /api/v1/ai/models`, `POST /api/v1/ai/test`.
- Pytest suite (12 tests, mocked HTTP) — all passing.
- Frontend centralized API client (`src/lib/backendApi.ts`) — optional and inert until `VITE_API_BASE_URL` is set; the existing browser-side engine remains the default data path until each stage is verified.

**Not yet migrated (Stages 2–9):** transactions/customers/merchants/alerts APIs, behavioural & temporal analytics, graph intelligence (NetworkX), risk engine, ML (scikit-learn), the 18-tool Copilot registry, streaming chat, RAG document pipeline, investigation services, and the Demo Lab controller — the working browser implementations remain authoritative for now.

### Run the backend (Windows)

```powershell
cd backend

py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

copy .env.example .env
# Edit .env: set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET
# (Supabase dashboard -> Settings -> API -> JWT Secret)

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: `http://localhost:8000` — interactive docs: `http://localhost:8000/docs`
- Ollama must run on the same machine (`ollama serve`) for `OLLAMA_BASE_URL=http://127.0.0.1:11434` to work.
- Tests: `python -m pytest tests/ -q` from `backend/`.

### Frontend connection (optional, Stage 2+)

```env
# frontend .env — only set when running against the Python backend
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Setup

### 1. Frontend

```bash
npm install
npm run dev
```

Requires the Supabase project credentials in `.env` (already provisioned for Bolt projects).

### 2. Ollama (local AI — optional but recommended)

Install from [ollama.com](https://ollama.com), then:

```bash
# Start the server
ollama serve

# Pull a model (pick one that fits your hardware; ~4GB quant models are fine on 8GB RAM)
ollama pull qwen3:4b
# alternatives: llama3.1, gemma3, mistral

# Verify what's installed
ollama list
```

Then open **AI Settings** in the app, click **Connect**, and select the model.
Ollama runs at `http://localhost:11434` by default; the address is configurable in AI Settings.

> The browser talks to Ollama directly, so this works when you run GraFi AI on the
> same machine as Ollama. In hosted previews, Ollama will show as offline — the app
> remains fully functional and the Copilot uses the deterministic engine, clearly labelled.

### 3. Environment configuration example

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:4b   # must match a tag from `ollama list`
```

The model selection made in **AI Settings** is persisted in the browser and takes precedence.

## First demo run

1. Sign in (first account created becomes an admin; additional accounts get read-only VIEWER by default).
2. Open **Demo Mode**, run a scenario, watch the staged controller produce real transactions and alerts.
3. Open **AI Copilot** and ask *"What happened in the latest simulation?"* — it reads the actual generated records.

## Troubleshooting

- **Ollama shows offline**: confirm `ollama serve` is running and `curl http://localhost:11434/api/tags` returns JSON.
- **No models listed**: run `ollama pull <tag>` and click Refresh in AI Settings.
- **Slow responses**: smaller models (e.g. `qwen3:4b`) generate faster; raise the timeout in AI Settings for larger models.
- **Sign-in issues**: accounts are email/password via Supabase; new accounts are VIEWER until an admin promotes them in the database.
