import React, { useState, useEffect, useCallback } from 'react';
import { skApi } from '../../api/newRolesApi';
import toast from 'react-hot-toast';
import {
  Boxes, CheckCircle2, AlertTriangle, Clock, CheckCircle,
  Search, Filter, ChevronDown, Download, RefreshCw, X, Loader2, Package, LayoutGrid, Eye, CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SKRMQueuePage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'>('SUBMITTED');
  const [actionItem, setActionItem] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [dispatchReady, setDispatchReady] = useState(0);

  // Filter & Search state
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchQueue = () => {
    setLoading(true);
    skApi.getRMQueue(filter === 'all' ? undefined : filter)
      .then(r => setRequests(r.data?.data || []))
      .catch(() => toast.error('Failed to load RM queue'))
      .finally(() => setLoading(false));
    
    // Also fetch dispatch count for the summary pill
    skApi.getDispatchQueue().then(r => setDispatchReady(r.data?.data?.length || 0)).catch(() => {});
  };

  useEffect(() => { fetchQueue(); }, [filter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search, dateFilter]);

  // Derived stats for KPI cards
  const totalReqs = requests.length;
  const submittedReqs = requests.filter(r => r.status === 'SUBMITTED').length;
  const acceptedReqs = requests.filter(r => r.status === 'ACCEPTED').length;
  const rejectedReqs = requests.filter(r => r.status === 'REJECTED').length;
  
  // Filtering logic
  const filteredRequests = requests.filter(req => {
    const q = search.toLowerCase();
    const matchSearch = !q || 
      req.formatted_id?.toLowerCase().includes(q) ||
      req.inventory_item?.sap_part_number?.toLowerCase().includes(q) ||
      req.inventory_item?.part_description?.toLowerCase().includes(q);
    
    const matchDate = !dateFilter || (req.submitted_at && req.submitted_at.startsWith(dateFilter));
    
    return matchSearch && matchDate;
  });

  // Pagination calculations
  const sortedRequests = [...filteredRequests].sort((a, b) => 
    new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
  );

  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = sortedRequests.slice(startIndex, startIndex + itemsPerPage);
  const endItem = Math.min(startIndex + itemsPerPage, sortedRequests.length);

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
        toast.success(`RM ${actionItem.formatted_id} accepted`);
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

  return (
    <div className="p-2 bg-gray-50/50 min-h-screen">
      {/* Premium Header Section */}
      <div className="flex items-center justify-between mb-2 px-2 py-1 bg-white border-b border-slate-100">
        <h1 className="text-[24px] font-black text-ind-text tracking-tight leading-none">
          RM Acceptance <span className="text-[#f37021]">Queue</span>
        </h1>

        {/* Compact Summary Pill - Matched to Demand Management */}
        <div className="flex items-center bg-white backdrop-blur-md rounded-2xl border border-ind-border/50 p-1 shadow-sm overflow-hidden scale-90 origin-right">
          {[
            { label: 'TOTAL', value: totalReqs, color: 'text-slate-800' },
            { label: 'PENDING RM', value: submittedReqs, color: 'text-amber-500' },
            { label: 'READY TO DISPATCH', value: dispatchReady, color: 'text-blue-500' },
            { label: 'COMPLETED', value: acceptedReqs, color: 'text-emerald-500' },
            { label: 'REJECTED', value: rejectedReqs, color: 'text-rose-500' },
          ].map((stat, idx, arr) => (
            <div key={idx} className={`px-4 py-1 text-center ${idx !== arr.length - 1 ? 'border-r border-ind-border/50' : ''}`}>
              <span className={`block text-[8px] font-bold uppercase tracking-wider ${stat.label === 'TOTAL' ? 'text-ind-text3' : 'opacity-60'} ${stat.color.replace('text-', 'text-')}`}>
                {stat.label}
              </span>
              <span className={`block text-lg font-black leading-none ${stat.color}`}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Standardized Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-2 px-1">
        {/* Status Dropdown */}
        <div className="relative group min-w-[200px]">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-orange-50 rounded text-ind-primary group-focus-within:text-orange-600 transition-colors pointer-events-none">
            <LayoutGrid size={11} />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="w-full bg-white border border-ind-border/60 focus:border-ind-primary rounded-full h-[42px] pl-12 pr-10 text-slate-700 font-bold text-[11px] tracking-wide outline-none transition-all shadow-sm cursor-pointer appearance-none"
          >
            <option value="all">All Status</option>
            <option value="SUBMITTED">Pending</option>
            <option value="ACCEPTED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Search Bar */}
        <div className="relative group flex-1 min-w-[300px]">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-ind-text3 group-focus-within:text-ind-primary transition-colors" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RMR ID, SAP Part, Description..."
            className="w-full bg-white border border-ind-border/60 focus:border-ind-primary rounded-full h-[42px] pl-14 pr-6 text-slate-700 font-bold text-[11px] tracking-wide placeholder:text-ind-text3/60 outline-none transition-all shadow-sm"
          />
        </div>

        {/* Date Picker */}
        <div className="relative group min-w-[220px]">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-indigo-50/50 rounded text-indigo-400 group-focus-within:text-ind-primary transition-colors pointer-events-none">
            <Clock size={12} />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-white border border-ind-border/60 focus:border-ind-primary rounded-full h-[42px] pl-12 pr-5 text-slate-700 font-bold text-[11px] tracking-wide outline-none transition-all shadow-sm appearance-none cursor-pointer"
          />
        </div>

        {/* Action / Refresh */}
        <button 
          onClick={fetchQueue} 
          disabled={loading}
          className="px-8 h-[42px] bg-gradient-to-r from-[#f37021] to-orange-600 text-white rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg hover:shadow-orange-200 hover:scale-[1.02] transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white/50 backdrop-blur-sm rounded-3xl border border-white">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-[#f37021]" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Fetching Queue...</p>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-3xl border border-white shadow-sm py-20 text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-black text-gray-900 uppercase">Queue is Clear!</h3>
          <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-wide">No {filter !== 'all' ? filter.toLowerCase() : ''} RM requests at the moment</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-ind-border/50 shadow-sm flex flex-col h-[calc(100vh-280px)] overflow-hidden">
          <div className="flex-1 overflow-x-auto custom-scrollbar overflow-y-auto">
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-ind-bg text-black border-b-2 border-[#f37021] uppercase text-[11px] tracking-wider sticky top-0 z-[50]">
                <tr>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">RMR ID</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Demand</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">SAP Part</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Description</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">RM Thk mm</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Width</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Length</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Comp/Sheet</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">RM Size</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">RM Grade</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Submitted</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Status</th>
                  <th className="px-4 py-2 text-center font-black whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ind-border/40">
                <AnimatePresence mode="popLayout">
                  {paginatedRequests.map(req => (
                    <motion.tr
                      key={req.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="hover:bg-ind-bg/40 transition-colors group"
                    >
                      <td className="px-4 py-2">
                        <span className="font-mono text-[10px] font-black text-[#f37021] bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                          {req.formatted_id}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[11px] font-black text-blue-600 font-mono">
                        {req.demand_formatted_id}
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                          {req.inventory_item?.sap_part_number}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[10px] font-bold text-slate-600 max-w-[180px] truncate" title={req.inventory_item?.part_description}>
                        {req.inventory_item?.part_description}
                      </td>
                      <td className="px-4 py-2 text-xs font-black text-slate-800 tabular-nums">{req.rm_thk_mm || '—'}</td>
                      <td className="px-4 py-2 text-xs font-black text-slate-800 tabular-nums">{req.sheet_width || '—'}</td>
                      <td className="px-4 py-2 text-xs font-black text-slate-800 tabular-nums">{req.sheet_length || '—'}</td>
                      <td className="px-4 py-2 text-xs font-black text-slate-800 tabular-nums">{req.no_of_comp_per_sheet || '—'}</td>
                      <td className="px-4 py-2 text-xs font-black text-slate-800 whitespace-nowrap">{req.rm_size || '—'}</td>
                      <td className="px-4 py-2 text-xs font-black text-slate-800">{req.rm_grade || '—'}</td>
                      <td className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-tighter tabular-nums">
                        {req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black border tracking-widest
                          ${req.status === 'SUBMITTED' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            req.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                          {req.status === 'ACCEPTED' ? 'COMPLETED' : req.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-center gap-2">
                          {req.status === 'SUBMITTED' ? (
                            <>
                              <button
                                onClick={() => openAccept(req)}
                                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-bold transition-all border border-emerald-100 shadow-sm flex items-center gap-1"
                              >
                                <CheckCircle size={14} />
                                Accept
                              </button>
                              <button
                                onClick={() => openReject(req)}
                                className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl text-[10px] font-bold transition-all border border-rose-100 shadow-sm flex items-center gap-1"
                              >
                                <X size={14} />
                                Reject
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-400 rounded-lg border border-slate-100 opacity-60">
                              <CheckSquare size={12} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {sortedRequests.length > 0 && (
            <div className="sticky bottom-0 flex items-center justify-between px-6 py-3 bg-white border-t z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Showing{" "}
                <span className="text-[#f37021]">
                  {startIndex + 1}
                </span>
                {" "}to{" "}
                <span className="text-[#f37021]">
                  {endItem}
                </span>
                {" "}of{" "}
                <span className="text-[#f37021]">
                  {sortedRequests.length}
                </span>
                {" "}entries
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-4">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50 active:scale-95"
                  >
                    Prev
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${
                          currentPage === page 
                            ? 'bg-orange-50 text-[#f37021] border border-orange-200' 
                            : 'text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50 active:scale-95"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Modal */}
      <AnimatePresence>
        {actionItem && actionType && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setActionItem(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden pointer-events-auto border border-ind-border/50">
                <div className={`p-6 text-white ${actionType === 'accept' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-red-600'}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                      {actionType === 'accept' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tight">
                        {actionType === 'accept' ? 'Confirm Acceptance' : 'Confirm Rejection'}
                      </h2>
                      <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-0.5">
                        {actionItem.formatted_id} · {actionItem.inventory_item?.sap_part_number}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <LayoutGrid size={12} className="text-ind-primary" />
                      {actionType === 'accept' ? 'Verification Notes' : 'Rejection Reason *'}
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:bg-white transition-all placeholder:text-slate-300"
                      placeholder={actionType === 'accept' ? 'Any quality or quantity notes...' : 'Reason for rejection...'}
                    />
                  </div>
                  
                  {actionType === 'accept' && (
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                      <div className="text-blue-500 shrink-0"><Clock size={16} /></div>
                      <p className="text-[10px] font-bold text-blue-600 leading-relaxed uppercase tracking-tight">
                        Supervisor will be notified that RM is verified and ready at plant for production.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 pt-0 flex gap-3">
                  <button
                    onClick={() => setActionItem(null)}
                    className="flex-1 rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAction}
                    disabled={processing}
                    className={`flex-1 rounded-2xl text-white py-4 text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2
                      ${actionType === 'accept' ? 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700' : 'bg-rose-600 shadow-rose-100 hover:bg-rose-700'}`}
                  >
                    {processing ? <Loader2 size={16} className="animate-spin" /> : (actionType === 'accept' ? <CheckCircle size={16} /> : <X size={16} />)}
                    {actionType === 'accept' ? 'Confirm Accept' : 'Confirm Reject'}
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

export default SKRMQueuePage;
