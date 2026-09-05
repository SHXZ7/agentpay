'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sliders, 
  Tag, 
  Zap, 
  Store, 
  ShieldCheck, 
  Save, 
  Check, 
  Plus, 
  Loader2, 
  Sparkles,
  Lock,
  ArrowUpRight,
  TrendingUp,
  Info,
  Truck,
  CheckCircle2,
  DollarSign,
  Layers,
  ArrowRight,
  Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';

const PRESET_CATEGORIES = [
  "electronics",
  "computers",
  "accessories",
  "mobiles",
  "cables",
  "wearables",
  "storage",
  "gaming",
  "smarthome",
  "audio",
  "lifestyle",
  "groceries",
  "coffee",
  "office"
];

export default function PersonalizationDashboard({ onPolicyUpdated, onSwitchToStudio }) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [customAddInput, setCustomAddInput] = useState('');

  const [policy, setPolicy] = useState({
    default_max_budget: 1500,
    auto_negotiate_coupons: true,
    preferred_delivery: "fastest_1day",
    allowed_categories: [
      "electronics",
      "computers",
      "accessories",
      "mobiles",
      "cables",
      "wearables",
      "storage",
      "gaming",
      "smarthome"
    ],
    allowed_merchants: ["aura-tech", "prime-gadgets", "meesho-direct"]
  });

  const [initialPolicy, setInitialPolicy] = useState(null);

  useEffect(() => {
    setMounted(true);
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/profile');
      const data = await res.json();
      if (data.profile) {
        setPolicy(prev => ({ ...prev, ...data.profile }));
        setInitialPolicy(JSON.parse(JSON.stringify(data.profile)));
      }
    } catch (e) {
      console.warn("Policy fetch:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCategory = (cat) => {
    const norm = cat.toLowerCase().trim();
    const current = policy.allowed_categories || [];
    let updated;
    if (current.includes(norm)) {
      updated = current.filter(c => c !== norm);
    } else {
      updated = [...current, norm];
    }
    setPolicy(prev => ({ ...prev, allowed_categories: updated }));
  };

  const handleAddCustomCategory = (e) => {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    const norm = newCatInput.toLowerCase().trim();
    if (!(policy.allowed_categories || []).includes(norm)) {
      setPolicy(prev => ({
        ...prev,
        allowed_categories: [...(prev.allowed_categories || []), norm]
      }));
    }
    setNewCatInput('');
  };

  const handleToggleMerchant = (merchantId) => {
    const current = policy.allowed_merchants || [];
    let updated;
    if (current.includes(merchantId)) {
      if (current.length === 1) return; // Prevent unchecking all
      updated = current.filter(m => m !== merchantId);
    } else {
      updated = [...current, merchantId];
    }
    setPolicy(prev => ({ ...prev, allowed_merchants: updated }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('http://localhost:5000/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy)
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setInitialPolicy(JSON.parse(JSON.stringify(policy)));
        if (onPolicyUpdated) onPolicyUpdated(data.profile, data.mandate);
        try {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        } catch (e) {}
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Save policy error:", e);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = initialPolicy && JSON.stringify(policy) !== JSON.stringify(initialPolicy);

  return (
    <div className="space-y-6 text-[#1F2421] dark:text-[#F8FAFC] pb-24">
      
      {/* 2-Column Primary Policy Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Category Whitelist Management & Merchant Controls */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card: Authorized Categories */}
          <div className="p-6 rounded-3xl bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFD9CE] dark:border-white/10">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-[#1F2421] dark:text-[#F8FAFC]" />
                <h3 className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] uppercase tracking-wider">
                  Authorized Purchase Categories ({policy.allowed_categories?.length || 0})
                </h3>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPolicy(prev => ({ ...prev, allowed_categories: [...PRESET_CATEGORIES] }))}
                  className="text-[#1F2421] dark:text-[#F8FAFC] hover:underline font-semibold cursor-pointer text-xs"
                >
                  Select All
                </button>
                <span className="text-[#8F8A7E] dark:text-[#64748B]">•</span>
                <button
                  type="button"
                  onClick={() => setPolicy(prev => ({ ...prev, allowed_categories: [] }))}
                  className="text-red-700 dark:text-red-400 hover:underline font-semibold cursor-pointer text-xs"
                >
                  Clear All
                </button>
              </div>
            </div>

            <p className="text-xs text-[#6E736D] dark:text-[#94A3B8] leading-relaxed">
              The AI Agent is strictly restricted from checking out items outside these authorized categories. Any unselected category is intercepted prior to payment.
            </p>

            {/* Category Chips Grid */}
            <div className="flex flex-wrap gap-2 pt-1">
              {Array.from(new Set([...PRESET_CATEGORIES, ...(policy.allowed_categories || [])])).map((cat) => {
                const isSelected = (policy.allowed_categories || []).includes(cat.toLowerCase());
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleToggleCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-medium transition flex items-center space-x-2 cursor-pointer shadow-2xs ${
                      isSelected
                        ? 'bg-[#27272A] dark:bg-white text-white dark:text-black border-[#27272A] dark:border-white font-bold'
                        : 'bg-[#F0ECE4] dark:bg-[#171A21] text-[#6E736D] dark:text-[#94A3B8] border-[#DFD9CE] dark:border-white/10 hover:bg-[#EAE6DE] dark:hover:bg-white/10'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-white dark:bg-black text-black dark:text-white' : 'bg-[#DFD9CE] dark:bg-white/10 text-transparent'
                    }`}>
                      ✓
                    </span>
                    <span className="capitalize">{cat}</span>
                  </button>
                );
              })}
            </div>

            {/* Add Custom Category Input */}
            <form onSubmit={handleAddCustomCategory} className="flex items-center space-x-2 pt-2">
              <input
                type="text"
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                placeholder="Add custom whitelist category (e.g. books, tools)..."
                className="flex-1 px-4 py-2 rounded-xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 text-xs font-mono text-[#1F2421] dark:text-[#F8FAFC] placeholder-[#8F8A7E] dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#27272A]/20 dark:focus:ring-white/20"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#27272A] dark:bg-white text-white dark:text-black text-xs font-bold hover:bg-[#18181B] dark:hover:bg-gray-100 transition flex items-center space-x-1 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Card: Authorized Merchant Gateways */}
          <div className="p-6 rounded-3xl bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFD9CE] dark:border-white/10">
              <div className="flex items-center space-x-2">
                <Store className="w-4 h-4 text-[#1F2421] dark:text-[#F8FAFC]" />
                <h3 className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] uppercase tracking-wider">
                  Connected Storefront Routing
                </h3>
              </div>
            </div>

            <p className="text-xs text-[#6E736D] dark:text-[#94A3B8]">
              Only active storefronts below will be queried for product comparison, dynamic coupons, and checkout.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {[
                { id: 'aura-tech', name: 'Amazon India', sub: 'Prime 1-Day Fulfillment', badge: 'Prime ✓' },
                { id: 'prime-gadgets', name: 'Flipkart', sub: 'Flipkart Assured Rewards', badge: 'Assured ✦' },
                { id: 'meesho-direct', name: 'Meesho Direct', sub: 'Factory Direct Sourcing', badge: 'Wholesale 🏷️' }
              ].map((m) => {
                const isWhitelisted = (policy.allowed_merchants || []).includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleToggleMerchant(m.id)}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-3 cursor-pointer shadow-2xs ${
                      isWhitelisted
                        ? 'bg-white dark:bg-[#171A21] border-[#27272A] dark:border-white ring-1 ring-[#27272A] dark:ring-white'
                        : 'bg-[#F0ECE4]/60 dark:bg-[#171A21]/40 border-[#DFD9CE] dark:border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div>
                        <h4 className="font-bold text-sm text-[#1F2421] dark:text-[#F8FAFC] leading-tight">{m.name}</h4>
                        <span className="text-[11px] text-[#6E736D] dark:text-[#94A3B8] block mt-0.5">{m.sub}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                        isWhitelisted ? 'bg-[#27272A] dark:bg-white text-white dark:text-black' : 'bg-[#DFD9CE] dark:bg-white/10 text-transparent'
                      }`}>
                        ✓
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#DFD9CE]/60 dark:border-white/10 flex items-center justify-between text-[10.5px]">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 font-bold dark:text-[#F8FAFC]">
                        {m.badge}
                      </span>
                      <span className={`font-semibold ${isWhitelisted ? 'text-[#1F2421] dark:text-white' : 'text-[#78716C] dark:text-[#64748B]'}`}>
                        {isWhitelisted ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column (5 cols): Spend Cap & Add Extra Budget Controls */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card: Default Max Spending Cap & Add Extra Budget */}
          <div className="p-6 rounded-3xl bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFD9CE] dark:border-white/10">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-[#27272A] dark:text-white" />
                <h3 className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] uppercase tracking-wider">
                  AP2 Mandate Budget Cap
                </h3>
              </div>
              <span className="text-sm font-mono font-black text-[#1F2421] dark:text-[#F8FAFC] bg-[#F0ECE4] dark:bg-[#171A21] px-2.5 py-0.5 rounded-xl border border-[#DFD9CE] dark:border-white/10">
                ₹{Number(policy.default_max_budget || 1500).toLocaleString('en-IN')} INR
              </span>
            </div>

            <p className="text-xs text-[#6E736D] dark:text-[#94A3B8] leading-relaxed">
              Standard per-transaction ceiling for autonomous purchases. Single orders exceeding this limit will trigger a cryptographic budget expansion alert.
            </p>

            {/* Budget Range Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-bold text-[#6E736D] dark:text-[#94A3B8] uppercase tracking-wider text-[11px]">
                  Per-Item Limit Range:
                </span>
                <span className="font-bold text-sm text-[#18181B] dark:text-[#F8FAFC] bg-[#F0ECE4] dark:bg-[#171A21] px-2.5 py-0.5 rounded-lg border border-[#DFD9CE] dark:border-white/10">
                  ₹{Number(policy.default_max_budget || 2000).toLocaleString('en-IN')}
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="200000"
                step="500"
                value={policy.default_max_budget || 2000}
                onChange={(e) => setPolicy(prev => ({ ...prev, default_max_budget: Number(e.target.value) }))}
                className="w-full h-2.5 bg-[#DFD9CE] dark:bg-[#171A21] rounded-lg appearance-none cursor-pointer accent-[#18181B] dark:accent-white"
              />

              <div className="flex justify-between text-[11px] font-mono text-[#6E736D] dark:text-[#94A3B8]">
                <span>₹200 Min</span>
                <span>₹2,00,000 Max</span>
              </div>
            </div>
          </div>

          {/* Card: Autonomous Coupon Negotiation */}
          <div className="p-6 rounded-3xl bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <h3 className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] uppercase tracking-wider">
                  Automated Price Negotiation
                </h3>
              </div>
              
              <button
                type="button"
                onClick={() => setPolicy(prev => ({ ...prev, auto_negotiate_coupons: !prev.auto_negotiate_coupons }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  policy.auto_negotiate_coupons ? 'bg-[#27272A] dark:bg-white' : 'bg-[#DFD9CE] dark:bg-white/20'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black transition-transform ${
                  policy.auto_negotiate_coupons ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <p className="text-xs text-[#6E736D] dark:text-[#94A3B8] leading-relaxed">
              When enabled, the AI Agent automatically probes Razorpay ACP merchant endpoints for stackable coupon codes prior to final checkout.
            </p>
          </div>

          {/* Card: Delivery Velocity Preference */}
          <div className="p-6 rounded-3xl bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#DFD9CE] dark:border-white/10">
              <Truck className="w-4 h-4 text-[#1F2421] dark:text-[#F8FAFC]" />
              <h3 className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] uppercase tracking-wider">
                Fulfillment Preference
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'fastest_1day', label: 'Prime 1-Day (Fastest)', note: 'Prioritize Speed' },
                { id: 'cheapest_standard', label: 'Best Price (Standard)', note: 'Prioritize Savings' }
              ].map((opt) => {
                const isSelected = policy.preferred_delivery === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPolicy(prev => ({ ...prev, preferred_delivery: opt.id }))}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer shadow-2xs ${
                      isSelected
                        ? 'bg-[#FAF8F5] dark:bg-[#171A21] border-[#27272A] dark:border-white ring-1 ring-[#27272A] dark:ring-white'
                        : 'bg-[#F0ECE4] dark:bg-[#171A21]/50 border-[#DFD9CE] dark:border-white/10 opacity-70'
                    }`}
                  >
                    <span className="font-bold text-xs text-[#1F2421] dark:text-[#F8FAFC] block">{opt.label}</span>
                    <span className="text-[10px] text-[#6E736D] dark:text-[#94A3B8] block mt-0.5">{opt.note}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Stationary Bottom Action Bar (Fixed in layout, does not float over content on scroll) */}
      <div className="p-5 rounded-3xl bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 shadow-2xs flex items-center justify-end">

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`px-6 py-3 rounded-2xl font-bold text-xs flex items-center space-x-2.5 transition shadow-2xs border ${
            saveSuccess
              ? 'bg-[#27272A] dark:bg-white text-white dark:text-black border-[#27272A] dark:border-white ring-2 ring-black/20 dark:ring-white/20'
              : hasChanges
              ? 'bg-[#18181B] hover:bg-[#27272A] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black border-stone-700 dark:border-white cursor-pointer'
              : 'bg-[#EAE6DE] dark:bg-white/5 text-[#8F8A7E] dark:text-[#64748B] border-[#DFD9CE] dark:border-white/10 cursor-not-allowed opacity-70'
          }`}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Saved Changes!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
