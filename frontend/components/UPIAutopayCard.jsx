'use client';
import { useState } from 'react';
import { ShieldCheck, Zap, Power } from 'lucide-react';

export default function UPIAutopayCard({
  autopay,
  onOpenModal,
  onRevoke
}) {
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      await fetch('http://localhost:5000/autopay/revoke', { method: 'POST' });
      if (onRevoke) onRevoke();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRevoking(false);
    }
  };

  const isActive = autopay && autopay.is_active;

  return (
    <div className={`p-6 rounded-3xl border transition-all duration-200 ${
      isActive
        ? 'bg-[#FAF8F5] dark:bg-[#111318] border-[#DFD9CE] dark:border-white/10 shadow-2xs'
        : 'bg-[#FAF8F5]/90 dark:bg-[#111318]/90 border-[#DFD9CE] dark:border-white/10'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#DFD9CE] dark:border-white/10">
        <div className="flex items-center space-x-3">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm shadow-2xs ${
            isActive ? 'bg-[#F0ECE4] dark:bg-[#171A21] text-[#1F2421] dark:text-[#F8FAFC] border border-[#DFD9CE] dark:border-white/10' : 'bg-[#EAE6DE] dark:bg-white/10 text-[#6E736D] dark:text-[#94A3B8]'
          }`}>
            <Zap className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] uppercase tracking-wider">
              UPI Autopay Vault
            </h3>
            <p className="text-[11px] text-[#6E736D] dark:text-[#94A3B8]">Headless 0-OTP Recurring Mandate</p>
          </div>
        </div>
      </div>

      {!isActive ? (
        <div className="text-center py-4 px-2 space-y-3">
          <p className="text-xs text-[#6E736D] dark:text-[#94A3B8] max-w-sm mx-auto">
            Authorize a secure NPCI recurring e-mandate. Allows your AI agent to negotiate &amp; checkout automatically without interrupting you for OTPs.
          </p>
          <button
            onClick={onOpenModal}
            className="px-4 py-2.5 rounded-2xl bg-[#27272A] hover:bg-[#18181B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-bold text-xs shadow-2xs transition inline-flex items-center space-x-2 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Setup UPI Autopay (₹5,000 Limit)</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#6E736D] dark:text-[#94A3B8]">
            <span>ISSUER: <strong className="text-[#1F2421] dark:text-[#F8FAFC]">UPI Autopay (NPCI e-Mandate)</strong></span>
            <span>FREQUENCY: <strong className="text-[#1F2421] dark:text-[#F8FAFC]">MONTHLY</strong></span>
          </div>

          {(() => {
            const maxLimit = Number(autopay.max_limit || autopay.max_amount || 5000);
            const spent = Number(autopay.spent_amount !== undefined ? autopay.spent_amount : (maxLimit - (autopay.remaining_limit ?? maxLimit)));
            const remaining = Number(autopay.remaining_limit !== undefined ? autopay.remaining_limit : Math.max(0, maxLimit - spent));
            const pct = Math.max(0, Math.min(100, (remaining / maxLimit) * 100));
            const isExhausted = remaining <= 0;

            return (
              <div className="p-4 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6E736D] dark:text-[#94A3B8] font-mono">VPA Handle</span>
                  <span className="font-bold text-[#1F2421] dark:text-[#F8FAFC] font-mono">Amount Left for Using</span>
                </div>
                
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-[#1F2421] dark:text-[#F8FAFC] font-bold text-xs">
                    {autopay.upi_vpa || autopay.vpa || 'shopper@oksbi'}
                  </span>
                  <div className="text-right">
                    <span className={`font-black text-base font-mono ${isExhausted ? 'text-amber-800 dark:text-amber-400' : 'text-[#1F2421] dark:text-[#F8FAFC]'}`}>
                      ₹{remaining.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-[#6E736D] dark:text-[#94A3B8] block font-mono">
                      of ₹{maxLimit.toLocaleString('en-IN')} Cap
                    </span>
                  </div>
                </div>

                {/* Progress Bar of Available Funds */}
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-[#E5E0D5] dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isExhausted ? 'bg-amber-600' : 'bg-[#27272A] dark:bg-white'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#6E736D] dark:text-[#94A3B8] pt-0.5">
                    <span>₹{spent.toLocaleString('en-IN')} Total Spent</span>
                    <span className={`font-bold px-1.5 py-0.2 rounded border ${
                      isExhausted 
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/40' 
                        : 'bg-[#F0ECE4] dark:bg-white/10 text-[#1F2421] dark:text-white border-[#DFD9CE] dark:border-white/20'
                    }`}>
                      {isExhausted ? 'Limit Exhausted' : `${pct.toFixed(0)}% Available`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="pt-2 border-t border-[#DFD9CE] dark:border-white/10 flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#8F8A7E] dark:text-[#64748B] truncate">
              TOKEN: {autopay.autopay_id || 'tok_rzp_autopay'}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#EAE5D9] dark:bg-white/10 text-[#44403C] dark:text-[#94A3B8] font-semibold">
              AP2 Vault Secured
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
