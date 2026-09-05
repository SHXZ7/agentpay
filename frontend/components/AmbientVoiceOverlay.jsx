'use client';
import { Mic, X, Send, Sparkles, Volume2 } from 'lucide-react';

export default function AmbientVoiceOverlay({
  isOpen,
  isListening,
  transcript,
  interimTranscript,
  volumeLevel = 0.5,
  onClose,
  onSubmit
}) {
  if (!isOpen) return null;

  const currentDisplay = (transcript + (interimTranscript ? ` ${interimTranscript}` : '')).trim();

  // 12 animated equalizer bars
  const barHeights = [
    25 + volumeLevel * 45,
    45 + volumeLevel * 60,
    30 + volumeLevel * 50,
    70 + volumeLevel * 75,
    90 + volumeLevel * 85,
    55 + volumeLevel * 65,
    85 + volumeLevel * 80,
    40 + volumeLevel * 55,
    65 + volumeLevel * 70,
    35 + volumeLevel * 45,
    50 + volumeLevel * 60,
    20 + volumeLevel * 35,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-[#FAF8F5] border border-[#DFD9CE] shadow-2xl text-center space-y-6">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-[#78716C] hover:text-[#1C1917] hover:bg-[#F0ECE4] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ambient Header */}
        <div className="space-y-1">
          <h3 className="text-lg sm:text-xl font-bold text-[#1C1917]">
            {isListening ? "Listening to your voice..." : "Voice Command Ready"}
          </h3>
          <p className="text-xs text-[#78716C]">
            Speak naturally: state what you want to buy, budget, or preferred store.
          </p>
        </div>

        {/* Pulsing Glowing Audio Waveform */}
        <div className="flex items-center justify-center gap-1.5 h-24 py-2">
          {barHeights.map((height, idx) => (
            <div
              key={idx}
              className="w-2 rounded-full transition-all duration-75"
              style={{
                height: `${isListening ? Math.min(90, Math.max(12, height)) : 10}px`,
                background: idx % 3 === 0 
                  ? '#18181B' 
                  : idx % 3 === 1 
                  ? '#059669' 
                  : '#F43397'
              }}
            />
          ))}
        </div>

        {/* Live Speech Transcript Box */}
        <div className="p-4 rounded-2xl bg-[#F0ECE4] border border-[#DFD9CE] min-h-[70px] flex items-center justify-center text-center">
          {currentDisplay ? (
            <p className="text-sm font-semibold text-[#1C1917] leading-relaxed">
              "{currentDisplay}"
            </p>
          ) : (
            <p className="text-xs text-[#8F8A7E] italic flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 animate-pulse text-[#18181B]" />
              <span>Say: "Buy cheapest phone stand on Meesho" or "Order wireless mouse on Amazon"...</span>
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[#DFD9CE] bg-white text-xs font-semibold text-[#78716C] hover:text-[#1C1917] hover:bg-[#F2ECE1] transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!currentDisplay}
            onClick={() => onSubmit(currentDisplay)}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer ${
              currentDisplay 
                ? 'bg-[#18181B] hover:bg-black text-white scale-100 hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-[#DFD9CE] text-[#8F8A7E] cursor-not-allowed'
            }`}
          >
            <span>Execute 0-OTP Flow</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Preset Prompt Suggestions */}
        <div className="pt-2 border-t border-[#DFD9CE]/60 flex flex-wrap justify-center gap-1.5 text-[10.5px]">
          <span className="text-[#8F8A7E] self-center mr-1">Try saying:</span>
          {[
            "Buy phone stand on Meesho",
            "Order cosmic byte headset on Flipkart",
            "Buy Logitech mouse on Amazon"
          ].map((sample, sIdx) => (
            <button
              key={sIdx}
              type="button"
              onClick={() => onSubmit(sample)}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#DFD9CE] text-[#57534E] hover:border-[#18181B] hover:text-[#1C1917] transition cursor-pointer font-medium"
            >
              "{sample}"
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
