'use client';

import { useState, useEffect } from 'react';
import { Activity, Play, CheckCircle2, XCircle, Edit3, MessageSquare, RotateCw, Sparkles, Filter } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function ActivitySimulationPage() {
  const { strings, language } = useLanguage();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Simulation Sandbox state
  const [simText, setSimText] = useState('');
  const [simAuthor, setSimAuthor] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Edit post state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts?status=${filterStatus}&limit=40`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [filterStatus]);

  const handleApprove = async (postId: string, textOverride?: string) => {
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          postId,
          updatedText: textOverride,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingPostId(null);
        await fetchPosts();
      } else {
        alert('Approval failed: ' + data.error);
      }
    } catch (err: any) {
      alert('Error approving post: ' + err.message);
    }
  };

  const handleReject = async (postId: string) => {
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', postId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchPosts();
      }
    } catch (err: any) {
      console.error('Failed to reject:', err);
    }
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simText.trim()) return;

    try {
      setSimulating(true);
      const res = await fetch('/api/agent/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incomingText: simText,
          authorUsername: simAuthor || 'thread_user',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSimResult(data.execution?.result);
        await fetchPosts();
      } else {
        alert('Simulation error: ' + data.error);
      }
    } catch (err: any) {
      alert('Simulation failed: ' + err.message);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Activity className="w-6 h-6 text-zinc-300" />
          {strings.activityTitle}
        </h1>
        <p className="text-xs text-zinc-400 mt-1 max-w-xl">
          {strings.activitySubtitle}
        </p>
      </div>

      {/* Simulation Sandbox Card */}
      <div className="glass-card rounded-xl p-5 border border-zinc-800/80 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          <Sparkles className="w-4 h-4 text-purple-400" />
          {strings.simulatorTitle}
        </div>
        <p className="text-xs text-zinc-400">
          {language === 'id'
            ? 'Tempel komentar atau utas nyata untuk melihat bagaimana kepribadian dan memori agen merespons:'
            : "Paste any real comment or thread to test how the agent's persona and memory engine would respond:"}
        </p>

        <form onSubmit={handleRunSimulation} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">
              {language === 'id' ? 'Username Penulis' : 'Author Username'}
            </label>
            <input
              type="text"
              value={simAuthor}
              onChange={(e) => setSimAuthor(e.target.value)}
              placeholder="e.g. tech_reviewer_99"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] text-zinc-400 block mb-1">
              {language === 'id' ? 'Teks Utas / Komentar *' : 'Thread / Comment Text *'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                placeholder={strings.simTextPlaceholder}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                required
              />
              <button
                type="submit"
                disabled={simulating || !simText.trim()}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap shadow"
              >
                {simulating ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {simulating ? strings.simulating : strings.btnSimulate}
              </button>
            </div>
          </div>
        </form>

        {simResult && (
          <div className="bg-purple-950/20 border border-purple-500/30 rounded-lg p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between text-purple-400 font-semibold">
              <span className="flex items-center gap-1.5">
                {language === 'id' ? 'Respons Dihasilkan' : 'Response Generated'} ({simResult.replyClass})
              </span>
              <span className="text-[11px] font-mono">Score: {simResult.qualityScore || 90}/100</span>
            </div>
            <p className="text-zinc-200 italic font-sans text-sm">"{simResult.text}"</p>
          </div>
        )}
      </div>

      {/* Activity Filter & Feed */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              {language === 'id' ? `Log Aksi Agen (${posts.length})` : `Agent Action Logs (${posts.length})`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {[
              { key: 'ALL', label: strings.filterAll },
              { key: 'DRAFT', label: strings.filterDraft },
              { key: 'PUBLISHED', label: strings.filterPublished },
              { key: 'REJECTED', label: strings.filterRejected },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1 rounded-lg transition font-medium ${
                  filterStatus === tab.key
                    ? 'bg-white text-black font-semibold'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
            <RotateCw className="w-5 h-5 animate-spin" />
            {language === 'id' ? 'Memuat riwayat aksi...' : 'Loading action history...'}
          </div>
        ) : posts.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center text-zinc-500 text-xs">
            {strings.emptyActivity}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post._id} className="glass-card rounded-xl p-5 border border-zinc-800/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {post.type}
                    </span>
                    {post.replyClass && (
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {post.replyClass}
                      </span>
                    )}
                    {post.simulationData?.fitScore !== undefined && (
                      <span className="text-[11px] font-mono text-zinc-400">
                        Fit Score: {post.simulationData.fitScore}/100
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        post.status === 'PUBLISHED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : post.status === 'REJECTED'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {post.status}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Content Box (Editable if drafting) */}
                {editingPostId === post._id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                    />
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        onClick={() => setEditingPostId(null)}
                        className="px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:text-white"
                      >
                        {strings.cancel}
                      </button>
                      <button
                        onClick={() => handleApprove(post._id, editText)}
                        className="px-3 py-1 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-500"
                      >
                        {strings.btnSaveEdit}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-200 leading-relaxed font-sans">{post.text}</p>
                )}

                {/* Why Reasoning Bar */}
                {post.simulationData?.reasoning && (
                  <div className="bg-black/40 px-3 py-2 rounded-lg border border-zinc-800/80 text-[11px] text-zinc-400 font-mono flex items-start gap-2">
                    <span className="text-zinc-500 font-semibold uppercase shrink-0">WHY:</span>
                    <span>{post.simulationData.reasoning}</span>
                  </div>
                )}

                {/* Post Actions for Drafts */}
                {post.status === 'DRAFT' && editingPostId !== post._id && (
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800/60 text-xs">
                    <button
                      onClick={() => {
                        setEditingPostId(post._id);
                        setEditText(post.text);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {strings.btnEdit}
                    </button>
                    <button
                      onClick={() => handleReject(post._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/40 text-red-400 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {strings.btnReject}
                    </button>
                    <button
                      onClick={() => handleApprove(post._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {language === 'id' ? 'Setujui & Terbitkan' : 'Approve & Publish'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
