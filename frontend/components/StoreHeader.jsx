'use client';
import { ChevronDown, Sun, Moon, Mic } from 'lucide-react';

export default function StoreHeader({
  health,
  onReset,
  isResetting,
  onOpenProfile,
  onOpenVoice,
  userName = "Autonomous Shopper",
  currentView = "studio",
  theme = "light",
  onToggleTheme
}) {
  const getInitials = (name) => {
    if (!name) return 'AS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const sectionTitle = 
    currentView === 'history' ? 'AI Purchase History' :
    currentView === 'watchlist' ? 'Price Watchlist & Triggers' :
    currentView === 'insights' ? 'Spend Analytics' :
    currentView === 'autopay' ? 'UPI Autopay Fiduciary Vault' :
    currentView === 'personalization' ? 'Personalization & Policy' :
    currentView === 'audit' ? 'Security & Audit Record' :
    'Autonomous Studio';

  const isDark = theme === 'dark';

  return (
    <header className="border-b border-[#DFD9CE]/80 dark:border-[#27272C] bg-[#FAF8F5]/85 dark:bg-[#121215]/85 backdrop-blur-md sticky top-0 z-30 shadow-2xs w-full transition-all duration-200">
      <div className="w-full px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Active Section Name at Top Left */}
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <h1 className="text-[17px] sm:text-lg font-bold text-[#1F2421] dark:text-[#F4F4F5] tracking-tight truncate">
            {sectionTitle}
          </h1>
        </div>

        {/* Action Controls at Top Right */}
        <div className="flex items-center space-x-2.5 flex-shrink-0">
          
          {/* ☀️ / 🌙 Dark Mode Switcher (Icon Only) */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-xl bg-[#F0ECE4] hover:bg-[#EAE6DE] dark:bg-[#18181C] dark:hover:bg-[#232328] text-[#44403C] hover:text-[#1F2421] dark:text-[#D4D4D8] dark:hover:text-white border border-[#DFD9CE] dark:border-[#27272C] transition flex items-center justify-center shadow-2xs cursor-pointer"
            title={isDark ? "Switch to Light Mode (Zen Linen)" : "Switch to Dark Mode (Obsidian)"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[#27272A] dark:text-[#F4F4F5]" />
            )}
          </button>

          {/* Top Right User Profile Avatar Pill */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center space-x-2 pl-1.5 pr-2.5 py-1 rounded-full bg-[#F0ECE4] hover:bg-[#EAE6DE] dark:bg-[#181B22] dark:hover:bg-[#222630] border border-[#DFD9CE] dark:border-white/10 text-xs font-semibold transition shadow-2xs whitespace-nowrap cursor-pointer group"
            title="Edit Profile & Account Identity"
          >
            <div className="w-6 h-6 rounded-full bg-[#27272A] dark:bg-white text-white dark:text-black font-bold text-[10px] flex items-center justify-center shadow-2xs">
              {getInitials(userName)}
            </div>
            <span className="text-[#1F2421] dark:text-[#F8FAFC] text-xs max-w-[140px] truncate">{userName}</span>
            <ChevronDown className="w-3 h-3 text-[#6E736D] dark:text-[#94A3B8] group-hover:text-[#1F2421] dark:group-hover:text-white" />
          </button>
        </div>
      </div>
    </header>
  );
}
