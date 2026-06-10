# Artha — AI-Powered Personal Finance

> Wealth with purpose.

Artha is a full-stack personal finance app that connects your bank accounts via Plaid, tracks part-time income through shift logging, and runs a 5-agent AI pipeline to analyze spending, detect anomalies, monitor budgets, and generate natural language financial reports.

**Live:** [artha-ak.vercel.app](https://artha-ak.vercel.app)

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Recharts, DM Sans |
| Backend | Python, FastAPI, Mangum |
| AI Pipeline | LangGraph, Claude Sonnet (Anthropic) |
| Bank Data | Plaid (Transactions, Auth, Enrich, Liabilities) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Deploy | AWS Lambda (arm64) + API Gateway, Vercel |
| Infra | Docker, ECR, IAM, CloudWatch |

---

## Architecture

```
Frontend (Vercel)
↓ HTTPS
API Gateway → Lambda (FastAPI + Mangum)
↓
Supabase (PostgreSQL)     Plaid API
↓
Lambda self-invocation (async)
↓
LangGraph 5-Agent Pipeline
extract → categorize → analyze → monitor_budget → report
↓
Claude Sonnet 4 (Anthropic)
```

### Async Job Pipeline

Report generation and transaction sync run as async Lambda self-invocations to avoid the 30s API Gateway timeout. The flow:

```
POST /reports/run
→ INSERT agent_jobs { status: pending }
→ Lambda.invoke(artha-api, InvocationType=Event)
→ return { job_id } immediately (~100ms)

Background Lambda
→ runs 5-agent LangGraph workflow (~60-90s)
→ UPDATE agent_jobs { status: complete, result: {...} }

GET /reports/status?job_id=xxx
→ frontend polls every 3s until complete
```

---

## 5-Agent LangGraph Pipeline

| Agent | Role |
|---|---|
| **extract** | Fetches transactions from Plaid, filters pending, normalizes fields |
| **categorize** | Sends merchant names to Claude for AI category classification |
| **analyze** | Calculates spending totals, burn rate, Z-score anomaly detection |
| **monitor_budget** | Compares spending against user budget limits, fires alerts |
| **report** | Generates natural language financial report via Claude Sonnet |

Each agent receives the full `ArthState` TypedDict and returns an updated copy. Errors are caught per-node and stored in `state["errors"]` — the pipeline never raises, always completes.

---

## Features

- **Plaid Link** — connect sandbox or production bank accounts
- **Shift Tracking** — log income with job, hours, paid/unpaid breaks
- **AI Categorization** — Claude classifies merchant transactions
- **Anomaly Detection** — Z-score based unusual transaction flagging
- **Budget Monitoring** — set per-category limits, get warning/critical alerts
- **Cash Flow** — real income vs expenses with daily and weekly breakdowns
- **AI Report** — async 5-agent pipeline with polling UI, typically 60-90s

---

## Local Development

### Backend

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in credentials
uvicorn backend.api.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local  # set NEXT_PUBLIC_API_URL
npm run dev
```

### Tests

```bash
# Backend — 69 tests
python -m pytest backend/tests/ -v

# Frontend — 40 tests
cd frontend && npm test
```

---

## Deployment

```bash
# Build + push Docker image to ECR, update Lambda
bash scripts/deploy.sh
```

Infrastructure:
- ECR: `975050138120.dkr.ecr.us-east-1.amazonaws.com/artha-api`
- Lambda: `artha-api` (arm64, 1024MB, 300s timeout)
- API Gateway: `c7m6amw9lb`

---

## Environment Variables

### Backend (Lambda)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side ops |
| `SUPABASE_ANON_KEY` | Anon key for auth validation |
| `PLAID_CLIENT_ID` | Plaid API client ID |
| `PLAID_SECRET` | Plaid sandbox/production secret |
| `PLAID_ENV` | `sandbox` or `production` |
| `ANTHROPIC_API_KEY` | Claude API key |
| `INTERNAL_SECRET` | Shared secret for Lambda self-invocation |

### Frontend (Vercel)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API Gateway URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

---

## Project Structure

```
artha/
├── backend/
│   ├── agents/          # extract, categorize, analyze, budget_monitor, report
│   ├── api/
│   │   ├── main.py      # FastAPI app + Mangum handler
│   │   ├── routes/      # auth, jobs, shifts, plaid, budget, reports, jobs_worker
│   │   └── schemas.py   # Pydantic models
│   ├── db/supabase.py   # Supabase client
│   ├── income/          # jobs.py, shifts.py — business logic
│   ├── orchestrator/    # workflow.py — LangGraph pipeline
│   ├── utils/           # async_invoker.py
│   └── tests/           # 69 tests
├── frontend/
│   ├── app/             # Next.js App Router pages
│   ├── lib/             # api.ts, supabase.ts, utils.ts
│   └── __tests__/       # 40 tests
├── infra/lambda/        # Dockerfile
├── scripts/deploy.sh    # ECR + Lambda deploy
└── pyproject.toml       # ruff, mypy, pytest config
```
