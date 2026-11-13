# GraFi AI — Final Status Report

Platform: AI financial risk intelligence for digital payments ("Your JARVIS for
Finance"). React 18 + TypeScript + Vite + Tailwind frontend, Python FastAPI
backend, Supabase (Postgres + RLS + auth), local Ollama models.

## 1. What is fully implemented and tested

- **FastAPI foundation (Stage 1)**: typed config, server-side Supabase JWT
  verification (HS256 secret + JWKS fallback), REST adapter that forwards the
  caller's token so RLS stays enforced, optional SQLAlchemy engine, health
  endpoints, CORS allowlist, safe error hierarchy.
- **Core APIs**: transactions (filters, sorting, pagination, detail, timeline,
  summary), customers/merchants, alerts (list/detail/status update), graph
  analysis, model registry.
- **Intelligence engines**: robust behavioural baselines (median + MAD),
  sliding-window temporal analysis with burst detection, NetworkX entity graph
  with bounded betweenness and guarded PageRank, transparent risk engine with
  published weights (amount .30 / velocity .20 / behavioural .20 / temporal .15
  / graph .15, renormalised over evaluated components) and a disclaimer on
  every response.
- **ML engine**: Isolation Forest (unsupervised), persisted artifact with
  SHA-256, registry that states no metrics are computable (no labels exist).
- **Copilot**: 18 deterministic tools, deterministic tool planning, SSE token
  streaming from local Ollama (`phi3:latest`), honest offline fallback,
  conversation history via RLS-scoped tables.
- **RAG knowledge base**: upload validation, text/PDF/DOCX/CSV extraction with
  OCR-needed detection, heading-aware chunking, Ollama embeddings with a hard
  1536-dimension check (nomic's 768-dim is refused with a reindex message
  rather than silently mixed), retrieval via the `match_knowledge_chunks` RPC,
  duplicate-hash rejection.
- **Investigations**: case CRUD, notes, evidence with review workflow,
  recommendations that require explicit human accept/dismiss, deterministic
  report generation that cites evidence and lists its own limitations.
- **Demo Lab**: threaded controller (IDLE → STARTING → INJECTING →
  RISK_SCORING → GRAPH → ALERTS → COMPLETE) with pause/resume/stop/reset, five
  scenarios including a low-risk control, in-memory only, synthetic-labelled.
- **Dataset Intelligence**: registered profiles for ANZ 2018 (23 cols, AUD,
  explicitly "not Indian/UPI data") and the 2023 sample (9 cols, currency
  unknown), schema-checked uploads, SHA-256 dedup, quality reports, per-dataset
  unsupervised anomaly ranking, and tests that forbid precision/recall/F1.
- **Frontend**: all 16 pages, backend-aware Dataset Intelligence page,
  9-step Presentation Mode walkthrough, existing UI preserved.

**Tests: 70 backend tests passing. Frontend build passing. ESLint: 0 errors
(5 advisory fast-refresh warnings only).**

Note on the honest-metrics tests: the model registry test checks the registry's
human-readable fields and deliberately excludes the artifact SHA-256 hex, which
can contain coincidental substrings (e.g. "f1") — a false positive, not a
fabricated metric.

## 2. Implemented but not live-tested end-to-end

- Ollama streaming with real `phi3:latest` output (unit-tested with mocks;
  needs a machine with Ollama running).
- RAG upload of real scanned PDFs (OCR-needed path returns honest refusal; OCR
  itself is intentionally not implemented).
- Live re-embedding of a whole KB with `nomic-embed-text:latest` — the pgvector
  column is 1536-dim, so a reindex migration is required first.

## 3. Partially implemented

- Frontend-backend integration: the backend API client and the Dataset
  Intelligence page are live; other pages still use the browser-side engines by
  design (identical outputs, verified incrementally per feature).
- Direct-Postgres mode (DATABASE_URL) works but RLS scoping then depends on
  explicit owner filters; the REST adapter is the safe default.

## 4. Not implemented (by design)

- OCR for scanned documents.
- Fabricated accuracy metrics anywhere — no fraud labels exist in any dataset.
- Any claim that the ANZ or 2023 datasets are Indian/UPI data.
- Auto-execution of Copilot recommendations — always human-in-the-loop.

## 5. Presentation script (5–7 minutes)

1. **Overview (30s)** — the dashboard; every figure is computed, synthetic and reproducible.
2. **Transactions (45s)** — open one; show component scores and weights; stress the disclaimer.
3. **Alerts (30s)** — triage flow; note the audit trail.
4. **Graph (45s)** — shared-device links; observed vs inferred labelling.
5. **Copilot (60s)** — ask "why is this merchant risky?"; show the tool trace; note offline honesty.
6. **Investigations (60s)** — evidence review, human-in-the-loop recommendation, generated report with limitations.
7. **Dataset Intelligence (45s)** — two isolated datasets, schema checks, no metrics without labels.
8. **Model Registry (30s)** — honest evaluation notes.
9. **Demo Mode (60s)** — run a scenario end-to-end; reset. Close with Presentation Mode's guided tour.

## 6. Windows quick start

Frontend: `npm install`, `npm run dev`.
Backend and Ollama: see `backend/README.md` for the exact commands
(`py -3.12 -m venv .venv`, pip install, `ollama pull phi3:latest`,
`ollama pull nomic-embed-text:latest`, `ollama serve`, uvicorn on port 8000,
then set `VITE_API_BASE_URL=http://localhost:8000`).

## 7. Known limitations

- Demo sessions and dataset uploads live in backend memory; restart clears them
  (stated in the UI where relevant).
- Copilot tool planning is deterministic, not LLM-driven — a deliberate choice
  for auditability.
- The knowledge-base embedding dimension (1536) does not match
  nomic-embed-text (768); the pipeline refuses rather than corrupts.
