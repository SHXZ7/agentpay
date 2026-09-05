'use client';
import Link from 'next/link';
import { ArrowLeft, Store } from 'lucide-react';
import MerchantPortalDashboard from '@/components/MerchantPortalDashboard';

export default function MerchantPortalPage() {
  return (
    <div className="min-h-screen bg-[#F4F0E8] text-[#1C1917] font-sans p-4 sm:p-6 selection:bg-gold-500 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Navbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#EBE6DA]">
          <div className="flex items-center space-x-3 min-w-0">
            <Link
              href="/"
              className="shrink-0 p-2 rounded-xl bg-[#FDFBF7] hover:bg-[#EBE6DA] text-[#78716C] hover:text-[#1C1917] border border-[#E0D8C8] transition shadow-2xs"
              title="Back to AI Studio"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h1 className="text-sm font-bold text-[#1C1917] uppercase tracking-tight truncate">
                MERCHANT CONTROL PORTAL
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium whitespace-nowrap">
                NPCI UAP • AP2 • x402
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs shrink-0 self-end sm:self-auto">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl bg-[#FDFBF7] hover:bg-[#EBE6DA] text-[#1C1917] font-bold text-xs border border-[#E0D8C8] transition shadow-2xs whitespace-nowrap"
            >
              Open AI Studio →
            </Link>
          </div>
        </div>

        {/* Dashboard Component */}
        <MerchantPortalDashboard />

      </div>
    </div>
  );
}
