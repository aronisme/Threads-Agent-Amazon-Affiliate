'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  Sparkles,
  Send,
  Package,
  Clock,
  Image as ImageIcon,
  Video,
  Type,
  Layers,
  Trash2,
  Edit3,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Film,
  Zap,
  Lightbulb,
  Check,
  MessageSquare,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type PostType = 'ORIGINAL_THOUGHT' | 'QUESTION' | 'STORY' | 'CONTEXTUAL_PRODUCT' | 'VIRAL_MEDIA';
type MediaType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL';
type MediaSource = 'product' | 'stock' | 'url';
type Action = 'PUBLISH_NOW' | 'SAVE_STOCK' | 'SCHEDULE';

interface StockPost {
  _id: string;
  text: string;
  type: string;
  mediaType: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  status: string;
  source: string;
  scheduledFor?: string;
  createdAt: string;
  productId?: any;
  mediaStockId?: any;
}

const POST_TYPES: { key: PostType; label: string; labelId: string; icon: any; color: string }[] = [
  { key: 'ORIGINAL_THOUGHT', label: 'Original Thought', labelId: 'Pemikiran Asli', icon: Zap, color: 'text-amber-400' },
  { key: 'QUESTION', label: 'Question', labelId: 'Pertanyaan', icon: FlaskConical, color: 'text-blue-400' },
  { key: 'STORY', label: 'Story', labelId: 'Cerita', icon: Edit3, color: 'text-purple-400' },
  { key: 'CONTEXTUAL_PRODUCT', label: 'Product Post', labelId: 'Post Produk', icon: Package, color: 'text-emerald-400' },
  { key: 'VIRAL_MEDIA', label: 'Viral Media', labelId: 'Media Viral', icon: Film, color: 'text-rose-400' },
];

