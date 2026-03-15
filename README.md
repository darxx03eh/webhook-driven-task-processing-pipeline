![Tests](https://github.com/darxx03eh/webhook-driven-task-processing-pipeline/actions/workflows/ci.yml/badge.svg)
![Tests](https://github.com/darxx03eh/webhook-driven-task-processing-pipeline/actions/workflows/cd.yml/badge.svg)
# Webhook-Driven Task Processing Pipeline

A production-style webhook processing platform built with TypeScript, PostgreSQL, Docker, and GitHub Actions.

The system lets authenticated users create pipelines with:
- a unique webhook endpoint,
- ordered processing steps,
- subscriber endpoints.

Incoming webhooks are accepted asynchronously (`202 Accepted`), stored as jobs, processed by a background worker, and delivered to subscribers with retry tracking.

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Run with Docker](#run-with-docker)
- [Database and Migrations](#database-and-migrations)
- [API](#api)
- [Step Types and stepConfig](#step-types-and-stepconfig)
- [Webhook Signature](#webhook-signature)
- [Worker Flow and Reliability](#worker-flow-and-reliability)
- [CI Pipeline](#ci-pipeline)
- [CD Pipeline](#cd-pipeline)
- [Domain and HTTPS](#domain-and-https)
- [Design Decisions](#design-decisions)
- [Troubleshooting](#troubleshooting)

## Features
- JWT authentication (`register`, `login`, `me`) with issuer/audience validation.
- Pipeline management (create/list/get/delete).
- Pipeline steps management (create/list/update/delete).
- Subscriber management (create/list/delete).
- Public webhook ingestion endpoint per pipeline (`/api/webhooks/:webhookPath`).
- Webhook HMAC signature verification (`X-Signature`, SHA-256).
- Rate limiting for auth and webhook ingestion endpoints.
- Async job queue backed by PostgreSQL.
- Dedicated worker process for background execution.
- Three step types:
  - `filter`
  - `transform`
  - `enrich_http`
- Subscriber delivery with retries and full attempt history.
- Job APIs for status/history/attempts.
- Frontend dashboard (React) for complete flow management.
- Docker Compose environment for full stack.
- GitHub Actions CI for backend, worker, frontend, and Docker image builds.

## Architecture
```mermaid
flowchart TD
    A["Client Dashboard (React)"] --> B["API Server (Express + TypeScript)"]
    B --> C["PostgreSQL (jobs, pipelines, steps, subscribers)"]
    B --> D["Enqueue Job (pending)"]
    E["Worker Service"] --> C
    E --> F["Execute Pipeline Steps"]
    F --> G["Deliver to Subscribers"]
    G --> H["Delivery Attempts + Retries"]
```

## Tech Stack
- Backend: Node.js, Express, TypeScript, JWT, bcrypt
- Worker: Node.js, TypeScript
- Database: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + TypeScript
- Infra: Docker, Docker Compose, Nginx
- CI: GitHub Actions

## Project Structure
```text
webhook-driven-task-processing-pipeline/
  backend/
    src/
      controllers/
      middleware/
      routes/
      services/
      utils/
      config/
  worker/
    src/
      services/
      config/
      types/
  frontend/
    src/
      api/
      pages/
      components/
      assets/
  shared/
    db/
      schema.ts
      relations.ts
      repositories/
      migrations/
  nginx/
    default.conf
  docker-compose.yml
  .github/workflows/ci.yml
```

## Environment Variables
Create or verify these files:

### `shared/db/.env`
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=webhook_pipeline
```

### `backend/.env`
```env
PORT=3000
DATABASE_URL=postgres://postgres:postgres@postgres:5432/webhook_pipeline
JWT_SECRET=change_me
JWT_ISSUER=webhook-pipeline
JWT_AUDIENCE=webhook-pipeline-users
JWT_EXPIRATION=7d
RATE_LIMIT_AUTH_WINDOW_MS=120000
RATE_LIMIT_AUTH_MAX_REQUESTS=5
RATE_LIMIT_WEBHOOK_WINDOW_MS=120000
RATE_LIMIT_WEBHOOK_MAX_REQUESTS=30
```

### `worker/.env`
```env
DATABASE_URL=postgres://postgres:postgres@postgres:5432/webhook_pipeline
WORKER_POLL_INTERVAL_MS=5000
```

### `frontend/.env`
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Run with Docker
From project root:

```bash
docker compose up --build
```

Services:
- Frontend (Vite): `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Nginx proxy to frontend: `http://localhost:80`
- PostgreSQL: `localhost:5432`

Health check:
- `GET http://localhost:3000/api/health`

## Database and Migrations
Migrations are located in `shared/db/migrations`.

If you need to generate/apply migrations:

```bash
cd backend
npm run generate
npm run migrate
```

## API
Base URL: `http://localhost:3000/api`

### Response Format
Success:
```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Error:
```json
{
  "success": false,
  "message": "...",
  "error": {
    "code": "...",
    "details": null
  }
}
```

### Auth
#### `POST /auth/register`
Body:
```json
{
  "username": "mahmoud",
  "email": "mahmoud@example.com",
  "password": "12345678"
}
```

#### `POST /auth/login`
Body:
```json
{
  "email": "mahmoud@example.com",
  "password": "12345678"
}
```

#### `GET /auth/me`
Header:
```http
Authorization: Bearer <token>
```

### Pipelines (Auth required)
#### `POST /pipelines`
```json
{
  "name": "Order processing pipeline"
}
```

#### `GET /pipelines`
#### `GET /pipelines/:id`
#### `DELETE /pipelines/:id`

### Pipeline Steps (Auth required)
#### `POST /pipelines/:id/steps`
#### `GET /pipelines/:id/steps`
#### `PUT /pipeline-steps/:stepId`
#### `DELETE /pipeline-steps/:stepId`

Example create/update payload:
```json
{
  "stepOrder": 1,
  "stepType": "filter",
  "stepConfig": {
    "field": "price",
    "operator": ">",
    "value": 20
  }
}
```

### Subscribers (Auth required)
#### `POST /pipelines/:id/subscribers`
```json
{
  "url": "https://example.com/webhook-receiver",
  "secret": "subscriber_secret_123"
}
```

#### `GET /pipelines/:id/subscribers`
#### `DELETE /subscribers/:id`

### Webhooks (Public endpoint)
#### `POST /webhooks/:webhookPath`
Headers:
```http
X-Signature: <hmac_sha256_hex>
Content-Type: application/json
```

Body example:
```json
{
  "product": "pizza",
  "price": 75,
  "ip": "8.8.8.8",
  "first_name": "Mahmoud",
  "last_name": "Darawsheh"
}
```

Returns `202 Accepted` and a queued `job`.

### Jobs (Auth required)
#### `GET /jobs`
#### `GET /jobs/:id`
#### `GET /pipelines/:id/jobs`

Each job includes status and related delivery attempts.

## Step Types and stepConfig
The backend validates step config strictly by `stepType`.

### 1) `filter`
Required keys:
- `field` (non-empty string)
- `operator` (`>`, `<`, `>=`, `<=`, `==`, `!=`)
- `value` (required)

### 2) `transform`
Allowed keys:
- `rename`: object mapping old key to new key
- `add`: object of static fields to inject
- `remove`: array of keys to remove

At least one of `rename`, `add`, `remove` is required.

### 3) `enrich_http`
Allowed keys:
- `url` (must start with `http://` or `https://`)
- `method` (currently only `GET`)
- `timeoutMs` (integer between `1` and `120000`)

## Webhook Signature
The backend verifies `X-Signature` using HMAC SHA-256:

- Input message: raw request body string
- Key: `pipeline.webhookSecret`
- Compare with `X-Signature` header in constant-time

Pseudo formula:
```text
signature = HMAC_SHA256_HEX(webhookSecret, rawBody)
```

## Rate Limiting
Two scopes are rate limited with in-memory counters per client IP:

- Auth endpoints (`POST /auth/register`, `POST /auth/login`)
- Webhook ingestion (`POST /api/webhooks/:webhookPath`)

Response behavior when exceeded:
- HTTP `429 Too Many Requests`
- `Retry-After` header (seconds)
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers

Tune via backend env vars:
- `RATE_LIMIT_AUTH_WINDOW_MS` (default `120000`)
- `RATE_LIMIT_AUTH_MAX_REQUESTS` (default `5`)
- `RATE_LIMIT_WEBHOOK_WINDOW_MS` (default `120000`)
- `RATE_LIMIT_WEBHOOK_MAX_REQUESTS` (default `30`)

## Worker Flow and Reliability
Worker loop:
1. Claim next pending job atomically.
2. Mark as `processing`.
3. Execute ordered steps by `stepOrder`.
4. Update job as:
   - `completed`, or
   - `filtered_out`, or
   - `failed`.
5. Deliver result to each subscriber.
6. Persist delivery attempts.

### Concurrency-safe claim
`claimNextPendingJob()` uses SQL with:
- `FOR UPDATE SKIP LOCKED`

This ensures two workers do not claim the same job.

### Delivery retries
Per subscriber delivery uses retry delays:
- attempt 1: immediate
- attempt 2: +5s
- attempt 3: +15s

Each attempt is stored in `delivery_attempts` with status and HTTP response code.

## CI Pipeline
GitHub Actions workflow: `.github/workflows/ci.yml`

On push/PR (`main`, `dev`), CI runs:
- Backend:
  - `npm ci`
  - `npm run build`
- Worker:
  - `npm ci`
  - `npm run build`
- Frontend:
  - `npm ci`
  - `npm run build`
- Docker image build checks:
  - backend image
  - worker image
  - frontend image

## Design Decisions
- **Async webhook processing**: request returns fast and avoids timeouts.
- **DB-backed queue**: fewer moving parts, easy local setup with Docker.
- **Dedicated worker service**: separate scaling and failure boundaries.
- **Shared DB layer (`shared/db`)**: backend and worker use the same schema/repositories.
- **Strict stepConfig validation**: prevents runtime step execution errors.
- **HMAC verification**: protects webhook ingestion from spoofed requests.

## Troubleshooting
### 1) Worker cannot deliver to `localhost`
Inside Docker, `localhost` refers to the container itself.
- Use `host.docker.internal` to call services running on host machine.

### 2) Port already in use (`3000` or `5173`)
Stop local process occupying the port, or change host port mapping in `docker-compose.yml`.

### 3) Webhook rejected with invalid signature
Make sure:
- signature is generated from the exact raw JSON string sent,
- secret matches pipeline webhook secret,
- header name is exactly `X-Signature`.

### 4) Steps not applied
Verify:
- pipeline has steps,
- step order is correct,
- step config matches validator rules.


## CD Pipeline
GitHub Actions workflow: `.github/workflows/cd.yml`

On push to `main`, CD runs on `self-hosted` runner (EC2) and performs:
- Checkout repository
- Create runtime env files from GitHub Secrets
- Deploy with Docker Compose (`docker compose up -d --build --remove-orphans`)
- Print running containers (`docker compose ps`)

### Required GitHub Secrets
- `PROD_DB_ENV`
- `PROD_BACKEND_ENV`
- `PROD_WORKER_ENV`
- `PROD_FRONTEND_ENV`

Example values:

`PROD_DB_ENV`
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=webhook_pipeline
```

`PROD_BACKEND_ENV`
```env
PORT=3000
DATABASE_URL=postgres://postgres:postgres@postgres:5432/webhook_pipeline
JWT_SECRET=change_me
JWT_ISSUER=webhook-pipeline
JWT_AUDIENCE=webhook-pipeline-users
JWT_EXPIRATION=7d
RATE_LIMIT_AUTH_WINDOW_MS=120000
RATE_LIMIT_AUTH_MAX_REQUESTS=5
RATE_LIMIT_WEBHOOK_WINDOW_MS=120000
RATE_LIMIT_WEBHOOK_MAX_REQUESTS=30
```

`PROD_WORKER_ENV`
```env
DATABASE_URL=postgres://postgres:postgres@postgres:5432/webhook_pipeline
WORKER_POLL_INTERVAL_MS=5000
```

`PROD_FRONTEND_ENV`
```env
VITE_API_BASE_URL=/api
```

Notes:
- In Docker, DB host must be `postgres` (not `localhost`).
- If DB credentials were changed after first run, recreate DB volume:

```bash
docker compose down -v
docker compose up -d --build
```

## Domain and HTTPS
Configured production domain:
- `darawsheh.dev`
- `www.darawsheh.dev`

DNS records used (Name.com):
- `A` record: `darawsheh.dev -> 100.27.217.58`
- `CNAME` record: `www.darawsheh.dev -> darawsheh.dev`

Let's Encrypt command used:

```bash
sudo certbot certonly --standalone \
  -d darawsheh.dev -d www.darawsheh.dev \
  --agree-tos -m your-email@example.com --non-interactive
```

Nginx production behavior:
- Redirects HTTP (80) to HTTPS (443)
- Serves frontend static files
- Proxies API requests from `/api` to backend (`backend:3000`)

Additional checks:

```bash
docker compose ps
docker compose logs --tail=120 backend
docker compose logs --tail=120 nginx
```
## License
For internship/project evaluation use.









