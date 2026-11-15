import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import ErrorMessage from './ErrorMessage';
import { 
  X, 
  CalendarCheck, 
  User, 
  MapPin, 
  Clock, 
  FileText 
} from 'lucide-react';

export default function AppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
}) {
  const { circle } = useAuth();
  const isEditing = !!initialData?.id;

  const [title, setTitle] = useState(initialData?.title || '');
  const [doctor, setDoctor] = useState(initialData?.doctor || '');
  const [location, setLocation] = useState(initialData?.location || '');
  
  // Format initial starts_at for datetime-local input
  const getInitialDateTime = () => {
    if (initialData?.starts_at) {
      const d = new Date(initialData.starts_at);
      if (!isNaN(d.getTime())) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
    // Default to tomorrow 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
  };

  const [startsAt, setStartsAt] = useState(getInitialDateTime());
  const [notes, setNotes] = useState(initialData?.notes || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a title for the appointment.');
      return;
    }
    if (!startsAt) {
      setError('Please select date and time for the appointment.');
      return;
    }

    setLoading(true);

    try {
      const isoStartsAt = new Date(startsAt).toISOString();
      const payload = {
        title: title.trim(),
        doctor: doctor.trim() || null,
        location: location.trim() || null,
        starts_at: isoStartsAt,
        notes: notes.trim() || null,
      };

      if (isEditing) {
        const { error: updateErr } = await supabase
          .from('appointments')
          .update(payload)
          .eq('id', initialData.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('appointments')
          .insert({
            circle_id: circle.id,
            ...payload,
          });

        if (insertErr) throw insertErr;
      }

      onSuccess(isEditing ? 'Appointment updated.' : 'Appointment scheduled.');
      onClose();
    } catch (err) {
      console.error('Error saving appointment:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-300 w-full max-w-xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 sm:p-7 border-b-2 border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md">
              <CalendarCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                {isEditing ? 'Edit Appointment' : 'Schedule Appointment'}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 font-medium">
                Keep the care circle coordinated for clinic and doctor visits
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

        {/* Error notification */}
        <div className="px-6 sm:px-8 mt-4">
          <ErrorMessage error={error} onDismiss={() => setError(null)} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          
          {/* Title */}
          <div>
            <label htmlFor="apt-title" className="block text-lg font-bold text-slate-900 mb-2">
              Appointment Title *
            </label>
            <input
              id="apt-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cardiology Checkup, Dental Cleaning, Eye Exam"
              className="w-full px-5 py-3.5 text-lg font-medium rounded-2xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition"
            />
          </div>

          {/* Date & Time */}
          <div>
            <label htmlFor="apt-datetime" className="block text-lg font-bold text-slate-900 mb-2">
              Date & Time *
            </label>
            <div className="relative">
              <input
                id="apt-datetime"
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-5 py-3.5 text-lg font-bold rounded-2xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition"
              />
            </div>
          </div>

          {/* Doctor */}
          <div>
            <label htmlFor="apt-doctor" className="block text-lg font-bold text-slate-900 mb-2">
              Doctor or Specialist
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                id="apt-doctor"
                type="text"
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                placeholder="e.g. Dr. Linda Martinez, Neurologist"
                className="w-full pl-12 pr-4 py-3.5 text-base font-medium rounded-2xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="apt-location" className="block text-lg font-bold text-slate-900 mb-2">
              Location or Clinic Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-5 h-5" />
              </div>
              <input
                id="apt-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. St. Jude Hospital, Suite 410"
                className="w-full pl-12 pr-4 py-3.5 text-base font-medium rounded-2xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="apt-notes" className="block text-lg font-bold text-slate-900 mb-2">
              Special Instructions or Notes
            </label>
            <textarea
              id="apt-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fast 8 hours prior. Remember to bring latest blood test results and glasses."
              className="w-full px-5 py-3.5 text-base font-medium rounded-2xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-4 px-6 rounded-2xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition text-lg sm:flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-4 px-8 rounded-2xl font-black text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-300 shadow-xl shadow-emerald-200 transition text-lg sm:flex-2 min-h-[58px]"
            >
              {loading ? 'Saving Appointment...' : isEditing ? 'Save Changes' : 'Schedule Appointment'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

