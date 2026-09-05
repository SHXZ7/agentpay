'use client';
import { useState, useEffect } from 'react';
import { Search, MapPin, ShoppingCart, Star, ShieldCheck, ArrowLeft, ExternalLink, ChevronDown, Check, Filter, Zap, SlidersHorizontal, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import CheckoutResultModal from '@/components/CheckoutResultModal';

export default function AmazonStorefront() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(1050);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(44);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState('popular');
  const [primeOnly, setPrimeOnly] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [buyingId, setBuyingId] = useState(null);

  const categories = [
    { id: 'all', name: 'All Departments' },
    { id: 'computers', name: 'Computers & Accessories' },
    { id: 'electronics', name: 'Electronics & Audio' },
    { id: 'mobiles', name: 'Mobiles & Tablets' },
    { id: 'gaming', name: 'Gaming Gear' },
    { id: 'storage', name: 'Storage & Memory' },
    { id: 'cables', name: 'Cables & Power Banks' }
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

      const res = await fetch(`http://localhost:5000/merchants/aura-tech/products?${params.toString()}`);
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
          merchant_id: 'aura-tech',
          user_intent: `Amazon 1-Click purchase of ${product.name}`
        })
      });
      const { mandate } = await mandateRes.json();

      const checkoutRes = await fetch('http://localhost:5000/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: product.id,
          mandate_id: mandate.mandate_id,
          merchant_id: 'aura-tech'
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

  const filteredList = primeOnly ? products.filter(p => p.is_prime) : products;

  return (
    <div className="min-h-screen bg-[#EAEDED] text-[#0F1111] font-sans antialiased">
      
      {/* 1. Amazon Top Navigation Header */}
      <header className="bg-[#131921] text-white sticky top-0 z-40 shadow-md select-none">
        
        {/* Main Bar */}
        <div className="max-w-[1500px] mx-auto px-4 py-2 flex items-center justify-between gap-4">
          
          {/* Logo & Location */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-1 hover:outline hover:outline-1 hover:outline-white p-1 rounded">
              <div className="text-xl font-black tracking-tighter text-white flex items-center">
                <span>amazon</span>
                <span className="text-[#FF9900] text-sm ml-0.5">.in</span>
              </div>
            </Link>

            {/* Location Selector */}
            <div className="hidden md:flex items-center space-x-1 text-xs hover:outline hover:outline-1 hover:outline-white p-1 rounded cursor-pointer">
              <MapPin className="w-4 h-4 text-[#CCCCCC]" />
              <div className="leading-tight">
                <span className="text-[11px] text-[#CCCCCC] block">Deliver to Bengaluru</span>
                <span className="font-bold text-white">560001</span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl flex items-center">
            <div className="relative flex items-center w-full rounded-md overflow-hidden bg-white">
              {/* Category Dropdown */}
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="bg-[#E6E6E6] text-[#0F1111] text-xs px-2.5 py-2.5 border-r border-[#CDCDCD] focus:outline-none cursor-pointer hidden sm:block max-w-[150px] truncate"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Amazon.in or 1,000+ Agent-Ready items..."
                className="w-full px-3 py-2 text-xs text-[#0F1111] focus:outline-none"
              />

              <button
                type="submit"
                className="bg-[#FEB06A] hover:bg-[#F3A847] px-4 py-2.5 text-[#131921] transition flex items-center justify-center cursor-pointer"
              >
                <Search className="w-4 h-4 text-[#131921] stroke-[2.5]" />
              </button>
            </div>
          </form>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-3 text-xs">
            
            {/* Agent / Protocol Status */}
            <div className="hidden lg:flex flex-col items-end leading-tight px-2 py-1 bg-[#232F3E] rounded border border-slate-700">
              <span className="text-[10px] text-[#FF9900] font-mono font-bold">AP2 / ACP Ready</span>
              <span className="text-[11px] font-bold text-white">Razorpay Test Mode</span>
            </div>

            {/* Returns & Orders */}
            <Link
              href="/merchant-portal"
              target="_blank"
              className="hover:outline hover:outline-1 hover:outline-white p-1 rounded text-right leading-tight hidden sm:block"
            >
              <span className="text-[11px] text-[#CCCCCC] block">Returns</span>
              <span className="font-bold text-white flex items-center">
                &amp; Orders <ExternalLink className="w-3 h-3 ml-1 text-[#FF9900]" />
              </span>
            </Link>

            {/* Cart */}
            <Link href="/" className="flex items-center space-x-1 hover:outline hover:outline-1 hover:outline-white p-1 rounded font-bold">
              <div className="relative">
                <ShoppingCart className="w-7 h-7 text-white" />
                <span className="absolute -top-1 right-1 text-[#FF9900] font-black text-xs">0</span>
              </div>
              <span className="hidden sm:inline text-xs mt-2">Cart</span>
            </Link>
          </div>
        </div>

        {/* Sub-Header Navbar */}
        <div className="bg-[#232F3E] px-4 py-1.5 text-xs flex items-center justify-between overflow-x-auto text-[#E6E6E6]">
          <div className="flex items-center space-x-4 flex-shrink-0 font-medium">
            <span className="flex items-center font-bold text-white cursor-pointer hover:text-[#FF9900]">
              <span className="text-base mr-1">☰</span> All (1,050+ Products)
            </span>
            <span className="hover:text-white cursor-pointer" onClick={() => { setCategory('all'); setPage(1); }}>Fresh</span>
            <span className="hover:text-white cursor-pointer" onClick={() => { setCategory('mobiles'); setPage(1); }}>Mobiles</span>
            <span className="hover:text-white cursor-pointer" onClick={() => { setCategory('electronics'); setPage(1); }}>Electronics</span>
            <span className="hover:text-white cursor-pointer" onClick={() => { setCategory('computers'); setPage(1); }}>Computers</span>
            <span className="hover:text-white cursor-pointer" onClick={() => { setCategory('gaming'); setPage(1); }}>Gaming</span>
            <span className="hover:text-white cursor-pointer" onClick={() => { setCategory('cables'); setPage(1); }}>Power &amp; Cables</span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-[#FEB06A] font-mono flex-shrink-0">
            <span>Catalog: 1,050 Items Active</span>
          </div>
        </div>
      </header>

      {/* 2. Amazon Content Area */}
      <main className="max-w-[1500px] mx-auto px-4 py-4">
        
        {/* Results Header */}
        <div className="bg-white p-3 rounded-md shadow-sm border border-[#E7E7E7] mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-600">
              Showing <strong className="text-[#0F1111]">{((page - 1) * 20) + 1}-{Math.min(page * 20, totalCount)}</strong> of <strong className="text-[#0F1111]">{totalCount.toLocaleString('en-IN')}</strong> results
              {category !== 'all' && <span> in <strong className="text-[#C45500] capitalize">&ldquo;{category}&rdquo;</strong></span>}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Prime Filter Toggle */}
            <label className="flex items-center space-x-1.5 cursor-pointer select-none bg-[#F7FAFA] px-2.5 py-1 rounded border border-[#D5D9D9]">
              <input
                type="checkbox"
                checked={primeOnly}
                onChange={(e) => setPrimeOnly(e.target.checked)}
                className="rounded text-[#007185] focus:ring-0"
              />
              <span className="font-bold text-[#007185] text-xs">✓prime Eligible</span>
            </label>

            {/* Sort Dropdown */}
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="bg-[#F0F2F2] hover:bg-[#E3E6E6] text-[#0F1111] text-xs px-3 py-1 rounded border border-[#D5D9D9] focus:outline-none cursor-pointer"
            >
              <option value="popular">Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Avg. Customer Review</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-3 bg-white rounded-md border border-[#E7E7E7]">
            <Loader2 className="w-10 h-10 text-[#FF9900] animate-spin" />
            <p className="text-sm font-bold text-slate-700">Loading Amazon.in 1,000+ Product Catalog...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredList.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-md border border-[#E7E7E7] hover:border-[#D5D9D9] hover:shadow-lg p-3.5 flex flex-col justify-between transition-all duration-200 group"
              >
                <div>
                  {/* Badge & Image */}
                  <div className="relative mb-2">
                    <div className="h-44 bg-[#F8F8F8] rounded-md flex items-center justify-center text-6xl group-hover:scale-105 transition duration-200 shadow-inner">
                      {product.image}
                    </div>

                    {product.badge && (
                      <span className="absolute top-1 left-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#E67A00] text-white shadow-sm">
                        {product.badge}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-xs font-medium text-[#0F1111] hover:text-[#C45500] line-clamp-2 leading-relaxed mb-1 cursor-pointer">
                    {product.name}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center space-x-1 text-xs mb-2">
                    <div className="flex items-center text-[#FFA41C]">
                      {"★".repeat(Math.floor(product.rating))}
                      {"☆".repeat(5 - Math.floor(product.rating))}
                    </div>
                    <span className="text-[#007185] text-[11px] hover:underline cursor-pointer">
                      {product.review_count.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* 1K+ Bought Tag */}
                  <span className="text-[10px] text-[#565959] block mb-2 font-mono">
                    1K+ bought in past month
                  </span>

                  {/* Price Block */}
                  <div className="mb-2">
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-lg font-black text-[#0F1111]">
                        <sup className="text-xs font-normal">₹</sup>{product.price.toLocaleString('en-IN')}
                      </span>
                      {product.mrp > product.price && (
                        <span className="text-xs text-[#565959] line-through">
                          M.R.P: ₹{product.mrp.toLocaleString('en-IN')}
                        </span>
                      )}
                      <span className="text-xs text-[#CC0C39] font-bold">
                        ({product.discount_pct}% off)
                      </span>
                    </div>

                    {product.is_prime && (
                      <div className="flex items-center space-x-1 mt-0.5">
                        <span className="font-extrabold italic text-[#00A8E8] text-xs">✓prime</span>
                        <span className="text-[10px] text-[#565959]">FREE Delivery by Tomorrow</span>
                      </div>
                    )}
                  </div>

                  {/* Spec Highlights */}
                  {product.specs && (
                    <div className="p-2 bg-[#F7FAFA] rounded border border-[#E7E7E7] text-[10px] font-mono text-[#565959] space-y-0.5 mb-3">
                      {Object.entries(product.specs).slice(0, 2).map(([k, v]) => (
                        <div key={k} className="flex justify-between truncate">
                          <span className="capitalize">{k}:</span>
                          <span className="text-[#0F1111] font-bold">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dual Purchase Buttons */}
                <div className="space-y-1.5 pt-2 border-t border-[#E7E7E7]">
                  <button
                    onClick={() => handleAgentBuy(product)}
                    disabled={buyingId === product.id}
                    className="w-full py-1.5 px-2 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] active:bg-[#F0B800] text-[#0F1111] text-xs font-bold shadow-sm transition border border-[#FCD200] flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                    title="1-Click AI Agent Purchase via AP2 Mandate"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#0F1111]" />
                    <span>{buyingId === product.id ? 'Processing AP2...' : '1-Click AI Buy'}</span>
                  </button>

                  <button
                    onClick={() => handleAgentBuy(product)}
                    className="w-full py-1.5 px-2 rounded-full bg-[#FFA41C] hover:bg-[#FA8900] text-[#0F1111] text-xs font-bold shadow-sm transition border border-[#FF8F00] cursor-pointer"
                  >
                    Direct Pay via Razorpay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. Pagination Controls */}
        <div className="mt-8 bg-white p-4 rounded-md shadow-sm border border-[#E7E7E7] flex items-center justify-center space-x-2 text-xs">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded border border-[#D5D9D9] hover:bg-[#F7FAFA] disabled:opacity-40"
          >
            &laquo; Previous
          </button>

          <span className="px-3 py-1 font-bold text-slate-700">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded border border-[#D5D9D9] hover:bg-[#F7FAFA] disabled:opacity-40"
          >
            Next &raquo;
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
