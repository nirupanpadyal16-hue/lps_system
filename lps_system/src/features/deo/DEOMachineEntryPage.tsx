import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Save, History, Search, Filter, 
  ChevronDown, Calendar, Clock, AlertCircle, CheckCircle2,
  Factory, Wrench, Package, ArrowRight
} from 'lucide-react';
import { deoMachineApi } from '../../api/newRolesApi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

const SHIFT_LABELS: Record<string, string> = {
  'Shift 1': '🌅 Shift 1 (06:00 – 14:00)',
  'Shift 2': '🌇 Shift 2 (14:00 – 22:00)',
  'Shift 3': '🌙 Shift 3 (22:00 – 06:00)',
};

interface SubMachineRow {
  subMachineName: string;
  machineId: string;
  partNo: string;
  inventoryItemId: string;
  totalProduction: string;
}

interface EntryForm {
  date: string;
  shift: string;
  machineId: string; // This will now represent the Production Line (Parent)
  machineName: string;
  rows: SubMachineRow[];
  remarks: string;
}

const DEOMachineEntryPage: React.FC = () => {
  const [shiftInfo, setShiftInfo] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const blankForm = (): EntryForm => ({
    date: new Date().toISOString().split('T')[0],
    shift: '',
    machineId: '',
    machineName: '',
    rows: [{ subMachineName: '', machineId: '', partNo: '', inventoryItemId: '', totalProduction: '' }],
    remarks: '',
  });
  const [form, setForm] = useState<EntryForm>(blankForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shiftRes, entriesRes, linesRes] = await Promise.all([
        deoMachineApi.getShiftInfo(),
        deoMachineApi.getEntries(),
        fetch('http://localhost:5007/api/admin/lines', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json())
      ]);

      const si = shiftRes.data;
      setShiftInfo(si);
      setForm(f => ({ ...f, shift: si?.shift || si?.current_shift || 'Shift 1' }));
      setEntries(entriesRes.data?.data || []);
      
      // USER REQUEST: Only show parts that have a shortage/new demand
      // We filter inventory items to show only those with an active demand_id or marked as shortage
      const allItems = entriesRes.data?.inventory_items || [];
      const shortageItems = allItems.filter((it: any) => it.demand_id || it.is_shortage);
      setInventoryItems(shortageItems);

      setMachines(linesRes.data || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleMachineChange = (id: string) => {
    const m = machines.find(item => String(item.id) === id);
    setForm(f => ({ 
      ...f, 
      machineId: id, 
      machineName: m?.name || '',
      rows: f.rows.map(r => ({ ...r, machineId: '', subMachineName: '' }))
    }));
  };

  const addRow = () => setForm(f => ({ ...f, rows: [...f.rows, { subMachineName: '', machineId: '', partNo: '', inventoryItemId: '', totalProduction: '' }] }));
  const removeRow = (i: number) => setForm(f => ({ ...f, rows: f.rows.filter((_, idx) => idx !== i) }));
  const updateRow = (i: number, field: keyof SubMachineRow, value: string) =>
    setForm(f => ({ ...f, rows: f.rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = form.rows.filter(r => r.inventoryItemId && r.totalProduction);
    if (!form.shift || validRows.length === 0) {
      toast.error('Please fill Shift and at least one complete row');
      return;
    }
    setSubmitting(true);
    try {
      await Promise.all(validRows.map(row =>
        deoMachineApi.createEntry({
          inventory_item_id: parseInt(row.inventoryItemId),
          machine_id: parseInt(row.machineId || form.machineId),
          shift: form.shift,
          parts_produced: parseFloat(row.totalProduction) || 0,
          deo_notes: form.remarks,
          date: form.date,
          sap_part_number: row.partNo
        })
      ));
      toast.success('Production entries saved!');
      setShowForm(false);
      setForm(blankForm());
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHistory = useMemo(() => {
    if (!searchQuery) return entries;
    const s = searchQuery.toLowerCase();
    return entries.filter(e => 
      e.sap_part_number?.toLowerCase().includes(s) || 
      e.machine_name?.toLowerCase().includes(s)
    );
  }, [entries, searchQuery]);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <Factory className="text-orange-500 animate-pulse" size={24} />
            </div>
        </div>
        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Synchronizing Floor Data...</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Factory size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Machine Registry</h1>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-0.5">Shortage-First Production Log</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-3 flex items-center gap-4">
            <div>
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Shift</div>
              <div className="text-xs font-black text-slate-900">{SHIFT_LABELS[shiftInfo?.current_shift] || 'Shift 1'}</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-right">
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Entries</div>
              <div className="text-xs font-black text-orange-600">{entries.length}</div>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> New Entry
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Panel */}
        <AnimatePresence>
          {showForm && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="lg:col-span-2 space-y-6"
            >
              <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-orange-600 shadow-sm">
                      <Wrench size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Production Entry Form</h2>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Recording metrics for shortage parts</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                    <ChevronDown size={20} />
                  </button>
                </div>

                <div className="p-8 space-y-8">
                  {/* Grid fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Work Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 text-slate-400" size={14} />
                        <input
                          type="date"
                          value={form.date}
                          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Select Shift</label>
                      <select
                        value={form.shift}
                        onChange={e => setForm(f => ({ ...f, shift: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none"
                      >
                        {Object.entries(SHIFT_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">SELECT MACHINE</label>
                      <div className="relative">
                        <select
                          value={form.machineId}
                          onChange={e => handleMachineChange(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none"
                        >
                          <option value="">Select Production Line...</option>
                          {machines.filter(m => !m.parent_id).map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={14} />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Table */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Production Rows (Demand Parts Only)</label>
                      <button type="button" onClick={addRow} className="text-[9px] font-black text-orange-600 flex items-center gap-1.5 hover:bg-orange-50 px-2 py-1 rounded-md transition-all">
                        <Plus size={12} /> ADD ROW
                      </button>
                    </div>

                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50">
                          <tr className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <th className="px-4 py-3">SUB MACHINE</th>
                            <th className="px-4 py-3">SHORTAGE PART (SAP)</th>
                            <th className="px-4 py-3 text-center">PRODUCTION QTY</th>
                            <th className="px-4 py-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {form.rows.map((row, i) => (
                            <tr key={i} className="group hover:bg-slate-50/30 transition-colors">
                              <td className="px-4 py-3">
                                <select
                                  value={row.machineId}
                                  onChange={e => {
                                    const m = machines.find(line => String(line.id) === form.machineId)
                                              ?.children?.find((c: any) => String(c.id) === e.target.value);
                                    updateRow(i, 'machineId', e.target.value);
                                    if (m) updateRow(i, 'subMachineName', m.name);
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                >
                                  <option value="">Select machine...</option>
                                  {machines.find(m => String(m.id) === form.machineId)?.children?.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={row.inventoryItemId}
                                  onChange={e => {
                                    const item = inventoryItems.find(it => String(it.id) === e.target.value);
                                    updateRow(i, 'inventoryItemId', e.target.value);
                                    if (item) updateRow(i, 'partNo', item.sap_part_number);
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                >
                                  <option value="">Select Part...</option>
                                  {inventoryItems.map(it => (
                                    <option key={it.id} value={it.id}>{it.sap_part_number} - {it.part_description}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center">
                                  <input
                                    type="number"
                                    value={row.totalProduction}
                                    onChange={e => updateRow(i, 'totalProduction', e.target.value)}
                                    placeholder="000"
                                    className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold text-center focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {form.rows.length > 1 && (
                                  <button type="button" onClick={() => removeRow(i)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Submission Notes</label>
                    <textarea
                      value={form.remarks}
                      onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                      placeholder="Enter production notes or shift highlights..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 min-h-[100px] resize-none"
                    />
                  </div>
                </div>

                <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-slate-900 hover:bg-black text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? <Clock className="animate-spin" size={14} /> : <Save size={16} />}
                    Submit Production
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List Panel */}
        <div className={cn("space-y-6", showForm ? "lg:col-span-1" : "lg:col-span-3")}>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="text-slate-400" size={18} />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Recent Machine Logs</h3>
              </div>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-350px)] custom-scrollbar">
              {filteredHistory.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4">
                    <Package size={24} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No entries found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredHistory.map((entry) => (
                    <div key={entry.id} className="p-6 hover:bg-slate-50/50 transition-all group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded uppercase tracking-widest">
                              {entry.shift}
                            </span>
                            <span className="text-[10px] font-black text-slate-900 uppercase">{entry.machine_name}</span>
                          </div>
                          <p className="text-xs font-black text-slate-700">{entry.sap_part_number}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold truncate max-w-[200px]">
                            {entry.inventory_item?.part_description || 'No description'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-slate-900 leading-none mb-1">{entry.parts_produced}</div>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">UNITS</div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                          entry.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                        }`}>
                          {entry.status === 'VERIFIED' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {entry.status}
                        </div>
                        <span className="text-[8px] font-black text-slate-300 tabular-nums">
                          {new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DEOMachineEntryPage;
