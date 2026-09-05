'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Zap, 
  ShieldCheck, 
  CreditCard, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Power, 
  Lock, 
  ArrowUpRight, 
  Key, 
  Receipt, 
  Clock,
  Layers,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Building2,
  DollarSign,
  ArrowRight,
  Check
} from 'lucide-react';
import { authorizeAutopay, revokeAutopay } from '@/lib/api';
import confetti from 'canvas-confetti';

export default function UPIAutopayDashboard({
  autopay,
  orders = [],
  onAuthorize,
  onRevoke,
  onRefresh
}) {
  const [container, setContainer] = useState(null);
  useEffect(() => {
    setContainer(document.body);
  }, []);

  const [vpa, setVpa] = useState(autopay?.upi_vpa || autopay?.vpa || 'shopper@oksbi');
  const [loading, setLoading] = useState(false);

  // Success and celebration modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastActionResult, setLastActionResult] = useState(null);

  const isActive = Boolean(autopay && autopay.is_active);

  // 1. Exact Dynamic Balances
  const totalSpent = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const storageCeiling = isActive ? Number(autopay?.storage_ceiling || autopay?.max_limit || 100000) : 0;
  const loadedFunds = isActive ? Number(autopay?.loaded_funds !== undefined ? autopay?.loaded_funds : 10000) : 0;
  const spent = isActive ? Math.max(Number(autopay?.spent_amount || 0), totalSpent) : 0;
  const activeBalance = isActive ? Math.max(0, loadedFunds - spent) : 0;

  const storageFilledPct = storageCeiling > 0 ? Math.max(0, Math.min(100, Math.round((activeBalance / storageCeiling) * 100))) : 0;

  const [configMode, setConfigMode] = useState('topup'); // 'topup' | 'fixed_cap'
  const [selectedLimit, setSelectedLimit] = useState(storageCeiling || 100000);
  const [topUpAddAmount, setTopUpAddAmount] = useState(10000);
  const [customTopUpInput, setCustomTopUpInput] = useState('');
  const [customCapInput, setCustomCapInput] = useState('');

  useEffect(() => {
    if (autopay?.upi_vpa || autopay?.vpa) {
      setVpa(autopay.upi_vpa || autopay.vpa);
    }
    const ceiling = Number(autopay?.storage_ceiling || autopay?.max_limit || 0);
    if (ceiling > 0) {
      setSelectedLimit(ceiling);
    }
  }, [autopay]);

  // 2. Direct Target Balance Math
  const activeTopUpValue = customTopUpInput ? Math.max(100, Number(customTopUpInput) || 0) : topUpAddAmount;
  const activeFixedCapValue = customCapInput ? Math.max(500, Number(customCapInput) || 0) : Number(selectedLimit);

  // New available preview
  const previewNewAvailable = configMode === 'topup'
    ? Math.min(storageCeiling, activeBalance + activeTopUpValue)
    : Math.min(activeFixedCapValue, activeBalance);

  const previewNewLoaded = configMode === 'topup'
    ? Math.min(storageCeiling, loadedFunds + activeTopUpValue)
    : Math.min(activeFixedCapValue, loadedFunds);

  // Launch Official Razorpay Standard Checkout UI for Add Funds
  const launchRazorpayTopUp = async (amountToAdd) => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.Razorpay) {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TTehqJrjmGbQN0',
          amount: Math.round(Number(amountToAdd) * 100), // in paise
          currency: "INR",
          name: "Razorpay Autonomous Vault",
          description: `Add ₹${Number(amountToAdd).toLocaleString('en-IN')} Funds to UPI Autopay Vault`,
          prefill: {
            vpa: vpa || "shopper@oksbi",
            contact: "9999999999",
            email: "shopper@agentic.commerce"
          },
          notes: {
            mandate_type: "upi_autopay_add_funds",
            add_amount: amountToAdd,
            vpa: vpa || "shopper@oksbi"
          },
          theme: {
            color: "#27272A"
          },
          handler: async function (response) {
            console.log("Razorpay Add Funds Success:", response);
            await executeAuthorize({ add_funds_amount: amountToAdd });
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        await executeAuthorize({ add_funds_amount: amountToAdd });
      }
    } catch (err) {
      console.warn("Razorpay launch fallback:", err);
      await executeAuthorize({ add_funds_amount: amountToAdd });
    }
  };

  const handleTriggerAction = () => {
    if (configMode === 'topup') {
      // Show official Razorpay payment UI for adding funds
      launchRazorpayTopUp(activeTopUpValue);
    } else {
      // Storage Ceiling: instant 1-click update, no Razorpay UI
      executeAuthorize({ storage_ceiling: activeFixedCapValue });
    }
  };

  const executeAuthorize = async (payload) => {
    setLoading(true);
    try {
      const data = await authorizeAutopay({
        ...payload,
        upi_vpa: vpa || 'shopper@oksbi'
      });
      if (data.success && onAuthorize) {
        onAuthorize(data.autopay);
        setLastActionResult({
          type: configMode === 'topup' ? 'topup' : 'ceiling',
          addAmount: payload.add_funds_amount || 0,
          newCeiling: data.autopay.storage_ceiling || data.autopay.max_limit,
          newAvailable: data.autopay.remaining_limit !== undefined ? data.autopay.remaining_limit : previewNewAvailable,
          spent: data.autopay.spent_amount !== undefined ? data.autopay.spent_amount : spent,
          loaded: data.autopay.loaded_funds || previewNewLoaded
        });
        setShowSuccessModal(true);
        try {
          confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
        } catch (e) {}
      }
    } catch (err) {
      console.error("Authorize error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    setLoading(true);
    const refundAmount = activeBalance;
    try {
      const data = await revokeAutopay();
      if (data.success && onRevoke) {
        onRevoke();
        setLastActionResult({
          type: 'revoke',
          creditedAmount: refundAmount,
          vpa: vpa || 'shopper@oksbi',
          remaining: 0
        });
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error("Revoke error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-[#1F2421] dark:text-[#F8FAFC] pb-36 transition-colors duration-200">
      
      {/* 2-Column Mandate Console & Real Settlement History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left (7 cols): Mandate Limit Configuration & VPA Console */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 shadow-2xs space-y-5 flex flex-col justify-between transition-colors duration-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFD9CE] dark:border-white/10">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#1F2421] dark:text-[#F8FAFC]" />
                <h3 className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] uppercase tracking-wider">
                  Mandate Authority Configuration
                </h3>
              </div>
            </div>

            {/* Live Progress Meter */}
            <div className="p-4 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6E736D] dark:text-[#94A3B8] font-mono">Vault Storage &amp; Fund Capacity</span>
                <span className="font-bold text-[#1F2421] dark:text-[#F8FAFC] font-mono">
                  {isActive ? `₹${activeBalance.toLocaleString('en-IN')} / ₹${storageCeiling.toLocaleString('en-IN')} Available (${storageFilledPct}% Filled)` : '₹0 / ₹0 (Vault Reset)'}
                </span>
              </div>

              <div className="w-full h-3 bg-[#DFD9CE] dark:bg-[#252834] rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-700 rounded-full bg-[#27272A] dark:bg-white"
                  style={{ width: `${isActive ? storageFilledPct : 0}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] font-mono text-[#6E736D] dark:text-[#94A3B8]">
                <span className={isActive ? 'text-[#1F2421] dark:text-white font-bold' : 'text-[#8F8A7E] dark:text-[#64748B]'}>
                  ₹{activeBalance.toLocaleString('en-IN')} Available • ₹{spent.toLocaleString('en-IN')} Spent
                </span>
                <span>Storage Ceiling: ₹{storageCeiling.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Mode Switcher: Add Funds (+Top Up) vs Set Mandate Ceiling */}
            <div className="space-y-3">
              <div className="flex rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] p-1 border border-[#DFD9CE] dark:border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setConfigMode('topup'); setCustomCapInput(''); }}
                  className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                    configMode === 'topup'
                      ? 'bg-[#27272A] dark:bg-white/15 text-white dark:text-white dark:border dark:border-white/25 shadow-2xs'
                      : 'text-[#6E736D] dark:text-[#94A3B8] hover:text-[#1F2421] dark:hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>➕ Add Funds</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setConfigMode('fixed_cap'); setCustomTopUpInput(''); }}
                  className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                    configMode === 'fixed_cap'
                      ? 'bg-[#27272A] dark:bg-white/15 text-white dark:text-white dark:border dark:border-white/25 shadow-2xs'
                      : 'text-[#6E736D] dark:text-[#94A3B8] hover:text-[#1F2421] dark:hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>⚙️ Storage Ceiling</span>
                </button>
              </div>

              {/* MODE 1: Add Funds */}
              {configMode === 'topup' ? (
                <div className="space-y-3 p-3.5 rounded-2xl bg-[#F0ECE4]/80 dark:bg-[#15171F] border border-[#DFD9CE] dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC]">
                      Select Funds to Load:
                    </label>
                    <span className="text-[10px] font-mono font-bold text-[#1F2421] dark:text-white bg-[#F0ECE4] dark:bg-white/10 px-2 py-0.5 rounded-full border border-[#DFD9CE] dark:border-white/20">
                      +₹{activeTopUpValue.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[1000, 2000, 5000, 10000, 25000, 50000].map((amt) => {
                      const isSelected = !customTopUpInput && topUpAddAmount === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => { setTopUpAddAmount(amt); setCustomTopUpInput(''); }}
                          className={`py-2 rounded-xl text-xs font-mono font-bold transition shadow-2xs cursor-pointer ${
                            isSelected
                              ? 'bg-[#27272A] dark:bg-white text-white dark:text-black border border-[#27272A] dark:border-white font-black'
                              : 'bg-white dark:bg-[#1C1F2A] text-[#44403C] dark:text-[#CBD5E1] hover:bg-[#FAF8F5] dark:hover:bg-[#232736] border border-[#DFD9CE] dark:border-white/10'
                          }`}
                        >
                          +₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Top Up Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#6E736D] dark:text-[#94A3B8] block">
                      Or Enter Custom Amount (₹):
                    </label>
                    <input
                      type="number"
                      value={customTopUpInput}
                      onChange={(e) => setCustomTopUpInput(e.target.value)}
                      placeholder="e.g. 15000 or 75000"
                      min="100"
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C1F2A] border border-[#DFD9CE] dark:border-white/10 text-xs font-mono font-semibold text-[#1F2421] dark:text-[#F8FAFC] placeholder-[#8F8A7E] dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#27272A]/20 dark:focus:ring-white/20 focus:border-[#27272A] dark:focus:border-white/40"
                    />
                  </div>

                  {/* Dynamic Calculation Pill */}
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1A1D27] border border-[#DFD9CE] dark:border-white/20 text-[11px] font-mono text-[#1F2421] dark:text-[#F8FAFC] flex flex-wrap items-center justify-between gap-1.5">
                    <span>Available Now: <strong>₹{activeBalance.toLocaleString('en-IN')}</strong></span>
                    <span>+</span>
                    <span>Add Funds: <strong className="text-[#1F2421] dark:text-white">+₹{activeTopUpValue.toLocaleString('en-IN')}</strong></span>
                    <span>➔</span>
                    <span className="font-bold text-[#1F2421] dark:text-white bg-[#F0ECE4] dark:bg-white/15 px-2 py-0.5 rounded-lg border border-[#DFD9CE] dark:border-white/25">
                      New Available: ₹{previewNewAvailable.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ) : (
                /* MODE 2: Set Storage Ceiling */
                <div className="space-y-3 p-3.5 rounded-2xl bg-[#F0ECE4]/80 dark:bg-[#15171F] border border-[#DFD9CE] dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC]">
                      Select Storage Capacity Limit (Ceiling):
                    </label>
                    <span className="text-[10px] font-mono font-bold text-[#1F2421] dark:text-white bg-[#DFD9CE] dark:bg-white/10 px-2 py-0.5 rounded-full border border-[#DFD9CE] dark:border-white/20">
                      Storage Limit: ₹{activeFixedCapValue.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[10000, 25000, 50000, 100000, 250000, 500000].map((cap) => {
                      const isSelected = !customCapInput && selectedLimit === cap;
                      return (
                        <button
                          key={cap}
                          type="button"
                          onClick={() => { setSelectedLimit(cap); setCustomCapInput(''); }}
                          className={`py-2 rounded-xl text-xs font-mono font-bold transition shadow-2xs cursor-pointer ${
                            isSelected
                              ? 'bg-[#27272A] dark:bg-white text-white dark:text-black border border-[#27272A] dark:border-white font-black'
                              : 'bg-white dark:bg-[#1C1F2A] text-[#44403C] dark:text-[#CBD5E1] hover:bg-[#FAF8F5] dark:hover:bg-[#232736] border border-[#DFD9CE] dark:border-white/10'
                          }`}
                        >
                          ₹{cap >= 1000 ? `${cap / 1000}k` : cap}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Ceiling Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#6E736D] dark:text-[#94A3B8] block">
                      Or Enter Custom Storage Capacity Limit (₹):
                    </label>
                    <input
                      type="number"
                      value={customCapInput}
                      onChange={(e) => setCustomCapInput(e.target.value)}
                      placeholder="e.g. 50000 or 150000"
                      min="500"
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C1F2A] border border-[#DFD9CE] dark:border-white/10 text-xs font-mono font-semibold text-[#1F2421] dark:text-[#F8FAFC] placeholder-[#8F8A7E] dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#27272A]/20 dark:focus:ring-white/20 focus:border-[#27272A] dark:focus:border-white/40"
                    />
                  </div>

                  {/* Ceiling Notice */}
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1A1D27] border border-[#DFD9CE] dark:border-white/20 text-[11px] font-mono text-[#1F2421] dark:text-[#F8FAFC] flex flex-wrap items-center justify-between gap-1.5">
                    <span>Current Storage: <strong>₹{storageCeiling.toLocaleString('en-IN')}</strong></span>
                    <span>➔</span>
                    <span>New Storage Ceiling: <strong className="text-[#1F2421] dark:text-white">₹{activeFixedCapValue.toLocaleString('en-IN')}</strong></span>
                    <span className="font-bold text-[#1F2421] dark:text-white bg-[#F0ECE4] dark:bg-white/15 px-2 py-0.5 rounded-lg border border-[#DFD9CE] dark:border-white/25">
                      Available Funds: ₹{activeBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* VPA Handle Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] block">
                UPI Virtual Payment Address (VPA):
              </label>
              <input
                type="text"
                value={vpa}
                onChange={(e) => setVpa(e.target.value)}
                placeholder="e.g. shopper@oksbi or user@okhdfcbank"
                className="w-full px-4 py-2.5 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 text-xs font-mono font-semibold text-[#1F2421] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#27272A]/20 dark:focus:ring-white/20 focus:border-[#27272A] dark:focus:border-white/40"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleTriggerAction}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl font-bold text-xs shadow-2xs transition flex items-center justify-center space-x-2 cursor-pointer bg-[#27272A] hover:bg-[#18181B] dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black"
              >
                {loading ? (
                  <span>Processing e-Mandate...</span>
                ) : !isActive ? (
                  <>
                    <Zap className="w-4 h-4 text-amber-400 dark:text-black fill-current" />
                    <span>Authorize ₹{(configMode === 'topup' ? activeTopUpValue : activeFixedCapValue).toLocaleString('en-IN')} Mandate Limit</span>
                  </>
                ) : configMode === 'topup' ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-white dark:text-black" />
                    <span>+ Add ₹{activeTopUpValue.toLocaleString('en-IN')} to Vault (New Available: ₹{previewNewAvailable.toLocaleString('en-IN')})</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white dark:text-black" />
                    <span>Update Storage Ceiling to ₹{activeFixedCapValue.toLocaleString('en-IN')}</span>
                  </>
                )}
              </button>

              {isActive && (
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={loading}
                  className="px-4 py-3 rounded-2xl bg-[#F0ECE4] dark:bg-white/10 hover:bg-[#EAE6DE] dark:hover:bg-white/20 text-[#1F2421] dark:text-white border border-[#DFD9CE] dark:border-white/10 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                  title="Revoke active token & sweep all funds to bank"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Revoke</span>
                </button>
              )}
            </div>
            <p className="text-[10.5px] text-[#8F8A7E] dark:text-[#64748B] text-center mt-2 font-mono">
              NPCI e-Mandate • Tokenized • Revoking sweeps 100% of remaining funds back to your bank account with 0 fees
            </p>
          </div>
        </div>

        {/* Right (5 cols): Itemized Settlements Billed Against This Token */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 shadow-2xs space-y-3 flex flex-col transition-colors duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[#DFD9CE] dark:border-white/10">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-[#1F2421] dark:text-[#F8FAFC]" />
              <h3 className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] uppercase tracking-wider">
                Vault Settlement History
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold text-[#6E736D] dark:text-[#94A3B8] bg-[#F0ECE4] dark:bg-[#171A21] px-2.5 py-0.5 rounded-full border border-[#DFD9CE] dark:border-white/10">
              {orders.length} Settled
            </span>
          </div>

          <div className="space-y-2 pt-1 overflow-y-auto max-h-[480px] pr-1">
            {orders.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 text-center space-y-2">
                <Lock className="w-5 h-5 text-[#8F8A7E] dark:text-[#64748B] mx-auto" />
                <p className="text-xs font-medium text-[#1F2421] dark:text-[#F8FAFC]">No orders billed yet</p>
                <p className="text-[11px] text-[#6E736D] dark:text-[#94A3B8]">Autonomous checkouts will appear here with instant 0-OTP settlement.</p>
              </div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.order_id}
                  className="p-3 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 flex items-center justify-between text-xs font-mono hover:bg-[#EAE6DE] dark:hover:bg-[#1E222C] transition"
                >
                  <div className="min-w-0 pr-2">
                    <h5 className="font-bold text-[#1F2421] dark:text-[#F8FAFC] truncate font-sans text-xs">
                      {ord.product?.name || ord.item_name || 'Autonomous Purchase'}
                    </h5>
                    <span className="text-[10px] text-[#8F8A7E] dark:text-[#94A3B8] block truncate">
                      {ord.order_id} • {ord.merchant_id === 'prime-gadgets' ? 'Flipkart' : ord.merchant_id === 'meesho-direct' ? 'Meesho' : 'Amazon'}
                    </span>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-[#1F2421] dark:text-[#F8FAFC] block">₹{ord.amount?.toLocaleString('en-IN') || ord.amount}</span>
                    <span className="text-[9px] text-[#1F2421] dark:text-white font-bold block">0-OTP</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 🚀 CELEBRATORY SUCCESS & FULL BANK REFUND CONFIRMATION (PORTAL)            */}
      {/* ========================================================================= */}
      {container && showSuccessModal && lastActionResult && createPortal(
        <div
          onClick={() => setShowSuccessModal(false)}
          className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center p-4 bg-black/75 backdrop-blur-md text-[#1F2421] dark:text-[#F8FAFC] overflow-y-auto animate-fade-in"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#FAF8F5] dark:bg-[#14161F] border border-[#DFD9CE] dark:border-white/10 shadow-2xl p-6 sm:p-7 space-y-4 my-auto animate-scale-in text-center"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-2xs border ${
              lastActionResult.type === 'revoke'
                ? 'bg-[#F0ECE4] dark:bg-[#1E222D] border-[#DFD9CE] dark:border-white/10 text-[#1F2421] dark:text-white'
                : 'bg-[#27272A] dark:bg-white/10 border-[#27272A] dark:border-white/20 text-white'
            }`}>
              {lastActionResult.type === 'revoke' ? (
                <Building2 className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              )}
            </div>

            <div>
              <h3 className="font-bold text-base text-[#1F2421] dark:text-[#F8FAFC]">
                {lastActionResult.type === 'revoke'
                  ? `Mandate Revoked & ₹${(lastActionResult.creditedAmount || 0).toLocaleString('en-IN')} Credited to Bank!`
                  : lastActionResult.type === 'topup' 
                  ? 'Vault Funds Added Successfully!' 
                  : 'Storage Capacity Updated!'}
              </h3>
              <p className="text-xs text-[#6E736D] dark:text-[#94A3B8] mt-1">
                {lastActionResult.type === 'revoke'
                  ? `All unspent vault funds (₹${(lastActionResult.creditedAmount || 0).toLocaleString('en-IN')}) have been 100% credited back to ${lastActionResult.vpa}.`
                  : lastActionResult.type === 'topup'
                  ? `Added +₹${(lastActionResult.addAmount || 0).toLocaleString('en-IN')} to your available balance.`
                  : `Storage capacity limit set to ₹${(lastActionResult.newCeiling || storageCeiling).toLocaleString('en-IN')}. Available funds: ₹${(lastActionResult.newAvailable || 0).toLocaleString('en-IN')}.`}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F0ECE4] dark:bg-[#1A1D27] border border-[#DFD9CE] dark:border-white/10 font-mono text-xs space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-[#6E736D] dark:text-[#94A3B8]">AVAILABLE BALANCE:</span>
                <span className={`font-black ${lastActionResult.type === 'revoke' ? 'text-[#1F2421] dark:text-[#F8FAFC]' : 'text-[#1F2421] dark:text-white'}`}>
                  ₹{Number(lastActionResult.newAvailable || 0).toLocaleString('en-IN')} INR
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6E736D] dark:text-[#94A3B8]">STORAGE CEILING:</span>
                <span className="font-bold text-[#1F2421] dark:text-[#F8FAFC]">
                  ₹{Number(lastActionResult.newCeiling || storageCeiling).toLocaleString('en-IN')} INR
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-[#8F8A7E] dark:text-[#94A3B8]">
                <span>STATUS:</span>
                <span className={`font-bold ${lastActionResult.type === 'revoke' ? 'text-[#1F2421] dark:text-[#F8FAFC]' : 'text-[#1F2421] dark:text-white'}`}>
                  {lastActionResult.type === 'revoke' ? 'REVOKED • FUNDS REFUNDED ✓' : 'NPCI e-Mandate Active ✓'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#27272A] hover:bg-[#18181B] dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black font-bold text-xs shadow-2xs transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>,
        container
      )}

    </div>
  );
}
