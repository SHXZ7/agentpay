'use client';
import { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  ShoppingBag, 
  Check, 
  Lock, 
  Mail, 
  Phone, 
  User, 
  ChevronRight,
  Loader2,
  CheckCircle2,
  ExternalLink,
  X
} from 'lucide-react';
import AgentPayLogo from './AgentPayLogo';
import { loginWithCredentials, sendAuthOtp, clearAuthToken } from '@/lib/api';

export default function AuthScreen({ onLoginSuccess, onClose, isModal = false }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [step, setStep] = useState('input'); // 'input' | 'otp'
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [upiVpa, setUpiVpa] = useState('shopper@oksbi');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleIdentifierSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) {
      setError('Please enter your email or phone number');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name');
      return;
    }

    setLoading(true);
    try {
      await sendAuthOtp(identifier.trim());
      setStep('otp');
    } catch (err) {
      console.warn("OTP send notice:", err.message);
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');

    const otpCode = otp.join('').trim() || '1234';

    try {
      const result = await loginWithCredentials({
        identifier: identifier.trim(),
        otp: otpCode,
        name: name.trim(),
        upi_vpa: upiVpa.trim(),
        mode
      });

      if (result.success && result.user) {
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        }
      } else {
        setError(result.error || 'Authentication failed. Please verify your OTP code.');
      }
    } catch (err) {
      console.error("Auth verify error:", err);
      setError('Failed to reach authentication service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (demoName, demoEmail, demoVpa) => {
    setLoading(true);
    clearAuthToken();
    setTimeout(() => {
      setLoading(false);
      const userProfile = {
        name: demoName,
        email: demoEmail,
        phone: '+91 98765 43210',
        upi_vpa: demoVpa
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('agentpay_auth_user', JSON.stringify(userProfile));
      }
      if (onLoginSuccess) {
        onLoginSuccess(userProfile);
      }
    }, 400);
  };

  return (
    <div className="h-screen max-h-screen w-screen max-w-full bg-[#FAF8F5] text-[#1F2421] flex flex-col font-sans relative overflow-hidden select-none">
      
      {/* Modal Close Button */}
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-[#EAE4D9] hover:bg-[#DFD9CE] text-[#5C574F] hover:text-[#1F2421] transition shadow-xs cursor-pointer"
          title="Close modal"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Main Split Layout Grid - Exactly 100vh */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 h-full max-h-full overflow-hidden">
        
        {/* ──────────────────────────────────────────────────────────────────────────
            LEFT HERO SHOWCASE (Zen Linen Ethereal Wave Canvas - 7 Cols)
        ────────────────────────────────────────────────────────────────────────── */}
        <div className="hidden lg:flex lg:col-span-7 relative p-6 xl:p-8 flex-col justify-between overflow-hidden border-r border-[#DFD9CE] bg-[#F4EFE6] h-full">
          
          {/* Ambient Ethereal Mesh Canvas Backdrop */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Soft Warm Linen Background Waves */}
            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#EAE2D3] via-[#E4DAC8] to-[#DFD0B8] opacity-70 blur-3xl" />
            <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-amber-100/60 via-[#E8DFD1] to-[#DDD2BE] opacity-60 blur-2xl" />
            <div className="absolute -bottom-24 left-1/4 w-[500px] h-[400px] rounded-full bg-gradient-to-tr from-emerald-100/40 via-[#E6DCC9] to-[#FAF8F5] opacity-80 blur-3xl" />
            
            {/* Ethereal Angled Light Ribbons / Waves Effect (Matches Reference Flow) */}
            <div 
              className="absolute inset-0 opacity-40 mix-blend-multiply"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  -45deg,
                  rgba(255, 255, 255, 0.4) 0px,
                  rgba(255, 255, 255, 0.4) 35px,
                  rgba(235, 227, 213, 0.3) 35px,
                  rgba(235, 227, 213, 0.3) 70px,
                  rgba(245, 239, 230, 0.6) 70px,
                  rgba(245, 239, 230, 0.6) 105px
                )`
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#F4EFE6]/90 via-transparent to-[#F4EFE6]/40" />
          </div>

          {/* Top Left Branding */}
          <div className="relative z-10 shrink-0 -mt-1 -ml-1">
            <div className="flex items-center space-x-3">
              <AgentPayLogo className="h-8 w-auto" />
            </div>
          </div>

          {/* Center Visual Showcase / Subtle Brand Seal */}
          <div className="relative z-10 my-auto py-4 space-y-4 max-w-lg">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#FAF8F5]/90 backdrop-blur-md border border-[#DFD9CE] text-[10.5px] font-mono font-semibold text-[#1F2421] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#27272A] animate-pulse" />
              <span>Razorpay AP2 &amp; Autonomous 0-OTP Engine</span>
            </div>

            {/* Main Headline from User Reference */}
            <h1 className="text-2xl xl:text-[32px] font-black text-[#1F2421] tracking-tight leading-[1.2]">
              Join Millions of Shoppers that Trust Razorpay to Supercharge Autonomous Commerce
            </h1>
            
            <p className="text-xs xl:text-sm text-[#57534E] leading-relaxed">
              Experience zero-friction 0-OTP headless payments, multi-store price negotiations, and cryptographically verified AP2 mandates across Amazon India, Flipkart, and Meesho.
            </p>
          </div>

          {/* Bottom Bullet Highlights (Matches Reference Inspiration) */}
          <div className="relative z-10 pt-4 border-t border-[#DFD9CE]/80 flex flex-wrap items-center gap-5 xl:gap-7 text-[11px] font-bold text-[#1F2421] shrink-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-[#1F2421] text-xs font-black">✦</span>
              <span>100+ Payment Methods</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[#1F2421] text-xs font-black">✦</span>
              <span>0-OTP Headless Autopay</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[#1F2421] text-xs font-black">✦</span>
              <span>Multi-Store ACP Negotiation</span>
            </div>
          </div>

        </div>

        {/* ──────────────────────────────────────────────────────────────────────────
            RIGHT AUTH FORM PANEL (Clean White / Linen Card - 5 Cols)
        ────────────────────────────────────────────────────────────────────────── */}
        <div className="col-span-1 lg:col-span-5 bg-white relative flex flex-col justify-center px-6 sm:px-10 xl:px-14 py-6 overflow-hidden h-full">
          
          {/* Form Container - Compact to fit completely in 1 window */}
          <div className="space-y-3.5 max-w-sm w-full mx-auto my-auto">
            
            {/* Main Title */}
            <div className="space-y-1">
              <h2 className="text-xl sm:text-[22px] font-black text-[#1F2421] tracking-tight leading-tight">
                {step === 'input' 
                  ? (mode === 'login' ? 'Get started with your email or phone number' : 'Create your Autonomous Shopper account')
                  : 'Verify your 0-OTP authorization code'}
              </h2>
            </div>

            {/* Mode Switcher Tabs (Log In vs Sign Up) */}
            {step === 'input' && (
              <div className="flex p-0.5 rounded-lg bg-[#F0ECE4] border border-[#DFD9CE] text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className={`flex-1 py-1.5 rounded-md transition text-center cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-[#1F2421] shadow-2xs'
                      : 'text-[#6E736D] hover:text-[#1F2421]'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(''); }}
                  className={`flex-1 py-1.5 rounded-md transition text-center cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-white text-[#1F2421] shadow-2xs'
                      : 'text-[#6E736D] hover:text-[#1F2421]'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Step 1: Identifier Input Form */}
            {step === 'input' && (
              <form onSubmit={handleIdentifierSubmit} className="space-y-3">
                
                {mode === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#6E736D] uppercase tracking-wider block">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Shaaz Ahmed"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#DFD9CE] bg-[#FAF8F5] text-xs text-[#1F2421] placeholder:text-[#9E9A94] focus:outline-none focus:border-[#1F2421] transition font-medium"
                      />
                      <User className="w-3.5 h-3.5 text-[#8F8A7E] absolute right-3 top-2.5" />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#6E736D] uppercase tracking-wider block">
                    Email or Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your email or phone number"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#DFD9CE] bg-[#FAF8F5] text-xs text-[#1F2421] placeholder:text-[#9E9A94] focus:outline-none focus:border-[#1F2421] focus:ring-1 focus:ring-[#1F2421]/20 transition font-medium"
                    autoFocus
                  />
                </div>

                {mode === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#6E736D] uppercase tracking-wider block">
                      Primary UPI VPA (for 0-OTP Autopay Vault)
                    </label>
                    <input
                      type="text"
                      placeholder="shopper@oksbi"
                      value={upiVpa}
                      onChange={(e) => setUpiVpa(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#DFD9CE] bg-[#FAF8F5] text-xs text-[#1F2421] placeholder:text-[#9E9A94] focus:outline-none focus:border-[#1F2421] transition font-mono font-medium"
                    />
                  </div>
                )}

                {error && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    {error}
                  </p>
                )}

                {/* Primary Continue Button (Black) */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1F2421] hover:bg-[#111318] text-white text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <span>Continue</span>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: 4-Digit OTP Simulation */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5 animate-fade-in">
                <div className="p-2.5 rounded-lg bg-[#F0ECE4] border border-[#DFD9CE] flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-[#6E736D]">Code sent to: </span>
                    <strong className="text-[#1F2421]">{identifier}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('input')}
                    className="text-[#1F2421] hover:underline font-bold"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#6E736D] uppercase tracking-wider block text-center">
                    Enter 4-Digit Passcode
                  </label>
                  <div className="flex justify-center space-x-2">
                    {[0, 1, 2, 3].map((idx) => (
                      <input
                        key={idx}
                        id={`otp-input-${idx}`}
                        type="text"
                        maxLength={1}
                        value={otp[idx]}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        className="w-11 h-12 rounded-lg border border-[#DFD9CE] bg-[#FAF8F5] text-center font-mono text-lg font-bold text-[#1F2421] focus:outline-none focus:border-[#1F2421] focus:ring-1 focus:ring-[#1F2421]/20 transition"
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-center text-[#8F8A7E]">
                    Test Mode: Enter any 4 digits (e.g. <strong>1 2 3 4</strong>) to authorize.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1F2421] hover:bg-[#111318] text-white text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <span>Verify &amp; Launch Studio</span>
                  )}
                </button>
              </form>
            )}

            {/* Divider (or) */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#DFD9CE]" />
              </div>
              <div className="relative flex justify-center text-[10.5px]">
                <span className="px-2 bg-white text-[#8F8A7E] font-medium">or</span>
              </div>
            </div>

            {/* Google Social Login Button (Matches Reference Button) */}
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('Shaaz Ahmed', 'shaaz@agentic.commerce', 'shopper@oksbi')}
              className="w-full py-2.5 px-3 rounded-xl border border-[#DFD9CE] hover:bg-[#FAF8F5] text-xs font-bold text-[#1F2421] transition flex items-center justify-center space-x-2.5 shadow-2xs cursor-pointer"
            >
              {/* Official Google G SVG Icon */}
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>



            {/* Legal Notice (Matches Reference Fine Print) */}
            <p className="text-[9.5px] text-[#8F8A7E] leading-tight text-center pt-0.5">
              By continuing you agree to our <a href="#" className="text-[#1F2421] font-semibold hover:underline">privacy policy</a> &amp; <a href="#" className="text-[#1F2421] font-semibold hover:underline">terms of use</a>.
              <br />
              *Protected by Razorpay AP2 &amp; NPCI UPI Autopay Sandbox.
            </p>

            {/* Bottom Helping Partner Card (Matches Reference Bottom Card) */}
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DFD9CE] text-[10.5px] space-y-0.5">
              <p className="text-[#57534E] font-medium leading-tight">
                Exploring Merchant Storefronts?
              </p>
              <a
                href="/merchants/aura-tech"
                target="_blank"
                className="text-[#1F2421] hover:underline font-bold flex items-center space-x-1"
              >
                <span>View Amazon, Flipkart &amp; Meesho Gateways</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
