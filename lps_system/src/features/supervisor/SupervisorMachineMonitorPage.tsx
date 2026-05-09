import React, { useState, useEffect } from 'react';
import { supervisorMachineApi } from '../../api/newRolesApi';
import toast from 'react-hot-toast';

const SHIFT_COLORS: Record<string, string> = {
  'Shift 1': 'bg-amber-50 border-amber-200 text-amber-700',
  'Shift 2': 'bg-orange-50 border-orange-200 text-orange-700',
  'Shift 3': 'bg-indigo-50 border-indigo-200 text-indigo-700',
};

const SupervisorMachineMonitorPage: React.FC = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [verifyItem, setVerifyItem] = useState<any>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifyAction, setVerifyAction] = useState<'approve' | 'reject'>('approve');
  const [processing, setProcessing] = useState(false);

  const fetchEntries = () => {
    setLoading(true);
    supervisorMachineApi.getMachineEntries({
      date: selectedDate,
      shift: shiftFilter === 'all' ? undefined : shiftFilter,
    })
      .then(r => setEntries(r.data?.data || []))
      .catch(() => toast.error('Failed to load entries'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEntries(); }, [selectedDate, shiftFilter]);

  // Group entries by machine/production line
  const grouped = entries.reduce((acc, entry) => {
    const key = entry.machine_name || entry.inventory_item?.machine_group || 'Unknown Machine';
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {} as Record<string, any[]>);

  const openVerify = (entry: any, action: 'approve' | 'reject') => {
    setVerifyItem(entry);
    setVerifyAction(action);
    setVerifyNotes('');
  };

  const handleVerify = async () => {
    if (!verifyItem) return;
    setProcessing(true);
    try {
      await supervisorMachineApi.verifyEntry(verifyItem.id, {
        verified: verifyAction === 'approve',
        verification_notes: verifyNotes,
      });
      toast.success(verifyAction === 'approve' ? 'Entry verified ✓' : 'Entry rejected');
      setVerifyItem(null);
      fetchEntries();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const totalParts = entries.reduce((sum, e) => sum + (e.parts_produced || 0), 0);
  const totalRuntime = entries.reduce((sum, e) => sum + (e.machine_runtime_hours || 0), 0);
  const pendingVerification = entries.filter(e => !e.supervisor_verified).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Line Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">Machine-wise part production — Supervisor & Admin only</p>
        </div>

        {/* KPI Strip */}
        <div className="flex items-center gap-4">
          <div className="text-center bg-blue-50 rounded-xl px-4 py-2 border border-blue-100">
            <div className="text-xl font-black text-blue-700">{totalParts.toLocaleString()}</div>
            <div className="text-[10px] text-blue-400 uppercase">Parts Today</div>
          </div>
          <div className="text-center bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
            <div className="text-xl font-black text-gray-700">{totalRuntime}h</div>
            <div className="text-[10px] text-gray-400 uppercase">Runtime</div>
          </div>
          {pendingVerification > 0 && (
            <div className="text-center bg-yellow-50 rounded-xl px-4 py-2 border border-yellow-200">
              <div className="text-xl font-black text-yellow-700">{pendingVerification}</div>
              <div className="text-[10px] text-yellow-400 uppercase">To Verify</div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          {(['all', 'Shift 1', 'Shift 2', 'Shift 3'] as const).map(s => (
            <button
              key={s}
              onClick={() => setShiftFilter(s)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                shiftFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'All Shifts' : s}
            </button>
          ))}
        </div>
        <span className="flex items-center text-sm text-gray-500">{entries.length} entries</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏭</p>
          <p>No production entries for {selectedDate}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([machineName, machineEntries]) => (
            <div key={machineName} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Machine Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🏭</span>
                  <div>
                    <h3 className="font-black text-gray-800">{machineName}</h3>
                    <p className="text-xs text-gray-400">{(machineEntries as any[]).length} entries</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-blue-700 font-bold">
                    {(machineEntries as any[]).reduce((sum, e) => sum + (e.parts_produced || 0), 0).toLocaleString()} parts
                  </span>
                  <span className="text-gray-500">
                    {(machineEntries as any[]).reduce((sum, e) => sum + (e.machine_runtime_hours || 0), 0)}h runtime
                  </span>
                </div>
              </div>

              {/* Parts table */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50/50">
                    <tr className="text-xs text-gray-400 uppercase">
                      <th className="px-4 py-2 text-left">Shift</th>
                      <th className="px-4 py-2 text-left">Part</th>
                      <th className="px-4 py-2 text-left">Description</th>
                      <th className="px-4 py-2 text-left">Demand</th>
                      <th className="px-4 py-2 text-right">Produced</th>
                      <th className="px-4 py-2 text-right">Runtime</th>
                      <th className="px-4 py-2 text-right">Downtime</th>
                      <th className="px-4 py-2 text-center">Status</th>
                      <th className="px-4 py-2 text-center">DEO</th>
                      <th className="px-4 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(machineEntries as any[]).map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold border ${SHIFT_COLORS[entry.shift] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {entry.shift}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">
                          {entry.inventory_item?.sap_part_number || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate" title={entry.inventory_item?.part_description}>
                          {entry.inventory_item?.part_description || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            {entry.demand_formatted_id || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-blue-700">
                          {(entry.parts_produced || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{entry.machine_runtime_hours || 0}h</td>
                        <td className="px-4 py-3 text-right text-red-500">{entry.machine_downtime_hours || 0}h</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            entry.supervisor_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {entry.supervisor_verified ? '✓ Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">{entry.deo_name || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {!entry.supervisor_verified && (
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => openVerify(entry, 'approve')}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                              >✓</button>
                              <button
                                onClick={() => openVerify(entry, 'reject')}
                                className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200"
                              >✗</button>
                            </div>
                          )}
                          {entry.supervisor_verified && entry.verification_notes && (
                            <span className="text-[10px] text-gray-400 italic">{entry.verification_notes}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verify Modal */}
      {verifyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className={`p-5 rounded-t-2xl text-white ${verifyAction === 'approve' ? 'bg-green-600' : 'bg-red-600'}`}>
              <h2 className="text-lg font-bold">
                {verifyAction === 'approve' ? '✓ Verify Entry' : '✗ Reject Entry'}
              </h2>
              <p className="text-sm opacity-80 mt-0.5">
                {verifyItem.inventory_item?.sap_part_number} · {verifyItem.shift}
              </p>
            </div>
            <div className="p-5">
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500">Parts Produced</span>
                  <span className="font-bold text-blue-700">{(verifyItem.parts_produced || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Runtime</span>
                  <span className="font-bold">{verifyItem.machine_runtime_hours}h</span>
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {verifyAction === 'approve' ? 'Notes (optional)' : 'Rejection Reason *'}
              </label>
              <textarea
                value={verifyNotes}
                onChange={e => setVerifyNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={verifyAction === 'approve' ? 'Any notes...' : 'Reason for rejection...'}
              />
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setVerifyItem(null)}
                className="flex-1 rounded-lg border border-gray-300 text-gray-600 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={processing}
                className={`flex-1 rounded-lg text-white py-2 text-sm font-medium disabled:opacity-50 ${
                  verifyAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing ? '...' : verifyAction === 'approve' ? 'Confirm Verify' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorMachineMonitorPage;
