/**
 * SupervisorVerifyLogs Component
 * 
 * This module provides the primary interface for supervisors to review and verify 
 * daily production logs submitted by DEOs. It includes:
 * - Real-time production statistics (Stats Dashboard)
 * - Multi-criteria filtering (Search, Date, Shift, Status)
 * - High-density table for efficient log verification
 * - Seamless integration with the verification modal
 */

import React, { useState, useMemo } from 'react';
import {
    ClipboardCheck, Clock, CheckCircle2, ShieldCheck, ChevronLeft, Database,
    Search, Calendar, Filter, ArrowRight, Eye, Info, ChevronDown, Factory
} from 'lucide-react';
import { cn } from '../../../../../lib/utils';
import SupervisorVerificationModal from './SupervisorVerificationModal';

const SHIFT_OPTIONS = [
    { id: 'All', label: 'All Shifts' },
    { id: 'Shift 1', label: 'Shift I' },
    { id: 'Shift 2', label: 'Shift II' },
    { id: 'Shift 3', label: 'Shift III' },
];

const STATUS_OPTIONS = [
    { id: 'All', label: 'All Status' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'REJECTED', label: 'Rejected' },
    { id: 'VERIFIED', label: 'Completed' },
];

interface SupervisorVerifyLogsProps {
    verifications: any[];
    activeVerifyTab: 'pending' | 'ready';
    setActiveVerifyTab: (tab: 'pending' | 'ready') => void;
    setSelectedLog: (log: any) => void;
    selectedLog: any;
    onVerify: (id: number, status: 'VERIFIED' | 'REJECTED', reason: string) => Promise<void>;
}

