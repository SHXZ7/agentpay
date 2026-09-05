'use client';
import { ShieldCheck, Tag, Clock, Store, Lock } from 'lucide-react';

export default function MandateInspector({ mandate, onOpenProfile }) {
  if (!mandate) {
    return (
      <div className="rounded-3xl border border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318] p-6 shadow-2xs transition-colors duration-200">
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#DFD9CE] dark:border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-[#F0ECE4] dark:bg-white/10 border border-[#DFD9CE] dark:border-white/20 text-[#6E736D] dark:text-[#94A3B8] flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] uppercase tracking-wider">AP2 Spending Permission Guardrail</h2>
              <p className="text-[11px] text-[#6E736D] dark:text-[#94A3B8]">Cryptographic Autonomous Spending Token</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#EAE6DE] dark:bg-white/10 text-[#6E736D] dark:text-[#94A3B8] border border-[#DFD9CE] dark:border-white/20 font-semibold">
            STANDBY
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 text-center space-y-2">
          <Lock className="w-5 h-5 text-[#8F8A7E] dark:text-[#64748B] mx-auto" />
          <p className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC]">No Active Mandate Token Issued</p>
          <p className="text-[11px] text-[#6E736D] dark:text-[#94A3B8] max-w-sm mx-auto">
            When you ask AgentPay AI to purchase an item, a signed AP2 security token is automatically generated to authorize 0-OTP payment within your spending limit.
          </p>
        </div>
      </div>
    );
  }

  const merchantLabel = mandate.merchant_id === 'rzp_merchant_acp_demo' || !mandate.merchant_id
    ? 'Amazon India & Flipkart Assured'
    : mandate.merchant_id === 'aura-tech'
    ? 'Amazon India (Aura Tech)'
    : mandate.merchant_id === 'prime-gadgets'
    ? 'Flipkart Assured'
    : mandate.merchant_id;

  const validTime = mandate.valid_until 
    ? new Date(mandate.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '15 Minutes';

  const categories = Array.isArray(mandate.allowed_categories) && mandate.allowed_categories.length > 0
    ? mandate.allowed_categories
    : ['All Categories'];

  const shortSig = mandate.signature 
    ? `${mandate.signature.slice(0, 10)}...${mandate.signature.slice(-8)}`
    : 'HMAC-SHA256 Signed';

  return (
    <div className="rounded-3xl border border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318] p-6 shadow-2xs space-y-4 transition-colors duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#DFD9CE] dark:border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-2xl bg-[#27272A] dark:bg-white border border-[#27272A] dark:border-white text-white dark:text-black flex items-center justify-center shadow-2xs">
            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] uppercase tracking-wider">AP2 Spending Permission Guardrail</h2>
            </div>
            <p className="text-[11px] text-[#6E736D] dark:text-[#94A3B8]">
              Cryptographic spending permission issued for autonomous shopping
            </p>
          </div>
        </div>
      </div>

      {/* 3 Key Permission Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        
        {/* Card 1: Per-Item Limit */}
        <div className="p-4 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-[#6E736D] dark:text-[#94A3B8]">
              <span className="font-mono text-[11px]">Per-Item Limit</span>
              <span className="text-[10px] font-bold text-[#1F2421] dark:text-white bg-white dark:bg-white/10 px-1.5 py-0.2 rounded border border-[#DFD9CE] dark:border-white/20 shadow-2xs">
                Enforced
              </span>
            </div>
            <div className="font-black text-base text-[#1F2421] dark:text-[#F8FAFC] font-mono">
              ₹{Number(mandate.max_budget || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <p className="text-[10px] text-[#6E736D] dark:text-[#94A3B8] leading-tight">
            Maximum price allowed for a single autonomous purchase.
          </p>
        </div>

        {/* Card 2: Permitted Categories */}
        <div className="p-4 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 space-y-2 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-1.5 text-xs text-[#6E736D] dark:text-[#94A3B8]">
              <Tag className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px]">Approved Categories</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {categories.slice(0, 4).map((c, i) => (
                <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-white dark:bg-white/10 border border-[#DFD9CE] dark:border-white/15 text-[#1F2421] dark:text-[#F8FAFC] capitalize shadow-2xs">
                  ✓ {c}
                </span>
              ))}
              {categories.length > 4 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-white dark:bg-white/10 text-[#6E736D] dark:text-[#94A3B8]">
                  +{categories.length - 4} more
                </span>
              )}
            </div>
          </div>
          <p className="text-[10px] text-[#6E736D] dark:text-[#94A3B8] leading-tight">
            AI is strictly blocked from purchasing unapproved categories.
          </p>
        </div>

        {/* Card 3: Stores & Expiry */}
        <div className="p-4 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 space-y-2 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6E736D] dark:text-[#94A3B8] font-mono text-[11px]">Storefront Scope</span>
              <span className="text-[10px] font-mono text-[#1F2421] dark:text-[#F8FAFC] font-bold">
                Valid till {validTime}
              </span>
            </div>
            <div className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] flex items-center space-x-1.5">
              <Store className="w-3.5 h-3.5 text-[#6E736D] dark:text-[#94A3B8]" />
              <span className="truncate">{merchantLabel}</span>
            </div>
          </div>
          <p className="text-[10px] text-[#6E736D] dark:text-[#94A3B8] leading-tight">
            Cryptographically bounded to verified partner networks.
          </p>
        </div>

      </div>

      {/* Cryptographic Trust Footer */}
      <div className="p-3 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex items-center space-x-2 text-[#1F2421] dark:text-[#F8FAFC]">
          <span className="w-2 h-2 rounded-full bg-[#27272A] dark:bg-white"></span>
          <span className="font-semibold">Razorpay AP2 Fiduciary Token Signed (HMAC-SHA256)</span>
        </div>
        <div className="text-[#6E736D] dark:text-[#94A3B8] text-[10px] flex items-center space-x-2">
          <span>Sig: <strong className="text-[#1F2421] dark:text-[#F8FAFC] font-mono">{shortSig}</strong></span>
          <span className="px-2 py-0.5 rounded bg-white dark:bg-white/15 text-[#1F2421] dark:text-white font-bold border border-[#DFD9CE] dark:border-white/20 shadow-2xs">
            100% Safe
          </span>
        </div>
      </div>
    </div>
  );
}
