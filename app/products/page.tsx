'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Upload,
  ExternalLink,
  RotateCw,
  Eye,
  Image as ImageIcon,
  Video as VideoIcon,
  Sparkles,
  Info,
} from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkText, setBulkText] = useState('');
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Single product form state
  const [singleName, setSingleName] = useState('');
  const [singleUrl, setSingleUrl] = useState('');
  const [singleCategory, setSingleCategory] = useState('');
  const [singleNotes, setSingleNotes] = useState('');
  const [singleImageUrl, setSingleImageUrl] = useState('');
  const [singleVideoUrl, setSingleVideoUrl] = useState('');
  const [showSingleModal, setShowSingleModal] = useState(false);

  // Vision inspection state
  const [analyzingIds, setAnalyzingIds] = useState<Record<string, boolean>>({});
  const [inspectedVisual, setInspectedVisual] = useState<any | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    try {
      setSubmittingBulk(true);
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulkText }),
      });
      const data = await res.json();
      if (data.success) {
        setBulkText('');
        await fetchProducts();
        alert(`Successfully imported ${data.count} products into Vault!`);
      } else {
        alert('Import failed: ' + data.error);
      }
    } catch (err: any) {
      alert('Error importing: ' + err.message);
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleSingleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim() || !singleUrl.trim()) {
      alert('Product Name and Affiliate Link are required');
      return;
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: singleName,
          affiliateUrl: singleUrl,
          category: singleCategory || 'general',
          notes: singleNotes,
          imageUrl: singleImageUrl.trim() || undefined,
          videoUrl: singleVideoUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSingleName('');
        setSingleUrl('');
        setSingleCategory('');
        setSingleNotes('');
        setSingleImageUrl('');
        setSingleVideoUrl('');
        setShowSingleModal(false);
        await fetchProducts();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleAnalyzeVision = async (product: any) => {
    const imageUrl = product.imageUrl;
    if (!imageUrl) {
      alert('Please add an Image URL to this product first.');
      return;
    }

    setAnalyzingIds((prev) => ({ ...prev, [product._id]: true }));
    try {
      const res = await fetch('/api/products/analyze-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product._id,
          imageUrl: product.imageUrl,
          productName: product.name,
          category: product.category,
          notes: product.notes,
        }),
      });

      const data = await res.json();
      if (data.success && data.visualContext) {
        setProducts((prev) =>
          prev.map((p) => (p._id === product._id ? { ...p, visualContext: data.visualContext } : p))
        );
        setInspectedVisual({
          productName: product.name,
          ...data.visualContext,
        });
      } else {
        alert('Vision analysis failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Failed to analyze image: ' + err.message);
    } finally {
      setAnalyzingIds((prev) => ({ ...prev, [product._id]: false }));
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.map((p) => (p._id === id ? { ...p, active: !currentStatus } : p)));
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this product from the knowledge vault?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.filter((p) => p._id !== id));
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Package className="w-6 h-6 text-zinc-300" />
            Product Knowledge & AI Vision Vault
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
            Autonomous creator background knowledge. Products are learned via multi-provider AI Vision (Groq, xKiro,
            Mistral) and woven organically into stealth Threads discussions with rich media.
          </p>
        </div>

        <button
          onClick={() => setShowSingleModal(!showSingleModal)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition shadow"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Single Product
        </button>
      </div>

      {/* Visual Context Inspection Modal */}
      {inspectedVisual && (
        <div className="glass-card rounded-xl p-5 border border-indigo-500/40 bg-indigo-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">
                AI Vision Knowledge: {inspectedVisual.productName}
              </h2>
            </div>
            <button
              onClick={() => setInspectedVisual(null)}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-800 rounded"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block mb-1 font-medium">Aesthetic & Vibe</span>
              <p className="text-zinc-200 font-medium">{inspectedVisual.aestheticStyle}</p>
            </div>
            <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block mb-1 font-medium">Dominant Colors</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {inspectedVisual.dominantColors?.map((c: string, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px]">
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block mb-1 font-medium">Form & Scale</span>
              <p className="text-zinc-200 font-medium">{inspectedVisual.scaleAndForm}</p>
            </div>
            <div className="md:col-span-2 bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block mb-1 font-medium">Key Visual Hooks (Tangible Details)</span>
              <ul className="list-disc list-inside text-zinc-300 space-y-1">
                {inspectedVisual.keyVisualHooks?.map((hook: string, idx: number) => (
                  <li key={idx}>{hook}</li>
                ))}
              </ul>
            </div>
            <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 flex flex-col justify-between">
              <div>
                <span className="text-zinc-500 block mb-1 font-medium">Provider & Model</span>
                <span className="inline-block px-2 py-0.5 rounded font-mono text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {inspectedVisual.provider?.toUpperCase()} • {inspectedVisual.modelUsed}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-2">
                Learned on: {new Date(inspectedVisual.analyzedAt || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Single Product Modal/Drawer */}
      {showSingleModal && (
        <div className="glass-card rounded-xl p-5 border border-zinc-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Add Product to Knowledge Vault</h2>
            <button onClick={() => setShowSingleModal(false)} className="text-xs text-zinc-400 hover:text-white">
              Cancel
            </button>
          </div>

          <form onSubmit={handleSingleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Product Name *</label>
              <input
                type="text"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                placeholder="e.g. Anker 735 GaN 65W Charger"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Amazon Affiliate Link *</label>
              <input
                type="text"
                value={singleUrl}
                onChange={(e) => setSingleUrl(e.target.value)}
                placeholder="e.g. https://amzn.to/3xyz123"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Niche / Category</label>
              <input
                type="text"
                value={singleCategory}
                onChange={(e) => setSingleCategory(e.target.value)}
                placeholder="e.g. travel tech, desk setup, ergonomics"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Notes / Why You Like It</label>
              <input
                type="text"
                value={singleNotes}
                onChange={(e) => setSingleNotes(e.target.value)}
                placeholder="e.g. compact size, charges both phone and laptop simultaneously"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Image URL (Optional for Photo Posts)</label>
              <input
                type="text"
                value={singleImageUrl}
                onChange={(e) => setSingleImageUrl(e.target.value)}
                placeholder="e.g. https://m.media-amazon.com/images/I/..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Video URL (Optional for Video Reels)</label>
              <input
                type="text"
                value={singleVideoUrl}
                onChange={(e) => setSingleVideoUrl(e.target.value)}
                placeholder="e.g. https://res.cloudinary.com/.../video.mp4"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition"
              >
                Save to Vault
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Fast Importer */}
      <div className="glass-card rounded-xl p-5 border border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-zinc-200">Fast Batch Importer (Paste & Go)</h2>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            Format: Name | Link | Category | Notes | ImageUrl | VideoUrl
          </span>
        </div>

        <form onSubmit={handleBulkImport} className="space-y-3">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={3}
            placeholder={`Anker 735 65W Charger | https://amzn.to/3xyz | travel tech | compact 3-port charger | https://m.media-amazon.com/images/I/71xyz.jpg\nErgonomic Monitor Arm | https://amzn.to/4abc | desk setup | gas-spring frees desk space | https://m.media-amazon.com/images/I/81abc.jpg\nCozy Ceramic Desk Mug | https://amzn.to/5def | lifestyle | matte black 14oz`}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-600 leading-relaxed placeholder:text-zinc-600"
          />

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-zinc-400">
              Paste multiple lines separated by the pipe character (|). Image & Video URLs are optional.
            </p>
            <button
              type="submit"
              disabled={submittingBulk || !bulkText.trim()}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition border border-zinc-700 disabled:opacity-50 flex items-center gap-2"
            >
              {submittingBulk ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {submittingBulk ? 'Importing...' : 'Import Products'}
            </button>
          </div>
        </form>
      </div>

      {/* Product List Table */}
      <div className="glass-card rounded-xl border border-zinc-800/80 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Vault Inventory ({products.length})
          </h3>
          <button onClick={fetchProducts} className="text-xs text-zinc-400 hover:text-white transition">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
            <RotateCw className="w-5 h-5 animate-spin" />
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs">
            No products in vault. Use the Fast Batch Importer above to add your first items.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800/60 text-zinc-400 bg-zinc-900/30">
                <tr>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Product Name</th>
                  <th className="px-5 py-3 font-medium">Media</th>
                  <th className="px-5 py-3 font-medium">AI Vision Insights</th>
                  <th className="px-5 py-3 font-medium">Niche</th>
                  <th className="px-5 py-3 font-medium">Mentioned</th>
                  <th className="px-5 py-3 font-medium">Affiliate Link</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {products.map((p) => {
                  const isAnalyzing = Boolean(analyzingIds[p._id]);
                  const hasVisual = Boolean(p.visualContext?.aestheticStyle);

                  return (
                    <tr key={p._id} className="hover:bg-zinc-900/40 transition">
                      {/* Active Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(p._id, p.active)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            p.active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {p.active ? 'Active' : 'Paused'}
                        </button>
                      </td>

                      {/* Name & Notes */}
                      <td className="px-5 py-3.5 font-medium text-zinc-100 whitespace-nowrap">
                        <div>{p.name}</div>
                        {p.notes && <div className="text-[11px] text-zinc-500 truncate max-w-xs">{p.notes}</div>}
                      </td>

                      {/* Media Presence */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {p.imageUrl ? (
                            <a
                              href={p.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                              title="View Image"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                            </a>
                          ) : null}
                          {p.videoUrl ? (
                            <a
                              href={p.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                              title="View Video"
                            >
                              <VideoIcon className="w-3.5 h-3.5 text-purple-400" />
                            </a>
                          ) : null}
                          {!p.imageUrl && !p.videoUrl && (
                            <span className="text-zinc-600 text-[11px]">Text Only</span>
                          )}
                        </div>
                      </td>

                      {/* AI Vision Insights */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {hasVisual ? (
                          <button
                            onClick={() =>
                              setInspectedVisual({
                                productName: p.name,
                                ...p.visualContext,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] hover:bg-indigo-500/20 transition"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            <span className="font-medium truncate max-w-[140px]">
                              {p.visualContext.aestheticStyle}
                            </span>
                          </button>
                        ) : p.imageUrl ? (
                          <button
                            onClick={() => handleAnalyzeVision(p)}
                            disabled={isAnalyzing}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[11px] transition disabled:opacity-50"
                          >
                            {isAnalyzing ? (
                              <RotateCw className="w-3 h-3 animate-spin text-amber-400" />
                            ) : (
                              <Eye className="w-3 h-3 text-emerald-400" />
                            )}
                            {isAnalyzing ? 'Analyzing...' : 'Analyze Visuals'}
                          </button>
                        ) : (
                          <span className="text-zinc-600 text-[11px]">No Image URL</span>
                        )}
                      </td>

                      {/* Niche */}
                      <td className="px-5 py-3.5 text-zinc-400 whitespace-nowrap">
                        <span className="bg-zinc-800 px-2 py-0.5 rounded text-[11px] border border-zinc-700">
                          {p.category}
                        </span>
                      </td>

                      {/* Mentions */}
                      <td className="px-5 py-3.5 text-zinc-300 font-mono whitespace-nowrap">
                        {p.timesMentioned || 0}x
                      </td>

                      {/* Link */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-zinc-400">
                        <a
                          href={p.affiliateUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                        >
                          Visit Link <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(p._id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Delete from vault"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
