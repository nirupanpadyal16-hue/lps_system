import React, { useState, useEffect } from 'react';
import { ppcApi } from '../../api/newRolesApi';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const PPCRMRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ppcApi.getRMRequests()
      .then(r => setRequests(r.data?.data || []))
      .catch(() => toast.error('Failed to load RM requests'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My RM Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Track all RM sheets you have submitted to Store Keeper</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📄</p>
          <p>No RM requests submitted yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className={`
              rounded-xl border p-4 transition-all hover:shadow-md
              ${req.status === 'ACCEPTED' ? 'border-green-200 bg-green-50/40' :
                req.status === 'REJECTED' ? 'border-red-200 bg-red-50/40' :
                'border-gray-200 bg-white'}
            `}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-blue-700">{req.formatted_id}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-sm text-gray-700 font-medium">{req.inventory_item?.sap_part_number}</span>
                    <span className="text-xs text-gray-400">({req.demand_formatted_id})</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-x-6 gap-y-1 text-xs text-gray-500">
                    {req.rm_grade && <span><b>Grade:</b> {req.rm_grade}</span>}
                    {req.rm_size && <span><b>Size:</b> {req.rm_size}</span>}
                    {req.rm_thk_mm && <span><b>Thickness:</b> {req.rm_thk_mm} mm</span>}
                    {req.sheet_width && <span><b>Width:</b> {req.sheet_width}</span>}
                    {req.sheet_length && <span><b>Length:</b> {req.sheet_length}</span>}
                  </div>
                  {req.ppc_notes && (
                    <p className="mt-2 text-xs text-gray-500 italic">Notes: {req.ppc_notes}</p>
                  )}
                  {req.status === 'REJECTED' && req.rejection_reason && (
                    <p className="mt-2 text-xs text-red-600 font-medium">
                      ✗ Rejected: {req.rejection_reason}
                    </p>
                  )}
                  {req.status === 'ACCEPTED' && req.sk_notes && (
                    <p className="mt-2 text-xs text-green-600">
                      ✓ SK Notes: {req.sk_notes}
                    </p>
                  )}
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[req.status]}`}>
                    {req.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {req.submitted_at ? new Date(req.submitted_at).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PPCRMRequestsPage;
