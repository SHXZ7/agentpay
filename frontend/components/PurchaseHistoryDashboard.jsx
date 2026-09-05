'use client';
import { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  Clock,
  CheckCircle2,
  Receipt,
  Tag,
  Sparkles,
  Package,
  Truck,
  ShieldCheck,
  TrendingDown,
  CreditCard,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  Code,
  MessageSquare,
  Zap,
  CheckCircle,
  AlertTriangle,
  X,
  RefreshCw
} from 'lucide-react';

// ─── Audit log formatter (ported from AuditLedgerDashboard) ──────────────────

function formatLogForUser(log) {
  const action = (log.action || '').toUpperCase();
  const actor = (log.actor || '').toUpperCase();
  const details = log.details || '';

  if (action.includes('NEGOTIATION_SUCCESSFUL') || details.toLowerCase().includes('negotiation won')) {
    return { title: 'Discount Negotiated & Applied', badge: 'Money Saved', badgeColor: 'bg-[#F0ECE4] dark:bg-white/10 text-[#1F2421] dark:text-[#F8FAFC] border-[#DFD9CE] dark:border-white/20', icon: Tag, iconColor: 'text-[#1F2421] dark:text-white bg-[#F0ECE4] dark:bg-white/10 border-[#DFD9CE] dark:border-white/20', summary: details };
  }
  if (action.includes('CHECKOUT') || action.includes('ORDER')) {
    return { title: '0-OTP Purchase Settled', badge: 'Order Confirmed', badgeColor: 'bg-[#F0ECE4] dark:bg-white/10 text-[#1F2421] dark:text-[#F8FAFC] border-[#DFD9CE] dark:border-white/20', icon: ShoppingBag, iconColor: 'text-[#1F2421] dark:text-white bg-[#F0ECE4] dark:bg-white/10 border-[#DFD9CE] dark:border-white/20', summary: details };
  }
  if (action.includes('PRICE_NEGOTIATION') || action.includes('TOOL_CALL_NEGOTIATE')) {
    return { title: 'Coupon & Deal Scan', badge: 'Price Match', badgeColor: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/40', icon: Zap, iconColor: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40', summary: details };
  }
  if (action.includes('MANDATE') || action.includes('REQUEST_PERMISSION') || action.includes('POLICY')) {
    return { title: 'Spending Safety Verified', badge: 'Safety Guard', badgeColor: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/40', icon: ShieldCheck, iconColor: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40', summary: details };
  }
  if (action.includes('PROMPT') || actor.includes('USER')) {
    return { title: 'Shopping Request Received', badge: 'You Asked', badgeColor: 'bg-[#F0ECE4] dark:bg-[#171A21] text-[#1F2421] dark:text-[#F8FAFC] border-[#DFD9CE] dark:border-white/10', icon: MessageSquare, iconColor: 'text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-white/10 border-stone-200 dark:border-white/10', summary: details };
  }
  if (action.includes('SEARCH') || action.includes('CATALOG') || action.includes('WATCHLIST')) {
    return { title: 'Agent Activity', badge: 'Activity', badgeColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/40', icon: Search, iconColor: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40', summary: details };
  }
  return {
    title: action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    badge: log.status || 'Logged',
    badgeColor: 'bg-[#F0ECE4] dark:bg-[#171A21] text-[#44403C] dark:text-[#94A3B8] border-[#DFD9CE] dark:border-white/10',
    icon: CheckCircle2,
    iconColor: 'text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-white/10 border-stone-200 dark:border-white/10',
    summary: details
  };
}

// ─── Inline Audit Ledger Panel ────────────────────────────────────────────────

