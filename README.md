# Cathexis Dashboard

Next.js dashboard for managing Cathexis MVR5 dashcam devices, requesting clips, and starting/stopping live streams.

## Stack
- Next.js 16 / React 19 / TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth, storage, realtime)
- video.js (HLS playback)

## Prerequisites
- Node.js 20+
- Supabase project (URL + anon key)
- Backend MVR API reachable (see `docs/API_readme.md`)
- FFmpeg available on the backend for streaming (per backend docs)

## Environment
Use `env.example` as a starting point, and copy it to `.env.local` (default) or the staging/production files below.

By default, create `.env.local` with:
```
CWE_MVR_API_URL=<http://backend-host:9000>
CWE_MVR_API_KEY=<bearer token expected by backend>
NEXT_PUBLIC_SUPABASE_URL=<your supabase url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your supabase anon key>
```
_Do not commit secrets. Never overwrite existing env files._

### Staging vs Production switch (simple)
If you want a quick way to swap configs without editing `.env.local`, create:
- `.env.staging.local`
- `.env.production.local`

With the same keys as above, then run/build with:
- `ENV=staging` (loads staging)
- `ENV=production` (loads production)

If `ENV` is not set, the app falls back to the normal Next.js env loading behavior (e.g. `.env.local`).

## Install & Run
```
npm install
npm run dev
```
App runs at http://localhost:3000.

## Data & Database
- Supabase schema/migrations live in `supabase/migrations/`; see `supabase/README.md` for applying them.
- `app/device/[id]/page.tsx` reads devices and clips from Supabase and subscribes to realtime `clips` updates for progress/status changes.

## How Streaming Works (frontend path)
1) User opens the **Stream** dialog (`components/live-stream-dialog.tsx`).
2) Start call hits Next API proxy:
   - `POST /api/stream/start` → forwards to `${CWE_MVR_API_URL}/api/units/:serial/stream/start` with `camera`, `profile`, `period`.
3) Frontend polls:
   - `POST /api/stream/status` → `${CWE_MVR_API_URL}/api/units/:serial/stream/status?camera=&profile=`.
4) When backend reports `active`, player loads HLS from the streaming server (currently defaults to `http://185.202.223.35:9000` + returned `stream_url`).
5) Stop call:
   - `POST /api/stream/stop` → `${CWE_MVR_API_URL}/api/units/:serial/stream/stop`.
Detailed frontend/video.js guidance: `docs/FRONTEND_STREAMING_GUIDE.md`. Backend streaming behavior and tests: `docs/STREAMING_TEST_GUIDE.md`.

## Clip Request Flow
1) User requests clip via UI dialog → `POST /api/clips/request`.
2) Next API proxy forwards to `${CWE_MVR_API_URL}/api/units/:serial/clips/request` with `camera`, `profile`, `start_utc`, `end_utc`.
3) Backend downloads from device, uploads to Supabase Storage, and updates the `clips` table.
4) `app/device/[id]/page.tsx` listens to realtime `clips` changes to show progress, errors, ready state, and enables playback/download (signed URLs generated client-side when needed).

## Other API proxies
- `POST /api/ring-summary` → backend `request_ring_summary` command (inspect available footage before requesting clips).

## Project Structure
- `app/` — Next App Router routes and API proxies to backend.
- `components/` — UI, including streaming and clip dialogs.
- `lib/` — Supabase client (`NEXT_PUBLIC_SUPABASE_*`) and auth helpers.
- `docs/` — Backend/API/streaming guides used above.
- `supabase/` — SQL migrations and schema notes.

## Common Tasks
- Lint: `npm run lint`
- Build: `npm run build`

## Operational Notes
- Streaming expects the backend to expose HLS at `/hls/{serial}/{camera}/{profile}/stream.m3u8`.
- Streams are low-latency HLS (≈6–12s). Stop streams when done to free backend FFmpeg resources.
- Clip downloads are independent of streaming and use Supabase Storage; ensure bucket and RLS are configured per `docs/API_readme.md` and `supabase/README.md`.

## Troubleshooting
- Missing API envs → Next API routes return `{ ok: false, error: 'API configuration not configured' }`.
- Stream not activating → check backend status endpoint via `POST /api/stream/status` and backend logs (see `docs/STREAMING_TEST_GUIDE.md` log patterns).
- No clips updating → confirm Supabase URL/key, realtime enabled on `clips` table, and backend clip receiver running.
