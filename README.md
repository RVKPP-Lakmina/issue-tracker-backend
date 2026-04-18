# Issue Tracker Backend

Production-ready TypeScript backend for an Issue Tracker system.

This service uses:

- Node.js + Express
- MongoDB (Mongoose)
- Redis (ioredis)
- Winston logger
- JWT auth guards
- Zod validation
- GitHub Actions CI/CD

## 1. Prerequisites

Install these tools first:

- Node.js 22+
- npm 10+
- Docker + Docker Compose
- GNU Make (or use direct `docker compose` commands)
- VS Code (recommended for debugger flow)

## 2. Clone and Start

```bash
git clone https://github.com/RVKPP-Lakmina/issue-tracker-backend.git
cd issue-tracker-backend
npm install
```

## 3. Configure Environment

Create `.env` from `.env.example` and fill required values.

### Linux/macOS

```bash
cp .env.example .env
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

Set at least these values in `.env`:

- `MONGODB_URI`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`

### Generate `JWT_ACCESS_SECRET`

Use one of the following:

```bash
openssl rand -base64 48
```

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Then paste the generated value into:

```env
JWT_ACCESS_SECRET=your_generated_secret_here
```

## 4. Start MongoDB and Redis (Docker, with Volumes)

This repository includes infrastructure in `docker-compose.infra.yml` and helper commands in `Makefile`.

### Pull images

```bash
make pull
```

### Start infrastructure

```bash
make up
```

### Check status

```bash
make ps
```

### Stop infrastructure

```bash
make down
```

### Remove containers + volumes

```bash
make clean
```

Mounted persistent volumes:

- `mongo_data` -> MongoDB data
- `redis_data` -> Redis data

If `make` is unavailable, run:

```bash
docker compose -f docker-compose.infra.yml up -d
```

## 5. Run Backend

### Development mode

```bash
npm run dev
```

### Build + run production mode

```bash
npm run build
npm start
```

Backend default URL:

- `http://localhost:3001`
- API prefix from env: `/api`

So base API URL is:

- `http://localhost:3001/api`

## 6. Health API Test

Health endpoint:

- `GET /api/health`

### cURL

```bash
curl http://localhost:3001/api/health
```

### PowerShell

```powershell
Invoke-RestMethod http://localhost:3001/api/health
```

Expected JSON shape:

```json
{
  "service": "redmin-be",
  "status": "ok",
  "timestamp": "2026-04-18T00:00:00.000Z",
  "mongo": "up",
  "redis": "up"
}
```

## 7. Launching Debugger (VS Code)

This repository already includes debugger config in `.vscode/launch.json`:

- Name: `API: Debug (TypeScript)`
- Runs `src/server.ts` directly with `tsx`
- Loads env from `.env`

### Steps

1. Ensure `.env` exists and has valid `MONGODB_URI`, `REDIS_URL`, and `JWT_ACCESS_SECRET`.
2. Ensure Docker infra is running (`make up`).
3. Open Run and Debug in VS Code.
4. Select `API: Debug (TypeScript)`.
5. Press Start Debugging (F5).

If debugger exits immediately:

- Check `.env` values are not empty.
- Confirm Mongo/Redis containers are healthy (`make ps`).
- Confirm port `3001` is free.

## 8. Useful Scripts

From `package.json`:

```bash
npm run dev        # Run TS server with watch
npm run typecheck  # Strict TS checks
npm test           # Run tests (Vitest)
npm run build      # Compile to dist/
npm start          # Run compiled server
```

## 9. Main API Routes

- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/issues`
- `POST /api/issues`
- `PUT /api/issues/:id`
- `DELETE /api/issues/:id`
- `GET /api/health`

## 10. CI/CD Workflows

GitHub Actions included:

- `.github/workflows/pr-build-test.yml`
  - Runs on PRs
  - Installs dependencies
  - Typechecks, tests, and builds
- `.github/workflows/production-build.yml`
  - Builds and pushes container image to GHCR on push to `main`/`master`

## 11. Troubleshooting

### Error: `Invalid input: expected string, received undefined` for env values

Cause: required `.env` variables are missing.

Fix:

1. Create `.env` from `.env.example`.
2. Set `MONGODB_URI`, `REDIS_URL`, `JWT_ACCESS_SECRET`.
3. Restart server/debugger.

### Mongo/Redis connection failures

- Start infra with `make up`
- Confirm containers using `make ps`
- Check ports `27017` and `6379`

### Test/build checks

```bash
npm run typecheck
npm test
npm run build
```

---

If you want, next step is to split this README into:

- `README.md` (quick start)
- `docs/SETUP.md` (detailed setup)
- `docs/API.md` (endpoint contract)
  for cleaner long-term maintenance.
