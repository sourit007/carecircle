import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import MedicationFormModal from '../../components/MedicationFormModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { formatTime } from '../../lib/formatters';
import { 
  Pill, 
  Plus, 
  Edit3, 
  PauseCircle, 
  PlayCircle,
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Send, 
  Search,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function MedicationsTab() {
  const { circle, user, isElder, elderMode, elderName, member } = useAuth();
  const { showToast } = useToast();

  const [allMedications, setAllMedications] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'inactive' | 'all'

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedMedication, setSelectedMedication] = useState(null);

  // Action loading states
  const [actionMedId, setActionMedId] = useState(null);

  // Fetch all medications and user's pending requests
  const fetchData = useCallback(async () => {
    if (!circle?.id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch all medications for circle
      const { data: medsData, error: medsErr } = await supabase
        .from('medications')
        .select('*')
        .eq('circle_id', circle.id)
        .order('name', { ascending: true });

      if (medsErr) throw medsErr;
      setAllMedications(medsData || []);

      // 2. Fetch user's own pending requests
      if (user?.id) {
        const { data: reqsData, error: reqsErr } = await supabase
          .from('change_requests')
          .select('*')
          .eq('circle_id', circle.id)
          .eq('requested_by', user.id)
          .eq('status', 'pending')
          .order('id', { ascending: false });

        if (reqsErr) throw reqsErr;
        setMyRequests(reqsData || []);
      }
    } catch (err) {
      console.error('Error fetching medications:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [circle?.id, user?.id]);

  useEffect(() => {
    fetchData();

    if (!circle?.id) return;

    // Realtime subscription on medications and change_requests
    const channel = supabase
      .channel(`medications_live_${circle.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medications',
          filter: `circle_id=eq.${circle.id}`,
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'change_requests',
          filter: `circle_id=eq.${circle.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circle?.id, fetchData]);

  // Open Add modal
  const handleOpenAdd = () => {
    setSelectedMedication(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (med) => {
    setSelectedMedication(med);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Stop / Deactivate medication
  const handleStopMedication = async (med) => {
    const confirmMsg = isElder
      ? `Are you sure you want to stop taking ${med.name}? It will be marked as inactive.`
      : `Suggest stopping ${med.name}? This will be sent to ${elderName || 'the Elder'} for approval.`;

    if (!window.confirm(confirmMsg)) return;

    setActionMedId(med.id);
    setError(null);

    try {
      if (isElder) {
        // Direct deactivation by Elder
        const { error: updateErr } = await supabase
          .from('medications')
          .update({ active: false })
          .eq('id', med.id);

        if (updateErr) throw updateErr;

        showToast(`Stopped ${med.name}. Marked as inactive.`, 'success');
      } else {
        // Caretaker / Family: submit change_request with action 'delete'
        const { error: reqErr } = await supabase
          .from('change_requests')
          .insert({
            circle_id: circle.id,
            medication_id: med.id,
            requested_by: user.id,
            action: 'delete',
            payload: {
              name: med.name,
              dosage: med.dosage,
              notes: med.notes,
              times: med.times,
              active: false,
            },
            status: 'pending',
          });

        if (reqErr) throw reqErr;

        showToast(`Sent to ${elderName || 'the Elder'} for approval.`, 'info');
      }

      await fetchData();
    } catch (err) {
      console.error('Error stopping medication:', err);
      setError(err);
      showToast(err.message || 'Failed to stop medication', 'error');
    } finally {
      setActionMedId(null);
    }
  };

  // Restart / Reactivate medication
  const handleRestartMedication = async (med) => {
    setActionMedId(med.id);
    setError(null);

    try {
      if (isElder) {
        const { error: updateErr } = await supabase
          .from('medications')
          .update({ active: true })
          .eq('id', med.id);

        if (updateErr) throw updateErr;

        showToast(`Reactivated ${med.name}.`, 'success');
      } else {
        const { error: reqErr } = await supabase
          .from('change_requests')
          .insert({
            circle_id: circle.id,
            medication_id: med.id,
            requested_by: user.id,
            action: 'update',
            payload: {
              name: med.name,
              dosage: med.dosage,
              notes: med.notes,
              times: med.times,
              active: true,
            },
            status: 'pending',
          });

        if (reqErr) throw reqErr;

        showToast(`Sent restart proposal to ${elderName || 'the Elder'} for approval.`, 'info');
      }

      await fetchData();
    } catch (err) {
      console.error('Error restarting medication:', err);
      setError(err);
      showToast(err.message || 'Failed to restart medication', 'error');
    } finally {
      setActionMedId(null);
    }
  };

  // Filtered medications
  const filteredMedications = useMemo(() => {
    return allMedications.filter((med) => {
      // Status filter
      if (statusFilter === 'active' && !med.active) return false;
      if (statusFilter === 'inactive' && med.active) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = med.name?.toLowerCase().includes(q);
        const matchesDosage = med.dosage?.toLowerCase().includes(q);
        const matchesNotes = med.notes?.toLowerCase().includes(q);
        return matchesName || matchesDosage || matchesNotes;
      }
      return true;
    });
  }, [allMedications, statusFilter, searchQuery]);

  const activeCount = allMedications.filter((m) => m.active).length;
  const inactiveCount = allMedications.filter((m) => !m.active).length;

  if (loading) {
    return <LoadingSpinner message="Loading prescriptions..." />;
  }

  return (
    <div className="space-y-8">
      
      {/* Header bar */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
              Prescription Registry
            </span>
            <span className="text-sm font-bold text-slate-500">
              ({activeCount} Active)
            </span>
          </div>
          <h2 className={`font-black text-slate-900 tracking-tight ${elderMode ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'}`}>
            Medications
          </h2>
          <p className="mt-1 text-slate-600 text-sm sm:text-base font-medium">
            {isElder
              ? 'You have direct authorization to add, modify, or stop any medication.'
              : `Proposals you make will be sent to ${elderName || 'the Elder'} for approval.`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className={`flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl shadow-md shadow-blue-200 transition ${
            elderMode ? 'text-xl min-h-[60px]' : 'text-sm sm:text-base min-h-[44px]'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span>{isElder ? 'Add Medication' : 'Propose Medication'}</span>
        </button>
      </div>

      {/* Search & Status Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Search input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medications by name or dosage..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Status Pill Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition ${
              statusFilter === 'active'
                ? 'bg-white text-blue-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition ${
              statusFilter === 'inactive'
                ? 'bg-white text-blue-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stopped ({inactiveCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition ${
              statusFilter === 'all'
                ? 'bg-white text-blue-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({allMedications.length})
          </button>
        </div>

      </div>

      {/* Error notification */}
      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {/* Medications List */}
      {filteredMedications.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 sm:p-14 text-center shadow-md">
          <div className="max-w-md mx-auto">
            <div className="inline-flex p-5 bg-blue-50 text-blue-600 rounded-3xl mb-5">
              <Pill className="w-14 h-14" />
            </div>
            <h3 className={`font-black text-slate-900 ${elderMode ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
              {searchQuery ? 'No matching medications found' : statusFilter === 'inactive' ? 'No stopped medications' : 'No active medications'}
            </h3>
            <p className="mt-2 text-slate-600 text-sm sm:text-base font-medium">
              {searchQuery ? 'Try clearing your search query.' : 'There are currently no medications in this view.'}
            </p>
            {statusFilter === 'active' && !searchQuery && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition text-sm sm:text-base"
                >
                  <Plus className="w-5 h-5" />
                  <span>{isElder ? 'Add First Medication' : 'Propose First Medication'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMedications.map((med) => {
            const isProcessing = actionMedId === med.id;
            const isActive = med.active;

            return (
              <div
                key={med.id}
                className={`bg-white rounded-3xl border-2 p-6 sm:p-7 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                  isActive
                    ? 'border-slate-200 hover:border-blue-400'
                    : 'border-slate-300 bg-slate-50/60 opacity-80'
                }`}
              >
                <div>
                  {/* Title & Active badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className={`font-black text-slate-900 ${elderMode ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'}`}>
                        {med.name}
                      </h3>
                      <p className="text-sm sm:text-base font-bold text-blue-700">
                        {med.dosage}
                      </p>
                    </div>

                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider">
                        <span>Stopped</span>
                      </span>
                    )}
                  </div>

                  {/* Scheduled Times */}
                  <div className="mt-4 mb-4">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Scheduled Daily Times
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {med.times && med.times.length > 0 ? (
                        med.times.map((t) => (
                          <span
                            key={t}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm sm:text-base font-bold border ${
                              isActive
                                ? 'bg-blue-50 border-blue-200 text-blue-950'
                                : 'bg-slate-100 border-slate-300 text-slate-600'
                            }`}
                          >
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span>{formatTime(t)}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500 font-medium">
                          No times scheduled
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Notes / Instructions */}
                  {med.notes && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl mb-4 text-slate-700 text-sm font-medium">
                      <span className="font-bold text-slate-900 block mb-0.5">Instructions:</span>
                      {med.notes}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                  {isActive ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(med)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50 text-slate-800 font-bold transition text-sm sm:text-base"
                      >
                        <Edit3 className="w-4 h-4 text-blue-600" />
                        <span>{isElder ? 'Edit' : 'Propose Edit'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStopMedication(med)}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-300 hover:border-rose-400 bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold transition text-sm sm:text-base disabled:opacity-50"
                      >
                        <PauseCircle className="w-4 h-4 text-rose-600" />
                        <span>{isProcessing ? 'Processing...' : isElder ? 'Stop' : 'Propose Stop'}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRestartMedication(med)}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-300 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold transition text-sm sm:text-base disabled:opacity-50"
                    >
                      <PlayCircle className="w-4 h-4 text-emerald-600" />
                      <span>{isProcessing ? 'Restarting...' : isElder ? 'Restart Medication' : 'Propose Restart'}</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* User's Own Pending Requests Section */}
      <div className="mt-12 pt-8 border-t-2 border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">
              My Pending Change Requests
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Prescription proposals you have submitted waiting for confirmation by {elderName || 'the Elder'}.
            </p>
          </div>
        </div>

        {myRequests.length === 0 ? (
          <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl text-center text-slate-600 font-medium text-sm sm:text-base">
            You have no pending medication change requests at this moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myRequests.map((req) => {
              const p = req.payload || {};
              const actionLabel =
                req.action === 'add'
                  ? 'Proposed Addition'
                  : req.action === 'update'
                  ? 'Proposed Update'
                  : 'Proposed Stop / Deletion';

              const actionBadge =
                req.action === 'add'
                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                  : req.action === 'update'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-rose-100 text-rose-900 border-rose-300';

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border-2 border-slate-300 p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${actionBadge}`}>
                      {actionLabel}
                    </span>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold uppercase">
                      Pending Approval
                    </span>
                  </div>

                  <h4 className="text-base font-black text-slate-900">
                    {p.name || 'Unnamed Medication'}
                  </h4>
                  {p.dosage && (
                    <p className="text-sm font-bold text-slate-700">
                      Dosage: {p.dosage}
                    </p>
                  )}
                  {p.times && p.times.length > 0 && (
                    <p className="text-xs font-mono text-slate-600 mt-1">
                      Times: {p.times.join(', ')}
                    </p>
                  )}
                  {p.notes && (
                    <p className="text-xs text-slate-500 mt-1 italic">
                      "{p.notes}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Medication Form Modal */}
      <MedicationFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        initialMedication={selectedMedication}
        mode={modalMode}
      />

    </div>
  );
}
