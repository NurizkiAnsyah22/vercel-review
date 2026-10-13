# Virai Review Card — Final LOCAL Testing Report

**Scope:** local development only. No VPS deployment, no changes to the running `review.virai.id`.
**Result:** ✅ ALL LOCAL CHECKS PASS

## 1. Environment

| Item | Value |
|---|---|
| OS | Windows 11 |
| Node.js | 22 (via `node:22-alpine` images & local Node 22) |
| Next.js | 15.5.27 (App Router) |
| Prisma / Client | 6.19.3 |
| `@whiskeysockets/baileys` | 6.7.24 (gateway service) |
| PostgreSQL | 16-alpine — container `virai-review-pg`, host port **5433** |
| Redis | 7-alpine — container `virai-review-redis`, host port **6380** |
| Other stacks | `backend-postgres-1` / `backend-redis-1` left untouched |

> Ports 5433/6380 are used locally to avoid clashing with the other stack on 5432/6379.

## 2. Static verification

| Command | Result |
|---|---|
| `npm run typecheck` | ✅ PASS (0 errors) |
| `npm run test` (unit) | ✅ PASS — 4 files, **16/16 tests** |
| `npm run test:integration` | ✅ PASS — 1 file, **5/5 tests** |
| `npm run build` | ✅ PASS — 19 routes, no warnings |
| `cd gateway && npm run typecheck` | ✅ PASS (0 errors) |

### Unit tests (`tests/unit/`)
- `places.test.ts` (8) — Google Maps URL detection, place query extraction, coordinate extraction, review URL building.
- `session.test.ts` (2) — admin session token round-trip and tamper rejection.
- `notification.test.ts` (3) — message wording (states increase, never claims a specific reviewer, rating line optional).
- `gateway-jid.test.ts` (3) — phone → WhatsApp JID normalisation (`08xx`, `+62`, bare `8xx`).

### Integration tests (`tests/integration/`, real PostgreSQL + Redis, Places API mocked)
- `monitoring.int.test.ts` (5):
  1. exactly one active monitoring job per business (dedup via `activeKey`),
  2. increase detection updates `lastKnownReviewCount` + writes `INCREASED` check + enqueues one notification job,
  3. notification enqueue is idempotent (same `jobId` ⇒ one job),
  4. window completes after the 2nd check (`COMPLETED`, `activeKey` cleared),
  5. no job created for a non-ACTIVE business.

## 3. End-to-end smoke test (all local services running)

Services running: PostgreSQL, Redis, Next.js app (`:3000`), BullMQ worker, Baileys gateway (`:8080`).

| # | Scenario | Expected | Observed | Status |
|---|---|---|---|---|
| 1 | `GET /api/health` | database+redis up | `{"status":"ok","checks":{"database":"up","redis":"up"}}` | ✅ |
| 2 | Admin login | 200 + session cookie | 200, cookie set | ✅ |
| 3 | Generate cards | 201, sequential codes | `CARD-000004`, `CARD-000005` | ✅ |
| 4 | Activate page render | 200 form | form rendered for `CARD-000004` | ✅ |
| 5 | Activate with non-Google URL | 422 | `{"details":{"mapsUrl":["Harus berupa link Google Maps"]}}` | ✅ |
| 6 | Activate with valid Google URL, no Places key | 202 `pending` | `{"status":"pending","reason":"not_configured"}`, card → `PENDING` | ✅ |
| 7 | `/r/{token}` on UNACTIVATED | 302 to activation | `location: /activate/_wcJevwfhTuUY0rS` | ✅ |
| 8 | Admin reactivate card | 200 | `Kartu diaktifkan kembali` | ✅ |
| 9 | `/r/{token}?s=nfc` on ACTIVE | 302 to Google review | `location: .../local/writereview?placeid=...` in ~51 ms | ✅ |
| 10 | Interaction recorded | QR + NFC counted | `{ total: 2, qr: 1, nfc: 1 }` | ✅ |
| 11 | Monitoring job created by interaction | 1 active job | `SCHEDULED`, `activeKey` set, baseline 10 | ✅ |
| 12 | Monitoring lifecycle | completes after 2nd check | `COMPLETED`, `checksPerformed=2`, `activeKey` null | ✅ |
| 13 | Notification path | job enqueued once | verified in integration test (idempotent) | ✅ |
| 14 | WhatsApp gateway status via app | `QR_REQUIRED` | `{"state":"QR_REQUIRED","qrAvailable":true}` | ✅ |
| 15 | Gateway QR endpoint | real Baileys QR string | QR string returned (rendered in dashboard) | ✅ |
| 16 | Test message while not paired | graceful failure | `502 {"error":"WhatsApp is not connected"}` | ✅ |
| 17 | Admin audit log | actions recorded | `card.reactivate`, `card.suspend` by `admin@virai.id` | ✅ |
| 18 | Rate limit `/r/{token}` (30/min) | 429 after quota | 404 ×28 then 429 ×12 | ✅ |

## 4. Not fully verifiable locally (no external credentials)

| Item | Reason | Mitigation |
|---|---|---|
| Complete QR pairing | Requires scanning with a real WhatsApp account | QR string generation + full flow verified up to scan; pairing is a manual step |
| Real WhatsApp test message delivery | Requires a paired WhatsApp session | Graceful-failure path (502) verified; interface path verified |
| Real Google Places resolution (ACTIVE via API) | `GOOGLE_PLACES_API_KEY` not provided locally | `PENDING` path verified; ACTIVE path exercised via DB fixture + admin resolve code path |

These three are the only items that cannot be executed in this local environment; they are parameter-driven, not code gaps.

## 5. Notes / non-blocking observations

- Leftover BullMQ notification jobs from the integration test referenced a deleted business; the worker logged `Notification: business not found` and skipped gracefully (expected).
- Rate limiter fails **open** if Redis is unavailable (public redirect stays online).
- Local dev test data (cards `CARD-000001..000005`, fixture business) lives only in the local `virai_review_card` database.

## 6. How to reproduce locally

```bash
# 1. Infrastructure (dedicated containers)
docker run -d --name virai-review-pg -e POSTGRES_USER=virai -e POSTGRES_PASSWORD=virai_dev_password -e POSTGRES_DB=virai_review_card -p 5433:5432 postgres:16-alpine
docker run -d --name virai-review-redis -p 6380:6379 redis:7-alpine

# 2. App
npm install
npm run prisma:migrate
npm run typecheck && npm run test && npm run test:integration && npm run build

# 3. Runtime (separate terminals)
npm run dev
npm run worker:prod

# 4. Gateway (separate terminal)
cd gateway && npm install
set GATEWAY_TOKEN=dev-token-123&& set AUTH_STATE_DIR=./data/auth&& npm run dev
```
