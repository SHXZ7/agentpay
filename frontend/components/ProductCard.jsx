'use client';
import { Star, Zap, Bot, CreditCard, ShieldCheck } from 'lucide-react';

export default function ProductCard({ product, onBuyViaAgent, onDirectBuy, isRunning }) {
  return (
    <div className="rounded-2xl border border-slate-800/90 hover:border-blue-500/40 bg-slate-900/70 p-4 transition-all duration-200 flex flex-col justify-between group hover:shadow-xl hover:shadow-blue-500/10 backdrop-blur-md">
      <div>
        {/* Top Tag & Visual */}
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/90 flex items-center justify-center text-3xl group-hover:scale-110 transition duration-200 shadow-inner">
            {product.image || '📦'}
          </div>
          
          <div className="flex flex-col items-end space-y-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {product.category}
            </span>
            {product.badge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {product.badge}
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-xs font-bold text-white mb-1 line-clamp-1 group-hover:text-blue-400 transition">
          {product.name}
        </h3>
        
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
          {product.description}
        </p>

        {/* Specs breakdown */}
        {product.specs && (
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-3 text-[10px] font-mono text-slate-400 space-y-0.5">
            {Object.entries(product.specs).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-slate-500 capitalize">{k}:</span>
                <span className="text-slate-300 truncate max-w-[130px]">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Price & Dual Actions */}
      <div className="pt-2.5 border-t border-slate-800/80">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[10px] text-slate-500">Price</span>
          <span className="text-sm font-black text-white">₹{product.price.toLocaleString('en-IN')}</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onBuyViaAgent(product)}
            disabled={isRunning}
            className="py-1.5 px-2 rounded-lg bg-gradient-to-r from-blue-600 to-razorpay-accent hover:from-blue-500 hover:to-blue-400 text-white text-[11px] font-bold flex items-center justify-center space-x-1 transition disabled:opacity-40 shadow-sm"
            title="Delegate to AI Agent with AP2 Mandate"
          >
            <Bot className="w-3 h-3" />
            <span>AI Buy</span>
          </button>

          <button
            onClick={() => onDirectBuy(product)}
            disabled={isRunning}
            className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-medium transition border border-slate-700 disabled:opacity-40"
            title="Direct Razorpay Checkout"
          >
            <span>Direct Pay</span>
          </button>
        </div>
      </div>
    </div>
  );
}
