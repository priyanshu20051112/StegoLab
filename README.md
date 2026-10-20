# StegoLab

**Hide in Plain Sight.** A multi-media steganography web application that encodes and decodes secret messages inside **images** (LSB on RGB channels), **audio** (LSB on PCM samples), and **text** (zero-width Unicode characters).

> Educational demo — steganography is not encryption. See [Limitations](#limitations).

---

## Architecture

```
┌─────────────┐   REST/JSON + binary    ┌──────────────────┐    best-effort    ┌────────────┐
│   Frontend  │ ──────────────────────► │  Backend (Flask) │ ────────────────► │ PostgreSQL │
│ React + Vite│ ◄────────────────────── │  stego engine    │   metadata logs   │  metadata  │
└─────────────┘      PNG / WAV blobs    └──────────────────┘                   └────────────┘
```

* **Frontend** (`frontend/`): React 18 + TypeScript + Vite + Tailwind CSS. Collects input, calls the API, renders results. Contains **no steganography logic**.
* **Backend** (`backend/`): Flask (application factory + Blueprints). All steganography runs server-side, uploads are processed **in memory only** (`BytesIO`) and never written to disk.
* **Database**: PostgreSQL stores **anonymous operation metadata only** — never secret messages, media bytes, filenames, IPs, or user agents. If the database is down, encode/decode still work (logging is best-effort).

### Shared payload format

Every medium embeds the same binary payload:

| Field   | Size           | Notes                                   |
|---------|----------------|-----------------------------------------|
| MAGIC   | 8 bytes        | ASCII `STEGOLAB`                        |
| VERSION | 1 byte         | `0x01`                                  |
| TYPE    | 1 byte         | `0x01` = UTF-8 text message             |
| LENGTH  | 4 bytes        | unsigned big-endian message length      |
| MESSAGE | N bytes        | UTF-8 bytes (any language, emoji, …)    |
| CRC32   | 4 bytes        | CRC32 of MESSAGE                        |

Decoding is strict: magic/version/type are verified, the declared length is checked against capacity before extraction, and the CRC32 is verified. Damaged or absent payloads produce a clean error — arbitrary bits are never shown as a message. (18 bytes of overhead are subtracted from every capacity figure.)

---

## Algorithms

* **Image — LSB on RGB channels.** Each bit of the payload is written into the least-significant bit of one R, G, or B channel value (3 bits per pixel, row-major). Alpha channels are preserved untouched. Output is always lossless **PNG** — converting it to JPEG afterwards destroys the hidden data.
* **Audio — LSB on PCM samples.** WAV files are parsed chunk-by-chunk (RIFF walk); only uncompressed PCM (8/16/24-bit) is accepted. Payload bits go into the LSB of each interleaved sample. The output WAV is rebuilt byte-for-byte — headers, `LIST` metadata and trailing chunks are preserved, only the `data` chunk's sample values change. Lossy formats (MP3…) cannot be used because re-encoding destroys the bits.
* **Text — zero-width Unicode.** Payload bits become `U+200B` (0) / `U+200C` (1), wrapped in `U+200D` delimiters and inserted after the first visible character. The visible text is byte-for-byte identical.

---

## Quick start (Docker)

Requires Docker with Compose.

```bash
docker compose up --build
```

| Service   | URL                       |
|-----------|---------------------------|
| Frontend  | http://localhost:3000     |
| Backend   | http://localhost:5000     |
| Health    | http://localhost:5000/api/health |

Migrations run automatically on backend startup (`flask db upgrade`).

---

## Setup without Docker

### Prerequisites

* Python 3.11+
* Node 18+
* PostgreSQL 14+ (optional — without it the backend falls back to SQLite for local development; stats then come from the SQLite file)

### 1. Database (PostgreSQL)

```bash
createdb stegolab
# or: psql -c "CREATE DATABASE stegolab;"
```

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # edit DATABASE_URL etc.
flask --app wsgi:app db upgrade     # create schema + enums + indexes
flask --app wsgi:app run            # dev server on :5000
```

Production: `gunicorn -b 0.0.0.0:5000 -w 2 --threads 4 wsgi:app`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                # Vite dev server on :5173, proxies /api → :5000
```

Production build: `npm run build` then serve `frontend/dist` (e.g. via the provided nginx config, which also proxies `/api` to the backend).

### Environment variables

**Backend** (`backend/.env.example`):

| Variable         | Default                                                     | Purpose                                   |
|------------------|-------------------------------------------------------------|-------------------------------------------|
| `DATABASE_URL`   | `postgresql+psycopg://stegolab:stegolab@localhost:5432/stegolab` | SQLAlchemy database URL (psycopg v3)      |
| `SECRET_KEY`     | `change-me`                                                 | Flask secret key                          |
| `CORS_ORIGINS`   | `http://localhost:3000,http://localhost:5173`               | Comma-separated allowed frontend origins  |
| `MAX_UPLOAD_MB`  | `10`                                                        | Upload size limit (also drives the 413)   |

**Frontend** (`frontend/.env.example`):

| Variable       | Default | Purpose                                             |
|----------------|---------|-----------------------------------------------------|
| `VITE_API_URL` | (empty) | Base URL of the backend; empty = same-origin/proxy  |

---

## Running tests

```bash
# Backend (pytest) — no database or external services required
cd backend
python -m pytest -q

# Frontend (Vitest + React Testing Library)
cd frontend
npm test
```

---

## API reference

All errors use one shape: `{"error": {"code": "...", "message": "..."}}`. No stack traces are ever returned.

### Image

| Endpoint | Method / body | Response |
|---|---|---|
| `/api/image/capacity` | POST multipart `file` | `{ width, height, capacity_bytes, size_bytes }` |
| `/api/image/encode` | POST multipart `file`, `message` | stego **PNG** binary (`stegolab_encoded.png`), headers `X-Capacity-Bytes`, `X-Message-Bytes` |
| `/api/image/decode` | POST multipart `file` | `{ message, medium: "image" }` |

### Audio

| Endpoint | Method / body | Response |
|---|---|---|
| `/api/audio/capacity` | POST multipart `file` | `{ channels, sample_rate, bits_per_sample, duration_seconds, capacity_bytes, size_bytes }` |
| `/api/audio/encode` | POST multipart `file`, `message` | stego **WAV** binary (`stegolab_encoded.wav`) |
| `/api/audio/decode` | POST multipart `file` | `{ message, medium: "audio" }` |

### Text

| Endpoint | Method / body | Response |
|---|---|---|
| `/api/text/encode` | POST JSON `{ cover_text, message }` | `{ stego_text, capacity_note }` |
| `/api/text/decode` | POST JSON `{ stego_text }` | `{ message, medium: "text" }` |

### Meta

| Endpoint | Response |
|---|---|
| `/api/stats` | `{ encoded, decoded, failed, by_medium: { image, audio, text } }` |
| `/api/health` | `{ status: "ok", database: "up" \| "down" }` |

### Error codes

`MISSING_FILE` (400) · `INVALID_REQUEST` (400) · `INVALID_FILE` (400) · `UNSUPPORTED_FILE_TYPE` (415) · `UNSUPPORTED_WAV_FORMAT` (415) · `FILE_TOO_LARGE` (413) · `CAPACITY_EXCEEDED` (422) · `EMPTY_MESSAGE` (422) · `EMPTY_COVER_TEXT` (422) · `NO_PAYLOAD` (422) · `CORRUPT_PAYLOAD` (422) · `RATE_LIMITED` (429) · `INTERNAL_ERROR` (500)

### Hardening

* 10 MB upload limit (friendly 413)
* Rate limiting: 30 req/min per client on encode/decode
* File types validated by **content** (Pillow decode / RIFF parse), not extension or MIME
* Uploads processed in memory; never written to disk; request bodies never logged
* Decompression-bomb protection (pixel limit + max dimension)
* CORS restricted to the configured frontend origins

---

## Privacy

Files and messages are sent to the StegoLab server only to perform encoding or decoding. They are processed in memory and are never written to disk or stored in the database. Only anonymous statistics (medium, sizes, timing, success/failure) are recorded. Do not use this educational demo for highly sensitive data. Use HTTPS in any deployment.

---

## Limitations

* **Steganography is not encryption.** It hides the *existence* of a message, not its meaning. Anyone who extracts it can read it.
* A hidden message can be discovered by someone who knows where and how to look (e.g. statistical analysis of LSBs).
* JPEG re-encoding of a stego image, or any lossy compression of stego audio, will destroy the payload — StegoLab exports PNG/WAV for this reason.
* Text steganography assumes the cover text contains no `U+200D` delimiter characters of its own.
* This project is an educational demonstration.

---

## Project layout

```
backend/   Flask app (app factory, Blueprints, steganography engine, Alembic migrations, pytest)
frontend/  React + TypeScript app (Vite, Tailwind, shadcn-style UI, Vitest)
docker-compose.yml   db + backend + frontend
```
