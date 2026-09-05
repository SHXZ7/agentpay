'use client';
import { useState } from 'react';
import { History, ChevronDown, ChevronRight, RefreshCw, Search } from 'lucide-react';

export default function AuditLogViewer({ logs = [], onRefresh, isRefreshing }) {
  const [filter, setFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(log => {
    if (filter === 'MANDATE' && log.actor !== 'MANDATE_ENGINE') return false;
    if (filter === 'CHECKOUT' && (log.actor !== 'CHECKOUT_GATEKEEPER' && log.actor !== 'RAZORPAY_API')) return false;
    if (filter === 'AGENT' && (log.actor !== 'AI_AGENT' && log.actor !== 'USER')) return false;
    
    if (searchTerm) {
      const match = JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
      case 'VERIFIED':
        return <span className="px-2 py-0.5 rounded bg-[#F0ECE4] text-[#1F2421] border border-[#DFD9CE] text-[10px] font-mono font-medium">SUCCESS</span>;
      case 'REJECTED_GRACEFULLY':
      case 'DENIED':
        return <span className="px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 text-[10px] font-mono font-medium">POLICY BLOCKED</span>;
      case 'INVOKED':
      case 'INFO':
        return <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-mono font-medium">INVOKED</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-[#F4F0E8] text-[#78716C] text-[10px] font-mono">{status}</span>;
    }
  };

  const getActorBadge = (actor) => {
    switch (actor) {
      case 'MANDATE_ENGINE':
        return <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-mono">AP2 ENGINE</span>;
      case 'CHECKOUT_GATEKEEPER':
        return <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-mono">GATEKEEPER</span>;
      case 'AI_AGENT':
        return <span className="px-2 py-0.5 rounded bg-gold-50 text-gold-700 border border-gold-200 text-[10px] font-mono">AI AGENT</span>;
      case 'RAZORPAY_API':
      case 'WEBHOOK_PROCESSOR':
        return <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-mono">RAZORPAY</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-[#F4F0E8] text-[#78716C] text-[10px] font-mono">{actor}</span>;
    }
  };

  return (
    <div className="rounded-2xl border border-[#EBE6DA] bg-[#FDFBF7] p-5 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-[#EBE6DA]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#F4F0E8] text-[#78716C] flex items-center justify-center border border-[#E0D8C8]">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">Forensic Audit Trail &amp; Ledger</h2>
            <p className="text-[11px] text-[#78716C]">Immutable, tamper-evident log of every autonomous action &amp; payment decision</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px]">
          {['ALL', 'MANDATE', 'CHECKOUT', 'AGENT'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filter === f
                  ? 'bg-[#1C1917] text-white shadow-2xs'
                  : 'bg-[#F4F0E8] text-[#78716C] hover:bg-[#EBE6DA] border border-[#E0D8C8]'
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-[#F4F0E8] hover:bg-[#EBE6DA] text-[#78716C] border border-[#E0D8C8] transition ml-1"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-[#A8A29E] font-mono text-xs">
            No audit log entries recorded yet.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedId === log.id;
            return (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-[#FAF8F3] hover:bg-[#F4F0E8] border border-[#EBE6DA] transition text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 flex-wrap">
                    {getActorBadge(log.actor)}
                    {getStatusBadge(log.status)}
                    <span className="font-semibold text-[#1C1917] text-xs">{log.action}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#A8A29E] flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-[11px] text-[#57534E] font-mono pl-0.5 leading-relaxed">
                  {log.details}
                </p>

                {/* Optional Payload Inspector */}
                {log.payload && (
                  <div>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="flex items-center space-x-1 text-[10px] text-gold-700 hover:text-gold-800 font-mono mt-1"
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span>{isExpanded ? 'Hide Payload' : 'View Payload Diff'}</span>
                    </button>

                    {isExpanded && (
                      <pre className="mt-1.5 p-2.5 rounded-lg bg-[#FDFBF7] border border-[#EBE6DA] text-[10px] font-mono text-[#44403C] overflow-x-auto">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
