'use client';
import { useState } from 'react';
import { 
  Bot, 
  BarChart3, 
  ShoppingBag, 
  Store, 
  Sliders, 
  Zap, 
  ShieldCheck, 
  ExternalLink,
  History,
  Lock,
  ChevronRight,
  Tag,
  Eye,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import AgentPayLogo from './AgentPayLogo';

export default function HoverSidebar({
  currentView = 'studio',
  onSelectView,
  onOpenProfile,
  onOpenAutopay,
  isHovered = false,
  onHoverChange,
  profile
}) {
  const [internalHover, setInternalHover] = useState(false);
  const hovered = isHovered !== undefined && onHoverChange ? isHovered : internalHover;

  const handleMouseEnter = () => {
    setInternalHover(true);
    if (onHoverChange) onHoverChange(true);
  };

  const handleMouseLeave = () => {
    setInternalHover(false);
    if (onHoverChange) onHoverChange(false);
  };

  const navItems = [
    {
      id: 'studio',
      label: 'Autonomous Studio',
      icon: Bot,
      type: 'view'
    },
    {
      id: 'history',
      label: 'AI Purchase History',
      icon: ShoppingBag,
      type: 'view'
    },
    {
      id: 'watchlist',
      label: 'Price Watchlist',
      icon: Eye,
      type: 'view'
    },
    {
      id: 'insights',
      label: 'Spend Analytics',
      icon: BarChart3,
      type: 'view'
    },
    {
      id: 'autopay',
      label: 'UPI Autopay Vault',
      icon: Zap,
      type: 'view'
    },
    {
      id: 'personalization',
      label: 'Personalization & Policy',
      icon: Sliders,
      type: 'view'
    }
  ];

  const externalStores = [
    {
      label: 'Amazon India',
      href: '/merchants/aura-tech',
      icon: Store,
      badge: 'Prime'
    },
    {
      label: 'Flipkart Assured',
      href: '/merchants/prime-gadgets',
      icon: ShoppingBag,
      badge: 'Assured'
    },
    {
      label: 'Meesho Direct',
      href: '/merchants/meesho-direct',
      icon: Tag,
      badge: 'Wholesale'
    }
  ];

  const initials = (profile?.name || 'Autonomous Shopper')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed top-0 left-0 h-screen z-50 bg-[#FAF8F5]/90 dark:bg-[#121215]/90 backdrop-blur-md border-r border-[#DFD9CE] dark:border-[#27272C] transition-[width,padding,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-sm flex flex-col justify-between py-4 select-none will-change-[width] ${
        hovered ? 'w-72 px-4' : 'w-[72px] px-2.5'
      }`}
    >
      {/* Top Branding Section */}
      <div>
        <div className={`flex items-center mb-6 h-12 transition-all duration-300 ${hovered ? 'space-x-3.5 px-1.5' : 'justify-center'}`}>
          <AgentPayLogo size={42} />
          <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            hovered ? 'opacity-100 max-w-[200px] translate-x-0' : 'opacity-0 max-w-0 -translate-x-2 pointer-events-none'
          }`}>
            <h2 className="text-sm font-black text-[#1F2421] dark:text-[#F4F4F5] tracking-tight uppercase">
              AGENTPAY
            </h2>
            <span className="text-[11px] text-[#6E736D] dark:text-[#A1A1AA] font-mono font-medium block">
              A Razorpay Initiative
            </span>
          </div>
        </div>

        {/* Primary View Navigation */}
        <div className="space-y-1.5">
          <div className={`text-[11px] font-extrabold text-[#8F8A7E] dark:text-[#71717A] uppercase tracking-wider mb-2.5 px-3 whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            hovered ? 'opacity-100 max-h-6' : 'opacity-0 max-h-0 pointer-events-none'
          }`}>
            DASHBOARDS
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.type === 'action' && item.onClick) {
                    item.onClick();
                  } else if (onSelectView) {
                    onSelectView(item.id);
                  }
                }}
                className={`flex items-center transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer w-full rounded-xl ${
                  hovered
                    ? `px-3.5 py-3 space-x-3.5 text-[13.5px] font-semibold ${
                        isActive
                          ? 'bg-[#27272A] dark:bg-white text-white dark:text-black dark:border-white/20 shadow-xs'
                          : 'text-[#44403C] dark:text-[#94A3B8] hover:bg-[#F0ECE4] dark:hover:bg-[#181B22] hover:text-[#1F2421] dark:hover:text-[#F8FAFC]'
                      }`
                    : `h-11 justify-center ${
                        isActive
                          ? 'bg-[#27272A] dark:bg-white text-white dark:text-black dark:border-white/20 shadow-xs'
                          : 'text-[#6E736D] dark:text-[#94A3B8] hover:bg-[#F0ECE4] dark:hover:bg-[#181B22] hover:text-[#1F2421] dark:hover:text-[#F8FAFC]'
                      }`
                }`}
                title={!hovered ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-white dark:text-black' : 'text-[#78716C] dark:text-[#94A3B8]'}`} />
                <span className={`truncate whitespace-nowrap text-left transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  hovered ? 'opacity-100 max-w-[180px] translate-x-0' : 'opacity-0 max-w-0 -translate-x-2 overflow-hidden'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Connected External Merchant Stores */}
        <div className="mt-7 space-y-1.5">
          <div className={`text-[11px] font-extrabold text-[#8F8A7E] dark:text-[#71717A] uppercase tracking-wider mb-2.5 px-3 whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            hovered ? 'opacity-100 max-h-6' : 'opacity-0 max-h-0 pointer-events-none'
          }`}>
            STOREFRONTS
          </div>

          {externalStores.map((store, sIdx) => {
            const Icon = store.icon;
            return (
              <Link
                key={sIdx}
                href={store.href}
                className={`flex items-center transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer w-full rounded-xl ${
                  hovered
                    ? 'px-3.5 py-2.5 space-x-3.5 text-[13.5px] font-medium text-[#44403C] dark:text-[#D4D4D8] hover:bg-[#F0ECE4] dark:hover:bg-[#1E1E23] hover:text-[#1F2421] dark:hover:text-white'
                    : 'h-11 justify-center text-[#78716C] dark:text-[#A1A1AA] hover:bg-[#F0ECE4] dark:hover:bg-[#1E1E23] hover:text-[#1F2421] dark:hover:text-white'
                }`}
                title={!hovered ? store.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0 text-[#78716C] dark:text-[#A1A1AA]" />
                <div className={`flex items-center justify-between flex-1 truncate transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  hovered ? 'opacity-100 max-w-[180px] translate-x-0' : 'opacity-0 max-w-0 -translate-x-2 overflow-hidden'
                }`}>
                  <span className="truncate">{store.label}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#8F8A7E] dark:text-[#71717A] opacity-70 ml-1.5 flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom User Profile Section */}
      <div className="pt-3 border-t border-[#DFD9CE] dark:border-[#27272C] space-y-2">
        {/* Interactive User Profile Card */}
        <button
          type="button"
          onClick={() => {
            if (onOpenProfile) onOpenProfile();
          }}
          className={`w-full flex items-center transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-xl cursor-pointer ${
            hovered 
              ? 'p-2.5 space-x-3 bg-[#F0ECE4] dark:bg-[#1A1A1F] hover:bg-[#EAE6DE] dark:hover:bg-[#23232A] border border-[#DFD9CE] dark:border-[#27272C]' 
              : 'h-11 justify-center hover:bg-[#F0ECE4] dark:hover:bg-[#1E1E23]'
          }`}
          title="Open Profile & Personalization"
        >
          {/* User Avatar with Status Indicator */}
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-stone-800 to-stone-700 dark:from-stone-700 dark:to-stone-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#27272A] dark:bg-white ring-2 ring-[#FAF8F5] dark:ring-[#121215]" />
          </div>

          {/* User Details (Visible on Hover) */}
          <div className={`flex-1 min-w-0 text-left transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            hovered ? 'opacity-100 max-w-[150px] translate-x-0' : 'opacity-0 max-w-0 -translate-x-2 overflow-hidden'
          }`}>
            <h4 className="text-[13px] font-bold text-[#1F2421] dark:text-[#F4F4F5] truncate leading-tight">
              {profile?.name || 'Autonomous Shopper'}
            </h4>
            <p className="text-[10.5px] font-mono text-[#6E736D] dark:text-[#A1A1AA] truncate leading-tight mt-0.5">
              {profile?.upi_vpa || 'shopper@oksbi'}
            </p>
          </div>
        </button>
      </div>
    </aside>
  );
}
