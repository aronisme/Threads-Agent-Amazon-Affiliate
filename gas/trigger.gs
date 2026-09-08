/**
 * =========================================================================
 * GOOGLE APPS SCRIPT (GAS) - MULTI-PROJECT CRON TRIGGER (5 MENIT)
 * Mengelola otomatisasi 3 proyek sekaligus dalam 1 trigger berkala
 * =========================================================================
 */

function triggerPublish() {
  var targets = [
    {
      name: 'Medsos Agent (Proyek 1 - Paused)',
      url: 'https://medsos-agent-backend.vercel.app/api/cron/publish',
      active: false // Set true jika ingin diaktifkan kembali
    },
    {
      name: 'Shopee Afflink (Proyek 2 - Aktif)',
      url: 'https://shopee-afflink.vercel.app/api/cron/publish',
      active: true
    },
    {
      name: 'Threads Amazon Affiliate (Proyek 3 - Aktif)',
      url: 'https://threads-agent-amazon-affiliate.vercel.app/api/cron/wake',
      secret: 'threads_agent_secret_cron_key_999', // Samakan dengan CRON_SECRET di Vercel
      active: true
    }
  ];

  targets.forEach(function(target) {
    if (target.active === false) {
      Logger.log('⏸️ [' + target.name + '] Dilewati (Status: Paused)');
      return;
    }

    try {
      var requestUrl = target.url;
      var headers = {
        'User-Agent': 'GoogleAppsScript-MultiCron/1.0'
      };

      // Tambahkan parameter secret & header jika target memiliki secret
      if (target.secret) {
        var separator = requestUrl.indexOf('?') !== -1 ? '&' : '?';
        requestUrl += separator + 'secret=' + encodeURIComponent(target.secret);
        headers['Authorization'] = 'Bearer ' + target.secret;
      }

      var startTime = new Date().getTime();
      var response = UrlFetchApp.fetch(requestUrl, {
        method: 'GET',
        headers: headers,
        muteHttpExceptions: true // Menjaga script tidak crash saat ada error 402/500
      });
      
      var code = response.getResponseCode();
      var body = response.getContentText();
      var duration = new Date().getTime() - startTime;
      var snippet = body.length > 200 ? body.substring(0, 200) + '...' : body;

      if (code >= 200 && code < 300) {
        // Coba ekstrak info aksi untuk Threads Agent
        var actionInfo = '';
        try {
          var parsed = JSON.parse(body);
          if (parsed.action) actionInfo = ' -> Aksi: ' + parsed.action;
          if (parsed.reason) actionInfo += ' (' + parsed.reason + ')';
        } catch (e) {}

        Logger.log('✅ [' + target.name + '] Status ' + code + ' (' + duration + 'ms): OK' + actionInfo);
      } else if (code === 402) {
        Logger.log('⏸️ [' + target.name + '] Status 402: Kuota Vercel habis / masih di-pause');
      } else if (code === 401) {
        Logger.log('🔒 [' + target.name + '] Status 401: Unauthorized (Cek CRON_SECRET)');
      } else {
        Logger.log('⚠️ [' + target.name + '] Status ' + code + ' (' + duration + 'ms): ' + snippet);
      }
    } catch (err) {
      Logger.log('❌ [' + target.name + '] Jaringan Error: ' + err.message);
    }
  });
}

/**
 * Jalankan fungsi ini SATU KALI dari editor Google Apps Script
 * untuk mengaktifkan trigger otomatis setiap 5 menit.
 */
function setupTriggerEvery5Minutes() {
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getHandlerFunction() === 'triggerPublish') {
      ScriptApp.deleteTrigger(allTriggers[i]);
    }
  }

  ScriptApp.newTrigger('triggerPublish')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('🚀 Trigger 5-Menit berhasil diaktifkan untuk semua proyek aktif!');
}

/**
 * Jalankan fungsi ini jika ingin mematikan trigger
 */
function disableTrigger() {
  var allTriggers = ScriptApp.getProjectTriggers();
  var count = 0;
  for (var i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getHandlerFunction() === 'triggerPublish') {
      ScriptApp.deleteTrigger(allTriggers[i]);
      count++;
    }
  }
  Logger.log('🛑 Berhasil menonaktifkan ' + count + ' trigger.');
}
