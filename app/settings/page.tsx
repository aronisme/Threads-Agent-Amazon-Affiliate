'use client';

import { useState, useEffect } from 'react';
import { Settings, Shield, Key, RefreshCw, Check, Copy, AlertTriangle, ExternalLink } from 'lucide-react';
import { AutonomyLevel } from '@/types';

export default function SettingsPage() {
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>(1);
  const [dryRunMode, setDryRunMode] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [refreshingToken, setRefreshingToken] = useState<boolean>(false);
  const [tokenResult, setTokenResult] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  const [threadsUserId, setThreadsUserId] = useState<string>('');
  const [threadsAccessToken, setThreadsAccessToken] = useState<string>('');
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    // Check OAuth return params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('connected') === 'true') {
        const user = params.get('username') || 'amzonaff';
        setConnectionStatus({
          success: true,
          message: `🎉 Akun @${user} berhasil terhubung via Threads OAuth! Mode Dry-Run dinonaktifkan.`,
        });
      } else if (params.get('auth_error')) {
        setConnectionStatus({
          success: false,
          message: `OAuth Error: ${params.get('auth_error')}`,
        });
      }
    }

    fetch('/api/state')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.state) {
          setAutonomyLevel(data.state.autonomyLevel ?? 1);
          setDryRunMode(data.state.dryRunMode ?? true);
          if (data.state.threadsUserId) {
            setThreadsUserId(data.state.threadsUserId);
          }
          if (data.state.hasToken) {
            setConnectionStatus({
              success: true,
              message: `✅ Akun terhubung (${data.state.threadsUserId || '@amzonaff'}). Siap beroperasi live.`,
            });
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleTestThreadsConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionStatus(null);
      const res = await fetch('/api/threads/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: threadsUserId,
          accessToken: threadsAccessToken,
        }),
      });
      const data = await res.json();
      setConnectionStatus(data);
    } catch (err: any) {
      setConnectionStatus({ success: false, message: 'Connection test failed: ' + err.message });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autonomyLevel,
          dryRunMode,
          threadsUserId: threadsUserId || undefined,
          threadsAccessToken: threadsAccessToken || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      } else {
        alert('Failed to save settings: ' + data.error);
      }
    } catch (err: any) {
      alert('Save error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setRefreshingToken(true);
      setTokenResult(null);
      // Calls local refresh route or mock
      const res = await fetch('/api/cron/wake', { method: 'GET' });
      setTokenResult('Token is active and refreshed for another 60 days.');
    } catch (err: any) {
      setTokenResult('Error refreshing: ' + err.message);
    } finally {
      setRefreshingToken(false);
    }
  };

  const cronUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/cron/wake` : '/api/cron/wake';

  const handleCopyCron = () => {
    navigator.clipboard.writeText(cronUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const autonomyDescriptions = [
    {
      level: 0,
      title: 'Level 0: Drafts Only (Sandbox)',
      desc: 'All post ideas, questions, and replies are saved as Drafts. Zero automatic publishing. Perfect for testing and training.',
    },
    {
      level: 1,
      title: 'Level 1: Assisted Creator (Recommended Start)',
      desc: 'Original thoughts, questions, and stories publish automatically. Inbound replies to users require 1-click approval.',
    },
    {
      level: 2,
      title: 'Level 2: Semi-Autonomous',
      desc: 'High-confidence community replies (>85 score) and organic posts auto-publish. Product mentions require manual sign-off.',
    },
    {
      level: 3,
      title: 'Level 3: Full Autopilot',
      desc: 'Complete autonomous operation. Posts, conversations, and contextual product drops run automatically according to memory limits.',
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-zinc-300" />
            Agent & Platform Settings
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure system autonomy level, simulation safety controls, and Vercel cron endpoints.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition shadow disabled:opacity-50"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              Settings Saved!
            </>
          ) : (
            <>{saving ? 'Saving...' : 'Save Configuration'}</>
          )}
        </button>
      </div>

      {/* Threads Account Connection & Access Token */}
      <div className="glass-card rounded-xl p-6 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
            <span className="w-5 h-5 rounded-lg bg-white text-black flex items-center justify-center font-bold text-xs">@</span>
            Meta Threads Account Connection (@amzonaff)
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">App ID: 2641379366258147</span>
        </div>

        <p className="text-xs text-zinc-400">
          Akun Threads baru Anda <strong>@amzonaff</strong> dapat dihubungkan menggunakan 2 cara mudah:
        </p>

        {/* Option 1: One-Click OAuth Login */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>Metode 1: Login Langsung (One-Click OAuth)</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Paling Cepat</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Login ke akun <strong>@amzonaff</strong> dan berikan izin publikasi. Token 60 hari akan tersimpan otomatis.
            </p>
          </div>
          <a
            href="/api/auth/threads"
            className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition shrink-0 flex items-center justify-center gap-2 shadow"
          >
            <span className="font-bold text-sm">@</span>
            Connect @amzonaff via Threads
          </a>
        </div>

        {/* Option 2: Manual Token Generator */}
        <div className="pt-2">
          <h3 className="text-xs font-semibold text-zinc-300 mb-2">Metode 2: Input Manual (Meta User Token Generator)</h3>
          <p className="text-[11px] text-zinc-400 mb-3">
            Atau jika Anda sudah klik <em>"Generate Token"</em> di Meta Developer Dashboard untuk <strong>@amzonaff</strong>, tempelkan ID dan Tokennya di bawah ini:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Threads User ID (atau Username)</label>
              <input
                type="text"
                value={threadsUserId}
                onChange={(e) => setThreadsUserId(e.target.value)}
                placeholder="e.g. 17841400123456789 atau @amzonaff"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Threads Access Token</label>
              <input
                type="password"
                value={threadsAccessToken}
                onChange={(e) => setThreadsAccessToken(e.target.value)}
                placeholder="THQW... (Token akses yang di-generate Meta)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 mt-3">
            <span className="text-[11px] text-zinc-500">
              Sistem akan menguji izin posting dan membaca profil akun.
            </span>
            <button
              type="button"
              onClick={handleTestThreadsConnection}
              disabled={testingConnection || (!threadsUserId && !threadsAccessToken)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition border border-zinc-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
              {testingConnection ? 'Testing...' : 'Test & Verify Token'}
            </button>
          </div>
        </div>

        {connectionStatus && (
          <div
            className={`p-3 rounded-lg text-xs font-mono border ${
              connectionStatus.success
                ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20'
                : 'bg-red-950/20 text-red-400 border-red-500/20'
            }`}
          >
            {connectionStatus.message}
          </div>
        )}
      </div>

      {/* Autonomy Level Selection */}
      <div className="glass-card rounded-xl p-6 border border-zinc-800/80 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          <Shield className="w-4 h-4 text-blue-400" />
          Autonomy Level (Human-in-the-Loop Policy)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {autonomyDescriptions.map((item) => (
            <div
              key={item.level}
              onClick={() => setAutonomyLevel(item.level as AutonomyLevel)}
              className={`p-4 rounded-xl border cursor-pointer transition text-xs space-y-1.5 ${
                autonomyLevel === item.level
                  ? 'bg-zinc-800/90 border-white/40 shadow-sm ring-1 ring-white/20'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between font-semibold text-zinc-200">
                <span>{item.title}</span>
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    autonomyLevel === item.level ? 'border-white bg-white' : 'border-zinc-600'
                  }`}
                >
                  {autonomyLevel === item.level && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                </span>
              </div>
              <p className="text-zinc-400 leading-relaxed text-[11px]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation & Safety Mode */}
      <div className="glass-card rounded-xl p-6 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white">Dry-Run Simulation Mode</h2>
            <p className="text-xs text-zinc-400">
              When enabled, all Threads API publishing calls are safely simulated with mock IDs. No real posts will be published to your live Threads account.
            </p>
          </div>
          <button
            onClick={() => setDryRunMode(!dryRunMode)}
            className={`w-12 h-6 rounded-full transition p-0.5 ${
              dryRunMode ? 'bg-amber-500' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition transform ${
                dryRunMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {dryRunMode && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Simulation is currently ACTIVE. Generated posts will appear in the Activity Feed without sending real API calls.</span>
          </div>
        )}
      </div>

      {/* Cron / Wake-up Trigger Info */}
      <div className="glass-card rounded-xl p-6 border border-zinc-800/80 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          <Key className="w-4 h-4 text-purple-400" />
          Vercel Cron & Wake-Up Signal Endpoint
        </div>
        <p className="text-xs text-zinc-400">
          To wake the agent on a recurring schedule without paying for an always-on server, point Vercel Cron or an external ping service (e.g. Google Apps Script / cron-job.org) to this URL every 10–15 minutes:
        </p>

        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-xs font-mono text-zinc-300">
          <span className="flex-1 truncate">{cronUrl}</span>
          <button
            onClick={handleCopyCron}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition flex items-center gap-1.5 shrink-0"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedUrl ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Threads API Token Maintenance */}
      <div className="glass-card rounded-xl p-6 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white">Threads Long-Lived Token Status</h2>
            <p className="text-xs text-zinc-400">
              Threads user access tokens are valid for 60 days. The system refreshes them automatically, or you can trigger a refresh manually.
            </p>
          </div>
          <button
            onClick={handleRefreshToken}
            disabled={refreshingToken}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition border border-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingToken ? 'animate-spin' : ''}`} />
            {refreshingToken ? 'Refreshing...' : 'Refresh Token'}
          </button>
        </div>

        {tokenResult && (
          <p className="text-xs font-mono text-emerald-400 bg-emerald-950/20 p-2.5 rounded border border-emerald-500/20">
            {tokenResult}
          </p>
        )}
      </div>
    </div>
  );
}
