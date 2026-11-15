import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatTimeInTz } from '../lib/dateUtils';
import { getDoseStatusConfig } from '../lib/formatters';
import { Pill, Check, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function DoseCard({
  dose,
  role,
  timezone: propTimezone,
  elderMode: propElderMode,
  onMarkSuccess,
}) {
  let auth = {};
  try {
    auth = useAuth();
  } catch {
    auth = {};
  }
  const currentRole = role || auth.member?.role;
  const timezone = propTimezone || auth.circle?.timezone || 'UTC';
  const elderMode = propElderMode !== undefined ? propElderMode : !!auth.elderMode;

  const [loading, setLoading] = useState(false);

  if (!dose) return null;

  const med = dose.medications || {};
  const isTaken = dose.status === 'taken';
  const isMissed = dose.status === 'missed';
  const isPending = dose.status === 'pending';

  // Elder and caretaker can mark dose taken; family cannot
  const canMarkDose = currentRole === 'elder' || currentRole === 'caretaker';

  const statusConfig = getDoseStatusConfig(dose.status);

  const handleMarkTaken = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('mark_dose_taken', {
        p_dose: dose.id,
      });
      if (error) throw error;
      if (onMarkSuccess) {
        onMarkSuccess(dose.id);
      }
    } catch (err) {
      console.error('Error marking dose taken:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid={`dose-card-${dose.id}`}
      className={`bg-white rounded-3xl border-2 p-5 sm:p-7 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${statusConfig.cardBg}`}
    >
      {/* Left: Time, Medicine Name, Dosage, Notes */}
      <div className="flex items-start gap-4">
        <div
          className={`p-3.5 sm:p-4 rounded-2xl flex-shrink-0 ${statusConfig.iconBg}`}
        >
          <Pill className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-base sm:text-lg font-mono font-black text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-xl border border-blue-200">
              {formatTimeInTz(dose.scheduled_at, timezone)}
            </span>

            {/* Status Badge */}
            <span
              data-testid="status-badge"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-xs sm:text-sm border ${statusConfig.badgeBg}`}
            >
              {isTaken && <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
              {isMissed && <AlertCircle className="w-4 h-4 text-rose-700" />}
              {isPending && <Clock className="w-4 h-4 text-amber-700" />}
              <span>{statusConfig.badgeText}</span>
              {isTaken && dose.taken_at && (
                <span className="font-normal text-xs text-emerald-900 hidden sm:inline">
                  ({formatTimeInTz(dose.taken_at, timezone)})
                </span>
              )}
            </span>
          </div>

          <h4
            className={`font-black text-slate-900 ${
              elderMode ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'
            }`}
          >
            {med.name || 'Prescription Medicine'}
          </h4>

          <p className="mt-1 text-slate-700 font-bold text-sm sm:text-base">
            Dosage: <span className="text-slate-900">{med.dosage || 'As directed'}</span>
          </p>

          {med.notes && (
            <p className="mt-1 text-slate-600 font-medium text-xs sm:text-sm">
              Instructions: {med.notes}
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div>
        {!isTaken && canMarkDose && (
          <button
            type="button"
            onClick={handleMarkTaken}
            disabled={loading}
            className={`w-full md:w-auto flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-white transition shadow-lg ${
              isMissed
                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-200'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-200'
            } disabled:opacity-50 ${
              elderMode ? 'text-xl sm:text-2xl min-h-[64px]' : 'text-base sm:text-lg min-h-[48px]'
            }`}
            aria-label={`I took it - Mark ${med.name || 'medication'} as taken`}
          >
            <Check className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>{loading ? 'Recording...' : 'I took it'}</span>
          </button>
        )}

        {isTaken && (
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm sm:text-base bg-emerald-100/70 px-4 py-2.5 rounded-xl border border-emerald-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Completed</span>
          </div>
        )}

        {!isTaken && !canMarkDose && (
          <div
            data-testid="family-readonly-indicator"
            className="text-slate-500 font-semibold text-xs sm:text-sm bg-slate-100 px-4 py-2 rounded-xl border border-slate-200"
          >
            Family View (Read Only)
          </div>
        )}
      </div>
    </div>
  );
}
