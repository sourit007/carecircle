import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { formatDate } from '../../lib/formatters';
import { 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Calendar,
  Award,
  AlertCircle
} from 'lucide-react';

export default function AdherenceTab() {
  const { circle, isElder, elderMode } = useAuth();

  const [daysRange, setDaysRange] = useState(7);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdherence = useCallback(async () => {
    if (!circle?.id) return;
    setLoading(true);
    setError(null);

    try {
      const { data: summaryData, error: summaryErr } = await supabase.rpc(
        'adherence_summary',
        {
          p_circle: circle.id,
          p_days: daysRange,
        }
      );

      if (summaryErr) throw summaryErr;
      setData(summaryData || []);
    } catch (err) {
      console.error('Error fetching adherence summary:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [circle?.id, daysRange]);

  useEffect(() => {
    fetchAdherence();
  }, [fetchAdherence]);

  // Aggregate statistics
  const totalTaken = data.reduce((acc, row) => acc + (Number(row.taken) || 0), 0);
  const totalMissed = data.reduce((acc, row) => acc + (Number(row.missed) || 0), 0);
  const totalPending = data.reduce((acc, row) => acc + (Number(row.pending) || 0), 0);
  const totalScheduled = totalTaken + totalMissed + totalPending;

  // Rate based on evaluated doses (taken + missed)
  const evaluatedDoses = totalTaken + totalMissed;
  const adherenceRate = evaluatedDoses > 0 ? Math.round((totalTaken / evaluatedDoses) * 100) : 100;

  let adherenceGrade = {
    label: 'Perfect Consistency',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
    description: 'Outstanding adherence. Doses are being taken reliably on schedule.',
  };

  if (adherenceRate < 70) {
    adherenceGrade = {
      label: 'Attention Needed',
      color: 'text-rose-700 bg-rose-50 border-rose-300',
      description: 'Multiple missed doses detected. Care team review recommended.',
    };
  } else if (adherenceRate < 90) {
    adherenceGrade = {
      label: 'Good Consistency',
      color: 'text-amber-700 bg-amber-50 border-amber-300',
      description: 'Steady routine with a few missed doses.',
    };
  }

  return (
    <div className="space-y-8">
      
      {/* Header bar with Days Range Picker */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 mb-1 inline-block">
            Adherence Analytics
          </span>
          <h2 className={`font-black text-slate-900 tracking-tight ${elderMode ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'}`}>
            Dose Consistency & Trends
          </h2>
          <p className="mt-1 text-slate-600 text-sm sm:text-base font-medium">
            Summary of medication compliance reported directly from the Care Circle.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDaysRange(d)}
              className={`px-4 sm:px-5 py-2.5 rounded-xl font-black text-sm sm:text-base transition ${
                daysRange === d
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Error notification */}
      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {loading ? (
        <LoadingSpinner message="Calculating adherence statistics..." />
      ) : (
        <>
          {/* Key Metric Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Score Card */}
            <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Adherence Rate
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`font-black tracking-tight ${elderMode ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'} ${
                  adherenceRate >= 90 ? 'text-emerald-600' : adherenceRate >= 70 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {evaluatedDoses > 0 ? `${adherenceRate}%` : '100%'}
                </span>
                <span className="text-sm font-bold text-slate-500">
                  ({evaluatedDoses} evaluated)
                </span>
              </div>
              <div className="mt-3">
                <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${adherenceGrade.color}`}>
                  {adherenceGrade.label}
                </span>
              </div>
            </div>

            {/* Taken Card */}
            <div className="bg-emerald-50/60 p-6 rounded-3xl border-2 border-emerald-300 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Doses Taken
              </span>
              <div className="mt-2">
                <span className={`font-black text-emerald-950 ${elderMode ? 'text-4xl sm:text-5xl' : 'text-3xl'}`}>
                  {totalTaken}
                </span>
              </div>
              <p className="mt-2 text-xs font-bold text-emerald-800">
                Confirmed by Elder / Caretaker
              </p>
            </div>

            {/* Missed Card */}
            <div className="bg-rose-50/60 p-6 rounded-3xl border-2 border-rose-300 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" /> Missed Doses
              </span>
              <div className="mt-2">
                <span className={`font-black text-rose-950 ${elderMode ? 'text-4xl sm:text-5xl' : 'text-3xl'}`}>
                  {totalMissed}
                </span>
              </div>
              <p className="mt-2 text-xs font-bold text-rose-800">
                Scheduled but not logged
              </p>
            </div>

            {/* Pending Card */}
            <div className="bg-amber-50/60 p-6 rounded-3xl border-2 border-amber-300 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" /> Pending Doses
              </span>
              <div className="mt-2">
                <span className={`font-black text-amber-950 ${elderMode ? 'text-4xl sm:text-5xl' : 'text-3xl'}`}>
                  {totalPending}
                </span>
              </div>
              <p className="mt-2 text-xs font-bold text-amber-800">
                Awaiting time or confirmation
              </p>
            </div>

          </div>

          {/* Daily Breakdown List / Chart */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Daily Breakdown ({data.length} Days)
                </h3>
                <p className="text-sm sm:text-base text-slate-600 font-medium">
                  Compliance details day by day
                </p>
              </div>

              {/* Legend */}
              <div className="hidden sm:flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Taken
                </span>
                <span className="flex items-center gap-1.5 text-rose-800">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> Missed
                </span>
                <span className="flex items-center gap-1.5 text-amber-800">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Pending
                </span>
              </div>
            </div>

            {data.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-medium text-lg">
                No adherence log data available for this date range yet.
              </div>
            ) : (
              <div className="space-y-4">
                {data.map((row, idx) => {
                  const dayTaken = Number(row.taken) || 0;
                  const dayMissed = Number(row.missed) || 0;
                  const dayPending = Number(row.pending) || 0;
                  const dayTotal = dayTaken + dayMissed + dayPending;

                  const takenPct = dayTotal > 0 ? (dayTaken / dayTotal) * 100 : 0;
                  const missedPct = dayTotal > 0 ? (dayMissed / dayTotal) * 100 : 0;
                  const pendingPct = dayTotal > 0 ? (dayPending / dayTotal) * 100 : 0;

                  return (
                    <div
                      key={row.day || idx}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="min-w-[150px]">
                        <span className="text-base sm:text-lg font-black text-slate-900 block">
                          {formatDate(row.day)}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {row.day}
                        </span>
                      </div>

                      {/* Visual segment bar */}
                      <div className="flex-1">
                        <div className="h-6 w-full bg-slate-200 rounded-xl overflow-hidden flex shadow-inner">
                          {takenPct > 0 && (
                            <div
                              style={{ width: `${takenPct}%` }}
                              className="bg-emerald-500 h-full transition-all"
                              title={`${dayTaken} taken`}
                            />
                          )}
                          {missedPct > 0 && (
                            <div
                              style={{ width: `${missedPct}%` }}
                              className="bg-rose-500 h-full transition-all"
                              title={`${dayMissed} missed`}
                            />
                          )}
                          {pendingPct > 0 && (
                            <div
                              style={{ width: `${pendingPct}%` }}
                              className="bg-amber-400 h-full transition-all"
                              title={`${dayPending} pending`}
                            />
                          )}
                        </div>
                      </div>

                      {/* Numbers pill */}
                      <div className="flex items-center gap-3 text-sm font-bold min-w-[200px] justify-end">
                        <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                          {dayTaken} Taken
                        </span>
                        {dayMissed > 0 && (
                          <span className="text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg">
                            {dayMissed} Missed
                          </span>
                        )}
                        {dayPending > 0 && (
                          <span className="text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                            {dayPending} Pending
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}