const STYLE_CONFIG: Record<string, { label: string; labelId: string; color: string; badge: string; icon: any }> = {
  CASUAL: { label: 'Casual & Chill', labelId: 'Santai & Relate', color: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: MessageSquare },
  HOOK: { label: 'Punchy Hook', labelId: 'Hook Penasaran', color: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Zap },
  STORY: { label: 'Micro-Story', labelId: 'Cerita Pengalaman', color: 'text-violet-400', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/30', icon: Lightbulb },
  WITTY: { label: 'Witty & Sarcastic', labelId: 'Lucu & Witty', color: 'text-rose-400', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30', icon: Sparkles },
};

const GUIDANCE_CHIPS = [
  { label: '☕ Santai & Relate', labelEn: '☕ Casual & Chill', text: 'buat nada santai dan relate dengan keseharian' },
  { label: '⚡ Hook Penasaran', labelEn: '⚡ Curiosity Hook', text: 'fokus ke hook awal yang bikin penasaran dan scroll-stopping' },
  { label: '🎯 Solusi Masalah', labelEn: '🎯 Micro-problem', text: 'highlight solusi untuk masalah kecil sehari-hari yang sering bikin kesal' },
  { label: '🧹 Estetika Meja', labelEn: '🧹 Desk Aesthetic', text: 'fokus ke estetika meja kerja minimalis dan kerapian' },
  { label: '💬 Tanya Komunitas', labelEn: '💬 Ask Question', text: 'akhiri dengan pertanyaan santai yang memancing audiens untuk komen' },
  { label: '🎭 Lucu & Witty', labelEn: '🎭 Witty Humor', text: 'beri bumbu lelucon halus atau sarkasme santai tanpa berlebihan' },
];

export default function LabsPage() {
  const { language } = useLanguage();
  const isId = language === 'id';

  // Composer state
  const [postType, setPostType] = useState<PostType>('ORIGINAL_THOUGHT');
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('TEXT');
  const [mediaSource, setMediaSource] = useState<MediaSource>('product');
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedMediaStockId, setSelectedMediaStockId] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');

  // Data state
  const [products, setProducts] = useState<any[]>([]);
  const [mediaStock, setMediaStock] = useState<any[]>([]);
  const [stockPosts, setStockPosts] = useState<StockPost[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [mediaStockLoading, setMediaStockLoading] = useState(true);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [aiVisionInfo, setAiVisionInfo] = useState<any>(null);
  const [userGuidance, setUserGuidance] = useState('');
  const [captionVariations, setCaptionVariations] = useState<Array<{
    styleKey: string;
    styleLabel: string;
    styleLabelId: string;
    angle: string;
    caption: string;
  }>>([]);
  const [selectedVariationKey, setSelectedVariationKey] = useState<string | null>(null);

  // Fetch data
  const fetchProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) setProducts(data.products || []);
    } catch { } finally { setProductsLoading(false); }
  }, []);

  const fetchMediaStock = useCallback(async () => {
    try {
      setMediaStockLoading(true);
      const res = await fetch('/api/media-stock?limit=100');
      const data = await res.json();
      if (data.success) setMediaStock(data.items || []);
    } catch { } finally { setMediaStockLoading(false); }
  }, []);

  const fetchStockPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/lab/stock');
      const data = await res.json();
      if (data.success) setStockPosts(data.posts || []);
    } catch { }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchMediaStock();
    fetchStockPosts();
  }, [fetchProducts, fetchMediaStock, fetchStockPosts]);

  // Notify helper
  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  // Get selected product
  const selectedProduct = products.find((p) => p._id === selectedProductId);
  const selectedMedia = mediaStock.find((m) => m._id === selectedMediaStockId);

  // Resolve media URL for the post
  const resolveMediaUrl = (): { imageUrl?: string; imageUrls?: string[]; videoUrl?: string } => {
    if (mediaType === 'TEXT') return {};
    if (mediaSource === 'url') {
      if (mediaType === 'VIDEO') return { videoUrl: customUrl };
      return { imageUrl: customUrl };
    }
    if (mediaSource === 'product' && selectedProduct) {
      if (mediaType === 'VIDEO' && selectedProduct.videoUrl) return { videoUrl: selectedProduct.videoUrl };
      if (mediaType === 'CAROUSEL' && selectedProduct.images?.length >= 2) return { imageUrls: selectedProduct.images.slice(0, 5), imageUrl: selectedProduct.images[0] };
      if (mediaType === 'IMAGE') return { imageUrl: selectedImageUrl || selectedProduct.imageUrl || selectedProduct.images?.[0] };
    }
    if (mediaSource === 'stock' && selectedMedia) {
      return { videoUrl: selectedMedia.videoUrl };
    }
    if (selectedVideoUrl) return { videoUrl: selectedVideoUrl };
    if (selectedImageUrl) return { imageUrl: selectedImageUrl };
    if (selectedImageUrls.length > 0) return { imageUrls: selectedImageUrls, imageUrl: selectedImageUrls[0] };
    return {};
  };

  // Submit handler
  const handleSubmit = async (action: Action) => {
    if (!caption.trim()) {
      notify('error', isId ? 'Caption tidak boleh kosong!' : 'Caption is required!');
      return;
    }
    try {
      setSubmitting(true);
      const mediaUrls = resolveMediaUrl();
      const res = await fetch('/api/lab/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: caption,
          mediaType,
          ...mediaUrls,
          productId: selectedProductId || undefined,
          mediaStockId: selectedMediaStockId || undefined,
          postType,
          action,
          scheduledFor: action === 'SCHEDULE' ? scheduledFor : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const msgs: Record<string, Record<string, string>> = {
          PUBLISH_NOW: { en: '🚀 Published to Threads!', id: '🚀 Berhasil diposting ke Threads!' },
          SAVE_STOCK: { en: '📦 Saved to stock queue.', id: '📦 Tersimpan ke stok post.' },
          SCHEDULE: { en: '📅 Scheduled successfully!', id: '📅 Berhasil dijadwalkan!' },
        };
        notify('success', msgs[action]?.[language] || 'Done!');
        setCaption('');
        setSelectedImageUrl('');
        setSelectedVideoUrl('');
        setSelectedImageUrls([]);
        setCustomUrl('');
        setMediaType('TEXT');
        setSelectedProductId('');
        setSelectedMediaStockId('');
        setScheduledFor('');
        setAiVisionInfo(null);
        setCaptionVariations([]);
        setSelectedVariationKey(null);
        fetchStockPosts();
      } else {
        notify('error', data.error || 'Failed');
      }
    } catch (err: any) {
      notify('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // AI Caption generator with multi-style variations & user guidance
  const handleAiGenerate = async () => {
    try {
      setAiGenerating(true);
      setAiVisionInfo(null);
      const mediaUrls = resolveMediaUrl();
      const res = await fetch('/api/lab/ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId || undefined,
          mediaStockId: selectedMediaStockId || undefined,
          topic: postType === 'VIRAL_MEDIA' ? 'viral moment' : (selectedProduct?.category || ''),
          postType,
          imageUrl: mediaUrls.imageUrl,
          videoUrl: mediaUrls.videoUrl,
          userGuidance: userGuidance.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.variations && data.variations.length > 0) {
          setCaptionVariations(data.variations);
          setSelectedVariationKey(data.variations[0].styleKey);
          setCaption(data.variations[0].caption);
        } else {
          setCaption(data.caption);
        }
        if (data.visionUsed) {
          setAiVisionInfo(data.visionContext);
        }
        const optCount = data.variations?.length || 1;
        notify(
          'success',
          `✨ ${optCount} ${
            isId ? 'gaya caption siap!' : 'caption styles generated!'
          } (${data.provider} ${data.durationMs}ms)${data.visionUsed ? ' + Vision' : ''}${
            data.userGuidanceApplied ? (isId ? ' + Arahan User' : ' + Guided') : ''
          }`
        );
      } else {
        notify('error', data.error || 'AI generation failed');
      }
    } catch (err: any) {
      notify('error', err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  // Select variation
  const handleSelectVariation = (item: { styleKey: string; caption: string }) => {
    setSelectedVariationKey(item.styleKey);
    setCaption(item.caption);
  };

  // Stock post actions
  const handleStockAction = async (postId: string, action: 'PUBLISH' | 'DELETE' | 'EDIT', updatedText?: string) => {
    try {
      if (action === 'PUBLISH') setPublishingId(postId);
      const res = await fetch('/api/lab/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action, updatedText }),
      });
      const data = await res.json();
      if (data.success) {
        const msgs: Record<string, string> = {
          PUBLISH: isId ? '🚀 Stock post dipublish!' : '🚀 Stock post published!',
          DELETE: isId ? '🗑️ Dihapus dari stok.' : '🗑️ Removed from stock.',
          EDIT: isId ? '✏️ Caption diperbarui.' : '✏️ Caption updated.',
        };
        notify('success', msgs[action]);
        setEditingId(null);
        fetchStockPosts();
      } else {
        notify('error', data.error || 'Action failed');
      }
    } catch (err: any) {
      notify('error', err.message);
    } finally {
      setPublishingId(null);
    }
  };

  // Caption char analysis
  const charCount = caption.length;
  const charColor = charCount === 0 ? 'text-zinc-500' : charCount < 200 ? 'text-amber-400' : charCount <= 420 ? 'text-emerald-400' : charCount <= 480 ? 'text-amber-400' : 'text-rose-400';
  const charLabel = charCount === 0 ? '' : charCount < 200 ? (isId ? 'Terlalu pendek' : 'Too short') : charCount <= 420 ? (isId ? 'Ideal ✓' : 'Ideal ✓') : charCount <= 480 ? (isId ? 'Agak panjang' : 'A bit long') : (isId ? 'Terlalu panjang!' : 'Too long!');

  // Display media preview URL
  const previewUrl = selectedVideoUrl || selectedImageUrl || selectedImageUrls[0] || customUrl || '';
  const previewIsVideo = mediaType === 'VIDEO' || previewUrl.match(/\.(mp4|mov|webm)/i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <FlaskConical className="w-6 h-6 text-violet-400" />
            {isId ? 'Post Lab' : 'Post Lab'}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {isId
              ? 'Racik post secara manual — pilih produk, media, tulis caption, lalu posting langsung atau simpan ke stok.'
              : 'Manually craft posts — pick products, media, write captions, then publish now or save to stock.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-violet-500/15 text-violet-300 px-2 py-1 rounded-lg border border-violet-500/30">
            {isId ? 'Stok:' : 'Stock:'} {stockPosts.length}
          </span>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-2 animate-slide-in ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/40 text-rose-200'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {notification.msg}
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Layout: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT — Composer (3/5) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Post Type Selector */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3">
              {isId ? 'Tipe Post' : 'Post Type'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {POST_TYPES.map((pt) => {
                const Icon = pt.icon;
                const isActive = postType === pt.key;
                return (
                  <button
                    key={pt.key}
                    onClick={() => setPostType(pt.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-zinc-800 text-white border border-zinc-600 shadow-md'
                        : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? pt.color : ''}`} />
                    {isId ? pt.labelId : pt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Picker */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                {isId ? 'Produk (Opsional)' : 'Product (Optional)'}
              </h3>
              {selectedProduct && (
                <button
                  onClick={() => { setSelectedProductId(''); setSelectedImageUrl(''); setSelectedVideoUrl(''); }}
                  className="text-xs text-zinc-500 hover:text-rose-400 transition"
                >
                  {isId ? 'Hapus' : 'Clear'}
                </button>
              )}
            </div>

            {selectedProduct ? (
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                {(selectedProduct.imageUrl || selectedProduct.images?.[0]) && (
                  <img
                    src={selectedProduct.imageUrl || selectedProduct.images?.[0]}
                    alt={selectedProduct.name}
                    className="w-12 h-12 rounded-lg object-cover border border-zinc-700"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{selectedProduct.name}</p>
                  <p className="text-xs text-zinc-400">{selectedProduct.category} {selectedProduct.price ? `• ${selectedProduct.price}` : ''}</p>
                </div>
                <button
                  onClick={() => setShowProductPicker(true)}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  {isId ? 'Ganti' : 'Change'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowProductPicker(true)}
                className="w-full p-3 rounded-xl border border-dashed border-zinc-700 text-sm text-zinc-400 hover:border-violet-500/50 hover:text-violet-300 transition"
              >
                + {isId ? 'Pilih produk dari vault' : 'Pick a product from vault'}
              </button>
            )}

            {/* Product Picker Modal */}
            {showProductPicker && (
              <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowProductPicker(false)}>
                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[70vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2 bg-zinc-800/70 rounded-xl px-3 py-2">
                      <Search className="w-4 h-4 text-zinc-500" />
                      <input
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder={isId ? 'Cari produk...' : 'Search products...'}
                        className="bg-transparent text-sm text-white w-full outline-none placeholder:text-zinc-500"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[55vh] p-2">
                    {productsLoading ? (
                      <p className="text-center text-zinc-500 py-8 text-sm">Loading...</p>
                    ) : (
                      products
                        .filter((p: any) => !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase()) || p.category?.toLowerCase().includes(productSearch.toLowerCase()))
                        .map((p: any) => (
                          <button
                            key={p._id}
                            onClick={() => {
                              setSelectedProductId(p._id);
                              setShowProductPicker(false);
                              setProductSearch('');
                              // Auto-set first image if available
                              if (p.imageUrl || p.images?.[0]) {
                                setSelectedImageUrl(p.imageUrl || p.images[0]);
                              }
                              if (p.videoUrl) {
                                setSelectedVideoUrl(p.videoUrl);
                              }
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 transition text-left"
                          >
                            {(p.imageUrl || p.images?.[0]) && (
                              <img
                                src={p.imageUrl || p.images?.[0]}
                                alt={p.name}
                                className="w-10 h-10 rounded-lg object-cover border border-zinc-700 flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white truncate">{p.name}</p>
                              <p className="text-xs text-zinc-500">{p.category} {p.price ? `• ${p.price}` : ''}</p>
                            </div>
                            {p._id === selectedProductId && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                          </button>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Media Picker */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                {isId ? 'Media' : 'Media'}
              </h3>
              <div className="flex items-center gap-1">
                {(['TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL'] as MediaType[]).map((mt) => {
                  const icons: Record<MediaType, any> = { TEXT: Type, IMAGE: ImageIcon, VIDEO: Video, CAROUSEL: Layers };
                  const Icon = icons[mt];
                  return (
                    <button
                      key={mt}
                      onClick={() => {
                        setMediaType(mt);
                        if (mt === 'TEXT') { setSelectedImageUrl(''); setSelectedVideoUrl(''); setSelectedImageUrls([]); setCustomUrl(''); }
                      }}
                      className={`p-1.5 rounded-lg text-xs transition ${
                        mediaType === mt
                          ? 'bg-zinc-700 text-white'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                      }`}
                      title={mt}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {mediaType !== 'TEXT' && (
              <div className="space-y-3">
                {/* Media source tabs */}
                <div className="flex gap-1 bg-zinc-900/60 rounded-lg p-0.5">
                  {([
                    { key: 'product' as MediaSource, label: isId ? 'Dari Produk' : 'From Product', icon: Package },
                    { key: 'stock' as MediaSource, label: isId ? 'Dari Stok Media' : 'From Media Stock', icon: Film },
                    { key: 'url' as MediaSource, label: 'Custom URL', icon: Zap },
                  ]).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setMediaSource(s.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition ${
                        mediaSource === s.key
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <s.icon className="w-3 h-3" />
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Product media grid */}
                {mediaSource === 'product' && selectedProduct && (
                  <div className="space-y-2">
                    {selectedProduct.images?.length > 0 && (mediaType === 'IMAGE' || mediaType === 'CAROUSEL') && (
                      <div className="grid grid-cols-4 gap-2">
                        {selectedProduct.images.map((url: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (mediaType === 'CAROUSEL') {
                                setSelectedImageUrls((prev) =>
                                  prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url].slice(0, 5)
                                );
                              } else {
                                setSelectedImageUrl(url);
                              }
                            }}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                              (mediaType === 'CAROUSEL' ? selectedImageUrls.includes(url) : selectedImageUrl === url)
                                ? 'border-violet-500 ring-1 ring-violet-500/30'
                                : 'border-zinc-700 hover:border-zinc-500'
                            }`}
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            {mediaType === 'CAROUSEL' && selectedImageUrls.includes(url) && (
                              <span className="absolute top-1 right-1 bg-violet-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                {selectedImageUrls.indexOf(url) + 1}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedProduct.videoUrl && mediaType === 'VIDEO' && (
                      <div
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          selectedVideoUrl === selectedProduct.videoUrl
                            ? 'border-violet-500 bg-violet-500/10'
                            : 'border-zinc-700 hover:border-zinc-500'
                        }`}
                        onClick={() => setSelectedVideoUrl(selectedProduct.videoUrl)}
                      >
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-violet-400" />
                          <span className="text-xs text-zinc-300 truncate flex-1">{isId ? 'Video produk' : 'Product video'}</span>
                        </div>
                      </div>
                    )}
                    {!selectedProduct.images?.length && !selectedProduct.videoUrl && (
                      <p className="text-xs text-zinc-500 text-center py-4">{isId ? 'Produk tidak punya media.' : 'Product has no media.'}</p>
                    )}
                  </div>
                )}

                {mediaSource === 'product' && !selectedProduct && (
                  <p className="text-xs text-zinc-500 text-center py-4">{isId ? 'Pilih produk terlebih dahulu.' : 'Select a product first.'}</p>
                )}

                {/* Stock media list */}
                {mediaSource === 'stock' && (
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {mediaStockLoading ? (
                      <p className="text-xs text-zinc-500 text-center py-4">Loading...</p>
                    ) : mediaStock.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-4">{isId ? 'Belum ada stok media.' : 'No media stock available.'}</p>
                    ) : (
                      mediaStock.map((m: any) => (
                        <button
                          key={m._id}
                          onClick={() => {
                            setSelectedMediaStockId(m._id);
                            setSelectedVideoUrl(m.videoUrl);
                            setMediaType('VIDEO');
                          }}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition text-left ${
                            selectedMediaStockId === m._id
                              ? 'bg-violet-500/10 border border-violet-500/40'
                              : 'bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {m.thumbnailUrl && (
                            <img src={m.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-white truncate">{m.title}</p>
                            <p className="text-[10px] text-zinc-500">{m.category} • {isId ? 'Dipakai' : 'Used'} {m.timesUsed}x</p>
                          </div>
                          {selectedMediaStockId === m._id && <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Custom URL */}
                {mediaSource === 'url' && (
                  <input
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder={mediaType === 'VIDEO' ? 'https://... (MP4 / Video URL)' : 'https://... (Image URL)'}
                    className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-violet-500/50 transition"
                  />
                )}
              </div>
            )}
          </div>

          {/* AI Assistant & Creative Direction */}
          <div className="glass-card rounded-2xl p-5 border border-violet-500/20 bg-gradient-to-b from-violet-950/10 to-transparent">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs uppercase tracking-wider text-violet-300 font-semibold">
                  {isId ? 'Asisten AI & Arahan Khusus' : 'AI Assistant & Creative Direction'}
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
                {isId ? 'Multi-Gaya' : 'Multi-Style'}
              </span>
            </div>

            {/* User Guidance / Suggestions Input */}
            <div className="space-y-2 mb-3">
              <label className="text-xs text-zinc-400 flex items-center justify-between">
                <span>{isId ? 'Saran / Arahan untuk AI (Opsional):' : 'Custom Guidance / Direction for AI (Optional):'}</span>
                {userGuidance && (
                  <button
                    onClick={() => setUserGuidance('')}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 transition"
                  >
                    {isId ? 'Hapus' : 'Clear'}
                  </button>
                )}
              </label>
              <textarea
                value={userGuidance}
                onChange={(e) => setUserGuidance(e.target.value)}
                rows={2}
                placeholder={
                  isId
                    ? "Contoh: 'Fokus ke kerapian kabel setup', 'buat nada agak sarkas', 'tanyakan pendapat audiens di akhir'..."
                    : "e.g. 'Focus on clean cable routing', 'keep it slightly sarcastic', 'ask community opinion at the end'..."
                }
                className="w-full bg-zinc-800/60 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-violet-500/60 transition resize-none leading-relaxed"
              />

              {/* Quick Guidance Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {GUIDANCE_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setUserGuidance((prev) => {
                        const trimmed = prev.trim();
                        if (!trimmed) return chip.text;
                        if (trimmed.includes(chip.text)) return trimmed;
                        return `${trimmed}, ${chip.text}`;
                      });
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-violet-950/40 border border-zinc-700/60 hover:border-violet-500/40 text-zinc-300 hover:text-violet-200 transition"
                  >
                    {isId ? chip.label : chip.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Vision Info */}
            {aiVisionInfo && (
              <div className="mb-3 p-3 bg-violet-500/5 border border-violet-500/20 rounded-xl">
                <p className="text-[10px] uppercase text-violet-400 font-semibold mb-1 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Vision AI Analysis
                </p>
                <p className="text-xs text-zinc-300">{aiVisionInfo.summaryDescription}</p>
                {aiVisionInfo.keyVisualHooks?.length > 0 && (
                  <p className="text-[10px] text-zinc-500 mt-1">Hooks: {aiVisionInfo.keyVisualHooks.join(' • ')}</p>
                )}
              </div>
            )}

            {/* AI Generate Button */}
            <button
              onClick={handleAiGenerate}
              disabled={aiGenerating}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600/30 via-fuchsia-600/30 to-violet-600/30 border border-violet-500/40 text-violet-200 text-sm font-semibold hover:from-violet-600/40 hover:to-fuchsia-600/40 transition disabled:opacity-50 shadow-md shadow-violet-950/20"
            >
              {aiGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
                  {isId ? 'Menganalisis Media & Merancang 4 Gaya...' : 'Analyzing Media & Drafting 4 Styles...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  {isId
                    ? '✨ Generate 4 Opsi Gaya Caption (AI Multi-Style)'
                    : '✨ Generate 4 Caption Styles (AI Multi-Style)'}
                </>
              )}
            </button>
          </div>

          {/* Caption Style Variations Picker (When Available) */}
          {captionVariations.length > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-violet-500/30 bg-zinc-900/90">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span>🎨</span>
                    {isId ? 'Pilih Gaya Caption yang Kamu Sukai:' : 'Choose Your Preferred Caption Style:'}
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {isId
                      ? 'Klik kartu gaya di bawah untuk memuatnya ke editor caption:'
                      : 'Click any style card below to load it into the caption editor:'}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {captionVariations.length} {isId ? 'Opsi' : 'Options'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {captionVariations.map((v) => {
                  const cfg = STYLE_CONFIG[v.styleKey] || {
                    label: v.styleLabel,
                    labelId: v.styleLabelId,
                    color: 'text-violet-400',
                    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
                    icon: Sparkles,
                  };
                  const Icon = cfg.icon;
                  const isSelected = selectedVariationKey === v.styleKey;

                  return (
                    <div
                      key={v.styleKey}
                      onClick={() => handleSelectVariation(v)}
                      className={`relative p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between text-left ${
                        isSelected
                          ? 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30 shadow-lg shadow-violet-950/30'
                          : 'border-zinc-750 bg-zinc-800/40 hover:border-zinc-600 hover:bg-zinc-800/70'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${cfg.badge}`}
                          >
                            <Icon className="w-3 h-3" />
                            {isId ? cfg.labelId : cfg.label}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-semibold">
                              <Check className="w-3 h-3" /> {isId ? 'Aktif' : 'Active'}
                            </span>
                          )}
                        </div>
                        {v.angle && (
                          <p className="text-[11px] text-zinc-400 mb-2 italic">
                            &ldquo;{v.angle}&rdquo;
                          </p>
                        )}
                        <p className="text-xs text-zinc-200 leading-relaxed line-clamp-3">
                          {v.caption}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-500">
                        <span>{v.caption.length}/480 {isId ? 'karakter' : 'chars'}</span>
                        <span className={`font-medium ${isSelected ? 'text-violet-400' : 'text-zinc-400'}`}>
                          {isSelected ? (isId ? 'Sedang Digunakan' : 'In Editor') : (isId ? 'Klik untuk Pakai' : 'Click to Use')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Caption Editor */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" />
                {isId ? 'Editor Caption Threads' : 'Threads Caption Editor'}
              </h3>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono ${charColor}`}>
                  {charCount}/480 {charLabel}
                </span>
              </div>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              placeholder={isId ? 'Tulis atau edit caption post kamu di sini...' : 'Write or edit your post caption here...'}
              className="w-full bg-zinc-800/40 border border-zinc-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-violet-500/50 transition resize-none leading-relaxed"
              maxLength={600}
            />
          </div>

          {/* Schedule DateTime */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {isId ? 'Jadwalkan (Opsional)' : 'Schedule (Optional)'}
            </h3>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 transition [color-scheme:dark]"
            />
            {scheduledFor && (
              <p className="text-[10px] text-zinc-500 mt-2">
                {isId ? 'Post akan otomatis dipublish pada waktu yang dijadwalkan oleh cron agent.' : 'Post will be auto-published at the scheduled time by the agent cron.'}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleSubmit('PUBLISH_NOW')}
              disabled={submitting || !caption.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-semibold hover:from-emerald-500 hover:to-emerald-600 transition shadow-lg shadow-emerald-900/30 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
              {submitting ? (isId ? 'Memposting...' : 'Posting...') : (isId ? 'Post Sekarang' : 'Post Now')}
            </button>
            <button
              onClick={() => handleSubmit('SAVE_STOCK')}
              disabled={submitting || !caption.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-semibold hover:bg-zinc-750 hover:border-zinc-600 transition disabled:opacity-40"
            >
              <Package className="w-4 h-4" />
              {isId ? 'Simpan ke Stok' : 'Save to Stock'}
            </button>
            {scheduledFor && (
              <button
                onClick={() => handleSubmit('SCHEDULE')}
                disabled={submitting || !caption.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 text-blue-300 text-sm font-semibold hover:from-blue-600/30 hover:to-indigo-600/30 transition disabled:opacity-40"
              >
                <Calendar className="w-4 h-4" />
                {isId ? 'Jadwalkan' : 'Schedule'}
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — Preview & Stock Queue (2/5) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Live Preview */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-4 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {isId ? 'Preview Threads' : 'Threads Preview'}
            </h3>

            <div className="bg-black rounded-xl p-4 border border-zinc-800">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <img
                  src="/avatar.jpg"
                  alt="Avatar"
                  className="w-9 h-9 rounded-full object-cover border border-zinc-700"
                  onError={(e: any) => { e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23333" width="40" height="40" rx="20"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="16">A</text></svg>'; }}
                />
                <div>
                  <p className="text-sm font-semibold text-white">averyfoundit</p>
                  <p className="text-[10px] text-zinc-500">{isId ? 'Baru saja' : 'Just now'}</p>
                </div>
              </div>

              {/* Caption */}
              <p className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap mb-3">
                {caption || (
                  <span className="text-zinc-600 italic">{isId ? 'Tulis caption di kiri...' : 'Write a caption on the left...'}</span>
                )}
              </p>

              {/* Media Preview */}
              {previewUrl && (
                <div className="rounded-xl overflow-hidden border border-zinc-800 mb-2">
                  {previewIsVideo ? (
                    <video
                      src={previewUrl}
                      className="w-full max-h-64 object-cover bg-zinc-900"
                      controls
                      muted
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full max-h-64 object-cover bg-zinc-900"
                      onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                </div>
              )}

              {/* Carousel Preview */}
              {mediaType === 'CAROUSEL' && selectedImageUrls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedImageUrls.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-24 h-24 rounded-lg object-cover border border-zinc-700 flex-shrink-0" />
                  ))}
                </div>
              )}

              {/* Post type badge */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                  {postType.replace(/_/g, ' ')}
                </span>
                {mediaType !== 'TEXT' && (
                  <span className="text-[10px] bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded-full">
                    {mediaType}
                  </span>
                )}
                {selectedProduct && (
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                    🏷️ {selectedProduct.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stock Queue */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                {isId ? 'Stok Post Queue' : 'Stock Post Queue'}
              </h3>
              <button onClick={fetchStockPosts} className="text-zinc-500 hover:text-zinc-300 transition">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {stockPosts.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-8">
                {isId ? 'Belum ada stok post. Post yang disimpan akan muncul di sini.' : 'No stock posts yet. Saved posts will appear here.'}
              </p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {stockPosts.map((sp) => (
                  <div key={sp._id} className="bg-zinc-800/40 rounded-xl p-3.5 border border-zinc-800 hover:border-zinc-700 transition">
                    {/* Status badges */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        sp.status === 'SCHEDULED'
                          ? 'bg-blue-500/15 text-blue-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}>
                        {sp.status === 'SCHEDULED' ? `📅 ${new Date(sp.scheduledFor!).toLocaleString()}` : (isId ? 'MENUNGGU' : 'QUEUED')}
                      </span>
                      {sp.mediaType !== 'TEXT' && (
                        <span className="text-[10px] bg-violet-500/10 text-violet-300 px-1.5 py-0.5 rounded">
                          {sp.mediaType}
                        </span>
                      )}
                    </div>

                    {/* Text */}
                    {editingId === sp._id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-xs text-white outline-none resize-none"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleStockAction(sp._id, 'EDIT', editText)}
                            className="text-[10px] bg-emerald-600/20 text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-600/30"
                          >
                            {isId ? 'Simpan' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-[10px] bg-zinc-700/50 text-zinc-400 px-2 py-1 rounded-lg hover:bg-zinc-700"
                          >
                            {isId ? 'Batal' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-300 leading-relaxed mb-3 line-clamp-4">{sp.text}</p>
                    )}

                    {/* Actions */}
                    {editingId !== sp._id && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStockAction(sp._id, 'PUBLISH')}
                          disabled={publishingId === sp._id}
                          className="flex items-center gap-1 text-[10px] bg-emerald-600/20 text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-600/30 transition disabled:opacity-50"
                        >
                          {publishingId === sp._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          {isId ? 'Publish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => { setEditingId(sp._id); setEditText(sp.text); }}
                          className="flex items-center gap-1 text-[10px] bg-zinc-700/50 text-zinc-400 px-2 py-1 rounded-lg hover:bg-zinc-700 transition"
                        >
                          <Edit3 className="w-3 h-3" />
                          {isId ? 'Edit' : 'Edit'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(isId ? 'Hapus post ini dari stok?' : 'Delete this post from stock?')) {
                              handleStockAction(sp._id, 'DELETE');
                            }
                          }}
                          className="flex items-center gap-1 text-[10px] bg-rose-500/10 text-rose-400 px-2 py-1 rounded-lg hover:bg-rose-500/20 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
