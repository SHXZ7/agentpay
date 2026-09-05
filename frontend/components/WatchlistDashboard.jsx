'use client';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye, Plus, Trash2, Pause, Play, RefreshCw, Bell, BellOff,
  TrendingDown, Clock, Zap, CheckCircle2, ShoppingBag,
  Calendar, ChevronDown, X, AlertCircle, Target, Activity, Search, Store, Star, Check
} from 'lucide-react';
import {
  fetchWatchlist, addWatchlistItem, updateWatchlistItem,
  deleteWatchlistItem, checkWatchlistItemNow, searchNetworkProducts
} from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function pctOff(current, target) {
  if (!current || !target) return null;
  const pct = ((current - target) / current * 100).toFixed(0);
  return pct;
}

function modeLabel(mode) {
  if (mode === 'price_drop') return 'Price Drop';
  if (mode === 'scheduled') return 'Scheduled';
  if (mode === 'both') return 'Price Drop + Schedule';
  return mode;
}

const STATUS_STYLES = {
  watching:  { bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/40',   dot: 'bg-blue-500',   label: 'Watching' },
  triggered: { bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/40', dot: 'bg-amber-500 animate-pulse', label: 'Triggered' },
  bought:    { bg: 'bg-[#27272A] dark:bg-white text-white dark:text-black border-[#27272A] dark:border-white', dot: 'bg-white dark:bg-black', label: 'Bought' },
  paused:    { bg: 'bg-[#EAE6DE] dark:bg-white/5 text-[#6E736D] dark:text-[#94A3B8] border-[#DFD9CE] dark:border-white/10', dot: 'bg-[#9E9A94] dark:bg-[#64748B]', label: 'Paused' },
  expired:   { bg: 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/40', dot: 'bg-red-400', label: 'Expired' },
};

// ─── Add Item Modal ───────────────────────────────────────────────────────────

const INTERVAL_OPTIONS = [
  { value: 15,  label: 'Every 15 min' },
  { value: 30,  label: 'Every 30 min' },
  { value: 60,  label: 'Every hour' },
  { value: 360, label: 'Every 6 hours' },
  { value: 1440,label: 'Daily' },
];

function AddWatchModal({ onClose, onAdd }) {
  const [container, setContainer] = useState(null);
  const [form, setForm] = useState({
    product_id: null,
    product_name: '',
    product_image: '🛒',
    merchant_id: 'aura-tech',
    current_price: '',
    target_price: '',
    mode: 'price_drop',
    recurrence: 'one_time',
    fire_at: '',
    poll_interval_min: 30,
    auto_buy: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    setContainer(document.body);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const discount = form.current_price && form.target_price
    ? pctOff(Number(form.current_price), Number(form.target_price))
    : null;

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const offers = await searchNetworkProducts(searchQuery.trim());
        if (active) {
          setSearchResults(offers || []);
        }
      } catch (err) {
        if (active) setSearchResults([]);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleSelectProduct = (offer) => {
    const p = offer.product;
    const pPrice = Number(p.price || 0);
    const suggestedTarget = pPrice > 0 ? Math.round(pPrice * 0.85) : '';

    setForm(prev => ({
      ...prev,
      product_id: p.id || null,
      product_name: p.name,
      product_image: p.image || '🛒',
      merchant_id: offer.merchant_id || 'aura-tech',
      current_price: pPrice,
      target_price: suggestedTarget,
    }));
    setSelectedProduct({ ...p, merchant_name: offer.merchant_name, merchant_badge: offer.merchant_badge });
    setSearchQuery(p.name);
    setShowDropdown(false);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    set('product_name', val);
    setSelectedProduct(null);
    setShowDropdown(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.product_name.trim()) return setError('Product name is required.');
    if (form.mode !== 'scheduled' && (!form.target_price || Number(form.target_price) <= 0)) {
      return setError('Set a valid target price.');
    }
    if ((form.mode === 'scheduled' || form.mode === 'both') && !form.fire_at) {
      return setError('Please pick a scheduled date & time.');
    }
    setLoading(true);
    try {
      const res = await addWatchlistItem({
        product_id: form.product_id || null,
        product_name: form.product_name.trim(),
        product_image: form.product_image || '🛒',
        merchant_id: form.merchant_id || 'aura-tech',
        current_price: form.current_price ? Number(form.current_price) : null,
        target_price: form.mode === 'scheduled' ? Number(form.current_price || 0) : Number(form.target_price),
        mode: form.mode,
        recurrence: form.recurrence || 'one_time',
        fire_at: form.fire_at ? new Date(form.fire_at).toISOString() : null,
        poll_interval_min: Number(form.poll_interval_min),
        auto_buy: form.auto_buy,
      });
      if (res.success) {
        onAdd(res.item);
        onClose();
      } else {
        setError(res.error || 'Failed to add item.');
      }
    } catch { setError('Network error.'); }
    setLoading(false);
  };

  const EMOJIS = ['🛒','📱','💻','⌨️','🖱️','🎧','📷','⌚','🎮','📺','🔌','💡','📦'];

  if (!container) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md text-[#1F2421] dark:text-[#F8FAFC] overflow-y-auto animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-[#FAF8F5] dark:bg-[#111318] rounded-3xl border border-[#DFD9CE] dark:border-white/10 shadow-2xl overflow-hidden animate-scale-in z-10 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-7 py-3.5 border-b border-[#DFD9CE] dark:border-white/10 bg-[#F7F5F1] dark:bg-[#171A21]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center">
              <Plus className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-[#1F2421] dark:text-[#F8FAFC] uppercase tracking-wider">
                {form.mode === 'scheduled' ? 'Schedule Automated Purchase' : 'Add to Price Watchlist'}
              </h2>
              <p className="text-[11px] text-[#6E736D] dark:text-[#94A3B8]">
                {form.mode === 'scheduled' ? 'Set one-time or monthly recurring purchase at current store price' : 'Agent polls catalogs and auto-buys when target price is reached'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#EAE6DE] dark:bg-white/10 hover:bg-[#DFD9CE] dark:hover:bg-white/20 flex items-center justify-center transition cursor-pointer">
            <X className="w-3.5 h-3.5 text-[#6E736D] dark:text-[#94A3B8]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-7 space-y-5">
          
          {/* 2-Column Wide Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* ─── Left Column: Product & Mode ────────────────────────── */}
            <div className="space-y-4">
              
              {/* Product Search */}
              <div className="space-y-1.5 relative">
                <label className="text-[11px] font-bold text-[#6E736D] dark:text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
                  <span>Product from Connected Stores</span>
                  {selectedProduct && (
                    <span className="text-[#1F2421] dark:text-[#F8FAFC] text-[11px] font-mono font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Selected
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type e.g. iPhone, Sony Headphones, Mouse..."
                    value={form.product_name}
                    onChange={handleNameChange}
                    onFocus={() => { if (form.product_name) setShowDropdown(true); }}
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#DFD9CE] dark:border-white/10 bg-white dark:bg-[#171A21] text-sm text-[#1F2421] dark:text-[#F8FAFC] placeholder:text-[#9E9A94] dark:placeholder:text-[#64748B] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition shadow-2xs font-medium"
                  />
                  <Search className="w-4 h-4 text-[#8F8A7E] dark:text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  {isSearching && (
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Dropdown */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#171A21] rounded-2xl border border-[#DFD9CE] dark:border-white/10 shadow-2xl z-40 max-h-56 overflow-y-auto divide-y divide-[#F0ECE4] dark:divide-white/5 animate-fade-in">
                    {searchResults.map((offer, idx) => {
                      const p = offer.product;
                      return (
                        <button key={p.id || idx} type="button" onClick={() => handleSelectProduct(offer)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-[#FAF8F5] dark:hover:bg-white/5 transition flex items-center justify-between gap-3 cursor-pointer group">
                          <div className="flex items-center space-x-3 min-w-0">
                            <span className="text-xl w-8 h-8 rounded-xl bg-[#F0ECE4] dark:bg-white/5 flex items-center justify-center shrink-0 border border-[#DFD9CE] dark:border-white/10">
                              {p.image || '📦'}
                            </span>
                            <p className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition">{p.name}</p>
                          </div>
                          <span className="text-xs font-bold font-mono text-[#1F2421] dark:text-[#F8FAFC] shrink-0">₹{Number(p.price || 0).toLocaleString('en-IN')}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Icon Selector */}
              <div className="flex items-center space-x-3 p-3 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10">
                <div className="text-2xl w-10 h-10 rounded-xl bg-white dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 flex items-center justify-center shrink-0 shadow-2xs">
                  {form.product_image}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJIS.map(e => (
                      <button key={e} type="button" onClick={() => set('product_image', e)}
                        className={`text-sm px-2 py-0.5 rounded-lg transition cursor-pointer ${form.product_image === e ? 'bg-blue-100 dark:bg-blue-900/50 ring-1 ring-blue-500 shadow-2xs' : 'bg-white dark:bg-white/5 hover:bg-[#E5E0D8] dark:hover:bg-white/10'}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trigger Mode */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#6E736D] dark:text-[#94A3B8] uppercase tracking-wider block">Action Trigger</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { v: 'price_drop', icon: TrendingDown, label: 'Price Drop Alert', desc: 'Buys when price drops below target' },
                    { v: 'scheduled',  icon: Calendar,     label: 'Scheduled Auto-Buy', desc: 'Buys at specified date & time' },
                  ].map(({ v, icon: Icon, label, desc }) => (
                    <button key={v} type="button" onClick={() => set('mode', v)}
                      className={`flex flex-col items-start p-3 rounded-2xl border text-left transition cursor-pointer space-y-1 ${form.mode === v ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-300 ring-1 ring-blue-400 shadow-2xs' : 'bg-[#F0ECE4] dark:bg-[#171A21] border-[#DFD9CE] dark:border-white/10 text-[#6E736D] dark:text-[#94A3B8] hover:border-[#B5B0A8] dark:hover:border-white/20'}`}>
                      <div className="flex items-center space-x-1.5 font-bold text-xs">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                      </div>
                      <p className="text-[10.5px] text-[#8F8A7E] dark:text-[#64748B] leading-snug">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* ─── Right Column: Schedule / Price Parameters ────────── */}
            <div className="space-y-4 flex flex-col justify-between">
              
              {/* Scheduled Mode Details */}
              {form.mode === 'scheduled' ? (
                <div className="space-y-3.5 p-4 rounded-2xl bg-white dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 shadow-2xs">
                  
                  {/* Recurrence */}
                  <div>
                    <label className="text-[11px] font-bold text-[#6E736D] dark:text-[#94A3B8] uppercase tracking-wider block mb-1.5">Schedule Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => set('recurrence', 'one_time')}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col space-y-0.5 ${form.recurrence === 'one_time' ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-300 ring-1 ring-blue-400' : 'bg-[#FAF8F5] dark:bg-[#111318] border-[#DFD9CE] dark:border-white/10 text-[#6E736D] dark:text-[#94A3B8]'}`}>
                        <span className="text-xs font-bold">📅 One-Time</span>
                        <span className="text-[10px] text-[#8F8A7E] dark:text-[#64748B]">Buys once at specified time</span>
                      </button>
                      <button type="button" onClick={() => set('recurrence', 'monthly_recurring')}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col space-y-0.5 ${form.recurrence === 'monthly_recurring' ? 'bg-[#27272A] dark:bg-white/15 border-[#27272A] dark:border-white/25 text-white dark:text-white ring-1 ring-black/20 dark:ring-white/20' : 'bg-[#FAF8F5] dark:bg-[#111318] border-[#DFD9CE] dark:border-white/10 text-[#6E736D] dark:text-[#94A3B8]'}`}>
                        <span className="text-xs font-bold">🔁 Monthly</span>
                        <span className="text-[10px] text-[#8F8A7E] dark:text-[#64748B]">Always purchase every month</span>
                      </button>
                    </div>
                  </div>

                  {/* Date Picker */}
                  <div>
                    <label className="text-[11px] font-bold text-[#6E736D] dark:text-[#94A3B8] uppercase tracking-wider block mb-1.5">
                      {form.recurrence === 'monthly_recurring' ? 'Monthly Order Date & Time' : 'Scheduled Purchase Date & Time'}
                    </label>
                    <input type="datetime-local" value={form.fire_at} onChange={e => set('fire_at', e.target.value)}
                      min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                      className="w-full px-3 py-2 rounded-xl border border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318] text-xs text-[#1F2421] dark:text-[#F8FAFC] focus:outline-none focus:border-blue-400 transition font-medium" />
                    {form.recurrence === 'monthly_recurring' && form.fire_at && (
                      <p className="text-[10.5px] text-[#1F2421] dark:text-[#F8FAFC] font-medium mt-1.5">
                        ✓ Reorders automatically on the {new Date(form.fire_at).getDate()}th of every month.
                      </p>
                    )}
                  </div>

                  {form.current_price && (
                    <div className="flex items-center justify-between pt-2.5 border-t border-[#F0ECE4] dark:border-white/5 text-xs">
                      <span className="text-[#6E736D] dark:text-[#94A3B8]">Item Purchase Price:</span>
                      <span className="font-bold font-mono text-[#1F2421] dark:text-[#F8FAFC]">₹{Number(form.current_price).toLocaleString('en-IN')} INR</span>
                    </div>
                  )}

                </div>
              ) : (
                /* Price Drop Mode Details */
                <div className="space-y-3.5 p-4 rounded-2xl bg-white dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 shadow-2xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#6E736D] dark:text-[#94A3B8] uppercase tracking-wider block mb-1.5">Current (₹)</label>
                      <input type="number" placeholder="29990" value={form.current_price} onChange={e => set('current_price', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318] text-sm text-[#1F2421] dark:text-[#F8FAFC] focus:outline-none focus:border-blue-400 transition" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#6E736D] dark:text-[#94A3B8] uppercase tracking-wider block mb-1.5">
                        Target (₹) {discount !== null && <span className="text-[#1F2421] dark:text-[#F8FAFC]">−{discount}%</span>}
                      </label>
                      <input type="number" placeholder="22000" value={form.target_price} onChange={e => set('target_price', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318] text-sm text-[#1F2421] dark:text-[#F8FAFC] focus:outline-none focus:border-blue-400 transition font-bold" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#6E736D] dark:text-[#94A3B8] uppercase tracking-wider block mb-1.5">Check Frequency</label>
                    <div className="flex flex-wrap gap-1.5">
                      {INTERVAL_OPTIONS.map(o => (
                        <button key={o.value} type="button" onClick={() => set('poll_interval_min', o.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${form.poll_interval_min === o.value ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500 text-blue-800 dark:text-blue-300' : 'bg-[#FAF8F5] dark:bg-[#111318] border-[#DFD9CE] dark:border-white/10 text-[#6E736D] dark:text-[#94A3B8]'}`}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Auto Buy Toggle & Submit */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] flex items-center space-x-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Instant 0-OTP Auto-Buy</span>
                    </span>
                    <p className="text-[10.5px] text-[#8F8A7E] dark:text-[#64748B]">
                      Auto-executes purchase via UPI Autopay mandate token
                    </p>
                  </div>
                  <button type="button" onClick={() => set('auto_buy', !form.auto_buy)}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${form.auto_buy ? 'bg-[#27272A] dark:bg-white' : 'bg-[#C5C0B8] dark:bg-white/20'}`}>
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${form.auto_buy ? 'translate-x-5 bg-white dark:bg-black' : 'bg-white'}`} />
                  </button>
                </div>

                <div className="flex space-x-2 pt-1">
                  <button type="button" onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318] hover:bg-[#EAE6DE] dark:hover:bg-white/5 text-xs font-bold text-[#6E736D] dark:text-[#94A3B8] transition cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading || !form.product_name}
                    className="flex-1 py-2.5 rounded-xl bg-[#27272A] hover:bg-[#18181B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer disabled:opacity-50">
                    <Plus className="w-3.5 h-3.5" />
                    <span>{loading ? 'Creating...' : 'Add to Watchlist'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Watchlist Item Card ───────────────────────────────────────────────────────

function WatchlistItemCard({ item, onUpdate, onDelete, onCheck }) {
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const s = STATUS_STYLES[item.status] || STATUS_STYLES.watching;
  const isScheduled = item.mode === 'scheduled';
  const isMonthly = isScheduled && item.recurrence === 'monthly_recurring';

  const lastPrice = item.last_checked_price || item.current_price;
  const targetPrice = item.target_price;
  const gap = lastPrice && targetPrice ? Math.max(0, lastPrice - targetPrice) : null;
  const discount = lastPrice && targetPrice && lastPrice > targetPrice
    ? Math.round(((lastPrice - targetPrice) / lastPrice) * 100)
    : null;

  const progressWidth = targetPrice && lastPrice
    ? Math.min(100, Math.max(5, Math.round((targetPrice / lastPrice) * 100)))
    : 50;

  const handleCheck = async () => {
    setChecking(true);
    await onCheck(item.id);
    setChecking(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(item.id);
    setDeleting(false);
  };

  const handleTogglePause = async () => {
    const nextStatus = item.status === 'paused' ? 'watching' : 'paused';
    await onUpdate(item.id, { status: nextStatus, is_active: nextStatus === 'watching' });
  };

  const handleToggleAutoBuy = async () => {
    await onUpdate(item.id, { auto_buy: !item.auto_buy });
  };

  return (
    <div className={`rounded-2xl border bg-white dark:bg-[#111318] transition-all duration-200 ${item.status === 'bought' ? 'border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-white/5' : item.status === 'triggered' ? 'border-amber-200 dark:border-amber-800/40' : 'border-[#DFD9CE] dark:border-white/10'}`}>
      <div className="p-4 flex items-start gap-3">
        <div className="text-2xl w-10 h-10 flex items-center justify-center bg-[#F0ECE4] dark:bg-[#171A21] rounded-xl shrink-0 border border-[#DFD9CE] dark:border-white/10">
          {item.product_image}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-[#1F2421] dark:text-[#F8FAFC] truncate">{item.product_name}</p>
            <span className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border shrink-0 ${s.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              <span>{isMonthly && item.status === 'watching' ? 'Monthly Active' : s.label}</span>
            </span>
          </div>

          <div className="flex items-center space-x-3 mt-1 flex-wrap gap-y-1">
            {lastPrice && (
              <span className="text-[11px] text-[#6E736D] dark:text-[#94A3B8] font-mono">
                {isScheduled ? 'Order Amount:' : 'Current:'} <span className="text-[#1F2421] dark:text-[#F8FAFC] font-bold">{formatINR(lastPrice)}</span>
              </span>
            )}
            {!isScheduled && item.target_price && (
              <span className="text-[11px] text-[#6E736D] dark:text-[#94A3B8] font-mono">
                Target: <span className="text-[#1F2421] dark:text-[#F8FAFC] font-bold">{formatINR(item.target_price)}</span>
              </span>
            )}
            {!isScheduled && discount !== null && Number(discount) > 0 && (
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/40">
                −{discount}% to go
              </span>
            )}
            {isScheduled && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isMonthly ? 'bg-[#F0ECE4] dark:bg-white/10 text-[#1F2421] dark:text-white border-[#DFD9CE] dark:border-white/20' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/40'}`}>
                {isMonthly ? '🔁 Monthly Recurring' : '📅 One-Time Scheduled'}
              </span>
            )}
          </div>

          {!isScheduled && (item.mode === 'price_drop' || item.mode === 'both') && lastPrice && item.status === 'watching' && (
            <div className="mt-2">
              <div className="w-full h-1.5 rounded-full bg-[#EAE6DE] dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 dark:from-white/40 dark:to-white transition-all duration-700"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
              {gap !== null && gap > 0 && (
                <p className="text-[10px] text-[#9E9A94] dark:text-[#64748B] mt-0.5">{formatINR(gap)} away from target</p>
              )}
              {gap !== null && gap <= 0 && (
                <p className="text-[10px] text-[#1F2421] dark:text-[#F8FAFC] font-bold mt-0.5">✓ Target reached!</p>
              )}
            </div>
          )}

          <div className="flex items-center flex-wrap gap-2 mt-2">
            {item.fire_at && (
              <span className={`flex items-center space-x-1 text-[10px] font-medium ${isMonthly ? 'text-[#1F2421] dark:text-white bg-[#F0ECE4] dark:bg-white/10 px-1.5 py-0.5 rounded border border-[#DFD9CE] dark:border-white/20' : 'text-[#6E736D] dark:text-[#94A3B8]'}`}>
                <Calendar className="w-3 h-3" />
                <span>{isMonthly ? `Next: Every month on ${new Date(item.fire_at).getDate()}th (${new Date(item.fire_at).toLocaleDateString()})` : `Scheduled for: ${new Date(item.fire_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}`}</span>
              </span>
            )}
            {!isScheduled && (
              <span className="flex items-center space-x-1 text-[10px] text-[#9E9A94] dark:text-[#64748B]">
                <Clock className="w-3 h-3" />
                <span>Checked {timeAgo(item.last_checked)}</span>
              </span>
            )}
            {item.order_id && (
              <span className="text-[10px] text-[#1F2421] dark:text-white font-mono bg-[#F0ECE4] dark:bg-white/10 px-1.5 py-0.5 rounded border border-[#DFD9CE] dark:border-white/20">
                Order: {item.order_id}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center border-t border-[#F0ECE4] dark:border-white/10 px-4 py-2 gap-2">
        <button onClick={handleToggleAutoBuy}
          className={`flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${item.auto_buy ? 'bg-[#27272A] dark:bg-white/15 border-[#27272A] dark:border-white/25 text-white dark:text-white' : 'bg-[#F0ECE4] dark:bg-[#171A21] border-[#DFD9CE] dark:border-white/10 text-[#9E9A94] dark:text-[#64748B]'}`}>
          {item.auto_buy ? <Zap className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
          <span>{item.auto_buy ? '0-OTP Auto-buy' : 'Notify only'}</span>
        </button>
        <div className="flex-1" />
        {!isScheduled && item.status === 'watching' && (
          <button onClick={handleCheck} disabled={checking}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border border-[#DFD9CE] dark:border-white/10 bg-[#F0ECE4] dark:bg-[#171A21] hover:bg-[#E5E0D8] dark:hover:bg-white/10 text-[#6E736D] dark:text-[#94A3B8] transition cursor-pointer disabled:opacity-60">
            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking...' : 'Check Now'}</span>
          </button>
        )}
        {item.status !== 'bought' && (
          <button onClick={handleTogglePause}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border border-[#DFD9CE] dark:border-white/10 bg-[#F0ECE4] dark:bg-[#171A21] hover:bg-[#EAE6DE] dark:hover:bg-white/10 text-[#6E736D] dark:text-[#94A3B8] transition cursor-pointer">
            {item.is_active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{item.is_active ? 'Pause' : 'Resume'}</span>
          </button>
        )}
        <button onClick={handleDelete} disabled={deleting}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 transition cursor-pointer disabled:opacity-60">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function WatchlistDashboard() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'watching' | 'triggered' | 'bought' | 'paused'
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchWatchlist();
      setWatchlist(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load watchlist:', err);
      setWatchlist([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleAdd = (item) => {
    setWatchlist(prev => [item, ...prev]);
  };

  const handleUpdate = async (id, updates) => {
    try {
      const res = await updateWatchlistItem(id, updates);
      if (res?.success) {
        setWatchlist(prev => prev.map(w => w.id === id ? { ...w, ...res.item } : w));
      }
    } catch (err) {
      console.error('Failed to update watchlist item:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteWatchlistItem(id);
      setWatchlist(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error('Failed to delete watchlist item:', err);
    }
  };

  const handleCheck = async (id) => {
    try {
      const res = await checkWatchlistItemNow(id);
      if (res?.success) {
        setWatchlist(prev => prev.map(w => w.id === id ? { ...w, ...res.item } : w));
      }
    } catch (err) {
      console.error('Failed to check watchlist item:', err);
    }
  };

  // Stats
  const watching  = watchlist.filter(w => w.status === 'watching' && w.is_active).length;
  const triggered = watchlist.filter(w => w.status === 'triggered').length;
  const bought    = watchlist.filter(w => w.status === 'bought').length;
  const totalSaved = watchlist
    .filter(w => w.status === 'bought' && w.current_price && w.last_checked_price)
    .reduce((sum, w) => sum + ((w.current_price || 0) - (w.last_checked_price || 0)), 0);

  const filtered = watchlist.filter(w => filter === 'all' || w.status === filter || (filter === 'paused' && !w.is_active));

  const FILTER_TABS = [
    { k: 'all',       label: `All (${watchlist.length})` },
    { k: 'watching',  label: `Watching (${watchlist.filter(w => w.status === 'watching' && w.is_active).length})` },
    { k: 'triggered', label: `Triggered (${triggered})` },
    { k: 'bought',    label: `Bought (${bought})` },
    { k: 'paused',    label: `Paused (${watchlist.filter(w => !w.is_active).length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center">
            <Eye className="w-4.5 h-4.5 text-blue-700 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1F2421] dark:text-[#F8FAFC] uppercase tracking-wider">Price Watchlist</h2>
            <p className="text-[11px] text-[#6E736D] dark:text-[#94A3B8]">Auto-buy when price drops or schedule fires</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={handleRefresh}
            className="w-8 h-8 rounded-xl bg-[#F0ECE4] dark:bg-[#171A21] hover:bg-[#EAE6DE] dark:hover:bg-white/10 border border-[#DFD9CE] dark:border-white/10 flex items-center justify-center transition cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 text-[#6E736D] dark:text-[#94A3B8] ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-[#27272A] hover:bg-[#18181B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black text-xs font-bold transition cursor-pointer shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            <span>Watch Product</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {[
          { icon: Eye,         label: 'Watching',       value: watching,                         color: 'text-blue-700 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/30' },
          { icon: Bell,        label: 'Triggered',      value: triggered,                         color: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/30' },
          { icon: ShoppingBag, label: 'Auto-Bought',    value: bought,                            color: 'text-[#1F2421] dark:text-white',       bg: 'bg-[#F0ECE4] dark:bg-[#111318] border-[#DFD9CE] dark:border-white/10' },
          { icon: TrendingDown, label: 'Savings Won',   value: totalSaved > 0 ? formatINR(totalSaved) : '—', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/30' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`p-4 rounded-2xl border ${bg} flex items-center space-x-3`}>
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 border border-white/50 dark:border-white/10 flex items-center justify-center">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className={`text-base font-black font-mono ${color}`}>{value}</p>
              <p className="text-[10px] text-[#6E736D] dark:text-[#94A3B8] font-bold uppercase tracking-wide">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {FILTER_TABS.map(({ k, label }) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap transition cursor-pointer ${filter === k ? 'bg-[#27272A] dark:bg-white text-white dark:text-black border-[#27272A] dark:border-white' : 'bg-[#F0ECE4] dark:bg-[#171A21] text-[#6E736D] dark:text-[#94A3B8] border-[#DFD9CE] dark:border-white/10 hover:border-[#B5B0A8] dark:hover:border-white/20'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="text-5xl">👁️</div>
          <div>
            <p className="text-sm font-bold text-[#1F2421] dark:text-[#F8FAFC]">
              {watchlist.length === 0 ? 'No items being watched yet' : 'No items match this filter'}
            </p>
            <p className="text-[11px] text-[#6E736D] dark:text-[#94A3B8] mt-1">
              {watchlist.length === 0
                ? 'Add a product with a target price and the agent will auto-buy when it drops.'
                : 'Try switching to "All" to see everything.'}
            </p>
          </div>
          {watchlist.length === 0 && (
            <button onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-[#27272A] hover:bg-[#18181B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black text-xs font-bold transition cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              <span>Watch Your First Product</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <WatchlistItemCard
              key={item.id}
              item={item}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onCheck={handleCheck}
            />
          ))}
        </div>
      )}

      {/* Triggered alert banner */}
      {triggered > 0 && (
        <div className="flex items-center space-x-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
          <Bell className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
              {triggered} item{triggered > 1 ? 's' : ''} hit their target price!
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-400/80">
              {triggered} auto-buy{triggered > 1 ? 's were' : ' was'} executed via 0-OTP mandate.
            </p>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddWatchModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />
      )}
    </div>
  );
}
