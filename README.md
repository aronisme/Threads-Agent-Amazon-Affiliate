# 🧵 Threads-Agent-Amazon-Affiliate

> **Autonomous AI Creator Agent for Meta Threads + Amazon Affiliate Monetization**  
> Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, MongoDB, Groq LPU Rotator, and Google Apps Script Trigger.

---

## 🌟 Key Features

- **Level 3 Fully Autonomous Creator**:
  - Independent posting, automatic delayed contextual self-replies, and 100% automated community conversation replies with inbound commercial intent harvesting.
- **⚡ High-Frequency Posting Cadence (14 Post/Hari)**:
  - Batas posting harian hingga 14 postingan/hari dengan *human-like random jitter* (jeda 25–45 menit).
  - Jeda rekomendasi produk dipersingkat menjadi 60 menit dengan alokasi commercial budget hingga 7.5/hari.
  - Distribusi konten tertarget: ~48% rekomendasi produk (+link affiliate), ~25% video viral stok media, ~17% opini kurator, ~10% pertanyaan interaktif.
- **💬 Deep Community Reply Scanner (7 Hari / 20 Thread Konten)**:
  - Memindai 20 postingan utama teratas dalam rentang 7 hari terakhir untuk mendeteksi komentar baru audiens secara menyeluruh.
  - Memfilter komentar internal (`SELF_REPLY`) agar tidak memboroskan kuota pemindaian, dilengkapi proteksi anti-duplikasi antrean reply.
- **🚀 Meta Threads Media Container Protocol (Form-URL-Encoded)**:
  - Mengirim parameter pembuatan container media (`IMAGE`, `VIDEO`, `CAROUSEL`, dan carousel items) dalam format `application/x-www-form-urlencoded` (`URLSearchParams`).
  - Mencegah *Error Subcode 2207052* pada crawler Meta dan mendukung waktu tunggu transcoding video hingga 40 detik dengan `maxDuration = 60` di Vercel.
- **✂️ Smart Sentence Trimmer (Quality Gate Guard)**:
  - Secara otomatis memotong teks ke batas akhir kalimat terdekat sebelum 480 karakter jika AI sedikit melampaui limit 500 karakter Threads, memastikan draf berkualitas tinggi tetap ter-publish tanpa terbuang ke status DRAFT.
- **Dual-Engine Architecture**:
  - **Social Engine**: Decides organic posting, everyday conversations, questions, and natural engagement cadence independently of products.
  - **Affiliate Engine**: Evaluates commercial intent score (0.0 to 1.0) and product relevance. Only introduces products when contextually natural.
- **📡 Radar Tren Viral AS (Google Trends & Reddit Feeds)**:
  - 100% aman anti-banned tanpa API key pihak ketiga. Menarik tren harian AS dari Google Trends RSS, Google News Tech US, dan komunitas Reddit US (*r/battlestations*, *r/gadgets*, *r/Workspaces*).
  - Agen otomatis memprioritaskan topik hangat ini agar konten selalu relevan dengan audiens target Amerika Serikat.
- **🎬 Stok Media Viral & Autonomous AI Vision**:
  - Vault media video non-afiliasi untuk konten viral, relatable moments, meme teknologi, dan aesthetic hooks.
  - Video otomatis ditonton dan dianalisis oleh AI Vision multimodal (*Mistral Pixtral / Qwen-VL*) untuk menghasilkan judul, kategori, dan deskripsi visual secara otonom.
- **🧩 Universal Web Video Sniffer & Floating Export Button**:
  - Ekstensi Chrome/Brave otomatis mendeteksi video di halaman web mana pun (Threads, TikTok, Twitter/X, Reddit, Instagram, RedNote/Xiaohongshu).
  - Menyematkan tombol melayang **`🚀 Export ke Stok`** di sudut kanan atas setiap video web untuk ekspor 1-klik langsung ke Vercel Cloud.
  - **Resolusi Streaming Blob & MediaSource**: Mengekstrak direct MP4 stream asli dari tag JSON/script (`__INITIAL_STATE__`), resource timing entries, dan `chrome.webRequest` background sniffer.
