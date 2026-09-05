'use client';
import { useState } from 'react';
import { Send, Bot, Sparkles, Loader2, Play } from 'lucide-react';
import LiveAutonomousStepper from './LiveAutonomousStepper';

export default function ConversationalCopilot({
  activeFlow,
  isRunning,
  onRunAgent,
  mandate,
  onSelectPreset
}) {
  const [prompt, setPrompt] = useState('');

  const quickPrompts = [
    { 
      label: "Autonomous Purchase & Price Match", 
      badge: "APPROVED",
      badgeColor: "bg-signal-green/10 text-signal-green border-signal-green/20",
      text: "Buy me a wireless mouse under ₹800, check coupons and negotiate best price", 
      budget: 1000, 
      cat: null 
    },
    { 
      label: "Budget Limit Rejection", 
      badge: "OVER-BUDGET",
      badgeColor: "bg-signal-amber/10 text-signal-amber border-signal-amber/20",
      text: "Buy me a mechanical gaming keyboard, budget cap ₹1000", 
      budget: 1000, 
      cat: null 
    },
    { 
      label: "Category Boundary Protection", 
      badge: "SCOPE BLOCKED",
      badgeColor: "bg-signal-red/10 text-signal-red border-signal-red/20",
      text: "Buy me artisanal dark roast coffee beans for ₹499", 
      budget: 1000, 
      cat: "electronics" 
    }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isRunning) return;
    onRunAgent(prompt);
  };

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-[#0F172A] p-5 shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-gold-400 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Autonomous Shopping Agent</h2>
            <p className="text-[11px] text-slate-400">Multi-Store Search • Dynamic Price Matching • AP2 Policy Gate</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-navy-950 border border-slate-800 text-slate-300 text-[10px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-green animate-pulse"></span>
          <span>Groq LLaMA-3.3 Ready</span>
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="mb-3.5">
        <span className="text-[11px] text-slate-400 font-medium block mb-2 flex items-center">
          <Sparkles className="w-3 h-3 mr-1 text-gold-400" />
          Live Interactive Scenarios:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPreset(q.text, q.budget, q.cat)}
              disabled={isRunning}
              className="text-[11px] p-2.5 rounded-xl bg-navy-950/80 hover:bg-slate-800/90 text-slate-300 hover:text-slate-100 border border-slate-800 hover:border-slate-700 transition disabled:opacity-50 text-left flex flex-col justify-between"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${q.badgeColor}`}>
                  {q.badge}
                </span>
                <Play className="w-2.5 h-2.5 text-slate-500 fill-current" />
              </div>
              <span className="font-semibold text-slate-200 line-clamp-1">{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity Area (Live Step-by-Step Theatrical Stepper) */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[360px] max-h-[500px]">
        {!activeFlow && !isRunning && (
          <div className="p-8 rounded-xl bg-navy-950/50 border border-dashed border-slate-800 text-center flex flex-col items-center justify-center my-auto">
            <Bot className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-300 mb-1">Autonomous Shopper Ready</p>
            <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed">
              Type an instruction or click a scenario above to observe real-time cross-store comparison, price negotiation, AP2 mandate verification, and settlement.
            </p>
          </div>
        )}

        {activeFlow && (
          <LiveAutonomousStepper activeFlow={activeFlow} isSimulating={isRunning} />
        )}
      </div>

      {/* Input Prompt Form */}
      <form onSubmit={handleSubmit} className="mt-3.5 pt-3 border-t border-slate-800">
        <div className="relative flex items-center">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g. Buy me a wireless mouse under ₹800, budget cap ₹1000..."
            disabled={isRunning}
            className="w-full pl-3.5 pr-28 py-2.5 rounded-xl bg-navy-950 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-gold-400"
          />
          <button
            type="submit"
            disabled={isRunning || !prompt.trim()}
            className="absolute right-1 px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs flex items-center space-x-1.5 transition disabled:opacity-40"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <span>Dispatch</span>
                <Send className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

