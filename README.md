# Virai Review Card — Vercel (Serverless)

> **Live:** https://vercel-review-two.vercel.app — admin di `/login`, aktivasi di `/activate`.

Platform kartu fisik (QR + NFC) untuk UMKM yang mengarahkan pelanggan langsung ke form
review Google. Aplikasi ini adalah versi sederhana yang berjalan **sepenuhnya di Vercel**
tanpa VPS, Docker, Nginx, Redis, worker, maupun WhatsApp Gateway.

## Konsep Produk

- Semua kartu fisik memakai **QR Master** yang sama → mengarah ke halaman aktivasi `/activate`.
- Setiap kartu punya **Card ID**, **Kode Aktivasi** (`VRC-XXXX-XXXX`), dan **`public_token` NFC** yang unik.
- URL NFC/QR per kartu: `/r/{public_token}`.
  - Kartu **UNACTIVATED** → dialihkan ke halaman aktivasi kartu tersebut.
  - Kartu **ACTIVE** → `302` langsung ke Google Review URL toko.
  - Kartu **PENDING/SUSPENDED** → halaman informasi (tidak pernah redirect ke Google).
- Aktivasi dilakukan owner dengan 3 field: nama toko, nomor WhatsApp (kontak), link Google Maps.
  Backend me-resolve Place ID (prioritas gratis via link Maps) lalu kartu menjadi `ACTIVE`.
- Interaksi QR/NFC dicatat untuk analytics.

> Nomor WhatsApp tetap disimpan sebagai **data kontak** toko, tetapi tidak ada pengiriman pesan WhatsApp.

## Arsitektur

| Komponen | Teknologi |
|---|---|
| Web + API | Next.js 15 (App Router) + TypeScript |
| Backend | Next.js Route Handlers (Vercel Functions) |
| Database | Managed PostgreSQL (Neon / Supabase) |
| ORM | Prisma |
| Rate limit | PostgreSQL (tabel `rate_limit_buckets`) — tanpa Redis |
| QR | Digenerate **on demand** dari token (`qrcode`) — tanpa penyimpanan file |
| Deployment | Vercel (`*.vercel.app`) |

## Komponen yang Dihilangkan (dari stack VPS lama)

- WhatsApp Gateway (Baileys) beserta folder [`gateway/`](gateway) dan endpoint internal webhook.
- Background worker BullMQ ([`worker/`](worker)) dan seluruh layer queue/Redis.
- Redis (rate limit kini memakai PostgreSQL).
- Docker & Nginx ([`docker/`](docker)) dan script entrypoint container.
- Penyimpanan aset QR di filesystem lokal (`STORAGE_DIR`).

## Alur Utama

- **Aktivasi (QR Master)** — [`/activate`](src/app/activate/page.tsx): pemilik memasukkan Kode Aktivasi,
  lalu API [`/api/activate/code`](src/app/api/activate/code/route.ts) memverifikasi (read-only),
  dan [`/api/activate`](src/app/api/activate/route.ts) menyelesaikan aktivasi.
- **Redirect NFC/QR** — [`/r/[token]`](src/app/r/[token]/route.ts): logika redirect kartu.
- **Admin dashboard** — [`/admin`](src/app/admin/page.tsx), login di [`/login`](src/app/login/page.tsx).
  Seluruh endpoint admin dilindungi session server-side ([`guard.ts`](src/server/auth/guard.ts)).
- **QR image** — [`/api/qr/[token]`](src/app/api/qr/[token]/route.ts), digenerate on demand.
- **Health** — [`/api/health`](src/app/api/health/route.ts) (cek koneksi database saja).

## Persyaratan

- Node.js ≥ 20
- Akun Vercel
- Database PostgreSQL terkelola (Neon/Supabase) — **tidak** disediakan otomatis oleh Vercel

## Setup Database (Neon)

