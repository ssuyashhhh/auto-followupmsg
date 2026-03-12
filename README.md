# Auto Follow-Ups — AI Cold Outreach Generator

Full-stack application for generating personalized cold outreach messages and automated follow-ups using AI (OpenAI GPT / Anthropic Claude).

## Architecture

| Service | Tech | Port |
|---|---|---|
| Frontend | Next.js 14, React 18, TailwindCSS | 3000 |
| API | FastAPI, SQLAlchemy 2.0 | 8000 |
| Database | PostgreSQL 16 | 5432 |
| Queue | Celery + Redis 7 | 6379 |
| Storage | Supabase Storage | — |

## Quick Start (Docker)

```bash
# 1. Clone and configure
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# 2. Start all services
docker compose up -d --build

# 3. Run database migrations
docker compose exec api alembic upgrade head

# 4. Open the app
# Frontend: http://localhost:3000
# API docs: http://localhost:8000/api/v1/docs
```

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt

# Start API
uvicorn app.main:app --reload --port 8000

# Start Celery worker (separate terminal)
celery -A app.tasks.celery_app worker --loglevel=info

# Start Celery beat (separate terminal)
celery -A app.tasks.celery_app beat --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (asyncpg) |
| `REDIS_URL` | Redis connection string |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon key |
| `SECRET_KEY` | JWT signing secret |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: `http://localhost:8000/api/v1`) |

## Features

- **CSV/Excel/TXT Upload** — Parse contact files, map columns automatically
- **AI Message Generation** — GPT-4o, Claude 3.5 Sonnet, and more
- **Follow-up Chains** — Automated follow-up scheduling (3/5/7 day delays)
- **Prompt Templates** — Custom system/user prompts with variable substitution
- **Campaign Management** — Draft, active, paused, completed workflows
- **Real-time Task Tracking** — Celery task progress via polling
- **Message Regeneration** — Re-generate individual messages with model override

## Project Structure

```
auto follow ups/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Settings
│   │   ├── database.py          # DB sessions
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # API endpoints
│   │   ├── services/            # Business logic
│   │   ├── tasks/               # Celery tasks
│   │   └── utils/               # Auth, storage helpers
│   ├── alembic/                 # Migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js pages
│   │   ├── components/          # React components
│   │   ├── lib/                 # API client, hooks, types
│   │   └── stores/              # Zustand stores
│   ├── Dockerfile
│   └── package.json
├── render.yaml                  # Render blueprint
└── docker-compose.yml           # Local dev
```

---

## Production Deployment (Free Tier)

**Stack:** Supabase (DB + Storage) → Upstash (Redis) → Render (Backend) → Vercel (Frontend)

### Step 1: Supabase — Database + Storage

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **project password** during creation
3. **Get Database URL:**
   - Dashboard → **Settings** → **Database** → **Connection string** → **URI** tab
   - Copy the URI and replace `postgres://` prefix with `postgresql+asyncpg://`
   - Use port `6543` (transaction pooler) for better performance
   - Example: `postgresql+asyncpg://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
4. **Get API keys:**
   - Dashboard → **Settings** → **API**
   - Copy `Project URL` → this is your `SUPABASE_URL`
   - Copy `anon public` key → this is your `SUPABASE_KEY`
5. **Create storage bucket:**
   - Dashboard → **Storage** → **New bucket** → name: `uploads`, set to private

### Step 2: Upstash — Redis

1. Go to [console.upstash.com](https://console.upstash.com) and create a Redis database
2. Select the **free** tier, pick the closest region
3. Copy the **rediss:// endpoint** (with password, TLS) → this is your `REDIS_URL`
   - Format: `rediss://default:[password]@[endpoint].upstash.io:6379`
   - The app auto-enables TLS when it detects `rediss://`

### Step 3: Render — Backend (API + Worker + Beat in one service)

> **Note:** Render free tier only includes Web Services — Background Workers require a paid plan.
> The app bundles uvicorn + Celery worker + beat into a single container via `start.sh`.

1. Go to [render.com](https://render.com) and connect your GitHub repo
2. **Option A — Blueprint (recommended):**
   - Dashboard → **Blueprints** → **New Blueprint Instance**
   - Select your repo → Render reads `render.yaml` and creates the service
   - Fill in env vars in the dashboard
3. **Option B — Manual:**
   - New → **Web Service** → Docker
   - Root Directory: `./backend`
   - Dockerfile Path: `./backend/Dockerfile`
   - Plan: **Free**
4. **Set environment variables:**
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Supabase connection string (from Step 1) |
   | `REDIS_URL` | Upstash `rediss://` URL (from Step 2) |
   | `SUPABASE_URL` | `https://[ref].supabase.co` |
   | `SUPABASE_KEY` | Supabase anon key |
   | `OPENAI_API_KEY` | Your OpenAI key |
   | `ANTHROPIC_API_KEY` | Your Anthropic key (optional) |
   | `SECRET_KEY` | Run: `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
   | `FRONTEND_URL` | Your Vercel URL (set after Step 4) |

5. **Run migrations** after first deploy:
   - Render Dashboard → your web service → **Shell** tab
   - Run: `alembic upgrade head`

### Step 4: Vercel — Frontend

1. Go to [vercel.com](https://vercel.com) and import your repo
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://[your-render-service].onrender.com/api/v1`
4. Deploy — Vercel auto-detects Next.js
5. **Go back to Render** and set `FRONTEND_URL` to your Vercel URL (e.g., `https://your-app.vercel.app`)

### Post-Deployment Checklist

- [ ] Supabase DB created, connection string copied (use `postgresql+asyncpg://` prefix)
- [ ] Supabase `uploads` bucket created (private)
- [ ] Upstash Redis created, `rediss://` URL copied
- [ ] Render web service deployed, health check passes (`/health`)
- [ ] `alembic upgrade head` executed on Render Shell
- [ ] Vercel frontend deployed
- [ ] `FRONTEND_URL` set on Render → your Vercel URL
- [ ] `NEXT_PUBLIC_API_URL` set on Vercel → your Render URL + `/api/v1`
- [ ] Register first user at `https://your-app.vercel.app/register`

### Free Tier Limits

| Service | Free Tier Limit |
|---|---|
| Supabase | 500 MB DB, 1 GB storage, 50K monthly active users |
| Upstash | 10K commands/day, 256 MB storage |
| Render | 750 hrs/month, spins down after 15 min inactivity |
| Vercel | 100 GB bandwidth, 6000 min build/month |
