# Setup Guide

Detailed setup, configuration, local AI, testing and troubleshooting for JobPilot AI. For a short overview see the [README](../README.md).

## Contents

- [Prerequisites](#prerequisites)
- [First-time setup](#first-time-setup)
- [Daily start](#daily-start)
- [Configuration](#configuration)
- [Local AI with Ollama](#local-ai-with-ollama)
- [Running the tests](#running-the-tests)
- [Troubleshooting](#troubleshooting)

## Prerequisites

* [.NET SDK 10.0](https://dotnet.microsoft.com/download) (tested with 10.0.401)
* [Node.js 20+](https://nodejs.org) (tested with 23.3.0)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) for PostgreSQL and Mailpit
* EF Core tooling: `dotnet tool update --global dotnet-ef --version 10.0.*`

## First-time setup

### 1. Start the database

```bash
docker compose up -d
```

This starts PostgreSQL 17 on port `5432` with database, user and password `jobpilot` / `jobpilot` / `jobpilot_dev`. These credentials are meant **for local development only**.

The command also starts Mailpit, a test mail server for development (SMTP on port `1025`, reachable from localhost only). It catches every email JobPilot sends (email confirmation, password reset); nothing leaves your machine. Open the inbox in your browser at **http://localhost:8025**.

### 2. Create the database schema

```bash
dotnet ef database update --project src/JobPilot.Infrastructure --startup-project src/JobPilot.Api
```

Alternatively, just start the API: it applies pending migrations automatically and creates the default roles.

### 3. Start the API

```bash
dotnet run --project src/JobPilot.Api
```

| Address | Purpose |
|---------|---------|
| `http://localhost:5042/api/health` | API reachability |
| `http://localhost:5042/api/health/database` | Database reachability |
| `http://localhost:5042/openapi/v1.json` | OpenAPI document (Development only) |

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The UI runs on `http://localhost:5173`. The Vite dev proxy forwards all requests to `/api` to the ASP.NET Core API, so frontend and API share the same origin in the browser. This makes cookie authentication work without special SameSite rules.

## Daily start

After the one-time setup, three steps (plus one optional) are enough, each in its own terminal:

| Step | PowerShell (Windows) | Bash |
|------|----------------------|------|
| 1. Database and Mailpit | `docker compose up -d` | `docker compose up -d` |
| 2. API | `dotnet run --project src/JobPilot.Api` | `dotnet run --project src/JobPilot.Api` |
| 3. Web app | `cd frontend; npm run dev` | `cd frontend && npm run dev` |
| 4. AI (optional) | `ollama serve` | `ollama serve` |

The app is then available at **http://localhost:5173**, the API at **http://localhost:5042**. Emails (confirmation, password reset) show up in Mailpit at **http://localhost:8025**. The API applies pending migrations on startup. If Ollama is already running (for example as a background service), `ollama serve` reports that the address is in use; that is fine.

## Configuration

Configuration lives in `src/JobPilot.Api/appsettings.json`. Values can be overridden with environment variables (`__` separates the levels).

| Key | Environment variable | Default | Meaning |
|-----|----------------------|---------|---------|
| `ConnectionStrings:Default` | `ConnectionStrings__Default` | local Docker database | PostgreSQL connection |
| `App:CorsOrigins` | `App__CorsOrigins__0` | `http://localhost:5173` | Allowed frontend origins |
| `App:FrontendBaseUrl` | `App__FrontendBaseUrl` | `http://localhost:5173` | Base address of the UI; used to build the links in emails |
| `Email:Enabled` | `Email__Enabled` | `false` | `true` sends via SMTP; `false` sends nothing, and in Development the mail text (with the link) appears in the API log. Development sets `true` for Mailpit. |
| `Email:Host` | `Email__Host` | `localhost` | SMTP server |
| `Email:Port` | `Email__Port` | `587` | SMTP port (Development: `1025` for Mailpit) |
| `Email:UseStartTls` | `Email__UseStartTls` | `true` | Use STARTTLS (Development: `false` for Mailpit) |
| `Email:Username` | `Email__Username` | empty | SMTP user; **set only via user secrets or environment variables** |
| `Email:Password` | `Email__Password` | empty | SMTP password; **set only via user secrets or environment variables** |
| `Email:FromAddress` | `Email__FromAddress` | `no-reply@jobpilot.local` | Sender address |
| `Email:FromName` | `Email__FromName` | `JobPilot` | Sender name |
| `Storage:UploadRoot` | `Storage__UploadRoot` | `uploads` | Storage location for user documents |
| `Storage:MaxFileSizeInBytes` | `Storage__MaxFileSizeInBytes` | `10485760` | Maximum file size (10 MB) |
| `Storage:MaxDocumentsPerUser` | `Storage__MaxDocumentsPerUser` | `100` | Maximum number of documents per user |
| `Ai:Enabled` | `Ai__Enabled` | `false` | Enables external AI providers. Without AI, job match analysis and cover letters are rule-based. |
| `Ai:Provider` | `Ai__Provider` | `openai` | AI provider; the implemented one is `ollama` (local) |
| `Ai:Model` | `Ai__Model` | `gpt-4o-mini` | Model name; for Ollama e.g. `qwen2.5:3b` |
| `Ai:BaseUrl` | `Ai__BaseUrl` | `http://localhost:11434` | Address of the AI provider |
| `Ai:TimeoutSeconds` | `Ai__TimeoutSeconds` | `120` | After this the rule-based analysis takes over |
| `Ai:ApiKey` | `Ai__ApiKey` | empty | **Set only via user secrets** |
| `Ai:DailyRequestLimitPerUser` | `Ai__DailyRequestLimitPerUser` | `25` | Cost cap per user and day |
| `RateLimiting:GlobalPermitLimit` | `RateLimiting__GlobalPermitLimit` | `120` | Requests per IP and minute |
| `RateLimiting:AuthPermitLimit` | `RateLimiting__AuthPermitLimit` | `10` | Sign-ins, registrations and password / email-confirmation requests per IP and minute |

### Never commit secrets

API keys belong in user secrets only:

```bash
dotnet user-secrets set "Ai:ApiKey" "<your-key>" --project src/JobPilot.Api
```

The same goes for SMTP credentials of a real mail server:

```bash
dotnet user-secrets set "Email:Username" "<user>" --project src/JobPilot.Api
dotnet user-secrets set "Email:Password" "<password>" --project src/JobPilot.Api
```

Frontend variable for Vite:

```bash
# frontend/.env.local (optional)
VITE_API_PROXY_TARGET=http://localhost:5042
```

## Local AI with Ollama

CV extraction and job match analysis can use a local language model. It is free, and CVs never leave your machine.

```bash
winget install --id Ollama.Ollama -e
ollama pull qwen2.5:3b
```

Local AI is already enabled in `appsettings.Development.json` (`Enabled: true`, `Provider: ollama`, `Model: qwen2.5:3b`, `BaseUrl: http://127.0.0.1:11434`). In production it stays off by default.

* **The score stays rule-based**: the AI writes the summary, recommendations and learning topics and finds additional requirements. The score is always computed with the same traceable formula.
* **Guarded output**: skills and requirements are only accepted if they appear verbatim in the CV or the job description. Summaries that present covered skills as missing, and recommendations to list missing skills, are discarded.
* **Cleaned recommendations**: recommendations and learning topics are stripped of filler phrases and repeated words, near-duplicates are dropped, at most two entries per skill are kept, and if needed the list is filled up with rule-based recommendations. Enumerations such as "Docker, Kubernetes and Azure" are split into individual skills.
* **Automatic fallback**: if Ollama is unreachable, too slow, returns invalid JSON or the daily limit is reached, the rule-based path is used. `GET /api/ai/status` shows the current state.
* **Duration** (RTX 3050 Ti, 4 GB): CV about 10-13 s, analysis about 5 s. The very first call after startup loads the model and takes noticeably longer.

## Running the tests

### Build, backend and frontend

```bash
dotnet build "ITjobPolot AI.slnx"
dotnet test tests/JobPilot.Tests
cd frontend && npm run build
```

Lint the frontend with ESLint:

```bash
cd frontend && npm run lint
```

### Browser tests (Playwright)

The tests in `frontend/e2e/` run against the local environment in Chromium: desktop light, desktop dark and mobile width. Each test creates its own account and deletes it at the end. The tests read confirmation and reset links from real emails, so **Mailpit must be running** (`docker compose up -d`, default address `http://127.0.0.1:8025`, changeable via the environment variable `E2E_MAILPIT_URL`). Without Mailpit the setup aborts with an error message.

```bash
# once
cd frontend && npx playwright install chromium

# start the API with raised limits (otherwise the abuse protection kicks in)
RateLimiting__GlobalPermitLimit=100000 RateLimiting__AuthPermitLimit=1000 \
  dotnet run --project src/JobPilot.Api --urls http://localhost:5042

# tests (Vite starts automatically if needed)
cd frontend && npm run e2e        # all projects
npm run e2e -- --project=mobile   # mobile width only
npm run e2e:ui                    # interactive mode
```

In PowerShell, set the environment variables first:

```powershell
$env:RateLimiting__GlobalPermitLimit = "100000"; $env:RateLimiting__AuthPermitLimit = "1000"
dotnet run --project src/JobPilot.Api
```

`e2e/visual.spec.ts` stores screenshots of the main pages and an accessibility report (axe) in `frontend/e2e-artifacts/`. Serious and critical findings fail the run.

### Documentation screenshots

```bash
cd frontend && npm run docs:screenshots
```

The script regenerates the images in `docs/screenshots/` using fictional demo data. As with the browser tests, the API must run with raised rate limits (see above). If an API with normal limits is already running, the script can also run against a second instance, for example API on port 5043 and Vite on port 5174 (`VITE_API_PROXY_TARGET=http://localhost:5043`); then set `E2E_BASE_URL=http://localhost:5174` and `E2E_API_URL=http://localhost:5043`.

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| API does not start: *address already in use* (port 5042) | An API instance is already running | Stop the other instance or keep using it |
| Error binding to port 5099 or similar | Windows reserves port ranges (`netsh interface ipv4 show excludedportrange protocol=tcp`) | Choose a port outside the reservation; the API uses 5042 by default |
| Vite reports *Port 5173 is in use* | The web app is already running | Open the existing instance in the browser |
| *Database is not reachable* / `/api/health/database` fails | Docker Desktop or the container is not running | Start Docker, run `docker compose up -d`, check with `docker ps` |
| Browser tests fail with **429 Too Many Requests** | The API rate limits kick in | Start the API with raised `RateLimiting__*` values (see [Browser tests](#browser-tests-playwright)) |
| No emails arrive (confirmation, password reset) | Mailpit is not running, or `Email:Enabled` is `false` | Run `docker compose up -d` and check the inbox at http://localhost:8025. With `Email:Enabled=false` nothing is sent; in Development the link is in the API log output. |
| Browser tests: Mailpit unreachable although the container runs | `localhost` sometimes resolves to IPv6, Mailpit listens on IPv4 only | `127.0.0.1` is used by default; for a different address set `E2E_MAILPIT_URL` (e.g. `http://127.0.0.1:8025`) |
| Playwright: *Executable doesn't exist* | Browser not installed | Run `npx playwright install chromium` in the `frontend` folder |
| AI assistant shows "KI nicht erreichbar - regelbasiert" (AI unreachable, rule-based) | Ollama is not running or the model is missing | Run `ollama serve` and `ollama pull qwen2.5:3b`; check the state at `GET /api/ai/status` |
| The first AI analysis takes very long | The model is loaded on the first call | Wait once; later calls are much faster |
