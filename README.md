# Amazon Route 53 Console Clone

A pixel-accurate, fully functional clone of the **Amazon Web Services (AWS) Route 53** web management console, built with the official `@cloudscape-design/components` design system and powered by a FastAPI backend with SQLite persistent storage.

---

## 🌟 Key Features & Highlights

- **Pixel-Accurate AWS Console Experience**:
  - Official `@cloudscape-design/components` + `@cloudscape-design/global-styles`.
  - Top global navigation bar with AWS logo, service menu, global search (`[Option+S]`), region dropdown, and account profile dropdown.
  - Route 53 collapsible sidebar matching official AWS console navigation.
  - Dark mode and light mode native switching via `applyMode(Mode.Dark)` / `applyMode(Mode.Light)`.
  - Responsive table views with column sorting, search filters, pagination, and multi-row selection.
  - Destructive confirmation modals requiring typing `"delete"` to confirm.
- **Authentication & Route Protection**:
  - Authentic AWS Sign-In page with IAM User / Root User tabs and one-click demo credentials.
  - Secure session management via `httpOnly`, `SameSite=Lax` cookies.
  - Route protection using Next.js `middleware.ts`.
- **Hosted Zones (Full CRUD)**:
  - List hosted zones with dynamic record count calculation, search, type filtering, and sorting.
  - Create Public and Private hosted zones (with VPC region and VPC ID associations).
  - Automatically seeds default apex `NS` (4 nameservers) and `SOA` records on zone creation.
  - Cascade deletion: Deleting a hosted zone cascades and deletes all associated DNS records via SQLite `PRAGMA foreign_keys=ON`.
- **DNS Records (Full CRUD & Exact Route 53 Workflows)**:
  - Full-page record creation (`/hosted-zones/[id]/records/create`) and full-page edit (`/hosted-zones/[id]/records/[recordId]/edit`).
  - Route 53 tabs: *Records*, *Hosted zone details* (key-value metadata), *DNSSEC signing* (placeholder), and *Query logging* (placeholder).
  - SplitPanel preview on the right when an individual record is selected.
  - Supported record types: `A`, `AAAA`, `CNAME`, `TXT`, `MX`, `NS`, `PTR`, `SRV`, `CAA`.
  - RFC-compliant syntax validators per record type.
  - Support for `Simple` and `Weighted` routing policies with differentiator `set_identifier` and `weight` (0–255).
  - Multi-value records support (round-robin / multiline textarea).
  - Search across **both** record name and record value.
  - **Apex Protection**: Built-in guard preventing deletion of apex `NS` and `SOA` records (returns HTTP 400).
- **Bonus Capabilities**:
  - **BIND Zone File Import**: Upload `.zone` file or paste raw RFC 1035 zone text to batch-import records.
  - **Export Zone**: Export records to standard RFC 1035 BIND format or JSON document.
  - **Bulk Deletion**: Select multiple records via checkboxes and delete in one transaction.
  - **Keyboard Shortcuts**: Press `?` for shortcuts modal, `[Option+S]` or `Alt+S` or `/` for search, `Esc` to close modals.
  - **Auto-Seed on Startup**: Database seeds default users and realistic zones automatically if empty (supports ephemeral hosts like Render).

---

## 🏗️ Architecture Overview

