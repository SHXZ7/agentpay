'use client';

export default function AgentPayLogo({ size = 36, className = "" }) {
  return (
    <div 
      style={{ width: size, height: size }}
      className={`rounded-xl bg-[#18181B] text-white shadow-md border border-stone-800 flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-105 ${className}`}
    >
      <svg 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-[72%] h-[72%]"
      >
        <defs>
          <linearGradient id="agentPayGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>
          <linearGradient id="glowGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#94A3B8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ambient Glow Background */}
        <circle cx="16" cy="16" r="14" fill="url(#glowGrad)" />

        {/* Outer Cryptographic Hexagon Shield */}
        <path 
          d="M16 3L27 9.5V22.5L16 29L5 22.5V9.5L16 3Z" 
          stroke="url(#agentPayGrad)" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Inner Stylized AP Lightning Bolt Payment Path */}
        <path 
          d="M17.5 7.5L10 16.5H16L14.5 24.5L22 15.5H16L17.5 7.5Z" 
          fill="url(#agentPayGrad)" 
        />
        
        {/* Central Core Spark */}
        <circle cx="16" cy="16" r="1.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
}
