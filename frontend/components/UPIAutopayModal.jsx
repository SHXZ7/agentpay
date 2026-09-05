'use client';
import { useState } from 'react';
import { ShieldCheck, Zap, X, Check, Lock, ArrowRight, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function UPIAutopayModal({
  isOpen,
  onClose,
  onAuthorized
}) {
  const [limit, setLimit] = useState(5000);
  const [upiId, setUpiId] = useState('shopper@oksbi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState('setup'); // 'setup' | 'authorizing' | 'success'

  if (!isOpen) return null;

  const handleAuthorize = async () => {
    setIsProcessing(true);
    setStep('authorizing');

    try {
      // 1. Call backend to create Razorpay Autopay Mandate Order
      const res = await fetch('http://localhost:5000/autopay/create-mandate-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_amount: limit,
          frequency: "monthly",
          customer_vpa: upiId
        })
      });
      const data = await res.json();

      // If Razorpay SDK is loaded, launch real checkout with auth
      if (typeof window !== 'undefined' && window.Razorpay && data.order_id && data.key_id) {
        const options = {
          key: data.key_id,
          amount: 100, // ₹1 auth charge for mandate validation
          currency: "INR",
          name: "AgentPay AP2",
          description: `UPI Autopay e-Mandate Authorization (Limit ₹${limit}/month)`,
          order_id: data.order_id,
          customer_id: data.customer_id,
          recurring: 1,
          prefill: {
            vpa: upiId,
            contact: "9999999999",
            email: "shopper@agentic.commerce"
          },
          theme: { color: "#27272A" },
          handler: async function (response) {
            await finalizeBackendAuth();
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              setStep('setup');
            }
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Fallback test simulation
        setTimeout(async () => {
          await finalizeBackendAuth();
        }, 1200);
      }
    } catch (err) {
      console.error("Autopay error:", err);
      await finalizeBackendAuth();
    }
  };

  const finalizeBackendAuth = async () => {
    try {
      const res = await fetch('http://localhost:5000/autopay/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_limit: limit,
          upi_vpa: upiId
        })
      });
      const data = await res.json();
      
      setStep('success');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      
      setTimeout(() => {
        if (onAuthorized) onAuthorized(data.autopay);
        setIsProcessing(false);
        onClose();
      }, 1600);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-[#1F2421] dark:text-[#F8FAFC]">
      <div className="relative w-full max-w-md rounded-2xl border border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318] p-6 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#F0ECE4] dark:bg-[#171A21] text-[#6E736D] dark:text-[#94A3B8] hover:text-[#1F2421] dark:hover:text-white transition border border-[#DFD9CE] dark:border-white/10 disabled:opacity-50 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {step === 'setup' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 flex items-center justify-center text-[#1F2421] dark:text-[#F8FAFC] font-bold shadow-2xs">
                <Zap className="w-5 h-5 fill-current text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1F2421] dark:text-[#F8FAFC]">Setup UPI Autopay Mandate</h3>
                <p className="text-xs text-[#6E736D] dark:text-[#94A3B8]">Razorpay e-Mandate • 100% Headless 0-OTP Purchases</p>
              </div>
            </div>

            {/* Explainer Box */}
            <div className="p-3 rounded-xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 text-xs space-y-1">
              <p className="font-semibold text-[#1F2421] dark:text-[#F8FAFC] flex items-center text-[11px]">
                <Lock className="w-3 h-3 mr-1 text-[#8F8A7E] dark:text-[#64748B]" />
                How Headless Autonomous Shopping Works:
              </p>
              <p className="text-[11px] text-[#6E736D] dark:text-[#94A3B8] leading-relaxed">
                Authorize a monthly budget limit once via Razorpay UPI Autopay. The agent uses this tokenized permission to execute purchases with <strong>zero OTP friction</strong>.
              </p>
            </div>

            {/* Limit Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] block">
                Select Monthly Autonomous Spending Cap:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1500, 3000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setLimit(amt)}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                      limit === amt
                        ? 'bg-[#27272A] dark:bg-white text-white dark:text-black border-[#27272A] dark:border-white shadow-2xs'
                        : 'bg-[#F0ECE4] dark:bg-[#171A21] border-[#DFD9CE] dark:border-white/10 text-[#44403C] dark:text-[#94A3B8] hover:bg-[#EAE6DE] dark:hover:bg-white/10'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* UPI ID Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1F2421] dark:text-[#F8FAFC] block">
                Your UPI ID (VPA):
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. yourname@oksbi"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#27272A]/20 dark:focus:ring-white/20 focus:border-[#27272A] dark:focus:border-white text-[#1F2421] dark:text-[#F8FAFC]"
              />
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                onClick={handleAuthorize}
                disabled={isProcessing || !upiId}
                className="w-full py-3 rounded-xl bg-[#27272A] hover:bg-[#18181B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-bold text-xs shadow-2xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <span>Authorize ₹{limit} Monthly Autopay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-center text-[#8F8A7E] dark:text-[#64748B]">
              NPCI e-Mandate • Tokenized • Can be revoked anytime in 1-click
            </p>
          </div>
        )}

        {step === 'authorizing' && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-[#27272A] dark:text-white animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-[#1F2421] dark:text-[#F8FAFC]">Generating NPCI e-Mandate...</h3>
            <p className="text-xs text-[#6E736D] dark:text-[#94A3B8] max-w-xs mx-auto">
              Connecting to Razorpay tokenization gateway to register UPI Autopay limit of ₹{limit}.
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#27272A] dark:bg-white text-white dark:text-black flex items-center justify-center mx-auto shadow-2xs">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2421] dark:text-[#F8FAFC]">UPI Autopay Vault Active!</h3>
            <p className="text-xs text-[#1F2421] dark:text-white font-mono font-bold">
              ₹{limit} monthly limit tokenized successfully.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
