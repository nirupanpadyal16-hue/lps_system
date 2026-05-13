import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Calendar,
  Clock,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Eye,
  History,
  LayoutGrid,
  ChevronDown,
  Package,
  FileText,
  RotateCcw,
  Send,
  Zap,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Plus,
  Check
} from 'lucide-react';
import { deoMachineApi } from '../../../api/newRolesApi';
import toast from 'react-hot-toast';
import { cn } from '../../../lib/utils';

const SHIFT_OPTIONS = [
  { id: 'All', label: 'All Shifts', icon: '🌍' },
  { id: 'Shift 1', label: 'Shift I', icon: '🌅' },
  { id: 'Shift 2', label: 'Shift II', icon: '🌇' },
  { id: 'Shift 3', label: 'Shift III', icon: '🌙' },
];

const STATUS_OPTIONS = [
  { id: 'All', label: 'All Status' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'VERIFIED', label: 'Completed' },
];

interface InventoryItem {
  id: number;
  sap_part_number: string;
  part_description: string;
  demand_id: number;
}

interface Machine {
  id: number;
  name: string;
  children: Array<{ id: number; name: string }>;
}

interface ProductionEntry {
  id?: number;
  date: string;
  shift: string;
  machine_id: string;
  machine_name: string;
  sub_machine_name: string;
  sap_part_number: string;
  parts_produced: number;
  machine_run_time?: number;
  deo_notes?: string;
  status: string;
  rejection_reason?: string;
}

