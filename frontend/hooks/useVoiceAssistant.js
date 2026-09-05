'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

export function useVoiceAssistant({ onTranscriptComplete, isAutoSpeakEnabled = true } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [permissionState, setPermissionState] = useState('prompt');

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animFrameRef = useRef(null);
  const simIntervalRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const activeUtteranceRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const isUnlockedRef = useRef(false);
  const latestFullTranscriptRef = useRef('');
  const onTranscriptCompleteRef = useRef(onTranscriptComplete);

  useEffect(() => {
    onTranscriptCompleteRef.current = onTranscriptComplete;
  }, [onTranscriptComplete]);

  // Clean audio analyzer & stream
  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch (e) {}
      audioContextRef.current = null;
    }
    setVolumeLevel(0);
  }, []);

  // Unlock browser audio permissions upon user gesture
  const unlockAudioEngine = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.resume();
        if (!isUnlockedRef.current) {
          const silentUtterance = new SpeechSynthesisUtterance('');
          silentUtterance.volume = 0;
          window.speechSynthesis.speak(silentUtterance);
          isUnlockedRef.current = true;
        }
      } catch (e) {}
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      try {
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        ctx.close().catch(() => {});
      } catch (e) {}
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    cleanupAudio();
    setIsListening(false);
  }, [cleanupAudio]);

  // Start listening with immediate UI feedback + Fallback Resilience
  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return;

    unlockAudioEngine();

    // 1. Only cancel speech if it's still speaking from a previous session (not mid-response)
    // We do NOT cancel here so the agent's current spoken response plays fully

    // 2. Clear old transcript and set active state IMMEDIATELY
    setTranscript('');
    setInterimTranscript('');
    latestFullTranscriptRef.current = '';
    setIsListening(true);

    // 3. Start ambient pulse animation ticker immediately
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    simIntervalRef.current = setInterval(() => {
      setVolumeLevel(0.25 + Math.random() * 0.45);
    }, 120);

    // 4. Try Web Audio hardware microphone analyzer
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        mediaStreamRef.current = stream;
        setPermissionState('granted');

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          try {
            const ctx = new AudioContext();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.75;
            source.connect(analyser);
            analyserRef.current = analyser;

            if (simIntervalRef.current) {
              clearInterval(simIntervalRef.current);
              simIntervalRef.current = null;
            }

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateVolume = () => {
              if (!analyserRef.current) return;
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              const normalized = Math.min(1, Math.max(0.08, avg / 45));
              setVolumeLevel(normalized);
              animFrameRef.current = requestAnimationFrame(updateVolume);
            };
            animFrameRef.current = requestAnimationFrame(updateVolume);
          } catch (e) {
            console.warn('AudioContext notice:', e);
          }
        }
      }).catch(err => {
        console.warn('Mic permission notice:', err.message);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionState('denied');
        }
      });
    }

    // 5. Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = 'en-IN';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event) => {
          let accumulatedFinal = '';
          let accumulatedInterim = '';

          for (let i = 0; i < event.results.length; i++) {
            const resultItem = event.results[i];
            if (resultItem.isFinal) {
              accumulatedFinal += resultItem[0].transcript + ' ';
            } else {
              accumulatedInterim += resultItem[0].transcript + ' ';
            }
          }

          const combined = (accumulatedFinal + accumulatedInterim).trim();
          latestFullTranscriptRef.current = combined;

          setTranscript(accumulatedFinal.trim());
          setInterimTranscript(accumulatedInterim.trim());

          // Auto-submit after 1.5 seconds of silence
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            const finalSpokenPrompt = latestFullTranscriptRef.current.trim();
            if (finalSpokenPrompt && finalSpokenPrompt.length > 0) {
              latestFullTranscriptRef.current = '';
              setTranscript('');
              setInterimTranscript('');
              stopListening();
              if (onTranscriptCompleteRef.current) {
                onTranscriptCompleteRef.current(finalSpokenPrompt);
              }
            }
          }, 1500);
        };

        recognition.onerror = (event) => {
          console.warn('SpeechRecognition error:', event.error);
          if (event.error === 'not-allowed') {
            setPermissionState('denied');
          }
        };

        recognition.onend = () => {};

        recognitionRef.current = recognition;
        recognition.start();
      } catch (recErr) {
        console.warn('Recognition start notice:', recErr.message);
      }
    } else {
      setIsSupported(false);
    }
  }, [stopListening, unlockAudioEngine]);

  // Clean up everything on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
    };
  }, [stopListening]);

  // Text-to-Speech Synthesis with Multi-Layer Chrome Reliability
  const speak = useCallback((text) => {
    if (typeof window === 'undefined') return;

    const cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{2388}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{1F004}\u{1F0CF}\u{3297}\u{3299}\u{1F004}]/gu, '')
      .replace(/[*_~`#]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/₹/g, ' rupees ')
      .replace(/[•✓🛑⚡🛡️🤖💬🏪🛒🚀]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    if (!window.speechSynthesis) {
      console.warn('SpeechSynthesis not available in this browser.');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      // Keep reference to prevent V8 garbage collection
      activeUtteranceRef.current = utterance;
      window._activeVoiceUtterance = utterance;

      const assignVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const preferredVoice = voices.find(v =>
            v.name.includes('Google UK English Female') ||
            v.name.includes('Google US English') ||
            v.name.includes('Microsoft Zira') ||
            v.name.includes('Samantha') ||
            v.lang.includes('en-IN')
          ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
          if (preferredVoice) utterance.voice = preferredVoice;
        }
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      };

      utterance.onstart = () => {
        setIsSpeaking(true);
        if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
        resumeTimerRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }, 300);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        activeUtteranceRef.current = null;
        if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        setIsSpeaking(false);
        activeUtteranceRef.current = null;
        if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
      };

      // Play — wait for voices if not loaded yet
      if (window.speechSynthesis.getVoices().length > 0) {
        assignVoiceAndSpeak();
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', assignVoiceAndSpeak, { once: true });
        // Fallback: speak without preferred voice if voiceschanged never fires
        setTimeout(() => {
          if (!window.speechSynthesis.speaking) {
            window.speechSynthesis.speak(utterance);
            setIsSpeaking(true);
          }
        }, 500);
      }

    } catch (err) {
      console.warn('Speech playback catch:', err);
      setIsSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    setIsSpeaking(false);
    activeUtteranceRef.current = null;
    if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    latestFullTranscriptRef.current = '';
  }, []);

  return {
    isListening,
    isSpeaking,
    isSupported,
    permissionState,
    transcript,
    interimTranscript,
    volumeLevel,
    startListening,
    stopListening,
    clearTranscript,
    speak,
    stopSpeaking,
    unlockAudioEngine
  };
}
