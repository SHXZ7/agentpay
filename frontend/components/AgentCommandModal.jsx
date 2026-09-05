'use client';
import { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  X, 
  Send, 
  Loader2, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  ShoppingBag, 
  CheckCircle2, 
  AlertTriangle, 
  Tag, 
  Truck, 
  RotateCcw,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Cpu,
  History,
  Layers,
  Plus,
  Copy,
  Check,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Mic,
  Square,
  ArrowUp,
  Store,
  FileText,
  Image as ImageIcon,
  FileCode,
  UploadCloud,
  FileSpreadsheet,
  CornerDownLeft,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Share2,
  MoreHorizontal,
  Download,
  Maximize2,
  Minimize2,
  Expand,
  Shrink
} from 'lucide-react';
import LiveAutonomousStepper from './LiveAutonomousStepper';
import MultiAgentNegotiationCard from './MultiAgentNegotiationCard';
import AmbientVoiceOrbView from './AmbientVoiceOrbView';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';

// ─── Module-level TTS helper (immune to React re-renders & stale closures) ──────
function speakAgentResponse(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;

  // Clean markdown/emoji
  const clean = text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[*_`#>~\[\]]/g, '')
    .replace(/₹/g, ' rupees ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 350);

  if (!clean) return;

  const doSpeak = () => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = 0.93;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    utter.lang = 'en-US';
    window._ttsUtterance = utter; // prevent GC

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const pick = voices.find(v =>
        v.name.includes('Google UK English Female') ||
        v.name.includes('Google US English') ||
        v.name.includes('Microsoft Zira') ||
        v.name.includes('Samantha')
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
      if (pick) utter.voice = pick;
    }

    window.speechSynthesis.speak(utter);
  };

  if (window.speechSynthesis.getVoices().length > 0) {
    doSpeak();
  } else {
    window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true });
    setTimeout(doSpeak, 800); // hard fallback if voiceschanged never fires
  }
}

const AVAILABLE_MODELS = [
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', badge: 'Recommended', desc: 'Latest Llama 4, best intelligence, cross-store price match & AP2 negotiation' },
  { id: 'llama3-70b-8192', name: 'Llama 3 70B', badge: 'Powerful', desc: 'High-intelligence reasoning with 8K context' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', badge: 'Ultra-Fast', desc: 'Sub-300ms real-time conversational response' },
  { id: 'llama3-8b-8192', name: 'Llama 3 8B', badge: 'Fast', desc: 'Lightweight and responsive, great for quick queries' },
  { id: 'deterministic', name: 'Deterministic Rule Engine', badge: 'Offline', desc: 'Zero-latency rule-based shopping agent, works without any API key' }
];

const AGENT_MODES = [
  { 
    id: 'autonomous', 
    name: 'Autonomous Agent', 
    icon: '♾️', 
    badge: 'Full Execution', 
    desc: 'Searches stores, negotiates discounts, signs AP2 mandate & auto-settles via 0-OTP Autopay' 
  },
  { 
    id: 'advice_only', 
    name: 'Advice Only', 
    icon: '💬', 
    badge: 'Consultative', 
    desc: 'Catalog comparisons, technical specs, warranty & buying advice (No spending/checkout)' 
  }
];

function formatInlineText(text, isUser) {
  if (!text) return null;
  const tokenRegex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={idx} className={isUser ? "font-bold text-white" : "font-bold text-[#1C1917] dark:text-[#F4F4F5]"}>
          {inner}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code key={idx} className="font-mono bg-[#F2ECE1] dark:bg-[#27272C] text-[#1C1917] dark:text-[#F4F4F5] px-1.5 py-0.5 rounded border border-[#DFD9CE] dark:border-[#383842] text-[11px] font-semibold mx-0.5">
          {inner}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
      const inner = part.slice(1, -1);
      return (
        <span key={idx} className="font-medium italic text-[#44403C] dark:text-[#D4D4D8]">
          {inner}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function RichMarkdownContent({ content = '', isUser = false }) {
  if (!content) return null;

  const rawLines = content.split('\n');
  const blocks = [];
  let currentTable = null;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Check for Markdown table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
      const isDivider = cells.every(c => /^:?-+:?$/.test(c));
      
      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else if (isDivider) {
        // Divider row, skip
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else if (currentTable) {
      blocks.push({ type: 'table', table: currentTable });
      currentTable = null;
    }

    if (!trimmed) {
      blocks.push({ type: 'empty' });
      continue;
    }

    // Dividers
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ type: 'divider' });
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.replace(/^###\s+/, '') });
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.replace(/^##\s+/, '') });
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.replace(/^#\s+/, '') });
      continue;
    }

    // Callouts / Guardrail alerts (🛡️, 💡, 🔒, ✅, 🏷️, 🔍, 💳, 🧾, 🔌, ⚠️)
    if (
      trimmed.startsWith('🛡️') || 
      trimmed.startsWith('💡') || 
      trimmed.startsWith('🔒') || 
      trimmed.startsWith('✅') || 
      trimmed.startsWith('🏷️') || 
      trimmed.startsWith('🔍') || 
      trimmed.startsWith('💳') || 
      trimmed.startsWith('🧾') || 
      trimmed.startsWith('🔌') ||
      trimmed.startsWith('⚠️')
    ) {
      blocks.push({ type: 'callout', text: trimmed });
      continue;
    }

    // Unordered Lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push({ type: 'bullet', text: trimmed.replace(/^[-*]\s+/, '') });
      continue;
    }

    // Numbered Lists
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      blocks.push({ type: 'numbered', num: numMatch[1], text: numMatch[2] });
      continue;
    }

    // Normal Paragraph
    blocks.push({ type: 'p', text: trimmed });
  }

  if (currentTable) {
    blocks.push({ type: 'table', table: currentTable });
  }

  return (
    <div className="space-y-2 font-sans text-[13px] leading-relaxed">
      {blocks.map((block, bIdx) => {
        if (block.type === 'empty') {
          return <div key={bIdx} className="h-1" />;
        }

        if (block.type === 'divider') {
          return <hr key={bIdx} className="border-t border-[#EAE5D9] dark:border-[#27272C] my-2.5" />;
        }

        if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
          return (
            <div key={bIdx} className="pt-1 pb-0.5">
              <h4 className="text-[14px] font-bold text-[#1C1917] dark:text-[#F4F4F5] tracking-tight flex items-center gap-1.5">
                {formatInlineText(block.text, isUser)}
              </h4>
            </div>
          );
        }

        if (block.type === 'callout') {
          const isGuardrail = block.text.includes('Guardrail') || block.text.includes('🛡️');
          const isTip = block.text.includes('💡') || block.text.includes('🏷️');
          
          return (
            <div 
              key={bIdx} 
              className={`p-3 rounded-xl border text-[12.5px] my-2 transition-all ${
                isGuardrail
                  ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-950 dark:text-amber-200'
                  : isTip
                  ? 'bg-emerald-50/70 dark:bg-white/10 border-emerald-200 dark:border-white/20 text-emerald-950 dark:text-[#F8FAFC]'
                  : 'bg-[#F4EFE6] dark:bg-[#1E1E23] border-[#DFD9CE] dark:border-[#2E2E36] text-[#1C1917] dark:text-[#F4F4F5]'
              }`}
            >
              {formatInlineText(block.text, isUser)}
            </div>
          );
        }

        if (block.type === 'bullet') {
          return (
            <div key={bIdx} className="flex items-start space-x-2 pl-1 my-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-white mt-2 flex-shrink-0" />
              <div className="flex-1">
                {formatInlineText(block.text, isUser)}
              </div>
            </div>
          );
        }

        if (block.type === 'numbered') {
          return (
            <div key={bIdx} className="flex items-start space-x-2.5 pl-1 my-1">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#F2ECE1] dark:bg-[#27272C] text-[#1C1917] dark:text-[#F4F4F5] border border-[#DFD9CE] dark:border-[#383842] flex-shrink-0 mt-0.5 shadow-2xs">
                {block.num}
              </span>
              <div className="flex-1">
                {formatInlineText(block.text, isUser)}
              </div>
            </div>
          );
        }

        if (block.type === 'table') {
          return (
            <div key={bIdx} className="my-2.5 overflow-x-auto rounded-xl border border-[#DFD9CE] dark:border-[#27272C]">
              <table className="w-full text-left border-collapse text-[12px]">
                {block.table.headers && block.table.headers.length > 0 && (
                  <thead>
                    <tr className="bg-[#F0ECE4] dark:bg-[#1E1E24] border-b border-[#DFD9CE] dark:border-[#27272C]">
                      {block.table.headers.map((th, thIdx) => (
                        <th key={thIdx} className="px-3 py-2 font-bold text-[#1C1917] dark:text-[#F4F4F5]">
                          {formatInlineText(th, isUser)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {block.table.rows.map((row, rIdx) => (
                    <tr 
                      key={rIdx} 
                      className={`border-b border-[#EAE5D9] dark:border-[#232328] last:border-b-0 ${
                        rIdx % 2 === 0 ? 'bg-white dark:bg-[#16161A]' : 'bg-[#FAF8F5] dark:bg-[#121215]'
                      }`}
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-[#44403C] dark:text-[#D4D4D8]">
                          {formatInlineText(cell, isUser)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <p key={bIdx} className="my-1">
            {formatInlineText(block.text, isUser)}
          </p>
        );
      })}
    </div>
  );
}

export default function AgentCommandModal({
  isOpen,
  onClose,
  activeFlow,
  isRunning,
  onRunAgent,
  mandate,
  onSelectPreset,
  onOrderCompleted,
  theme = 'light'
}) {
  const isDark = theme === 'dark';
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [selectedMode, setSelectedMode] = useState('autonomous');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [historyWidth, setHistoryWidth] = useState(270);
  const [isResizingHistory, setIsResizingHistory] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartWidth, setDragStartWidth] = useState(270);
  const [currentSessionTitle, setCurrentSessionTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleEditValue, setTitleEditValue] = useState('');
  const [activeMainView, setActiveMainView] = useState('chat'); // 'chat' | 'plugins'
  const [hoverMenuSessId, setHoverMenuSessId] = useState(null);
  const [pinnedSessions, setPinnedSessions] = useState([]);
  const [renamingSessId, setRenamingSessId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [allowedMerchants, setAllowedMerchants] = useState(['aura-tech', 'prime-gadgets']);
  const [userProfile, setUserProfile] = useState({
    name: "Autonomous Shopper",
    email: "shopper@agentic.commerce",
    upi_vpa: "shopper@oksbi"
  });
  const [showProfilePopup, setShowProfilePopup] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'AS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const [backendMerchants, setBackendMerchants] = useState([
    {
      id: "aura-tech",
      store_type: "amazon",
      name: "Amazon India (Aura Tech Partner)",
      tagline: "India's Largest Online Store • 1-Day Prime Delivery",
      domain: "amazon.in",
      badge: "Amazon Prime Authorized",
      icon: "🛒",
      color: "#FF9900",
      rating: 4.8,
      review_count: 85400,
      shipping_speed: "FREE Delivery by Tomorrow for Prime",
      total_inventory: 500,
      capabilities: ['Prime 1-Day Delivery', '0-OTP AP2 Autopay', 'Dynamic Price Match']
    },
    {
      id: "prime-gadgets",
      store_type: "flipkart",
      name: "Flipkart (Prime Gadgets Assured)",
      tagline: "Ab Har Wish Hogi Poori • Flipkart Plus & Assured",
      domain: "flipkart.com",
      badge: "Flipkart Assured ✦",
      icon: "⭐",
      color: "#2874F0",
      rating: 4.6,
      review_count: 64200,
      shipping_speed: "Free Express Delivery with SuperCoins",
      total_inventory: 500,
      capabilities: ['Assured Badge Quality', 'SuperCoins Discounts', 'Express Fast Track']
    },
    {
      id: "meesho-direct",
      store_type: "meesho",
      name: "Meesho (Direct Supplier Network)",
      tagline: "Lowest Factory Direct Prices • Zero Commission Wholesale",
      domain: "meesho.com",
      badge: "Direct Factory Rate 🏷️",
      icon: "🛍️",
      color: "#F43397",
      rating: 4.5,
      review_count: 98200,
      shipping_speed: "Factory Direct Free Shipping (3-4 Days)",
      total_inventory: 500,
      capabilities: ['Factory Direct Price', 'Zero Commission', '0-OTP Autopay']
    }
  ]);

  // Load real profile and merchant network from backend
  useEffect(() => {
    async function fetchBackendStorefronts() {
      try {
        const [profileRes, merchantsRes] = await Promise.all([
          fetch('http://localhost:5000/profile'),
          fetch('http://localhost:5000/merchants')
        ]);
        const profileData = await profileRes.json();
        const merchantsData = await merchantsRes.json();
        
        if (profileData.success && profileData.profile) {
          if (profileData.profile.allowed_merchants) {
            setAllowedMerchants(profileData.profile.allowed_merchants);
          }
          setUserProfile(profileData.profile);
        }
        if (merchantsData.success && Array.isArray(merchantsData.merchants) && merchantsData.merchants.length > 0) {
          setBackendMerchants(merchantsData.merchants.map(m => ({
            ...m,
            icon: m.store_type === 'amazon' ? '🛒' : (m.store_type === 'meesho' ? '🛍️' : '⭐'),
            capabilities: m.store_type === 'amazon' 
              ? ['Prime 1-Day Delivery', '0-OTP AP2 Autopay', 'Dynamic Price Match']
              : (m.store_type === 'meesho' 
                ? ['Factory Direct Price', 'Zero Commission', '0-OTP Autopay']
                : ['Assured Badge Quality', 'SuperCoins Discounts', 'Express Fast Track'])
          })));
        }
      } catch (err) {
        console.error('Failed to load backend storefronts:', err);
      }
    }
    fetchBackendStorefronts();
  }, []);

  const handleToggleStore = async (merchantId) => {
    const isCurrentlyActive = allowedMerchants.includes(merchantId);
    let updated;
    if (isCurrentlyActive) {
      if (allowedMerchants.length === 1) {
        // Keep at least one store active
        return;
      }
      updated = allowedMerchants.filter(id => id !== merchantId);
    } else {
      updated = [...allowedMerchants, merchantId];
    }
    
    setAllowedMerchants(updated);
    try {
      await fetch('http://localhost:5000/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowed_merchants: updated })
      });
    } catch (err) {
      console.error('Failed to sync allowed_merchants to backend:', err);
    }
  };

  const handleSaveTitle = (customVal) => {
    const newTitle = (customVal !== undefined ? customVal : titleEditValue).trim();
    if (newTitle) {
      setCurrentSessionTitle(newTitle);
      const currentSession = pastSessions.find(s => s.id === activeSessionId);
      if (currentSession) {
        persistSessionToDb({ ...currentSession, title: newTitle });
      }
    }
    setIsEditingTitle(false);
  };

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Drag resizer for history panel
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingHistory) return;
      const delta = e.clientX - dragStartX;
      const newWidth = Math.max(220, Math.min(480, Math.round(dragStartWidth + delta)));
      setHistoryWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingHistory(false);
    };

    if (isResizingHistory) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingHistory, dragStartX, dragStartWidth]);

  const [modalSizePreset, setModalSizePreset] = useState('standard'); // 'standard' | 'fullscreen'
  const [customModalSize, setCustomModalSize] = useState(null); // { width: number, height: number }
  const [isResizingModal, setIsResizingModal] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [modalDragStart, setModalDragStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const modalContainerRef = useRef(null);

  const toggleFullscreen = () => {
    setCustomModalSize(null);
    setModalSizePreset(prev => prev === 'fullscreen' ? 'standard' : 'fullscreen');
  };

  const handleStartResize = (e, dir) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = modalContainerRef.current?.getBoundingClientRect();
    if (rect) {
      setModalDragStart({
        x: e.clientX,
        y: e.clientY,
        w: rect.width,
        h: rect.height
      });
      setResizeDirection(dir);
      setIsResizingModal(true);
    }
  };

  // Multi-directional freeform window resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingModal || !resizeDirection) return;
      const deltaX = e.clientX - modalDragStart.x;
      const deltaY = e.clientY - modalDragStart.y;
      
      let newW = modalDragStart.w;
      let newH = modalDragStart.h;

      if (resizeDirection.includes('e')) {
        newW = Math.max(500, Math.min(window.innerWidth - 20, modalDragStart.w + deltaX * 2));
      } else if (resizeDirection.includes('w')) {
        newW = Math.max(500, Math.min(window.innerWidth - 20, modalDragStart.w - deltaX * 2));
      }

      if (resizeDirection.includes('s')) {
        newH = Math.max(450, Math.min(window.innerHeight - 20, modalDragStart.h + deltaY * 2));
      } else if (resizeDirection.includes('n')) {
        newH = Math.max(450, Math.min(window.innerHeight - 20, modalDragStart.h - deltaY * 2));
      }

      setCustomModalSize({ width: Math.round(newW), height: Math.round(newH) });
    };

    const handleMouseUp = () => {
      setIsResizingModal(false);
      setResizeDirection(null);
    };

    if (isResizingModal) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingModal, resizeDirection, modalDragStart]);

  const [activeSessionId, setActiveSessionId] = useState(() => `sess_${Date.now()}`);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const handleSendMessageRef = useRef(null);

  const voiceAssistant = useVoiceAssistant({
    onTranscriptComplete: (spokenText) => {
      if (handleSendMessageRef.current) {
        handleSendMessageRef.current(spokenText);
      }
    }
  });

  const handleOpenVoice = () => {
    setActiveMainView('voice');
    voiceAssistant.startListening();
  };

  const handleCloseVoice = () => {
    setActiveMainView('chat');
    voiceAssistant.stopListening();
    voiceAssistant.stopSpeaking();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
  };

  const handleVoiceSubmit = (spokenText) => {
    voiceAssistant.stopListening();
    voiceAssistant.clearTranscript();
    if (spokenText && handleSendMessageRef.current) {
      handleSendMessageRef.current(spokenText);
    }
  };

  // Active Chat Session
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      model: 'Auto (Llama 3.3 70B)',
      content: 'Hello! I am your AgentPay AI Commerce Assistant. I can research items across Amazon India & Flipkart, negotiate dynamic coupons, verify AP2 security bounds, and execute 0-OTP checkouts.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        "Buy me a wireless mouse under ₹800",
        "Which wireless mouse has faster delivery?",
        "Compare gaming keyboards on Amazon & Flipkart"
      ]
    }
  ]);

  // Saved Past Sessions History
  const [pastSessions, setPastSessions] = useState([]);

  // Load chat sessions from DB & LocalStorage on boot
  useEffect(() => {
    async function loadSavedSessions() {
      try {
        const res = await fetch('http://localhost:5000/api/agent/sessions');
        if (res.ok) {
          const data = await res.json();
          if (data.sessions && Array.isArray(data.sessions) && data.sessions.length > 0) {
            setPastSessions(data.sessions);
            const latest = data.sessions[0];
            if (latest && Array.isArray(latest.messages) && latest.messages.length > 0) {
              setActiveSessionId(latest.id);
              setCurrentSessionTitle(latest.title);
              setChatMessages(latest.messages);
            }
            try {
              localStorage.setItem('agentpay_chat_sessions', JSON.stringify(data.sessions));
            } catch {}
            return;
          }
        }
      } catch (err) {
        console.warn("DB session fetch notice:", err.message);
      }

      // Local storage fallback
      try {
        const local = localStorage.getItem('agentpay_chat_sessions');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPastSessions(parsed);
            const latest = parsed[0];
            if (latest && Array.isArray(latest.messages) && latest.messages.length > 0) {
              setActiveSessionId(latest.id);
              setCurrentSessionTitle(latest.title);
              setChatMessages(latest.messages);
            }
          }
        }
      } catch {}
    }
    loadSavedSessions();
  }, []);

  const persistSessionToDb = async (sessionObj) => {
    if (!sessionObj || !sessionObj.id) return;
    
    // Save to LocalStorage immediately
    setPastSessions(prev => {
      const idx = prev.findIndex(s => s.id === sessionObj.id);
      const updated = idx >= 0
        ? prev.map((s, i) => i === idx ? sessionObj : s)
        : [sessionObj, ...prev];
      try {
        localStorage.setItem('agentpay_chat_sessions', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Save to Backend Database
    try {
      await fetch('http://localhost:5000/api/agent/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionObj)
      });
    } catch (e) {
      console.warn("Error saving session to DB:", e.message);
    }
  };

  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [openMenuMsgId, setOpenMenuMsgId] = useState(null);

  const handleCopyMessage = (msgId, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleReadAloud = (msgId, text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const plainText = (text || '')
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
      .replace(/[*_`#>~\[\]]/g, '')
      .replace(/₹/g, ' rupees ')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!plainText) return;

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 0.96;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const pick = voices.find(v =>
        v.name.includes('Google UK English Female') ||
        v.name.includes('Google US English') ||
        v.name.includes('Microsoft Zira') ||
        v.name.includes('Samantha')
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
      if (pick) utterance.voice = pick;
    }

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleFeedback = (msgId, type) => {
    setFeedbackMap(prev => ({
      ...prev,
      [msgId]: prev[msgId] === type ? null : type
    }));
  };

  const handleShareResponse = async (msgId, text) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'AgentPay AI Recommendation',
          text: text
        });
        return;
      } catch (e) {}
    }
    handleCopyMessage(msgId, text);
  };

  const handleRegenerate = () => {
    const lastUserMsg = [...chatMessages].reverse().find(m => m.role === 'user');
    if (lastUserMsg && lastUserMsg.content) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingMsgText, setEditingMsgText] = useState('');

  const handleStartEditUserMsg = (msgId, text) => {
    setEditingMsgId(msgId);
    setEditingMsgText(text);
  };

  const handleCancelEditUserMsg = () => {
    setEditingMsgId(null);
    setEditingMsgText('');
  };

  const handleSaveEditUserMsg = (msgId) => {
    if (!editingMsgText.trim()) return;
    const textToSend = editingMsgText.trim();
    setEditingMsgId(null);
    setEditingMsgText('');
    handleSendMessage(textToSend);
  };

  const lastUserQuery = chatMessages.filter(m => m.role === 'user').slice(-1)[0]?.content || 'General Shopping Intent';
  const lastDiscoveredItem = chatMessages.filter(m => m.discoveredOffers && m.discoveredOffers.length > 0).slice(-1)[0]?.discoveredOffers?.[0]?.name || 'the first option';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, chatMessages, isRunning, activeFlow, attachedFiles]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (showModelDropdown) setShowModelDropdown(false);
        else if (showModeDropdown) setShowModeDropdown(false);
        else if (showAttachMenu) setShowAttachMenu(false);
        else onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showModelDropdown, showModeDropdown, showAttachMenu]);

  if (!isOpen) return null;

  const handleFileUploadTrigger = () => {
    setShowAttachMenu(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const formatted = files.map(f => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      type: f.type.startsWith('image/') ? 'image' : f.name.endsWith('.pdf') ? 'pdf' : 'doc'
    }));

    setAttachedFiles(prev => [...prev, ...formatted]);
    e.target.value = '';
  };

  const handleAttachMock = (type) => {
    setShowAttachMenu(false);
    if (type === 'mandate') {
      setAttachedFiles(prev => [
        ...prev,
        {
          id: `file_mandate_${Date.now()}`,
          name: 'ap2_mandate_policy_vault.json',
          size: '4.2 KB',
          type: 'doc'
        }
      ]);
    } else if (type === 'specs') {
      setAttachedFiles(prev => [
        ...prev,
        {
          id: `file_spec_${Date.now()}`,
          name: 'logitech_m330_spec_sheet.pdf',
          size: '184.0 KB',
          type: 'pdf'
        }
      ]);
    } else if (type === 'photo') {
      setAttachedFiles(prev => [
        ...prev,
        {
          id: `file_img_${Date.now()}`,
          name: 'desired_mouse_photo.jpg',
          size: '92.4 KB',
          type: 'image'
        }
      ]);
    }
  };

  const handleRemoveFile = (fileId) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSendMessage = async (textToSend) => {
    if (isRunning) return;
    const query = textToSend || prompt;
    if (!query.trim() && attachedFiles.length === 0) return;

    const filesToSend = [...attachedFiles];
    const actualQuery = query.trim() || (filesToSend.length > 0 ? `Analyze attached ${filesToSend.map(f => f.name).join(', ')} and evaluate best matching deals.` : '');

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: actualQuery,
      files: filesToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setPrompt('');
    setAttachedFiles([]);
    if (!currentSessionTitle) {
      setCurrentSessionTitle(actualQuery.slice(0, 45));
    }

    const historyPayload = newHistory.map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const result = await onRunAgent(actualQuery, null, null, historyPayload, selectedModel, selectedMode);

      if (result) {
        const activeModelObj = AVAILABLE_MODELS.find(m => m.id === selectedModel);
        
        let baseResponse = result.response_text;
        if (filesToSend.length > 0 && !baseResponse.includes("uploaded")) {
          baseResponse = `I inspected your uploaded file (${filesToSend.map(f => `**${f.name}**`).join(', ')}) and cross-referenced merchant catalogs.\n\n` + baseResponse;
        }

        const assistantMsg = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          model: result.engine || activeModelObj?.name || 'Auto (Llama 3.3 70B)',
          content: baseResponse || (result.checkout?.success 
            ? `I have completed the order for **${result.checkout.order?.product?.name}** on **${result.checkout.merchant_id === 'prime-gadgets' ? 'Flipkart Assured' : 'Amazon India'}** for ₹${result.checkout.order?.amount}.` 
            : result.checkout?.error 
            ? `The purchase was blocked by AP2 Policy: ${result.checkout.error}`
            : "I analyzed the merchant network. Here are the top matching offers:"),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          discoveredOffers: result.discoveredOffers,
          negotiation: result.negotiation,
          checkout: result.checkout,
          mandate: result.mandate,
          ragSources: result.rag_sources || [],
          suggestions: result.checkout?.success ? [
            "Show me my purchase receipt",
            "What is my remaining AP2 budget?",
            "Can you find matching accessories?"
          ] : actualQuery.toLowerCase().includes("better") || actualQuery.toLowerCase().includes("faster") || actualQuery.toLowerCase().includes("delivery") ? [
            "Proceed with Amazon India (₹499)",
            "What are the specifications & battery life?",
            "Can you negotiate a lower price?"
          ] : actualQuery.toLowerCase().includes("spec") || actualQuery.toLowerCase().includes("battery") ? [
            "Which store has faster delivery?",
            "Buy on Amazon India with 0-OTP",
            "Compare with Flipkart Assured"
          ] : [
            "Which option is better & why?",
            "Which option has faster delivery?",
            "Can you negotiate a better price?",
            `Buy ${result.discoveredOffers?.[0]?.name || 'the first option'}`
          ]
        };

        const updatedChat = [...newHistory, assistantMsg];
        setChatMessages(updatedChat);

        // Auto-save into database & LocalStorage
        const firstUserQuery = updatedChat.find(m => m.role === 'user')?.content || 'Shopping Inquiry';
        const title = firstUserQuery.length > 38 ? firstUserQuery.slice(0, 38) + '...' : firstUserQuery;
        const userCount = updatedChat.filter(m => m.role === 'user').length;
        const sessionObj = {
          id: activeSessionId,
          title: currentSessionTitle || title,
          time: 'Just now',
          itemCount: userCount,
          messages: updatedChat,
          topic: result.discoveredOffers?.[0]?.name || title
        };
        persistSessionToDb(sessionObj);

        if (result.is_checkout_flow && result.checkout?.success && onOrderCompleted) {
          onOrderCompleted(result.checkout.order);
        }

        // ─── Voice Readout (STRICTLY in Voice/Speak Mode — NEVER auto-speak in Chat Mode) ──
        if (activeMainView === 'voice' && !isVoiceMuted) {
          if (result.checkout?.success && result.checkout.order) {
            const prodName = result.checkout.order?.product?.name || 'your item';
            const storeName =
              result.checkout.order?.merchant_id === 'meesho-direct' ? 'Meesho Direct' :
              result.checkout.order?.merchant_id === 'prime-gadgets' ? 'Flipkart Assured' :
              'Amazon India';
            const amt = result.checkout.order?.amount || 0;
            const savings = result.negotiation?.savings
              ? ` You saved ${result.negotiation.savings} rupees through autonomous negotiation.`
              : '';
            voiceAssistant.speak(`Purchased ${prodName} on ${storeName} for ${amt} rupees with zero-OTP autopay.${savings}`);
          } else if (result.response_text) {
            const lines = result.response_text
              .split('\n')
              .map(l => l.replace(/^[#*\-]+\s*/, '').trim())
              .filter(l => l.length > 5 && !l.startsWith('{') && !l.startsWith('http'));
            voiceAssistant.speak(lines.slice(0, 4).join('. '));
          }
        }
      }
    } catch (err) {
      console.error("handleSendMessage error:", err);
      const errorMsg = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        model: 'AgentPay AI',
        content: `Sorry, an error occurred while processing: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages([...newHistory, errorMsg]);
    }
  };

  handleSendMessageRef.current = handleSendMessage;

  const handleStartNewSession = () => {
    const newSessionId = `sess_${Date.now()}`;
    setActiveSessionId(newSessionId);
    setCurrentSessionTitle('');
    setChatMessages([
      {
        id: 'welcome',
        role: 'assistant',
        model: AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || 'Auto (Llama 3.3 70B)',
        content: 'Started a fresh session. How can I assist with your autonomous shopping today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          "Buy me a wireless mouse under ₹800",
          "Which wireless mouse has faster delivery?",
          "Compare mechanical keyboards on Amazon & Flipkart"
        ]
      }
    ]);
    setAttachedFiles([]);
    setActiveMainView('chat');
  };

  const handleLoadPastSession = (sess) => {
    setActiveSessionId(sess.id);
    setCurrentSessionTitle(sess.title);
    if (sess.messages && sess.messages.length > 0) {
      setChatMessages(sess.messages);
    }
    setAttachedFiles([]);
    setActiveMainView('chat');
  };

  const activeModelObj = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];
  const activeModeObj = AGENT_MODES.find(m => m.id === selectedMode) || AGENT_MODES[0];

  const isFullscreen = modalSizePreset === 'fullscreen';

  const getContainerStyle = () => {
    if (isFullscreen) {
      return {
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        borderRadius: '0px'
      };
    }
    if (customModalSize) {
      return {
        width: `${customModalSize.width}px`,
        height: `${customModalSize.height}px`,
        maxWidth: '96vw',
        maxHeight: '94vh'
      };
    }
    return {
      width: '100%',
      maxWidth: '980px',
      height: '88vh',
      maxHeight: '850px'
    };
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isFullscreen) onClose();
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-2 sm:p-4 md:p-6'} bg-black/75 backdrop-blur-md animate-fade-in text-[#1C1917] ${
        isDark ? 'dark text-[#F4F4F5]' : ''
      }`}
    >
      <div
        ref={modalContainerRef}
        style={getContainerStyle()}
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-[#FCFAF6] dark:bg-[#111218] border border-[#E7E2D6] dark:border-[#222530] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-black/[0.04] dark:ring-white/[0.05] flex flex-col overflow-hidden transition-all duration-150 ${
          isFullscreen ? 'rounded-none' : 'rounded-[28px]'
        }`}
      >
        {/* ================= 🖥️ DESKTOP-STYLE WINDOW BORDER RESIZERS ================= */}
        {!isFullscreen && (
          <>
            {/* Top Border Resizer */}
            <div
              onMouseDown={(e) => handleStartResize(e, 'n')}
              className="absolute top-0 left-4 right-4 h-2 cursor-ns-resize z-50 select-none"
              title="Drag top edge to resize height"
            />
            {/* Bottom Border Resizer */}
            <div
              onMouseDown={(e) => handleStartResize(e, 's')}
              className="absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize z-50 select-none"
              title="Drag bottom edge to resize height"
            />
            {/* Left Border Resizer */}
            <div
              onMouseDown={(e) => handleStartResize(e, 'w')}
              className="absolute top-4 bottom-4 left-0 w-2.5 cursor-ew-resize z-50 select-none"
              title="Drag left edge to resize width"
            />
            {/* Right Border Resizer */}
            <div
              onMouseDown={(e) => handleStartResize(e, 'e')}
              className="absolute top-4 bottom-4 right-0 w-2.5 cursor-ew-resize z-50 select-none"
              title="Drag right edge to resize width"
            />
            {/* Top-Left Corner */}
            <div
              onMouseDown={(e) => handleStartResize(e, 'nw')}
              className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-50 select-none"
              title="Drag corner to resize"
            />
            {/* Top-Right Corner */}
            <div
              onMouseDown={(e) => handleStartResize(e, 'ne')}
              className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-50 select-none"
              title="Drag corner to resize"
            />
            {/* Bottom-Left Corner */}
            <div
              onMouseDown={(e) => handleStartResize(e, 'sw')}
              className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-50 select-none"
              title="Drag corner to resize"
            />
            {/* Bottom-Right Corner Grip (invisible) */}
            <div
              onMouseDown={(e) => handleStartResize(e, 'se')}
              className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50 select-none"
              title="Drag corner to resize window"
            />
          </>
        )}

        {/* Hidden System File Picker */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          onChange={handleFileChange}
          accept="image/*,.pdf,.json,.csv,.txt,.doc,.docx"
          className="hidden"
        />

        {/* ================= 💎 MODAL TOPBAR ================= */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#EAE5D9] dark:border-[#222530] bg-[#FCFAF6] dark:bg-[#14161E] flex-shrink-0 gap-3 transition-colors duration-200">
          
          {/* Left: Branding / Active Session Title & History Toggle */}
          <div className="flex items-center space-x-3 min-w-0">
            <button
              onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-2xs ${
                showHistoryDrawer
                  ? 'bg-[#18181B] dark:bg-white/15 text-white dark:text-white border-[#18181B] dark:border-white/25'
                  : 'bg-[#F2ECE1] dark:bg-[#1C1E26] text-[#44403C] dark:text-[#E2E8F0] hover:bg-[#EAE4D7] dark:hover:bg-[#252834] border-[#DFD9CE] dark:border-[#2E3140]'
              }`}
              title="Toggle Past Inquiries History"
            >
              {showHistoryDrawer ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>

            {isEditingTitle ? (
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSaveTitle(); }}
                className="flex items-center space-x-1.5"
              >
                <input
                  type="text"
                  value={titleEditValue}
                  onChange={(e) => setTitleEditValue(e.target.value)}
                  onBlur={() => handleSaveTitle()}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  autoFocus
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1E202A] border border-[#DFD9CE] dark:border-[#333748] text-xs font-semibold text-[#1C1917] dark:text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#18181B] dark:focus:ring-white/50 max-w-[180px] sm:max-w-[280px]"
                />
                <button
                  type="submit"
                  className="p-1 rounded-md bg-[#18181B] dark:bg-white text-white dark:text-black hover:opacity-90 transition cursor-pointer"
                  title="Save title"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </form>
            ) : currentSessionTitle ? (
              <div className="flex items-center space-x-1.5 group">
                <span 
                  onClick={() => {
                    setTitleEditValue(currentSessionTitle);
                    setIsEditingTitle(true);
                  }}
                  className="text-xs font-semibold text-[#1C1917] dark:text-[#F8FAFC] tracking-tight truncate max-w-[180px] sm:max-w-md cursor-pointer hover:underline"
                  title="Click to rename"
                >
                  {currentSessionTitle}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTitleEditValue(currentSessionTitle);
                    setIsEditingTitle(true);
                  }}
                  className="p-1 rounded-md hover:bg-[#F2ECE1] dark:hover:bg-[#20222C] text-[#78716C] dark:text-[#94A3B8] hover:text-[#1C1917] dark:hover:text-white transition cursor-pointer opacity-70 hover:opacity-100"
                  title="Rename chat"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            ) : null}
          </div>

          {/* Right Controls: Fullscreen, New Session, Close */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
            {/* Fullscreen / Maximize Toggle */}
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-xl border transition shadow-2xs cursor-pointer flex items-center justify-center ${
                isFullscreen
                  ? 'bg-[#18181B] dark:bg-white/15 text-white dark:text-white border-[#18181B] dark:border-white/25'
                  : 'bg-[#F2ECE1] dark:bg-[#1C1E26] hover:bg-[#EAE4D7] dark:hover:bg-[#252834] text-[#44403C] dark:text-[#E2E8F0] hover:text-[#18181B] dark:hover:text-white border-[#DFD9CE] dark:border-[#2E3140]'
              }`}
              title={isFullscreen ? "Exit Fullscreen" : "Maximize Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* New Session */}
            <button
              onClick={handleStartNewSession}
              className="p-2 rounded-xl bg-[#F2ECE1] dark:bg-[#1C1E26] hover:bg-[#EAE4D7] dark:hover:bg-[#252834] text-[#44403C] dark:text-[#E2E8F0] hover:text-[#18181B] dark:hover:text-white transition border border-[#DFD9CE] dark:border-[#2E3140] shadow-2xs cursor-pointer flex items-center justify-center"
              title="New Session"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#F2ECE1] dark:bg-[#1C1E26] hover:bg-[#EAE4D7] dark:hover:bg-[#252834] text-[#78716C] dark:text-[#94A3B8] hover:text-[#18181B] dark:hover:text-white transition border border-[#DFD9CE] dark:border-[#2E3140] shadow-2xs cursor-pointer flex items-center justify-center"
              title="Close Modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= 💎 MAIN WORKSPACE (SIDEBAR + CHAT THREAD) ================= */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* LEFT: ChatGPT-style History Sidebar */}
          {showHistoryDrawer && (
            <div 
              style={{ width: `${historyWidth}px` }}
              className="flex-shrink-0 flex flex-col relative select-none bg-[#F7F4EC] dark:bg-[#101217] text-[#1C1917] dark:text-[#F8FAFC] border-r border-[#EAE5D9] dark:border-[#20232E] z-20 transition-colors duration-200"
              onClick={() => { 
                setHoverMenuSessId(null); 
                setShowProfilePopup(false); 
              }}
            >
              {/* ─── Top Quick Actions ─── */}
              <div className="flex-shrink-0 px-3 pt-3 pb-2 space-y-1">
                {/* New Chat */}
                <button
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleStartNewSession(); 
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-150 cursor-pointer group ${
                    activeMainView === 'chat' && chatMessages.length <= 1
                      ? 'bg-[#EAE4D7] dark:bg-[#1E212B] text-[#1C1917] dark:text-white font-semibold'
                      : 'text-[#44403C] dark:text-[#CBD5E1] hover:bg-[#EAE5D9] dark:hover:bg-[#1A1C24]'
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center opacity-80 group-hover:opacity-100">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                    </svg>
                  </span>
                  <span>New chat</span>
                </button>

                {/* Plugins */}
                <button
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setActiveMainView('plugins'); 
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-150 cursor-pointer group ${
                    activeMainView === 'plugins' 
                      ? 'bg-[#18181B] dark:bg-white/15 text-white dark:text-white dark:border dark:border-white/25 font-bold shadow-2xs' 
                      : 'text-[#44403C] dark:text-[#CBD5E1] hover:bg-[#EAE5D9] dark:hover:bg-[#1A1C24]'
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center opacity-80 group-hover:opacity-100">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>
                    </svg>
                  </span>
                  <span>Plugins</span>
                </button>
              </div>

              {/* ─── Divider ─── */}
              <div className="h-px bg-[#EAE5D9] dark:bg-[#20232E] mx-3 flex-shrink-0" />

              {/* ─── Past Inquiries List ─── */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                {pastSessions.length > 0 && (
                  <div className="px-2 pb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#78716C] dark:text-[#64748B]">Past Inquiries</span>
                  </div>
                )}

                {pastSessions.length === 0 ? (
                  <div className="px-3 py-8 text-center">
                    <div className="text-[32px] mb-2 opacity-30">🛒</div>
                    <div className="text-[12px] text-[#78716C] dark:text-[#94A3B8] leading-relaxed">No past sessions yet.<br/>Start a new inquiry above.</div>
                  </div>
                ) : (
                  pastSessions.map((sess) => {
                    const isActive = sess.id === activeSessionId;
                    const isPinned = pinnedSessions.includes(sess.id);
                    const isMenuOpen = hoverMenuSessId === sess.id;
                    const isRenaming = renamingSessId === sess.id;

                    return (
                      <div
                        key={sess.id}
                        className={`relative group rounded-xl transition-colors duration-100 ${
                          isActive ? 'bg-[#18181B] dark:bg-white/15 dark:border dark:border-white/25 text-white dark:text-white' : 'hover:bg-[#EAE5D9] dark:hover:bg-[#1A1C24]'
                        }`}
                        onMouseLeave={() => { if (!isRenaming) setHoverMenuSessId(null); }}
                      >
                        {isRenaming ? (
                          /* ─── Inline Rename Input ─── */
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const trimmed = renameValue.trim();
                              if (trimmed) {
                                setPastSessions(prev => prev.map(s => s.id === sess.id ? { ...s, title: trimmed } : s));
                              }
                              setRenamingSessId(null);
                              setRenameValue('');
                            }}
                            className="flex items-center gap-2 px-3 py-2"
                          >
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Escape') { setRenamingSessId(null); setRenameValue(''); }}}
                              className="flex-1 bg-white dark:bg-[#1E202A] text-[#1C1917] dark:text-[#F8FAFC] text-[12px] font-medium px-2 py-1 rounded-lg border border-[#DFD9CE] dark:border-[#333748] focus:outline-none focus:border-[#18181B] dark:focus:border-white/50 placeholder:text-[#A8A29E] dark:placeholder:text-[#64748B]"
                              placeholder="Rename…"
                            />
                            <button type="submit" className="text-[10px] text-emerald-600 dark:text-white font-bold hover:text-emerald-700 cursor-pointer">Save</button>
                          </form>
                        ) : (
                          /* ─── Normal Session Row ─── */
                          <button
                            type="button"
                            onClick={() => handleLoadPastSession(sess)}
                            className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
                          >
                            {isPinned && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400 flex-shrink-0 opacity-80">
                                <path d="M12 2l3 6 6.5 1-4.75 4.5 1.25 6.5L12 17l-6 3 1.25-6.5L2.5 9 9 8z"/>
                              </svg>
                            )}
                            <span className={`flex-1 text-[13px] font-medium truncate ${isActive ? 'text-white dark:text-white' : 'text-[#1C1917] dark:text-[#E2E8F0]'}`}>
                              {sess.title}
                            </span>
                          </button>
                        )}

                        {/* ─── Hover: Pin + ··· buttons ─── */}
                        {!isRenaming && (
                          <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity duration-100 ${
                            isActive || isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            {/* Pin button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPinnedSessions(prev =>
                                  prev.includes(sess.id) ? prev.filter(id => id !== sess.id) : [...prev, sess.id]
                                );
                              }}
                              className={`p-1.5 rounded-lg hover:bg-[#DFD9CE] dark:hover:bg-[#252834] transition cursor-pointer ${isPinned ? 'text-yellow-600 dark:text-yellow-400' : 'text-[#78716C] dark:text-[#94A3B8] hover:text-[#1C1917] dark:hover:text-white'}`}
                              title={isPinned ? 'Unpin' : 'Pin chat'}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/>
                              </svg>
                            </button>

                            {/* ··· More Menu button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHoverMenuSessId(isMenuOpen ? null : sess.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-[#DFD9CE] dark:hover:bg-[#252834] text-[#78716C] dark:text-[#94A3B8] hover:text-[#1C1917] dark:hover:text-white transition cursor-pointer"
                              title="More options"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                              </svg>
                            </button>
                          </div>
                        )}

                        {/* ─── Dropdown Context Menu ─── */}
                        {isMenuOpen && !isRenaming && (
                          <div
                            className="absolute right-2 top-full mt-0.5 w-44 bg-white dark:bg-[#181A22] border border-[#E7E2D6] dark:border-[#2C2F3C] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in"
                            onClick={e => e.stopPropagation()}
                          >
                            {/* Share */}
                            <button
                              type="button"
                              onClick={() => {
                                const text = `AgentPay Inquiry: ${sess.title}`;
                                if (navigator.share) navigator.share({ title: sess.title, text });
                                else navigator.clipboard.writeText(text);
                                setHoverMenuSessId(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#44403C] dark:text-[#E2E8F0] hover:bg-[#F2ECE1] dark:hover:bg-[#222530] transition-colors cursor-pointer"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                              </svg>
                              Share
                            </button>

                            {/* Rename */}
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingSessId(sess.id);
                                setRenameValue(sess.title);
                                setHoverMenuSessId(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#44403C] dark:text-[#E2E8F0] hover:bg-[#F2ECE1] dark:hover:bg-[#222530] transition-colors cursor-pointer"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                              Rename
                            </button>

                            <div className="h-px bg-[#EAE5D9] dark:bg-[#282B38] mx-3" />

                            {/* Pin / Unpin */}
                            <button
                              type="button"
                              onClick={() => {
                                setPinnedSessions(prev =>
                                  prev.includes(sess.id) ? prev.filter(id => id !== sess.id) : [...prev, sess.id]
                                );
                                setHoverMenuSessId(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#44403C] dark:text-[#E2E8F0] hover:bg-[#F2ECE1] dark:hover:bg-[#222530] transition-colors cursor-pointer"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/>
                              </svg>
                              {isPinned ? 'Unpin chat' : 'Pin chat'}
                            </button>

                            <div className="h-px bg-[#EAE5D9] dark:bg-[#282B38] mx-3" />

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => {
                                setPastSessions(prev => prev.filter(s => s.id !== sess.id));
                                setHoverMenuSessId(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* ─── User Profile Footer ─── */}
              <div className="flex-shrink-0 p-2 border-t border-[#EAE5D9] dark:border-[#20232E] relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfilePopup(prev => !prev);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#EAE5D9] dark:hover:bg-[#1A1C24] transition-colors duration-150 cursor-pointer group text-left"
                >
                  {/* Initials Avatar */}
                  <div className="w-8 h-8 rounded-full bg-[#18181B] dark:bg-white/15 text-white dark:text-white border dark:border-white/25 flex items-center justify-center text-xs font-bold shadow-2xs flex-shrink-0">
                    {getInitials(userProfile?.name || 'Autonomous Shopper')}
                  </div>

                  {/* Name & Account Subtitle */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-bold text-[#1C1917] dark:text-[#F8FAFC] truncate leading-tight">
                      {userProfile?.name || 'Autonomous Shopper'}
                    </div>
                    <div className="text-[10px] text-[#78716C] dark:text-[#94A3B8] font-mono truncate flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="truncate">{userProfile?.upi_vpa || 'AP2 0-OTP Autopay'}</span>
                    </div>
                  </div>

                  {/* Options Icon */}
                  <div className="text-[#78716C] dark:text-[#94A3B8] group-hover:text-[#1C1917] dark:group-hover:text-white transition flex-shrink-0 p-0.5">
                    <MoreHorizontal className="w-4 h-4" />
                  </div>
                </button>

                {/* Profile Quick Details Popup */}
                {showProfilePopup && (
                  <div
                    className="absolute left-2 right-2 bottom-full mb-2 bg-white dark:bg-[#181A22] border border-[#E7E2D6] dark:border-[#2C2F3C] rounded-2xl shadow-2xl p-3.5 z-50 animate-fade-in text-xs space-y-2.5"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#EAE5D9] dark:border-[#282B38]">
                      <div className="w-8 h-8 rounded-full bg-[#18181B] dark:bg-white/15 text-white dark:text-white border dark:border-white/25 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {getInitials(userProfile?.name || 'AS')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-[#1C1917] dark:text-[#F8FAFC] truncate text-[12.5px]">{userProfile?.name || 'Autonomous Shopper'}</div>
                        <div className="text-[10px] text-[#78716C] dark:text-[#94A3B8] truncate font-mono">{userProfile?.email || 'shopper@agentic.commerce'}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[10.5px] font-mono">
                      <div className="flex items-center justify-between text-[#78716C] dark:text-[#94A3B8] gap-1.5">
                        <span className="flex-shrink-0">UPI VPA:</span>
                        <strong className="text-[#1C1917] dark:text-[#F8FAFC] truncate">{userProfile?.upi_vpa || 'shopper@oksbi'}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[#78716C] dark:text-[#94A3B8] gap-1.5">
                        <span className="flex-shrink-0">Mandate Cap:</span>
                        <strong className="text-[#1C1917] dark:text-[#F8FAFC] truncate">₹{userProfile?.default_max_budget || 2000}/tx</strong>
                      </div>
                      <div className="flex items-center justify-between text-[#78716C] dark:text-[#94A3B8] gap-1.5">
                        <span className="flex-shrink-0">AP2 Autopay:</span>
                        <span className="font-bold text-emerald-700 dark:text-white bg-emerald-50 dark:bg-white/10 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-white/20 text-[9.5px]">
                          Active ✓
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#EAE5D9] dark:border-[#282B38] flex items-center justify-between text-[10px] text-[#78716C] dark:text-[#94A3B8]">
                      <span>Protocol</span>
                      <span className="font-bold text-[#1C1917] dark:text-[#F8FAFC]">AP2 0-OTP</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Invisible Drag Resizer ─── */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDragStartX(e.clientX);
                  setDragStartWidth(historyWidth);
                  setIsResizingHistory(true);
                }}
                className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize z-10 select-none"
              />
            </div>
          )}

          {/* RIGHT: Conversational Message Thread OR Plugins Dashboard OR Ambient Voice Orb Canvas */}
          {activeMainView === 'voice' ? (
            <AmbientVoiceOrbView
              isRunning={isRunning}
              isListening={voiceAssistant.isListening}
              isSpeaking={voiceAssistant.isSpeaking}
              volumeLevel={voiceAssistant.volumeLevel}
              permissionState={voiceAssistant.permissionState}
              transcript={voiceAssistant.transcript}
              interimTranscript={voiceAssistant.interimTranscript}
              latestAssistantMsg={[...chatMessages].reverse().find(m => m.role === 'assistant' && m.id !== 'welcome') || chatMessages[0]}
              onStartListening={() => voiceAssistant.startListening()}
              onStopListening={() => voiceAssistant.stopListening()}
              onSwitchToChat={() => handleCloseVoice()}
              onSubmitPrompt={(promptText) => handleVoiceSubmit(promptText)}
              onSpeakMessage={(text) => voiceAssistant.speak(text)}
              onStopSpeaking={() => voiceAssistant.stopSpeaking()}
            />
          ) : activeMainView === 'plugins' ? (
            <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-[#FCFAF6] dark:bg-[#0E1016] p-5 sm:p-7 animate-fade-in transition-colors duration-200">
              <div className="max-w-4xl mx-auto w-full space-y-6">
                
                {/* Plugins Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE5D9] dark:border-[#222530]">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-[#18181B] dark:bg-white/15 text-white dark:text-white border dark:border-white/25 shadow-sm flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>
                      </svg>
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#1C1917] dark:text-[#F8FAFC]">Connected Store Plugins & Autonomous Routing</h2>
                      <p className="text-xs text-[#78716C] dark:text-[#94A3B8]">
                        Select active merchants for cross-store catalog search, discount negotiation, and 0-OTP AP2 checkout.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveMainView('chat')}
                    className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#18181B] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 text-xs font-semibold flex items-center gap-2 shadow-2xs transition cursor-pointer"
                  >
                    <span>Back to Chat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Summary / AP2 Protocol Banner */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#14161E] border border-[#E7E2D6] dark:border-[#262834] shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-semibold text-[#1C1917] dark:text-[#F8FAFC]">
                      {allowedMerchants.length} of {backendMerchants.length} Storefronts Enabled for Autonomous Execution
                    </span>
                  </div>
                  <span className="text-[#78716C] dark:text-[#94A3B8] font-mono text-[11px]">
                    Fiduciary Rule: <span className="font-bold text-[#1C1917] dark:text-[#F8FAFC]">AP2 0-OTP Autopay Strict Cryptographic Bound</span>
                  </span>
                </div>

                {/* Grid of Real Connected Store Plugins */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {backendMerchants.map((store) => {
                    const isConnected = allowedMerchants.includes(store.id);

                    return (
                      <div
                        key={store.id}
                        className={`p-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between space-y-4 ${
                          isConnected
                            ? 'bg-white dark:bg-[#161822] border-[#DFD9CE] dark:border-[#282B38] shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05]'
                            : 'bg-[#F2ECE1]/50 dark:bg-[#12131A]/60 border-[#E5DFD2] dark:border-[#20222C] opacity-75'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Top Row: Icon, Name, Badge, Toggle Switch */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-[#F7F4EC] dark:bg-[#1C1E28] border border-[#E7E2D6] dark:border-[#2C2F3C] flex items-center justify-center text-2xl shadow-2xs flex-shrink-0">
                                {store.icon}
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-[#1C1917] dark:text-[#F8FAFC] leading-snug">{store.name}</h3>
                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border mt-0.5 ${
                                  isConnected
                                    ? 'bg-emerald-50 dark:bg-white/10 text-emerald-800 dark:text-white border-emerald-200 dark:border-white/20'
                                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                                }`}>
                                  {isConnected ? store.badge : 'Storefront Disabled'}
                                </span>
                              </div>
                            </div>

                            {/* Toggle switch */}
                            <button
                              type="button"
                              onClick={() => handleToggleStore(store.id)}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isConnected ? 'bg-[#18181B] dark:bg-white' : 'bg-[#D6D0C4] dark:bg-[#2C2F3C]'
                              }`}
                              title={isConnected ? "Click to disable storefront routing" : "Click to enable storefront routing"}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-[#0B0C10] shadow-md ring-0 transition duration-200 ease-in-out ${
                                  isConnected ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Description & Domain */}
                          <p className="text-xs text-[#57534E] dark:text-[#CBD5E1] leading-relaxed">
                            {store.tagline || (store.store_type === 'amazon' 
                              ? "India's largest catalog with 1-day Prime logistics and zero-OTP settlement." 
                              : (store.store_type === 'meesho'
                                ? "Direct factory-price wholesale network with zero commission and instant AP2 checkout."
                                : "Flipkart Assured quality catalog with SuperCoins discount integration."))}
                          </p>

                          {/* Live backend info */}
                          <div className="flex items-center justify-between text-[11px] font-mono text-[#78716C] dark:text-[#94A3B8] bg-[#F7F4EC] dark:bg-[#14151E] px-2.5 py-1.5 rounded-xl border border-[#EAE5D9] dark:border-[#242734]">
                            <span>Domain: <strong className="text-[#1C1917] dark:text-[#F8FAFC]">{store.domain}</strong></span>
                            <span>Catalog: <strong className="text-[#1C1917] dark:text-[#F8FAFC]">{store.total_inventory || 500}+ items</strong></span>
                          </div>

                          {/* Capability Pills */}
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {(store.capabilities || ['0-OTP Autopay', 'AP2 Verified']).map((cap, cIdx) => (
                              <span
                                key={cIdx}
                                className="px-2.5 py-0.5 rounded-lg bg-[#F7F4EC] dark:bg-[#14151E] border border-[#EAE5D9] dark:border-[#242734] text-[10.5px] font-medium text-[#44403C] dark:text-[#CBD5E1]"
                              >
                                ✓ {cap}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Bottom Action */}
                        <div className="pt-3 border-t border-[#EAE5D9]/70 dark:border-[#242734] flex items-center justify-between">
                          <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isConnected ? 'text-emerald-700 dark:text-[#F8FAFC]' : 'text-[#78716C] dark:text-[#94A3B8]'}`}>
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-[#A8A29E] dark:bg-[#475569]'}`} />
                            {isConnected ? 'Active in Autonomous Routing' : 'Disabled (Will Not Purchase)'}
                          </span>
                          
                          {isConnected && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMainView('chat');
                                handleSendMessage(`Search top trending deals on ${store.name}`);
                              }}
                              className="text-[11px] font-bold text-[#18181B] dark:text-[#F8FAFC] hover:underline flex items-center gap-1 cursor-pointer bg-[#F2ECE1] dark:bg-[#1E202A] hover:bg-[#EAE4D7] dark:hover:bg-[#282B38] px-2.5 py-1 rounded-lg border border-[#DFD9CE] dark:border-[#2C2F3C]"
                            >
                              <span>Shop {store.store_type === 'amazon' ? 'Amazon' : (store.store_type === 'meesho' ? 'Meesho' : 'Flipkart')}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#FCFAF6] dark:bg-[#0B0C10] transition-colors duration-200">
            
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
              <div className="max-w-3xl lg:max-w-4xl mx-auto w-full space-y-6">
              
              {chatMessages.map((msg) => {
                const isUser = msg.role === 'user';
                const isCopied = copiedMsgId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                  >
                    {/* Header: Speaker, Model Tag, Timestamp & Copy Button */}
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-[#78716C] dark:text-[#94A3B8] px-1.5">
                      <span className="font-bold text-[#1C1917] dark:text-[#F8FAFC]">{isUser ? 'You' : 'AgentPay AI'}</span>
                      {!isUser && msg.model && (
                        <span className="px-2 py-0.5 rounded-full bg-[#F2ECE1] dark:bg-[#1E202A] text-[#44403C] dark:text-[#CBD5E1] border border-[#DFD9CE] dark:border-[#282A36] font-sans font-semibold text-[10px]">
                          {msg.model.replace(/Deterministic Fiduciary Engine|Autonomous Fiduciary Assistant/g, 'AgentPay Engine')}
                        </span>
                      )}
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Attached Files in User Message */}
                    {isUser && msg.files && msg.files.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {msg.files.map(file => (
                          <div key={file.id} className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-[#F2ECE1] dark:bg-[#1E202A] border border-[#DFD9CE] dark:border-[#2C2F3C] text-[11px] font-mono text-[#1C1917] dark:text-[#F8FAFC]">
                            {file.type === 'image' ? <ImageIcon className="w-3 h-3 text-[#18181B] dark:text-white" /> : <FileText className="w-3 h-3 text-[#18181B] dark:text-white" />}
                            <span className="font-semibold">{file.name}</span>
                            <span className="text-[#78716C] dark:text-[#94A3B8]">({file.size})</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 💎 Compact Sleek Inline Message Editor */}
                    {isUser && editingMsgId === msg.id ? (
                      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#161822] border border-[#D6CEBE] dark:border-[#2C2F3C] shadow-sm p-2.5 sm:p-3 space-y-2 animate-fade-in transition-all duration-200 focus-within:border-[#18181B] dark:focus-within:border-white/40 focus-within:ring-2 focus-within:ring-[#18181B]/5 text-left">
                        {/* Seamless Compact Textarea */}
                        <textarea
                          value={editingMsgText}
                          onChange={(e) => setEditingMsgText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEditUserMsg(msg.id);
                            }
                            if (e.key === 'Escape') {
                              handleCancelEditUserMsg();
                            }
                          }}
                          className="w-full bg-transparent px-1 pt-0.5 text-xs sm:text-[13px] text-[#1C1917] dark:text-[#F8FAFC] font-sans leading-relaxed resize-none focus:outline-none placeholder-[#A8A29E] dark:placeholder-[#64748B]"
                          rows={1}
                          autoFocus
                          placeholder="Edit prompt..."
                        />

                        {/* Footer Controls & Keyboard Badges */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-[#F0EBE0] dark:border-[#242734]">
                          <div className="hidden sm:flex items-center space-x-1.5 text-[10px] font-mono text-[#78716C] dark:text-[#94A3B8]">
                            <span className="px-1 py-0.2 rounded bg-[#F2ECE1] dark:bg-[#1E202A] border border-[#DFD9CE] dark:border-[#2C2F3C] text-[9px]">Esc</span>
                            <span>cancel</span>
                            <span>•</span>
                            <span className="px-1 py-0.2 rounded bg-[#F2ECE1] dark:bg-[#1E202A] border border-[#DFD9CE] dark:border-[#2C2F3C] text-[9px]">Enter</span>
                            <span>resend</span>
                          </div>

                          <div className="flex items-center space-x-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={handleCancelEditUserMsg}
                              className="px-2.5 py-1 rounded-lg text-[#78716C] hover:text-[#1C1917] dark:hover:text-white hover:bg-[#F2ECE1] dark:hover:bg-[#1E202A] transition duration-150 cursor-pointer font-medium text-[11px]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditUserMsg(msg.id)}
                              className="px-3 py-1 rounded-lg bg-[#18181B] hover:bg-black dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black transition duration-150 cursor-pointer font-bold text-[11px] flex items-center space-x-1 shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <span>Save &amp; Resend</span>
                              <Send className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Normal Message Bubble with Hover Action Toolbar */
                      <div className="group relative flex flex-col items-end">
                        <div className={`p-4 sm:p-5 rounded-2xl max-w-2xl text-[12.5px] leading-relaxed shadow-xs border ${
                          isUser
                            ? 'bg-[#18181B] dark:bg-[#1A1C26] text-white border-[#18181B] dark:border-[#2C2F3C] rounded-tr-xs'
                            : 'bg-white dark:bg-[#14151C] text-[#1C1917] dark:text-[#F8FAFC] border-[#E7E2D6] dark:border-[#242734] rounded-tl-xs shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none'
                        }`}>
                          <RichMarkdownContent content={msg.content} isUser={isUser} />

                          {/* Discovered Offers Carousel / Cards */}
                          {!isUser && msg.discoveredOffers && msg.discoveredOffers.length > 0 && !msg.checkout && (
                            <div className="mt-3.5 pt-3.5 border-t border-[#EAE5D9] dark:border-[#242734] space-y-2.5">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] dark:text-[#94A3B8]">
                                Verified Connected Store Offers:
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {msg.discoveredOffers.slice(0, 2).map((offer, oIdx) => (
                                  <div
                                    key={oIdx}
                                    className="p-3.5 rounded-2xl bg-[#FCFAF6] dark:bg-[#181A22] border border-[#E7E2D6] dark:border-[#282B38] hover:border-[#18181B] dark:hover:border-white/40 transition space-y-2.5 shadow-2xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                                        offer.merchant_id === 'prime-gadgets'
                                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 font-sans'
                                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 font-sans'
                                      }`}>
                                        {offer.merchant_name}
                                      </span>
                                      <span className="font-black text-[#1C1917] dark:text-[#F8FAFC] font-mono text-sm">
                                        ₹{offer.price}
                                      </span>
                                    </div>

                                    <p className="font-semibold text-[#1C1917] dark:text-[#F8FAFC] text-xs line-clamp-1">
                                      {offer.name}
                                    </p>

                                    <div className="flex items-center justify-between text-[10.5px] text-[#78716C] dark:text-[#94A3B8] pt-2 border-t border-[#EAE5D9] dark:border-[#242734]">
                                      <span>🚚 {offer.delivery}</span>
                                      <button
                                        type="button"
                                        disabled={isRunning}
                                        onClick={() => handleSendMessage(`Buy ${offer.name} on ${offer.merchant_name}`)}
                                        className={`px-2.5 py-1 rounded-lg bg-[#18181B] hover:bg-black dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black text-[11px] font-bold transition flex items-center space-x-1 shadow-2xs ${
                                          isRunning ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                                        }`}
                                      >
                                        <span>Buy 0-OTP</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Multi-Agent ACP A2A Negotiation Dialogue Card */}
                          {!isUser && (msg.negotiation?.dialogue || msg.checkout?.negotiation?.dialogue) && (
                            <MultiAgentNegotiationCard negotiation={msg.negotiation || msg.checkout?.negotiation} />
                          )}

                          {/* Checkout Receipt Card (if completed) */}
                          {!isUser && msg.checkout?.success && msg.checkout.order && (
                            <div className="mt-3.5 p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-[#1A1C24] border border-emerald-200 dark:border-white/20 text-emerald-950 dark:text-[#F8FAFC] text-xs space-y-1.5 font-mono shadow-2xs">
                              <div className="flex items-center justify-between font-bold">
                                <span className="flex items-center space-x-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-white" />
                                  <span className="font-sans font-bold">0-OTP Autonomous Checkout Confirmed</span>
                                </span>
                                <span className="text-sm">₹{msg.checkout.order.amount} INR</span>
                              </div>
                              <div className="text-[11px] text-emerald-900 dark:text-[#CBD5E1] font-sans">
                                Order ID: <strong>{msg.checkout.order.order_id}</strong> • Settled via UPI Autopay under AP2 token
                              </div>
                            </div>
                          )}

                          {/* Intercepted Error Card */}
                          {!isUser && msg.checkout && !msg.checkout.success && (
                            <div className="mt-3.5 p-3.5 rounded-2xl bg-red-50/90 dark:bg-[#251216] border border-red-200 dark:border-red-900/50 text-red-950 dark:text-red-300 text-xs space-y-1 shadow-2xs">
                              <div className="flex items-center space-x-1.5 font-bold text-red-900 dark:text-red-300">
                                <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400" />
                                <span className="font-sans">AP2 Policy Guard Interception</span>
                              </div>
                              <p className="text-[11px] text-red-800 dark:text-red-200/80 font-sans">
                                {msg.checkout.error}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* 🎛️ User Message Hover Toolbar (Copy & Edit) */}
                        {isUser && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center space-x-1 pt-1 text-[#78716C] dark:text-[#94A3B8]">
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg.id, msg.content)}
                              className="p-1 rounded-lg hover:bg-[#F0ECE4] dark:hover:bg-[#1E202A] transition cursor-pointer text-[#78716C] dark:text-[#94A3B8] hover:text-[#1C1917] dark:hover:text-white"
                              title="Copy prompt"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-white stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditUserMsg(msg.id, msg.content)}
                              className="p-1 rounded-lg hover:bg-[#F0ECE4] dark:hover:bg-[#1E202A] transition cursor-pointer text-[#78716C] dark:text-[#94A3B8] hover:text-[#1C1917] dark:hover:text-white flex items-center space-x-1"
                              title="Edit message"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span className="text-[10.5px] font-medium">Edit</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 🎛️ Assistant Action Toolbar (Read aloud, Copy, Feedback, Share, Regenerate, More) */}
                    {!isUser && (
                      <div className="flex items-center space-x-1 pt-1 pl-1 text-[#78716C] dark:text-[#94A3B8]">
                        {/* Read aloud button */}
                        <button
                          type="button"
                          onClick={() => handleReadAloud(msg.id, msg.content)}
                          className={`px-2 py-1 rounded-lg hover:bg-[#F0ECE4] dark:hover:bg-[#1E202A] text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                            speakingMsgId === msg.id ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 font-bold' : ''
                          }`}
                          title={speakingMsgId === msg.id ? "Stop audio" : "Read aloud"}
                        >
                          {speakingMsgId === msg.id ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-amber-800 dark:text-amber-400 animate-pulse" />
                              <span className="text-[11px] text-amber-900 dark:text-amber-300 font-bold">Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Read aloud</span>
                            </>
                          )}
                        </button>

                        <span className="text-[#D6D0C4] dark:text-[#282B38]">•</span>

                        {/* Copy Response */}
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="p-1.5 rounded-lg hover:bg-[#F0ECE4] dark:hover:bg-[#1E202A] hover:text-[#1C1917] dark:hover:text-white transition cursor-pointer"
                          title="Copy response"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-white stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {/* Good response (Thumbs up) */}
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg.id, 'up')}
                          className={`p-1.5 rounded-lg hover:bg-[#F0ECE4] dark:hover:bg-[#1E202A] transition cursor-pointer ${
                            feedbackMap[msg.id] === 'up' ? 'text-emerald-700 dark:text-white bg-emerald-50 dark:bg-white/10 border border-emerald-200 dark:border-white/20' : ''
                          }`}
                          title="Good response"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Bad response (Thumbs down) */}
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg.id, 'down')}
                          className={`p-1.5 rounded-lg hover:bg-[#F0ECE4] dark:hover:bg-[#1E202A] transition cursor-pointer ${
                            feedbackMap[msg.id] === 'down' ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60' : ''
                          }`}
                          title="Bad response"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Share / Export */}
                        <button
                          type="button"
                          onClick={() => handleShareResponse(msg.id, msg.content)}
                          className="p-1.5 rounded-lg hover:bg-[#F0ECE4] dark:hover:bg-[#1E202A] hover:text-[#1C1917] dark:hover:text-white transition cursor-pointer"
                          title="Share response"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Regenerate / Retry */}
                        <button
                          type="button"
                          onClick={handleRegenerate}
                          className="p-1.5 rounded-lg hover:bg-[#F0ECE4] dark:hover:bg-[#1E202A] hover:text-[#1C1917] dark:hover:text-white transition cursor-pointer"
                          title="Regenerate response"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {/* More options dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenMenuMsgId(openMenuMsgId === msg.id ? null : msg.id)}
                            className="p-1.5 rounded-lg hover:bg-[#F0ECE4] dark:hover:bg-[#1E202A] hover:text-[#1C1917] dark:hover:text-white transition cursor-pointer"
                            title="More options"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {openMenuMsgId === msg.id && (
                            <div className="absolute left-0 bottom-8 z-30 w-44 rounded-2xl bg-white dark:bg-[#181A22] border border-[#E7E2D6] dark:border-[#2C2F3C] shadow-xl py-1.5 text-xs text-[#1C1917] dark:text-[#F8FAFC] animate-fade-in">
                              <button
                                type="button"
                                onClick={() => {
                                  handleCopyMessage(msg.id, msg.content);
                                  setOpenMenuMsgId(null);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-[#F5F2EC] dark:hover:bg-[#222530] flex items-center space-x-2 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-[#78716C] dark:text-[#94A3B8]" />
                                <span>Copy Raw Markdown</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const blob = new Blob([msg.content], { type: 'text/markdown' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `agentpay_response_${Date.now()}.md`;
                                  a.click();
                                  setOpenMenuMsgId(null);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-[#F5F2EC] dark:hover:bg-[#222530] flex items-center space-x-2 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-[#78716C] dark:text-[#94A3B8]" />
                                <span>Export as Markdown</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contextual Follow-Up Suggestion Chips */}
                    {!isUser && msg.suggestions && msg.suggestions.length > 0 && !isRunning && (
                      <div className="flex flex-wrap gap-1.5 pt-1.5 pl-1">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => handleSendMessage(sug)}
                            className="px-3 py-1.5 rounded-full bg-white dark:bg-[#161822] hover:bg-[#18181B] dark:hover:bg-[#222532] text-[#44403C] dark:text-[#CBD5E1] hover:text-white dark:hover:text-white border border-[#E7E2D6] dark:border-[#282B38] hover:border-[#18181B] dark:hover:border-white/30 text-[11px] font-medium transition duration-150 shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3 opacity-60 text-emerald-600 dark:text-white" />
                            <span>{sug}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Running Stepper OR Clean Thinking Indicator */}
              {isRunning && activeFlow && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#14161E] border border-[#E7E2D6] dark:border-[#242734] shadow-sm space-y-3 animate-fade-in">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#1C1917] dark:text-[#F8FAFC]">
                    <Loader2 className="w-4 h-4 text-[#18181B] dark:text-white animate-spin" />
                    <span>Executing autonomous AP2 purchase sequence...</span>
                  </div>
                  <LiveAutonomousStepper flow={activeFlow} isRunning={isRunning} />
                </div>
              )}

              {isRunning && !activeFlow && (
                <div className="flex items-center space-x-2.5 p-3.5 rounded-2xl bg-white dark:bg-[#14161E] border border-[#E7E2D6] dark:border-[#242734] text-xs text-[#1C1917] dark:text-[#F8FAFC] max-w-sm shadow-2xs animate-pulse">
                  <Bot className="w-4 h-4 text-[#18181B] dark:text-white animate-spin flex-shrink-0" />
                  <span className="font-medium">Searching merchant catalogs & evaluating options...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
            </div>

            {/* ================= 💎 LUXURY FLOATING COMPOSER BAR ================= */}
            <div className="p-3 sm:p-5 bg-transparent flex-shrink-0">
              <div className="max-w-3xl lg:max-w-4xl mx-auto w-full">
                <div className="rounded-2xl bg-white dark:bg-[#14161E] border border-[#E3DEC3] dark:border-[#262834] p-3 shadow-sm hover:shadow-md dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] focus-within:ring-2 focus-within:ring-[#18181B]/10 dark:focus-within:ring-white/20 focus-within:border-[#18181B] dark:focus-within:border-white/40 transition-all space-y-2.5">

                {/* Attached Files Carousel in Composer */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1 py-0.5">
                    {attachedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-[#F2ECE1] dark:bg-[#1E202A] border border-[#DFD9CE] dark:border-[#2C2F3C] text-[11px] font-mono text-[#1C1917] dark:text-[#F8FAFC] shadow-2xs animate-fade-in"
                      >
                        {file.type === 'image' ? <ImageIcon className="w-3 h-3 text-[#18181B] dark:text-white" /> : <FileText className="w-3 h-3 text-[#18181B] dark:text-white" />}
                        <span className="font-semibold max-w-[150px] truncate">{file.name}</span>
                        <span className="text-[10px] text-[#78716C] dark:text-[#94A3B8]">({file.size})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="hover:text-red-600 dark:hover:text-red-400 transition ml-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Main Textarea Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="space-y-2.5"
                >
                  <textarea
                    rows={2}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask agent to research items, price match, or checkout with 0-OTP..."
                    disabled={isRunning}
                    className="w-full bg-transparent border-0 resize-none text-[13px] font-medium text-[#1C1917] dark:text-[#F8FAFC] placeholder-[#A8A29E] dark:placeholder-[#64748B] focus:outline-none focus:ring-0 leading-relaxed px-1"
                    autoFocus
                  />

                  {/* Bottom Toolbar (Pill Selectors + Actions) */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#F2ECE1] dark:border-[#222530]">
                    
                    {/* Left Pills: Mode Selector + Model Selector */}
                    <div className="flex items-center space-x-2 relative">
                      
                      {/* Mode Pill */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setShowModeDropdown(!showModeDropdown);
                            setShowModelDropdown(false);
                            setShowAttachMenu(false);
                          }}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#F7F4EC] dark:bg-[#1C1E26] hover:bg-[#EAE4D7] dark:hover:bg-[#252834] border border-[#E3DEC3] dark:border-[#2E3140] text-xs font-semibold text-[#1C1917] dark:text-[#F8FAFC] transition shadow-2xs cursor-pointer"
                        >
                          <span>{activeModeObj.icon}</span>
                          <span>{activeModeObj.name}</span>
                          <ChevronDown className="w-3 h-3 text-[#78716C] dark:text-[#94A3B8]" />
                        </button>

                        {/* Mode Dropdown Menu */}
                        {showModeDropdown && (
                          <div className="absolute left-0 bottom-full mb-2 w-64 rounded-2xl bg-white dark:bg-[#181A22] border border-[#E7E2D6] dark:border-[#2C2F3C] shadow-2xl p-2 z-50 space-y-1 animate-fade-in text-xs">
                            <div className="text-[10px] font-bold text-[#78716C] dark:text-[#94A3B8] uppercase tracking-wider px-2 py-1">
                              Execution Mode
                            </div>
                            {AGENT_MODES.map((mode) => (
                              <button
                                key={mode.id}
                                type="button"
                                onClick={() => {
                                  setSelectedMode(mode.id);
                                  setShowModeDropdown(false);
                                }}
                                className={`w-full text-left p-2.5 rounded-xl border transition flex flex-col space-y-0.5 cursor-pointer ${
                                  selectedMode === mode.id
                                    ? 'bg-[#18181B] dark:bg-white/15 text-white dark:text-white border-[#18181B] dark:border-white/25'
                                    : 'bg-[#FCFAF6] dark:bg-[#14151C] hover:bg-[#F2ECE1] dark:hover:bg-[#1E2028] text-[#1C1917] dark:text-[#F8FAFC] border-[#E7E2D6] dark:border-[#282A34]'
                                }`}
                              >
                                <div className="flex items-center space-x-1.5 font-bold">
                                  <span>{mode.icon}</span>
                                  <span>{mode.name}</span>
                                </div>
                                <span className={`text-[10px] leading-tight ${selectedMode === mode.id ? 'text-stone-300 dark:text-stone-300' : 'text-[#78716C] dark:text-[#94A3B8]'}`}>
                                  {mode.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Model Selector Pill */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setShowModelDropdown(!showModelDropdown);
                            setShowModeDropdown(false);
                            setShowAttachMenu(false);
                          }}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#F7F4EC] dark:bg-[#1C1E26] hover:bg-[#EAE4D7] dark:hover:bg-[#252834] border border-[#E3DEC3] dark:border-[#2E3140] text-xs font-semibold text-[#1C1917] dark:text-[#F8FAFC] transition shadow-2xs cursor-pointer"
                        >
                          <Cpu className="w-3.5 h-3.5 text-[#78716C] dark:text-[#94A3B8]" />
                          <span className="max-w-[100px] sm:max-w-[140px] truncate">{activeModelObj.name}</span>
                          <ChevronDown className="w-3 h-3 text-[#78716C] dark:text-[#94A3B8]" />
                        </button>

                        {/* Model Dropdown Menu */}
                        {showModelDropdown && (
                          <div className="absolute left-0 bottom-full mb-2 w-72 rounded-2xl bg-white dark:bg-[#181A22] border border-[#E7E2D6] dark:border-[#2C2F3C] shadow-2xl p-2 z-50 space-y-1 animate-fade-in text-xs">
                            <div className="text-[10px] font-bold text-[#78716C] dark:text-[#94A3B8] uppercase tracking-wider px-2 py-1">
                              Intelligence Engine
                            </div>
                            {AVAILABLE_MODELS.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setSelectedModel(m.id);
                                  setShowModelDropdown(false);
                                }}
                                className={`w-full text-left p-2.5 rounded-xl border transition flex flex-col space-y-0.5 cursor-pointer ${
                                  selectedModel === m.id
                                    ? 'bg-[#18181B] dark:bg-white/15 text-white dark:text-white border-[#18181B] dark:border-white/25'
                                    : 'bg-[#FCFAF6] dark:bg-[#14151C] hover:bg-[#F2ECE1] dark:hover:bg-[#1E2028] text-[#1C1917] dark:text-[#F8FAFC] border-[#E7E2D6] dark:border-[#282A34]'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold">{m.name}</span>
                                  {selectedModel === m.id && <Check className="w-3.5 h-3.5 text-white dark:text-white stroke-[3]" />}
                                </div>
                                <span className={`text-[10px] leading-tight ${selectedModel === m.id ? 'text-stone-300 dark:text-stone-300' : 'text-[#78716C] dark:text-[#94A3B8]'}`}>
                                  {m.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Right Controls: Attach File + Send / Stop Button */}
                    <div className="flex items-center space-x-2 relative">
                      
                      {/* Attachment Menu Button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(!showAttachMenu);
                            setShowModelDropdown(false);
                            setShowModeDropdown(false);
                          }}
                          className={`p-2 rounded-xl transition cursor-pointer border ${
                            showAttachMenu || attachedFiles.length > 0
                              ? 'bg-[#18181B] dark:bg-white/15 text-white dark:text-white border-[#18181B] dark:border-white/25'
                              : 'text-[#78716C] dark:text-[#94A3B8] hover:text-[#1C1917] dark:hover:text-white hover:bg-[#F2ECE1] dark:hover:bg-[#1E2028] border-transparent'
                          }`}
                          title="Attach files or context"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>

                        {/* File Upload Dropdown Menu */}
                        {showAttachMenu && (
                          <div className="absolute right-0 bottom-full mb-2 w-64 rounded-2xl bg-white dark:bg-[#181A22] border border-[#E7E2D6] dark:border-[#2C2F3C] shadow-2xl p-2 z-50 space-y-1 animate-fade-in text-xs">
                            <div className="text-[10px] font-bold text-[#78716C] dark:text-[#94A3B8] uppercase tracking-wider px-2 py-1">
                              Attach Context &amp; Files
                            </div>
                            
                            <button
                              type="button"
                              onClick={handleFileUploadTrigger}
                              className="w-full text-left p-2.5 rounded-xl bg-[#FCFAF6] dark:bg-[#14151C] hover:bg-[#F2ECE1] dark:hover:bg-[#1E2028] border border-[#E7E2D6] dark:border-[#282A34] transition flex items-center space-x-2.5 cursor-pointer text-[#1C1917] dark:text-[#F8FAFC]"
                            >
                              <UploadCloud className="w-4 h-4 text-[#18181B] dark:text-white" />
                              <div>
                                <span className="font-bold block">Upload from Device</span>
                                <span className="text-[10px] text-[#78716C] dark:text-[#94A3B8]">PDF, Images, JSON, Docs</span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAttachMock('photo')}
                              className="w-full text-left p-2.5 rounded-xl bg-[#FCFAF6] dark:bg-[#14151C] hover:bg-[#F2ECE1] dark:hover:bg-[#1E2028] border border-[#E7E2D6] dark:border-[#282A34] transition flex items-center space-x-2.5 cursor-pointer text-[#1C1917] dark:text-[#F8FAFC]"
                            >
                              <ImageIcon className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                              <div>
                                <span className="font-bold block">Product Photo Sample</span>
                                <span className="text-[10px] text-[#78716C] dark:text-[#94A3B8]">desired_mouse_photo.jpg</span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAttachMock('specs')}
                              className="w-full text-left p-2.5 rounded-xl bg-[#FCFAF6] dark:bg-[#14151C] hover:bg-[#F2ECE1] dark:hover:bg-[#1E2028] border border-[#E7E2D6] dark:border-[#282A34] transition flex items-center space-x-2.5 cursor-pointer text-[#1C1917] dark:text-[#F8FAFC]"
                            >
                              <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                              <div>
                                <span className="font-bold block">Product Spec Sheet</span>
                                <span className="text-[10px] text-[#78716C] dark:text-[#94A3B8]">logitech_spec_sheet.pdf</span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAttachMock('mandate')}
                              className="w-full text-left p-2.5 rounded-xl bg-[#FCFAF6] dark:bg-[#14151C] hover:bg-[#F2ECE1] dark:hover:bg-[#1E2028] border border-[#E7E2D6] dark:border-[#282A34] transition flex items-center space-x-2.5 cursor-pointer text-[#1C1917] dark:text-[#F8FAFC]"
                            >
                              <FileCode className="w-4 h-4 text-emerald-700 dark:text-white" />
                              <div>
                                <span className="font-bold block">AP2 Mandate Vault</span>
                                <span className="text-[10px] text-[#78716C] dark:text-[#94A3B8]">ap2_mandate_vault.json</span>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 🎙️ Ambient Voice Shopping Button */}
                      <button
                        type="button"
                        onClick={handleOpenVoice}
                        className={`p-2 rounded-xl transition cursor-pointer border ${
                          activeMainView === 'voice' || voiceAssistant.isListening
                            ? 'bg-indigo-600 text-white border-indigo-700 animate-pulse'
                            : 'text-[#78716C] dark:text-[#94A3B8] hover:text-[#1C1917] dark:hover:text-white hover:bg-[#F2ECE1] dark:hover:bg-[#1E2028] border-transparent'
                        }`}
                        title="Ambient Voice Shopping (0-OTP Voice-to-Checkout)"
                      >
                        <Mic className="w-4 h-4" />
                      </button>

                      {/* 💎 Circular Send Button */}
                      <button
                        type="submit"
                        disabled={(!prompt.trim() && attachedFiles.length === 0) && !isRunning}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform shadow-xs cursor-pointer ${
                          isRunning
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : (prompt.trim() || attachedFiles.length > 0)
                            ? 'bg-[#18181B] hover:bg-black dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black hover:scale-105'
                            : 'bg-[#EAE5D9] dark:bg-[#20222C] text-[#A8A29E] dark:text-[#4B5264] cursor-not-allowed'
                        }`}
                        title={isRunning ? "Cancel execution" : "Send message (Enter)"}
                      >
                        {isRunning ? (
                          <Square className="w-3 h-3 fill-current" />
                        ) : (
                          <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </button>
                    </div>
                  </div>
                </form>

              </div>
            </div>
          </div>

        </div>
      )}

      </div>

        {/* Corner Drag-Resize Grip */}
        {!isFullscreen && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              const rect = modalContainerRef.current?.getBoundingClientRect();
              if (rect) {
                setModalDragStart({
                  x: e.clientX,
                  y: e.clientY,
                  w: rect.width,
                  h: rect.height
                });
                setIsResizingModal(true);
              }
            }}
            className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize flex items-end justify-end p-0.5 text-[#A8A29E] hover:text-[#18181B] dark:hover:text-white transition z-30 select-none group"
            title="Drag corner to resize chat window"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-40 group-hover:opacity-100 transition">
              <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        )}

      </div>
    </div>
  );
}
