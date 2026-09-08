'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, CheckCircle2, XCircle, Upload, ExternalLink, RotateCw } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkText, setBulkText] = useState('');
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Single product state
  const [singleName, setSingleName] = useState('');
  const [singleUrl, setSingleUrl] = useState('');
  const [singleCategory, setSingleCategory] = useState('');
  const [singleNotes, setSingleNotes] = useState('');
  const [showSingleModal, setShowSingleModal] = useState(false);

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
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSingleName('');
        setSingleUrl('');
        setSingleCategory('');
        setSingleNotes('');
        setShowSingleModal(false);
        await fetchProducts();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Failed: ' + err.message);
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
            Product Knowledge Vault
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            This is the agent's background knowledge source. Products are organically woven into relatable stories or discussions only when genuine context arises.
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
          <span className="text-[11px] text-zinc-400 font-mono">Format: Name | Link | Category | Notes</span>
        </div>

        <form onSubmit={handleBulkImport} className="space-y-3">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={3}
            placeholder={`Anker 735 65W Charger | https://amzn.to/3xyz | travel tech | compact 3-port charger\nErgonomic Monitor Arm | https://amzn.to/4abc | desk setup | single gas-spring arm frees up desk space\nCozy Ceramic Desk Mug | https://amzn.to/5def | lifestyle | matte black 14oz coffee mug`}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-600 leading-relaxed placeholder:text-zinc-600"
          />

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-zinc-400">Paste multiple lines separated by the pipe character (|).</p>
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
                  <th className="px-5 py-3 font-medium">Niche</th>
                  <th className="px-5 py-3 font-medium">Notes</th>
                  <th className="px-5 py-3 font-medium">Mentioned</th>
                  <th className="px-5 py-3 font-medium">Affiliate Link</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-zinc-900/40 transition">
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
                    <td className="px-5 py-3.5 font-medium text-zinc-100 whitespace-nowrap">{p.name}</td>
                    <td className="px-5 py-3.5 text-zinc-400 whitespace-nowrap">
                      <span className="bg-zinc-800 px-2 py-0.5 rounded text-[11px] border border-zinc-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 max-w-xs truncate">{p.notes || '—'}</td>
                    <td className="px-5 py-3.5 text-zinc-300 font-mono whitespace-nowrap">
                      {p.timesMentioned || 0}x
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
