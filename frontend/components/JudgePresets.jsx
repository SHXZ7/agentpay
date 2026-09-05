'use client';
import { Play, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';

export default function JudgePresets({ onSelectPreset, isRunning }) {
  const presets = [
    {
      id: "happy_path",
      tag: "DEMO 1: HAPPY PATH",
      title: "Autonomous Shopping & Upsell",
      prompt: "Buy me a wireless mouse under ₹800, budget cap ₹1000",
      budget: 1000,
      category: null,
      expected: "Mandate ₹1000 approved → Logitech Mouse (₹799) bought → Upsell add-on recommended with 10% bundle discount.",
      theme: "border-white/20 hover:border-white/40 bg-white/5",
      btnBg: "bg-white hover:bg-gray-100 text-black",
      badgeBg: "bg-white/10 text-white border-white/20",
      icon: CheckCircle2,
      iconColor: "text-white"
    },
    {
      id: "over_budget",
      tag: "DEMO 2: FAILURE HANDLED GRACEFULLY",
      title: "Budget Ceiling Enforcement",
      prompt: "Buy me a mechanical gaming keyboard, budget cap ₹1000",
      budget: 1000,
      category: null,
      expected: "Mandate ceiling is ₹1000, Keychron Keyboard is ₹1899. ACP Gatekeeper rejects cleanly with BUDGET_EXCEEDED error (No crash).",
      theme: "border-amber-500/30 hover:border-amber-500/60 bg-amber-950/20",
      btnBg: "bg-amber-600 hover:bg-amber-500",
      badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      icon: AlertTriangle,
      iconColor: "text-amber-400"
    },
    {
      id: "category_violation",
      tag: "DEMO 3: SCOPE ENFORCEMENT",
      title: "Category Boundary Protection",
      prompt: "Buy me artisanal dark roast coffee beans for ₹499",
      budget: 1000,
      category: "electronics", // forces electronics-only mandate
      expected: "Agent holds electronics mandate. Coffee belongs to groceries category. ACP Gatekeeper blocks purchase with CATEGORY_DISALLOWED.",
      theme: "border-blue-500/30 hover:border-blue-500/60 bg-blue-950/20",
      btnBg: "bg-blue-600 hover:bg-blue-500",
      badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      icon: ShieldAlert,
      iconColor: "text-blue-400"
    }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-razorpay-accent" />
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Judge Interactive 1-Click Test Scenarios
          </h2>
        </div>
        <span className="text-xs text-slate-400">Click any preset to run live in real-time</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {presets.map((preset) => {
          const Icon = preset.icon;
          return (
            <div
              key={preset.id}
              className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${preset.theme}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${preset.badgeBg}`}>
                    {preset.tag}
                  </span>
                  <Icon className={`w-4 h-4 ${preset.iconColor}`} />
                </div>

                <h3 className="text-sm font-semibold text-white mb-1.5">{preset.title}</h3>
                
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 mb-3 font-mono text-xs text-slate-200">
                  <span className="text-slate-400">Prompt: </span>
                  &ldquo;{preset.prompt}&rdquo;
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  <span className="font-semibold text-slate-200">Expected: </span>
                  {preset.expected}
                </p>
              </div>

              <button
                onClick={() => onSelectPreset(preset.prompt, preset.budget, preset.category)}
                disabled={isRunning}
                className={`w-full py-2 px-3 rounded-lg text-white font-medium text-xs flex items-center justify-center space-x-1.5 shadow-md transition disabled:opacity-50 ${preset.btnBg}`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Scenario Live</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
