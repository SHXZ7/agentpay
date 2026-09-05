'use client';
import { useState, useEffect } from 'react';
import StoreHeader from '@/components/StoreHeader';
import MandateInspector from '@/components/MandateInspector';
import UPIAutopayCard from '@/components/UPIAutopayCard';
import UPIAutopayModal from '@/components/UPIAutopayModal';
import AuditLogViewer from '@/components/AuditLogViewer';
import CheckoutResultModal from '@/components/CheckoutResultModal';
import AgentCommandModal from '@/components/AgentCommandModal';
import UserProfileModal from '@/components/UserProfileModal';
import HoverSidebar from '@/components/HoverSidebar';
import InsightsDashboard from '@/components/InsightsDashboard';
import PersonalizationDashboard from '@/components/PersonalizationDashboard';
import AuditLedgerDashboard from '@/components/AuditLedgerDashboard';
import PurchaseHistoryDashboard from '@/components/PurchaseHistoryDashboard';
import UPIAutopayDashboard from '@/components/UPIAutopayDashboard';
import WatchlistDashboard from '@/components/WatchlistDashboard';
import AuthScreen from '@/components/AuthScreen';
import {
  fetchHealth,
  runAgentShop,
  fetchAuditLogs,
  resetDatabase,
  executeCheckout,
  fetchCurrentUserProfile
} from '@/lib/api';
import confetti from 'canvas-confetti';
import { Search, Sparkles, Globe, ExternalLink, ShieldCheck, ArrowUpRight, ArrowUp, Bot, CheckCircle2, ChevronRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [currentView, setCurrentView] = useState('studio'); // 'studio' or 'insights'
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [health, setHealth] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [mandate, setMandate] = useState(null);
  const [autopay, setAutopay] = useState(null);
  const [isAutopayModalOpen, setIsAutopayModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('profile');
  const [profile, setProfile] = useState({ name: "Autonomous Shopper" });
  const [activeOrder, setActiveOrder] = useState(null);
  const [upsell, setUpsell] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  const [isBuyingUpsell, setIsBuyingUpsell] = useState(false);
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [isAuthScreenOpen, setIsAuthScreenOpen] = useState(false);

  // Staged Execution State
  const [activeFlow, setActiveFlow] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('agentic_theme') || 'light';
    setTheme(saved);
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('agentic_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const fetchAutopay = async () => {
    try {
      const res = await fetch('http://localhost:5000/autopay/status');
      const data = await res.json();
      if (data.autopay) setAutopay(data.autopay);
    } catch (e) {
      console.warn("Autopay status check:", e.message);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/orders');
      const data = await res.json();
      if (data.orders) setRecentOrders(data.orders);
    } catch (e) {
      console.warn("Orders check:", e.message);
    }
  };

  const fetchActiveMandate = async () => {
    try {
      const res = await fetch('http://localhost:5000/mandates/active');
      const data = await res.json();
      if (data.mandate) setMandate(data.mandate);
    } catch (e) {
      console.warn("Active mandate check:", e.message);
    }
  };

  const fetchProfile = async () => {
    try {
      const data = await fetchCurrentUserProfile();
      if (data.user) {
        setProfile(data.user);
      } else if (data.profile) {
        setProfile(data.profile);
      }
    } catch (e) {
      console.warn("Profile check:", e.message);
    }
  };

  const loadData = async () => {
    try {
      const [h, logs] = await Promise.all([
        fetchHealth(),
        fetchAuditLogs()
      ]);
      setHealth(h);
      setAuditLogs(logs);
      await fetchAutopay();
      await fetchOrders();
      await fetchActiveMandate();
      await fetchProfile();
    } catch (err) {
      console.error("Initialization error:", err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      const logs = await fetchAuditLogs();
      if (logs) setAuditLogs(logs);
      await fetchAutopay();
      await fetchOrders();
      await fetchActiveMandate();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshLogs = async () => {
    setIsRefreshingLogs(true);
    const logs = await fetchAuditLogs();
    setAuditLogs(logs);
    setIsRefreshingLogs(false);
  };

  const handleReset = async () => {
    setIsResetting(true);
    await resetDatabase();
    setMandate(null);
    setActiveOrder(null);
    setUpsell(null);
    setActiveFlow(null);
    await loadData();
    setIsResetting(false);
  };

  // Staged Autonomous Execution Flow
  const handleRunAgent = async (prompt, explicitBudget = null, forceCategory = null, history = [], selectedModel = null, agentMode = 'autonomous') => {
    if (isRunning) return;
    setIsRunning(true);
    setUpsell(null);

    // Open modal if not already open
    setIsCommandModalOpen(true);

    const lower = prompt.toLowerCase().trim();
    const isWhyCantBuy = lower.includes("why cant") || lower.includes("why can't") || lower.includes("why did it fail") || lower.includes("why was it blocked") || lower.includes("why couldn't");

    const KNOWN_BRANDS = [
      "logitech", "cosmic byte", "apple", "anker", "zebronics", "sony", "portronics", 
      "boat", "noise", "dell", "hp", "razer", "boult", "oneplus", "samsung", 
      "blue tokai", "sandisk", "redragon", "crucial", "tp-link", "lenovo", "asus"
    ];
    
    const KNOWN_SPEC_MODIFIERS = [
      "wireless", "wired", "bluetooth", "silent", "gaming", "mechanical", "rgb", 
      "optical", "rechargeable", "ergonomic", "type c", "type-c", "fast charging", 
      "anc", "noise cancelling", "tws", "dark roast", "dpi", "100w", "65w", "4k", 
      "1080p", "1tb", "500gb", "256gb", "supercoins", "prime"
    ];

    const hasSpecificBrand = KNOWN_BRANDS.some(b => lower.includes(b));
    const hasSpecificSpecs = KNOWN_SPEC_MODIFIERS.some(s => lower.includes(s));
    const hasBudgetConstraint = /(?:under|below|budget|within|upto|up to|less than)\s*(?:₹|rs\.?|inr)?\s*\d+/i.test(lower) || explicitBudget !== null;
    const hasExplicitSelection = (
      lower.includes("option 1") || lower.includes("option 2") || lower.includes("option 3") ||
      lower.includes("1st") || lower.includes("2nd") || lower.includes("3rd") ||
      lower.includes("first") || lower.includes("second") || lower.includes("third") ||
      lower.includes("this one") || lower.includes("that one") ||
      lower === "yes" || lower === "proceed" || lower === "confirm" || lower === "do it"
    );

    // Vague purchase query (e.g. "buy a mouse", "buy headphones", "order a keyboard")
    const isVaguePurchase = (
      (lower.startsWith("buy ") || lower.startsWith("order ") || lower.startsWith("purchase ") || lower.startsWith("get me ")) &&
      !hasSpecificBrand &&
      !hasSpecificSpecs &&
      !hasBudgetConstraint &&
      !hasExplicitSelection
    );

    // Only show autonomous purchase execution stepper when actually buying finally
    const isDirectBuy = !isWhyCantBuy && !isVaguePurchase && agentMode !== 'advice_only' && (
      hasExplicitSelection ||
      hasSpecificBrand ||
      hasSpecificSpecs ||
      hasBudgetConstraint ||
      lower.startsWith("buy ") ||
      lower.startsWith("order ") ||
      lower.startsWith("purchase ") ||
      lower.includes("place order") ||
      lower.includes("checkout") ||
      lower.includes("execute purchase") ||
      lower.includes("proceed with buy") ||
      lower.includes("yes buy") ||
      lower.includes("buy this") ||
      lower.includes("buy 0-otp")
    );

    if (isDirectBuy) {
      setActiveFlow({
        currentStep: 1,
        prompt,
        discoveredOffers: [],
        chosenOffer: null,
        mandate: null,
        checkout: null
      });
    } else {
      setActiveFlow(null);
    }

    try {
      const resPromise = runAgentShop({
        prompt,
        explicit_budget: explicitBudget,
        force_category: forceCategory,
        history,
        selected_model: selectedModel,
        agent_mode: agentMode
      });

      if (isDirectBuy) {
        // Stage 1 -> Stage 2 (Visiting Stores Preview)
        await new Promise(r => setTimeout(r, 450));
        setActiveFlow(prev => prev ? ({
          ...prev,
          currentStep: 2
        }) : null);

        // Stage 2 -> Stage 3 (AI Scanning & Live Store Evaluation)
        await new Promise(r => setTimeout(r, 400));
        setActiveFlow(prev => prev ? ({
          ...prev,
          currentStep: 3
        }) : null);
      }

      const backendRes = await resPromise;

      if (backendRes && backendRes.is_checkout_flow && backendRes.checkout) {
        const realProduct = backendRes.checkout?.order?.product || backendRes.discoveredOffers?.[0] || null;
        const realPrice = backendRes.checkout?.order?.amount || realProduct?.price || 0;
        const realName = realProduct?.name || backendRes.checkout?.order?.product_name || "Verified Merchant Item";
        const realMerchant = realProduct?.merchant_name || backendRes.checkout?.order?.merchant_name || "Amazon India (Prime ✓)";

        const liveChosenOffer = {
          name: realName,
          product_name: realName,
          price: realPrice,
          merchant_name: realMerchant,
          merchant_id: realProduct?.merchant_id || "aura-tech"
        };

        if (backendRes.mandate) {
          setMandate(backendRes.mandate);
        }

        setActiveFlow(prev => ({
          ...prev,
          currentStep: 4,
          discoveredOffers: backendRes.discoveredOffers || [],
          chosenOffer: liveChosenOffer,
          negotiation: backendRes.negotiation,
          mandate: backendRes.mandate
        }));

        // Stage 4 -> Stage 5 (Razorpay Checkout & Result)
        await new Promise(r => setTimeout(r, 450));
        setActiveFlow(prev => ({
          ...prev,
          currentStep: 5,
          discoveredOffers: backendRes.discoveredOffers || [],
          chosenOffer: liveChosenOffer,
          negotiation: backendRes.negotiation,
          mandate: backendRes.mandate,
          checkout: backendRes.checkout
        }));
      } else {
        // Non-checkout or clarifying query: immediately clear execution flow
        setActiveFlow(null);
      }

      if (backendRes?.is_checkout_flow && backendRes?.checkout?.success && backendRes?.checkout?.order) {
        setActiveOrder(backendRes.checkout.order);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      if (backendRes?.upsell) {
        setUpsell(backendRes.upsell);
      }

      const updatedLogs = await fetchAuditLogs();
      setAuditLogs(updatedLogs);
      await fetchAutopay();
      await fetchOrders();
      await loadData();

      return backendRes;
    } catch (err) {
      console.error("Agent flow error:", err);
      if (isDirectBuy) {
        setActiveFlow(prev => ({
          ...prev,
          currentStep: 5,
          checkout: { success: false, reason: err.message }
        }));
      }
      return null;
    } finally {
      setIsRunning(false);
    }
  };

  const handleSelectPreset = (prompt, budget, category) => {
    handleRunAgent(prompt, budget, category);
  };

  const handleBuyUpsell = async (productId) => {
    if (!mandate) return;
    setIsBuyingUpsell(true);
    try {
      const res = await executeCheckout({
        item_id: productId,
        mandate_id: mandate.mandate_id
      });
      if (res.success && res.order) {
        setActiveOrder(res.order);
        setMandate(prev => ({
          ...prev,
          remaining_budget: res.remaining_budget,
          spent_amount: (prev.spent_amount || 0) + res.order.amount
        }));
      }
      const logs = await fetchAuditLogs();
      setAuditLogs(logs);
      await fetchAutopay();
      await fetchOrders();
    } catch (err) {
      console.error("Upsell execution error:", err);
    } finally {
      setIsBuyingUpsell(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#EAE6DE] dark:bg-[#0C0C0E] text-[#1F2421] dark:text-[#F4F4F5] font-sans pb-24 transition-colors duration-200">
      
      {/* 🚀 Hover-Expanding Left Sidebar Dock */}
      <HoverSidebar
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        onOpenProfile={() => {
          setProfileTab('profile');
          setIsProfileModalOpen(true);
        }}
        onOpenAutopay={() => setIsAutopayModalOpen(true)}
        activeOrderCount={recentOrders.length}
        autopayActive={autopay?.is_active}
        isHovered={isSidebarHovered}
        onHoverChange={(h) => setIsSidebarHovered(h)}
        profile={profile}
      />

      {/* Main Content Wrapper (Shifted smoothly with sidebar expansion) */}
      <div className={`transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[padding] ${isSidebarHovered ? 'pl-72' : 'pl-[72px]'}`}>
        
        {/* 1. Header with Multi-Window Launchers */}
        <StoreHeader
          health={health}
          onReset={handleReset}
          isResetting={isResetting}
          currentView={currentView}
          userName={profile?.name || "Autonomous Shopper"}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenPersonalization={() => setCurrentView('personalization')}
          onOpenVoice={() => setIsCommandModalOpen(true)}
        />

        {/* Main Container (Edge-to-Edge Fluid Wide Canvas) */}
        <main className="flex-1 w-full px-4 sm:px-6 py-5 space-y-6 max-w-none">
          
          {/* VIEW 1: Insights & Intelligence Dashboard */}
          {currentView === 'insights' && (
            <InsightsDashboard
              orders={recentOrders}
              mandate={mandate}
              autopay={autopay}
              auditLogs={auditLogs}
              onSwitchToStudio={() => setCurrentView('studio')}
              onOpenProfile={() => setCurrentView('personalization')}
            />
          )}

          {/* VIEW 2: AI Purchase History + Inline Audit Ledger */}
          {currentView === 'history' && (
            <PurchaseHistoryDashboard
              orders={recentOrders}
              auditLogs={auditLogs}
              onSwitchToStudio={() => setCurrentView('studio')}
            />
          )}

          {/* VIEW 2b: Price Watchlist Dashboard */}
          {currentView === 'watchlist' && (
            <WatchlistDashboard />
          )}

          {/* VIEW 3: Dedicated Personalization & AP2 Policy Dashboard */}
          {currentView === 'personalization' && (
            <PersonalizationDashboard
              onPolicyUpdated={(p, m) => {
                if (m) setMandate(m);
                if (p) setProfile(p);
                loadData();
              }}
              onSwitchToStudio={() => setCurrentView('studio')}
            />
          )}

          {/* VIEW 3: Dedicated Forensic Audit Ledger Dashboard */}
          {currentView === 'audit' && (
            <AuditLedgerDashboard
              logs={auditLogs}
              onRefresh={handleRefreshLogs}
              isRefreshing={isRefreshingLogs}
            />
          )}

          {/* VIEW 4: Dedicated UPI Autopay Fiduciary Vault Dashboard */}
          {currentView === 'autopay' && (
            <UPIAutopayDashboard
              autopay={autopay}
              orders={recentOrders}
              onAuthorize={(ap) => {
                setAutopay(ap);
                fetchAutopay();
                fetchAuditLogs().then(setAuditLogs);
              }}
              onRevoke={(revokedAp) => {
                if (revokedAp) setAutopay(revokedAp);
                else setAutopay(prev => ({ ...prev, is_active: false, token_id: null }));
                fetchAutopay();
                fetchAuditLogs().then(setAuditLogs);
              }}
              onRefresh={fetchAutopay}
            />
          )}

          {/* VIEW 5: Autonomous Studio & Live Checkout Dashboard */}
          {currentView === 'studio' && (
            <>
              {/* 2-Column Balanced Wide Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Column: Security & Mandate Vault */}
                <div className="space-y-5">
                  {/* UPI Autopay Vault */}
                  <UPIAutopayCard
                    autopay={autopay}
                    onOpenModal={() => setCurrentView('autopay')}
                    onRevoke={async () => {
                      await fetchAutopay();
                      await fetchOrders();
                      await fetchAuditLogs();
                    }}
                  />

                  {/* AP2 Mandate Inspector */}
                  <MandateInspector
                    mandate={mandate}
                    onOpenProfile={() => setCurrentView('personalization')}
                  />
                </div>

                {/* Right Column: Connected Stores & Live Activity */}
                <div className="space-y-5">
                  
                  {/* Connected Stores Card */}
                  <div className="p-5 rounded-2xl border border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#18181B] shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#DFD9CE] dark:border-white/10">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-[#6E736D] dark:text-zinc-400" />
                        <h3 className="text-xs font-bold text-[#1F2421] dark:text-white uppercase tracking-wider">
                          Connected Merchant Storefronts (1,500+ Items)
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-[#1F2421] dark:text-white font-semibold flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#27272A] dark:bg-white inline-block mr-1"></span>
                        3 Online
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* Store A Link (Amazon India) */}
                      <Link
                        href="/merchants/aura-tech"
                        target="_blank"
                        className="p-4 rounded-2xl bg-white dark:bg-[#1F1F23] hover:bg-[#FAF8F5] dark:hover:bg-[#27272A] border border-[#DFD9CE] dark:border-white/10 shadow-2xs hover:border-[#131921] dark:hover:border-amber-500/50 dark:hover:shadow-[0_0_20px_rgba(245,158,11,0.12)] transition-all duration-200 group flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#131921] text-amber-400 font-black flex items-center justify-center text-sm shadow-2xs flex-shrink-0">
                            amz
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#1C1917] dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition leading-tight">
                              Amazon India
                            </h4>
                            <span className="text-[11px] text-[#78716C] dark:text-zinc-400 block mt-0.5">
                              500+ Prime Flagships
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-[#A8A29E] group-hover:text-[#1C1917] dark:group-hover:text-white transition flex-shrink-0 ml-2" />
                      </Link>

                      {/* Store B Link (Flipkart) */}
                      <Link
                        href="/merchants/prime-gadgets"
                        target="_blank"
                        className="p-4 rounded-2xl bg-white dark:bg-[#1F1F23] hover:bg-[#FAF8F5] dark:hover:bg-[#27272A] border border-[#DFD9CE] dark:border-white/10 shadow-2xs hover:border-[#2874F0] dark:hover:border-blue-500/50 dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.12)] transition-all duration-200 group flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#2874F0] text-white font-black italic flex items-center justify-center text-xs shadow-2xs flex-shrink-0">
                            FK✦
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#1C1917] dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition leading-tight">
                              Flipkart Assured
                            </h4>
                            <span className="text-[11px] text-[#78716C] dark:text-zinc-400 block mt-0.5">
                              500+ Gaming Gear
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-[#A8A29E] group-hover:text-[#1C1917] dark:group-hover:text-white transition flex-shrink-0 ml-2" />
                      </Link>

                      {/* Store C Link (Meesho) */}
                      <Link
                        href="/merchants/meesho-direct"
                        target="_blank"
                        className="p-4 rounded-2xl bg-white dark:bg-[#1F1F23] hover:bg-[#FAF8F5] dark:hover:bg-[#27272A] border border-[#DFD9CE] dark:border-white/10 shadow-2xs hover:border-[#F43397] dark:hover:border-pink-500/50 dark:hover:shadow-[0_0_20px_rgba(244,51,151,0.12)] transition-all duration-200 group flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#F43397] text-white font-black flex items-center justify-center text-xs shadow-2xs flex-shrink-0">
                            msh
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#1C1917] dark:text-white group-hover:text-[#F43397] dark:group-hover:text-pink-400 transition leading-tight">
                              Meesho Direct
                            </h4>
                            <span className="text-[11px] text-[#78716C] dark:text-zinc-400 block mt-0.5">
                              500+ Factory Deals
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-[#A8A29E] group-hover:text-[#1C1917] dark:group-hover:text-white transition flex-shrink-0 ml-2" />
                      </Link>
                    </div>
                  </div>

                  {/* Live Autonomous Purchases Feed */}
                  <div className="p-5 rounded-2xl border border-[#DFD9CE] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#18181B] shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#DFD9CE] dark:border-white/10">
                      <div className="flex items-center space-x-2">
                        <ShoppingBag className="w-4 h-4 text-[#8F8A7E] dark:text-zinc-400" />
                        <h3 className="text-xs font-bold text-[#1F2421] dark:text-white uppercase tracking-wider">
                          Recent Autonomous AI Orders
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-[#6E736D] dark:text-zinc-400">
                        {recentOrders.length} Completed
                      </span>
                    </div>

                    {recentOrders.length === 0 ? (
                      <div className="p-6 text-center text-[#8F8A7E] dark:text-zinc-500 font-mono text-xs">
                        No orders yet. Click the search trigger below to execute your first autonomous purchase.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {recentOrders.slice(0, 4).map((o, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-[#F0ECE4] dark:bg-[#27272A] border border-[#DFD9CE] dark:border-white/10 flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2.5">
                              <span className="text-lg">{o.product?.image || '📦'}</span>
                              <div>
                                <span className="font-semibold text-[#1F2421] dark:text-white block line-clamp-1">{o.product?.name}</span>
                                <span className="text-[10px] font-mono text-[#6E736D] dark:text-zinc-400">{o.order_id}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-[#1F2421] dark:text-white text-xs">₹{o.amount} INR</span>
                              <span className="text-[9px] font-mono block text-[#8F8A7E] dark:text-zinc-400">SETTLED</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </>
          )}

        </main>
      </div>

      {/* 🚀 FLOATING BOTTOM-CENTER CURSOR-STYLE SEARCH COMPOSER TRIGGER */}
      <div className={`fixed bottom-6 z-40 w-full max-w-2xl px-4 transition-all duration-300 ease-in-out ${
        isSidebarHovered ? 'left-[calc(50%+6rem)] -translate-x-1/2' : 'left-1/2 -translate-x-1/2'
      }`}>
        <div
          onClick={() => setIsCommandModalOpen(true)}
          className="w-full p-3 rounded-2xl bg-[#FAF8F5]/95 dark:bg-[#18181B]/95 hover:bg-[#FAF8F5] dark:hover:bg-[#27272A] border border-[#DFD9CE] dark:border-white/10 hover:border-[#8F8A7E] dark:hover:border-white/30 text-[#1F2421] dark:text-white shadow-2xl backdrop-blur-xl transition-all duration-200 cursor-pointer space-y-2 group hover:scale-[1.005]"
        >
          {/* Middle Prompt Line */}
          <div className="flex items-center space-x-2.5 px-1 py-0.5">
            <span className="text-xs font-medium text-[#1F2421] dark:text-zinc-200 truncate">
              Ask AI Agent to buy something, compare delivery, or check coupons...
            </span>
          </div>

          {/* Bottom Toolbar inside composer (Cursor Style) */}
          <div className="flex items-center justify-between pt-1.5 border-t border-[#DFD9CE]/70 dark:border-white/10">
            <div className="flex items-center space-x-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-[#F0ECE4] dark:bg-[#27272A] text-[#1F2421] dark:text-white font-semibold text-[11px] border border-[#DFD9CE] dark:border-white/10 flex items-center space-x-1">
                <span>♾️</span>
                <span>Agent</span>
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-[#F0ECE4] dark:bg-[#27272A] text-[#1F2421] dark:text-white font-semibold text-[11px] border border-[#DFD9CE] dark:border-white/10">
                Auto (Llama 3.3 70B) ▾
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full bg-[#27272A] dark:bg-white text-white dark:text-black flex items-center justify-center shadow-2xs group-hover:bg-[#18181B] dark:group-hover:bg-zinc-200 transition">
                <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Transparent Command Modal */}
      <AgentCommandModal
        isOpen={isCommandModalOpen}
        onClose={() => setIsCommandModalOpen(false)}
        activeFlow={activeFlow}
        isRunning={isRunning}
        onRunAgent={handleRunAgent}
        mandate={mandate}
        onSelectPreset={handleSelectPreset}
        theme={theme}
      />

      {/* UPI Autopay Modal */}
      <UPIAutopayModal
        isOpen={isAutopayModalOpen}
        onClose={() => setIsAutopayModalOpen(false)}
        onAuthorized={(ap) => {
          setAutopay(ap);
          loadData();
        }}
      />

      {/* User Account & Identity Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenAuth={() => {
          setIsProfileModalOpen(false);
          setIsAuthScreenOpen(true);
        }}
        onProfileUpdated={(updated) => {
          setProfile(updated);
          loadData();
        }}
      />

      {/* Full-Screen Login & Signup Overlay Screen */}
      {isAuthScreenOpen && (
        <div className="fixed inset-0 z-[99999] bg-[#FAF8F5] overflow-y-auto animate-fade-in">
          <AuthScreen
            onLoginSuccess={(user) => {
              setProfile(user);
              setIsAuthScreenOpen(false);
              loadData();
            }}
            onClose={() => setIsAuthScreenOpen(false)}
            isModal={true}
          />
        </div>
      )}

      {/* Checkout Result Modal (Only display when outside the AI chat modal) */}
      {activeOrder && !isCommandModalOpen && (
        <CheckoutResultModal
          result={{
            success: true,
            order: activeOrder,
            mandate
          }}
          onClose={() => setActiveOrder(null)}
          onLaunchRazorpayModal={(ord) => {
            if (typeof window !== 'undefined' && window.Razorpay) {
              const rzp = new window.Razorpay({
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TTehqJrjmGbQN0',
                amount: (ord.amount || 799) * 100,
                currency: 'INR',
                name: 'Razorpay AgentPay',
                description: `Settlement for Order #${ord.order_id}`,
                order_id: ord.order_id,
                prefill: { name: 'AI Autonomous Shopper', email: 'shopper@agentic.commerce' },
                theme: { color: '#D4A94E' }
              });
              rzp.open();
            }
          }}
        />
      )}

    </div>
  );
}
