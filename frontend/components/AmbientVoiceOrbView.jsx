'use client';
import { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, ArrowRight, Sparkles, CheckCircle2, Tag, Loader2 } from 'lucide-react';
import MultiAgentNegotiationCard from './MultiAgentNegotiationCard';

function formatInlineText(text) {
  if (!text) return null;
  const tokenRegex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={idx} className="font-bold text-[#1C1917] dark:text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return <code key={idx} className="font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1 py-0.2 rounded text-[10px]">{part.slice(1, -1)}</code>;
    }
    return <span key={idx}>{part}</span>;
  });
}

export default function AmbientVoiceOrbView({
  isRunning = false,
  isListening,
  isSpeaking,
  volumeLevel = 0,
  permissionState = 'prompt',
  transcript = '',
  interimTranscript = '',
  latestAssistantMsg = null,
  onStartListening,
  onStopListening,
  onSwitchToChat,
  onSubmitPrompt,
  onSpeakMessage,
  onStopSpeaking
}) {
  const currentSpeech = (transcript + (interimTranscript ? ` ${interimTranscript}` : '')).trim();

  // Dynamic scale and fluid border-radius distortion based on volumeLevel
  const scale = 1 + (isRunning ? 0.12 : isListening ? Math.max(0.08, volumeLevel * 0.45) : isSpeaking ? 0.15 : 0.04);
  const glowOpacity = 0.35 + (isRunning ? 0.4 : isListening ? Math.max(0.2, volumeLevel * 0.6) : isSpeaking ? 0.3 : 0.12);

  // Dynamic fluid morphing shape
  const borderRadius = isListening
    ? `${46 + volumeLevel * 9}% ${54 - volumeLevel * 7}% ${49 + volumeLevel * 11}% ${51 - volumeLevel * 9}% / ${51 - volumeLevel * 9}% ${48 + volumeLevel * 11}% ${52 - volumeLevel * 7}% ${49 + volumeLevel * 9}%`
    : '50%';

  return (
    <div className="flex-1 flex flex-col justify-between items-center bg-[#FCFAF6] dark:bg-[#121215] text-[#1C1917] dark:text-[#F4F4F5] p-5 sm:p-7 animate-fade-in relative overflow-y-auto select-none font-sans min-h-[520px] transition-colors duration-200">
      
      {/* 1. Top Minimalist Status Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between z-10 pb-2">
        <div className="flex items-center space-x-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            isRunning ? 'bg-indigo-500 animate-ping' : isListening ? 'bg-emerald-500 animate-ping' : isSpeaking ? 'bg-indigo-500 animate-pulse' : 'bg-[#A8A29E]'
          }`} />
          <span className="text-xs font-mono uppercase tracking-wider text-[#57534E] dark:text-stone-300 font-bold">
            {isRunning ? "Agent Thinking & Resolving..." : isListening ? "Listening (Microphone Active)..." : isSpeaking ? "Agent Speaking..." : "Voice Ready"}
          </span>
        </div>

        <button
          type="button"
          onClick={onSwitchToChat}
          className="px-3.5 py-1.5 rounded-xl bg-[#F0ECE4] hover:bg-[#EAE5D9] dark:bg-[#1C1C21] dark:hover:bg-[#25252B] text-[#1C1917] dark:text-[#F4F4F5] text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer border border-[#DFD9CE] dark:border-[#27272C] shadow-2xs"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Switch to Text</span>
        </button>
      </div>

      {/* Permission Warning Banner (if blocked) */}
      {permissionState === 'denied' && (
        <div className="w-full max-w-2xl mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs flex items-center justify-between">
          <span>⚠️ <strong>Microphone Blocked</strong>: Please click the lock/camera icon in your browser URL bar and set Microphone to <strong>Allow</strong>.</span>
        </div>
      )}

      {/* 2. Center Stage: Luminous Fluid Ambient Voice Orb */}
      <div className="my-auto py-6 sm:py-8 flex flex-col items-center justify-center relative">
        
        {/* Soft Ambient Glow Halo */}
        <div 
          className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full blur-3xl pointer-events-none transition-all duration-300"
          style={{
            background: 'radial-gradient(circle, rgba(129, 140, 248, 0.45) 0%, rgba(99, 102, 241, 0.18) 50%, transparent 70%)',
            transform: `scale(${scale * 1.3})`,
            opacity: glowOpacity
          }}
        />

        {/* The Glowing Organic Fluid Gradient Orb */}
        <div
          onClick={isListening ? onStopListening : onStartListening}
          className="relative w-36 h-36 sm:w-48 sm:h-48 cursor-pointer transition-transform duration-100 ease-out shadow-[0_0_50px_rgba(99,102,241,0.45)] flex items-center justify-center group"
          style={{
            transform: `scale(${scale})`,
            borderRadius: borderRadius,
            background: isRunning
              ? 'linear-gradient(135deg, #818CF8 0%, #4F46E5 50%, #312E81 100%)'
              : isListening 
              ? 'linear-gradient(135deg, #C7D2FE 0%, #6366F1 45%, #4338CA 100%)' 
              : 'linear-gradient(135deg, #A5B4FC 0%, #6366F1 45%, #4338CA 100%)',
            boxShadow: `0 0 ${25 + (isListening ? Math.max(15, volumeLevel * 60) : 0)}px rgba(129, 140, 248, ${0.45 + volumeLevel * 0.45})`
          }}
        >
          {/* Inner Fluid Shimmer Specular Light */}
          <div 
            className="absolute inset-0 opacity-80 pointer-events-none transition-all duration-150"
            style={{
              borderRadius: borderRadius,
              background: 'radial-gradient(circle at 32% 32%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 55%)'
            }}
          />

          {/* Center Mic State Icon */}
          <div className="relative z-10 p-3 rounded-full bg-black/20 backdrop-blur-sm text-white transition group-hover:scale-110">
            {isRunning ? (
              <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin text-white" />
            ) : isListening ? (
              <Mic className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse text-white" />
            ) : (
              <MicOff className="w-6 h-6 sm:w-7 sm:h-7 text-white/80" />
            )}
          </div>
        </div>

        {/* Live Spoken Words Preview (Under Orb) */}
        <div className="mt-5 text-center max-w-lg min-h-[32px] px-4 flex flex-col items-center gap-2">
          {currentSpeech && !isRunning ? (
            <div className="flex items-center gap-2.5 bg-[#F0ECE4] dark:bg-[#1E1E24] px-4 py-2 rounded-2xl border border-[#DFD9CE] dark:border-[#27272C] shadow-2xs animate-fade-in">
              <p className="text-sm sm:text-base font-semibold text-[#1C1917] dark:text-[#F4F4F5] leading-relaxed">
                "{currentSpeech}"
              </p>
              <button
                type="button"
                onClick={() => onSubmitPrompt(currentSpeech)}
                className="px-3 py-1 rounded-xl bg-[#18181B] hover:bg-black text-white dark:bg-stone-100 dark:text-[#18181B] dark:hover:bg-white text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-xs flex-shrink-0"
                title="Execute now"
              >
                <span>Send</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-[#78716C] dark:text-[#A1A1AA] font-mono tracking-wide">
              {isListening ? "Listening... Speak your command (e.g. 'Buy phone stand on Meesho')" : "Tap the orb or mic to start speaking"}
            </p>
          )}
        </div>

      </div>

      {/* 3. Bottom: Agent Live Output & Actions */}
      <div className="w-full max-w-2xl space-y-3 z-10">
        
        {/* Latest Agent Response / Multi-Agent Card */}
        {latestAssistantMsg && (
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18181C] border border-[#DFD9CE] dark:border-[#27272C] shadow-sm space-y-2.5 max-h-52 overflow-y-auto text-left">

            <div className="text-xs text-[#27272A] dark:text-[#E4E4E7] leading-relaxed font-sans whitespace-pre-wrap">
              {formatInlineText(latestAssistantMsg.content)}
            </div>

            {/* A2A Swarm Dialogue if present */}
            {latestAssistantMsg.negotiation?.dialogue && (
              <MultiAgentNegotiationCard negotiation={latestAssistantMsg.negotiation} />
            )}

            {/* 0-OTP Confirmed Order Pill */}
            {latestAssistantMsg.checkout?.success && latestAssistantMsg.checkout.order && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs flex items-center justify-between font-mono">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="font-sans font-bold">0-OTP Confirmed: {latestAssistantMsg.checkout.order.product?.name}</span>
                </div>
                <span className="font-bold text-emerald-800 dark:text-emerald-300">₹{latestAssistantMsg.checkout.order.amount} INR</span>
              </div>
            )}
          </div>
        )}

        {/* Mic Control Bar */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={isListening ? onStopListening : onStartListening}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer shadow-sm ${
              isListening
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-[#18181B] hover:bg-black text-white dark:bg-stone-100 dark:text-[#18181B] dark:hover:bg-white hover:scale-105'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Pause Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Tap to Speak</span>
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
}
