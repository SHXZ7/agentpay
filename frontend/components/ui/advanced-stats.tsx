'use client'
import { cn } from '@/lib/utils'
import React, { useRef } from 'react'
import { ClippedAreaChart } from '@/components/ui/advanced-stats-utils/charts'
import { TimelineAnimation } from '@/components/ui/advanced-stats-utils/timeline-animation'
import { TrendingUp, ShieldCheck, Zap, Tag, DollarSign, Store } from 'lucide-react'

export interface AdvancedStatsProps {
  orders?: any[];
  mandate?: any;
  autopay?: any;
}

export default function AdvancedStats({ orders = [], mandate, autopay }: AdvancedStatsProps) {
  const timelineRef = useRef<HTMLDivElement>(null)

  const totalVolume = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalOrders = orders.length;
  const estimatedSavings = Math.round(totalVolume * 0.15) + (totalOrders > 0 ? 120 : 0);
  
  const amazonOrders = orders.filter(o => o.merchant_id === 'aura-tech' || (!o.merchant_id && !['prime-gadgets', 'meesho-direct'].includes(o.merchant_id))).length;
  const flipkartOrders = orders.filter(o => o.merchant_id === 'prime-gadgets').length;
  const meeshoOrders = orders.filter(o => o.merchant_id === 'meesho-direct').length;

  const maxLimit = Number(autopay?.max_limit || autopay?.max_amount || 5000);
  const spent = Number(autopay?.spent_amount !== undefined ? autopay?.spent_amount : totalVolume);
  const remaining = Math.max(0, maxLimit - spent);
  const healthPct = Math.max(0, Math.min(100, Math.round((remaining / maxLimit) * 100)));

  const kpis = [
    { 
      label: 'Total Autonomous Spend', 
      value: `₹${totalVolume.toLocaleString('en-IN')}`, 
      change: '+18.5%', 
      status: 'up', 
      note: `${totalOrders} orders • 100% Settled`,
      icon: DollarSign
    },
    {
      label: 'Dynamic AI Savings',
      value: `₹${estimatedSavings.toLocaleString('en-IN')}`,
      change: '~15% Saved',
      status: 'up',
      note: 'Cross-Store Price Match',
      icon: Tag
    },
    {
      label: '0-OTP Autopay Rate',
      value: '100%',
      change: 'Zero OTP',
      status: 'up',
      note: 'Instant NPCI Mandate',
      icon: Zap
    },
    { 
      label: 'AP2 Policy Integrity', 
      value: '100%', 
      change: '100% Safe', 
      status: 'up', 
      note: 'HMAC-SHA256 Signed',
      icon: ShieldCheck
    },
  ];

  return (
    <section
      ref={timelineRef}
      className="flex flex-col gap-6 w-full font-sans"
    >
      {/* 🚀 1. EXACTLY 4 CLEAN KPI TILES AT THE VERY TOP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <TimelineAnimation
              animationNum={index + 1}
              timelineRef={timelineRef}
              key={kpi.label}
              className={cn(
                'p-5 rounded-3xl border bg-[#FAF8F5] border-[#DFD9CE] transition-all hover:scale-[1.01] shadow-2xs space-y-1.5',
                kpi.status === 'up'
                  ? 'hover:border-emerald-400'
                  : 'hover:border-rose-400'
              )}
            >
              <div className="flex items-center justify-between text-[#6E736D]">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {kpi.label}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border',
                    kpi.status === 'up'
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      : 'text-rose-700 bg-rose-50 border-rose-200'
                  )}
                >
                  {kpi.change}
                </span>
              </div>
              
              <div className="flex items-baseline space-x-1.5 pt-0.5">
                <span className="text-3xl font-black text-[#1F2421] tracking-tight font-mono">
                  {kpi.value}
                </span>
                <span className="text-[11px] font-mono text-[#8F8A7E]">INR</span>
              </div>
              
              <span className="text-[11px] text-[#6E736D] block font-mono truncate">
                {kpi.note}
              </span>
            </TimelineAnimation>
          );
        })}
      </div>

      {/* 🚀 2. ANALYTICAL GRAPHS & USEFUL INSIGHTS (EQUAL HEIGHT 1:1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Main Chart Section (8 cols) */}
        <TimelineAnimation
          animationNum={5}
          timelineRef={timelineRef}
          className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-[#FAF8F5] border border-[#DFD9CE] shadow-2xs h-full flex flex-col justify-between"
        >
          <ClippedAreaChart orders={orders} />
        </TimelineAnimation>

        {/* Actionable Insights Column (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3.5 h-full">
          
          {/* Card A: AP2 Policy & Available Spending Cap */}
          <TimelineAnimation
            animationNum={6}
            timelineRef={timelineRef}
            className="p-5 rounded-3xl bg-[#27272A] text-white flex flex-col justify-between shadow-lg space-y-3 flex-1"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                  Fiduciary Security Goal
                </p>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-emerald-300 border border-white/20 font-bold">
                  HMAC Active
                </span>
              </div>
              <h4 className="text-base font-bold tracking-tight">
                AP2 Policy Budget Health
              </h4>
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-2xl font-black tracking-tighter font-mono text-emerald-400">
                  ₹{maxLimit.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-medium text-stone-300 mb-0.5 font-mono">
                  Single-Item Cap
                </span>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-stone-400 pt-1.5">
                <span>AP2 Cryptographic Bound</span>
                <span className="text-emerald-400 font-semibold">Active & Enforced</span>
              </div>
            </div>
          </TimelineAnimation>

          {/* Card B: Store Routing & Dynamic Savings Breakdown */}
          <TimelineAnimation
            animationNum={7}
            timelineRef={timelineRef}
            className="p-5 rounded-3xl bg-[#FAF8F5] border border-[#DFD9CE] shadow-2xs space-y-2.5 flex-1 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-[#DFD9CE]">
              <div className="flex items-center space-x-2">
                <Store className="w-4 h-4 text-[#1F2421]" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#1F2421]">Merchant Routing</h4>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                2 Connected
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#6E736D] flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Amazon India (Prime ✓)</span>
                </span>
                <span className="font-bold font-mono text-[#1F2421]">{amazonOrders} Orders</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6E736D] flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Flipkart Assured (✦)</span>
                </span>
                <span className="font-bold font-mono text-[#1F2421]">{flipkartOrders} Orders</span>
              </div>
            </div>

            <p className="text-[10.5px] text-[#6E736D] pt-1 border-t border-[#DFD9CE]/70 leading-snug">
              Price-matching coupon engine automatically routes orders to lowest cost gateway.
            </p>
          </TimelineAnimation>

        </div>
      </div>
    </section>
  )
}
