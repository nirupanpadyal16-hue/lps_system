import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Loader2,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Package,
  Calendar,
  Zap,
  Box,
  History,
  MoreVertical,
  Check
} from 'lucide-react';
import { ppcApi } from '../../api/newRolesApi';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface RMRequest {
  created_at: string;
  id: number;
  formatted_id: string;
  demand_formatted_id: string;
  inventory_item: {
    sap_part_number: string;
    part_number?: string;
    vehicle_name?: string;
    demand_quantity?: number;
    part_description?: string;
    master_material_data?: Record<string, any>;
  };
  rm_grade: string;
  rm_size: string;
  rm_thk_mm: string;
  sheet_width: string;
  sheet_length: string;
  no_of_comp_per_sheet?: string;
  act_rm_sizes?: string;
  status: string;
  ppc_notes: string;
  rejection_reason?: string;
  sk_notes?: string;
  submitted_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  'PENDING': { label: 'PENDING', bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-300' },
  'SUBMITTED': { label: 'SUBMITTED', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  'ACCEPTED': { label: 'ACCEPTED', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  'REJECTED': { label: 'REJECTED', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' },
};

const PPCRMRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<RMRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDemandId, setSelectedDemandId] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, selectedDate, selectedDemandId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await ppcApi.getRMRequests();
      setRequests(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load RM requests');
    } finally {
      setLoading(false);
    }
  };

  const demandDropdownOptions = useMemo(() => {
    const map = new Map<string, { model: string; demandId: string }>();
    requests.forEach(r => {
      const model = r.inventory_item?.vehicle_name || '—';
      const demandId = r.demand_formatted_id;
      if (demandId) {
        map.set(demandId, { model, demandId });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.model.localeCompare(b.model));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesSearch =
        req.formatted_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.inventory_item?.sap_part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.demand_formatted_id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && (req.status === 'PENDING' || req.status === 'SUBMITTED')) ||
        (statusFilter === 'SUBMITTED' && req.status === 'SUBMITTED') ||
        (statusFilter === 'COMPLETED' && (req.status === 'ACCEPTED' || req.status === 'REJECTED'));

      const matchesDemand =
        selectedDemandId === 'ALL' ||
        req.demand_formatted_id === selectedDemandId;

      const dateToUse = req.submitted_at || req.created_at;
      const matchesDate = !selectedDate || (() => {
        if (!dateToUse) return false;
        const reqDate = new Date(dateToUse);
        const year = reqDate.getFullYear();
        const month = String(reqDate.getMonth() + 1).padStart(2, '0');
        const day = String(reqDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}` === selectedDate;
      })();

      return matchesSearch && matchesStatus && matchesDate && matchesDemand;
    });
  }, [requests, searchTerm, statusFilter, selectedDate, selectedDemandId]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'PENDING' || r.status === 'SUBMITTED').length,
      accepted: requests.filter(r => r.status === 'ACCEPTED').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length,
    };
  }, [requests]);

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-ind-bg flex flex-col h-[calc(100vh-96px)] overflow-hidden">
      {/* Header Section */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 transition-all">
        <div className="flex xl:flex-row xl:items-center justify-between gap-4 bg-white py-1 px-4 ml-2 mb-1">
          <div className="p-2">
            <h1 className="text-[24px] font-black text-slate-800 tracking-tight leading-none">
              RM Request History
            </h1>
          </div>

          {/* Stats Dashboard */}
          <div className="flex items-center bg-white rounded-2xl border border-slate-100 p-1 shadow-sm overflow-hidden scale-90 origin-right mx-2">
            <div className="px-4 py-1 text-center border-r border-slate-50">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">TOTAL</span>
              <span className="block text-lg font-black text-slate-800 leading-none">{stats.total}</span>
            </div>
            <div className="px-4 py-1 text-center border-r border-slate-50 text-amber-500">
              <span className="block text-[8px] font-black uppercase tracking-wider opacity-60">PENDING</span>
              <span className="block text-lg font-black leading-none">{stats.pending}</span>
            </div>
            <div className="px-4 py-1 text-center border-r border-slate-50 text-emerald-500">
              <span className="block text-[8px] font-black uppercase tracking-wider opacity-60">ACCEPTED</span>
              <span className="block text-lg font-black leading-none">{stats.accepted}</span>
            </div>
            <div className="px-4 py-1 text-center text-rose-500">
              <span className="block text-[8px] font-black uppercase tracking-wider opacity-60">REJECTED</span>
              <span className="block text-lg font-black leading-none">{stats.rejected}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-2 py-2 flex items-center gap-2 flex-shrink-0 bg-white border-b border-slate-100">
          {/* Status Dropdown */}
          <div className="relative group min-w-[180px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center">
              <Box size={12} strokeWidth={2.5} className="text-orange-500" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 pl-11 pr-8 bg-white border border-slate-200/80 rounded-full text-xs font-bold text-slate-700 outline-none appearance-none shadow-sm cursor-pointer focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all hover:bg-slate-50/30"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="SUBMITTED">Submitted</option>
            </select>
            <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={12} strokeWidth={2.5} />
          </div>

          {/* Select Model & Demand Dropdown */}
          <div className="relative group min-w-[220px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center">
              <Filter size={12} strokeWidth={2.5} className="text-orange-500" />
            </div>
            <select
              value={selectedDemandId}
              onChange={(e) => setSelectedDemandId(e.target.value)}
              className="w-full h-11 pl-11 pr-8 bg-white border border-slate-200/80 rounded-full text-xs font-bold text-slate-700 outline-none appearance-none shadow-sm cursor-pointer focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all hover:bg-slate-50/30"
            >
              <option value="ALL">Select Model</option>
              {demandDropdownOptions.map(opt => (
                <option key={opt.demandId} value={opt.demandId}>
                  {opt.model} — {opt.demandId}
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={12} strokeWidth={2.5} />
          </div>

          {/* Search Bar */}
          <div className="relative group flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by ID, Part #, Demand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200/80 rounded-full text-xs font-medium text-slate-700 outline-none shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all hover:bg-slate-50/30"
            />
          </div>

          {/* Date Selector */}
          <div className="relative group min-w-[180px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
              <Calendar size={12} strokeWidth={2.5} className="text-blue-500" />
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200/80 rounded-full text-xs font-bold text-slate-700 outline-none shadow-sm cursor-pointer focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all hover:bg-slate-50/30"
            />
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 mx-2 mb-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col mt-2">
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[1800px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-ind-bg text-black border-b-2 border-[#f37021] uppercase text-[11px] tracking-wider sticky top-0 z-[50]">
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">SR No.</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">REQUEST ID</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">VEHICLE MODEL</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">DEMAND QTY</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">SAP PART NUMBER</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">PART NUMBER</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">RM THK MM</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">SHEET WIDTH</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">SHEET LENGTH</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">NO OF COMP PER SHEET</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">RM SIZE</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">RM GRADE</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">ACT RM SIZES</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">REVISED</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">STATUS</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">SUBMITTED DATE</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">NOTES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={17} className="py-20 text-center">
                    <Loader2 className="animate-spin text-orange-400 mx-auto mb-3" size={32} strokeWidth={2} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Syncing Requests...</span>
                  </td>
                </tr>
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-32 text-center text-slate-300">
                    <LayoutGrid size={48} strokeWidth={1} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-black uppercase tracking-widest">No RM requests found</p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req, idx) => {
                  const config = STATUS_CONFIG[req.status] || STATUS_CONFIG['PENDING'];

                  return (
                    <motion.tr
                      key={req.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.01, 0.3) }}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4 text-[11px] font-black text-slate-600 whitespace-nowrap">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-black text-blue-600 whitespace-nowrap">
                        {req.formatted_id}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase whitespace-nowrap">
                        {req.inventory_item?.vehicle_name || '—'}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                        {req.inventory_item?.demand_quantity || 0}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-black text-orange-500 whitespace-nowrap">
                        {req.inventory_item?.sap_part_number}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        {req.inventory_item?.part_number || req.inventory_item?.part_description || '—'}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {req.rm_thk_mm ? `${req.rm_thk_mm}mm` : '—'}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {req.sheet_width || '—'}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {req.sheet_length || '—'}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {req.no_of_comp_per_sheet || '—'}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {req.rm_size || '—'}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {req.rm_grade || '—'}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {req.act_rm_sizes || '—'}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {req.inventory_item?.master_material_data?.Revised || req.inventory_item?.master_material_data?.revised || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase", config.bg, config.text)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", config.dot)} />
                          {config.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[10px] font-bold text-slate-700">
                        {req.submitted_at ? new Date(req.submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '—'}
                      </td>
                      <td className="px-6 py-4 max-w-[250px]">
                        {req.status === 'REJECTED' && req.rejection_reason ? (
                          <div className="p-2 bg-rose-50 rounded-lg border border-rose-100">
                            <p className="text-[9px] font-black text-rose-600 uppercase mb-0.5">REJECTION REASON</p>
                            <p className="text-[10px] font-bold text-rose-700 leading-tight">{req.rejection_reason}</p>
                          </div>
                        ) : req.status === 'ACCEPTED' && req.sk_notes ? (
                          <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                            <p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5">STORE KEEPER NOTES</p>
                            <p className="text-[10px] font-bold text-emerald-700 leading-tight">{req.sk_notes}</p>
                          </div>
                        ) : req.ppc_notes ? (
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] font-medium text-slate-500 italic leading-tight truncate animate-none" title={req.ppc_notes}>
                              "{req.ppc_notes}"
                            </p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">No notes</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredRequests.length > 0 && (
          <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 bg-white border-t z-10">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Showing{" "}
              <span className="text-orange-500">
                {filteredRequests.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
              </span>
              {" "}to{" "}
              <span className="text-orange-500">
                {Math.min(currentPage * itemsPerPage, filteredRequests.length)}
              </span>
              {" "}of{" "}
              <span className="text-orange-500">
                {filteredRequests.length}
              </span>
              {" "}entries
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-3">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Prev
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400">PAGE</span>
                  <span className="text-[11px] font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-md min-w-[24px] text-center">
                    {currentPage}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OF {totalPages}</span>
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PPCRMRequestsPage;
