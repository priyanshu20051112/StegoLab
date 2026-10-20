# StegoLab — Frontend

Multi-media steganography web app (images, audio, text). React 18 + TypeScript + Vite + Tailwind 3.4.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173  (proxies /api -> http://localhost:5000)
```

Point the client at a different backend with `VITE_API_URL` (see `.env.example`).
Leave it empty to use relative URLs: the Vite dev proxy and the Docker nginx proxy both forward `/api` to the Flask backend.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with `/api` proxy |
| `npm run build` | Type-check (`tsc -b`) + production build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm test` | Vitest + Testing Library (jsdom) |
| `npm run lint` | Type-check only |

## Docker

```bash
docker build -t stegolab-frontend .
docker run -p 8080:80 stegolab-frontend
```

The image is a multi-stage build (`node:22-alpine` → `nginx:alpine`). nginx serves the SPA
with `try_files` fallback and proxies `/api/` to `http://backend:5000`, so no build-time API
URL is needed — put the frontend and backend on the same Docker network and name the backend
service `backend`.

## Layout

```
src/
  App.tsx                 router: / /encode /decode /about * -> NotFound
  pages/                  Home, Encode, Decode, About, NotFound
  components/layout/      Navbar, Footer, ThemeToggle
  components/stego/       MediumSelector, StepIndicator, DropZone, CapacityMeter,
                          ResultCard, HowItWorks, ImageCompare, AudioCompare,
                          ErrorAlert, StatsStrip, PrivacyNotice
  components/ui/          Button, Card, Label, Textarea, Alert, Badge, Progress,
                          Skeleton, Separator
  hooks/                  useEncodeFlow, useDecodeFlow, useTheme
  lib/                    api.ts (typed client), errors.ts, format.ts, download.ts, utils.ts
  types/                  shared API types
  test/setup.ts           Vitest + RTL setup
```

## API contract implemented

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| POST | `/api/image/capacity` | FormData `file` | `{ width, height, capacity_bytes, size_bytes }` |
| POST | `/api/image/encode` | FormData `file`, `message` | PNG blob + `X-Capacity-Bytes`, `X-Message-Bytes` |
| POST | `/api/image/decode` | FormData `file` | `{ message, medium: "image" }` |
| POST | `/api/audio/capacity` | FormData `file` | `{ channels, sample_rate, bits_per_sample, duration_seconds, capacity_bytes, size_bytes }` |
| POST | `/api/audio/encode` | FormData `file`, `message` | WAV blob |
| POST | `/api/audio/decode` | FormData `file` | `{ message, medium: "audio" }` |
| POST | `/api/text/encode` | JSON `{ cover_text, message }` | `{ stego_text, capacity_note }` |
| POST | `/api/text/decode` | JSON `{ stego_text }` | `{ message, medium: "text" }` |
| GET | `/api/stats` | — | `{ encoded, decoded, failed, by_medium: {...} }` |
| GET | `/api/health` | — | `{ status, database }` |

Errors arrive as `{"error":{"code","message"}}` and are surfaced through
`lib/errors.ts#mapErrorCode`. Every request accepts an `AbortSignal`.

## Privacy rules enforced in the client

- `localStorage` holds **only** the theme preference, under the key `stegolab-theme`.
- Messages, files, filenames, and decoded payloads are never persisted anywhere.
- Object URLs created for previews and downloads are revoked on reset and unmount.
