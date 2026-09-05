'use client';
import { ShieldCheck, Zap, RefreshCw, Cpu, Database } from 'lucide-react';

export default function Header({ health, onReset, isResetting }) {
  return (
    <header className="border-b border-slate-800/80 bg-razorpay-dark/90 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Brand & Track */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-razorpay-accent to-razorpay-cyan flex items-center justify-center shadow-lg shadow-blue-500/20 font-black text-xl text-white tracking-wider">
            RZ
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-white tracking-tight">Agent-Ready Storefront</h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Track 01
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous Agent Commerce • AP2 Mandates • Razorpay Test Mode • ACP Checkout
            </p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center space-x-3">
          {/* Razorpay Test Mode Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span>Razorpay: {health?.razorpay_mode === 'LIVE_TEST_API' ? 'Live Test Mode' : 'Test Mode (Active)'}</span>
          </div>

          {/* AP2 Security Badge */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AP2 Protocol v1.0</span>
          </div>

          {/* Groq / Agent Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
            <Cpu className="w-3.5 h-3.5" />
            <span>Groq Llama-3.3</span>
          </div>

          {/* Reset Sandbox */}
          <button
            onClick={onReset}
            disabled={isResetting}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition duration-150 disabled:opacity-50"
            title="Reset Database & Mandates to Default Demo State"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>
    </header>
  );
}
