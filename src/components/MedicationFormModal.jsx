import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { buildChangeRequestRecord } from '../lib/changeRequests';
import ErrorMessage from './ErrorMessage';
import { 
  X, 
  Pill, 
  Clock, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Send, 
  Check,
  AlertCircle
} from 'lucide-react';

export default function MedicationFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialMedication = null,
  mode = 'add', // 'add' | 'edit'
}) {
  const { circle, user, isElder, elderName, member } = useAuth();
  const { showToast } = useToast();

  const isEdit = mode === 'edit' && !!initialMedication;

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [notes, setNotes] = useState('');
  const [times, setTimes] = useState(['08:00', '20:00']);
  const [timeInput, setTimeInput] = useState('12:00');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync initial data when modal opens
  useEffect(() => {
    if (initialMedication) {
      setName(initialMedication.name || '');
      setDosage(initialMedication.dosage || '');
      setNotes(initialMedication.notes || '');
      setTimes(initialMedication.times && initialMedication.times.length > 0 ? initialMedication.times : ['08:00']);
    } else {
      setName('');
      setDosage('');
      setNotes('');
      setTimes(['08:00', '20:00']);
    }
    setError(null);
  }, [initialMedication, isOpen]);

  if (!isOpen) return null;

  const handleAddTime = () => {
    if (!timeInput) return;
    if (times.includes(timeInput)) {
      setError(`Time ${timeInput} is already added.`);
      return;
    }
    const updated = [...times, timeInput].sort();
    setTimes(updated);
    setError(null);
  };

  const handleRemoveTime = (timeToRemove) => {
    if (times.length <= 1) {
      setError('Medications must have at least one scheduled time.');
      return;
    }
    setTimes(times.filter((t) => t !== timeToRemove));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide the medication name.');
      return;
    }
    if (!dosage.trim()) {
      setError('Please provide the dosage (e.g. 500mg, 1 tablet).');
      return;
    }
    if (times.length === 0) {
      setError('Please add at least one scheduled time.');
      return;
    }

    setLoading(true);

    try {
      const payloadData = {
        name: name.trim(),
        dosage: dosage.trim(),
        notes: notes.trim() || null,
        times: times,
      };

      if (isElder) {
        // Elder writes directly to medications table
        if (isEdit) {
          const { error: updateErr } = await supabase
            .from('medications')
            .update({
              name: payloadData.name,
              dosage: payloadData.dosage,
              notes: payloadData.notes,
              times: payloadData.times,
              active: true,
            })
            .eq('id', initialMedication.id);

          if (updateErr) throw updateErr;
          showToast(`Updated ${payloadData.name} successfully.`, 'success');
        } else {
          // Add medication directly
          const insertObj = {
            circle_id: circle.id,
            name: payloadData.name,
            dosage: payloadData.dosage,
            notes: payloadData.notes,
            times: payloadData.times,
            active: true,
            created_by: user.id,
          };

          let { error: insertErr } = await supabase
            .from('medications')
            .insert(insertObj);

          // If created_by is not a column, retry without it
          if (insertErr && insertErr.message && insertErr.message.includes('created_by')) {
            delete insertObj.created_by;
            const retry = await supabase.from('medications').insert(insertObj);
            if (retry.error) throw retry.error;
          } else if (insertErr) {
            throw insertErr;
          }

          showToast(`Added ${payloadData.name} to active prescriptions.`, 'success');
        }
      } else {
        // Caretaker or Family: MUST NOT write directly to medications.
        // Insert into change_requests for Elder approval.
        const reqAction = isEdit ? 'update' : 'add';
        const requestRecord = buildChangeRequestRecord({
          circleId: circle.id,
          userId: user.id,
          action: reqAction,
          values: payloadData,
          medicationId: isEdit ? initialMedication.id : null,
          originalMedication: initialMedication,
        });

        const { error: reqErr } = await supabase
          .from('change_requests')
          .insert(requestRecord);

        if (reqErr) throw reqErr;

        showToast(`Sent to ${elderName || 'the Elder'} for approval.`, 'info');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving medication:', err);
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
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-300 w-full max-w-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 sm:p-7 border-b-2 border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md">
              <Pill className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                {isElder
                  ? isEdit ? 'Edit Medication' : 'Add Medication'
                  : isEdit ? 'Propose Medication Update' : 'Propose New Medication'}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 font-medium">
                {isElder
                  ? 'Elder Authorized • Immediate schedule update'
                  : `Requires approval from ${elderName || 'the Elder'}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        {/* Notice for non-elders */}
        {!isElder && (
          <div className="mx-6 sm:mx-8 mt-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 flex items-start gap-3">
            <ShieldCheck className="w-7 h-7 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm sm:text-base font-medium">
              As a <span className="font-bold capitalize">{member?.role}</span>, submitting this form sends a request to <span className="font-bold text-amber-900">{elderName || 'the Elder'}</span>. It will not take effect until approved.
            </p>
          </div>
        )}

        {/* Error notification */}
        <div className="px-6 sm:px-8 mt-4">
          <ErrorMessage error={error} onDismiss={() => setError(null)} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          
          {/* Medicine Name */}
          <div>
            <label htmlFor="modal-med-name" className="block text-lg font-bold text-slate-900 mb-2">
              Medication Name *
            </label>
            <input
              id="modal-med-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Metformin, Lisinopril, Aspirin"
              className="w-full px-5 py-4 text-lg font-medium rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
            />
          </div>

          {/* Dosage */}
          <div>
            <label htmlFor="modal-med-dosage" className="block text-lg font-bold text-slate-900 mb-2">
              Dosage & Unit *
            </label>
            <input
              id="modal-med-dosage"
              type="text"
              required
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. 500mg, 1 tablet with warm water"
              className="w-full px-5 py-4 text-lg font-medium rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
            />
          </div>

          {/* Multiple Times with Add/Remove */}
          <div>
            <label className="block text-lg font-bold text-slate-900 mb-1">
              Scheduled Times *
            </label>
            <p className="text-sm text-slate-600 font-medium mb-3">
              Add every time of day this medication should be taken.
            </p>

            {/* List of active times */}
            <div className="flex flex-wrap gap-2.5 mb-4">
              {times.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border-2 border-blue-300 text-blue-950 rounded-xl font-mono text-lg font-bold shadow-sm"
                >
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTime(t)}
                    aria-label={`Remove time ${t}`}
                    className="p-1 text-slate-500 hover:text-red-700 hover:bg-blue-100 rounded-md transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add Time controls */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="time"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="px-4 py-3 text-lg font-mono font-bold rounded-xl border-2 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={handleAddTime}
                className="flex items-center gap-2 px-5 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition shadow-sm text-base"
              >
                <Plus className="w-5 h-5" />
                <span>Add Time</span>
              </button>
            </div>

            {/* Quick time helpers */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs font-bold uppercase text-slate-500 self-center">Presets:</span>
              {[
                { label: 'Morning 08:00', val: '08:00' },
                { label: 'Noon 12:00', val: '12:00' },
                { label: 'Evening 18:00', val: '18:00' },
                { label: 'Night 21:00', val: '21:00' },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => {
                    if (!times.includes(p.val)) {
                      setTimes([...times, p.val].sort());
                    }
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 text-xs font-bold rounded-lg border border-slate-200 transition"
                >
                  + {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="modal-med-notes" className="block text-lg font-bold text-slate-900 mb-2">
              Instructions & Notes
            </label>
            <textarea
              id="modal-med-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Take after meals. Drink a full glass of water. Store at room temperature."
              className="w-full px-5 py-3.5 text-base font-medium rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
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
              className="py-4 px-8 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 shadow-xl shadow-blue-200 transition text-lg sm:flex-2 flex items-center justify-center gap-2 min-h-[58px]"
            >
              {loading ? (
                <span>Saving...</span>
              ) : isElder ? (
                <span>{isEdit ? 'Save Changes' : 'Add Medication'}</span>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Send to {elderName || 'Elder'} for Approval</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

