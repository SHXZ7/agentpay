'use client';
import { useState } from 'react';
import { Sparkles, TrendingUp, Plus, Check, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function UpsellBanner({ upsell, mandate, onBuyUpsell, isBuying }) {
  const [bought, setBought] = useState(false);

  if (!upsell || !upsell.product) return null;

  const { product, original_price, bundle_discount_price, savings_percent, rationale, fits_remaining_budget } = upsell;

  const handleBuy = async () => {
    if (bought || isBuying) return;
    try {
      if (onBuyUpsell) await onBuyUpsell(product.id);
      setBought(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (err) {
      console.error("Upsell purchase error:", err);
    }
  };

  return (
    <div className="rounded-2xl border border-gold-300 bg-[#FDFBF7] p-4 shadow-2xs relative overflow-hidden">
      <div className="flex items-center space-x-1.5 text-[11px] font-bold text-gold-700 uppercase tracking-wider mb-2">
        <Sparkles className="w-3.5 h-3.5 text-gold-600 fill-current" />
        <span>AI Growth Recommendation • +{savings_percent || 10}% Bundle Savings</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-xl flex-shrink-0">
            {product.image || '🎁'}
          </div>
          <div>
            <h4 className="font-bold text-[#1C1917] text-xs">{product.name}</h4>
            <p className="text-[11px] text-[#78716C] leading-snug">{rationale}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-center">
          <div className="text-right">
            <span className="text-sm font-bold text-[#1F2421] dark:text-white block">₹{bundle_discount_price}</span>
            <span className="text-[10px] text-[#A8A29E] line-through">₹{original_price}</span>
          </div>

          <button
            onClick={handleBuy}
            disabled={bought || isBuying}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition shadow-xs ${
              bought
                ? 'bg-[#F0ECE4] dark:bg-white/10 text-[#1F2421] dark:text-white border border-[#DFD9CE] dark:border-white/20 cursor-default'
                : 'bg-[#27272A] hover:bg-[#18181B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black'
            }`}
          >
            {isBuying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Authorizing...</span>
              </>
            ) : bought ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Added to Order!</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add via Mandate</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
