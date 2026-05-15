import { useState, useEffect } from 'react';
import { API_BASE } from '../../lib/apiConfig';
import { getToken } from '../../lib/storage';
import {
    Loader2, Factory, Calendar, Search, Clock, Package, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';

interface HistoryRecord {
    formatted_id: string;
    sap_part_number: string;
    part_description: string;
    machine_name: string;
    produced_qty: number;
    runtime_mins: number;
    start_date: string;
    end_date: string;
}

export default function DEOShortageHistoryPage() {
    const [records, setRecords] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const fetchHistory = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE}/deo/shortage-history-aggregate`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setRecords(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    // Filter records based on query
    const filteredRecords = records.filter(r => {
        const query = searchQuery.toLowerCase();
        return (
            r.sap_part_number.toLowerCase().includes(query) ||
            r.part_description.toLowerCase().includes(query) ||
            r.machine_name.toLowerCase().includes(query) ||
            r.formatted_id.toLowerCase().includes(query)
        );
    });

    // Pagination
    const totalPages = Math.ceil(filteredRecords.length / pageSize);
    const paginatedRecords = filteredRecords.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 size={40} className="animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-4 p-6 bg-slate-50/50 overflow-hidden text-slate-900">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col gap-1.5">
                    <h1 className="text-[26px] font-black text-slate-900 tracking-tight flex items-center gap-3 leading-none">
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-inner">
                            <Factory size={20} />
                        </div>
                        Completed Shortage Logs
                    </h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest pl-1">
                        Production aggregates for finalized shortage requests
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="relative group w-full md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Search parts or machines..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-full h-11 pl-12 pr-5 text-slate-800 font-bold text-xs outline-none transition-all shadow-sm"
                        />
                    </div>

                    <button 
                        onClick={() => fetchHistory()}
                        className="h-11 w-11 bg-white border border-slate-200 hover:border-orange-500 hover:text-orange-500 rounded-full flex items-center justify-center text-slate-500 transition-all shadow-sm active:scale-95"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="sticky top-0 bg-slate-900 text-white uppercase tracking-widest font-black text-[10px] z-20 border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-4.5 font-black whitespace-nowrap w-12 text-center">#</th>
                                <th className="px-6 py-4.5 font-black whitespace-nowrap">PSR ID</th>
                                <th className="px-6 py-4.5 font-black whitespace-nowrap">Part Info</th>
                                <th className="px-6 py-4.5 font-black whitespace-nowrap">Sub-Machine</th>
                                <th className="px-6 py-4.5 font-black whitespace-nowrap text-center">Qty Produced</th>
                                <th className="px-6 py-4.5 font-black whitespace-nowrap text-center">Time Taken</th>
                                <th className="px-6 py-4.5 font-black whitespace-nowrap text-center">Start Date</th>
                                <th className="px-6 py-4.5 font-black whitespace-nowrap text-center">End Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <Package size={40} strokeWidth={1.5} />
                                            <p className="font-bold text-sm uppercase tracking-wide">No completed history logs found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedRecords.map((rec, idx) => {
                                    const serialNum = (currentPage - 1) * pageSize + idx + 1;
                                    return (
                                        <tr key={rec.formatted_id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-6 py-4.5 text-center">
                                                <span className="font-black text-[11px] text-slate-400">{serialNum}</span>
                                            </td>
                                            <td className="px-6 py-4.5 font-black text-[12px] text-orange-600 tracking-wider">
                                                {rec.formatted_id}
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 text-[13px] tracking-tight">{rec.sap_part_number}</span>
                                                    <span className="text-[11px] font-bold text-slate-400 truncate max-w-[220px]">{rec.part_description}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-800 border border-slate-200 shadow-sm">
                                                    <Factory size={12} className="text-slate-500" />
                                                    <span className="text-[11px] font-black tracking-tight uppercase">{rec.machine_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4.5 text-center">
                                                <span className="inline-flex px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-black text-[13px] border border-emerald-100 shadow-inner">
                                                    {rec.produced_qty.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4.5 text-center">
                                                <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                                                    <Clock size={12} />
                                                    {rec.runtime_mins >= 60 
                                                        ? `${Math.floor(rec.runtime_mins / 60)}h ${Math.round(rec.runtime_mins % 60)}m`
                                                        : `${Math.round(rec.runtime_mins)} mins`
                                                    }
                                                </div>
                                            </td>
                                            <td className="px-6 py-4.5 text-center">
                                                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    {rec.start_date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4.5 text-center">
                                                <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                                    <Calendar size={12} />
                                                    {rec.end_date}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            Showing {Math.min(filteredRecords.length, (currentPage - 1) * pageSize + 1)} to {Math.min(filteredRecords.length, currentPage * pageSize)} of {filteredRecords.length} entries
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-[11px] font-black text-slate-800 uppercase px-3">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