export const SupervisorVerifyLogs = ({
    verifications,
    activeVerifyTab,
    setActiveVerifyTab,
    setSelectedLog,
    selectedLog,
    onVerify
}: SupervisorVerifyLogsProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterShift, setFilterShift] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    /**
     * Helper to normalize shift identifiers into short-code Roman numerals (I, II, III).
     * Used for consistent badge rendering.
     */
    const getShiftLabel = (shift: string) => {
        const s = (shift || '').toLowerCase();
        if (s.includes('1') || s.includes('i')) return 'I';
        if (s.includes('2') || s.includes('ii')) return 'II';
        if (s.includes('3') || s.includes('iii')) return 'III';
        return shift;
    };

    /**
     * Filter Logic: Process the raw verification logs based on user-selected criteria.
     * Uses useMemo to prevent unnecessary re-filtering on every render.
     */
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    /**
     * Filter Logic: Process the raw verification logs based on user-selected criteria.
     * Uses useMemo to prevent unnecessary re-filtering on every render.
     */
    const filteredVerifications = useMemo(() => {
        return verifications.filter((item: any) => {
            // Status filtering
            const itemStatus = (item.status || 'PENDING').toUpperCase();
            let matchesStatus = filterStatus === 'All';
            if (!matchesStatus) {
                if (filterStatus === 'VERIFIED') {
                    matchesStatus = ['APPROVED', 'VERIFIED', 'READY', 'DONE'].includes(itemStatus);
                } else {
                    matchesStatus = itemStatus === filterStatus;
                }
            }
            if (!matchesStatus) return false;

            // Search filtering
            const matchesSearch = !searchTerm ||
                item.machine_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.sub_machine_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.sap_part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.deo_name?.toLowerCase().includes(searchTerm.toLowerCase());

            // Date filtering
            const matchesDate = !filterDate || item.date?.includes(filterDate);

            // Shift filtering
            let matchesShift = filterShift === 'All';
            if (!matchesShift && item.shift) {
                const itemShift = item.shift.toLowerCase();
                const selShift = filterShift.toLowerCase();
                const isShift1 = (selShift.includes('1') || selShift.includes('i')) && (itemShift.includes('1') || itemShift.includes('i'));
                const isShift2 = (selShift.includes('2') || selShift.includes('ii')) && (itemShift.includes('2') || itemShift.includes('ii'));
                const isShift3 = (selShift.includes('3') || selShift.includes('iii')) && (itemShift.includes('3') || itemShift.includes('iii'));
                matchesShift = isShift1 || isShift2 || isShift3;
            }

            return matchesSearch && matchesDate && matchesShift;
        }).sort((a: any, b: any) => b.id - a.id);
    }, [verifications, filterStatus, searchTerm, filterDate, filterShift]);

    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterDate, filterShift, filterStatus]);

    const totalPages = Math.ceil(filteredVerifications.length / pageSize);
    const paginatedItems = filteredVerifications.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    /**
     * Stats Calculation: Aggregates totals and shift-wise counts for the dashboard pill.
     */
    const stats = useMemo(() => {
        return {
            total: verifications.length,
            shift1: verifications.filter(e => { const s = (e.shift || '').toLowerCase(); return s.includes('1') || s.includes('i'); }).length,
            shift2: verifications.filter(e => { const s = (e.shift || '').toLowerCase(); return s.includes('2') || s.includes('ii'); }).length,
            shift3: verifications.filter(e => { const s = (e.shift || '').toLowerCase(); return s.includes('3') || s.includes('iii'); }).length,
        };
    }, [verifications]);

    return (
        <div className="space-y-1 animate-in fade-in duration-500">
            {/* Header Console Style */}
            <div className="bg-white border border-ind-border/50 rounded-xl overflow-hidden shadow-sm m-2">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 border-b border-slate-50">
                    <div>
                        <h2 className="text-[24px] font-black text-ind-text tracking-tight leading-none">
                            Verify Daily <span className="text-[#f37021]">Production</span>
                        </h2>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="flex items-center bg-white backdrop-blur-md rounded-2xl border border-ind-border/50 p-1 shadow-sm overflow-hidden scale-90 origin-right mx-2">
                        <div className="px-4 py-1 text-center border-r border-ind-border/50">
                            <span className="block text-[8px] font-bold text-ind-text3 uppercase tracking-wider">TOTAL LOGS</span>
                            <span className="block text-lg font-black text-slate-800 leading-none">{stats.total}</span>
                        </div>
                        <div className="px-4 py-1 text-center border-r border-ind-border/50 text-orange-500">
                            <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">SHIFT I</span>
                            <span className="block text-lg font-black leading-none">{stats.shift1}</span>
                        </div>
                        <div className="px-4 py-1 text-center border-r border-ind-border/50 text-blue-500">
                            <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">SHIFT II</span>
                            <span className="block text-lg font-black leading-none">{stats.shift2}</span>
                        </div>
                        <div className="px-4 py-1 text-center text-purple-500">
                            <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">SHIFT III</span>
                            <span className="block text-lg font-black leading-none">{stats.shift3}</span>
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="px-4 flex flex-col md:flex-row items-center justify-between gap-2 pb-2">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative group w-full md:w-64">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f37021] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search Machine, Part, or DEO..."
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
                                {SHIFT_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
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
                                {STATUS_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ind-text3 opacity-50">
                                <ChevronDown size={12} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 
                TABLE AREA: High-Density Production Log View
                Features a sticky header and independent vertical scrolling.
            */}
            <div className="">
                {filteredVerifications.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-ind-border/50 shadow-sm overflow-y-auto bg-white transition-all custom-scrollbar h-[calc(100vh-260px)] mx-2 flex flex-col">
                        <div className="flex-1 overflow-auto">
                            <table className="min-w-full bg-white text-sm">
                                <thead className="bg-ind-bg text-black border-b-2 border-[#f37021] uppercase text-[11px] tracking-wider sticky top-0 z-[50]">
                                    <tr>
                                        <th className="px-6 py-2 text-left whitespace-nowrap">SR NO</th>
                                        <th className="px-4 py-2 text-left whitespace-nowrap">DATE</th>
                                        <th className="px-6 py-2 text-left whitespace-nowrap">MACHINE</th>
                                        <th className="px-6 py-2 text-left whitespace-nowrap">SUBMACHINE</th>
                                        <th className="px-6 py-2 text-left whitespace-nowrap">SAP PART NO</th>
                                        <th className="px-6 py-2 text-center whitespace-nowrap">DAILY PRODUCTION</th>
                                        <th className="px-6 py-2 text-center whitespace-nowrap">MACHINE RUN TIME</th>
                                        <th className="px-6 py-2 text-center whitespace-nowrap">SHIFT</th>
                                        <th className="px-6 py-2 text-center whitespace-nowrap">STATUS</th>
                                        <th className="px-4 py-2 text-right whitespace-nowrap">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paginatedItems.map((item, idx) => {
                                        const serialNum = (currentPage - 1) * pageSize + idx + 1;
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => setSelectedLog(item)}>
                                                <td className="px-4 py-4">
                                                    <span className="text-[11px] font-black text-slate-900">{serialNum}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{item.date || 'N/A'}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight">{item.machine_name}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[11px] font-black text-indigo-500 uppercase tracking-tight bg-indigo-50 px-2 py-0.5 rounded">
                                                        {item.sub_machine_name || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight bg-slate-100 px-2 py-0.5 rounded">
                                                        {item.sap_part_number || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[16px] font-black text-[#f97316] leading-none tabular-nums">
                                                        {item.parts_produced ?? item.actual_qty ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center font-black text-blue-600 text-[13px]">
                                                    {item.machine_runtime_mins
                                                        ? `${(item.machine_runtime_mins / 60).toFixed(1)} hrs`
                                                        : item.machine_run_time
                                                            ? `${item.machine_run_time} hrs`
                                                            : <span className="text-slate-300">—</span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={cn(
                                                        "px-4 py-1 rounded-full text-[10px] font-black border uppercase tracking-[0.1em]",
                                                        (item.shift || '').toLowerCase().includes('1') || (item.shift || '').toLowerCase().includes('i') ? "bg-orange-50 text-orange-500 border-orange-100" :
                                                            (item.shift || '').toLowerCase().includes('2') || (item.shift || '').toLowerCase().includes('ii') ? "bg-blue-50 text-blue-500 border-blue-100" : "bg-purple-50 text-purple-500 border-purple-100"
                                                    )}>
                                                        {getShiftLabel(item.shift)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                                        ['APPROVED', 'VERIFIED', 'READY', 'DONE'].includes((item.status || 'PENDING').toUpperCase())
                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-500/10"
                                                            : item.status === 'REJECTED'
                                                                ? "bg-rose-50 text-rose-600 border-rose-100 shadow-sm shadow-rose-500/10"
                                                                : "bg-amber-50 text-amber-600 border-amber-100 shadow-sm shadow-amber-500/10"
                                                    )}>
                                                        {item.status || 'PENDING'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right transition-opacity">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedLog(item);
                                                            }}
                                                            className={cn(
                                                                "px-4 h-[32px] rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm",
                                                                ['APPROVED', 'VERIFIED', 'READY', 'DONE'].includes((item.status || 'PENDING').toUpperCase())
                                                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 active:scale-95"
                                                                    : item.status === 'REJECTED'
                                                                        ? "bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 active:scale-95"
                                                                        : "bg-gradient-to-r from-[#F37021] to-orange-600 text-white shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-95"
                                                            )}
                                                        >
                                                            {['APPROVED', 'VERIFIED', 'READY', 'DONE'].includes((item.status || 'PENDING').toUpperCase())
                                                                ? 'View / Observe'
                                                                : item.status === 'REJECTED'
                                                                    ? 'Review Again'
                                                                    : 'Review Log'}
                                                            <ArrowRight size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {filteredVerifications.length > 0 && (
                            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white sticky bottom-0 z-[60]">
                                <div className="flex items-center gap-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Showing <span className="text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * pageSize, filteredVerifications.length)}</span> of <span className="text-slate-900">{filteredVerifications.length}</span> logs
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
                                                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === page ? 'bg-[#f37021] text-white shadow-lg' : 'hover:bg-slate-100 text-slate-600'}`}
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
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                            <Database size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">
                            No Logs Found
                        </h3>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] max-w-xs mx-auto leading-relaxed">
                            No production logs matching your current filters were found for this period.
                        </p>
                    </div>
                )}
            </div>

            <SupervisorVerificationModal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                log={selectedLog}
                onVerify={(status, reason) => onVerify(selectedLog.id, status, reason)}
            />
        </div>
    );
};
