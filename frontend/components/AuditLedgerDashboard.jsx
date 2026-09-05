'use client';
import { useState } from 'react';
import { 
  History, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Code, 
  ChevronDown, 
  ChevronRight,
  Database, 
  Lock, 
  Tag, 
  ShoppingBag, 
  MessageSquare, 
  Zap,
  Fingerprint,
  Check,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

function formatLogForUser(log) {
  const action = (log.action || '').toUpperCase();
  const actor = (log.actor || '').toUpperCase();
  const details = log.details || '';
  
  if (action.includes('NEGOTIATION_SUCCESSFUL') || details.toLowerCase().includes('negotiation won')) {
    return {
      title: "Discount Negotiated & Applied",
      category: "DISCOUNT",
      badge: "Money Saved",
      badgeColor: "bg-[#F0ECE4] dark:bg-white/10 text-[#1F2421] dark:text-white border-[#DFD9CE] dark:border-white/20",
      icon: Tag,
      iconColor: "text-[#1F2421] dark:text-white bg-[#F0ECE4] dark:bg-white/10 border-[#DFD9CE] dark:border-white/20",
      cardBorder: "border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318]",
      summary: details.replace(/^Negotiation Won!\s*/i, '🎉 Special discount applied: ')
    };
  }
  
  if (action.includes('CHECKOUT') || action.includes('ORDER')) {
    return {
      title: "0-OTP Autonomous Purchase Completed",
      category: "CHECKOUT",
      badge: "Order Confirmed",
      badgeColor: "bg-[#F0ECE4] dark:bg-white/10 text-[#1F2421] dark:text-white border-[#DFD9CE] dark:border-white/20",
      icon: ShoppingBag,
      iconColor: "text-[#1F2421] dark:text-white bg-[#F0ECE4] dark:bg-white/10 border-[#DFD9CE] dark:border-white/20",
      cardBorder: "border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318]",
      summary: details
    };
  }

  if (action.includes('PRICE_NEGOTIATION_INITIATED') || action.includes('TOOL_CALL_NEGOTIATE')) {
    return {
      title: "Checking for Merchant Coupons & Deals",
      category: "DISCOUNT",
      badge: "Price Match",
      badgeColor: "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/40",
      icon: Zap,
      iconColor: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40",
      cardBorder: "border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318]",
      summary: details.replace('AI initiated dynamic price negotiation with', 'Scanning for promo codes and discounts on')
    };
  }

  if (action.includes('MANDATE') || action.includes('REQUEST_PERMISSION') || action.includes('POLICY')) {
    return {
      title: "Spending Safety & Budget Verified",
      category: "SAFETY",
      badge: "Safety Guard Active",
      badgeColor: "bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/40",
      icon: ShieldCheck,
      iconColor: "text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40",
      cardBorder: "border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318]",
      summary: details
    };
  }

  if (action.includes('PROMPT') || actor.includes('USER')) {
    return {
      title: "Shopping Request Received from You",
      category: "PROMPT",
      badge: "You Asked",
      badgeColor: "bg-[#F0ECE4] dark:bg-[#171A21] text-[#1F2421] dark:text-[#F8FAFC] border-[#DFD9CE] dark:border-white/10",
      icon: MessageSquare,
      iconColor: "text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-white/10 border-stone-200 dark:border-white/10",
      cardBorder: "border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318]",
      summary: details
    };
  }

  if (action.includes('SEARCH') || action.includes('CATALOG')) {
    return {
      title: "Searched Connected Store Catalogs",
      category: "SEARCH",
      badge: "Catalog Scan",
      badgeColor: "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/40",
      icon: Search,
      iconColor: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40",
      cardBorder: "border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318]",
      summary: details
    };
  }

  return {
    title: action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    category: "GENERAL",
    badge: log.status || "Verified",
    badgeColor: "bg-[#F0ECE4] dark:bg-[#171A21] text-[#44403C] dark:text-[#94A3B8] border-[#DFD9CE] dark:border-white/10",
    icon: CheckCircle2,
    iconColor: "text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-white/10 border-stone-200 dark:border-white/10",
    cardBorder: "border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318]",
    summary: details
  };
}

export default function AuditLedgerDashboard({ logs = [], onRefresh, isRefreshing }) {
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const formattedLogs = logs.map(log => ({
    ...log,
    formatted: formatLogForUser(log)
  }));

  const filteredLogs = formattedLogs.filter((log) => {
    // User-Friendly Category Filter
    if (filter === 'CHECKOUT' && log.formatted.category !== 'CHECKOUT') return false;
    if (filter === 'DISCOUNT' && log.formatted.category !== 'DISCOUNT') return false;
    if (filter === 'SAFETY' && log.formatted.category !== 'SAFETY') return false;
    if (filter === 'PROMPT' && log.formatted.category !== 'PROMPT' && log.formatted.category !== 'SEARCH') return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const text = `${log.formatted.title} ${log.formatted.summary} ${log.action} ${log.actor} ${log.details} ${log.id}`.toLowerCase();
      if (!text.includes(q)) return false;
    }

    return true;
  });

  const toggleExpand = (id) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const totalLogs = logs.length;
  const verifiedOrders = logs.filter(l => l.action?.includes('CHECKOUT') || l.action?.includes('ORDER')).length;
  const discountsApplied = logs.filter(l => l.action?.includes('NEGOTIATION_SUCCESSFUL') || l.details?.includes('Negotiation Won')).length;
  const safetyChecks = logs.filter(l => l.action?.includes('MANDATE') || l.action?.includes('POLICY') || l.action?.includes('REQUEST_PERMISSION')).length;

  return (
    <div className="space-y-4 animate-fade-in text-[#1F2421] dark:text-[#F8FAFC]">

      {/* Filter & Search Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Friendly Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Activity' },
            { id: 'CHECKOUT', label: '🛒 Purchases' },
            { id: 'DISCOUNT', label: '🏷️ Discounts Won' },
            { id: 'SAFETY', label: '🛡️ Safety Checks' },
            { id: 'PROMPT', label: '💬 Shopping Requests' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer whitespace-nowrap ${
                filter === item.id
                  ? 'bg-[#18181B] dark:bg-white text-white dark:text-black font-bold'
                  : 'bg-[#F0ECE4] dark:bg-[#171A21] text-[#44403C] dark:text-[#94A3B8] hover:bg-[#EAE6DE] dark:hover:bg-white/10 border border-[#DFD9CE] dark:border-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#8F8A7E] dark:text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search purchases, discounts..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 text-xs font-medium text-[#1F2421] dark:text-[#F8FAFC] placeholder-[#8F8A7E] dark:placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#27272A] dark:focus:ring-white/20 transition"
          />
        </div>
      </div>

      {/* Human-Readable Activity List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 flex items-center justify-center mx-auto text-[#6E736D] dark:text-[#94A3B8]">
              <Fingerprint className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#1F2421] dark:text-[#F8FAFC]">No activity entries match your filter</h4>
            <p className="text-xs text-[#6E736D] dark:text-[#94A3B8] max-w-sm mx-auto">
              Entries will appear here automatically whenever the AI Agent researches deals, verifies discounts, or buys items for you.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const formatted = log.formatted;
            const IconComponent = formatted.icon;

            return (
              <div
                key={log.id}
                className={`p-4 sm:p-5 rounded-3xl border shadow-2xs transition-all hover:scale-[1.002] space-y-2.5 ${formatted.cardBorder}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  
                  {/* Icon & Human-Readable Action Headline */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs flex-shrink-0 border shadow-2xs ${formatted.iconColor}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="truncate">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${formatted.badgeColor}`}>
                          {formatted.badge}
                        </span>
                        <h4 className="text-xs sm:text-[13px] font-bold text-[#1C1917] dark:text-[#F8FAFC] truncate">
                          {formatted.title}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Timestamp & Technical Toggle */}
                  <div className="flex items-center justify-between sm:justify-end space-x-3 text-[11px] font-mono text-[#6E736D] dark:text-[#94A3B8]">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-[#8F8A7E] dark:text-[#64748B]" />
                      <span>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(log.id)}
                      className="px-2.5 py-1 rounded-lg bg-[#F0ECE4] dark:bg-[#171A21] hover:bg-[#EAE6DE] dark:hover:bg-white/10 text-[#44403C] dark:text-[#F8FAFC] hover:text-[#1F2421] border border-[#DFD9CE] dark:border-white/10 transition cursor-pointer flex items-center space-x-1 text-[10px] font-semibold"
                    >
                      <Code className="w-3 h-3" />
                      <span>{isExpanded ? 'Hide Tech Details' : 'View Proof'}</span>
                    </button>
                  </div>

                </div>

                {/* Plain-English Summary Description */}
                <p className="text-xs text-[#44403C] dark:text-[#94A3B8] leading-relaxed pl-1 font-sans">
                  {formatted.summary}
                </p>

                {/* Optional Expanded Technical Proof (JSON) for Auditors */}
                {isExpanded && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 font-mono text-[11px] text-[#1F2421] dark:text-[#F8FAFC] space-y-2 animate-fade-in overflow-x-auto">
                    <div className="flex items-center justify-between text-[10px] text-[#8F8A7E] dark:text-[#64748B]">
                      <span>CRYPTOGRAPHIC AUDIT PAYLOAD</span>
                      <span>ID: {log.id}</span>
                    </div>
                    <pre className="p-2.5 rounded-xl bg-white dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 overflow-x-auto text-[11px] leading-relaxed">
                      {JSON.stringify(log.payload || log, null, 2)}
                    </pre>
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
