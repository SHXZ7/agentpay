'use client';
import { useState } from 'react';
import { 
  Bot, 
  Store, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Tag, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Code,
  Zap
} from 'lucide-react';

export default function MultiAgentNegotiationCard({ negotiation }) {
  const [showJson, setShowJson] = useState(false);

  if (!negotiation || !negotiation.dialogue || negotiation.dialogue.length === 0) {
    return null;
  }

  const { dialogue, product_name, original_price, negotiated_price, total_savings, applied_coupon, merchant_name } = negotiation;

  return (
    <div className="my-3 rounded-2xl border border-[#DFD9CE] dark:border-[#282A34] bg-white dark:bg-[#14151C] shadow-sm overflow-hidden text-xs text-[#1F2421] dark:text-[#F4F4F5] transition-colors duration-200">
      
      {/* 1. Header: Multi-Agent ACP Protocol Banner */}
      <div className="px-4 py-3 bg-[#FAF8F5] dark:bg-[#181A22] border-b border-[#DFD9CE] dark:border-[#282A34] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-[#18181B] dark:bg-white/10 text-white dark:text-white border border-transparent dark:border-white/20 flex items-center justify-center text-xs shadow-2xs">
            🤖
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-[12.5px] text-[#1C1917] dark:text-[#F8FAFC]">Multi-Agent ACP Protocol Handshake</span>
              <span className="text-[9px] font-mono font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/60">
                A2A Swarm
              </span>
            </div>
            <span className="text-[10.5px] text-[#78716C] dark:text-[#94A3B8] block">
              Autonomous Buyer Agent ⇄ Storefront Merchant Agent ⇄ Razorpay Escrow
            </span>
          </div>
        </div>

        {total_savings > 0 && (
          <div className="flex items-center space-x-1.5 bg-[#F0ECE4] dark:bg-white/10 text-[#1F2421] dark:text-white px-2.5 py-1 rounded-xl border border-[#DFD9CE] dark:border-white/20 font-mono font-bold text-xs shadow-2xs">
            <Tag className="w-3.5 h-3.5" />
            <span>-₹{total_savings} Discount Won</span>
          </div>
        )}
      </div>

      {/* 2. Turn-by-Turn Agent Swarm Dialogue */}
      <div className="p-4 space-y-3 bg-[#FCFAF6]/60 dark:bg-[#0E0F14]">
        {dialogue.map((turn, idx) => {
          const isBuyer = turn.speaker === 'BUYER_AGENT';
          const isMerchant = turn.speaker === 'MERCHANT_AGENT';
          const isGatekeeper = turn.speaker === 'RAZORPAY_GATEKEEPER';

          return (
            <div 
              key={turn.id || idx}
              className={`p-3.5 rounded-xl border transition-all duration-150 shadow-2xs ${
                isBuyer 
                  ? 'bg-white dark:bg-[#1A1C24] border-[#E5E0D4] dark:border-[#2C2F3C] ml-0 mr-4' 
                  : isMerchant
                  ? 'bg-[#FFF9FB] dark:bg-[#201520] border-[#F9D0E3] dark:border-pink-900/40 ml-4 mr-0'
                  : 'bg-[#F0ECE4] dark:bg-[#1C1F2A] border-[#DFD9CE] dark:border-white/15 mx-2'
              }`}
            >
              {/* Agent Badge & Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5 dark:border-white/10 text-[11px]">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-[#1C1917] dark:text-[#F8FAFC]">{turn.agent_name}</span>
                  <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded ${
                    isBuyer 
                      ? 'bg-stone-100 dark:bg-[#262834] text-stone-700 dark:text-stone-300 border dark:border-stone-700/50' 
                      : isMerchant 
                      ? 'bg-[#FFF0F6] dark:bg-pink-950/60 text-[#9F1239] dark:text-pink-300 border border-pink-200 dark:border-pink-800/40' 
                      : 'bg-[#EAE6DE] dark:bg-white/10 text-[#1F2421] dark:text-white border border-[#DFD9CE] dark:border-white/20'
                  }`}>
                    {turn.badge}
                  </span>
                </div>
                <span className="font-mono text-[9px] text-[#A8A29E] dark:text-[#94A3B8]">
                  {turn.intent}
                </span>
              </div>

              {/* Message Payload */}
              <p className="text-[12px] text-[#44403C] dark:text-[#E2E8F0] leading-relaxed">
                {turn.message}
              </p>

              {/* Coupon Pill on Merchant Grant */}
              {isMerchant && turn.coupon_code && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#2D1625] border border-[#F9D0E3] dark:border-pink-700/40 text-[11px] font-mono text-[#9F1239] dark:text-pink-300 shadow-2xs">
                  <Tag className="w-3.5 h-3.5 text-[#F43397] dark:text-pink-400" />
                  <span>Coupon Applied: <strong>{turn.coupon_code}</strong> (-₹{turn.discount_value})</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Summary Price Reduction Footer & Protocol Inspector */}
      <div className="px-4 py-2.5 bg-[#FAF8F5] dark:bg-[#181A22] border-t border-[#DFD9CE] dark:border-[#282A34] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 font-mono">
          <span className="text-[#78716C] dark:text-[#94A3B8] line-through">₹{original_price}</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#78716C] dark:text-[#94A3B8]" />
          <span className="font-black text-[#1C1917] dark:text-[#F8FAFC] text-sm">₹{negotiated_price}</span>
          {applied_coupon && (
            <span className="text-[10.5px] font-bold text-[#1F2421] dark:text-white bg-[#EAE6DE] dark:bg-white/10 border border-[#DFD9CE] dark:border-white/20 px-1.5 py-0.2 rounded">
              {applied_coupon.code}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="text-[11px] font-bold text-[#78716C] dark:text-[#94A3B8] hover:text-[#1C1917] dark:hover:text-white flex items-center gap-1 cursor-pointer transition"
        >
          <Code className="w-3.5 h-3.5" />
          <span>{showJson ? 'Hide ACP Protocol' : 'Inspect ACP Protocol'}</span>
          {showJson ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* 4. Collapsible Raw ACP JSON-RPC Payload */}
      {showJson && (
        <div className="p-3 bg-[#18181B] dark:bg-[#0A0B0E] text-[#CBD5E1] dark:text-[#CBD5E1] font-mono text-[10.5px] border-t border-stone-800 dark:border-white/10 overflow-x-auto max-h-48">
          <pre>{JSON.stringify(negotiation, null, 2)}</pre>
        </div>
      )}

    </div>
  );
}