```
scalerai-aws/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, SQLite engine with PRAGMA foreign_keys=ON, security
│   │   ├── models/         # SQLAlchemy models (User, HostedZone, DNSRecord)
│   │   ├── schemas/        # Pydantic validation schemas
│   │   ├── routers/        # FastAPI routes (auth, hosted_zones, dns_records, tools)
│   │   ├── services/       # Business logic, DNS validators, BIND parser & exporter
│   │   ├── initial_data.py # Auto-seed initial data on startup
│   │   └── main.py         # Application entrypoint & CORS middleware
│   ├── tests/              # 100% pass pytest test suite (16 tests)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── middleware.ts   # Next.js route protection middleware
│   │   ├── app/            # App Router pages (login, dashboard, hosted-zones, records)
│   │   ├── components/     # TopNav, SideNav, DeleteModal, BindImportModal, ExportModal
│   │   └── lib/            # Types, API client with credentials, auth context
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 💾 Database Schema

### `users`
- `id`: Integer (PK, Autoincrement)
- `username`: String(50) (Unique, Indexed)
- `email`: String(100) (Unique, Indexed)
- `account_id`: String(12) (AWS Account Number)
- `hashed_password`: String(255) (Bcrypt hash)
- `created_at`: DateTime (UTC)

### `hosted_zones`
- `id`: String(32) (PK, e.g. `Z02TDWAVPXVUAZC`)
- `name`: String(255) (Indexed, e.g. `myexamplewebsite.xyz.`)
- `description`: Text (Nullable, up to 256 chars)
- `type`: String(20) (`Public` or `Private`)
- `created_by`: String(50) (Default: `"Route 53"`)
- `vpc_id`: String(50) (Nullable)
- `vpc_region`: String(50) (Nullable)
- `caller_reference`: String(64) (Unique)
- `created_at`, `updated_at`: DateTime (UTC)
*Note: `record_count` is dynamically calculated with `func.count(DNSRecord.id)`.*

### `dns_records`
- `id`: String(32) (PK)
- `zone_id`: String(32) (FK -> `hosted_zones.id` `ON DELETE CASCADE`)
- `name`: String(255) (Indexed, FQDN)
- `type`: String(10) (Indexed: `A`, `AAAA`, `CNAME`, `TXT`, `MX`, `NS`, `PTR`, `SRV`, `CAA`, `SOA`)
- `routing_policy`: String(20) (`Simple` or `Weighted`)
- `set_identifier`: String(128) (Differentiator for weighted records)
- `weight`: Integer (Nullable, 0–255)
- `ttl`: Integer (Default: 300)
- `records`: JSON (List of strings)
- `is_alias`: Boolean (Default: False)
- `alias_target`: String(255) (Nullable)
- `evaluate_target_health`: Boolean (Default: False)
- `created_at`, `updated_at`: DateTime (UTC)
- **Composite Unique Constraint**: `(zone_id, name, type, set_identifier)`

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend will automatically create tables and seed demo data on startup.
- Swagger Documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### 2. Run Backend Tests (pytest)
```bash
cd backend
.\venv\Scripts\pytest -v
```
All 16 tests covering DNS validators, BIND parser, zone CRUD, record CRUD, and bulk delete will execute.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 4. Running with Docker Compose
```bash
docker-compose up --build
```

---

## 🔑 Demo Credentials

| Role | Username / Email | Password | AWS Account ID |
|---|---|---|---|
| **Admin** | `admin` / `admin@example.com` | `password123` | `123456789012` |
| **Demo User** | `paul-philip` / `paul@example.com` | `password123` | `987654321098` |

*(The Sign-In page also provides convenient one-click buttons to populate credentials automatically).*

---

## 🌐 Cloud Deployment Guide

### Deployment Architecture
- **Frontend (Vercel)**: Next.js App Router static and dynamic pages. All API calls from the browser use relative `/api/v1/...` paths. Next.js rewrites in `next.config.mjs` transparently proxy `/api/*` to the backend URL set in `BACKEND_URL`. This ensures that session cookies (`session_token`) remain **strictly same-origin**, avoiding all third-party cookie restrictions.
- **Backend (Render)**: FastAPI with persistent SQLite storage and automatic startup seeder. Health check is exposed at `/health`.

---

### Step 1: Deploy Backend to Render

1. Log in to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository containing `scalerai-aws`.
3. Configure the service:
   - **Name**: `aws-route53-backend` (or your choice)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3` (or choose `Docker` to use `backend/Dockerfile`)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. Set the **Environment Variables** in Render:
   | Key | Value | Description |
   |---|---|---|
   | `SECRET_KEY` | `your-secure-random-secret-key-min-32-chars` | JWT signature key |
   | `CORS_ORIGINS` | `https://your-frontend-app.vercel.app` | Your Vercel frontend URL (or `*`) |
   | `SQLITE_PATH` | `./route53.db` | File path for SQLite database |
   | `DATABASE_URL` | `sqlite:///./route53.db` | Full database connection string |
5. Click **Create Web Service**.
6. When deployment finishes, copy your Render service URL (e.g. `https://aws-route53-backend.onrender.com`).
7. Verify health by visiting: `https://aws-route53-backend.onrender.com/health`.

---

### Step 2: Deploy Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import your GitHub repository.
3. In the configuration screen:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Build Command**: `npm run build` (default)
   - **Install Command**: `npm install` (default)
4. Add the **Environment Variable** in Vercel:
   | Key | Value | Description |
   |---|---|---|
   | `BACKEND_URL` | `https://aws-route53-backend.onrender.com` | URL of your deployed Render backend (no trailing slash) |
5. Click **Deploy**.
6. When deployment completes, open your Vercel URL (e.g. `https://your-frontend-app.vercel.app`).
   - You will be redirected to the AWS Sign-In page `/login`.
   - Use the prefilled demo credentials or log in with `admin` / `password123`.

---

## 🔑 Environment Variables Reference

### Frontend (Vercel)
| Variable | Required | Example Value | Description |
|---|---|---|---|
| `BACKEND_URL` | **Yes** | `https://aws-route53-backend.onrender.com` | Base URL of the FastAPI backend on Render. Next.js rewrites `/api/*` to this destination. |

### Backend (Render)
| Variable | Required | Example Value | Description |
|---|---|---|---|
| `PORT` | Set by Render | `10000` | Port automatically provided by Render. |
| `SECRET_KEY` | **Yes** | `super-secret-key-replace-me-12345` | Secret used to sign and verify session JWTs. |
| `CORS_ORIGINS` | Optional | `https://your-frontend.vercel.app` | Comma-separated allowed CORS origins. |
| `SQLITE_PATH` | Optional | `./route53.db` | Relative or absolute path for SQLite file. |
| `DATABASE_URL` | Optional | `sqlite:///./route53.db` | Database connection URL. |

