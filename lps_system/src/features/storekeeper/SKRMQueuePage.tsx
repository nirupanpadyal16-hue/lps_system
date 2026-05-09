import React, { useState, useEffect } from 'react';
import { skApi } from '../../api/newRolesApi';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  ACCEPTED: 'bg-green-100 text-green-800 border border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border border-red-200',
  PENDING: 'bg-gray-100 text-gray-700 border border-gray-200',
};

const SKRMQueuePage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'>('SUBMITTED');
  const [actionItem, setActionItem] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchQueue = () => {
    setLoading(true);
    skApi.getRMQueue(filter === 'all' ? undefined : filter)
      .then(r => setRequests(r.data?.data || []))
      .catch(() => toast.error('Failed to load RM queue'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchQueue(); }, [filter]);

  const openAccept = (req: any) => { setActionItem(req); setActionType('accept'); setNotes(''); };
  const openReject = (req: any) => { setActionItem(req); setActionType('reject'); setNotes(''); };

  const handleAction = async () => {
    if (!actionItem || !actionType) return;
    if (actionType === 'reject' && !notes.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setProcessing(true);
    try {
      if (actionType === 'accept') {
        await skApi.acceptRM(actionItem.id, { sk_notes: notes });
        toast.success(`RM ${actionItem.formatted_id} accepted — notification sent to Supervisor`);
      } else {
        await skApi.rejectRM(actionItem.id, { rejection_reason: notes });
        toast.error(`RM ${actionItem.formatted_id} rejected`);
      }
      setActionItem(null);
      fetchQueue();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const rmFields = [
    ['RM Grade', 'rm_grade'], ['RM Size', 'rm_size'], ['Thickness (mm)', 'rm_thk_mm'],
    ['Sheet Width', 'sheet_width'], ['Sheet Length', 'sheet_length'],
    ['Comp/Sheet', 'no_of_comp_per_sheet'], ['Actual RM Sizes', 'act_rm_sizes'],
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RM Acceptance Queue</h1>
          <p className="text-sm text-gray-500 mt-1">Review and accept/reject RM sheets from PPC Planner — one part at a time</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5">
        {(['SUBMITTED', 'ACCEPTED', 'REJECTED', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${filter === f ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
            `}
          >
            {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p>No {filter !== 'all' ? filter.toLowerCase() : ''} RM requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className={`
              rounded-xl border p-5 transition-all
              ${req.status === 'SUBMITTED' ? 'border-yellow-300 bg-yellow-50/30 shadow-sm' :
                req.status === 'ACCEPTED' ? 'border-green-200 bg-green-50/20' :
                'border-red-200 bg-red-50/20'}
            `}>
              <div className="flex items-start justify-between gap-4">
                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {req.formatted_id}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">
                      {req.inventory_item?.sap_part_number}
                    </span>
                    <span className="text-xs text-gray-500">
                      {req.inventory_item?.part_description}
                    </span>
                    <span className={`ml-auto inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[req.status]}`}>
                      {req.status}
                    </span>
                  </div>

                  {/* RM data grid */}
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {rmFields.map(([label, key]) => req[key] && (
                      <div key={key} className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                        <div className="text-xs text-gray-400">{label}</div>
                        <div className="text-sm font-semibold text-gray-800">{req[key]}</div>
                      </div>
                    ))}
                  </div>

                  {req.ppc_notes && (
                    <p className="mt-3 text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2">
                      <b>PPC Notes:</b> {req.ppc_notes}
                    </p>
                  )}
                  {req.rejection_reason && (
                    <p className="mt-2 text-xs text-red-600 font-medium">
                      ✗ Rejection reason: {req.rejection_reason}
                    </p>
                  )}
                  {req.sk_notes && (
                    <p className="mt-2 text-xs text-green-700">
                      ✓ SK Notes: {req.sk_notes}
                    </p>
                  )}

                  <div className="mt-2 text-xs text-gray-400">
                    Submitted: {req.submitted_at ? new Date(req.submitted_at).toLocaleString() : '—'} ·
                    By: {req.ppc_planner_name || 'PPC Planner'} ·
                    Demand: <span className="font-mono font-semibold text-blue-600">{req.demand_formatted_id}</span>
                  </div>
                </div>

                {/* Actions */}
                {req.status === 'SUBMITTED' && (
                  <div className="flex flex-col gap-2 min-w-[120px]">
                    <button
                      onClick={() => openAccept(req)}
                      className="w-full rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-700 transition-colors"
                    >
                      ✓ Accept
                    </button>
                    <button
                      onClick={() => openReject(req)}
                      className="w-full rounded-lg border border-red-300 text-red-600 text-sm font-medium px-4 py-2 hover:bg-red-50 transition-colors"
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {actionItem && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className={`p-5 rounded-t-2xl text-white ${actionType === 'accept' ? 'bg-emerald-600' : 'bg-red-600'}`}>
              <h2 className="text-lg font-bold">
                {actionType === 'accept' ? '✓ Accept RM Sheet' : '✗ Reject RM Sheet'}
              </h2>
              <p className="text-sm opacity-80 mt-1">{actionItem.formatted_id} · {actionItem.inventory_item?.sap_part_number}</p>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {actionType === 'accept' ? 'Notes (optional)' : 'Rejection Reason *'}
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={actionType === 'accept' ? 'Any notes for record...' : 'Reason for rejection...'}
              />
              {actionType === 'accept' && (
                <p className="mt-2 text-xs text-gray-400">
                  ℹ️ Supervisor will be notified that RM is accepted and ready at plant.
                </p>
              )}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setActionItem(null)}
                className="flex-1 rounded-lg border border-gray-300 text-gray-600 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={processing}
                className={`flex-1 rounded-lg text-white py-2 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2
                  ${actionType === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {processing && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {actionType === 'accept' ? 'Confirm Accept' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SKRMQueuePage;