function AuditPanel({ order, allLogs, onClose }) {
  const [expandedId, setExpandedId] = useState(null);
  const [logFilter, setLogFilter] = useState('ALL');

  // Find logs related to this order: by order_id in payload, details, or the checkout log within ±30s
  const relatedLogs = useMemo(() => {
    const oid = order.order_id?.toLowerCase();
    const orderTime = order.created_at ? new Date(order.created_at).getTime() : 0;

    return allLogs.filter(log => {
      // Direct mention of order ID
      if (oid && (
        JSON.stringify(log.payload || {}).toLowerCase().includes(oid) ||
        (log.details || '').toLowerCase().includes(oid)
      )) return true;

      // All checkout/mandate/negotiation logs within a 90-second window of this order
      const logTime = log.timestamp ? new Date(log.timestamp).getTime() : 0;
      const action = (log.action || '').toLowerCase();
      const isRelevantAction = action.includes('checkout') || action.includes('mandate') || action.includes('negotiat');
      if (orderTime && isRelevantAction && Math.abs(logTime - orderTime) < 90000) return true;

      return false;
    });
  }, [order, allLogs]);

  const filterOptions = [
    { id: 'ALL', label: 'All' },
    { id: 'CHECKOUT', label: '🛒 Purchase' },
    { id: 'DISCOUNT', label: '🏷️ Discounts' },
    { id: 'SAFETY', label: '🛡️ Safety' },
  ];

  const filtered = relatedLogs.filter(log => {
    if (logFilter === 'ALL') return true;
    const fmt = formatLogForUser(log);
    const action = (log.action || '').toUpperCase();
    if (logFilter === 'CHECKOUT') return action.includes('CHECKOUT') || action.includes('ORDER');
    if (logFilter === 'DISCOUNT') return action.includes('NEGOTIATION') || (log.details || '').toLowerCase().includes('negotiation won');
    if (logFilter === 'SAFETY') return action.includes('MANDATE') || action.includes('POLICY');
    return true;
  });

  return (
    <div className="mt-4 rounded-2xl border border-[#DFD9CE] dark:border-white/10 bg-[#F7F5F1] dark:bg-[#111318] overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#DFD9CE] dark:border-white/10 bg-[#F0ECE4] dark:bg-[#171A21]">
        <div className="flex items-center space-x-2">
          <History className="w-3.5 h-3.5 text-[#6E736D] dark:text-[#94A3B8]" />
          <span className="text-[11px] font-bold text-[#1F2421] dark:text-[#F8FAFC] uppercase tracking-wider">
            Audit Trail — {order.order_id}
          </span>
          <span className="text-[10px] text-[#8F8A7E] dark:text-[#64748B] font-mono">
            ({relatedLogs.length} event{relatedLogs.length !== 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Filter pills */}
          <div className="flex items-center space-x-1">
            {filterOptions.map(o => (
              <button key={o.id} onClick={() => setLogFilter(o.id)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${logFilter === o.id ? 'bg-[#27272A] dark:bg-white text-white dark:text-black border-[#27272A] dark:border-white' : 'bg-white dark:bg-white/10 text-[#6E736D] dark:text-[#94A3B8] border-[#DFD9CE] dark:border-white/10 hover:border-[#9E9A94]'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <button onClick={onClose}
            className="w-6 h-6 rounded-full bg-white dark:bg-white/10 border border-[#DFD9CE] dark:border-white/10 flex items-center justify-center hover:bg-[#EAE6DE] dark:hover:bg-white/20 transition cursor-pointer">
            <X className="w-3 h-3 text-[#6E736D] dark:text-[#94A3B8]" />
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <History className="w-6 h-6 text-[#C5C0B8] dark:text-[#64748B] mx-auto" />
            <p className="text-xs text-[#8F8A7E] dark:text-[#64748B]">No related audit events found for this order.</p>
          </div>
        ) : (
          filtered.map(log => {
            const fmt = formatLogForUser(log);
            const IconComponent = fmt.icon;
            const isExpanded = expandedId === log.id;
            return (
              <div key={log.id} className="rounded-xl border border-[#DFD9CE] dark:border-white/10 bg-white dark:bg-[#171A21] overflow-hidden">
                <div className="flex items-center justify-between p-3 gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${fmt.iconColor}`}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border ${fmt.badgeColor}`}>{fmt.badge}</span>
                        <span className="text-[11px] font-bold text-[#1F2421] dark:text-[#F8FAFC] truncate">{fmt.title}</span>
                      </div>
                      <p className="text-[10px] text-[#6E736D] dark:text-[#94A3B8] font-mono mt-0.5">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-[#F0ECE4] dark:bg-white/10 hover:bg-[#EAE6DE] dark:hover:bg-white/20 border border-[#DFD9CE] dark:border-white/10 text-[#44403C] dark:text-[#F8FAFC] transition cursor-pointer text-[10px] font-semibold shrink-0">
                    <Code className="w-3 h-3" />
                    <span>{isExpanded ? 'Hide' : 'Proof'}</span>
                  </button>
                </div>

                {/* Summary */}
                {fmt.summary && (
                  <p className="text-[11px] text-[#44403C] dark:text-[#94A3B8] px-3 pb-2.5 leading-relaxed">{fmt.summary}</p>
                )}

                {/* Expanded JSON proof */}
                {isExpanded && (
                  <div className="border-t border-[#DFD9CE] dark:border-white/10 bg-[#F7F5F1] dark:bg-[#111318] p-3">
                    <div className="flex items-center justify-between text-[10px] text-[#8F8A7E] dark:text-[#64748B] mb-1.5 font-mono">
                      <span>CRYPTOGRAPHIC AUDIT PAYLOAD</span>
                      <span>ID: {log.id}</span>
                    </div>
                    <pre className="p-2.5 rounded-xl bg-white dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 text-[10px] font-mono overflow-x-auto leading-relaxed text-[#1F2421] dark:text-[#F8FAFC]">
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function PurchaseHistoryDashboard({ orders = [], auditLogs = [], onSwitchToStudio, onRefreshLogs, isRefreshingLogs }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMerchant, setFilterMerchant] = useState('ALL');
  const [expandedOrderId, setExpandedOrderId] = useState(null); // which order's audit panel is open
  const [selectedReceipt, setSelectedReceipt] = useState(null); // receipt modal

  const filteredOrders = orders.filter((order) => {
    if (filterMerchant === 'AMAZON' && order.merchant_id !== 'aura-tech' && order.merchant_id) return false;
    if (filterMerchant === 'FLIPKART' && order.merchant_id !== 'prime-gadgets') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (order.product?.name || order.product_name || '').toLowerCase();
      const orderId = (order.order_id || '').toLowerCase();
      if (!name.includes(q) && !orderId.includes(q)) return false;
    }
    return true;
  });

  const totalSpent = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalOrders = orders.length;
  const hasActualSavings = orders.some(o => (o.product?.mrp && o.product.mrp > o.amount) || (o.mrp && o.mrp > o.amount));
  const totalSavings = hasActualSavings
    ? orders.reduce((sum, o) => {
        const mrp = Number(o.product?.mrp || o.mrp) || Number(o.amount) || 0;
        const paid = Number(o.amount) || 0;
        return sum + Math.max(0, mrp - paid);
      }, 0)
    : Math.round(totalSpent * 0.12) + (orders.length * 50);
  const savingsLabel = hasActualSavings ? 'Total Savings' : 'Est. Saved (Demo)';

  const toggleAudit = (orderId) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1F2421] dark:text-[#F8FAFC]">

      {/* Stats summary row */}
      <div className="grid grid-cols-3 gap-3.5">
        {[
          { icon: ShoppingBag, label: 'Total Orders',   value: totalOrders,                                             color: 'text-[#1F2421] dark:text-[#F8FAFC]',   bg: 'bg-[#F0ECE4] dark:bg-[#111318] border-[#DFD9CE] dark:border-white/10' },
          { icon: CreditCard,  label: 'Total Spent',    value: `₹${totalSpent.toLocaleString('en-IN')}`,               color: 'text-[#1F2421] dark:text-[#F8FAFC]',   bg: 'bg-[#F0ECE4] dark:bg-[#111318] border-[#DFD9CE] dark:border-white/10' },
          { icon: Tag,         label: savingsLabel,     value: `₹${totalSavings.toLocaleString('en-IN')}`,             color: 'text-[#1F2421] dark:text-white',       bg: 'bg-[#F0ECE4] dark:bg-[#111318] border-[#DFD9CE] dark:border-white/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`p-4 rounded-2xl border ${bg} flex items-center space-x-3`}>
            <div className={`w-8 h-8 rounded-xl bg-white/70 dark:bg-white/10 border border-white/50 dark:border-white/10 flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className={`text-sm font-black font-mono ${color}`}>{value}</p>
              <p className="text-[10px] text-[#6E736D] dark:text-[#94A3B8] font-bold uppercase tracking-wide">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Stores' },
            { id: 'AMAZON', label: 'Amazon India' },
            { id: 'FLIPKART', label: 'Flipkart Assured' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMerchant(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
                filterMerchant === tab.id
                  ? 'bg-[#27272A] dark:bg-white text-white dark:text-black border border-[#27272A] dark:border-white'
                  : 'bg-[#F0ECE4] dark:bg-[#171A21] text-[#44403C] dark:text-[#94A3B8] hover:bg-[#EAE6DE] dark:hover:bg-white/10 border border-[#DFD9CE] dark:border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-[#8F8A7E] dark:text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders by item or ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 text-xs font-medium text-[#1F2421] dark:text-[#F8FAFC] placeholder-[#8F8A7E] dark:placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#27272A] dark:focus:ring-white/20 transition"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 flex items-center justify-center mx-auto text-[#6E736D] dark:text-[#94A3B8]">
              <Package className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#1F2421] dark:text-[#F8FAFC]">No purchases found</h4>
            <p className="text-xs text-[#6E736D] dark:text-[#94A3B8] max-w-sm mx-auto">
              Run a shopping command with your AI Agent to execute autonomous orders!
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isAmazon = order.merchant_id === 'aura-tech' || !order.merchant_id;
            const productName = order.product?.name || order.product_name || 'Autonomous Item';
            const productImage = order.product?.image || order.product_image || '📦';
            const isAuditOpen = expandedOrderId === order.order_id;

            return (
              <div
                key={order.order_id}
                className={`rounded-3xl border shadow-2xs transition-all duration-300 ${isAuditOpen ? 'border-[#8F8A7E] dark:border-white/30 bg-[#FAF8F5] dark:bg-[#111318]' : 'border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#111318] hover:border-[#8F8A7E] dark:hover:border-white/20'}`}
              >
                {/* Order card — clickable to toggle audit */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleAudit(order.order_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleAudit(order.order_id);
                    }
                  }}
                  className="w-full text-left p-5 space-y-3.5 cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                    {/* Left: product + merchant */}
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-[#F0ECE4] dark:bg-[#171A21] border border-[#DFD9CE] dark:border-white/10 flex items-center justify-center text-xl shadow-2xs flex-shrink-0">
                        {productImage}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isAmazon ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800/40' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800/40'
                          }`}>
                            {isAmazon ? 'Amazon India (Prime ✓)' : 'Flipkart Assured (✦)'}
                          </span>
                          <span className="text-[11px] font-mono text-[#8F8A7E] dark:text-[#64748B] truncate">{order.order_id}</span>
                        </div>
                        <h4 className="font-bold text-sm text-[#1F2421] dark:text-[#F8FAFC] truncate mt-0.5">{productName}</h4>
                      </div>
                    </div>

                    {/* Right: amount + expand indicator */}
                    <div className="flex items-center justify-between sm:justify-end space-x-4">
                      <div className="text-left sm:text-right">
                        <span className="text-lg font-black text-[#1F2421] dark:text-[#F8FAFC] font-mono block">
                          ₹{order.amount?.toLocaleString('en-IN')} INR
                        </span>
                        <span className="text-[10px] font-mono text-[#1F2421] dark:text-white font-bold block">0-OTP UPI Autopay</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Receipt button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedReceipt(order); }}
                          className="p-2 rounded-xl bg-[#F0ECE4] dark:bg-[#171A21] hover:bg-[#27272A] dark:hover:bg-white text-[#44403C] dark:text-[#F8FAFC] hover:text-white dark:hover:text-black border border-[#DFD9CE] dark:border-white/10 transition shadow-2xs cursor-pointer"
                          title="View Receipt"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>

                        {/* Audit expand/collapse */}
                        <div className={`p-2 rounded-xl border transition shadow-2xs ${isAuditOpen ? 'bg-[#27272A] dark:bg-white text-white dark:text-black border-[#27272A] dark:border-white' : 'bg-[#F0ECE4] dark:bg-[#171A21] text-[#6E736D] dark:text-[#94A3B8] border-[#DFD9CE] dark:border-white/10 hover:bg-[#EAE6DE] dark:hover:bg-white/10'}`}>
                          <History className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Bottom metadata ribbon */}
                  <div className="pt-2.5 border-t border-[#DFD9CE]/70 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#6E736D] dark:text-[#94A3B8]">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-[#8F8A7E] dark:text-[#64748B]" />
                        <span>{new Date(order.created_at || Date.now()).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Truck className="w-3.5 h-3.5 text-[#1F2421] dark:text-white" />
                        <span>{isAmazon ? 'Free 1-Day Prime Delivery' : 'Standard 1-2 Days'}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#F0ECE4] dark:bg-white/10 text-[#1F2421] dark:text-white border border-[#DFD9CE] dark:border-white/20 text-[10px] font-bold">SETTLED</span>
                      <span className="text-[10px] text-[#8F8A7E] dark:text-[#64748B] truncate max-w-[150px]">{order.mandate_id}</span>
                      {isAuditOpen ? (
                        <span className="text-[10px] text-[#8F8A7E] dark:text-[#64748B] flex items-center space-x-0.5">
                          <ChevronUp className="w-3 h-3" /><span>Hide ledger</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#8F8A7E] dark:text-[#64748B] flex items-center space-x-0.5">
                          <ChevronDown className="w-3 h-3" /><span>View ledger</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline audit panel */}
                {isAuditOpen && (
                  <div className="px-5 pb-5">
                    <AuditPanel
                      order={order}
                      allLogs={auditLogs}
                      onClose={() => setExpandedOrderId(null)}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Forensic Receipt Modal */}
      {selectedReceipt && (
        <div
          onClick={() => setSelectedReceipt(null)}
          className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center p-4 bg-black/60 backdrop-blur-md text-[#1F2421] dark:text-[#F8FAFC] overflow-y-auto animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-[#FAF8F5] dark:bg-[#111318] border border-[#DFD9CE] dark:border-white/10 shadow-2xl p-6 space-y-4 font-mono text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#DFD9CE] dark:border-white/10">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-[#27272A] dark:text-white" />
                <span className="font-bold text-sm text-[#1F2421] dark:text-[#F8FAFC]">Razorpay Autonomous Receipt</span>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 rounded-lg bg-[#F0ECE4] dark:bg-[#171A21] text-[#6E736D] dark:text-[#94A3B8] hover:text-[#1F2421] dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-[11px]">
              {[
                ['ORDER ID', selectedReceipt.order_id],
                ['MERCHANT', selectedReceipt.merchant_id === 'prime-gadgets' ? 'Flipkart Assured' : 'Amazon India'],
                ['ITEM', selectedReceipt.product?.name || selectedReceipt.product_name],
                ['AMOUNT', `₹${selectedReceipt.amount} INR`],
                ['PAYMENT METHOD', 'UPI Autopay (0-OTP)'],
                ['AP2 MANDATE TOKEN', selectedReceipt.mandate_id],
                ['STATUS', 'OFFICIALLY SETTLED'],
                ['TIMESTAMP', selectedReceipt.created_at ? new Date(selectedReceipt.created_at).toLocaleString() : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-[#8F8A7E] dark:text-[#64748B] shrink-0">{label}:</span>
                  <span className={`font-bold text-[#1F2421] dark:text-[#F8FAFC] text-right ${label === 'AMOUNT' ? 'text-sm' : ''} ${label === 'STATUS' ? 'text-[#1F2421] dark:text-white' : ''}`}>{value}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#DFD9CE] dark:border-white/10">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-full py-2.5 rounded-xl bg-[#27272A] dark:bg-white hover:bg-[#18181B] dark:hover:bg-gray-100 text-white dark:text-black font-bold text-xs shadow-2xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
