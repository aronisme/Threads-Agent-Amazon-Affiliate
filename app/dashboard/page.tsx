'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Zap,
  RotateCw,
  MessageCircle,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Compass,
  Power,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function DashboardPage() {
  const { strings, language } = useLanguage();
  const [state, setState] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastActionOutput, setLastActionOutput] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [stateRes, postsRes, productsRes] = await Promise.all([
        fetch('/api/state').then((r) => r.json()),
        fetch('/api/posts?limit=8').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
      ]);

      if (stateRes.success) setState(stateRes.state);
      if (postsRes.success) setPosts(postsRes.posts);
      if (productsRes.success) setProductsCount(productsRes.products?.length || 0);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRunCycle = async () => {
    try {
      setActionLoading('cycle');
      const res = await fetch('/api/agent/cycle', { method: 'POST' });
      const data = await res.json();
      setLastActionOutput(data);
      await fetchDashboardData();
    } catch (err: any) {
      alert('Error running cycle: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompose = async () => {
    try {
      setActionLoading('compose');
      const res = await fetch('/api/agent/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setLastActionOutput(data);
      await fetchDashboardData();
    } catch (err: any) {
      alert('Error composing post: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDiscover = async () => {
    try {
      setActionLoading('discover');
      const res = await fetch('/api/agent/discover', { method: 'POST' });
      const data = await res.json();
      setLastActionOutput(data);
      await fetchDashboardData();
    } catch (err: any) {
      alert('Error discovering topics: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePause = async () => {
    try {
      setActionLoading('togglePause');
      const newPaused = !state?.isPaused;
      const res = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaused: newPaused }),
      });
      const data = await res.json();
      if (data.success) {
        setState((prev: any) => ({ ...prev, isPaused: newPaused }));
      }
    } catch (err: any) {
      alert('Error toggling pause state: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getMoodBadge = (mood: string) => {
    switch (mood) {
      case 'CURIOUS':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'SARCASTIC':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CONTEMPLATIVE':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'CHILL':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'HELPFUL':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const getAutonomyBadge = (lvl: number) => {
    switch (lvl) {
      case 0:
        return { label: strings.level0Title, color: 'text-zinc-400 border-zinc-700 bg-zinc-800/40' };
      case 1:
        return { label: strings.level1Title, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' };
      case 2:
        return { label: strings.level2Title, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
      case 3:
        return { label: strings.level3Title, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' };
      default:
        return { label: `${strings.autonomyLevel} ${lvl}`, color: 'text-zinc-400' };
    }
  };

  if (loading && !state) {
    return (
      <div className="py-24 text-center">
        <RotateCw className="w-8 h-8 animate-spin mx-auto text-zinc-500 mb-3" />
        <p className="text-sm text-zinc-400">{language === 'id' ? 'Memuat Status Otak Agen...' : 'Loading Agent Brain State...'}</p>
      </div>
    );
  }

  const autonomy = getAutonomyBadge(state?.autonomyLevel ?? 1);

  return (
    <div className="space-y-8">
      {/* Top Banner / Hero */}
      <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-start md:items-center gap-4 relative z-10">
          <div className="relative shrink-0">
            <img
              src={state?.persona?.avatarUrl || '/avatar.jpg'}
              alt={state?.persona?.identityName || 'Avery'}
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border-2 border-zinc-700 shadow-xl shadow-black/40"
              onError={(e: any) => {
                e.currentTarget.src = '/avatar.jpg';
              }}
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-zinc-900 shadow-sm" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
                {language === 'id' ? 'Kreator Terhubung' : 'Creator Live'}
              </span>
              <span className="text-xs font-mono text-zinc-300">@averyfoundit</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs border font-medium ${autonomy.color}`}>
                {autonomy.label}
              </span>
              {state?.dryRunMode && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {strings.statusDryRun}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              {state?.persona?.identityName || 'Avery'} • {strings.brandName}
            </h1>
            <p className="text-zinc-400 text-sm max-w-2xl">
              {state?.persona?.tagline ||
                (language === 'id'
                  ? 'Menemukan hal-hal kecil untuk mempercantik meja kerja, tech sehari-hari & ngopi ☕✨'
                  : 'finding the little things that make everyday life, desk setups & coffee runs better ☕✨')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2.5 relative z-10">
          {/* Master Kill-Switch / Pause Toggle */}
          <button
            onClick={handleTogglePause}
            disabled={actionLoading !== null}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition border disabled:opacity-50 shadow-md ${
              state?.isPaused
                ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30 ring-1 ring-red-500/30'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25 ring-1 ring-emerald-500/30'
            }`}
            title={state?.isPaused ? strings.resumeAgentBtn : strings.pauseAgentBtn}
          >
            <Power className={`w-3.5 h-3.5 ${state?.isPaused ? 'text-red-400' : 'text-emerald-400'}`} />
            {state?.isPaused ? strings.agentPaused : strings.agentRunning}
          </button>

          <button
            onClick={handleRunCycle}
            disabled={actionLoading !== null || state?.isPaused}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition disabled:opacity-50 shadow-md"
          >
            <Zap className={`w-3.5 h-3.5 ${actionLoading === 'cycle' ? 'animate-spin' : ''}`} />
            {actionLoading === 'cycle' ? strings.runningCycle : strings.runCycle}
          </button>
          <button
            onClick={handleCompose}
            disabled={actionLoading !== null || state?.isPaused}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 text-white font-medium text-xs hover:bg-zinc-700 transition border border-zinc-700 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            {actionLoading === 'compose' ? strings.composingPost : strings.composePost}
          </button>
          <button
            onClick={handleDiscover}
            disabled={actionLoading !== null || state?.isPaused}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 text-white font-medium text-xs hover:bg-zinc-700 transition border border-zinc-700 disabled:opacity-50"
          >
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            {actionLoading === 'discover' ? strings.discoveringTopics : strings.discoverTopics}
          </button>
        </div>
      </div>

      {/* Paused Warning Banner */}
      {state?.isPaused && (
        <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-xl text-xs text-red-300 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>
              {language === 'id'
                ? 'Agen saat ini DINONAKTIFKAN (JEDA). Seluruh siklus cron otomatis dan postingan dibekukan sementara.'
                : 'Agent is currently PAUSED. All automated cron cycles and postings are temporarily frozen.'}
            </span>
          </div>
          <button
            onClick={handleTogglePause}
            className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-xs transition shrink-0"
          >
            {strings.resumeAgentBtn}
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="glass-card rounded-xl p-4 border border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">{strings.agentMood}</span>
            <Sparkles className="w-4 h-4 text-zinc-500" />
          </div>
          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border ${getMoodBadge(state?.currentMood)}`}>
            {state?.currentMood || 'CURIOUS'}
          </span>
        </div>

        <div className="glass-card rounded-xl p-4 border border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">{language === 'id' ? 'Tekanan Komersial' : 'Commercial Pressure'}</span>
            <span className="text-[10px] font-mono text-zinc-500">
              {Math.round((state?.commercialPressureScore || 0) * 100)}%
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (state?.commercialPressureScore || 0) > 0.7
                    ? 'bg-rose-500'
                    : (state?.commercialPressureScore || 0) > 0.4
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.round((state?.commercialPressureScore || 0) * 100))}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-400">
              {(state?.commercialPressureScore || 0) < 0.4
                ? (language === 'id' ? '🟢 Organik & Santai' : '🟢 Organic & Relaxed')
                : (state?.commercialPressureScore || 0) < 0.7
                ? (language === 'id' ? '🟡 Komersial Sedang' : '🟡 Moderate Commercial')
                : (language === 'id' ? '🔴 Jenuh (Dibatasi)' : '🔴 Saturated (Throttled)')}
            </p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">{strings.commercialBudget}</span>
            <Package className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-xl font-bold text-white">
            {state?.commercialBudget?.currentSpent?.toFixed(2) || '0.00'}{' '}
            <span className="text-xs text-zinc-500 font-normal">/ {state?.commercialBudget?.dailyLimit || '4.0'} {language === 'id' ? 'poin' : 'pts'}</span>
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            {language === 'id' ? 'Langsung: 1.0 | Halus: 0.4 | Sebutan: 0.15' : 'Direct: 1.0 | Soft: 0.4 | Mention: 0.15'}
          </p>
        </div>

        <div className="glass-card rounded-xl p-4 border border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">{strings.dailyMetrics}</span>
            <Layers className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-xl font-bold text-white">
            {state?.dailyActions?.postsCount || 0}{' '}
            <span className="text-xs text-zinc-500 font-normal">{language === 'id' ? 'post' : 'posts'}</span> • {state?.dailyActions?.repliesCount || 0}{' '}
            <span className="text-xs text-zinc-500 font-normal">{language === 'id' ? 'balasan' : 'replies'}</span>
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            {state?.dailyActions?.productMentionsCount || 0} {language === 'id' ? 'sentuhan produk' : 'product touches'}
          </p>
        </div>

        <div className="glass-card rounded-xl p-4 border border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">{language === 'id' ? 'Siklus 5-Menit Terakhir' : 'Last 5-Min Cycle'}</span>
            <Zap className="w-4 h-4 text-zinc-500" />
          </div>
          <span
            className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
              state?.lastAction?.action === 'POST'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : state?.lastAction?.action === 'REPLY'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {state?.lastAction?.action || 'IDLE'}
          </span>
          <p className="text-[10px] text-zinc-400 truncate mt-1.5" title={state?.lastAction?.summary || 'No recent activity'}>
            {state?.lastAction?.summary || (language === 'id' ? 'Menunggu ping GAS berikutnya...' : 'Awaiting next GAS ping...')}
          </p>
        </div>
      </div>

      {/* Action Feedback Banner (if user clicked an action) */}
      {lastActionOutput && (
        <div className="glass-card rounded-xl p-4 border border-blue-500/30 bg-blue-950/20 text-xs text-zinc-200">
          <div className="flex items-center justify-between font-semibold text-blue-400 mb-1">
            <span>{strings.lastActionLog}</span>
            <button onClick={() => setLastActionOutput(null)} className="text-zinc-400 hover:text-white">
              ✕
            </button>
          </div>
          <pre className="overflow-x-auto text-[11px] text-zinc-300 font-mono bg-black/40 p-2.5 rounded-lg">
            {JSON.stringify(lastActionOutput, null, 2)}
          </pre>
        </div>
      )}

      {/* Grid: Recent Thoughts & Active Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Posts on Threads */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">{strings.recentThreads}</h2>
            <Link href="/activity" className="text-xs text-zinc-400 hover:text-white transition">
              {language === 'id' ? 'Lihat Semua Aktivitas →' : 'View All Activity →'}
            </Link>
          </div>

          <div className="space-y-3">
            {posts.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-zinc-500 text-sm">
                {strings.noPostsYet}
              </div>
            ) : (
              posts.map((post) => (
                <div key={post._id} className="glass-card-interactive rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {post.type}
                      </span>
                      {post.replyClass && (
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {post.replyClass}
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        post.status === 'PUBLISHED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : post.status === 'REJECTED'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-200 leading-relaxed font-sans">{post.text}</p>

                  {post.simulationData?.reasoning && (
                    <div className="text-[11px] text-zinc-400 bg-black/30 p-2 rounded border border-zinc-800/60 font-mono">
                      WHY: {post.simulationData.reasoning}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                    <span>{new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {post.threadsId && (
                      <span className="flex items-center gap-1 text-zinc-400">
                        ID: {post.threadsId.substring(0, 10)}...
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Topics on Agent's Mind & Memory */}
        <div className="space-y-6">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold tracking-wide text-zinc-300 uppercase flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              {language === 'id' ? 'Topik Utama Aktif' : 'Active Niche Topics'}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(state?.persona?.nicheTopics || []).map((topic: string) => (
                <span
                  key={topic}
                  className="px-2.5 py-1 rounded-lg text-xs bg-zinc-800/80 text-zinc-300 border border-zinc-700/80"
                >
                  #{topic}
                </span>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold tracking-wide text-zinc-300 uppercase">
              {language === 'id' ? 'Memori Anti-Repetisi' : 'Anti-Repetition Memory'}
            </h3>
            <p className="text-xs text-zinc-400">
              {language === 'id'
                ? 'Agen menghindari mengulang topik/sudut pandang diskusi berikut:'
                : 'The agent avoids repeating these recent discussion hooks:'}
            </p>
            <div className="space-y-1.5">
              {(state?.recentTopics || []).slice(0, 6).map((t: string, idx: number) => (
                <div key={idx} className="text-xs text-zinc-300 bg-zinc-900/60 px-2.5 py-1.5 rounded border border-zinc-800/80 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  <span className="truncate">{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold tracking-wide text-zinc-300 uppercase">
              {strings.navProducts}
            </h3>
            <p className="text-xs text-zinc-400">
              {productsCount > 0
                ? (language === 'id'
                    ? `${productsCount} produk tersimpan di Vault sebagai wawasan pasif agen.`
                    : `${productsCount} products available in the Vault as natural background knowledge.`)
                : (language === 'id'
                    ? 'Vault masih kosong. Tambahkan produk Amazon untuk memperkaya konteks agen.'
                    : 'Vault is empty. Add your Amazon products to provide context.')}
            </p>
            <Link
              href="/products"
              className="inline-block w-full text-center px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition border border-zinc-700"
            >
              {language === 'id' ? 'Buka Vault Produk →' : 'Open Product Vault →'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
