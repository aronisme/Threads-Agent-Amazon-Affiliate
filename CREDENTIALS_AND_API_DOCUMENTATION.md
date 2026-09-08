# 📘 DOKUMENTASI SISTEM, KREDENSIAL, & SPESIFIKASI API
**Medsos Agent (FB, IG & Threads Autonomous Affiliate System)**  
*Dokumen Hasil Audit, Scan Komprehensif Seluruh Sistem, Inventaris Kredensial, dan Referensi API*

---

## 📑 DAFTAR ISI
1. [Ringkasan Arsitektur Sistem](#1-ringkasan-arsitektur-sistem)
2. [Inventaris Kredensial & Environment Variables (.env)](#2-inventaris-kredensial--environment-variables-env)
   - [2.1 Server & Core Security](#21-server--core-security)
   - [2.2 Meta Platforms (Facebook, Instagram & Threads)](#22-meta-platforms-facebook-instagram--threads)
   - [2.3 Multi-Tier AI Engines (Groq, xKiro, Mistral)](#23-multi-tier-ai-engines-groq-xkiro-mistral)
   - [2.4 Database Engines (MongoDB Atlas & Firebase Firestore)](#24-database-engines-mongodb-atlas--firebase-firestore)
   - [2.5 Cloudinary CDN & Media Storage](#25-cloudinary-cdn--media-storage)
   - [2.6 Firebase Web Client SDK (Frontend)](#26-firebase-web-client-sdk-frontend)
   - [2.7 Shopee Affiliate & Link Tracking](#27-shopee-affiliate--link-tracking)
   - [2.8 Telegram Bot Notification & Webhook](#28-telegram-bot-notification--webhook)
3. [Tabel Matriks Kredensial & Status Konfigurasi](#3-tabel-matriks-kredensial--status-konfigurasi)
4. [Spesifikasi Integrasi API Pihak Ketiga (External 3rd-Party APIs)](#4-spesifikasi-integrasi-api-pihak-ketiga-external-3rd-party-apis)
   - [4.1 Meta Graph API v21.0 (Facebook & Instagram)](#41-meta-graph-api-v210-facebook--instagram)
   - [4.2 Threads Graph API v1.0](#42-threads-graph-api-v10)
   - [4.3 Groq Cloud AI API (Multi-Key Rotator Engine)](#43-groq-cloud-ai-api-multi-key-rotator-engine)
   - [4.4 xKiro AI API (Qwen Flagship)](#44-xkiro-ai-api-qwen-flagship)
   - [4.5 Mistral AI API (Cadangan / Failover)](#45-mistral-ai-api-cadangan--failover)
   - [4.6 Cloudinary REST & Upload API](#46-cloudinary-rest--upload-api)
   - [4.7 Telegram Bot API](#47-telegram-bot-api)
5. [Katalog Lengkap Internal Backend API Endpoints](#5-katalog-lengkap-internal-backend-api-endpoints)
   - [5.1 Health & Debug](#51-health--debug)
   - [5.2 Autentikasi & OAuth (`/api/auth`)](#52-autentikasi--oauth-apiauth)
   - [5.3 Akun Media Sosial (`/api/accounts`)](#53-akun-media-sosial-apiaccounts)
   - [5.4 Manajemen Postingan & Penjadwalan (`/api/posts`)](#54-manajemen-postingan--penjadwalan-apiposts)
   - [5.5 Template Copywriting (`/api/templates`)](#55-template-copywriting-apitemplates)
   - [5.6 AI Generation (`/api/ai`)](#56-ai-generation-apiai)
   - [5.7 Shopee Affiliate Shortlink Generator (`/api/v1/affiliate/shopee`)](#57-shopee-affiliate-shortlink-generator-apiv1affiliateshopee)
   - [5.8 Katalog Produk & Content Bank (`/api/affiliate-products` & `/api/content-bank`)](#58-katalog-produk--content-bank-apiaffiliate-products--apicontent-bank)
   - [5.9 Public Cloaked Redirect Engine (`/s/:code`)](#59-public-cloaked-redirect-engine-scode)
   - [5.10 Analitik Klik & Tautan (`/api/analytics`)](#510-analitik-klik--tautan-apianalytics)
   - [5.11 Analitik Postingan Media Sosial (`/api/analytics/posts`)](#511-analitik-postingan-media-sosial-apianalyticsposts)
   - [5.12 Telegram Webhook & Reporting (`/api/telegram`)](#512-telegram-webhook--reporting-apitelegram)
   - [5.13 Threads Marketing & Social Listening (`/api/threads-marketing`)](#513-threads-marketing--social-listening-apithreads-marketing)
   - [5.14 Agent Command Dispatcher (`/api/agent`)](#514-agent-command-dispatcher-apiagent)
   - [5.15 Autonomous Marketing Orchestrator (`/api/agent-orchestrator`)](#515-autonomous-marketing-orchestrator-apiagent-orchestrator)
   - [5.16 Cron & Scheduler Runner (`/api/cron`)](#516-cron--scheduler-runner-apicron)
   - [5.17 Statistik Dashboard (`/api/stats`)](#517-statistik-dashboard-apistats)
6. [Skema Database & Koleksi Data](#6-skema-database--koleksi-data)
7. [Panduan Deployment Vercel & Konfigurasi Cron](#7-panduan-deployment-vercel--konfigurasi-cron)
8. [Panduan Keamanan & Rotasi Secret](#8-panduan-keamanan--rotasi-secret)

---

## 1. RINGKASAN ARSITEKTUR SISTEM

**Medsos Agent** adalah sistem otomasi pemasaran afiliasi (Shopee Affiliate) dan pengelolaan konten multi-platform berbasis kecerdasan buatan (AI) yang bekerja secara otonom (autonomous agent) maupun manual.

```
                  +-------------------------------------------------------+
                  |                  Frontend (Vite + React)              |
                  +-------------------------------------------------------+
                                              |
                                              v
+-----------------------------------------------------------------------------------------+
|                                Backend (Node.js / Express)                              |
|                          Serverless Ready (Vercel: api/index.js)                        |
+-----------------------------------------------------------------------------------------+
       |                  |                    |                      |             |
       v                  v                    v                      v             v
+--------------+   +--------------+   +-------------------+   +--------------+ +-----------+
|  Dual-Engine |   | AI Tier Pool |   |   Meta Platforms  |   | Cloud Storage| |  Telegram |
|   Database   |   |   (Rotator)  |   |   & Social Graph  |   |  & Rehosting | |  Webhooks |
+--------------+   +--------------+   +-------------------+   +--------------+ +-----------+
| - MongoDB    |   | 1. Groq LPU  |   | - Facebook Pages  |   | - Cloudinary | | - Bot API |
|   Atlas      |   | 2. xKiro Qwen|   | - Instagram Graph |   | - Image/Vid  | | - Realtime|
| - Firestore  |   | 3. Mistral AI|   | - Threads Graph   |   |   Presets    | |   Report  |
+--------------+   +--------------+   +-------------------+   +--------------+ +-----------+
```

### Karakteristik Utama Arsitektur:
1. **Serverless Deployment di Vercel**: Seluruh backend Express dibungkus dalam serverless function melalui `api/index.js` dengan konfigurasi routing di `vercel.json`.
2. **Dual-Engine Database**: Menggunakan MongoDB Atlas sebagai primary cluster tanpa batasan kuota baca harian Firestore, dengan kemampuan fallback otomatis ke Firebase Firestore jika `MONGODB_URI` tidak disediakan.
3. **Multi-Key & Multi-Tier AI Rotator**: Sistem rotasi kunci round-robin untuk Groq LPU guna menghindari limit RPM/TPM, dengan failover bertingkat ke xKiro (Qwen 3.8 Max) dan Mistral AI.
4. **Cloaked Affiliate Redirect Engine (`/s/:code`)**: Mesin redirect tautan pendek dengan deteksi bot Meta/Google, deduplikasi klik, dan injeksi sub-ID pelacakan afiliasi Shopee otomatis.
5. **Autonomous Agent Orchestrator**: Loop otonom berbasis siklus waktu (Cron) yang mengelola evaluasi performa produk, memory posting, variasi caption, penjadwalan konten, serta social listening di Threads.

---

## 2. INVENTARIS KREDENSIAL & ENVIRONMENT VARIABLES (.env)

Berikut adalah rincian seluruh variabel lingkungan (Environment Variables) yang digunakan di seluruh sistem:

### 2.1 Server & Core Security
| Variabel | Deskripsi | Default / Nilai Produksi | Lokasi Penggunaan |
|---|---|---|---|
| `NODE_ENV` | Mode lingkungan Node (`production` atau `development`) | `production` | Backend / Vercel |
| `PORT` | Port server lokal untuk express | `4000` | `backend/src/server.js`, `env.js` |
| `BASE_URL` | URL basis aplikasi untuk callback OAuth dan redirect | `https://shopee-link-aff.vercel.app` | Backend (`env.js`, `accounts.js`, dll) |
| `PUBLIC_URL` | URL publik yang dibagikan ke media sosial | `https://shopee-link-aff.vercel.app` | Backend (`redirect.js`, `affiliate.js`) |
| `DRY_RUN` | Mode simulasi (`true` = post tidak dikirim ke Meta API asli; `false` = kirim sungguhan) | `false` | `backend/src/config/env.js`, `postService.js` |
| `JWT_SECRET` | Secret key untuk signing JWT login dan token verifikasi redirect | *String acak berkeamanan tinggi* | `backend/src/middleware/auth.js`, `routes/auth.js` |
| `JWT_EXPIRES_IN` | Masa berlaku token autentikasi JWT | `7d` | `backend/src/config/env.js`, `routes/auth.js` |

---

### 2.2 Meta Platforms (Facebook, Instagram & Threads)
| Variabel | Deskripsi | Format / Contoh | Lokasi Penggunaan |
|---|---|---|---|
| `FB_APP_ID` | Facebook App ID dari Meta for Developers | `2641379366258147` | `backend/src/routes/auth-oauth.js`, `tokenRefreshService.js` |
| `FB_APP_SECRET` | Facebook App Secret untuk exchange access token | `7c8b440eb18dd...` | `backend/src/routes/auth-oauth.js`, `tokenRefreshService.js` |
| `THREADS_APP_SECRET` | App Secret opsional khusus Threads (fallback ke `FB_APP_SECRET`) | *String hex* | `backend/src/services/tokenRefreshService.js` |
| `THREADS_TEST_TOKEN` | Token uji coba untuk seeding akun Threads lokal | *String token* | `backend/src/seed-initial-setup.js` |

> **Catatan Token Akses Pengguna/Halaman**: Access Token untuk Facebook Page, Instagram Business Account, dan Threads tersimpan secara dinamis di database (koleksi `social_accounts`) per akun pengguna, lengkap dengan sistem perpanjangan otomatis (*long-lived token refresh*).

---

### 2.3 Multi-Tier AI Engines (Groq, xKiro, Mistral)
Sistem menggunakan pola *Cascade Failover*:
1. **Tier 1 (Utama)**: Groq AI (Multi-Key Rotator)
2. **Tier 2 (Eksperimen / Flagship)**: xKiro AI (Qwen 3.8 Max)
3. **Tier 3 (Cadangan Terakhir)**: Mistral AI

| Variabel | Deskripsi | Nilai Terkonfigurasi / Contoh | Lokasi Penggunaan |
|---|---|---|---|
| `GROQ_API_KEYS` | Kumpulan API Keys Groq dipisahkan koma (rotasi round-robin) | `gsk_4NRX...,gsk_TmQy...,gsk_5QKV...` | `backend/src/config/env.js`, `aiQueueService.js` |
| `GROQ_MODEL_PRIMARY` | Model Groq utama untuk penalaran & orkestrasi | `qwen/qwen3.8-27b` | `backend/src/config/env.js`, `aiQueueService.js` |
| `GROQ_MODEL_FAST` | Model Groq berkecepatan tinggi untuk evaluasi cepat | `qwen/qwen3.6-27b` | `backend/src/config/env.js`, `aiQueueService.js` |
| `XKIRO_API_KEY` | API Key untuk layanan xKiro AI | `sk-xt-549e81588d...` | `backend/src/config/env.js`, `aiQueueService.js` |
| `XKIRO_BASE_URL` | Base URL endpoint kompatibel OpenAI milik xKiro | `https://api.xkiro.com/v1` | `backend/src/config/env.js`, `aiQueueService.js` |
| `XKIRO_MODEL` | Nama model AI pada platform xKiro | `qwen/qwen3.8-max` | `backend/src/config/env.js`, `aiQueueService.js` |
| `MISTRAL_API_KEY` | API Key Mistral AI (failover tier) | `MvVtr6MoVFw9...` | `backend/src/config/env.js`, `aiQueueService.js` |
| `MISTRAL_MODEL` | Nama model Mistral AI | `mistral-small-latest` | `backend/src/config/env.js`, `aiQueueService.js` |

---

### 2.4 Database Engines (MongoDB Atlas & Firebase Firestore)
| Variabel | Deskripsi | Format / Contoh | Lokasi Penggunaan |
|---|---|---|---|
| `MONGODB_URI` / `MONGO_URL` | URI koneksi MongoDB Atlas (Cluster Gratis/Dedicated) | `mongodb+srv://user:pass@cluster.mongodb.net/?...` | `backend/src/config/mongo.js`, `firebase.js` |
| `MONGODB_DB_NAME` | Nama database MongoDB yang ditargetkan | `medsos_agent` | `backend/src/config/mongo.js` |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Kredensial Service Account Firebase Admin SDK yang di-encode Base64 | `ewogICJ0eXBlIjogInN...` | `backend/src/config/firebase.js` |
| `DB_PATH` | Path SQLite lokal (legacy / local standalone testing) | `./data/fb_ig_poster.db` | `backend/src/config/env.js` |

---

### 2.5 Cloudinary CDN & Media Storage
Penyimpanan media dan rehosting gambar/video otomatis agar memenuhi spesifikasi Meta Graph API (harus URL publik langsung yang dapat di-crawl Meta bot).

| Variabel | Lingkungan | Deskripsi | Nilai Terpasang |
|---|---|---|---|
| `VITE_CLOUDINARY_CLOUD_NAME_VIDEO` | Frontend Vite | Cloud name Cloudinary untuk upload video | `drkbqpxqf` |
| `VITE_CLOUDINARY_UPLOAD_PRESET_VIDEO` | Frontend Vite | Unsigned upload preset untuk video | `vidgram` |
| `VITE_CLOUDINARY_CLOUD_NAME_IMAGE` | Frontend Vite | Cloud name Cloudinary untuk upload gambar | `dwgfox722` |
| `VITE_CLOUDINARY_UPLOAD_PRESET_IMAGE` | Frontend Vite | Unsigned upload preset untuk gambar | `lynke_app` |
| `CLOUDINARY_CLOUD_NAME_IMAGE` | Backend | Cloud name fallback backend gambar | `dwgfox722` |
| `CLOUDINARY_UPLOAD_PRESET_IMAGE` | Backend | Preset upload gambar backend | `lynke_app` |
| `CLOUDINARY_CLOUD_NAME_VIDEO` | Backend | Cloud name fallback backend video | `drkbqpxqf` |
| `CLOUDINARY_UPLOAD_PRESET_VIDEO` | Backend | Preset upload video backend | `vidgram` |
| `CLOUDINARY_API_KEY` | Backend (Opsional) | API Key untuk operasi penghapusan aset (Destroy API) | *String angka* |
| `CLOUDINARY_API_SECRET` | Backend (Opsional) | Secret Key untuk menandatangani signature penghapusan aset | *String alphanumeric* |

---

### 2.6 Firebase Web Client SDK (Frontend)
Digunakan pada antarmuka web klien (Vite React) jika berinteraksi langsung dengan Firebase Authentication atau Firestore client:

| Variabel | Deskripsi | Nilai Terpasang |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | API Key Web Firebase | `AIzaSyA4K2jlWQh8CUGexUhdZtMWee3fHwdmey8` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domain Autentikasi Firebase | `firestore-database-18d6b.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID Google Cloud / Firebase | `firestore-database-18d6b` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Cloud Storage Bucket Firebase | `firestore-database-18d6b.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID Cloud Messaging | `873836261848` |
| `VITE_FIREBASE_APP_ID` | App ID Firebase Web | `1:873836261848:web:60f9a3a84b6659592d82ad` |
| `VITE_FIREBASE_MEASUREMENT_ID` | Google Analytics Measurement ID | `G-G6CDR4KMKE` |

---

### 2.7 Shopee Affiliate & Link Tracking
| Variabel | Deskripsi | Nilai Terpasang |
|---|---|---|
| `SHOPEE_AFFILIATE_ID` | ID Akun Shopee Affiliate Program milik pemilik | `11328861338` |

---

### 2.8 Telegram Bot Notification & Webhook
Kredensial bot Telegram dikelola secara dinamis per akun di database (`social_accounts` dengan `platform: 'telegram'`).
- `access_token`: Bot Token dari `@BotFather` (misal: `123456789:ABCdefGhI...`)
- `page_id`: Default Chat ID atau Channel ID tujuan pelaporan.
- Webhook URL sistem: `https://shopee-link-aff.vercel.app/api/telegram/webhook/<BOT_TOKEN>`

---

## 3. TABEL MATRIKS KREDENSIAL & STATUS KONFIGURASI

| No | Nama Variabel | Kategori | Status di `.env` | Tingkat Sensitivitas | Diperlukan di Vercel? |
|---|---|---|---|---|---|
| 1 | `NODE_ENV` | Server | Terisi (`production`) | Publik / Aman | ✅ Wajib |
| 2 | `PORT` | Server | Terisi (`4000`) | Publik / Aman | ❌ (Vercel otomatis) |
| 3 | `BASE_URL` | Server | Terisi | Publik / Aman | ✅ Wajib |
| 4 | `PUBLIC_URL` | Server | Terisi | Publik / Aman | ✅ Wajib |
| 5 | `DRY_RUN` | Server | Terisi (`false`) | Konfigurasi | ✅ Wajib |
| 6 | `JWT_SECRET` | Keamanan | Terisi | 🔴 Kritis / Rahasia | ✅ Wajib |
| 7 | `JWT_EXPIRES_IN` | Keamanan | Terisi (`7d`) | Konfigurasi | 🟡 Disarankan |
| 8 | `FB_APP_ID` | Meta OAuth | Terisi | 🟡 Semi-Privat | ✅ Wajib jika pakai OAuth |
| 9 | `FB_APP_SECRET` | Meta OAuth | Terisi | 🔴 Kritis / Rahasia | ✅ Wajib jika pakai OAuth |
| 10 | `GROQ_API_KEYS` | AI Service | Terisi (3 Keys) | 🔴 Kritis / Rahasia | ✅ Wajib (Mesin Utama) |
| 11 | `GROQ_MODEL_PRIMARY`| AI Service | Terisi (`qwen/qwen3.8-27b`) | Konfigurasi | ✅ Wajib |
| 12 | `GROQ_MODEL_FAST` | AI Service | Terisi (`qwen/qwen3.6-27b`) | Konfigurasi | ✅ Wajib |
| 13 | `XKIRO_API_KEY` | AI Service | Terisi | 🔴 Kritis / Rahasia | 🟡 Opsional (Tier 2) |
| 14 | `XKIRO_BASE_URL` | AI Service | Terisi | Konfigurasi | 🟡 Opsional |
| 15 | `XKIRO_MODEL` | AI Service | Terisi (`qwen/qwen3.8-max`) | Konfigurasi | 🟡 Opsional |
| 16 | `MISTRAL_API_KEY` | AI Service | Terisi | 🔴 Kritis / Rahasia | 🟡 Opsional (Failover) |
| 17 | `MISTRAL_MODEL` | AI Service | Terisi | Konfigurasi | 🟡 Opsional |
| 18 | `MONGODB_URI` | Database | Opsional di local / Vercel | 🔴 Kritis / Rahasia | ⭐ Sangat Disarankan |
| 19 | `MONGODB_DB_NAME`| Database | Default (`medsos_agent`) | Konfigurasi | 🟡 Opsional |
| 20 | `FIREBASE_SERVICE_ACCOUNT_BASE64` | Database | Terisi | 🔴 Kritis / Rahasia | ✅ Wajib jika tanpa Mongo |
| 21 | `VITE_FIREBASE_*` (7 item) | Frontend | Terisi | 🟡 Publik Client | ✅ Wajib di Vercel Build |
| 22 | `VITE_CLOUDINARY_*` (4 item) | Frontend | Terisi | 🟡 Unsigned Presets | ✅ Wajib di Vercel Build |
| 23 | `CLOUDINARY_*` (Backend) | Backend | Terisi di kode & env | 🟡 Preset / Secret | 🟡 Disarankan |
| 24 | `SHOPEE_AFFILIATE_ID` | Afiliasi | Terisi (`11328861338`) | Konfigurasi | ✅ Wajib |

---

## 4. SPESIFIKASI INTEGRASI API PIHAK KETIGA (EXTERNAL 3RD-PARTY APIS)

### 4.1 Meta Graph API v21.0 (Facebook & Instagram)
- **Base URL**: `https://graph.facebook.com/v21.0`
- **Autentikasi**: Bearer Page Access Token / User Token via query param `access_token`
- **Fitur & Endpoint yang Digunakan**:
  1. `GET /oauth/access_token`: Pertukaran `authorization_code` menjadi `access_token` dan perpanjangan `fb_exchange_token` menjadi Long-Lived Token (60 hari).
  2. `GET /me/accounts`: Mendapatkan daftar Facebook Pages yang dikelola dan akun Instagram Business yang ditautkan.
  3. `POST /{page-id}/feed`: Publikasi postingan teks dan tautan di Facebook Page.
  4. `POST /{page-id}/photos`: Publikasi gambar tunggal di Facebook Page.
  5. `POST /{page-id}/videos`: Publikasi video di Facebook Page.
  6. `POST /{ig-user-id}/media`: Pembuatan Media Container untuk Instagram (Carousel, Single Image, Reels).
  7. `POST /{ig-user-id}/media_publish`: Mempublikasikan Media Container yang sudah berstatus `FINISHED`.
  8. `GET /{media-id}/insights`: Pengambilan metrik analitik (impressions, reach, engagement, likes, comments, shares).

---

### 4.2 Threads Graph API v1.0
- **Base URL**: `https://graph.threads.net/v1.0`
- **Autentikasi**: Threads Long-Lived User Access Token
- **Fitur & Endpoint yang Digunakan**:
  1. `GET https://graph.threads.net/refresh_access_token`: Memperpanjang masa aktif token Threads secara berkala.
  2. `POST /{threads-user-id}/threads`: Membuat container postingan Threads (teks, media gambar, video, reply, atau quote post).
  3. `POST /{threads-user-id}/threads_publish`: Mempublikasikan container Threads menjadi status live.
  4. `GET /{threads-user-id}/threads`: Mengambil postingan Threads aktif untuk audit performa atau social listening.
  5. `GET /{threads-media-id}/conversation`: Membaca balasan (*replies*) masuk dari pengguna lain untuk auto-reply.

---

### 4.3 Groq Cloud AI API (Multi-Key Rotator Engine)
- **Endpoint**: `https://api.groq.com/openai/v1/chat/completions`
- **Autentikasi**: `Authorization: Bearer <GROQ_API_KEY>`
- **Mekanisme Khusus di Medsos Agent**:
  - Diimplementasikan di `backend/src/services/agent/aiQueueService.js`.
  - **Rotasi Thread-Safe**: Menggunakan `GroqKeyRotator` yang memutar kunci secara bergantian (*Round-Robin*) pada setiap pemanggilan.
  - **Failover Antar Kunci**: Jika sebuah kunci terkena HTTP 429 (Rate Limit), sistem otomatis mencoba kunci cadangan berikutnya dalam array hingga 3 kali percobaan sebelum melempar failover ke model tier berikutnya.
  - **Model Aktif**: `qwen/qwen3.8-27b` (Penalaran, evaluasi produk, pembuatan angle), `qwen/qwen3.6-27b` (Operasi cepat).

---

### 4.4 xKiro AI API (Qwen Flagship)
- **Endpoint**: `https://api.xkiro.com/v1/chat/completions` (konfigurasi via `XKIRO_BASE_URL`)
- **Autentikasi**: `Authorization: Bearer <XKIRO_API_KEY>`
- **Model Aktif**: `qwen/qwen3.8-max`
- **Kegunaan**: AI Tier 2 untuk copywriting persuasif tingkat tinggi dan analisis sentimen audiens mendalam.

---

### 4.5 Mistral AI API (Cadangan / Failover)
- **Endpoint**: `https://api.mistral.ai/v1/chat/completions`
- **Autentikasi**: `Authorization: Bearer <MISTRAL_API_KEY>`
- **Model Aktif**: `mistral-small-latest`
- **Kegunaan**: Failover terakhir ketika seluruh kuota Groq dan xKiro tidak tersedia, memastikan penjadwalan konten tidak terputus.

---

### 4.6 Cloudinary REST & Upload API
- **Endpoint Upload Unsigned**: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`
  - Digunakan oleh frontend dan backend untuk menyimpan media secara instan tanpa mengekspos API Secret.
  - Presets: `lynke_app` (Gambar) dan `vidgram` (Video).
- **Endpoint Signed Destroy**: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`
  - Digunakan di `backend/src/services/mediaRehostService.js` untuk membersihkan aset sementara setelah dipublikasikan ke media sosial, menghemat kuota penyimpanan Cloudinary.

---

### 4.7 Telegram Bot API
- **Endpoint Pengiriman Pesan**: `https://api.telegram.org/bot<TOKEN>/sendMessage`
  - Mengirim notifikasi performa 24 jam terakhir ke pengguna dalam format HTML lengkap dengan statistik klik, pendapatan estimasi, dan status agen.
- **Endpoint Penerimaan Webhook**: `POST /api/telegram/webhook/:token`
  - Menangani perintah on-demand seperti `/report`, `/kinerja`, `/status`, dan `/help`.

---

## 5. KATALOG LENGKAP INTERNAL BACKEND API ENDPOINTS

Seluruh rute backend terdaftar dan di-mount di `backend/src/app.js`.

### 5.1 Health & Debug
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/health` | Publik | Healthcheck status server, timestamp, dan mode dry-run |
| `GET` | `/api/debug-post/:id` | Publik | Mengambil data mentah dokumen post untuk inspeksi cepat |

---

### 5.2 Autentikasi & OAuth (`/api/auth`)
File: `backend/src/routes/auth.js` & `backend/src/routes/auth-oauth.js`

| Method | Endpoint | Auth | Parameter / Body | Deskripsi |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Publik | `{ name, email, password }` | Mendaftarkan akun pengguna baru |
| `POST` | `/api/auth/login` | Publik | `{ email, password }` | Login pengguna, menghasilkan JWT token |
| `GET` | `/api/auth/me` | Bearer JWT | Header `Authorization: Bearer <token>` | Mengambil profil user yang sedang login |
| `GET` | `/api/auth/facebook` | Publik | - | Redirect ke Meta OAuth Dialog untuk login FB/IG |
| `GET` | `/api/auth/facebook/callback` | Publik | Query: `?code=...` | Menerima authorization code dan menyimpan token halaman ke database |
| `POST` | `/api/auth/facebook/deauthorize`| Publik | Signed request dari Meta | Endpoint webhook kepatuhan saat user mencabut akses app |
| `POST` | `/api/auth/facebook/data-deletion`| Publik | Signed request dari Meta | Endpoint kepatuhan penghapusan data pengguna Meta (GDPR) |

---

### 5.3 Akun Media Sosial (`/api/accounts`)
File: `backend/src/routes/accounts.js`

| Method | Endpoint | Auth | Parameter / Body | Deskripsi |
|---|---|---|---|---|
| `GET` | `/api/accounts` | Bearer JWT | - | Mengambil daftar seluruh akun sosial pengguna (FB, IG, Threads, Telegram) |
| `POST` | `/api/accounts` | Bearer JWT | `{ platform, page_id, access_token, page_name, allowed_niches, content_persona_id }` | Menambahkan akun sosial secara manual |
| `PUT` | `/api/accounts/:id` | Bearer JWT | `{ is_active, allowed_niches, content_persona_id, threads_media_mode }` | Memperbarui konfigurasi niche & persona akun |
| `DELETE`| `/api/accounts/:id` | Bearer JWT | - | Menghapus akun sosial yang terhubung |
| `POST` | `/api/accounts/refresh-tokens`| Bearer JWT | - | Memperbarui (*refresh*) masa aktif seluruh Long-Lived Token milik pengguna |

---

### 5.4 Manajemen Postingan & Penjadwalan (`/api/posts`)
File: `backend/src/routes/posts.js`

| Method | Endpoint | Auth | Parameter / Body | Deskripsi |
|---|---|---|---|---|
| `GET` | `/api/posts` | Bearer JWT | Query: `?status=...&platform=...&limit=...` | Mengambil daftar postingan dengan filter |
| `GET` | `/api/posts/:id` | Bearer JWT | Param: `:id` | Mengambil detail postingan tertentu |
| `POST` | `/api/posts` | Bearer JWT | `{ content, media, targets, scheduled_at, product_id, angle }` | Membuat draft atau menjadwalkan postingan baru |
| `PUT` | `/api/posts/:id` | Bearer JWT | Objek modifikasi konten / jadwal | Memperbarui postingan yang belum dipublikasikan |
| `POST` | `/api/posts/:id/publish` | Bearer JWT | - | Mempublikasikan postingan secara instan ke platform target |
| `DELETE`| `/api/posts/:id` | Bearer JWT | - | Menghapus postingan tertentu |
| `POST` | `/api/posts/bulk-delete` | Bearer JWT | `{ ids: [...] }` | Menghapus banyak postingan sekaligus |
| `GET` | `/api/posts/failed-media-stats` | Bearer JWT | - | Memeriksa statistik postingan yang gagal karena masalah format media |
| `POST` | `/api/posts/repair-failed-media`| Bearer JWT | - | Menjalankan otomatisasi rehosting dan perbaikan URL media yang gagal |

---

### 5.5 Template Copywriting (`/api/templates`)
File: `backend/src/routes/templates.js`

| Method | Endpoint | Auth | Parameter / Body | Deskripsi |
|---|---|---|---|---|
| `GET` | `/api/templates` | Bearer JWT | Query: `?category=...` | Mengambil koleksi template copywriting |
| `POST` | `/api/templates` | Bearer JWT | `{ title, content, category, tags }` | Menambahkan template copywriting kustom baru |
| `PUT` | `/api/templates/:id`| Bearer JWT | Objek update template | Memperbarui template |
| `DELETE`| `/api/templates/:id`| Bearer JWT | - | Menghapus template |

---

### 5.6 AI Generation (`/api/ai`)
File: `backend/src/routes/ai.js`

| Method | Endpoint | Auth | Parameter / Body | Deskripsi |
|---|---|---|---|---|
| `POST` | `/api/ai/generate` | Bearer JWT | `{ topic, tone, platform, length }` | Menghasilkan teks caption media sosial dengan AI |
| `POST` | `/api/ai/generate-caption` | Bearer JWT | Sama seperti `/generate` | Alias untuk kompatibilitas frontend |

---

### 5.7 Shopee Affiliate Shortlink Generator (`/api/v1/affiliate/shopee`)
File: `backend/src/routes/affiliate.js`

| Method | Endpoint | Auth | Parameter / Body | Deskripsi |
|---|---|---|---|---|
| `POST` | `/api/v1/affiliate/shopee` | Publik / Key | `{ original_url, sub_id, product_name }` | Menghasilkan tautan pendek cloaked baru (contoh: `/s/aB3x9z`) |
| `POST` | `/api/v1/affiliate/shopee/batch` | Publik / Key | `{ items: [{ original_url, sub_id }] }` | Menghasilkan banyak tautan pendek sekaligus secara efisien |

---

### 5.8 Katalog Produk & Content Bank (`/api/affiliate-products` & `/api/content-bank`)
File: `backend/src/routes/affiliate-products.js`

| Method | Endpoint | Auth | Parameter / Body | Deskripsi |
|---|---|---|---|---|
| `GET` | `/api/affiliate-products` | Bearer JWT | Query: `?niche=...&status=...&search=...` | Mengambil katalog produk afiliasi aktif |
| `GET` | `/api/affiliate-products/:id` | Bearer JWT | Param: `:id` | Mengambil detail produk lengkap dengan histori performa |
| `POST` | `/api/affiliate-products` | Bearer JWT | Data produk: nama, URL shopee, gambar, harga, deskripsi | Menambahkan produk baru ke bank konten |
| `POST` | `/api/affiliate-products/bulk` | Bearer JWT | Array objek produk | Mengimpor produk massal ke database |
| `POST` | `/api/affiliate-products/bulk-delete` | Bearer JWT | `{ ids: [...] }` | Menghapus banyak produk dari bank konten |
| `PUT` | `/api/affiliate-products/:id` | Bearer JWT | Data update produk | Memperbarui informasi produk atau niche |
| `DELETE`| `/api/affiliate-products/:id` | Bearer JWT | - | Menghapus produk dari bank konten |

---

### 5.9 Public Cloaked Redirect Engine (`/s/:code`)
File: `backend/src/routes/redirect.js`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/s/:code` | Publik | **Mesin Redirect Pintar**: Mendeteksi bot Meta/Google untuk menyajikan OpenGraph preview, mendeteksi user riil untuk injeksi sub_id dan redirect 302 ke Shopee Affiliate, mencatat referer dan analitik klik tanpa full-table scan. |

---

### 5.10 Analitik Klik & Tautan (`/api/analytics`)
File: `backend/src/routes/analytics.js`

| Method | Endpoint | Auth | Parameter / Body | Deskripsi |
|---|---|---|---|---|
| `GET` | `/api/analytics/overview` | Bearer JWT | Query: `?period=7d\|30d` | Ringkasan metrik klik, rasio konversi platform, traffic source |
| `GET` | `/api/analytics/links` | Bearer JWT | Query: `?page=...&limit=...` | Daftar seluruh tautan pendek dan total klik masing-masing |
| `GET` | `/api/analytics/links/:code` | Bearer JWT | Param: `:code` | Detail mendalam performa tautan tertentu |
| `POST` | `/api/analytics/links/custom` | Bearer JWT | `{ code, destination_url }` | Membuat tautan pendek dengan kode custom |
| `DELETE`| `/api/analytics/links/:code` | Bearer JWT | Param: `:code` | Menghapus tautan pendek tertentu |

---

### 5.11 Analitik Postingan Media Sosial (`/api/analytics/posts`)
File: `backend/src/routes/post-analytics.js`

| Method | Endpoint | Auth | Parameter / Body | Deskripsi |
|---|---|---|---|---|
| `GET` | `/api/analytics/posts` | Bearer JWT | Query: `?platform=...` | Metrik agregat seluruh postingan (reach, likes, comments) |
| `GET` | `/api/analytics/posts/summary` | Bearer JWT | - | Ringkasan KPI performa konten media sosial |
| `GET` | `/api/analytics/posts/status` | Bearer JWT | - | Status sinkronisasi terakhir dengan Meta Graph API |
| `POST` | `/api/analytics/posts/sync` | Bearer JWT | - | Memicu sinkronisasi instan metrik ke Facebook & Instagram |
| `GET` | `/api/analytics/posts/:id` | Bearer JWT | Param: `:id` | Detail metrik postingan individual |
| `GET` | `/api/analytics/posts/:id/history`| Bearer JWT| Param: `:id` | Tren perkembangan metrik postingan dari waktu ke waktu |

---

### 5.12 Telegram Webhook & Reporting (`/api/telegram`)
File: `backend/src/routes/telegram.js`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/telegram/webhook/:token` | Publik (Token Tervalidasi) | Menerima pesan masuk Telegram dari bot pengguna. Membalas perintah on-demand seperti `/report` dan `/kinerja`. |

---

### 5.13 Threads Marketing & Social Listening (`/api/threads-marketing`)
File: `backend/src/routes/threads-marketing.js`

| Method | Endpoint | Auth | Parameter / Body | Deskripsi |
|---|---|---|---|---|
| `GET` | `/api/threads-marketing/candidates` | Bearer JWT | Query: `?status=PENDING\|ALL` | Mengambil daftar kandidat balasan postingan Threads yang ditemukan oleh Social Listening |
| `POST` | `/api/threads-marketing/candidates/:id/approve` | Bearer JWT | `{ customReplyText, publishMode: 'REPLY'\|'QUOTE' }` | Menyetujui dan mempublikasikan balasan/quote post ke Threads |
| `POST` | `/api/threads-marketing/candidates/:id/reject` | Bearer JWT | `{ reason }` | Menolak kandidat postingan |
| `GET` | `/api/threads-marketing/keywords` | Bearer JWT | - | Mengambil daftar kata kunci yang sedang dipantau di Threads |
| `POST` | `/api/threads-marketing/keywords/auto-generate`| Bearer JWT| - | Meminta AI menganalisis produk bank konten dan membuat kata kunci monitoring otomatis |
| `DELETE`| `/api/threads-marketing/keywords/:id` | Bearer JWT | Param: `:id` | Menghapus kata kunci monitoring tertentu |
| `DELETE`| `/api/threads-marketing/keywords/clear-all` | Bearer JWT | - | Menghapus seluruh kata kunci monitoring |
| `GET` | `/api/threads-marketing/inbound-logs` | Bearer JWT | - | Memeriksa riwayat pesan dan balasan masuk yang diterima di Threads |
| `POST` | `/api/threads-marketing/trigger-scan` | Bearer JWT | - | Memicu pencarian manual postingan relevan di Threads |

---

### 5.14 Agent Command Dispatcher (`/api/agent`)
File: `backend/src/routes/agent.js`

| Method | Endpoint | Auth | Parameter / Body | Deskripsi |
|---|---|---|---|---|
| `GET` | `/api/agent/logs` | Bearer JWT | Query: `?limit=...` | Mengambil riwayat log aktivitas agen |
| `POST` | `/api/agent/execute` | Bearer JWT | `{ action: '...', params: {...} }` | **Unified Command Execution**: Dispatcher terpusat untuk mengeksekusi operasi AI, posting, scheduling, upload media, atau template |

*Aksi yang didukung oleh `/api/agent/execute`*:
- `get_accounts`: Mengambil akun aktif
- `get_posts`: Mengambil riwayat post
- `create_post`: Membuat post terjadwal/instan
- `update_post`: Memperbarui draft post
- `publish_post`: Mempublikasikan post
- `delete_post`: Menghapus post
- `upload_media`: Mengunggah media langsung ke Cloudinary
- `get_templates`: Mengambil template
- `generate_caption`: Menghasilkan caption AI
- `get_stats`: Mengambil statistik
- `get_agent_logs`: Mengambil log agen

---

### 5.15 Autonomous Marketing Orchestrator (`/api/agent-orchestrator`)
File: `backend/src/routes/agent-orchestrator.js`

| Method | Endpoint | Auth | Parameter / Body | Deskripsi |
|---|---|---|---|---|
| `GET` | `/api/agent-orchestrator/dashboard` | Bearer JWT | - | Memuat data lengkap dashboard Agen Otonom (status, jadwal, memori) |
| `POST` | `/api/agent-orchestrator/cycle/run` | Bearer JWT | - | Memicu eksekusi satu siklus otonom lengkap saat ini juga |
| `GET` | `/api/agent-orchestrator/quarter/status`| Bearer JWT | - | Status slot kuartal waktu posting hari ini |
| `GET` | `/api/agent-orchestrator/memory/product/:id`| Bearer JWT| Param: `:id` | Riwayat memori posting dan angle yang pernah digunakan untuk produk ini |
| `GET` | `/api/agent-orchestrator/decisions` | Bearer JWT | - | Mengambil log keputusan AI (mengapa produk A dipilih, angle apa yang dipakai) |
| `DELETE`| `/api/agent-orchestrator/decisions`| Bearer JWT | - | Menghapus riwayat log keputusan AI |
| `GET` | `/api/agent-orchestrator/insights` | Bearer JWT | - | Ringkasan insight performa konten yang dipelajari sistem |
| `GET` | `/api/agent-orchestrator/experiments` | Bearer JWT | - | Daftar eksperimen A/B testing sudut pandang copy |
| `POST` | `/api/agent-orchestrator/experiments/:id/evaluate` | Bearer JWT | Param: `:id` | Mengevaluasi pemenang eksperimen A/B testing |
| `POST` | `/api/agent-orchestrator/product/:id/diagnose` | Bearer JWT | Param: `:id` | Menjalankan diagnosa performa produk oleh AI |
| `POST` | `/api/agent-orchestrator/product/:id/override-status` | Bearer JWT | `{ status }` | Mengubah status produk (aktif, dormant, dihentikan) |
| `GET` | `/api/agent-orchestrator/config` | Bearer JWT | - | Mengambil konfigurasi parameter agen otonom |
| `POST` | `/api/agent-orchestrator/config` | Bearer JWT | Objek config | Memperbarui parameter frekuensi posting, batas harian, dll. |

---

### 5.16 Cron & Scheduler Runner (`/api/cron`)
File: `backend/src/routes/cron.js` & `backend/src/workers/scheduler.js`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/cron/publish` | Publik (Dipanggil oleh External Cron) | **Jantung Otomasi Sistem**: Dipanggil setiap 5 menit oleh Google Apps Script atau Vercel Cron. Menjalankan Tier 1 (publikasi postingan jatuh tempo) dan Tier 2 (siklus otonom agen, refresh token, sinkronisasi analitik). |

---

### 5.17 Statistik Dashboard (`/api/stats`)
File: `backend/src/routes/stats.js`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/stats` | Bearer JWT | Mengambil agregat jumlah postingan sukses, terjadwal, gagal, akun terhubung, dan klik tautan untuk halaman utama dashboard. |

---

## 6. SKEMA DATABASE & KOLEKSI DATA

Sistem mendukung abstraksi transparan antara **MongoDB Atlas** dan **Firebase Firestore**:

| Nama Koleksi / Tabel | Deskripsi & Isi Data |
|---|---|
| `users` | Akun pengguna sistem (email, password_hash, nama, token, role) |
| `social_accounts` | Akun media sosial yang terhubung (FB Page, IG Business, Threads, Bot Telegram, Access Tokens, status aktif, persona, allowed_niches) |
| `posts` | Data postingan (konten caption, media URLs, platform target, waktu jadwal, status: `draft` / `scheduled` / `posted` / `failed`, product_id, angle) |
| `affiliate_products` | Bank konten produk afiliasi Shopee (nama, link original, clean_url, short_code, deskripsi, foto/video, kategori/niche, status) |
| `link_clicks` | Rekaman setiap klik pada tautan pendek (short_code, timestamp, referer, platform sumber terdeteksi, user-agent, IP hash) |
| `post_analytics` | Data metrik performa postingan dari Meta API (reach, impressions, likes, comments, shares, engagement_rate) |
| `templates` | Template variasi copywriting berdasarkan formula (AIDA, PAS, Storytelling, Hard-sell, Soft-sell) |
| `threads_monitoring_keywords` | Kata kunci pencarian untuk social listening di Threads |
| `threads_reply_candidates` | Postingan Threads orang lain yang ditemukan relevan untuk dibalas rekomendasi produk afiliasi |
| `threads_inbound_replies` | Pesan masuk dari audiens di postingan Threads pengguna |
| `agent_decisions` | Log audit keputusan AI (alasan pemilihan produk, pemilihan sudut pandang, waktu eksekusi) |
| `agent_experiments` | Pencatatan eksperimen A/B testing format dan angle konten |
| `agent_product_memory` | Histori memori posting produk tertentu untuk mencegah repetisi konten dalam rentang waktu singkat |
| `system_settings` | Pengaturan global agen otonom (slot posting harian, kuota AI, interval) |
| `logs` | Audit log aktivitas sistem dan eror API |

---

## 7. PANDUAN DEPLOYMENT VERCEL & KONFIGURASI CRON

### 7.1 Langkah Konfigurasi di Vercel Dashboard
1. Buka dashboard proyek di [Vercel](https://vercel.com).
2. Masuk ke tab **Settings** > **Environment Variables**.
3. Masukkan seluruh variabel kunci dari bagian [2. TABEL MATRIKS KREDENSIAL](#3-tabel-matriks-kredensial--status-konfigurasi).
4. Pastikan variabel `BASE_URL` dan `PUBLIC_URL` diisi dengan domain kustom Vercel Anda (misal: `https://shopee-link-aff.vercel.app`).
5. Pada bagian **Build & Development Settings**, biarkan sesuai `vercel.json`:
   - Framework Preset: `Vite`
   - Output Directory: `frontend/dist`
   - Install Command: `npm install && cd frontend && npm install --include=dev`
   - Build Command: `cd frontend && npm run build`

### 7.2 Konfigurasi Google Apps Script (Cron 5-Menit)
Untuk menghindari biaya server berjalan terus-menerus (*always-on VM*), sistem memanfaatkan trigger eksternal bebas biaya dari Google Apps Script:
1. Buka [Google Apps Script](https://script.google.com) dan buat proyek baru.
2. Masukkan kode pemicu berikut:
   ```javascript
   function triggerMedsosAgentCron() {
     var url = "https://shopee-link-aff.vercel.app/api/cron/publish";
     try {
       var response = UrlFetchApp.fetch(url, {
         method: "GET",
         muteHttpExceptions: true
       });
       Logger.log("Status: " + response.getResponseCode() + " | Body: " + response.getContentText());
     } catch (e) {
       Logger.log("Error: " + e.message);
     }
   }
   ```
3. Klik ikon **Triggers** (ikon jam di menu kiri).
4. Tambahkan trigger baru:
   - Pilih fungsi: `triggerMedsosAgentCron`
   - Sumber acara: `Berdasarkan waktu (Time-driven)`
   - Jenis timer: `Penghitung menit (Minutes timer)`
   - Pilih interval menit: **Setiap 5 menit** *(Sangat penting: jangan 1 menit agar tidak memboroskan kuota compute Vercel)*.

---

## 8. PANDUAN KEAMANAN & ROTASI SECRET

1. **Pemisahan Kredensial**:
   - File `.env` tidak boleh di-commit ke Git repository publik. Pastikan `.env` terdaftar di `.gitignore`.
2. **Rotasi JWT Secret**:
   - Ubah `JWT_SECRET` pada saat deployment produksi menjadi string acak minimal 64 karakter (contoh: `openssl rand -hex 32`).
3. **Penyimpanan Kredensial Meta**:
   - `FB_APP_SECRET` hanya digunakan pada backend dan tidak pernah dikirim ke frontend client.
4. **Proteksi Multi-Key AI**:
   - Jika salah satu kunci Groq di `GROQ_API_KEYS` dinonaktifkan atau direvoke, perbarui string list dengan menghapus kunci tersebut dan deploy ulang environment variable di Vercel.
5. **Enkripsi Token di Database**:
   - Access token akun media sosial di koleksi `social_accounts` dikirimkan melalui koneksi TLS/SSL terenkripsi menuju MongoDB Atlas / Firestore.

---

*Dokumentasi ini disusun secara otomatis berdasarkan audit struktur source code, konfigurasi environment, dan analisis integrasi API pada repositori Medsos Agent.*
