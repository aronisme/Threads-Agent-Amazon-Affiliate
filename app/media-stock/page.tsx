'use client';

import { useState, useEffect } from 'react';
import {
  Film,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Play,
  Flame,
  Laugh,
  Coffee,
  Zap,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function MediaStockPage() {
  const { language } = useLanguage();
  const isId = language === 'id';

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [inspectedVisual, setInspectedVisual] = useState<any | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formCategory, setFormCategory] = useState('FUNNY');
  const [formNotes, setFormNotes] = useState('');
  const [formAutoVision, setFormAutoVision] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState<Record<string, boolean>>({});

  // Cleanup feedback
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any | null>(null);

  const categories = [
    { key: 'ALL', label: isId ? 'Semua Kategori' : 'All Categories', icon: Layers },
    { key: 'FUNNY', label: isId ? 'Lucu & Komedi' : 'Funny & Humor', icon: Laugh },
    { key: 'RELATABLE', label: isId ? 'Relatable / WFH' : 'Relatable / Daily', icon: Coffee },
    { key: 'AESTHETIC', label: isId ? 'Estetik & Cozy' : 'Aesthetic & Cozy', icon: Sparkles },
    { key: 'SATISFYING', label: isId ? 'Satisfying' : 'Satisfying', icon: Zap },
    { key: 'TECH_MEME', label: isId ? 'Tech & Gadget Meme' : 'Tech Memes', icon: Flame },
  ];

  const fetchStock = async () => {
    try {
      setLoading(true);
      const url =
        selectedCategory === 'ALL'
          ? '/api/media-stock'
          : `/api/media-stock?category=${selectedCategory}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load media stock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [selectedCategory]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formVideoUrl.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/media-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          videoUrl: formVideoUrl.trim(),
          category: formCategory,
          notes: formNotes.trim(),
          autoAnalyzeVision: formAutoVision,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFormTitle('');
        setFormVideoUrl('');
        setFormNotes('');
        setShowAddModal(false);
        await fetchStock();
      } else {
        alert(data.error || 'Failed to add video to Media Stock');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating media stock item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setItems((prev) =>
        prev.map((item) => (item._id === id ? { ...item, active: !currentStatus } : item))
      );

      await fetch(`/api/media-stock/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentStatus }),
      });
    } catch (err) {
      console.error('Failed to toggle status:', err);
      fetchStock();
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        isId
          ? 'Hapus video ini dari Stok Media dan bersihkan aset dari Cloudinary?'
          : 'Delete this video from Media Stock and purge asset from Cloudinary?'
      )
    ) {
      return;
    }

    try {
      setItems((prev) => prev.filter((item) => item._id !== id));
      await fetch(`/api/media-stock/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete item:', err);
      fetchStock();
    }
  };

  const handleAnalyzeVision = async (item: any) => {
    try {
      setAnalyzingIds((prev) => ({ ...prev, [item._id]: true }));
      const res = await fetch(`/api/media-stock/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reAnalyzeVision: true }),
      });
      const data = await res.json();
      if (data.success && data.item?.visualContext) {
        setItems((prev) =>
          prev.map((it) =>
            it._id === item._id ? { ...it, visualContext: data.item.visualContext } : it
          )
        );
        setInspectedVisual({
          name: item.title,
          visualContext: data.item.visualContext,
        });
      }
    } catch (err) {
      console.error('Vision analysis error:', err);
    } finally {
      setAnalyzingIds((prev) => ({ ...prev, [item._id]: false }));
    }
  };

  const handleTriggerCleanup = async () => {
    if (
      !confirm(
        isId
          ? 'Jalankan pembersihan aset Cloudinary kadaluarsa (>30 hari)?'
          : 'Trigger automated purge for Cloudinary assets older than 30 days?'
      )
    ) {
      return;
    }

    try {
      setCleaningUp(true);
      const res = await fetch('/api/cron/cleanup?days=30');
      const data = await res.json();
      if (data.success) {
        setCleanupResult(data.report);
        await fetchStock();
      } else {
        alert(data.error || 'Cleanup failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error running cleanup');
    } finally {
      setCleaningUp(false);
    }
  };

  const totalVideos = items.length;
  const activeVideos = items.filter((i) => i.active).length;
  const totalUsed = items.reduce((acc, cur) => acc + (cur.timesUsed || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-zinc-800">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
              <Film className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                {isId ? 'Stok Media Viral & Video Non-Afiliasi' : 'Media Stock Vault'}
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  v2.5 Organic Engine
                </span>
              </h1>
              <p className="text-xs text-zinc-400">
                {isId
                  ? 'Suplai stok video lucu, unik, dan relatable untuk konten organik Threads tanpa link afiliasi.'
                  : 'Curate viral, humor, and relatable videos for organic engagement posts without affiliate links.'}
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerCleanup}
            disabled={cleaningUp}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-zinc-700 transition"
            title={
              isId
                ? 'Hapus video & gambar usang dari Cloudinary (>30 hari)'
                : 'Clean up expired Cloudinary media (>30 days)'
            }
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cleaningUp ? 'animate-spin' : ''}`} />
            {cleaningUp ? (isId ? 'Membersihkan...' : 'Cleaning...') : isId ? 'Auto-Remove Cloudinary' : 'Prune Cloudinary'}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            {isId ? 'Tambah Video Stok' : 'Add Stock Video'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-zinc-800">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            {isId ? 'Total Stok Video' : 'Total Videos'}
          </span>
          <p className="text-2xl font-bold text-white mt-1">{totalVideos}</p>
        </div>
        <div className="glass-card p-4 rounded-xl border border-zinc-800">
          <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
            {isId ? 'Video Aktif' : 'Active Videos'}
          </span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeVideos}</p>
        </div>
        <div className="glass-card p-4 rounded-xl border border-zinc-800">
          <span className="text-[11px] font-medium text-purple-400 uppercase tracking-wider">
            {isId ? 'Frekuensi Dipakai' : 'Times Used in Posts'}
          </span>
          <p className="text-2xl font-bold text-purple-400 mt-1">{totalUsed}</p>
        </div>
        <div className="glass-card p-4 rounded-xl border border-zinc-800">
          <span className="text-[11px] font-medium text-pink-400 uppercase tracking-wider">
            {isId ? 'Pembersihan Media' : 'Cleanup Retention'}
          </span>
          <p className="text-sm font-semibold text-zinc-300 mt-2 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-pink-400" />
            30 Hari / $0 OPEX
          </p>
        </div>
      </div>

      {/* Cleanup Report Notification */}
      {cleanupResult && (
        <div className="glass-card p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs text-emerald-300 flex items-center justify-between">
          <div>
            <span className="font-semibold">🧹 {isId ? 'Laporan Pembersihan Cloudinary:' : 'Cloudinary Cleanup Report:'}</span>{' '}
            {cleanupResult.imagesDestroyed} {isId ? 'gambar' : 'images'} & {cleanupResult.videosDestroyed} {isId ? 'video dihapus' : 'videos purged'}. {cleanupResult.mediaStockPruned} {isId ? 'stok usang dipruning' : 'stale records pruned'}.
          </div>
          <button
            onClick={() => setCleanupResult(null)}
            className="text-zinc-400 hover:text-white ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border ${
                isActive
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300 shadow-sm'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="glass-card p-12 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center text-zinc-400">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mb-2" />
          <p className="text-sm">{isId ? 'Memuat stok media...' : 'Loading media stock...'}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center text-center">
          <Film className="w-12 h-12 text-zinc-600 mb-3" />
          <h3 className="text-base font-semibold text-white">
            {isId ? 'Belum Ada Stok Video di Kategori Ini' : 'No Videos Found'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-4">
            {isId
              ? 'Tambahkan video lucu atau relatable baru agar agen Threads dapat mempublikasikannya secara berkala.'
              : 'Add funny or relatable video URLs so your Threads agent can publish high-engagement viral clips.'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition"
          >
            <Plus className="w-4 h-4" />
            {isId ? 'Tambah Video Pertama' : 'Add First Video'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const isAnalyzing = Boolean(analyzingIds[item._id]);
            const hasVision = Boolean(item.visualContext?.aestheticStyle);

            return (
              <div
                key={item._id}
                className="glass-card rounded-2xl border border-zinc-800 overflow-hidden flex flex-col justify-between group hover:border-zinc-700 transition"
              >
                {/* Video Preview Container */}
                <div className="relative aspect-video bg-black/60 flex items-center justify-center overflow-hidden">
                  <video
                    src={item.videoUrl}
                    poster={item.thumbnailUrl || undefined}
                    controls
                    preload="metadata"
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-black/70 backdrop-blur-md text-white border border-white/10">
                    {item.category}
                  </span>
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-mono bg-purple-950/80 text-purple-300 border border-purple-500/30">
                    {isId ? `Dipakai ${item.timesUsed || 0}x` : `Used ${item.timesUsed || 0}x`}
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight line-clamp-2">
                      {item.title}
                    </h3>
                    {item.notes && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {item.notes}
                      </p>
                    )}

                    {/* AI Vision Metadata Badge */}
                    <div className="mt-3 pt-3 border-t border-zinc-800/80">
                      {hasVision ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-purple-400 font-medium flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              AI Vision Analyzed
                            </span>
                            <button
                              onClick={() =>
                                setInspectedVisual({
                                  name: item.title,
                                  visualContext: item.visualContext,
                                })
                              }
                              className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-0.5"
                            >
                              <Eye className="w-3 h-3" />
                              Detail
                            </button>
                          </div>
                          <p className="text-[11px] text-zinc-300 line-clamp-2 bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                            {item.visualContext.summaryDescription || item.visualContext.aestheticStyle}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500 text-[11px]">
                            {isId ? 'Belum dianalisis Vision' : 'No Vision context yet'}
                          </span>
                          <button
                            onClick={() => handleAnalyzeVision(item)}
                            disabled={isAnalyzing}
                            className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
                          >
                            <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                            {isAnalyzing ? (isId ? 'Menganalisis...' : 'Analyzing...') : isId ? 'Analisis AI' : 'Run Vision'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleActive(item._id, item.active)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition ${
                        item.active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      {item.active ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isId ? 'Aktif' : 'Active'}
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          {isId ? 'Nonaktif' : 'Paused'}
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(item._id)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title={isId ? 'Hapus Video' : 'Delete Video'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Video Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl border border-zinc-700 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-purple-400" />
                {isId ? 'Tambah Video Stok Non-Afiliasi' : 'Add Stock Video'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  {isId ? 'Judul / Deskripsi Singkat' : 'Title / Short Concept'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    isId
                      ? 'e.g. Kucing kaget liat kabel rapi di meja kerja'
                      : 'e.g. Cat gets confused by minimalist desk setup'
                  }
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  {isId ? 'URL Video MP4' : 'MP4 Video URL'} *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://res.cloudinary.com/... or direct https://...video.mp4"
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-mono text-[11px]"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  {isId
                    ? 'Jika URL berasal dari luar, sistem akan otomatis me-rehost ke Cloudinary.'
                    : 'External URLs will be automatically re-hosted to your Cloudinary storage.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    {isId ? 'Kategori' : 'Category'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="FUNNY">{isId ? 'Lucu / Komedi' : 'Funny / Humor'}</option>
                    <option value="RELATABLE">{isId ? 'Relatable / WFH' : 'Relatable / Daily'}</option>
                    <option value="AESTHETIC">{isId ? 'Estetik & Cozy' : 'Aesthetic & Cozy'}</option>
                    <option value="SATISFYING">{isId ? 'Satisfying' : 'Satisfying'}</option>
                    <option value="TECH_MEME">{isId ? 'Tech Meme' : 'Tech Meme'}</option>
                    <option value="GENERAL">{isId ? 'Umum' : 'General'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    {isId ? 'Auto AI Vision' : 'Auto AI Vision'}
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAutoVision}
                      onChange={(e) => setFormAutoVision(e.target.checked)}
                      className="rounded border-zinc-700 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs text-zinc-300">
                      {isId ? 'Analisis Otomatis' : 'Analyze on Save'}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  {isId ? 'Catatan / Punchline (Opsional)' : 'Notes / Punchline (Optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isId
                      ? 'Beri catatan humor atau poin penting yang harus diperhatikan AI...'
                      : 'Add notes about the joke or punchline...'
                  }
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition"
                >
                  {isId ? 'Batal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {submitting ? (isId ? 'Menyimpan...' : 'Saving...') : isId ? 'Simpan ke Stok' : 'Save to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visual Context Inspection Modal */}
      {inspectedVisual && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl border border-zinc-700 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                {inspectedVisual.name} - AI Vision Insight
              </h3>
              <button
                onClick={() => setInspectedVisual(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-purple-400 block mb-0.5">
                  Aesthetic Style & Atmosphere:
                </span>
                <p className="text-zinc-300 bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                  {inspectedVisual.visualContext?.aestheticStyle || 'N/A'}
                </p>
              </div>

              <div>
                <span className="font-semibold text-pink-400 block mb-0.5">
                  Summary / What Happens:
                </span>
                <p className="text-zinc-300 bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                  {inspectedVisual.visualContext?.summaryDescription || 'N/A'}
                </p>
              </div>

              <div>
                <span className="font-semibold text-emerald-400 block mb-0.5">
                  Visual Hooks & Punchlines:
                </span>
                <ul className="list-disc list-inside text-zinc-300 bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800 space-y-1">
                  {Array.isArray(inspectedVisual.visualContext?.keyVisualHooks) &&
                    inspectedVisual.visualContext.keyVisualHooks.map((h: string, idx: number) => (
                      <li key={idx}>{h}</li>
                    ))}
                </ul>
              </div>

              <div className="text-[11px] text-zinc-500 pt-2 flex items-center justify-between">
                <span>Model: {inspectedVisual.visualContext?.modelUsed || 'Heuristic Fallback'}</span>
                <span>Provider: {inspectedVisual.visualContext?.provider || 'Native'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
