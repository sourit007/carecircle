import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import ErrorMessage from './ErrorMessage';
import { 
  X, 
  Pill, 
  Clock, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Send, 
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function MedicationModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialData = null, 
  mode = 'add' // 'add' | 'edit' | 'propose-add' | 'propose-edit'
}) {
  const { circle, user, isElder, member } = useAuth();

  const isEditing = mode === 'edit' || mode === 'propose-edit';
  const isDirectMode = isElder; // Elders modify directly; Caretaker/Family submit change_requests

  const [name, setName] = useState(initialData?.name || '');
  const [dosage, setDosage] = useState(initialData?.dosage || '');
  const [times, setTimes] = useState(initialData?.times || ['08:00', '20:00']);
  const [newTime, setNewTime] = useState('12:00');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [startDate, setStartDate] = useState(
    initialData?.start_date || new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(initialData?.end_date || '');
  const [active, setActive] = useState(
    initialData ? initialData.active !== false : true
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleAddTime = () => {
    if (newTime && !times.includes(newTime)) {
      const updated = [...times, newTime].sort();
      setTimes(updated);
    }
  };

  const handleRemoveTime = (timeToRemove) => {
    setTimes(times.filter((t) => t !== timeToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter the medication name.');
      return;
    }
    if (!dosage.trim()) {
      setError('Please enter the dosage.');
      return;
    }
    if (times.length === 0) {
      setError('Please add at least one scheduled time for this medication.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        dosage: dosage.trim(),
        times,
        notes: notes.trim(),
        active,
        start_date: startDate || null,
        end_date: endDate || null,
      };

      if (isDirectMode) {
        // Elder has direct authorization
        if (isEditing && initialData?.id) {
          const { error: updateErr } = await supabase
            .from('medications')
            .update(payload)
            .eq('id', initialData.id);

          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await supabase
            .from('medications')
            .insert({
              circle_id: circle.id,
              ...payload,
            });

          if (insertErr) throw insertErr;
        }
      } else {
        // Caretaker / Family member: create a change request for Elder approval
        const requestAction = isEditing ? 'update' : 'add';
        const { error: requestErr } = await supabase
          .from('change_requests')
          .insert({
            circle_id: circle.id,
            medication_id: isEditing ? initialData?.id : null,
            requested_by: user.id,
            action: requestAction,
            payload,
            status: 'pending',
          });

        if (requestErr) throw requestErr;
      }

      onSuccess(isDirectMode ? 'Medication saved directly.' : 'Change request submitted to the Elder for approval.');
      onClose();
    } catch (err) {
      console.error('Error saving medication:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Quick time preset buttons
  const timePresets = [
    { label: 'Morning (08:00)', value: '08:00' },
    { label: 'Noon (12:00)', value: '12:00' },
    { label: 'Evening (18:00)', value: '18:00' },
    { label: 'Bedtime (21:00)', value: '21:00' },
  ];

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
              <Pill className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                {isDirectMode
                  ? isEditing ? 'Edit Medication' : 'Add New Medication'
                  : isEditing ? 'Propose Medication Update' : 'Propose New Medication'}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 font-medium">
                {isDirectMode
                  ? 'Elder Authorized • Changes take effect immediately'
                  : 'Submitted to the Elder for review & confirmation'}
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

        {/* Info Banner if Caretaker / Family */}
        {!isDirectMode && (
          <div className="mx-6 sm:mx-8 mt-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 flex items-start gap-3">
            <ShieldCheck className="w-7 h-7 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm sm:text-base font-medium">
              <span className="font-bold">Elder-Centered Approval:</span> Since you are signed in as a <span className="font-bold capitalize">{member?.role}</span>, this proposed medication plan will be sent to the Elder's Approvals tab.
            </div>
          </div>
        )}

        {/* Error alert */}
        <div className="px-6 sm:px-8 mt-4">
          <ErrorMessage error={error} onDismiss={() => setError(null)} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          
          {/* Medication Name */}
          <div>
            <label htmlFor="med-name" className="block text-lg font-bold text-slate-900 mb-2">
              Medication Name *
            </label>
            <input
              id="med-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lisinopril, Metformin, Vitamin D3"
              className="w-full px-5 py-3.5 text-lg font-medium rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
            />
          </div>

          {/* Dosage */}
          <div>
            <label htmlFor="med-dosage" className="block text-lg font-bold text-slate-900 mb-2">
              Dosage & Unit *
            </label>
            <input
              id="med-dosage"
              type="text"
              required
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. 10mg, 1 tablet with water, 2 drops"
              className="w-full px-5 py-3.5 text-lg font-medium rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
            />
          </div>

          {/* Times array */}
          <div>
            <label className="block text-lg font-bold text-slate-900 mb-2">
              Daily Reminder Times *
            </label>
            <p className="text-sm text-slate-500 mb-3 font-medium">
              Specify when this medication should be taken each day.
            </p>

            {/* Existing times list */}
            <div className="flex flex-wrap gap-2 mb-4">
              {times.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-950 border border-blue-300 rounded-xl font-bold text-base shadow-sm"
                >
                  <Clock className="w-4 h-4 text-blue-700" />
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTime(t)}
                    aria-label={`Remove time ${t}`}
                    className="p-1 hover:text-red-700 hover:bg-blue-200 rounded-md transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
              {times.length === 0 && (
                <span className="text-red-600 text-base font-semibold py-1">
                  No times added yet. Add at least one scheduled time below.
                </span>
              )}
            </div>

            {/* Add time controls */}
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="px-4 py-3 text-lg font-bold rounded-xl border-2 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={handleAddTime}
                className="flex items-center gap-1.5 px-5 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-sm text-base"
              >
                <Plus className="w-5 h-5" />
                <span>Add Time</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs font-bold uppercase text-slate-500 self-center mr-1">Presets:</span>
              {timePresets.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    if (!times.includes(p.value)) {
                      setTimes([...times, p.value].sort());
                    }
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 text-xs font-bold rounded-lg border border-slate-200 transition"
                >
                  + {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Start and End Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-base font-bold text-slate-900 mb-2">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 text-base font-medium rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-base font-bold text-slate-900 mb-2">
                End Date (Optional)
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 text-base font-medium rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="med-notes" className="block text-lg font-bold text-slate-900 mb-2">
              Instructions & Notes
            </label>
            <textarea
              id="med-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Take with breakfast. Avoid grapefruit juice."
              className="w-full px-5 py-3.5 text-base font-medium rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
            />
          </div>

          {/* Active status */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <input
              id="med-active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-6 h-6 text-blue-600 rounded-lg border-2 border-slate-400 focus:ring-blue-500"
            />
            <label htmlFor="med-active" className="text-base sm:text-lg font-bold text-slate-800 cursor-pointer">
              Active Prescription (Currently taking this medication)
            </label>
          </div>

          {/* Submit & Cancel Buttons */}
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
              className="py-4 px-8 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 shadow-xl shadow-blue-200 transition text-lg sm:flex-2 flex items-center justify-center gap-2 min-h-[58px]"
            >
              {loading ? (
                <span>Saving...</span>
              ) : isDirectMode ? (
                <span>{isEditing ? 'Save Changes' : 'Add Medication'}</span>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit Request to Elder</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

