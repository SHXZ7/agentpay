'use client';
import { useState, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Star, 
  ShieldCheck, 
  ArrowLeft, 
  ExternalLink, 
  ChevronDown, 
  Check, 
  Filter, 
  Zap, 
  SlidersHorizontal, 
  Loader2, 
  ArrowRight, 
  Heart,
  Tag,
  Truck,
  Sparkles,
  Award
} from 'lucide-react';
import Link from 'next/link';
import CheckoutResultModal from '@/components/CheckoutResultModal';

export default function MeeshoStorefront() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(500);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(25);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState('popular');
  const [activeOrder, setActiveOrder] = useState(null);
  const [buyingId, setBuyingId] = useState(null);

  const categories = [
    { id: 'all', name: 'All Factory Deals', icon: '🏷️' },
    { id: 'electronics', name: 'Audio & Gadgets', icon: '🎧' },
    { id: 'accessories', name: 'Mobile Accessories', icon: '📱' },
    { id: 'computers', name: 'PC & Desk Tech', icon: '💻' },
    { id: 'cables', name: 'Cables & Power', icon: '⚡' },
    { id: 'wearables', name: 'Watches & Wearables', icon: '⌚' }
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

      const res = await fetch(`http://localhost:5000/merchants/meesho-direct/products?${params.toString()}`);
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
        setTotalCount(data.total || 500);
        setTotalPages(data.totalPages || 25);
      }
    } catch (err) {
      console.error("Meesho fetch catalog error:", err);
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
          max_budget: product.price + 150,
          allowed_categories: [product.category, 'electronics', 'accessories', 'computers', 'cables', 'wearables'],
          merchant_id: 'meesho-direct',
          user_intent: `Meesho Direct factory purchase of ${product.name}`
        })
      });
      const { mandate } = await mandateRes.json();

      const checkoutRes = await fetch('http://localhost:5000/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: product.id,
          mandate_id: mandate.mandate_id,
          merchant_id: 'meesho-direct'
        })
      });

      const orderData = await checkoutRes.json();
      if (orderData.order) {
        setActiveOrder(orderData.order);
      }
    } catch (e) {
      console.error("Meesho 0-OTP purchase error:", e);
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF7F9] text-stone-900 font-sans pb-20">
      
      {/* 1. Meesho Signature Magenta Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#F9D0E3] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Left: Back to Hub + Meesho Logo */}
            <div className="flex items-center space-x-3">
              <Link 
                href="/"
                className="p-2 rounded-xl hover:bg-[#FDF0F6] text-stone-600 hover:text-[#F43397] transition"
                title="Return to Autonomous Hub"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-black tracking-tight text-[#F43397]">
                  meesho
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFF0F6] text-[#F43397] border border-[#F9D0E3]">
                  Direct Factory Wholesale
                </span>
              </div>
            </div>

            {/* Middle: Universal Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl relative hidden md:block">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search direct factory electronics, stands, cables, earphones..."
                className="w-full bg-[#FFF9FB] text-stone-900 placeholder:text-stone-400 pl-10 pr-4 py-2.5 rounded-xl border border-[#F9D0E3] focus:outline-none focus:ring-2 focus:ring-[#F43397] text-xs font-medium"
              />
              <Search className="w-4 h-4 text-[#F43397] absolute left-3.5 top-1/2 -translate-y-1/2" />
            </form>

            {/* Right: Security & Mandate Badge */}
            <div className="flex items-center space-x-3 text-xs">
              <div className="hidden lg:flex items-center space-x-2 bg-[#FFF0F6] px-3 py-1.5 rounded-xl border border-[#F9D0E3] text-[#9F1239] font-medium text-[11px]">
                <ShieldCheck className="w-4 h-4 text-[#F43397]" />
                <span>Zero Commission • AP2 0-OTP Autopay</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FFF0F6] text-[#F43397] flex items-center justify-center font-bold text-xs">
                🏷️ 500+ Items
              </div>
            </div>

          </div>

          {/* Sub-Header Categories Strip */}
          <div className="flex items-center space-x-2 py-2 overflow-x-auto no-scrollbar border-t border-[#FEE2E2]/60">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  category === cat.id
                    ? 'bg-[#F43397] text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-[#FDF0F6] hover:text-[#F43397] border border-[#F9D0E3]'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 2. Meesho Factory Promo Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#9F1239] via-[#BE185D] to-[#F43397] text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Direct Manufacturer Pricing</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight">
              Lowest Prices in India • Zero Commission Deals
            </h2>
            <p className="text-xs text-white/90 max-w-xl">
              Buy directly from certified manufacturing suppliers. Automated price matching & 0-OTP AP2 Autopay checkout active.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white text-[#9F1239] p-3 rounded-2xl text-center shadow-xs border border-white/40">
              <span className="text-[10px] font-bold block uppercase">Factory Discount</span>
              <span className="text-lg font-black font-mono">Up to 75% Off</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Catalog Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#F9D0E3] shadow-xs">
          <span className="text-xs text-stone-600 font-medium">
            Showing <strong className="text-stone-900">{totalCount}</strong> factory-direct products
          </span>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="bg-[#FFF9FB] border border-[#F9D0E3] text-xs font-semibold px-3 py-1.5 rounded-xl text-stone-700 focus:outline-none"
            >
              <option value="popular">Popularity</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Customer Rating</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="p-20 text-center space-y-3 bg-white rounded-3xl border border-[#F9D0E3]">
            <Loader2 className="w-8 h-8 text-[#F43397] animate-spin mx-auto" />
            <p className="text-sm font-bold text-stone-700">Loading Meesho Factory Products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center space-y-2 bg-white rounded-3xl border border-[#F9D0E3]">
            <p className="text-sm font-bold text-stone-700">No factory products found</p>
            <p className="text-xs text-stone-500">Try adjusting your search keywords or category filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {products.map((product) => {
              const isBuying = buyingId === product.id;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-3xl border border-[#F9D0E3] shadow-2xs hover:shadow-md transition duration-200 overflow-hidden flex flex-col justify-between group hover:-translate-y-0.5"
                >
                  {/* Card Media / Image */}
                  <div className="relative p-6 bg-gradient-to-b from-[#FFF5F8] to-white flex items-center justify-center border-b border-[#FDE8EF]">
                    <span className="text-6xl group-hover:scale-110 transition duration-300 transform select-none">
                      {product.image || '🛍️'}
                    </span>

                    {/* Factory Direct Badge */}
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-[#FFF0F6] text-[#9F1239] border border-[#F9D0E3] text-[10px] font-extrabold tracking-tight">
                      Direct Factory 🏷️
                    </span>

                    {/* Discount Pill */}
                    {product.discount_pct > 0 && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-2xs">
                        {product.discount_pct}% OFF
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9F1239] block">
                        {product.brand || 'Factory Direct'}
                      </span>
                      <h3 className="text-xs font-bold text-stone-900 line-clamp-2 leading-snug">
                        {product.name}
                      </h3>

                      {/* Rating & Reviews */}
                      <div className="flex items-center space-x-1.5 pt-0.5">
                        <div className="flex items-center space-x-0.5 bg-emerald-700 text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                          <span>{product.rating}</span>
                          <Star className="w-2.5 h-2.5 fill-white" />
                        </div>
                        <span className="text-[10.5px] text-stone-500 font-medium">
                          ({product.review_count || 1400} reviews)
                        </span>
                      </div>
                    </div>

                    {/* Price & Delivery */}
                    <div className="space-y-2 pt-2 border-t border-[#FDE8EF]">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-lg font-black text-stone-900 font-mono">
                          ₹{product.price}
                        </span>
                        {product.mrp && product.mrp > product.price && (
                          <span className="text-xs text-stone-400 line-through font-mono">
                            ₹{product.mrp}
                          </span>
                        )}
                      </div>

                      <div className="text-[10.5px] text-stone-600 flex items-center gap-1 font-medium">
                        <Truck className="w-3 h-3 text-[#F43397]" />
                        <span>Factory Direct Free Delivery</span>
                      </div>

                      {/* Buy Action */}
                      <button
                        type="button"
                        onClick={() => handleAgentBuy(product)}
                        disabled={isBuying}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#F43397] hover:bg-[#E11D48] text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        {isBuying ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Signing AP2 Mandate...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>Buy with 0-OTP AP2</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 pt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl bg-white border border-[#F9D0E3] text-xs font-bold text-stone-700 hover:bg-[#FDF0F6] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs font-mono text-stone-600 px-3">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl bg-white border border-[#F9D0E3] text-xs font-bold text-stone-700 hover:bg-[#FDF0F6] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

      </main>

      {/* 5. Checkout Result Receipt Modal */}
      {activeOrder && (
        <CheckoutResultModal
          order={activeOrder}
          onClose={() => setActiveOrder(null)}
        />
      )}

    </div>
  );
}
