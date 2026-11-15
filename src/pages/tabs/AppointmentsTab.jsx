import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import AppointmentModal from '../../components/AppointmentModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { formatDateTimeInTz } from '../../lib/dateUtils';
import { 
  CalendarCheck, 
  Plus, 
  MapPin, 
  User, 
  Clock, 
  FileText, 
  Edit3, 
  Trash2, 
  Calendar,
  ExternalLink
} from 'lucide-react';

export default function AppointmentsTab() {
  const { circle, isElder, elderMode } = useAuth();
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Deleting state
  const [deletingId, setDeletingId] = useState(null);

  const timezone = circle?.timezone || 'UTC';

  const fetchAppointments = useCallback(async () => {
    if (!circle?.id) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: aptErr } = await supabase
        .from('appointments')
        .select('*')
        .eq('circle_id', circle.id)
        .order('starts_at', { ascending: true });

      if (aptErr) throw aptErr;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [circle?.id]);

  useEffect(() => {
    fetchAppointments();

    if (!circle?.id) return;

    // Subscribe to realtime updates for appointments in this circle
    const channel = supabase
      .channel(`appointments_live_${circle.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `circle_id=eq.${circle.id}`,
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circle?.id, fetchAppointments]);

  const getGoogleCalendarUrl = (apt) => {
    if (!apt.starts_at) return '#';
    try {
      const startDate = new Date(apt.starts_at);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      const startIso = startDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const endIso = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const dates = `${startIso}/${endIso}`;
      const title = encodeURIComponent(apt.title || 'Medical Appointment');
      const details = encodeURIComponent(
        [
          apt.doctor ? `Doctor: ${apt.doctor}` : '',
          apt.notes ? `Notes: ${apt.notes}` : '',
          'Scheduled via CircleCare',
        ]
          .filter(Boolean)
          .join('\n')
      );
      const location = encodeURIComponent(apt.location || '');
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    } catch {
      return '#';
    }
  };

  const handleOpenAdd = () => {
    setSelectedAppointment(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (apt) => {
    setSelectedAppointment(apt);
    setIsModalOpen(true);
  };

  const handleDelete = async (apt) => {
    if (!window.confirm(`Are you sure you want to delete the appointment "${apt.title}"?`)) {
      return;
    }

    setDeletingId(apt.id);
    setError(null);

    try {
      const { error: delErr } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', apt.id);

      const { error: actualDelErr } = await supabase
        .from('appointments')
        .delete()
        .eq('id', apt.id);

      if (actualDelErr) throw actualDelErr;

      showToast(`Deleted appointment "${apt.title}".`, 'success');
      await fetchAppointments();
    } catch (err) {
      console.error('Error deleting appointment:', err);
      setError(err);
      showToast(err.message || 'Failed to delete appointment', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Separate into upcoming vs past
  const now = new Date();
  const upcomingAppointments = appointments.filter(
    (apt) => new Date(apt.starts_at) >= now
  );
  const pastAppointments = appointments.filter(
    (apt) => new Date(apt.starts_at) < now
  );

  if (loading) {
    return <LoadingSpinner message="Loading doctor & clinic visits..." />;
  }

  return (
    <div className="space-y-8">
      
      {/* Header bar */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              Medical Calendar
            </span>
            <span className="text-sm font-bold text-slate-500">
              ({upcomingAppointments.length} Upcoming)
            </span>
          </div>
          <h2 className={`font-black text-slate-900 tracking-tight ${elderMode ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'}`}>
            Medical Appointments
          </h2>
          <p className="mt-1 text-slate-600 text-sm sm:text-base font-medium">
            Doctor visits, dental checkups, lab work, and therapy sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className={`flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl shadow-md shadow-emerald-200 transition ${
            elderMode ? 'text-xl min-h-[60px]' : 'text-sm sm:text-base min-h-[44px]'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span>Add Appointment</span>
        </button>
      </div>

      {/* Error notification */}
      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {/* Upcoming Appointments List */}
      <div>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 px-1 mb-4 flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-emerald-600" />
          <span>Upcoming Appointments ({upcomingAppointments.length})</span>
        </h3>

        {upcomingAppointments.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 sm:p-12 text-center shadow-md">
            <div className="max-w-md mx-auto">
              <div className="inline-flex p-5 bg-emerald-50 text-emerald-600 rounded-3xl mb-4">
                <Calendar className="w-12 h-12" />
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-slate-900">
                No Upcoming Appointments
              </h4>
              <p className="mt-2 text-slate-600 text-base font-medium">
                Keep your care team organized by adding your next scheduled doctor visit.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Schedule First Appointment</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingAppointments.map((apt) => {
              const isDeleting = deletingId === apt.id;
              return (
                <div
                  key={apt.id}
                  className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-7 shadow-sm hover:border-emerald-400 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {/* Date/Time badge */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl font-bold text-sm sm:text-base mb-3">
                      <Clock className="w-4 h-4 text-emerald-700" />
                      <span>{formatDateTimeInTz(apt.starts_at, timezone)}</span>
                    </div>

                    <h4 className={`font-black text-slate-900 ${elderMode ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'}`}>
                      {apt.title}
                    </h4>

                    {/* Doctor info */}
                    {apt.doctor && (
                      <p className="mt-2 text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                        <User className="w-5 h-5 text-slate-500 flex-shrink-0" />
                        <span>{apt.doctor}</span>
                      </p>
                    )}

                    {/* Location info */}
                    {apt.location && (
                      <p className="mt-1.5 text-base font-medium text-slate-600 flex items-start gap-2">
                        <MapPin className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                        <span>{apt.location}</span>
                      </p>
                    )}

                    {/* Quick Action Links: Directions & Google Calendar */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {apt.location && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(apt.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm font-bold border border-rose-200 transition"
                        >
                          <MapPin className="w-3.5 h-3.5 text-rose-600" />
                          <span>Get Directions</span>
                          <ExternalLink className="w-3 h-3 text-rose-500" />
                        </a>
                      )}

                      <a
                        href={getGoogleCalendarUrl(apt)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-800 rounded-xl text-xs sm:text-sm font-bold border border-blue-200 transition"
                      >
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>Add to Google Calendar</span>
                        <ExternalLink className="w-3 h-3 text-blue-500" />
                      </a>
                    </div>

                    {/* Notes info */}
                    {apt.notes && (
                      <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 text-sm sm:text-base font-medium">
                        <span className="font-bold text-slate-900 block mb-0.5">Notes:</span>
                        {apt.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-5 mt-4 border-t border-slate-100 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(apt)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-slate-300 hover:border-emerald-400 bg-white hover:bg-emerald-50 text-slate-800 font-bold transition text-base"
                    >
                      <Edit3 className="w-5 h-5 text-emerald-600" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(apt)}
                      disabled={isDeleting}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-rose-300 hover:border-rose-400 bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold transition text-base disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5 text-rose-600" />
                      <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Appointments Section (Collapsible / Secondary) */}
      {pastAppointments.length > 0 && (
        <div className="pt-8 border-t-2 border-slate-200">
          <h3 className="text-lg sm:text-xl font-bold text-slate-600 px-1 mb-4">
            Past Appointments ({pastAppointments.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75">
            {pastAppointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-slate-50 rounded-2xl border border-slate-300 p-5 shadow-sm"
              >
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">
                  {formatDateTimeInTz(apt.starts_at, timezone)}
                </div>
                <h4 className="text-lg font-bold text-slate-800">{apt.title}</h4>
                {apt.doctor && <p className="text-sm text-slate-600">{apt.doctor}</p>}
                {apt.location && <p className="text-xs text-slate-500 mt-1">{apt.location}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAppointments}
        initialData={selectedAppointment}
      />

    </div>
  );
}
