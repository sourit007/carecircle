import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { getCircleDayRange, formatTimeInTz, formatDateInTz } from '../../lib/dateUtils';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import DoseCard from '../../components/DoseCard';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Pill, 
  Sparkles, 
  RefreshCw, 
  Calendar,
  Check,
  CalendarCheck,
  MapPin,
  User,
  Volume2,
  VolumeX
} from 'lucide-react';

export default function TodayTab() {
  const { circle, member, isElder, elderMode, user } = useAuth();
  const { showToast } = useToast();

  const [doses, setDoses] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Elder and caretaker can mark doses taken; family is read-only
  const canMarkDose = member?.role === 'elder' || member?.role === 'caretaker';

  const timezone = circle?.timezone || 'UTC';

  // Fetch today's dose logs and today's appointments for current circle
  const fetchDoses = useCallback(async (isSilent = false) => {
    if (!circle?.id) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const { startIso, endIso } = getCircleDayRange(timezone);

      // 1. Query dose_logs joined with medications
      const { data: doseData, error: doseErr } = await supabase
        .from('dose_logs')
        .select(`
          id,
          medication_id,
          circle_id,
          scheduled_at,
          status,
          taken_at,
          medications (
            name,
            dosage,
            notes
          )
        `)
        .eq('circle_id', circle.id)
        .gte('scheduled_at', startIso)
        .lte('scheduled_at', endIso)
        .order('scheduled_at', { ascending: true });

      if (doseErr) throw doseErr;
      setDoses(doseData || []);

      // 2. Query today's appointments
      const { data: aptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('circle_id', circle.id)
        .gte('starts_at', startIso)
        .lte('starts_at', endIso)
        .order('starts_at', { ascending: true });

      setTodayAppointments(aptData || []);
    } catch (err) {
      console.error('Error fetching today schedule:', err);
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [circle?.id, timezone]);

  // Initial fetch and Realtime subscription
  useEffect(() => {
    fetchDoses();

    if (!circle?.id) return;

    // Subscribe to realtime changes on dose_logs & appointments for this circle
    const channel = supabase
      .channel(`today_live_circle_${circle.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dose_logs',
          filter: `circle_id=eq.${circle.id}`,
        },
        () => {
          fetchDoses(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `circle_id=eq.${circle.id}`,
        },
        () => {
          fetchDoses(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [fetchDoses, circle?.id]);

  // Mark dose taken RPC handler
  const handleMarkTaken = async (doseId, medName) => {
    if (!doseId) return;
    setActionLoadingId(doseId);
    setError(null);

    try {
      const { error: rpcErr } = await supabase.rpc('mark_dose_taken', {
        p_dose: doseId,
      });

      if (rpcErr) throw rpcErr;

      showToast(`Great job! Marked ${medName || 'medication'} as taken.`, 'success');
      // Refetch immediately to synchronize
      await fetchDoses(true);
    } catch (err) {
      console.error('Error marking dose taken:', err);
      setError(err);
      showToast(err.message || 'Failed to mark dose taken', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Find next upcoming dose (first pending dose)
  const nextDose = useMemo(() => {
    return doses.find((d) => d.status === 'pending');
  }, [doses]);

  // Speech synthesis for elderly accessibility
  const handleReadAloud = () => {
    if (!('speechSynthesis' in window)) {
      showToast('Speech audio is not supported in this browser.', 'info');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    let speechText = `Hello ${member?.display_name || ''}! Today you have ${doses.length} scheduled doses. `;

    if (todayAppointments.length > 0) {
      const firstApt = todayAppointments[0];
      speechText += `You also have an appointment today at ${formatTimeInTz(firstApt.starts_at, timezone)}: ${firstApt.title}. `;
    }

    if (nextDose) {
      speechText += `Your next upcoming medicine is ${nextDose.medications?.name || 'prescribed dose'}, ${nextDose.medications?.dosage || ''}, scheduled for ${formatTimeInTz(nextDose.scheduled_at, timezone)}. `;
    } else if (doses.length > 0) {
      speechText += `All scheduled doses for today have been completed. Wonderful job! `;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 0.88; // Slightly measured, clear pace for elderly listeners
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Stats calculation
  const totalCount = doses.length;
  const takenCount = doses.filter((d) => d.status === 'taken').length;
  const pendingCount = doses.filter((d) => d.status === 'pending').length;
  const missedCount = doses.filter((d) => d.status === 'missed').length;

  if (loading) {
    return <LoadingSpinner message="Loading today's medication schedule..." />;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      
      {/* Top Banner with Today's Date, Audio Read-Aloud & Sync */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-200 text-sm sm:text-base font-bold mb-1">
              <Calendar className="w-4 h-4 text-blue-300" />
              <span>{formatDateInTz(new Date().toISOString(), timezone)}</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {timezone}
              </span>
            </div>
            <h2 className={`font-black tracking-tight ${elderMode ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-2xl sm:text-3xl'}`}>
              Today's Schedule
            </h2>
            <p className="mt-2 text-blue-100 text-sm sm:text-base font-medium max-w-2xl">
              {canMarkDose
                ? 'Check off doses as they are taken. Live synchronization is active across all care circle devices.'
                : 'Family View • Real-time overview of daily medication doses.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Read Aloud Accessible Button */}
            <button
              type="button"
              onClick={handleReadAloud}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold border transition shadow-sm text-sm sm:text-base ${
                isSpeaking
                  ? 'bg-amber-400 text-amber-950 border-amber-300 animate-pulse'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title="Click to have your schedule read aloud"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span>Stop Audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-amber-300" />
                  <span>Read Aloud</span>
                </>
              )}
            </button>

            {/* Sync Live Button */}
            <button
              type="button"
              onClick={() => fetchDoses(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-2xl font-bold backdrop-blur-sm border border-white/20 transition shadow-sm text-sm sm:text-base"
              title="Refresh schedule"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {/* Daily progress indicators */}
        {totalCount > 0 && (
          <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
              <span className="text-xs uppercase font-bold text-blue-200 block">Total Scheduled</span>
              <span className="text-2xl sm:text-3xl font-black">{totalCount}</span>
            </div>
            <div className="bg-emerald-500/20 rounded-2xl p-3 sm:p-4 backdrop-blur-sm border border-emerald-400/30">
              <span className="text-xs uppercase font-bold text-emerald-200 block">Taken</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-300">{takenCount}</span>
            </div>
            <div className="bg-amber-500/20 rounded-2xl p-3 sm:p-4 backdrop-blur-sm border border-amber-400/30">
              <span className="text-xs uppercase font-bold text-amber-200 block">Pending</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-300">{pendingCount}</span>
            </div>
            <div className="bg-rose-500/20 rounded-2xl p-3 sm:p-4 backdrop-blur-sm border border-rose-400/30">
              <span className="text-xs uppercase font-bold text-rose-200 block">Missed</span>
              <span className="text-2xl sm:text-3xl font-black text-rose-300">{missedCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Error notification */}
      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {/* Today's Medical Appointments Banner (If any scheduled for today) */}
      {todayAppointments.length > 0 && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md flex-shrink-0">
              <CalendarCheck className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="flex-1">
              <span className="inline-block text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/60 px-2.5 py-0.5 rounded-full mb-1">
                Medical Appointment Today
              </span>
              <div className="space-y-3 mt-1">
                {todayAppointments.map((apt) => (
                  <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-emerald-200/60 pt-2 first:border-0 first:pt-0">
                    <div>
                      <h4 className="text-lg sm:text-xl font-black text-slate-900">
                        {apt.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-700 font-bold mt-0.5">
                        <span className="text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                          {formatTimeInTz(apt.starts_at, timezone)}
                        </span>
                        {apt.doctor && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            {apt.doctor}
                          </span>
                        )}
                        {apt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            {apt.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Highlighted Next Upcoming Dose Banner */}
      {nextDose && (
        <div className="bg-amber-50 border-3 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-md flex-shrink-0">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-200 text-amber-950 rounded-full font-black text-xs uppercase tracking-wider mb-2">
                  <Sparkles className="w-4 h-4 text-amber-800" />
                  <span>Next Upcoming Dose</span>
                </div>
                <h3 className={`font-black text-slate-900 ${elderMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
                  {nextDose.medications?.name || 'Scheduled Medicine'}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-slate-700 font-bold text-sm sm:text-base">
                  <span className="text-blue-900 bg-blue-100 px-3 py-1 rounded-xl">
                    Scheduled: {formatTimeInTz(nextDose.scheduled_at, timezone)}
                  </span>
                  {nextDose.medications?.dosage && (
                    <span className="text-slate-800">
                      Dosage: {nextDose.medications.dosage}
                    </span>
                  )}
                </div>
                {nextDose.medications?.notes && (
                  <p className="mt-2 text-slate-600 text-sm font-medium">
                    Note: {nextDose.medications.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Action button if Elder or Caretaker */}
            {canMarkDose ? (
              <button
                type="button"
                onClick={() => handleMarkTaken(nextDose.id, nextDose.medications?.name)}
                disabled={actionLoadingId === nextDose.id}
                className={`flex items-center justify-center gap-3 px-8 py-4 sm:py-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-300 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 transition ${
                  elderMode ? 'text-xl sm:text-2xl min-h-[68px]' : 'text-base sm:text-lg min-h-[52px]'
                }`}
              >
                <Check className="w-6 h-6 sm:w-7 sm:h-7" />
                <span>
                  {actionLoadingId === nextDose.id ? 'Marking Taken...' : 'I took it'}
                </span>
              </button>
            ) : (
              <div className="px-4 py-3 bg-white/80 border border-slate-300 rounded-2xl text-slate-700 font-bold text-xs sm:text-sm">
                Awaiting Elder or Caretaker confirmation
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Doses List */}
      {doses.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 sm:p-14 text-center shadow-md">
          <div className="max-w-md mx-auto">
            <div className="inline-flex p-5 bg-blue-50 text-blue-600 rounded-3xl mb-5">
              <Pill className="w-14 h-14" />
            </div>
            <h3 className={`font-black text-slate-900 ${elderMode ? 'text-3xl' : 'text-2xl'}`}>
              No doses scheduled today
            </h3>
            <p className="mt-3 text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
              There are no medication doses scheduled for today in the {timezone} timezone.
            </p>
            <p className="mt-2 text-slate-500 text-xs sm:text-sm">
              You can view and manage prescriptions in the <span className="font-bold text-slate-800">Medications</span> tab.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 px-1">
            All Doses for Today ({doses.length})
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {doses.map((dose) => (
              <DoseCard
                key={dose.id}
                dose={dose}
                role={member?.role}
                timezone={timezone}
                elderMode={elderMode}
                onMarkSuccess={() => {
                  showToast(
                    `Great job! Marked ${dose.medications?.name || 'medication'} as taken.`,
                    'success'
                  );
                  fetchDoses(true);
                }}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
