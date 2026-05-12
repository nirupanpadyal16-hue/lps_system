/*
import React, { useState, useEffect } from 'react';
import { deoMachineApi } from '../../api/newRolesApi';
import toast from 'react-hot-toast';

const SHIFT_LABELS: Record<string, string> = {
  'Shift 1': '🌅 Shift 1 (06:00 – 14:00)',
  'Shift 2': '🌇 Shift 2 (14:00 – 22:00)',
  'Shift 3': '🌙 Shift 3 (22:00 – 06:00)',
};

const DEOMachineEntryPage: React.FC = () => {
  const [shiftInfo, setShiftInfo] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    inventory_item_id: '',
    shift: '',
    parts_produced: '',
    machine_runtime_hours: '',
    machine_downtime_hours: '',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shiftRes, entriesRes] = await Promise.all([
        deoMachineApi.getShiftInfo(),
        deoMachineApi.getEntries(),
      ]);
      const si = shiftRes.data;
      setShiftInfo(si);
      setForm(f => ({ ...f, shift: si?.current_shift || '' }));
      setEntries(entriesRes.data?.data || []);
      setInventoryItems(entriesRes.data?.inventory_items || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.inventory_item_id || !form.shift || !form.parts_produced) {
      toast.error('Please fill Part, Shift, and Parts Produced');
      return;
    }
    setSubmitting(true);
    try {
      await deoMachineApi.createEntry({
        inventory_item_id: parseInt(form.inventory_item_id),
        shift: form.shift,
        parts_produced: parseFloat(form.parts_produced) || 0,
        machine_runtime_hours: parseFloat(form.machine_runtime_hours) || 0,
        machine_downtime_hours: parseFloat(form.machine_downtime_hours) || 0,
        notes: form.notes,
      });
      toast.success('Production entry saved!');
      setForm(f => ({ ...f, inventory_item_id: '', parts_produced: '', machine_runtime_hours: '', machine_downtime_hours: '', notes: '' }));
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Machine Production Entry</h1>
        <p className="text-sm text-gray-500 mt-1">{todayStr}</p>
      </div>

      {shiftInfo && (
        <div className={`mb-6 rounded-2xl p-4 flex items-center justify-between ${
          shiftInfo.current_shift === 'Shift 1' ? 'bg-amber-50 border border-amber-200' :
          shiftInfo.current_shift === 'Shift 2' ? 'bg-orange-50 border border-orange-200' :
          'bg-indigo-50 border border-indigo-200'
        }`}>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Active Shift</div>
            <div className="text-lg font-black text-gray-800">{SHIFT_LABELS[shiftInfo.current_shift] || shiftInfo.current_shift}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Entries today</div>
            <div className="text-2xl font-black text-gray-700">{entries.filter(e => e.shift === shiftInfo.current_shift).length}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">Add Production Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Part *</label>
                <select
                  value={form.inventory_item_id}
                  onChange={e => setForm(f => ({ ...f, inventory_item_id: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select a part...</option>
                  {inventoryItems.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.sap_part_number} — {item.part_description?.slice(0, 30)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Shift *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Shift 1', 'Shift 2', 'Shift 3'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, shift: s }))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        form.shift === s
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {s}
                      {shiftInfo?.current_shift === s && (
                        <span className="ml-1 text-[9px] opacity-70">(now)</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Parts Produced *</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.parts_produced}
                  onChange={e => setForm(f => ({ ...f, parts_produced: e.target.value }))}
                  placeholder="e.g. 450"
                  required
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Runtime (hrs)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.machine_runtime_hours}
                    onChange={e => setForm(f => ({ ...f, machine_runtime_hours: e.target.value }))}
                    placeholder="e.g. 7.5"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Downtime (hrs)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.machine_downtime_hours}
                    onChange={e => setForm(f => ({ ...f, machine_downtime_hours: e.target.value }))}
                    placeholder="e.g. 0.5"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any issues or remarks..."
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-blue-600 text-white py-3 text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {submitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : '📝'} Save Entry
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">Today's Entries</h2>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm">No entries for today yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
                {entries.map(entry => (
                  <div key={entry.id} className={`rounded-xl border p-4 ${
                    entry.shift === 'Shift 1' ? 'border-amber-100 bg-amber-50/30' :
                    entry.shift === 'Shift 2' ? 'border-orange-100 bg-orange-50/30' :
                    'border-indigo-100 bg-indigo-50/30'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                            {entry.shift}
                          </span>
                          <span className="font-mono text-xs font-semibold text-gray-800">
                            {entry.inventory_item?.sap_part_number}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          {entry.inventory_item?.part_description?.slice(0, 50)}
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center bg-white rounded-lg py-1.5 px-2 border border-gray-100">
                            <div className="text-[10px] text-gray-400">Produced</div>
                            <div className="text-sm font-black text-blue-700">{(entry.parts_produced || 0).toLocaleString()}</div>
                          </div>
                          <div className="text-center bg-white rounded-lg py-1.5 px-2 border border-gray-100">
                            <div className="text-[10px] text-gray-400">Runtime</div>
                            <div className="text-sm font-black text-gray-800">{entry.machine_runtime_hours || 0}h</div>
                          </div>
                          <div className="text-center bg-white rounded-lg py-1.5 px-2 border border-gray-100">
                            <div className="text-[10px] text-gray-400">Downtime</div>
                            <div className="text-sm font-black text-red-600">{entry.machine_downtime_hours || 0}h</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          entry.supervisor_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {entry.supervisor_verified ? '✓ Verified' : 'Pending'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {entry.created_at ? new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                    {entry.notes && (
                      <p className="mt-2 text-xs text-gray-400 italic">📝 {entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DEOMachineEntryPage;
*/

// Placeholder to avoid import errors
import React from 'react';
const DEOMachineEntryPage: React.FC = () => {
  return null;
};
export default DEOMachineEntryPage;
