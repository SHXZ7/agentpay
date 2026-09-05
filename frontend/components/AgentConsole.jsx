'use client';
import { useState } from 'react';
import { Send, Bot, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Code, ShieldCheck, CreditCard, Sparkles, Loader2 } from 'lucide-react';

export default function AgentConsole({
  agentResult,
  isRunning,
  onRunAgent,
  inputPrompt,
  setInputPrompt
}) {
  const [showJson, setShowJson] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isRunning) return;
    onRunAgent(inputPrompt);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-razorpay-card/80 backdrop-blur-xl p-5 shadow-2xl mb-8">
      {/* Console Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Autonomous Shopping Agent Console</h2>
            <p className="text-xs text-slate-400">
              Tool Loop: <code className="text-blue-400">check_catalog</code> → <code className="text-blue-400">request_permission</code> → <code className="text-blue-400">execute_checkout</code>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {agentResult && (
            <button
              onClick={() => setShowJson(!showJson)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition"
            >
              <Code className="w-3.5 h-3.5" />
              <span>{showJson ? 'Hide Raw JSON' : 'View Raw Session'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Input Prompt Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="E.g. Buy me a wireless mouse under ₹800, budget cap ₹1000..."
            disabled={isRunning}
            className="w-full pl-4 pr-28 py-3.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-razorpay-accent focus:border-transparent text-sm transition"
          />
          <button
            type="submit"
            disabled={isRunning || !inputPrompt.trim()}
            className="absolute right-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-razorpay-accent hover:from-blue-500 hover:to-blue-400 text-white font-medium text-xs flex items-center space-x-1.5 shadow-lg shadow-blue-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Agent Running...</span>
              </>
            ) : (
              <>
                <span>Dispatch Agent</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Live Agent Execution Output */}
      {isRunning && (
        <div className="p-8 rounded-xl bg-slate-950/60 border border-blue-500/20 text-center flex flex-col items-center justify-center space-y-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin flex items-center justify-center"></div>
            <Bot className="w-6 h-6 text-blue-400 absolute inset-0 m-auto" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Agent is reasoning & querying merchant APIs...</p>
            <p className="text-xs text-slate-400 font-mono">Executing Groq Tool Pipeline • Evaluating AP2 Mandate Constraints</p>
          </div>
        </div>
      )}

      {agentResult && !isRunning && (
        <div className="space-y-4">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start justify-between ${
            agentResult.success 
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}>
            <div className="flex items-start space-x-3">
              {agentResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <h3 className="text-sm font-bold text-white">
                  {agentResult.success ? 'Shopping Mission Completed Successfully' : 'Action Handled Gracefully (Policy Boundary Enforced)'}
                </h3>
                <p className="text-xs mt-0.5 text-slate-300">
                  {agentResult.checkout?.message || agentResult.checkout?.reason || 'Agent finished execution.'}
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-[11px] text-slate-400">
              <span>Engine: </span>
              <span className="text-blue-400 font-semibold">{agentResult.engine}</span>
            </div>
          </div>

          {/* Step by step timeline */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Autonomous Reasoning Trace</h4>
            
            {agentResult.steps?.map((step, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
                {step.type === 'thought' && (
                  <div className="flex items-start space-x-2 text-slate-300">
                    <span className="text-blue-400 font-bold">🤔 Agent Thought:</span>
                    <span>{step.content}</span>
                  </div>
                )}

                {step.type === 'tool_call' && (
                  <div className="flex items-start space-x-2 text-amber-300">
                    <span className="text-amber-400 font-bold">⚡ Tool Invoked:</span>
                    <span className="font-semibold text-white">{step.name}</span>
                    <span className="text-slate-400 font-normal">({JSON.stringify(step.args)})</span>
                  </div>
                )}

                {step.type === 'tool_result' && (
                  <div className="mt-1 pl-4 border-l-2 border-slate-700 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400">Tool Result:</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        step.result?.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {step.result?.success ? 'SUCCESS (200)' : `DENIED (${step.result?.error_code || 'POLICY_ERROR'})`}
                      </span>
                    </div>

                    {step.name === 'check_catalog' && step.result?.products && (
                      <p className="text-slate-300 text-[11px]">
                        Found {step.result.products.length} products. Selected: <strong className="text-white">{step.result.products[0]?.name}</strong> (₹{step.result.products[0]?.price})
                      </p>
                    )}

                    {step.name === 'request_permission' && (
                      <div className="text-[11px] text-slate-300 flex items-center space-x-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>Issued Mandate <code className="text-blue-300 font-bold">{step.result.mandate_id}</code> with budget cap ₹{step.result.max_budget}</span>
                      </div>
                    )}

                    {step.name === 'execute_checkout' && (
                      <div className="text-[11px] mt-1">
                        {step.result.success ? (
                          <div className="flex items-center space-x-2 text-emerald-300">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Razorpay Test Order: <strong className="text-white font-mono">{step.result.order?.order_id}</strong> (Amount: ₹{step.result.order?.amount})</span>
                          </div>
                        ) : (
                          <div className="p-2 rounded bg-red-950/40 border border-red-500/30 text-red-300">
                            <strong>Policy Rejection:</strong> {step.result.reason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {step.type === 'agent_final_response' && (
                  <div className="flex items-start space-x-2 text-slate-200">
                    <span className="text-emerald-400 font-bold">💬 Agent Response:</span>
                    <span>{step.content}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Raw JSON inspection toggle */}
          {showJson && (
            <div className="p-3 rounded-xl bg-black/80 border border-slate-800 text-[11px] font-mono text-slate-300 max-h-60 overflow-y-auto">
              <pre>{JSON.stringify(agentResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
