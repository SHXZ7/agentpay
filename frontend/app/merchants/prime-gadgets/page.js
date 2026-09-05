'use client';
import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Star, ShieldCheck, ArrowLeft, ExternalLink, ChevronDown, Check, Filter, Zap, SlidersHorizontal, Loader2, ArrowRight, Heart } from 'lucide-react';
import Link from 'next/link';
import CheckoutResultModal from '@/components/CheckoutResultModal';

export default function FlipkartStorefront() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(1050);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(44);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState('popular');
  const [assuredOnly, setAssuredOnly] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [buyingId, setBuyingId] = useState(null);

  const categories = [
    { id: 'all', name: 'Top Offers', icon: '🏷️' },
    { id: 'mobiles', name: 'Mobiles', icon: '📱' },
    { id: 'electronics', name: 'Electronics', icon: '🎧' },
    { id: 'computers', name: 'Laptops & PCs', icon: '💻' },
    { id: 'gaming', name: 'Gaming', icon: '🎮' },
    { id: 'cables', name: 'Accessories', icon: '⚡' },
    { id: 'storage', name: 'Storage', icon: '💾' }
  ];

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        category: category !== 'all' ? category : '',
        query: searchQuery,
        sort: sort
      });

      const res = await fetch(`http://localhost:5000/merchants/prime-gadgets/products?${params.toString()}`);
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
        setTotalCount(data.total || 1050);
        setTotalPages(data.totalPages || 44);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [page, category, sort]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCatalog();
  };

  const handleAgentBuy = async (product) => {
    setBuyingId(product.id);
    try {
      const mandateRes = await fetch('http://localhost:5000/mandates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_budget: product.price + 200,
          allowed_categories: [product.category, 'electronics', 'accessories'],
          merchant_id: 'prime-gadgets',
          user_intent: `Flipkart Assured purchase of ${product.name}`
        })
      });
      const { mandate } = await mandateRes.json();

      const checkoutRes = await fetch('http://localhost:5000/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: product.id,
          mandate_id: mandate.mandate_id,
          merchant_id: 'prime-gadgets'
        })
      });

      const orderData = await checkoutRes.json();
      if (orderData.order) {
        setActiveOrder(orderData.order);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBuyingId(null);
    }
  };

  const filteredList = assuredOnly ? products.filter(p => p.is_assured) : products;

  return (
    <div className="min-h-screen bg-[#F1F3F6] text-[#212121] font-sans antialiased">
      
      {/* 1. Flipkart Iconic Blue Navigation Header */}
      <header className="bg-[#2874F0] text-white sticky top-0 z-40 shadow-md select-none">
        
        {/* Main Bar */}
        <div className="max-w-[1400px] mx-auto px-4 py-2.5 flex items-center justify-between gap-6">
          
          {/* Logo */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex flex-col items-start leading-none group">
              <span className="text-xl font-extrabold italic tracking-tight text-white">Flipkart</span>
              <span className="text-[10px] italic font-semibold text-slate-200 flex items-center mt-0.5">
                Explore <strong className="text-[#FFE500] ml-1">Plus ✦</strong>
              </span>
            </Link>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl">
            <div className="relative flex items-center bg-white rounded-sm overflow-hidden shadow-inner">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products, brands and more (1,050+ Items)..."
                className="w-full px-4 py-2 text-xs text-[#212121] focus:outline-none"
              />
              <button
                type="submit"
                className="px-3.5 py-2 text-[#2874F0] hover:text-[#1c54b2] transition cursor-pointer"
              >
                <Search className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center space-x-6 text-xs font-semibold">
            
            {/* AP2 Status Tag */}
            <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 bg-[#1E5BC6] rounded text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFE500] animate-pulse"></span>
              <span>AP2 Agent Ready</span>
            </div>

            {/* Merchant Portal */}
            <Link
              href="/merchant-portal"
              target="_blank"
              className="flex items-center space-x-1 text-white hover:text-[#FFE500] transition"
            >
              <span>Seller Hub</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </Link>

            {/* Cart */}
            <Link href="/" className="flex items-center space-x-1.5 text-white hover:text-[#FFE500]">
              <ShoppingCart className="w-4 h-4" />
              <span>Cart</span>
            </Link>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="bg-white text-[#212121] px-4 py-2 border-b border-slate-200 overflow-x-auto shadow-sm">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-6">
            <div className="flex items-center space-x-6 flex-shrink-0 text-xs font-semibold">
              {categories.map((c) => (
                <div
                  key={c.id}
                  onClick={() => { setCategory(c.id); setPage(1); }}
                  className={`flex flex-col items-center space-y-1 cursor-pointer transition ${
                    category === c.id ? 'text-[#2874F0] font-bold border-b-2 border-[#2874F0] pb-1' : 'text-[#333333] hover:text-[#2874F0]'
                  }`}
                >
                  <span className="text-base">{c.icon}</span>
                  <span>{c.name}</span>
                </div>
              ))}
            </div>

            <div className="hidden md:flex items-center space-x-2 text-xs font-bold text-emerald-600 font-mono flex-shrink-0">
              <span>✦ 1,050 Flipkart Assured Items</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Flipkart Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 py-4">
        
        {/* Filter Bar */}
        <div className="bg-white p-3.5 rounded shadow-sm border border-slate-200 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-500">
              Showing <strong className="text-[#212121]">{((page - 1) * 20) + 1}-{Math.min(page * 20, totalCount)}</strong> of <strong className="text-[#212121]">{totalCount.toLocaleString('en-IN')}</strong> items
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* F-Assured Filter */}
            <label className="flex items-center space-x-1.5 cursor-pointer select-none bg-[#F9F9F9] px-3 py-1 rounded border border-slate-300">
              <input
                type="checkbox"
                checked={assuredOnly}
                onChange={(e) => setAssuredOnly(e.target.checked)}
                className="rounded text-[#2874F0] focus:ring-0"
              />
              <span className="font-extrabold text-[#2874F0] text-xs">Flipkart Assured ✦</span>
            </label>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="bg-white text-[#212121] text-xs px-3 py-1 rounded border border-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="popular">Popularity</option>
              <option value="price_asc">Price -- Low to High</option>
              <option value="price_desc">Price -- High to Low</option>
              <option value="rating">Customer Rating</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-3 bg-white rounded shadow-sm">
            <Loader2 className="w-10 h-10 text-[#2874F0] animate-spin" />
            <p className="text-sm font-bold text-slate-700">Loading Flipkart 1,050+ Products...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {filteredList.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded p-3.5 hover:shadow-xl transition-all duration-200 flex flex-col justify-between group border border-transparent hover:border-slate-200 relative"
              >
                <div>
                  {/* Image & Wishlist */}
                  <div className="relative mb-2">
                    <div className="h-44 bg-[#FAFAFA] rounded flex items-center justify-center text-6xl group-hover:scale-105 transition duration-200">
                      {product.image}
                    </div>

                    <button className="absolute top-1 right-1 p-1.5 rounded-full bg-white shadow-sm text-slate-400 hover:text-red-500 transition">
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="text-xs font-semibold text-[#212121] hover:text-[#2874F0] line-clamp-2 leading-relaxed mb-1.5 cursor-pointer">
                    {product.name}
                  </h3>

                  {/* Rating Badge & Reviews */}
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#388E3C] text-white text-[10px] font-bold flex items-center">
                      {product.rating} <Star className="w-2.5 h-2.5 ml-0.5 fill-white" />
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      ({product.review_count.toLocaleString('en-IN')})
                    </span>
                    {product.is_assured && (
                      <span className="text-[10px] font-black italic text-[#2874F0]">
                        Assured ✦
                      </span>
                    )}
                  </div>

                  {/* Pricing Block */}
                  <div className="mb-2">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-base font-bold text-[#212121]">
                        ₹{product.price.toLocaleString('en-IN')}
                      </span>
                      {product.mrp > product.price && (
                        <span className="text-xs text-slate-400 line-through">
                          ₹{product.mrp.toLocaleString('en-IN')}
                        </span>
                      )}
                      <span className="text-xs text-[#388E3C] font-bold">
                        {product.discount_pct}% off
                      </span>
                    </div>

                    <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                      Bank Offer 10% off on SBI Credit Cards
                    </span>
                  </div>

                  {/* Specs */}
                  {product.specs && (
                    <div className="p-2 bg-[#F9F9F9] rounded text-[10px] text-slate-500 font-mono space-y-0.5 mb-3">
                      {Object.entries(product.specs).slice(0, 2).map(([k, v]) => (
                        <div key={k} className="flex justify-between truncate">
                          <span className="capitalize">{k}:</span>
                          <span className="text-[#212121] font-semibold">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleAgentBuy(product)}
                    disabled={buyingId === product.id}
                    className="w-full py-2 px-2 rounded bg-[#FB641B] hover:bg-[#e0530f] active:bg-[#c94508] text-white text-xs font-bold shadow transition flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                    title="Delegate to AI Agent with AP2 Mandate"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>{buyingId === product.id ? 'Authorizing AP2...' : 'BUY VIA AI AGENT'}</span>
                  </button>

                  <button
                    onClick={() => handleAgentBuy(product)}
                    className="w-full py-1.5 px-2 rounded bg-[#FFE500] hover:bg-[#f0d800] text-[#212121] text-xs font-bold transition border border-[#ffd800] cursor-pointer"
                  >
                    Direct Checkout (Razorpay)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="mt-8 bg-white p-4 rounded shadow-sm border border-slate-200 flex items-center justify-center space-x-2 text-xs">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-1.5 rounded border border-slate-300 font-bold text-[#2874F0] disabled:opacity-40 hover:bg-slate-50"
          >
            PREVIOUS
          </button>

          <span className="px-4 py-1 font-bold text-slate-700">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-1.5 rounded border border-slate-300 font-bold text-[#2874F0] disabled:opacity-40 hover:bg-slate-50"
          >
            NEXT
          </button>
        </div>

      </main>

      {/* Razorpay Test Modal */}
      {activeOrder && (
        <CheckoutResultModal
          order={activeOrder}
          onClose={() => setActiveOrder(null)}
        />
      )}
    </div>
  );
}
