/**
 * =========================================================================
 * GOOGLE APPS SCRIPT (GAS) - 5-MINUTE AUTONOMOUS CRON TRIGGER
 * Threads AI Agent + Amazon Affiliate System
 * =========================================================================
 * 
 * PANDUAN PEMASANGAN CEPAT:
 * 1. Buka browser dan pergi ke: https://script.google.com
 * 2. Klik "New Project" / "Proyek Baru".
 * 3. Hapus kode default, lalu salin dan tempel (paste) seluruh isi file ini.
 * 4. Sesuaikan konstanta WEBHOOK_URL dan CRON_SECRET di bawah dengan domain Anda.
 * 5. Jalankan fungsi "setupTriggerEvery5Minutes" satu kali untuk mengaktifkan jadwal otomatis.
 * 6. Selesai! GAS akan memanggil agen Threads Anda secara stabil setiap 5 menit (gratis & 24/7).
 */

// ================= KONFIGURASI =================
const CONFIG = {
  // Ganti dengan URL deployment Vercel Anda
  WEBHOOK_URL: 'https://threads-autonomous-creator-agent.vercel.app/api/cron/wake',
  
  // Samakan dengan nilai CRON_SECRET di file .env.local atau Vercel Environment Variables
  CRON_SECRET: 'threads_agent_secret_cron_key_999',
  
  // Timeout request dalam milidetik (maksimal di GAS adalah 30000ms)
  TIMEOUT_MS: 15000,
};

/**
 * Fungsi utama yang dipanggil secara berkala oleh trigger GAS setiap 5 menit
 */
function triggerThreadsAgent() {
  const url = `${CONFIG.WEBHOOK_URL}?secret=${encodeURIComponent(CONFIG.CRON_SECRET)}`;
  
  const options = {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${CONFIG.CRON_SECRET}`,
      'User-Agent': 'GoogleAppsScript-ThreadsAgentCron/1.0',
    },
    muteHttpExceptions: true,
  };

  const startTime = new Date().getTime();
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    const duration = new Date().getTime() - startTime;

    if (responseCode >= 200 && responseCode < 300) {
      let data = {};
      try {
        data = JSON.parse(responseBody);
      } catch (e) {
        // Response non-JSON
      }

      const action = data.action || 'OK';
      Logger.log(`✅ [${responseCode}] Sukses (${duration}ms) - Aksi: ${action}`);
      if (data.reason) {
        Logger.log(`ℹ️ Detail: ${data.reason}`);
      }
    } else {
      Logger.log(`⚠️ [${responseCode}] Gagal dari server (${duration}ms): ${responseBody}`);
    }
  } catch (error) {
    Logger.log(`❌ Error koneksi fetch ke Vercel: ${error.toString()}`);
  }
}

/**
 * Jalankan fungsi ini SATU KALI saja dari editor Google Apps Script
 * untuk membuat trigger otomatis berjalan setiap 5 menit.
 */
function setupTriggerEvery5Minutes() {
  // Hapus trigger lama jika ada agar tidak duplikat
  const allTriggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getHandlerFunction() === 'triggerThreadsAgent') {
      ScriptApp.deleteTrigger(allTriggers[i]);
    }
  }

  // Buat trigger time-driven baru setiap 5 menit
  ScriptApp.newTrigger('triggerThreadsAgent')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('🚀 Trigger 5-Menit berhasil diaktifkan!');
  Logger.log('Agen Anda sekarang akan otomatis dipanggil setiap 5 menit oleh Google Apps Script.');
}

/**
 * Fungsi untuk menghentikan / menghapus trigger jika diperlukan
 */
function disableTrigger() {
  const allTriggers = ScriptApp.getProjectTriggers();
  let count = 0;
  for (let i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getHandlerFunction() === 'triggerThreadsAgent') {
      ScriptApp.deleteTrigger(allTriggers[i]);
      count++;
    }
  }
  Logger.log(`🛑 Berhasil menonaktifkan ${count} trigger.`);
}