1. Buat project di [Neon](https://neon.tech) (atau Supabase).
2. Ambil dua connection string dari dashboard:
   - **Pooled** connection (mis. host mengandung `-pooler`) → `DATABASE_URL`
   - **Direct** connection (tanpa pooler) → `DIRECT_URL` (dipakai Prisma Migrate)
3. Terapkan skema (tidak destruktif):

   ```bash
   # lokal, arahkan ke database Neon
   set DATABASE_URL=postgresql://...   # pooled
   set DIRECT_URL=postgresql://...     # direct
   npx prisma migrate deploy
   ```

   Perintah ini menjalankan semua migration yang ada (termasuk pembuatan tabel
   `rate_limit_buckets`). Tidak ada operasi destruktif dan tidak menghapus data.

## Environment Variables

Lihat [`.env.example`](.env.example). Ringkasan:

| Variable | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ✅ | Koneksi runtime PostgreSQL (boleh pooled). |
| `DIRECT_URL` | ✅ | Koneksi direct untuk Prisma Migrate (sama dengan `DATABASE_URL` bila tanpa pooler). |
| `SESSION_SECRET` | ✅ | Secret signing cookie admin (min. 32 karakter). |
| `ADMIN_EMAIL` | — | Email admin (fallback bila email belum ada di tabel `admin_users`). |
| `ADMIN_PASSWORD_HASH` | — | Hash bcrypt admin fallback (lihat `npm run hash-password`). |
| `APP_BASE_URL` | — | Base URL internal (default `http://localhost:3000`). |
| `PUBLIC_APP_URL` | — | Base URL publik yang ditanam pada QR/NFC (mis. `https://<project>.vercel.app`). |
| `GOOGLE_PLACES_API_KEY` | — | Opsional; tanpa ini dipakai jalur gratis dari link Maps. |
| `LOG_LEVEL` | — | `debug` / `info` / `warn` / `error`. |
| `RATE_LIMIT_*` | — | Batas rate limit (lihat `.env.example`). |

> **Jangan commit** file `.env` berisi kredensial. File `.env` sudah masuk `.gitignore`.

### Membuat hash password admin (fallback)

```bash
npm run hash-password -- "password-anda"
# tempel hasilnya ke ADMIN_PASSWORD_HASH
```

## Kelola Akun Admin

Akun admin disimpan di tabel `admin_users`, sehingga **banyak admin** didukung dan
password bisa diubah tanpa redeploy:

- **Tambah / ubah akun:** `npm run admin:add -- "email@contoh.com" "password" "Nama"`
- **Ubah password sendiri:** login → **Settings → UBAH PASSWORD** (`POST /api/admin/account/password`).
- Daftar akun admin tampil di **Settings → AKUN ADMIN** (tanpa hash password).

`ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` hanya dipakai sebagai *fallback* ketika email
belum ada di `admin_users` (mis. saat database baru di-seed).

## Development Lokal

```bash
# 1. Dependency
npm install

# 2. Konfigurasi environment
copy .env.example .env      # lalu isi DATABASE_URL, DIRECT_URL, SESSION_SECRET, dll.

# 3. Skema database
npm run prisma:deploy       # atau prisma migrate dev untuk dev

# 4. Jalankan
npm run dev                 # http://localhost:3000
```

Cek kesehatan: `curl http://localhost:3000/api/health`.

## Deploy ke Vercel

1. Push repo ini ke GitHub (mis. `github.com/NurizkiAnsyah22/vercel-review`).
2. Di Vercel: **Add New → Project → Import** repo tersebut.
3. Framework terdeteksi otomatis sebagai **Next.js** ([`vercel.json`](vercel.json)); build command:
   `prisma generate && next build`.
4. Tambahkan **Environment Variables** (Production & Preview): `DATABASE_URL`, `DIRECT_URL`,
   `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, dan opsional `PUBLIC_APP_URL`,
   `GOOGLE_PLACES_API_KEY`.
   - Set `PUBLIC_APP_URL` ke domain Vercel Anda, mis. `https://<project>.vercel.app`,
     agar QR/NFC mengarah ke domain yang benar.
5. Deploy.
6. Jalankan migrasi ke database (satu kali / setiap ada migration baru):

   ```bash
   set DATABASE_URL=...   # pooled
   set DIRECT_URL=...     # direct
   npx prisma migrate deploy
   ```

   Atau tambahkan sebagai langkah build bila diinginkan. **Jangan** mengklaim database aktif
   sebelum langkah ini dijalankan.
7. Buka `/login` untuk masuk ke admin dashboard.

## Testing

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm test              # unit test (vitest, tanpa DB)
npm run build         # production build
```

Integration test (`npm run test:integration`) membutuhkan `DATABASE_URL`/`DIRECT_URL` ke
database uji yang nyata karena menguji route handler langsung.

## Kompatibilitas Kartu yang Sudah Dicetak

- **Token NFC/QR tidak diubah.** `public_token`, Card ID, dan Kode Aktivasi tetap sama.
- Format URL tetap `/r/{public_token}` dan `/activate`, sehingga kartu fisik yang sudah
  diproduksi tetap berfungsi tanpa perlu menulis ulang NFC.
- QR digenerate ulang dari token yang sama, jadi payload-nya identik dengan sebelumnya.

## Catatan Migrasi & Risiko

- **QR on demand** menggantikan penyimpanan file. Kolom `qrPngPath`/`qrSvgPath` di schema
  dipertahankan demi kompatibilitas database lama tetapi tidak lagi diisi; `qrGeneratedAt`
  ditandai saat kartu dibuat/aktifkan sehingga indikator "QR Ready" tetap akurat.
- **Rate limit** kini memakai tabel `rate_limit_buckets` (satu query upsert per request).
  Bila database tidak tersedia, limiter **fail-open** (permintaan diizinkan) agar redirect
  publik tetap hidup.
- **Monitoring & notifikasi WhatsApp dihapus.** Tabel `monitoring_jobs`, `review_checks`,
  `notifications`, dan `incoming_messages` tetap ada (tidak ada migration destruktif) sehingga
  data historis aman, namun tidak lagi diisi. Halaman admin terkait bersifat arsip.
- Migrasi `20261013000000_rate_limit_buckets` bersifat aditif (`CREATE TABLE IF NOT EXISTS`).
- **No destructive migration / reset** dijalankan terhadap data produksi.
