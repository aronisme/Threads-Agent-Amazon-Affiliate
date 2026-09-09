# 🧵 Threads-Agent-Amazon-Affiliate

> **Autonomous AI Creator Agent for Meta Threads + Amazon Affiliate Monetization**  
> Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, MongoDB, Groq LPU Rotator, and Google Apps Script Trigger.

---

## 🌟 Key Features

- **Level 3 Fully Autonomous Creator**:
  - Independent posting, automatic delayed contextual self-replies, and 100% automated community conversation replies with inbound commercial intent harvesting.
- **Dual-Engine Architecture**:
  - **Social Engine**: Decides organic posting, everyday conversations, questions, and natural engagement cadence independently of products.
  - **Affiliate Engine**: Evaluates commercial intent score (0.0 to 1.0) and product relevance. Only introduces products when contextually natural.
- **High-Engagement Video Reel Priority (65%)**:
  - Media Decision Engine prioritizes Cloudinary MP4 video reels (65%) over photos and text to maximize scroll-stop attention on Threads.
  - Implements Least Recently Used (LRU) asset rotation to eliminate visual fatigue.
- **Native Meta Threads Insights API Integration**:
  - Direct live integration with Meta Graph API Insights reading real-time views, likes, replies, reposts, and follower counts via `/api/threads/insights`.
- **Contextual Disclosure Funnel**:
  - Top-level posts remain clean and focused on organic storytelling.
  - Delayed self-reply (2-minute delay) and inbound comment replies casually drop the Amazon link with compliant FTC disclosures.
- **Commercial Pressure & Budget Control**:
  - Daily weighted budget cap (Direct link: 1.0, Soft recommendation: 0.4, Mention: 0.15).
  - Dynamic cooldowns preventing feed spam and maintaining high authentic creator reputation.
- **FTC & Amazon Associates Dual-Layer Compliance**:
  - Account-level disclosure in profile bio: *"As an Amazon Associate I earn from qualifying purchases."*
  - Programmatic link-level disclosure injection (`(paid link)`) whenever affiliate links are rendered.
  - Strict anti-fake personal experience guardrails (curator/discovery voice).
- **Permanent $0 OPEX Architecture & GAS Optimization**:
  - Engineered for permanent zero-cost operation on Vercel Hobby + MongoDB Atlas Free Tier.
  - Fast-exit execution (`< 50ms`) for idle 5-minute cron pings from Google Apps Script.
- **Multi-Tier AI Engine with Failover**:
  - Multi-Key Groq Cloud LPU + Mistral 7B + xKiro API failover with round-robin key rotation and sub-second latency.
- **Chrome Extension Product Scraper Ingest**:
  - Direct authenticated endpoint (`/api/products/ingest`) with full CORS preflight support.
  - Automatically receives rich Amazon product metadata (ASIN, title, price, discount, rating, bullet points, media).
  - Out-of-stock guardrail (`active = !isOutOfStock`).
- **Cloudinary Automatic Media Rehosting**:
  - Direct buffer rehosting with desktop browser User-Agent to bypass Amazon CDN anti-bot HTTP 403 blocks.
  - Stores high-resolution images (`dwgfox722`/`lynke_app`) and videos (`drkbqpxqf`/`vidgram`) on Cloudinary.
- **Full UI Localization (🇮🇩 ID / 🇺🇸 EN)**:
  - Instant header language toggle switch with persistent local preference.
  - Complete natural Indonesian creator terminology across Dashboard, Vault, Persona, Activity, and Settings.
- **Modern Dashboard UI**:
  - Telemetry meters for Commercial Pressure, Mood, and Activity.
  - Interactive Persona configuration sliders (humor, sarcasm, warmth, slang, topics).
  - Product Vault manager with bulk pipe-separated import.

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
