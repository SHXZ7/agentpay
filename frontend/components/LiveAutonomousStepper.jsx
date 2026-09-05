'use client';
import AITaskList from '@/components/ui/ai-task-list';
import MultiAgentNegotiationCard from './MultiAgentNegotiationCard';
import { Tag, ShieldCheck, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

export default function LiveAutonomousStepper({
  flow,
  isRunning
}) {
  if (!flow) return null;

  const {
    currentStep = 1,
    prompt = '',
    discoveredOffers = [],
    chosenOffer = null,
    negotiation = null,
    mandate = null,
    checkout = null
  } = flow;

  const tasks = [
    {
      id: "scan",
      label: `Scan merchant network for "${prompt || 'product'}"`,
      note: "2 stores",
      status: currentStep === 1 ? "running" : currentStep > 1 ? "done" : "pending",
      children: [
        { 
          id: "amz", 
          label: "Query Amazon India Prime Catalog", 
          note: "1,050+ items",
          status: currentStep > 1 ? "done" : currentStep === 1 ? "running" : "pending" 
        },
        { 
          id: "fk", 
          label: "Query Flipkart Assured Catalog", 
          note: "1,050+ items",
          status: currentStep > 1 ? "done" : currentStep === 1 ? "running" : "pending" 
        },
      ]
    },
    {
      id: "compare",
      label: "Evaluate pricing, warranty & 1-day delivery speed",
      note: "best value",
      status: currentStep === 2 ? "running" : currentStep > 2 ? "done" : "pending",
    },
    {
      id: "negotiate",
      label: "Autonomous Dynamic Coupon Negotiation & Price Match (ACP Protocol)",
      note: negotiation ? `Saved ₹${negotiation.savings || 50}` : "in progress",
      status: currentStep === 3 ? "running" : currentStep > 3 ? "done" : "pending",
    },
    {
      id: "mandate",
      label: "Acquire AP2 Cryptographic Permission Slip & HMAC-SHA256 Token",
      note: mandate ? "AP2 verified" : "in progress",
      status: currentStep === 4 ? "running" : currentStep > 4 ? "done" : "pending",
    },
    {
      id: "checkout",
      label: "Resolve x402 Payment Challenge via Razorpay Headless Autopay",
      note: checkout?.success ? "HTTP 200 Settled" : checkout?.error ? "intercepted" : "HTTP 402 Handshake",
      status: currentStep >= 5 
        ? (checkout?.error ? "failed" : checkout?.success ? "done" : "running") 
        : "pending",
    }
  ];

  return (
    <div className="space-y-3 font-sans">
      {/* Claude / GPT-style Plan Tracker */}
      <AITaskList
        label="Autonomous Execution Sequence"
        tasks={tasks}
        className="border-[#DFD9CE] bg-[#FAF8F5]"
      />

      {/* Discovered Price Match Highlight (when verified offer is resolved) */}
      {currentStep >= 3 && chosenOffer && (
        <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#18181C] border border-[#DFD9CE] dark:border-[#27272C] text-xs space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#1F2421] dark:text-[#F4F4F5]">Merchant Offer Selected:</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F0ECE4] dark:bg-white/10 text-[#1F2421] dark:text-white border border-[#DFD9CE] dark:border-white/20 font-bold">
              {chosenOffer?.merchant_name || "Amazon India (Prime ✓)"}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#F0ECE4] dark:bg-[#232328] border border-[#DFD9CE] dark:border-[#27272C] flex items-center justify-between">
            <div>
              <span className="font-semibold text-[#1F2421] dark:text-[#F4F4F5] block">
                {chosenOffer?.name || chosenOffer?.product_name || "Verified Offer"}
              </span>
              <span className="text-[10px] text-[#6E736D] dark:text-[#A1A1AA]">Free 1-Day Prime Delivery • Genuine Warranty</span>
            </div>
            {chosenOffer?.price ? (
              <div className="text-right ml-3 flex-shrink-0">
                <span className="text-sm font-black text-[#1F2421] dark:text-[#F4F4F5] font-mono">₹{chosenOffer.price.toLocaleString()}</span>
              </div>
            ) : (
              <span className="text-[11px] font-mono text-[#8F8A7E] animate-pulse">Checking price...</span>
            )}
          </div>
        </div>
      )}

      {/* Multi-Agent ACP Swarm Dialogue (Stage 3+) */}
      {currentStep >= 3 && negotiation?.dialogue && (
        <MultiAgentNegotiationCard negotiation={negotiation} />
      )}

      {/* Settlement Confirmation Card (Stage 5) */}
      {currentStep >= 5 && checkout?.success && (
        <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#18181C] border border-[#DFD9CE] dark:border-white/20 text-[#1F2421] dark:text-white text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#1F2421] dark:text-white" />
            <span className="font-semibold">Razorpay Order Created: {checkout.order?.order_id}</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F0ECE4] dark:bg-white/10 border border-[#DFD9CE] dark:border-white/20">
            SETTLED (0-OTP)
          </span>
        </div>
      )}
    </div>
  );
}