- **🛡️ Sistem Anti-Duplikat Berlapis (Client & Server Side)**:
  - Memverifikasi URL video murni dan link postingan sumber sebelum upload.
  - Mencegah ekspor berulang dan menghemat 100% kuota Cloudinary serta token AI Vision.
  - Tombol pada video otomatis berubah menjadi **`✅ Sudah di Stok`** (hijau) jika video sudah tersimpan.
- **⏱️ Batas Durasi Video Maksimal 90 Detik**:
  - Mencegah video panjang (> 1.5 menit) yang dapat memboroskan kuota atau menyebabkan timeout serverless Vercel.
  - Proteksi otomatis pada tombol sudut video, popup ekstensi, dan endpoint backend.
- **🔐 Keamanan Login & Proteksi Dashboard**:
  - Sistem autentikasi berbasis session cookie HTTP-only untuk melindungi dashboard dari akses publik.
  - Whitelist aman untuk panggilan cron Google Apps Script dan ekspor ekstensi browser.
- **High-Engagement Video Reel Priority (65%)**:
  - Media Decision Engine memprioritaskan video MP4 Cloudinary (65%) dibanding gambar/teks untuk memaksimalkan retensi audiens Threads.
  - Menerapkan rotasi aset Least Recently Used (LRU) untuk mencegah kejenuhan visual.
- **Native Meta Threads Insights API Integration**:
  - Terhubung langsung dengan Meta Graph API Insights untuk metrik live views, likes, replies, reposts, dan follower count.
- **Contextual Disclosure Funnel**:
  - Postingan utama tetap bersih dan fokus pada cerita organik.
  - Tautan afiliasi diselipkan secara santun pada delayed self-reply (jeda 2 menit) atau balasan komentar dengan kepatuhan FTC (`#ad`).
- **Commercial Pressure & Budget Control**:
  - Batas anggaran harian tertimbang (Direct link: 1.0, Soft recommendation: 0.4, Mention: 0.15) dengan cooldown dinamis.
- **Cloudinary Automatic Media Rehosting**:
  - Re-hosting otomatis media eksternal ke CDN Cloudinary dengan desktop User-Agent untuk mencegah blokir HTTP 403.
- **Full UI Localization (🇮🇩 ID / 🇺🇸 EN)**:
  - Toggle bahasa instan di header dashboard dengan persistensi lokal.
- **Modern Dashboard UI**:
  - Telemetri meter Commercial Pressure, Mood, Activity, Radar Tren AS, Persona Sliders, dan Product Vault.

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/aronisme/Threads-Agent-Amazon-Affiliate.git
cd Threads-Agent-Amazon-Affiliate
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your keys:
- `GROQ_API_KEYS`: Comma-separated Groq API keys (`gsk_...`).
- `CRON_SECRET`: Secret token protecting the `/api/cron/wake` endpoint.
- `MONGODB_URI`: (Optional) MongoDB Atlas URI. If omitted, in-memory fallback will be used automatically.
- `THREADS_USER_ID` & `THREADS_ACCESS_TOKEN`: Meta Threads API credentials (or keep `DRY_RUN=true` for local simulation).

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

---

## ⏰ Google Apps Script (GAS) 5-Minute Trigger Setup

To run the agent 24/7 without paid cron services:
1. Open [Google Apps Script](https://script.google.com) and create a new project.
2. Copy the code from [`gas/trigger.gs`](./gas/trigger.gs) into the script editor.
3. Update `WEBHOOK_URL` to your Vercel deployment URL (`https://your-app.vercel.app/api/cron/wake`) and verify `CRON_SECRET`.
4. Run `setupTriggerEvery5Minutes` once.
5. The agent will run smoothly every 5 minutes 24/7!

---

## 📜 License
MIT License.
