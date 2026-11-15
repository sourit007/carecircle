import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import FamilyLogo from './FamilyLogo';
import MembersModal from './MembersModal';
import { 
  Copy, 
  Check, 
  LogOut, 
  Shield, 
  Users, 
  Sparkles, 
  KeyRound,
  Type
} from 'lucide-react';

export default function Header() {
  const { 
    circle, 
    member, 
    user, 
    isElder, 
    elderMode, 
    elderTextSize, 
    toggleElderTextSize, 
    signOut 
  } = useAuth();

  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  const handleCopyPasscode = async () => {
    if (!circle?.passcode) return;
    try {
      await navigator.clipboard.writeText(circle.passcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy passcode:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
      setSigningOut(false);
    }
  };

  const role = member?.role || 'elder';

  const roleConfig = {
    elder: {
      label: 'Elder',
      badgeBg: 'bg-amber-100 text-amber-950 border-amber-300',
      icon: Sparkles,
      iconColor: 'text-amber-600',
    },
    caretaker: {
      label: 'Caretaker',
      badgeBg: 'bg-emerald-100 text-emerald-950 border-emerald-300',
      icon: Shield,
      iconColor: 'text-emerald-700',
    },
    family: {
      label: 'Family Member',
      badgeBg: 'bg-sky-100 text-sky-950 border-sky-300',
      icon: Users,
      iconColor: 'text-sky-700',
    },
  };

  const currentRoleConfig = roleConfig[role] || roleConfig.elder;
  const RoleIcon = currentRoleConfig.icon;

  return (
    <header className="bg-white border-b-2 border-slate-200 shadow-sm sticky top-0 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Left: Platform Logo, Circle Name & Tagline */}
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-blue-600 rounded-2xl text-white shadow-md flex-shrink-0">
              <FamilyLogo className="w-8 h-8 sm:w-9 sm:h-9 text-white" heartColor="#EF4444" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  CircleCare
                </span>
                {circle?.timezone && (
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    ({circle.timezone})
                  </span>
                )}
              </div>
              <h1 className={`font-black text-slate-900 tracking-tight leading-tight ${elderMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
                {circle?.name || 'My Care Circle'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Their health, their choices, your whole family beside them.
              </p>
            </div>
          </div>

          {/* Right: Passcode shareable badge, Text Size Switch for Elder, Role badge & Sign out */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2 md:pt-0 border-t border-slate-100 md:border-t-0">
            
            {/* Passcode Box */}
            {circle?.passcode && (
              <div className="flex items-center bg-slate-50 border border-slate-300 rounded-2xl p-1 sm:p-1.5 shadow-sm">
                <div className="px-2 text-left">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-slate-500" /> Passcode
                  </span>
                  <span className="font-mono text-base sm:text-lg font-black text-blue-900 tracking-widest">
                    {circle.passcode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPasscode}
                  aria-label={`Copy passcode ${circle.passcode}`}
                  className={`flex items-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white hover:bg-blue-50 text-blue-700 border border-slate-300 hover:border-blue-400 shadow-sm'
                  }`}
                  title="Copy passcode to invite family or caretakers"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-blue-600" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Circle Members Button */}
            <button
              type="button"
              onClick={() => setIsMembersModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl font-bold text-xs sm:text-sm text-slate-700 transition shadow-sm"
              title="View all care circle members"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Members</span>
            </button>

            {/* Elder Display Size Switch (Only shown to Elder) */}
            {isElder && (
              <button
                type="button"
                onClick={toggleElderTextSize}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-blue-50 border border-slate-300 hover:border-blue-400 rounded-xl font-bold text-xs sm:text-sm text-slate-800 transition shadow-sm"
                title={`Current size: ${elderTextSize}. Click to switch.`}
              >
                <Type className="w-4 h-4 text-blue-600" />
                <span>Size: <strong className="text-blue-900">{elderTextSize === 'large' ? 'Large' : 'Standard'}</strong></span>
              </button>
            )}

            {/* Role Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs sm:text-sm shadow-sm ${currentRoleConfig.badgeBg}`}>
              <RoleIcon className={`w-4 h-4 ${currentRoleConfig.iconColor}`} />
              <span>{currentRoleConfig.label}</span>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border border-slate-300 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 hover:text-slate-900 transition shadow-sm text-xs sm:text-sm"
              aria-label="Sign out of account"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">{signingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Members Modal */}
      <MembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
      />
    </header>
  );
}
