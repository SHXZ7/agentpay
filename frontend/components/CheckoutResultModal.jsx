'use client';
import { CheckCircle2, AlertTriangle, X, ExternalLink, ShieldCheck, ShoppingBag, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

export default function CheckoutResultModal({ result, onClose, onLaunchRazorpayModal }) {
  if (!result) return null;

  const { success, order, error_code, reason, mandate, merchant_id, product } = result;

  useEffect(() => {
    if (success) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [success]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/40 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-[#E0D8C8] bg-[#FDFBF7] p-6 shadow-2xl text-[#1C1917]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#F4F0E8] text-[#78716C] hover:text-[#1C1917] transition border border-[#E0D8C8]"
        >
          <X className="w-4 h-4" />
        </button>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#27272A] dark:bg-white text-white dark:text-black flex items-center justify-center mx-auto text-xl font-bold shadow-2xs">
              ✓
            </div>

            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F0ECE4] dark:bg-white/10 text-[#1F2421] dark:text-white border border-[#DFD9CE] dark:border-white/20 uppercase font-semibold">
                AP2 Policy Compliant • 0-OTP Autopay Settled
              </span>
              <h3 className="text-base font-bold text-[#1C1917] dark:text-[#F8FAFC] mt-2">Autonomous Purchase Successful</h3>
              <p className="text-xs text-[#78716C] dark:text-[#94A3B8] mt-0.5">Purchased from {merchant_id === 'aura-tech' ? 'Amazon India' : 'Flipkart'}</p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-3.5 rounded-2xl bg-[#FAF8F3] dark:bg-[#171A21] border border-[#EBE6DA] dark:border-white/10 text-xs space-y-2 text-left font-mono">
              <div className="flex justify-between">
                <span className="text-[#78716C] dark:text-[#94A3B8]">Order ID:</span>
                <strong className="text-[#1C1917] dark:text-[#F8FAFC]">{order?.order_id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C] dark:text-[#94A3B8]">Amount Paid:</span>
                <strong className="text-[#1F2421] dark:text-white text-sm font-bold">₹{order?.amount} INR</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C]">Mandate Bound:</span>
                <span className="text-[#57534E]">{order?.mandate_id || mandate?.mandate_id}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#EBE6DA]">
                <span className="text-[#78716C]">Receipt:</span>
                <span className="text-[#57534E]">{order?.receipt}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {onLaunchRazorpayModal && (
                <button
                  onClick={() => onLaunchRazorpayModal(order)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4 text-gold-400" />
                  <span>Launch Official Razorpay Modal Checkout</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="w-full py-2 px-4 rounded-xl bg-[#F4F0E8] hover:bg-[#EBE6DA] text-[#57534E] font-semibold text-xs transition border border-[#E0D8C8]"
              >
                Close &amp; Return to Studio
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-red-700 flex items-center justify-center mx-auto text-xl font-bold">
              ✕
            </div>

            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200 uppercase font-semibold">
                {error_code || 'CHECKOUT_BLOCKED'}
              </span>
              <h3 className="text-base font-bold text-[#1C1917] mt-2">Purchase Blocked by AP2 Gate</h3>
              <p className="text-xs text-red-800 mt-1 px-4 leading-relaxed font-sans">{reason}</p>
            </div>

            <div className="p-3 rounded-2xl bg-[#FAF8F3] border border-[#EBE6DA] text-xs text-left text-[#57534E] space-y-1">
              <span className="font-semibold text-[#1C1917] block">Why this happened:</span>
              <p className="text-[11px] text-[#78716C] leading-relaxed">
                The AP2 Gatekeeper strictly enforces cryptographic policy tokens. Unapproved categories or over-budget amounts are blocked with 0 crashes.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white font-bold text-xs transition shadow-xs"
            >
              Acknowledge &amp; Return
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
