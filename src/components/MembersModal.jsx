import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  X, 
  Users, 
  Sparkles, 
  Shield, 
  HeartHandshake, 
  Copy, 
  Check, 
  KeyRound,
  Mail,
  UserCheck
} from 'lucide-react';

export default function MembersModal({ isOpen, onClose }) {
  const { circle, member: currentMember } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !circle?.id) return;

    async function fetchMembers() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('circle_id', circle.id)
          .order('role', { ascending: true });

        if (!error && data) {
          setMembers(data);
        }
      } catch (err) {
        console.error('Error fetching circle members:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [isOpen, circle?.id]);

  if (!isOpen) return null;

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

  const getRoleBadge = (role) => {
    switch (role) {
      case 'elder':
        return {
          label: 'Elder (Center of Care)',
          badgeBg: 'bg-amber-100 text-amber-950 border-amber-300',
          icon: Sparkles,
          iconColor: 'text-amber-600',
        };
      case 'caretaker':
        return {
          label: 'Caretaker',
          badgeBg: 'bg-emerald-100 text-emerald-950 border-emerald-300',
          icon: Shield,
          iconColor: 'text-emerald-700',
        };
      case 'family':
        return {
          label: 'Family Member',
          badgeBg: 'bg-sky-100 text-sky-950 border-sky-300',
          icon: HeartHandshake,
          iconColor: 'text-sky-700',
        };
      default:
        return {
          label: role,
          badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: Users,
          iconColor: 'text-slate-600',
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-300 w-full max-w-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 sm:p-7 border-b-2 border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                Care Circle Members
              </h3>
              <p className="text-sm sm:text-base text-slate-600 font-medium">
                Everyone connected to {circle?.name || 'this Care Circle'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        {/* Passcode Share Card */}
        <div className="p-6 sm:p-7 bg-blue-50/70 border-b-2 border-blue-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5 mb-1">
                <KeyRound className="w-4 h-4" /> Circle Invite Passcode
              </span>
              <p className="text-sm text-slate-600 font-medium">
                Share this passcode with doctors, caretakers, or relatives so they can join this circle.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-white border-2 border-blue-300 px-4 py-2 rounded-2xl font-mono text-xl sm:text-2xl font-black text-blue-950 tracking-widest shadow-sm">
                {circle?.passcode || '------'}
              </div>
              <button
                type="button"
                onClick={handleCopyPasscode}
                className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl font-bold transition shadow-sm ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="p-6 sm:p-8 max-h-[50vh] overflow-y-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Active Members ({members.length})
          </span>

          {loading ? (
            <div className="py-8 text-center text-slate-500 font-medium">
              Loading members...
            </div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-medium">
              No members found.
            </div>
          ) : (
            members.map((m) => {
              const roleInfo = getRoleBadge(m.role);
              const RoleIcon = roleInfo.icon;
              const isCurrent = m.id === currentMember?.id;

              return (
                <div
                  key={m.id}
                  className={`p-4 sm:p-5 rounded-2xl border-2 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-blue-400 bg-blue-50/40 shadow-sm'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-slate-100 text-slate-700">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-900">
                          {m.display_name || 'Member'}
                        </span>
                        {isCurrent && (
                          <span className="text-xs font-bold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      {m.email && (
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{m.email}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-bold text-xs sm:text-sm self-start sm:self-auto ${roleInfo.badgeBg}`}>
                    <RoleIcon className={`w-4 h-4 ${roleInfo.iconColor}`} />
                    <span>{roleInfo.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition text-base"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

