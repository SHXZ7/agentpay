'use client';
import { useState } from 'react';
import { ShoppingBag, Code, Star, Check, Tag } from 'lucide-react';

export default function StoreCatalog({ products, onSelectProduct, isRunning }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showJsonSchema, setShowJsonSchema] = useState(false);

  const categories = ['all', 'electronics', 'accessories', 'groceries', 'lifestyle'];

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category.toLowerCase() === selectedCategory);

  return (
    <div className="rounded-2xl border border-slate-800 bg-razorpay-card/80 backdrop-blur-xl p-5 shadow-2xl mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Agent-Readable Merchant Catalog</h2>
            <p className="text-xs text-slate-400">Structured JSON schema exposed to AI crawlers at <code className="text-white">GET /products</code></p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Category filter pills */}
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs capitalize transition ${
                  selectedCategory === cat
                    ? 'bg-white text-black font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowJsonSchema(!showJsonSchema)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition"
          >
            <Code className="w-3.5 h-3.5" />
            <span>{showJsonSchema ? 'Hide API View' : 'API JSON View'}</span>
          </button>
        </div>
      </div>

      {/* JSON Schema Drawer */}
      {showJsonSchema && (
        <div className="mb-6 p-4 rounded-xl bg-black/90 border border-white/20 text-xs font-mono text-white overflow-x-auto max-h-64">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-slate-400">
            <span>GET http://localhost:5000/products</span>
            <span>HTTP/1.1 200 OK</span>
          </div>
          <pre>{JSON.stringify({ protocol: "ACP/1.0", count: products.length, products }, null, 2)}</pre>
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 p-4 transition-all duration-200 flex flex-col justify-between group hover:shadow-lg hover:shadow-blue-500/5"
          >
            <div>
              {/* Image & Badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-200">
                  {product.image}
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {product.category}
                  </span>
                  {product.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {product.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-xs font-bold text-white mb-1 line-clamp-1 group-hover:text-blue-400 transition">
                {product.name}
              </h3>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                {product.description}
              </p>

              {/* Specs pill */}
              {product.specs && (
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 mb-3 text-[10px] font-mono text-slate-400 space-y-0.5">
                  {Object.entries(product.specs).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-500 capitalize">{k}:</span>
                      <span className="text-slate-300 truncate max-w-[120px]">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price & Action */}
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">Agent Price</span>
                <span className="text-sm font-extrabold text-white">₹{product.price.toLocaleString('en-IN')}</span>
              </div>

              <button
                onClick={() => onSelectProduct(product)}
                disabled={isRunning}
                className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-razorpay-accent text-slate-200 hover:text-white text-xs font-medium transition duration-150 border border-slate-700 hover:border-transparent disabled:opacity-40"
              >
                Buy via Agent
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
