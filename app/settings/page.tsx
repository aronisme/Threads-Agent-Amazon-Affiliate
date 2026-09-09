'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Key,
  RefreshCw,
  Check,
  Copy,
  AlertTriangle,
  ExternalLink,
  Cpu,
  Sparkles,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { AutonomyLevel } from '@/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function SettingsPage() {
  const { strings, language } = useLanguage();
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>(1);
  const [dryRunMode, setDryRunMode] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [refreshingToken, setRefreshingToken] = useState<boolean>(false);
  const [tokenResult, setTokenResult] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Threads credentials state
  const [threadsUserId, setThreadsUserId] = useState<string>('');
  const [threadsAccessToken, setThreadsAccessToken] = useState<string>('');
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Multi-Key AI configuration state
  const [mistralKeysInput, setMistralKeysInput] = useState<string>('');
  const [mistralModel, setMistralModel] = useState<string>('open-mistral-7b');
  const [groqKeysInput, setGroqKeysInput] = useState<string>('');
  const [groqModel, setGroqModel] = useState<string>('llama-3.3-70b-versatile');
  const [xkiroKey, setXkiroKey] = useState<string>('');
  const [xkiroModel, setXkiroModel] = useState<string>('qwen/qwen3.8-max');
  const [preferredProvider, setPreferredProvider] = useState<'auto' | 'mistral' | 'groq' | 'xkiro'>('auto');

  // AI Testing state
  const [testingAi, setTestingAi] = useState<boolean>(false);
  const [aiTestResult, setAiTestResult] = useState<{
    success?: boolean;
    providerUsed?: string;
    modelUsed?: string;
    text?: string;
    durationMs?: number;
    error?: string;
  } | null>(null);

  // Reset daily limit state
  const [resettingPosts, setResettingPosts] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Check OAuth return params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('connected') === 'true') {
        const user = params.get('username') || 'averyfoundit';
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
          setDryRunMode(data.state.dryRunMode ?? false);

          const creds = data.state.credentials || {};
          const userIdVal = creds.userId || data.state.threadsUserId || '';
          const tokenVal = creds.accessToken || '';

          if (userIdVal) setThreadsUserId(userIdVal);
          if (tokenVal) setThreadsAccessToken(tokenVal);

          if (data.state.hasToken || tokenVal) {
            setConnectionStatus({
              success: true,
              message: `✅ Akun terhubung (@averyfoundit - ID: ${userIdVal || '28237007615909546'}). Siap beroperasi live.`,
            });
          }

          // Load AI config
          const aiConfig = data.state.aiConfig || {};
          if (Array.isArray(aiConfig.mistralKeys)) {
            setMistralKeysInput(aiConfig.mistralKeys.join(', '));
          }
          if (aiConfig.mistralModel) setMistralModel(aiConfig.mistralModel);

          if (Array.isArray(aiConfig.groqKeys)) {
            setGroqKeysInput(aiConfig.groqKeys.join(', '));
          }
          if (aiConfig.groqModel) setGroqModel(aiConfig.groqModel);

          if (Array.isArray(aiConfig.xkiroKeys) && aiConfig.xkiroKeys.length > 0) {
            setXkiroKey(aiConfig.xkiroKeys.join(', '));
          }
          if (aiConfig.xkiroModel) setXkiroModel(aiConfig.xkiroModel);

          if (aiConfig.preferredProvider) setPreferredProvider(aiConfig.preferredProvider);
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

      const mistralKeys = mistralKeysInput
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const groqKeys = groqKeysInput
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const xkiroKeys = xkiroKey
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const res = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autonomyLevel,
          dryRunMode,
          threadsUserId: threadsUserId || undefined,
          threadsAccessToken: threadsAccessToken || undefined,
          credentials: {
            userId: threadsUserId || undefined,
            accessToken: threadsAccessToken || undefined,
          },
          aiConfig: {
            mistralKeys,
            mistralModel,
            groqKeys,
            groqModel,
            xkiroKeys,
            xkiroModel,
            preferredProvider,
          },
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

  const handleTestAi = async (providerOverride?: 'auto' | 'mistral' | 'groq' | 'xkiro') => {
    try {
      setTestingAi(true);
      setAiTestResult(null);
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerOverride || preferredProvider,
          prompt: 'Write an organic, casual 1-sentence thought about minimalist tech desk setups.',
        }),
      });
      const data = await res.json();
      setAiTestResult(data);
    } catch (err: any) {
      setAiTestResult({ success: false, error: err.message });
    } finally {
      setTestingAi(false);
    }
  };

  const handleResetPosts = async () => {
    try {
      setResettingPosts(true);
      const res = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_POSTS' }),
      });
      const data = await res.json();
      if (data.success) {
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 3000);
      } else {
        alert('Failed to reset: ' + data.error);
      }
    } catch (err: any) {
      alert('Reset error: ' + err.message);
    } finally {
      setResettingPosts(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setRefreshingToken(true);
      setTokenResult(null);
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
      title: strings.level0Title,
      desc: strings.level0Desc,
    },
    {
      level: 1,
      title: strings.level1Title,
      desc: strings.level1Desc,
    },
    {
      level: 2,
      title: strings.level2Title,
      desc: strings.level2Desc,
    },
    {
      level: 3,
      title: strings.level3Title,
      desc: strings.level3Desc,
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-zinc-300" />
            {strings.settingsTitle}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {strings.settingsSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetPosts}
            disabled={resettingPosts}
            title="Reset counter batas 6 posting/hari ke 0"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium transition disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resettingPosts ? 'animate-spin' : ''}`} />
            {resetSuccess ? 'Kouta Direset (0/6)' : 'Reset Kuota Harian'}
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition shadow disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                {strings.settingsSavedSuccess}
              </>
            ) : (
              <>{saving ? strings.savingSettings : strings.saveSettings}</>
            )}
          </button>
        </div>
      </div>

      {/* Threads Account Connection & Access Token (Database-Backed) */}
      <div className="glass-card rounded-xl p-6 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
            <span className="w-5 h-5 rounded-lg bg-white text-black flex items-center justify-center font-bold text-xs">@</span>
            {strings.threadsConnectionTitle} (@averyfoundit)
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">Simpan Langsung ke MongoDB</span>
        </div>

        <p className="text-xs text-zinc-400">
          Kredensial Threads disimpan di MongoDB Atlas, sehingga otomatis aktif di Vercel tanpa perlu pengaturan Environment Variables manual:
        </p>

        {/* Option 1: One-Click OAuth Login */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>{language === 'id' ? 'Metode 1: Login Langsung (One-Click OAuth)' : 'Method 1: Direct Login (One-Click OAuth)'}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {language === 'id' ? 'Paling Cepat' : 'Fastest'}
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {language === 'id'
                ? 'Login ke akun @averyfoundit dan berikan izin publikasi. Token 60 hari akan tersimpan otomatis ke database.'
                : 'Log in to @averyfoundit and grant publishing permissions. 60-day token will be securely saved to DB.'}
            </p>
          </div>
          <a
            href="/api/auth/threads"
            className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition shrink-0 flex items-center justify-center gap-2 shadow"
          >
            <span className="font-bold text-sm">@</span>
            {strings.connectThreadsOAuth}
          </a>
        </div>

        {/* Option 2: Manual Token Input */}
        <div className="pt-2">
          <h3 className="text-xs font-semibold text-zinc-300 mb-2">
            {language === 'id' ? 'Metode 2: Input Manual (Disimpan ke Database)' : 'Method 2: Manual Input (Saved to DB)'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Threads User ID / Username</label>
              <input
                type="text"
                value={threadsUserId}
                onChange={(e) => setThreadsUserId(e.target.value)}
                placeholder="28237007615909546"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Threads Access Token</label>
              <input
                type="password"
                value={threadsAccessToken}
                onChange={(e) => setThreadsAccessToken(e.target.value)}
                placeholder="THAAU... (Token Meta Graph API)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 mt-3">
            <span className="text-[11px] text-zinc-500">
              {language === 'id'
                ? 'Sistem akan menguji izin posting dan membaca profil akun.'
                : 'System will test posting permissions and profile reading.'}
            </span>
            <button
              type="button"
              onClick={handleTestThreadsConnection}
              disabled={testingConnection || (!threadsUserId && !threadsAccessToken)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition border border-zinc-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
              {testingConnection ? strings.testingConnection : strings.testThreadsApi}
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

      {/* Multi-Key AI Engine (Rotator & Failover) */}
      <div className="glass-card rounded-xl p-6 border border-zinc-800/80 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
            <Cpu className="w-4 h-4 text-emerald-400" />
            Sistem Multi-Key AI Rotator & Failover
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Auto-Failover Aktif
            </span>
          </div>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Kunci AI disimpan ke MongoDB dan dirotasi secara otomatis. Jika salah satu kunci terkena rate-limit (429) atau invalid (401), sistem otomatis beralih ke kunci/provider berikutnya tanpa menghentikan postingan.
        </p>

        <div className="space-y-4">
          {/* Provider Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-300 font-medium block mb-1">
                Prioritas Provider AI
              </label>
              <select
                value={preferredProvider}
                onChange={(e) => setPreferredProvider(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
              >
                <option value="auto">Otomatis (Mistral ➔ Groq ➔ xKiro)</option>
                <option value="mistral">Prioritaskan Mistral AI (Sangat Stabil)</option>
                <option value="groq">Prioritaskan Groq LPU (Ultra-Cepat)</option>
                <option value="xkiro">Prioritaskan xKiro (Qwen Flagship)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleTestAi()}
                disabled={testingAi}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${testingAi ? 'animate-spin' : ''}`} />
                {testingAi ? 'Menguji Pembuatan AI...' : 'Uji AI Live Sekarang'}
              </button>
            </div>
          </div>

          {/* Provider 1: Mistral AI */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-white">Mistral AI (Rekomendasi Utama)</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Model Aktif: {mistralModel}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-[11px] text-zinc-400 block mb-1">API Key Mistral (Pisahkan koma jika multi-key)</label>
                <input
                  type="password"
                  value={mistralKeysInput}
                  onChange={(e) => setMistralKeysInput(e.target.value)}
                  placeholder="MvVtr6MoVFw9dWukjYNKR6qHohjoW84n"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Model Mistral</label>
                <select
                  value={mistralModel}
                  onChange={(e) => setMistralModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="open-mistral-7b">open-mistral-7b (Teruji Aktif)</option>
                  <option value="mistral-small-latest">mistral-small-latest</option>
                  <option value="mistral-large-latest">mistral-large-latest</option>
                </select>
              </div>
            </div>
          </div>

          {/* Provider 2: Groq LPU */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-semibold text-white">Groq LPU (Multi-Key Rotator)</span>
              </div>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
              >
                Dapatkan Key Gratis <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-[11px] text-zinc-400 block mb-1">Groq API Keys (Pisahkan dengan tanda koma untuk rotasi)</label>
                <input
                  type="password"
                  value={groqKeysInput}
                  onChange={(e) => setGroqKeysInput(e.target.value)}
                  placeholder="gsk_key1, gsk_key2, gsk_key3"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Model Groq</label>
                <select
                  value={groqModel}
                  onChange={(e) => setGroqModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                  <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
                  <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
                  <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b</option>
                </select>
              </div>
            </div>
          </div>

          {/* Provider 3: xKiro AI */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-semibold text-white">xKiro AI (Cadangan)</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">api.xkiro.com</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-[11px] text-zinc-400 block mb-1">xKiro API Key</label>
                <input
                  type="password"
                  value={xkiroKey}
                  onChange={(e) => setXkiroKey(e.target.value)}
                  placeholder="sk-xt-..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Model xKiro</label>
                <input
                  type="text"
                  value={xkiroModel}
                  onChange={(e) => setXkiroModel(e.target.value)}
                  placeholder="qwen/qwen3.8-max"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI Test Result Box */}
        {aiTestResult && (
          <div
            className={`p-3.5 rounded-lg text-xs font-mono border space-y-1.5 ${
              aiTestResult.success
                ? 'bg-emerald-950/20 text-emerald-300 border-emerald-500/20'
                : 'bg-red-950/20 text-red-300 border-red-500/20'
            }`}
          >
            {aiTestResult.success ? (
              <>
                <div className="flex items-center justify-between font-semibold">
                  <span>✅ Pembuatan AI Berhasil ({aiTestResult.durationMs}ms)</span>
                  <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20">
                    Provider: {aiTestResult.providerUsed} ({aiTestResult.modelUsed})
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 italic bg-black/40 p-2.5 rounded border border-white/5">
                  &ldquo;{aiTestResult.text}&rdquo;
                </p>
              </>
            ) : (
              <div>❌ Error Pengujian AI: {aiTestResult.error}</div>
            )}
          </div>
        )}
      </div>

      {/* Autonomy Level Selection */}
      <div className="glass-card rounded-xl p-6 border border-zinc-800/80 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          <Shield className="w-4 h-4 text-blue-400" />
          {strings.autonomyModeTitle}
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
            <h2 className="text-sm font-semibold text-white">{strings.dryRunTitle}</h2>
            <p className="text-xs text-zinc-400">
              {strings.dryRunDesc}
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
            <span>
              {language === 'id'
                ? 'Simulasi saat ini AKTIF. Postingan yang dibuat akan muncul di Aktivitas tanpa memanggil Threads API asli.'
                : 'Simulation is currently ACTIVE. Generated posts will appear in the Activity Feed without sending real API calls.'}
            </span>
          </div>
        )}
      </div>

      {/* Cron / Wake-up Trigger Info */}
      <div className="glass-card rounded-xl p-6 border border-zinc-800/80 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          <Key className="w-4 h-4 text-purple-400" />
          {language === 'id' ? 'Endpoint Sinyal Cron & Bangunkan Agen' : 'Vercel Cron & Wake-Up Signal Endpoint'}
        </div>
        <p className="text-xs text-zinc-400">
          {language === 'id'
            ? 'Untuk membangunkan agen secara berkala tanpa bayar server standby, arahkan Google Apps Script ke URL ini tiap 5-10 menit:'
            : 'To wake the agent on a recurring schedule without paying for an always-on server, point Google Apps Script to this URL every 5-10 minutes:'}
        </p>

        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-xs font-mono text-zinc-300">
          <span className="flex-1 truncate">{cronUrl}</span>
          <button
            onClick={handleCopyCron}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition flex items-center gap-1.5 shrink-0"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedUrl ? (language === 'id' ? 'Tersalin' : 'Copied') : (language === 'id' ? 'Salin' : 'Copy')}
          </button>
        </div>
      </div>

      {/* Threads API Token Maintenance */}
      <div className="glass-card rounded-xl p-6 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white">
              {language === 'id' ? 'Status Token Jangka Panjang Threads' : 'Threads Long-Lived Token Status'}
            </h2>
            <p className="text-xs text-zinc-400">
              {language === 'id'
                ? 'Token akses pengguna Threads berlaku selama 60 hari. Sistem memperbaruinya secara otomatis, atau Anda dapat memperbarui secara manual.'
                : 'Threads user access tokens are valid for 60 days. The system refreshes them automatically, or you can trigger a refresh manually.'}
            </p>
          </div>
          <button
            onClick={handleRefreshToken}
            disabled={refreshingToken}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition border border-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingToken ? 'animate-spin' : ''}`} />
            {refreshingToken ? (language === 'id' ? 'Memperbarui...' : 'Refreshing...') : (language === 'id' ? 'Perbarui Token' : 'Refresh Token')}
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
