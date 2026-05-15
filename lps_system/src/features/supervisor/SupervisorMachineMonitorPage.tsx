import { useState, useEffect } from 'react';
import { supervisorMachineApi } from '../../api/newRolesApi';
import DEOShortagePartsPage from '../deo/DEOShortagePartsPage';
import { Calendar, Factory, CheckCircle2, XCircle, Loader2, RefreshCw, Eye, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const SHIFTS = ['Shift 1', 'Shift 2', 'Shift 3'];
const SHIFT_COLORS: Record<string, string> = {
  'Shift 1': 'bg-amber-50 border-amber-200 text-amber-700',
  'Shift 2': 'bg-orange-50 border-orange-200 text-orange-700',
  'Shift 3': 'bg-indigo-50 border-indigo-200 text-indigo-700',
};

type TabId = 'parts' | 'entries';

export default function SupervisorMachineMonitorPage() {
  const [activeTab, setActiveTab] = useState<TabId>('parts');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftFilter, setShiftFilter] = useState('all');

  // Verify modal state
  const [verifyItem, setVerifyItem] = useState<any | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED');
  const [verifyNotes, setVerifyNotes] = useState('');
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

  useEffect(() => { if (activeTab === 'entries') fetchEntries(); }, [selectedDate, shiftFilter, activeTab]);

  // Group entries by machine
  const grouped = entries.reduce((acc, entry) => {
    const key = entry.machine_name || entry.inventory_item?.machine_group || 'Unknown Machine';
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {} as Record<string, any[]>);

  const openVerify = (entry: any, status: 'VERIFIED' | 'REJECTED') => {
    setVerifyItem(entry);
    setVerifyStatus(status);
    setVerifyNotes('');
  };

  const handleVerify = async () => {
    if (!verifyItem) return;
    if (verifyStatus === 'REJECTED' && !verifyNotes.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setProcessing(true);
    try {
      await supervisorMachineApi.verifyEntry(verifyItem.id, {
        status: verifyStatus,
        notes: verifyNotes,
        reason: verifyNotes,
      });
      toast.success(verifyStatus === 'VERIFIED' ? 'Entry verified ✓' : 'Entry rejected — sent back to DEO');
      setVerifyItem(null);
      fetchEntries();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const totalParts = entries.reduce((s, e) => s + (e.parts_produced || 0), 0);
  const pending = entries.filter(e => e.status === 'PENDING').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Production Monitor</h1>
          <p className="text-sm text-slate-500 mt-1">Supervisor view — observe and verify DEO production data</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'entries' && (
            <>
              <div className="text-center px-3 py-2 rounded-xl bg-blue-50 border border-blue-100">
                <div className="text-lg font-black text-blue-700">{totalParts.toLocaleString()}</div>
                <div className="text-[10px] text-blue-400 uppercase">Total Produced</div>
              </div>
              {pending > 0 && (
                <div className="text-center px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-lg font-black text-amber-700">{pending}</div>
                  <div className="text-[10px] text-amber-400 uppercase">To Verify</div>
                </div>
              )}
              <button onClick={fetchEntries} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-400 transition-all">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 w-fit">
        {([
          { id: 'parts', label: 'Shortage Parts', icon: Factory },
          { id: 'entries', label: 'DEO Entries', icon: Eye },
        ] as { id: TabId; label: string; icon: any }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Shortage Parts (read-only) */}
      {activeTab === 'parts' && (
        <DEOShortagePartsPage readOnly={true} />
      )}

      {/* Tab: DEO Entries */}
      {activeTab === 'entries' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="text-sm font-medium text-slate-700 bg-transparent focus:outline-none"
              />
            </div>
            <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white">
              {['all', ...SHIFTS].map(s => (
                <button
                  key={s}
                  onClick={() => setShiftFilter(s)}
                  className={`px-4 py-2 text-xs font-bold transition-colors ${
                    shiftFilter === s ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {s === 'all' ? 'All Shifts' : s}
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-slate-400">{entries.length} entries</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={32} className="animate-spin text-orange-400" />
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-24 text-slate-300">
              <Factory size={56} strokeWidth={1} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm font-black uppercase tracking-widest">No entries for {selectedDate}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([machineName, machineEntries]) => (
                <div key={machineName} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                        <Factory size={14} className="text-white" />
                      </div>
                      <h3 className="font-black text-slate-800 text-sm">{machineName}</h3>
                      <span className="text-xs text-slate-400">{(machineEntries as any[]).length} entries</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-blue-700 text-sm">
                        {(machineEntries as any[]).reduce((s, e) => s + (e.parts_produced || 0), 0).toLocaleString()} pcs
                      </span>
                      <span className="text-xs text-slate-400">
                        {(machineEntries as any[]).reduce((s, e) => s + (e.machine_runtime_mins || 0) / 60, 0).toFixed(1)}h runtime
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 uppercase text-[10px] tracking-wider bg-slate-50/50">
                          <th className="px-4 py-2.5 text-left font-black">Shift</th>
                          <th className="px-4 py-2.5 text-left font-black">Part No.</th>
                          <th className="px-4 py-2.5 text-left font-black">Description</th>
                          <th className="px-4 py-2.5 text-left font-black">Demand</th>
                          <th className="px-4 py-2.5 text-right font-black">Produced</th>
                          <th className="px-4 py-2.5 text-right font-black">Runtime</th>
                          <th className="px-4 py-2.5 text-center font-black">DEO</th>
                          <th className="px-4 py-2.5 text-center font-black">Status</th>
                          <th className="px-4 py-2.5 text-center font-black">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(machineEntries as any[]).map(entry => (
                          <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black border ${SHIFT_COLORS[entry.shift] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {entry.shift}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-orange-600">
                              {entry.sap_part_number || entry.inventory_item?.sap_part_number || '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">
                              {entry.inventory_item?.part_description || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                {entry.demand_formatted_id || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-blue-700">
                              {(entry.parts_produced || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">{((entry.machine_runtime_mins || 0)/60).toFixed(1)}h</td>
                            <td className="px-4 py-3 text-center text-slate-500 text-xs font-medium">{entry.deo_name || '—'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                entry.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' :
                                entry.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                                'bg-amber-50 text-amber-700'
                              }`}>
                                {entry.status === 'VERIFIED' ? '✓ Verified' : entry.status === 'REJECTED' ? 'Rejected' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {entry.status === 'PENDING' && (
                                <div className="flex justify-center gap-1.5">
                                  <button
                                    onClick={() => openVerify(entry, 'VERIFIED')}
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
                                    title="Verify"
                                  >
                                    <CheckCircle2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => openVerify(entry, 'REJECTED')}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                                    title="Reject"
                                  >
                                    <XCircle size={13} />
                                  </button>
                                </div>
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
        </>
      )}

      {/* Verify Modal */}
      {verifyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className={`p-5 text-white ${verifyStatus === 'VERIFIED' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-rose-500 to-rose-600'}`}>
              <h2 className="text-base font-black">
                {verifyStatus === 'VERIFIED' ? '✓ Verify Entry' : '✗ Reject Entry — Return to DEO'}
              </h2>
              <p className="text-sm opacity-80 mt-0.5">
                {verifyItem.sap_part_number || verifyItem.inventory_item?.sap_part_number} · {verifyItem.shift}
              </p>
            </div>
            <div className="p-5">
              <div className="bg-slate-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Parts Produced</div>
                  <div className="font-black text-blue-700">{(verifyItem.parts_produced || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Machine</div>
                  <div className="font-bold text-slate-700">{verifyItem.machine_name || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">DEO</div>
                  <div className="font-bold text-slate-700">{verifyItem.deo_name || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Runtime</div>
                  <div className="font-bold text-slate-700">{verifyItem.machine_runtime_hours || 0}h</div>
                </div>
              </div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {verifyStatus === 'VERIFIED' ? 'Notes (optional)' : 'Rejection Reason * (DEO will see this)'}
              </label>
              <textarea
                value={verifyNotes}
                onChange={e => setVerifyNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                placeholder={verifyStatus === 'VERIFIED' ? 'Any notes...' : 'Reason for rejection...'}
              />
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setVerifyItem(null)}
                className="flex-1 rounded-xl border border-slate-200 text-slate-600 py-2.5 text-sm font-bold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={processing}
                className={`flex-1 rounded-xl text-white py-2.5 text-sm font-black shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 ${
                  verifyStatus === 'VERIFIED' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
                }`}
              >
                {processing && <Loader2 size={14} className="animate-spin" />}
                {verifyStatus === 'VERIFIED' ? 'Confirm Verify' : 'Reject & Return to DEO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
