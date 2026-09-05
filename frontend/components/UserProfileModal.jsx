'use client';
import { useState, useEffect } from 'react';
import { User, ShieldCheck, X, Check, Loader2, Save, Mail, Smartphone, CreditCard, LogOut } from 'lucide-react';
import { fetchCurrentUserProfile, updateCurrentUserProfile, logoutCurrentUser } from '@/lib/api';

export default function UserProfileModal({ isOpen, onClose, onProfileUpdated, onOpenAuth }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [profile, setProfile] = useState({
    name: "Autonomous Shopper",
    email: "shopper@agentic.commerce",
    upi_vpa: "shopper@oksbi",
    phone: "+91 98765 43210"
  });

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await fetchCurrentUserProfile();
      if (data.user) {
        setProfile(prev => ({ ...prev, ...data.user }));
      }
    } catch (e) {
      console.warn("Profile fetch:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const data = await updateCurrentUserProfile(profile);
      if (data.profile) {
        setProfile(data.profile);
        setSaveSuccess(true);
        if (onProfileUpdated) onProfileUpdated(data.profile);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 800);
      }
    } catch (e) {
      console.error("Save profile error:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logoutCurrentUser();
    onClose();
    if (onOpenAuth) {
      onOpenAuth();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const getInitials = (name) => {
    if (!name) return 'AS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in text-[#1C1917] dark:text-[#F8FAFC]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl bg-[#FDFBF7] dark:bg-[#111318] border border-[#EBE6DA] dark:border-white/10 p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EBE6DA] dark:border-white/10">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
              {getInitials(profile.name)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold text-[#1C1917] dark:text-[#F8FAFC]">{profile.name || 'User Profile'}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EBE6DA] dark:bg-white/10 text-[#1C1917] dark:text-white border border-[#D6CEBE] dark:border-white/20 font-medium">
                  Verified Identity
                </span>
              </div>
              <p className="text-[11px] text-[#78716C] dark:text-[#94A3B8] mt-0.5">{profile.email || 'shopper@agentic.commerce'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#FAF8F3] dark:bg-[#171A21] hover:bg-[#F4F0E8] dark:hover:bg-white/10 text-[#78716C] dark:text-[#94A3B8] hover:text-[#1C1917] dark:hover:text-white transition border border-[#EBE6DA] dark:border-white/10 shadow-2xs cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Profile Information Form */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          <div className="p-4 rounded-xl bg-[#FAF8F3] dark:bg-[#171A21] border border-[#EBE6DA] dark:border-white/10 shadow-2xs space-y-3.5">
            <div className="flex items-center space-x-2 pb-2 border-b border-[#EBE6DA] dark:border-white/10">
              <User className="w-4 h-4 text-[#1C1917] dark:text-white" />
              <h4 className="text-xs font-bold text-[#1C1917] dark:text-[#F8FAFC] uppercase tracking-wider">
                Account &amp; Settlement Identity
              </h4>
            </div>

            <div className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="text-xs font-semibold text-[#44403C] dark:text-[#94A3B8] block mb-1.5">
                  Full Name:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={profile.name || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Shaaz / Autonomous Shopper"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FDFBF7] dark:bg-[#111318] border border-[#D6CEBE] dark:border-white/10 text-xs font-medium text-[#1C1917] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-500"
                  />
                  <User className="w-4 h-4 text-[#A8A29E] dark:text-[#64748B] absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-semibold text-[#44403C] dark:text-[#94A3B8] block mb-1.5">
                  Email Address:
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. shopper@agentic.commerce"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FDFBF7] dark:bg-[#111318] border border-[#D6CEBE] dark:border-white/10 text-xs font-medium text-[#1C1917] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-500"
                  />
                  <Mail className="w-4 h-4 text-[#A8A29E] dark:text-[#64748B] absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Default UPI ID */}
              <div>
                <label className="text-xs font-semibold text-[#44403C] dark:text-[#94A3B8] block mb-1.5">
                  Default UPI Handle (VPA):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={profile.upi_vpa || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, upi_vpa: e.target.value }))}
                    placeholder="e.g. shopper@oksbi"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FDFBF7] dark:bg-[#111318] border border-[#D6CEBE] dark:border-white/10 text-xs font-mono font-medium text-[#1C1917] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-500"
                  />
                  <CreditCard className="w-4 h-4 text-[#A8A29E] dark:text-[#64748B] absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Contact Phone */}
              <div>
                <label className="text-xs font-semibold text-[#44403C] dark:text-[#94A3B8] block mb-1.5">
                  Contact Phone:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FDFBF7] dark:bg-[#111318] border border-[#D6CEBE] dark:border-white/10 text-xs font-medium text-[#1C1917] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-500"
                  />
                  <Smartphone className="w-4 h-4 text-[#A8A29E] dark:text-[#64748B] absolute left-3 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF8F3] dark:bg-[#171A21] border border-[#EBE6DA] dark:border-white/10 flex items-center space-x-3 text-xs">
            <ShieldCheck className="w-4 h-4 text-[#1C1917] dark:text-white flex-shrink-0" />
            <span className="text-[#78716C] dark:text-[#94A3B8] text-[11px]">
              Profile changes are cryptographically synchronized across Razorpay checkout sessions and AP2 mandates.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#EBE6DA] dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-semibold text-xs border border-red-200 dark:border-red-800/40 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#171A21] hover:bg-[#F4F0E8] dark:hover:bg-white/10 text-[#78716C] dark:text-[#94A3B8] font-semibold text-xs border border-[#EBE6DA] dark:border-white/10 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition shadow-2xs cursor-pointer ${saveSuccess
                ? 'bg-[#27272A] dark:bg-white text-white dark:text-black'
                : 'bg-[#1C1917] hover:bg-[#292524] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black'
              }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Profile Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