const DEODailyProduction: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [historyEntries, setHistoryEntries] = useState<ProductionEntry[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Main View States
  const [filterDate, setFilterDate] = useState('');
  const [filterShift, setFilterShift] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formShift, setFormShift] = useState('Shift I');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [subMachineLogs, setSubMachineLogs] = useState<any[]>([]);
  const [remark, setRemark] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);

  const fetchData = async (dateOverride?: string) => {
    setLoading(true);
    const targetDate = dateOverride !== undefined ? dateOverride : filterDate;
    try {
      const [historyRes, inventoryRes, machinesRes] = await Promise.all([
        deoMachineApi.getEntries({ date: targetDate }),
        deoMachineApi.getInventory(),
        deoMachineApi.getMachines()
      ]);
      const mappedHistory = (historyRes.data?.data || []).map((e: any) => ({
        ...e,
        machine_run_time: e.machine_runtime_mins
      }));
      setHistoryEntries(mappedHistory);
      setInventoryItems(inventoryRes.data?.data || []);
      setMachines(machinesRes.data?.data || []);
    } catch (error) {
      toast.error('Failed to sync with terminal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterDate, filterShift]);

  useEffect(() => {
    if (selectedMachine && !isEditing) {
      const newLogs = selectedMachine.children.map((sm: any) => {
        return {
          id: sm.id,
          name: sm.name,
          part_id: '',
          sap_part_number: '',
          production: '',
          run_time: ''
        };
      });
      setSubMachineLogs(newLogs);
    }
  }, [selectedMachine, isEditing, inventoryItems]);

  const handleReset = () => {
    setSelectedMachine(null);
    setRemark('');
    setIsEditing(false);
    setEditingId(null);
    setRejectionReason(null);
    setEditingStatus(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormShift('Shift I');
    setSubMachineLogs([]);
  };

  const handleEdit = (entry: ProductionEntry) => {
    setIsEditing(true);
    setEditingId(entry.id || null);
    setFormDate(entry.date);
    setFormShift(entry.shift);
    setRemark(entry.deo_notes || '');
    setRejectionReason(entry.rejection_reason || null);
    setEditingStatus(entry.status);

    const part = inventoryItems.find(p => p.sap_part_number === entry.sap_part_number);

    setSubMachineLogs([{
      id: entry.machine_id || `temp_${Math.random()}`,
      name: entry.sub_machine_name || '',
      sap_part_number: entry.sap_part_number,
      part_id: part?.id.toString() || '',
      production: entry.parts_produced.toString(),
      run_time: entry.machine_run_time?.toString() || ''
    }]);

    const parentMachine = machines.find(m => m.children.some(c => c.id === parseInt(entry.machine_id)));
    setSelectedMachine(parentMachine || null);

    setShowFormModal(true);
  };

  const handleSubmit = async () => {
    const validLogs = subMachineLogs.filter(log => log.production);

    if (validLogs.length === 0) {
      toast.error('Please enter production quantity');
      return;
    }

    // Validation Check: Ensure all rows have a part number
    const missingSap = validLogs.find(log => !log.sap_part_number);
    if (missingSap) {
      toast.error(`Please enter SAP Part Number for all rows with production.`);
      return;
    }

    setSubmitting(true);
    try {
      for (const log of validLogs) {
        let mId = typeof log.id === 'string' && log.id.startsWith('temp_') ? null : log.id;

        // Intelligent ID Lookup: If manual entry, try to find the real machine ID by name
        if (!mId && log.name) {
          for (const m of machines) {
            const child = m.children.find(c => c.name.toLowerCase().trim() === log.name.toLowerCase().trim());
            if (child) {
              mId = child.id;
              break;
            }
            if (m.name.toLowerCase().trim() === log.name.toLowerCase().trim()) {
              mId = m.id;
              break;
            }
          }
        }

        const entryData = {
          inventory_item_id: log.part_id ? parseInt(log.part_id) : null,
          shift: formShift,
          date: formDate,
          parts_produced: parseFloat(log.production),
          machine_id: mId,
          sap_part_number: log.sap_part_number,
          machine_runtime_mins: log.run_time ? parseFloat(log.run_time) : null,
          deo_notes: remark
        };

        if (isEditing && editingId) {
          await deoMachineApi.updateMachineEntry(editingId, entryData);
        } else {
          await deoMachineApi.createEntry(entryData);
        }
      }
      setShowFormModal(false);
      setShowSuccess(true);
      setFilterDate(formDate);
      fetchData(formDate); // Force refresh with new date immediately
      handleReset();
    } catch (error) {
      toast.error('Failed to submit production');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHistory = useMemo(() => {
    return historyEntries.filter(entry => {
      const matchesSearch =
        entry.machine_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.sub_machine_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.sap_part_number?.toLowerCase().includes(searchTerm.toLowerCase());

      const entryShift = entry.shift.toLowerCase();
      const selectedShift = filterShift.toLowerCase();

      let matchesShift = filterShift === 'All';
      if (!matchesShift) {
        // Handle numeric to roman numeral matching
        const isShift1 = (selectedShift.includes('1') || selectedShift.includes('i')) && (entryShift.includes('1') || entryShift.includes('i'));
        const isShift2 = (selectedShift.includes('2') || selectedShift.includes('ii')) && (entryShift.includes('2') || entryShift.includes('ii'));
        const isShift3 = (selectedShift.includes('3') || selectedShift.includes('iii')) && (entryShift.includes('3') || entryShift.includes('iii'));
        matchesShift = isShift1 || isShift2 || isShift3;
      }

      // Status filtering
      const itemStatus = (entry.status || 'PENDING').toUpperCase();
      let matchesStatus = filterStatus === 'All';
      if (!matchesStatus) {
        if (filterStatus === 'VERIFIED') {
          matchesStatus = ['APPROVED', 'VERIFIED', 'READY', 'DONE'].includes(itemStatus);
        } else {
          matchesStatus = itemStatus === filterStatus;
        }
      }

      return matchesSearch && matchesShift && matchesStatus;
    });
  }, [historyEntries, searchTerm, filterShift, filterStatus]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getShiftLabel = (shift: string) => {
    const s = shift.toLowerCase();
    if (s.includes('1') || s.includes('i')) return 'I';
    if (s.includes('2') || s.includes('ii')) return 'II';
    if (s.includes('3') || s.includes('iii')) return 'III';
    return shift;
  };

  return (
    <div className="w-full bg-[#f8fafc] min-h-full font-sans relative">
      <div className="w-full space-y-4">
        {/* DASHBOARD HEADER */}
        <div className="sticky top-0 z-30 bg-white border-t border-ind-border/60 transition-all pb-2">
          {/* Top Row: Title & Stats */}
          <div className="flex xl:flex-row xl:items-center justify-between gap-4 bg-white border-b border-slate-100 mb-2 py-1 px-4">
            <div className="p-2">
              <h1 className="text-[24px] font-black text-ind-text tracking-tight leading-none">
                Daily Production Console
              </h1>
            </div>

            {/* Stats Dashboard */}
            <div className="flex items-center bg-white backdrop-blur-md rounded-2xl border border-ind-border/50 p-1 shadow-sm overflow-hidden scale-90 origin-right mx-2">
              <div className="px-4 py-1 text-center border-r border-ind-border/50">
                <span className="block text-[8px] font-bold text-ind-text3 uppercase tracking-wider">TOTAL LOGS</span>
                <span className="block text-lg font-black text-slate-800 leading-none">{historyEntries.length}</span>
              </div>
              <div className="px-4 py-1 text-center border-r border-ind-border/50 text-orange-500">
                <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">SHIFT I</span>
                <span className="block text-lg font-black leading-none">{historyEntries.filter(e => e.shift === 'Shift I').length}</span>
              </div>
              <div className="px-4 py-1 text-center border-r border-ind-border/50 text-blue-500">
                <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">SHIFT II</span>
                <span className="block text-lg font-black leading-none">{historyEntries.filter(e => e.shift === 'Shift II').length}</span>
              </div>
              <div className="px-4 py-1 text-center text-purple-500">
                <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">SHIFT III</span>
                <span className="block text-lg font-black leading-none">{historyEntries.filter(e => e.shift === 'Shift III').length}</span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Filters & Primary Action */}
          <div className="px-4 flex flex-col md:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative group w-full md:w-52">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f37021] transition-colors" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-[36px] bg-white border border-ind-border/60 rounded-full pl-9 pr-3 text-[10px] font-bold text-slate-700 outline-none focus:border-[#f37021] transition-all shadow-sm placeholder:text-slate-300"
                />
              </div>
              <div className="relative group w-full md:w-[160px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 bg-indigo-50/50 rounded text-indigo-400">
                  <Calendar size={10} />
                </div>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full bg-white border border-ind-border/60 focus:border-ind-primary rounded-full h-[36px] pl-10 pr-8 text-slate-700 font-bold text-[10px] tracking-wide outline-none transition-all shadow-sm"
                />
                {filterDate && (
                  <button onClick={() => setFilterDate('')} className="absolute right-8 top-1/2 -translate-y-1/2 text-[8px] font-black text-rose-500 px-1 bg-white hover:underline">CLEAR</button>
                )}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ind-text3 opacity-50">
                  <ChevronDown size={12} />
                </div>
              </div>

              <div className="relative group w-full md:w-36">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 bg-orange-50 rounded text-ind-primary">
                  <Clock size={10} />
                </div>
                <select
                  value={filterShift}
                  onChange={(e) => setFilterShift(e.target.value)}
                  className="w-full bg-white border border-ind-border/60 focus:border-ind-primary rounded-full h-[36px] pl-10 pr-8 text-slate-700 font-bold text-[10px] tracking-wide outline-none appearance-none cursor-pointer"
                >
                  {SHIFT_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ind-text3 opacity-50">
                  <ChevronDown size={12} />
                </div>
              </div>

              <div className="relative group w-full md:w-36">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 bg-orange-50 rounded text-ind-primary">
                  <CheckCircle2 size={10} />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-white border border-ind-border/60 focus:border-ind-primary rounded-full h-[36px] pl-10 pr-8 text-slate-700 font-bold text-[10px] tracking-wide outline-none appearance-none cursor-pointer"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ind-text3 opacity-50">
                  <ChevronDown size={12} />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                handleReset();
                setShowFormModal(true);
              }}
              className="w-full md:w-auto bg-gradient-to-r from-[#F37021] to-orange-600 text-white px-6 h-[36px] rounded-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 active:scale-95 transition-all"
            >
              <PlusCircle size={14} strokeWidth={2.5} />
              Daily Production log
            </button>
          </div>
        </div>

        {/* TABLE AREA */}
        <div className="px-2 pb-2">
          <div className="overflow-x-auto rounded-2xl border border-ind-border/50 shadow-sm h-[calc(100vh-220px)] overflow-y-auto bg-white transition-all custom-scrollbar flex flex-col">
            <div className="flex-1 overflow-auto">
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-ind-bg text-black border-b-2 border-[#f37021] uppercase text-[11px] tracking-wider sticky top-0 z-[50]">
                <tr>
                  <th className="px-6 py-2 text-left whitespace-nowrap">SR NO</th>
                  <th className="px-6 py-2 text-left whitespace-nowrap">MACHINE</th>
                  <th className="px-6 py-2 text-left whitespace-nowrap">SUBMACHINE</th>
                  <th className="px-6 py-2 text-left whitespace-nowrap">SAP PART NO</th>
                  <th className="px-6 py-2 text-right whitespace-nowrap">DAILY PRODUCTION</th>
                  <th className="px-6 py-2 text-right whitespace-nowrap">MACHINE RUN TIME</th>
                  <th className="px-6 py-2 text-center whitespace-nowrap">SHIFT</th>
                  <th className="px-6 py-2 text-center whitespace-nowrap">STATUS</th>
                  <th className="px-6 py-2 text-right whitespace-nowrap">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ind-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-32 text-center">
                      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <span className="text-xs font-black text-ind-text3 uppercase tracking-widest">Loading...</span>
                    </td>
                  </tr>
                ) : paginatedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-32 text-center opacity-40">
                      <LayoutGrid size={48} className="mx-auto mb-4" />
                      <span className="text-sm font-black uppercase tracking-widest">No production logs found</span>
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((entry, index) => (
                    <tr key={entry.id || index} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-3.5 text-xs font-black text-slate-700">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-xs text-slate-800 uppercase tracking-tight">
                        {entry.machine_name}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                          {entry.sub_machine_name || 'Manual'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs font-bold text-slate-500">
                        {entry.sap_part_number}
                      </td>
                      <td className="px-6 py-3.5 text-right font-black text-[#f37021]">
                        {entry.parts_produced}
                      </td>
                      <td className="px-6 py-3.5 text-right font-black text-blue-600">
                        {entry.machine_run_time || '0'} hrs
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={cn(
                          "px-4 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest",
                          entry.shift.toLowerCase().includes('1') || entry.shift.toLowerCase().includes('i') ? "bg-orange-50 text-orange-600 border-orange-100" :
                            entry.shift.toLowerCase().includes('2') || entry.shift.toLowerCase().includes('ii') ? "bg-blue-50 text-blue-600 border-blue-100" :
                              "bg-purple-50 text-purple-600 border-purple-100"
                        )}>
                          {getShiftLabel(entry.shift)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                          ['APPROVED', 'VERIFIED', 'READY', 'DONE'].includes((entry.status || 'PENDING').toUpperCase())
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-500/10"
                            : entry.status === 'REJECTED'
                              ? "bg-rose-50 text-rose-600 border-rose-100 shadow-sm shadow-rose-500/10"
                              : "bg-amber-50 text-amber-600 border-amber-100 shadow-sm shadow-amber-500/10"
                        )}>
                          {entry.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right transition-opacity">
                        <button
                          onClick={() => handleEdit(entry)}
                          disabled={['APPROVED', 'VERIFIED', 'READY', 'DONE'].includes((entry.status || 'PENDING').toUpperCase())}
                          className={cn(
                            "transition-all p-2 rounded-lg",
                            ['APPROVED', 'VERIFIED', 'READY', 'DONE'].includes((entry.status || 'PENDING').toUpperCase())
                              ? "text-slate-200 cursor-not-allowed bg-slate-50"
                              : "text-blue-600 hover:scale-110 hover:bg-blue-50"
                          )}
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          {filteredHistory.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white sticky bottom-0 z-[60]">
              <div className="flex items-center gap-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Showing <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredHistory.length)}</span> of <span className="text-slate-900">{filteredHistory.length}</span> logs
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 disabled:opacity-50 transition-all text-slate-600"
                >
                  Prev
                </button>

                <div className="flex items-center gap-1 mx-2">
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === page ? 'bg-[#f37021] text-white shadow-lg shadow-orange-500/20' : 'hover:bg-slate-100 text-slate-600'}`}
                        >
                          {page}
                        </button>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="text-slate-300 text-[10px] px-1">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 disabled:opacity-50 transition-all text-slate-600"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* MINIMAL SUCCESS POPUP */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                  <Check size={28} strokeWidth={3} />
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Entry Saved</h2>
              <p className="text-sm font-bold text-slate-400 mb-8">Data synchronized successfully</p>
              <button
                onClick={() => setShowSuccess(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PRODUCTION LOG MODAL */}
      <AnimatePresence>
        {showFormModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFormModal(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none p-4"
            >
              <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden pointer-events-auto border border-ind-border/50 flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-50 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xl shadow-orange-500/30">
                      <Zap size={18} fill="white" strokeWidth={0} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">
                        New Production Entry
                      </h2>
                    </div>
                  </div>
                  <button onClick={() => setShowFormModal(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-5 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Logging Date</label>
                      <div className="relative group">
                        <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                        <input
                          type="date"
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-xs font-black text-slate-800 outline-none focus:border-orange-400 transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Assigned Shift</label>
                      <div className="relative group">
                        <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <select
                          value={formShift}
                          onChange={(e) => setFormShift(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-10 text-xs font-black text-slate-800 outline-none appearance-none focus:border-orange-400 transition-all shadow-sm"
                        >
                          {SHIFT_OPTIONS.filter(opt => opt.id !== 'All').map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Production Machine</label>
                    <div className="relative group">
                      <Cpu size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <select
                        value={selectedMachine?.id || ''}
                        onChange={(e) => {
                          const m = machines.find(m => m.id === parseInt(e.target.value));
                          setSelectedMachine(m || null);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-10 text-xs font-black text-slate-800 outline-none appearance-none focus:border-orange-400 transition-all shadow-sm"
                      >
                        <option value="">Select Target Machine</option>
                        {machines.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Sub-Machine Matrix</label>


                    <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-inner">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100/30">
                          <tr>
                            <th className="px-5 py-3 text-[9px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">Sub Machine</th>
                            <th className="px-5 py-3 text-[9px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">SAP Part Number</th>
                            <th className="px-5 py-3 text-[9px] font-black text-slate-900 uppercase tracking-widest text-right whitespace-nowrap">Qty</th>
                            <th className="px-5 py-3 text-[9px] font-black text-slate-900 uppercase tracking-widest text-right whitespace-nowrap">Machine Run Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {subMachineLogs.map((log, idx) => (
                            <tr key={log.id} className="bg-white/50 hover:bg-white transition-colors">
                              <td className="px-5 py-3">
                                <input
                                  type="text"
                                  placeholder="Name"
                                  value={log.name}
                                  onChange={(e) => {
                                    const newLogs = [...subMachineLogs];
                                    const val = e.target.value;
                                    newLogs[idx].name = val;
                                    setSubMachineLogs(newLogs);
                                  }}
                                  className="w-full bg-white border border-ind-border/60 rounded-lg py-1.5 px-3 text-[11px] font-black text-slate-800 uppercase outline-none focus:border-orange-400"
                                />
                              </td>
                              <td className="px-5 py-3">
                                <div className="relative group">
                                  <input
                                    type="text"
                                    placeholder="Enter SAP Part No"
                                    value={log.sap_part_number}
                                    onChange={(e) => {
                                      const newLogs = [...subMachineLogs];
                                      const val = e.target.value.toUpperCase();
                                      newLogs[idx].sap_part_number = val;
                                      setSubMachineLogs(newLogs);
                                    }}
                                    className="w-full bg-white border border-ind-border/60 rounded-lg py-1.5 px-3 text-[11px] font-black text-slate-800 uppercase outline-none focus:border-orange-400"
                                  />

                                </div>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={log.production}
                                  onChange={(e) => {
                                    const newLogs = [...subMachineLogs];
                                    newLogs[idx].production = e.target.value;
                                    setSubMachineLogs(newLogs);
                                  }}
                                  className="w-20 bg-white border border-ind-border/60 rounded-lg py-1.5 px-3 text-[11px] font-black text-slate-800 text-right outline-none focus:border-orange-400"
                                />
                              </td>
                              <td className="px-5 py-3">
                                <input
                                  type="number"
                                  placeholder="Hours"
                                  value={log.run_time}
                                  onChange={(e) => {
                                    const newLogs = [...subMachineLogs];
                                    newLogs[idx].run_time = e.target.value;
                                    setSubMachineLogs(newLogs);
                                  }}
                                  className="w-20 bg-white border border-ind-border/60 rounded-lg py-1.5 px-3 text-[11px] font-black text-slate-800 text-right outline-none focus:border-orange-400"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Operator Remarks</label>
                    <div className="relative group">
                      <FileText size={14} className="absolute left-4 top-4 text-slate-400" />
                      <textarea
                        rows={2}
                        placeholder="Enter observations or downtime reasons..."
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-6 text-xs font-bold text-slate-700 outline-none focus:border-orange-400 transition-all shadow-sm resize-none"
                      />
                    </div>
                  </div>

                  {isEditing && editingStatus === 'REJECTED' && rejectionReason && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest ml-1">Supervisor Review Feedback</label>
                      <div className="relative group">
                        <AlertCircle size={14} className="absolute left-4 top-4 text-rose-400" />
                        <div className="w-full bg-rose-50/50 border border-rose-100 rounded-2xl py-3.5 pl-12 pr-6 text-xs font-bold text-rose-700 shadow-sm min-h-[60px]">
                          {rejectionReason}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex items-center gap-3">
                  <button onClick={handleReset} className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-400 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                    <RotateCcw size={16} /> Reset
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-[2] px-6 py-3 bg-orange-500 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={16} /> Submit Production</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DEODailyProduction;