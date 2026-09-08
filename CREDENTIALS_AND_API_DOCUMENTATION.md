# 📘 DOKUMENTASI SISTEM, KREDENSIAL, & SPESIFIKASI API
**Threads Autonomous Creator & Amazon Affiliate Agent**  
*Dokumen Arsitektur Lengkap, Inventaris Kredensial, Spesifikasi Endpoint API, Media Engine, & Ekstensi Ingest*

---

## 📑 DAFTAR ISI
1. [Ringkasan Eksekutif & Karakteristik Sistem](#1-ringkasan-eksekutif--karakteristik-sistem)
2. [Inventaris Kredensial & Environment Variables (.env.local)](#2-inventaris-kredensial--environment-variables-envlocal)
   - [2.1 Server, Keamanan & Cron](#21-server-keamanan--cron)
   - [2.2 Meta Threads Graph API v1.0](#22-meta-threads-graph-api-v10)
   - [2.3 Multi-Tier AI Engines (Groq, xKiro, Mistral, Vision)](#23-multi-tier-ai-engines-groq-xkiro-mistral-vision)
   - [2.4 Database (MongoDB Atlas & In-Memory Fallback)](#24-database-mongodb-atlas--in-memory-fallback)
   - [2.5 Cloudinary CDN Dual-Storage (Image & Video Rehosting)](#25-cloudinary-cdn-dual-storage-image--video-rehosting)
3. [Tabel Matriks Kredensial & Nilai Terpasang](#3-tabel-matriks-kredensial--nilai-terpasang)
4. [Spesifikasi Integrasi API Pihak Ketiga (External 3rd-Party APIs)](#4-spesifikasi-integrasi-api-pihak-ketiga-external-3rd-party-apis)
   - [4.1 Meta Threads Graph API v1.0](#41-meta-threads-graph-api-v10)
   - [4.2 Groq Cloud LPU AI API (Multi-Key Rotator)](#42-groq-cloud-lpu-ai-api-multi-key-rotator)
   - [4.3 xKiro AI API (Qwen 3.8 Max Flagship)](#43-xkiro-ai-api-qwen-38-max-flagship)
   - [4.4 Mistral AI API (Failover Tier)](#44-mistral-ai-api-failover-tier)
   - [4.5 Cloudinary Direct Upload API (Anti-Bot Buffer Mode)](#45-cloudinary-direct-upload-api-anti-bot-buffer-mode)
   - [4.6 Google Apps Script (External Cron Runner)](#46-google-apps-script-external-cron-runner)
5. [Katalog Lengkap Internal Backend API Endpoints (Next.js 14 App Router)](#5-katalog-lengkap-internal-backend-api-endpoints-nextjs-14-app-router)
   - [5.1 Cron & Autonomous Wake (`/api/cron/wake`)](#51-cron--autonomous-wake-apicronwake)
   - [5.2 Siklus Agen & Orkestrasi Konten (`/api/agent/...`)](#52-siklus-agen--orkestrasi-konten-apiagent)
   - [5.3 Manajemen Postingan & Moderasi (`/api/posts`)](#53-manajemen-postingan--moderasi-apiposts)
   - [5.4 Product Vault & Bulk Import (`/api/products`)](#54-product-vault--bulk-import-apiproducts)
   - [5.5 Chrome Extension Ingest Endpoint (`/api/products/ingest`)](#55-chrome-extension-ingest-endpoint-apiproductsingest)
   - [5.6 State, Persona, & Telemetri Agen (`/api/state`)](#56-state-persona--telemetri-agen-apistate)
   - [5.7 Meta Threads OAuth & Connection Test (`/api/threads/...` & `/api/auth/...`)](#57-meta-threads-oauth--connection-test-apithreads--apiauth)
6. [Spesifikasi Ekstensi Chrome Scraper & Skema Ingest](#6-spesifikasi-ekstensi-chrome-scraper--skema-ingest)
   - [6.1 Format Payload JSON Lengkap](#61-format-payload-json-lengkap)
   - [6.2 Penanganan CORS & Autentikasi](#62-penanganan-cors--autentikasi)
   - [6.3 Guardrail Out-of-Stock & Filter Serverless](#63-guardrail-out-of-stock--filter-serverless)
7. [Media Decision Engine & Alur Rotasi Visual](#7-media-decision-engine--alur-rotasi-visual)
8. [Sistem Internasionalisasi (i18n) & UI Multibahasa](#8-sistem-internasionalisasi-i18n--ui-multibahasa)
9. [Skema Database Mongoose / MongoDB](#9-skema-database-mongoose--mongodb)
10. [Panduan Deployment Vercel & Google Apps Script Setup](#10-panduan-deployment-vercel--google-apps-script-setup)

---

## 1. RINGKASAN EKSEKUTIF & KARAKTERISTIK SISTEM

**Threads Autonomous Creator & Amazon Affiliate Agent** adalah sistem otomasi kreator konten berbasis AI tingkat lanjut yang beroperasi pada platform **Meta Threads**. Agen ini memposisikan diri sebagai kreator nyata dalam bidang teknologi sehari-hari (*everyday tech*), penataan meja (*desk setup*), dan produktivitas kerja jarak jauh (*remote work*).

```
+-----------------------------------------------------------------------------------------+
|                       CHROME EXTENSION (Amazon Product Scraper)                        |
+-----------------------------------------------------------------------------------------+
                                      | POST /api/products/ingest (x-api-key)
                                      v
+-----------------------------------------------------------------------------------------+
|                  NEXT.JS 14 BACKEND (Vercel Serverless / Local Node)                     |
|                                                                                         |
|   +--------------------------+    +--------------------------+    +------------------+  |
|   |   Anti-Bot Rehoster      |    |   Media Decision Engine  |    |  Vision AI       |  |
|   | (Buffer -> Cloudinary)   |    | (45% Pic / 20% Vid / 35% |    |  Rotator         |  |
|   | Images: dwgfox722        |    |  Text-Only / Anti-Fatigue|    | (Organic Notes)  |  |
|   | Videos: drkbqpxqf        |    |  LRU Selection)          |    +------------------+  |
|   +--------------------------+    +--------------------------+               |          |
|                 |                              |                             |          |
|                 v                              v                             v          |
|   +----------------------------------------------------------------------------------+  |
|   |                      PRODUCT VAULT (MongoDB Atlas / In-Memory)                   |  |
|   +----------------------------------------------------------------------------------+  |
|                                                |                                        |
|   +--------------------------------------------v-------------------------------------+  |
|   |                        AUTONOMOUS EXECUTION LOOP (Cron Driven)                   |  |
|   |  - 80% Konten Organik (Spontan, Diskusi, Observasi Kreator Asli)                 |  |
|   |  - 20% Sebutan Produk Halus (Stealth Funnel: Top Post Bersih, Link di Self-Reply)|  |
|   |  - Multi-Key Groq LPU Rotator -> xKiro Flagship -> Mistral Failover              |  |
|   +----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
       |                                                                           |
       v                                                                           v
+-----------------------------+                               +---------------------------+
|    META THREADS GRAPH API   |                               |      DASHBOARD WEB UI     |
|   - Container Creation      |                               |  - Next.js + Tailwind CSS |
|   - Container Publishing    |                               |  - i18n (🇮🇩 ID / 🇺🇸 EN)  |
|   - Token Auto-Refresh      |                               |  - Persona & Vault Studio |
+-----------------------------+                               +---------------------------+
```

### Karakteristik Inti Sistem:
1. **Stealth Soft-Sell Funnel**: Postingan utama tidak pernah menyertakan tautan afiliasi atau bahasa jualan katalog. Tautan Amazon hanya disematkan pada balasan sendiri (*delayed self-reply*) jika relevan.
2. **Media Decision Engine**: Menghindari pemuatan media bertumpuk (*multi-media dump*) yang tidak wajar. Agen merotasi aset visual secara proporsional: 45% gambar tunggal, 20% video tunggal, 35% teks murni.
3. **Automatic Cloudinary Rehosting**: Mengunduh media Amazon secara aman melalui serverless buffer dengan User-Agent browser untuk memotong proteksi anti-hotlink HTTP 403, lalu menyimpannya di Cloudinary pribadi.
4. **Passive Knowledge Vault**: Penambahan produk dari Chrome Extension tidak langsung memicu spam postingan otomatis, melainkan tersimpan sebagai memori bawah sadar (*subconscious knowledge*) yang diangkat secara alami.
5. **Dukungan Penuh Bahasa Indonesia**: Panel kendali web dilengkapi fitur pengubah bahasa instan (ID/EN) dengan terminologi kreator yang natural.

---

## 2. INVENTARIS KREDENSIAL & ENVIRONMENT VARIABLES (.env.local)

### 2.1 Server, Keamanan & Cron
| Variabel | Tipe | Deskripsi | Lokasi Penggunaan |
|---|---|---|---|
| `NODE_ENV` | String | Lingkungan aplikasi (`development` / `production`) | Global Next.js |
| `NEXT_PUBLIC_APP_URL` | URL | URL basis aplikasi (contoh: `http://localhost:3000` atau URL Vercel) | Frontend & OAuth Redirect |
| `CRON_SECRET` | Secret String | Kunci pengaman untuk endpoint cron `/api/cron/wake` dan autentikasi Chrome Extension `x-api-key` | `/api/cron/wake`, `/api/products/ingest` |

### 2.2 Meta Threads Graph API v1.0
| Variabel | Tipe | Deskripsi | Lokasi Penggunaan |
|---|---|---|---|
| `THREADS_APP_ID` | Number/String | App ID dari dashboard Meta for Developers | `lib/threads/client.ts`, OAuth flow |
| `THREADS_APP_SECRET` | Secret String | App Secret Meta untuk penukaran auth code | `lib/threads/client.ts`, `/api/auth/threads` |
| `THREADS_USER_ID` | String | ID Akun Profil Pengguna Threads resmi | `lib/threads/client.ts`, `AgentState` |
| `THREADS_ACCESS_TOKEN`| Secret String | Long-Lived User Access Token Threads (60 hari, auto-refresh) | `lib/threads/client.ts`, `AgentState` |
| `DRY_RUN` | Boolean | Mode simulasi (`true`: cetak log tanpa kirim ke Threads; `false`: posting sungguhan) | `lib/threads/client.ts`, `AgentState` |

### 2.3 Multi-Tier AI Engines (Groq, xKiro, Mistral, Vision)
| Variabel | Tipe | Deskripsi | Lokasi Penggunaan |
|---|---|---|---|
| `GROQ_API_KEYS` | String (CSV) | Daftar kunci API Groq Cloud yang dipisahkan koma untuk rotasi round-robin | `lib/ai/rotator.ts`, `lib/ai/groq.ts` |
| `GROQ_MODEL_PRIMARY` | String | Model inferensi teks utama (default: `qwen/qwen3.8-27b`) | `lib/ai/rotator.ts` |
| `GROQ_MODEL_FAST` | String | Model ringan berkecepatan tinggi untuk evaluasi cepat (default: `qwen/qwen3.6-27b`) | `lib/ai/rotator.ts` |
| `XKIRO_API_KEY` | Secret String | Kunci API untuk xKiro AI (Tier 2 Flagship failover) | `lib/ai/rotator.ts` |
| `XKIRO_BASE_URL` | URL | Base URL endpoint API xKiro (default: `https://api.xkiro.com/v1`) | `lib/ai/rotator.ts` |
| `XKIRO_MODEL` | String | Model xKiro AI (default: `qwen/qwen3.8-max`) | `lib/ai/rotator.ts` |
| `MISTRAL_API_KEY` | Secret String | Kunci API Mistral AI (Tier 3 Emergency failover) | `lib/ai/rotator.ts` |
| `MISTRAL_MODEL` | String | Model Mistral AI (default: `mistral-small-latest`) | `lib/ai/rotator.ts` |

### 2.4 Database (MongoDB Atlas & In-Memory Fallback)
| Variabel | Tipe | Deskripsi | Lokasi Penggunaan |
|---|---|---|---|
| `MONGODB_URI` | Connection URI | URI koneksi MongoDB Atlas (`mongodb+srv://...`). Jika dikosongkan, sistem beralih ke in-memory store. | `db/connect.ts`, `db/store.ts` |
| `MONGODB_DB_NAME` | String | Nama database target di MongoDB (default: `threads_agent`) | `db/connect.ts` |

### 2.5 Cloudinary CDN Dual-Storage (Image & Video Rehosting)
Sistem menggunakan akun/preset Cloudinary terpisah untuk mengoptimalkan kuota dan penanganan jenis media:
| Variabel | Tipe | Default / Nilai Aktif | Fungsi |
|---|---|---|---|
| `CLOUDINARY_CLOUD_NAME_IMAGE` / `NEXT_PUBLIC_...` | String | `dwgfox722` | Cloud name penyimpanan gambar |
| `CLOUDINARY_UPLOAD_PRESET_IMAGE` / `NEXT_PUBLIC_...` | String | `lynke_app` | Unsigned preset untuk upload gambar |
| `CLOUDINARY_CLOUD_NAME_VIDEO` / `NEXT_PUBLIC_...` | String | `drkbqpxqf` | Cloud name penyimpanan video MP4 |
| `CLOUDINARY_UPLOAD_PRESET_VIDEO` / `NEXT_PUBLIC_...` | String | `vidgram` | Unsigned preset untuk upload video |

---

## 3. TABEL MATRIKS KREDENSIAL & NILAI TERPASANG

Berikut adalah ringkasan kredensial aktif pada lingkungan pengembangan & produksi saat ini:

| Komponen | Parameter | Nilai Terpasang / Konfigurasi | Status |
|---|---|---|---|
| **Server** | `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` / `https://threads-agent-amazon-affiliate.vercel.app` | ✅ Aktif |
| **Keamanan** | `CRON_SECRET` | `threads_agent_secret_cron_key_999` | ✅ Terkunci |
| **MongoDB** | `MONGODB_URI` | Cluster Atlas (`atlas-cobalt-notebook.kagrk4b.mongodb.net`) | ✅ Terkoneksi |
| **Meta Threads** | `THREADS_APP_ID` | `2641379366258147` | ✅ Terkonfigurasi |
| **Meta Threads** | `THREADS_USER_ID` | `28237007615909546` | ✅ Terkonfigurasi |
| **Meta Threads** | `DRY_RUN` | `false` | ✅ Live Posting |
| **AI Tier 1** | `GROQ_API_KEYS` | 3 Kunci Aktif (`gsk_4NRX...`, `gsk_TmQy...`, `gsk_5QKV...`) | ✅ Rotasi Round-Robin |
| **AI Tier 2** | `XKIRO_API_KEY` | `sk-xt-549e81588d...` (`qwen/qwen3.8-max`) | ✅ Siap Failover |
| **AI Tier 3** | `MISTRAL_API_KEY` | `MvVtr6MoVFw9...` (`mistral-small-latest`) | ✅ Cadangan Terakhir |
| **Media Images** | Cloudinary Image | Cloud: `dwgfox722` \| Preset: `lynke_app` | ✅ Direct Buffer Upload |
| **Media Videos** | Cloudinary Video | Cloud: `drkbqpxqf` \| Preset: `vidgram` | ✅ Direct Buffer Upload |

---

## 4. SPESIFIKASI INTEGRASI API PIHAK KETIGA

### 4.1 Meta Threads Graph API v1.0
Publikasi ke Threads menggunakan proses **Two-Step Container Publishing**:
1. **Pembuatan Media Container**:
   - `POST https://graph.threads.net/v1.0/{threads-user-id}/threads`
   - Parameter gambar: `{ media_type: "IMAGE", image_url: "https://res.cloudinary.com/...", text: "..." }`
   - Parameter video: `{ media_type: "VIDEO", video_url: "https://res.cloudinary.com/...", text: "..." }`
   - Parameter teks: `{ media_type: "TEXT", text: "..." }`
   - Mengembalikan: `{ id: "container_id" }`
2. **Publikasi Container**:
   - `POST https://graph.threads.net/v1.0/{threads-user-id}/threads_publish`
   - Parameter: `{ creation_id: "container_id" }`
   - Mengembalikan: `{ id: "published_thread_id" }`
3. **Perpanjangan Token Berkala**:
   - `GET https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token={token}`

### 4.2 Groq Cloud LPU AI API (Multi-Key Rotator)
- Endpoint: `https://api.groq.com/openai/v1/chat/completions`
- Engine: OpenAI-compatible SDK (`groq-sdk`)
- Mekanisme Rotasi: Round-robin antar kunci pada `GROQ_API_KEYS`. Jika terjadi limit HTTP 429 / 401, kunci ditandai cooldown selama 60 detik dan inferensi otomatis dialihkan ke kunci berikutnya tanpa memutus thread pengguna.

### 4.3 xKiro AI API (Qwen 3.8 Max Flagship)
- Endpoint: `https://api.xkiro.com/v1/chat/completions`
- Model: `qwen/qwen3.8-max`
- Header: `Authorization: Bearer <XKIRO_API_KEY>`

### 4.4 Mistral AI API (Failover Tier)
- Endpoint: `https://api.mistral.ai/v1/chat/completions`
- Model: `mistral-small-latest`

### 4.5 Cloudinary Direct Upload API (Anti-Bot Buffer Mode)
- Endpoint Gambar: `https://api.cloudinary.com/v1_1/dwgfox722/image/upload`
- Endpoint Video: `https://api.cloudinary.com/v1_1/drkbqpxqf/video/upload`
- Mode: Unsigned Multipart Form-Data
- **Bypass Proteksi Amazon**: Amazon CDN (`m.media-amazon.com`) memblokir crawler Cloudinary dengan status HTTP 403. Sistem mengatasi hal ini dengan mengunduh media terlebih dahulu ke memory buffer menggunakan header User-Agent browser desktop, lalu mengirimkan buffer langsung via form payload (`file: buffer`).

### 4.6 Google Apps Script (External Cron Runner)
- Pemicu berbasis waktu (*Time-driven trigger*) setiap 5 menit yang mengirimkan HTTP GET ke endpoint `/api/cron/wake?secret=<CRON_SECRET>`.

---

## 5. KATALOG LENGKAP INTERNAL BACKEND API ENDPOINTS (NEXT.JS 14 APP ROUTER)

### 5.1 Cron & Autonomous Wake (`/api/cron/wake`)
- **Method**: `GET`
- **Autentikasi**: Header `Authorization: Bearer <CRON_SECRET>` atau query string `?secret=<CRON_SECRET>`
- **Deskripsi**: Jantung penjadwalan otonom. Dipanggil setiap 5 menit. Memeriksa siklus istirahat (*sleep cycle*), cooldown postingan, dan memicu pekerjaan komposisi jika kondisi terpenuhi.
- **Fast-Exit**: Mengembalikan respons dalam `< 50ms` jika tidak ada aksi yang harus dieksekusi, menghemat kuota komputasi Vercel Free Tier.

### 5.2 Siklus Agen & Orkestrasi Konten (`/api/agent/...`)
| Endpoint | Method | Payload / Parameter | Deskripsi |
|---|---|---|---|
| `/api/agent/cycle` | `POST` | Kosong `{}` | Memicu eksekusi 1 siklus otonom: klaim job antrean atau enqueue postingan baru |
| `/api/agent/compose` | `POST` | `{ type?: PostType, topic?: string, productId?: string }` | Meminta AI membuat draf konten baru secara eksplisit |
| `/api/agent/discover` | `POST` | Kosong `{}` | Mencari ide percakapan & topik segar yang sedang hangat di niche target |
| `/api/agent/reply` | `POST` | `{ incomingText: string, authorUsername?: string, replyToId?: string }` | Menghasilkan balasan interaktif untuk komentar audiens |

### 5.3 Manajemen Postingan & Moderasi (`/api/posts`)
- **`GET /api/posts`**:
  - Query Params: `?status=ALL|DRAFT|PUBLISHED|REJECTED&limit=50`
  - Mengambil daftar histori konten, draf, dan log penerbitan.
- **`POST /api/posts`**:
  - Payload: `{ action: "APPROVE" | "REJECT" | "UPDATE", postId: string, updatedText?: string }`
  - Digunakan pada antarmuka moderasi manual untuk menyetujui draf sebelum tayang.

### 5.4 Product Vault & Bulk Import (`/api/products`)
- **`GET /api/products`**: Mengambil seluruh koleksi produk afiliasi dari database.
- **`POST /api/products`**:
  - Format Tunggal: `{ name, affiliateUrl, category, notes, price, imageUrl }`
  - Format Bulk Text (Pipa `|`): `{ bulkText: "Nama | Link | Kategori | Catatan" }`
- **`PUT /api/products/[id]`**: Memperbarui status, harga, atau catatan produk.
- **`DELETE /api/products/[id]`**: Menghapus produk dari vault.

### 5.5 Chrome Extension Ingest Endpoint (`/api/products/ingest`)
Endpoint khusus berkecepatan tinggi yang dirancang untuk menerima data scraping dari Ekstensi Chrome.
- **Method**: `POST` & `OPTIONS`
- **Header Wajib**: `x-api-key: <CRON_SECRET>`
- **Content-Type**: `application/json`
- **Fitur Khusus**:
  - Mendukung preflight CORS (`OPTIONS`) dari ekstensi browser manapun.
  - Rehosting otomatis media ke Cloudinary (maksimal 3–4 gambar, 1 video untuk mencegah timeout Vercel).
  - Proteksi stok: Jika `isOutOfStock: true`, produk otomatis diset `active: false`.
  - Operasi Upsert: Jika `asin` sudah ada di database, data diperbarui; jika belum, produk baru dibuat.

### 5.6 State, Persona, & Telemetri Agen (`/api/state`)
- **`GET /api/state`**: Mengambil identitas kreator, mood terkini, level otonomi, statistik postingan harian, dan preferensi persona.
- **`PUT /api/state`**: Memperbarui slider kepribadian (humor, sarkasme, kehangatan, slang, emoji, salesiness), niche target, dan kredensial.

### 5.7 Meta Threads OAuth & Connection Test (`/api/threads/...` & `/api/auth/...`)
- **`POST /api/threads/test-connection`**: Menguji validitas token akses dan koneksi langsung ke endpoint `/me` Meta Threads.
- **`GET /api/auth/threads`**: Inisiasi proses login Meta OAuth.
- **`GET /api/auth/threads/callback`**: Penukaran kode otorisasi menjadi long-lived token.

---

## 6. SPESIFIKASI EKSTENSI CHROME SCRAPER & SKEMA INGEST

Ekstensi Chrome bertugas melakukan scraping data lengkap dari halaman produk Amazon dan mengirimkannya secara instan ke agen.

### 6.1 Format Payload JSON Lengkap
```json
{
  "asin": "B07ZP697CB",
  "title": "Minimalist Aluminum Laptop Stand for Desk",
  "brand": "ErgoLift",
  "brandUrl": "https://www.amazon.com/stores/ErgoLift/...",
  "productUrl": "https://www.amazon.com/dp/B07ZP697CB",
  "affiliateLink": "https://amzn.to/3example",
  "trackingId": "aronfinds0c-20",
  "price": "$29.99",
  "listPrice": "$39.99",
  "discount": "25%",
  "rating": 4.7,
  "reviewsCount": 1420,
  "isOutOfStock": false,
  "images": [
    "https://m.media-amazon.com/images/I/71example1.jpg",
    "https://m.media-amazon.com/images/I/71example2.jpg"
  ],
  "videos": [
    "https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/.../default.jobtemplate.mp4"
  ],
  "bulletPoints": [
    "Ergonomic eye-level viewing angle",
    "Solid aluminum alloy build with heat dissipation",
    "Foldable design for portability"
  ],
  "description": "Premium aluminum stand compatible with all laptops 10-15.6 inches.",
  "specifications": {
    "Material": "Aluminum",
    "Weight": "1.2 lbs",
    "Color": "Space Gray"
  },
  "categories": ["Electronics", "Computers & Accessories", "Laptop Accessories", "Stands"],
  "badges": ["Amazon's Choice"]
}
```

### 6.2 Penanganan CORS & Autentikasi
Ekstensi mengirimkan request lintas domain (*cross-origin*). Endpoint `/api/products/ingest` merespons dengan header CORS lengkap:
```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, x-api-key, Authorization
```

### 6.3 Guardrail Out-of-Stock & Filter Serverless
- **Pencegahan Timeout Vercel (<10s)**: Sistem membatasi proses rehosting media hanya untuk maksimal 4 gambar pertama dan 1 video MP4 pertama.
- **Ketersediaan Produk**: Jika produk habis di Amazon (`isOutOfStock: true`), agen menandai produk sebagai `active: false` sehingga AI tidak akan merekomendasikan produk tersebut di Threads.

---

## 7. MEDIA DECISION ENGINE & ALUR ROTASI VISUAL

Akun kreator Threads yang nyata tidak pernah mengunggah kumpulan galeri foto secara berlebihan pada setiap postingan. Modul `lib/engines/mediaDecisionEngine.ts` bertindak sebagai pengatur ritme visual:

### 7.1 Distribusi Probabilitas Pemilihan Aset
- **45% Postingan Foto Tunggal (Single Image)**: Menampilkan 1 foto beresolusi tinggi yang telah direhost ke Cloudinary.
- **20% Postingan Video Singkat (Single Video MP4)**: Menampilkan video demonstrasi produk jika tersedia.
- **35% Postingan Teks Murni (Text-Only)**: Postingan opini, observasi, atau pertanyaan santai tanpa media untuk menjaga variasi alami feed.

### 7.2 Anti-Fatigue LRU Asset Rotation
Untuk mencegah kebosanan audiens akibat foto atau video yang sama digunakan berulang kali:
1. Sistem mencatat URL media terakhir yang digunakan pada kolom `lastMediaUsedUrl` di dokumen produk.
2. Saat produk terpilih kembali untuk diangkat, sistem akan memilih media berikutnya secara rotasi *Least Recently Used* (LRU).

---

## 8. SISTEM INTERNASIONALISASI (i18n) & UI MULTIBAHASA

Dashboard antarmuka kini dilengkapi dukungan multibahasa penuh:

### 8.1 Arsitektur i18n
- **File Kamus**: `lib/i18n/translations.ts` memuat kamus lengkap Bahasa Indonesia (default) dan Bahasa Inggris.
- **State Provider**: `lib/i18n/LanguageContext.tsx` membungkus seluruh aplikasi, membaca dan menyimpan preferensi ke `localStorage` (`agent_ui_lang`).
- **Komponen Pengubah**: `components/LanguageToggle.tsx` berupa tombol pil di bilah navigasi atas (`🇮🇩 ID` | `🇺🇸 EN`).
- **Halaman yang Telah Diterjemahkan**:
  - `/dashboard`: Metrik harian, quick actions, status live, draf terbaru.
  - `/activity`: Riwayat postingan, filter status, moderasi draf.
  - `/persona`: Slider kepribadian, gaya bahasa, topik fokus, topik terlarang.
  - `/products`: Vault produk, penambahan manual, import bulk, status aktif.
  - `/settings`: Konfigurasi token Meta Threads, switch dry-run, level otonomi.

---

## 9. SKEMA DATABASE MONGOOSE / MONGODB

Sistem menggunakan koleksi utama berikut di MongoDB (`threads_agent`):

| Koleksi | Model File | Fungsi Utama |
|---|---|---|
| `AgentState` | `db/models/AgentState.ts` | Konfigurasi singleton: level otonomi, mood aktif, statistik harian, token Threads, slider persona |
| `Product` | `db/models/Product.ts` | Vault produk Amazon: ASIN, judul, link afiliasi, media Cloudinary, creator notes, harga, status aktif, LRU media |
| `Post` | `db/models/Post.ts` | Rekam jejak konten: teks postingan, media URL, status (`DRAFT`, `PUBLISHED`, `REJECTED`), skor kecocokan, thread ID |
| `Job` | `db/models/Job.ts` | Antrean tugas asinkron dengan penguncian atomik: `COMPOSE_POST`, `CHECK_REPLIES`, `REFRESH_TOKEN` |
| `Memory` | `db/models/Memory.ts` | Memori semantik agen untuk mencegah repetisi ide atau topik dalam rentang waktu singkat |
| `Conversation` | `db/models/Conversation.ts` | Riwayat interaksi percakapan dengan pengguna lain di Threads |
| `Person` | `db/models/Person.ts` | Profil pengguna Threads yang pernah berinteraksi (tingkat keakraban, sentimen) |

---

## 10. PANDUAN DEPLOYMENT VERCEL & GOOGLE APPS SCRIPT SETUP

### 10.1 Langkah Deployment di Vercel
1. Push branch `main` ke repositori GitHub.
2. Di dashboard Vercel, pastikan seluruh variabel pada bagian [2. INVENTARIS KREDENSIAL](#2-inventaris-kredensial--environment-variables-envlocal) telah ditambahkan ke tab **Environment Variables**.
3. Vercel akan otomatis membangun aplikasi menggunakan preset Next.js.
4. Endpoint Ingest siap diakses di:  
   `https://<domain-anda>.vercel.app/api/products/ingest`

### 10.2 Konfigurasi Google Apps Script (Trigger 5-Menit)
Gunakan kode di `gas/trigger.gs`:
```javascript
const CRON_URL = "https://<domain-anda>.vercel.app/api/cron/wake?secret=threads_agent_secret_cron_key_999";

function wakeAgent() {
  try {
    const res = UrlFetchApp.fetch(CRON_URL, {
      method: "get",
      muteHttpExceptions: true
    });
    Logger.log("Status: " + res.getResponseCode() + " | Body: " + res.getContentText());
  } catch (e) {
    Logger.log("Error: " + e.message);
  }
}
```
Pasang trigger berbasis waktu setiap **5 menit** untuk menjalankan fungsi `wakeAgent`.

---

*Dokumentasi ini telah diperbarui dan diverifikasi sesuai dengan implementasi aktif kode sumber repositori Threads-Agent-Amazon-Affiliate.*
