import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { formatTime } from '../../lib/formatters';
import { 
  GitPullRequest, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  User, 
  ArrowRight, 
  Pill, 
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function ApprovalsTab({ onPendingCountChange }) {
  const { circle, isElder, elderMode, user } = useAuth();
  const { showToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [membersMap, setMembersMap] = useState({});
  const [medicationsMap, setMedicationsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [processingId, setProcessingId] = useState(null);
  const [processingAction, setProcessingAction] = useState(null); // 'approve' | 'reject'

  const fetchRequests = useCallback(async () => {
    if (!circle?.id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch all change requests for this circle
      const { data: reqsData, error: reqsErr } = await supabase
        .from('change_requests')
        .select('*')
        .eq('circle_id', circle.id)
        .order('id', { ascending: false });

      if (reqsErr) throw reqsErr;
      const allRequests = reqsData || [];
      setRequests(allRequests);

      // Report pending count to parent for Tab Badge
      const pendingCount = allRequests.filter((r) => r.status === 'pending').length;
      if (onPendingCountChange) {
        onPendingCountChange(pendingCount);
      }

      // 2. Fetch members to resolve requested_by to display names and roles
      const { data: membersData } = await supabase
        .from('members')
        .select('user_id, display_name, role, email')
        .eq('circle_id', circle.id);

      const mMap = {};
      (membersData || []).forEach((m) => {
        mMap[m.user_id] = m;
      });
      setMembersMap(mMap);

      // 3. Fetch medications to resolve medication_id for update diffs
      const { data: medsData } = await supabase
        .from('medications')
        .select('*')
        .eq('circle_id', circle.id);

      const medMap = {};
      (medsData || []).forEach((m) => {
        medMap[m.id] = m;
      });
      setMedicationsMap(medMap);

    } catch (err) {
      console.error('Error fetching change requests:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [circle?.id, onPendingCountChange]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Elder Approve handler
  const handleApprove = async (reqId, medicineName) => {
    setProcessingId(reqId);
    setProcessingAction('approve');
    setError(null);

    try {
      const { error: rpcErr } = await supabase.rpc('approve_change', {
        p_id: reqId,
      });

      if (rpcErr) throw rpcErr;

      showToast(`Approved change for ${medicineName || 'medication'}.`, 'success');
      await fetchRequests();
    } catch (err) {
      console.error('Error approving change request:', err);
      setError(err);
      showToast(err.message || 'Failed to approve request', 'error');
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  // Elder Reject handler
  const handleReject = async (reqId, medicineName) => {
    setProcessingId(reqId);
    setProcessingAction('reject');
    setError(null);

    try {
      const { error: rpcErr } = await supabase.rpc('reject_change', {
        p_id: reqId,
      });

      if (rpcErr) throw rpcErr;

      showToast(`Rejected request for ${medicineName || 'medication'}.`, 'info');
      await fetchRequests();
    } catch (err) {
      console.error('Error rejecting change request:', err);
      setError(err);
      showToast(err.message || 'Failed to reject request', 'error');
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const decidedRequests = requests.filter((r) => r.status !== 'pending');

  if (loading) {
    return <LoadingSpinner message="Loading medication change requests..." />;
  }

  return (
    <div className="space-y-8">
      
      {/* Header bar */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
              Care Circle Approvals
            </span>
            <span className="text-sm font-bold text-slate-500">
              ({pendingRequests.length} Pending)
            </span>
          </div>
          <h2 className={`font-black text-slate-900 tracking-tight ${elderMode ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'}`}>
            Medication Change Requests
          </h2>
          <p className="mt-1 text-slate-600 text-sm sm:text-base font-medium">
            {isElder
              ? 'Review and confirm medication changes proposed by your care circle.'
              : 'Requests submitted by caretakers and relatives awaiting Elder authorization.'}
          </p>
        </div>

        {/* Elder badge */}
        {isElder && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 font-bold text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Elder Review Authority</span>
          </div>
        )}
      </div>

      {/* Error notification */}
      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {/* Pending Requests Section */}
      <div>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 px-1 mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6 text-amber-600" />
          <span>Pending Approvals ({pendingRequests.length})</span>
        </h3>

        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 sm:p-14 text-center shadow-md">
            <div className="max-w-md mx-auto">
              <div className="inline-flex p-5 bg-emerald-50 text-emerald-600 rounded-3xl mb-4">
                <CheckCircle2 className="w-14 h-14" />
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-slate-900">
                All Caught Up!
              </h4>
              <p className="mt-2 text-slate-600 text-base sm:text-lg font-medium">
                There are no pending medication changes waiting for approval right now.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingRequests.map((req) => {
              const p = req.payload || {};
              const requester = membersMap[req.requested_by] || {
                display_name: 'Care Circle Member',
                role: 'caretaker',
              };
              const originalMed = req.medication_id ? medicationsMap[req.medication_id] : null;

              const isActionProcessing = processingId === req.id;

              // Action badge styling
              let actionBadge = null;
              if (req.action === 'add') {
                actionBadge = (
                  <span className="px-3 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider">
                    Proposed Addition
                  </span>
                );
              } else if (req.action === 'update') {
                actionBadge = (
                  <span className="px-3 py-1 bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider">
                    Proposed Update
                  </span>
                );
              } else {
                actionBadge = (
                  <span className="px-3 py-1 bg-rose-100 text-rose-950 border border-rose-300 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider">
                    Proposed Discontinuation
                  </span>
                );
              }

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-3xl border-3 border-amber-300 p-6 sm:p-8 shadow-md hover:shadow-lg transition"
                >
                  {/* Top Bar: Action Badge & Requester Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      {actionBadge}
                      <span className="text-sm font-bold text-slate-500">
                        Request #{String(req.id).substring(0, 8)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700 text-sm sm:text-base font-bold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                      <User className="w-4 h-4 text-slate-600" />
                      <span>Requested by: <span className="text-slate-900">{requester.display_name}</span></span>
                      <span className="capitalize text-xs bg-slate-200 px-2 py-0.5 rounded-md text-slate-800">
                        ({requester.role})
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="py-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 bg-blue-100 text-blue-800 rounded-2xl">
                        <Pill className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className={`font-black text-slate-900 ${elderMode ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'}`}>
                          {p.name || originalMed?.name || 'Medication'}
                        </h4>
                        <p className="text-sm sm:text-base font-bold text-blue-700">
                          Proposed Dosage: {p.dosage || originalMed?.dosage || 'Unspecified'}
                        </p>
                      </div>
                    </div>

                    {/* Diff comparison if UPDATE */}
                    {req.action === 'update' && originalMed && (
                      <div className="mt-4 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                        <span className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                          Comparison of Proposed Changes
                        </span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
                          {/* Current values */}
                          <div className="p-3 bg-white rounded-xl border border-slate-200">
                            <span className="block text-xs font-bold text-slate-500 uppercase mb-1">
                              Current Record
                            </span>
                            <p className="font-bold text-slate-800">Dosage: {originalMed.dosage}</p>
                            <p className="font-mono text-xs text-slate-600 mt-1">
                              Times: {originalMed.times ? originalMed.times.join(', ') : 'None'}
                            </p>
                            {originalMed.notes && (
                              <p className="text-xs text-slate-500 mt-1">Notes: {originalMed.notes}</p>
                            )}
                          </div>

                          {/* Proposed values */}
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-300">
                            <span className="block text-xs font-bold text-amber-800 uppercase mb-1">
                              Proposed Update
                            </span>
                            <p className="font-bold text-amber-950">Dosage: {p.dosage}</p>
                            <p className="font-mono text-xs text-amber-900 mt-1">
                              Times: {p.times ? p.times.join(', ') : 'None'}
                            </p>
                            {p.notes && (
                              <p className="text-xs text-amber-800 mt-1">Notes: {p.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Scheduled Times from payload */}
                    {p.times && p.times.length > 0 && req.action !== 'update' && (
                      <div className="mt-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-2">
                          Scheduled Times:
                        </span>
                        <div className="inline-flex flex-wrap gap-1.5 mt-1">
                          {p.times.map((t) => (
                            <span
                              key={t}
                              className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-mono font-bold"
                            >
                              {formatTime(t)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes from payload */}
                    {p.notes && req.action !== 'update' && (
                      <div className="mt-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-800">Instructions: </span>
                        {p.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-slate-200">
                    {isElder ? (
                      /* Elder Approve / Reject buttons */
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={() => handleApprove(req.id, p.name)}
                          disabled={isActionProcessing}
                          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-300 text-white rounded-2xl font-bold shadow-md shadow-emerald-200 transition ${
                            elderMode ? 'text-xl min-h-[64px]' : 'text-sm sm:text-base min-h-[46px]'
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          <span>
                            {isActionProcessing && processingAction === 'approve'
                              ? 'Approving...'
                              : 'Approve Change'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReject(req.id, p.name)}
                          disabled={isActionProcessing}
                          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300 text-white rounded-2xl font-bold shadow-md shadow-rose-200 transition ${
                            elderMode ? 'text-xl min-h-[64px]' : 'text-sm sm:text-base min-h-[46px]'
                          }`}
                        >
                          <XCircle className="w-5 h-5" />
                          <span>
                            {isActionProcessing && processingAction === 'reject'
                              ? 'Rejecting...'
                              : 'Reject Request'}
                          </span>
                        </button>
                      </div>
                    ) : (
                      /* Non-Elder view */
                      <div className="flex items-center gap-2 text-slate-600 font-medium text-sm sm:text-base bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <ShieldCheck className="w-5 h-5 text-amber-600" />
                        <span>This request is awaiting review and confirmation by the Elder.</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Decided Requests History Section */}
      {decidedRequests.length > 0 && (
        <div className="pt-8 border-t-2 border-slate-200">
          <h3 className="text-lg sm:text-xl font-bold text-slate-600 px-1 mb-4 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-slate-500" />
            <span>Recent Decisions ({decidedRequests.length})</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decidedRequests.slice(0, 8).map((req) => {
              const p = req.payload || {};
              const isApproved = req.status === 'approved';
              return (
                <div
                  key={req.id}
                  className="bg-slate-50 rounded-2xl border border-slate-300 p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-slate-800 text-base">
                      {p.name || 'Medication'}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                          : 'bg-rose-100 text-rose-950 border-rose-300'
                      }`}
                    >
                      {isApproved ? 'Approved' : 'Rejected'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 capitalize">
                    Action: {req.action} • Dosage: {p.dosage || 'N/A'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
