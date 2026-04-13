import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle, ShieldAlert, TrendingDown, ChevronDown, ChevronUp,
    Loader2, Search, Filter, Download, User, UserCheck, Calendar
} from 'lucide-react';
import type { LiveIssue } from '../../hooks/useAdminLive';

const SEVERITY_CONFIG = {
    CRITICAL: {
        text: 'text-red-700',
        bg: 'bg-red-50',
        border: 'border-red-200',
        dot: 'bg-red-600',
        label: 'CRITICAL'
    },
    HIGH: {
        text: 'text-orange-700',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        dot: 'bg-orange-500',
        label: 'HIGH'
    },
    MEDIUM: {
        text: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        dot: 'bg-amber-400',
        label: 'MEDIUM'
    },
};

const ISSUE_TYPE_STYLE: Record<string, string> = {
    'REJECTION': 'bg-red-500 text-white shadow-sm shadow-red-200',
    'LOW COVERAGE': 'bg-amber-500 text-white shadow-sm shadow-amber-200',
};

interface Props {
    issues: LiveIssue[];
    isLoading: boolean;
}

export const IssuesAlertTable: React.FC<Props> = ({ issues, isLoading }) => {
    const [expanded, setExpanded] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'REJECTION' | 'LOW COVERAGE'>('ALL');

    const filtered = issues.filter(issue => {
        const matchType = filterType === 'ALL' || issue.issue_type === filterType;
        const matchSearch = !search || [
            issue.sap_part_number, issue.part_description, issue.model,
            issue.deo_name, issue.supervisor_name, issue.rejection_reason
        ].some(f => f?.toLowerCase().includes(search.toLowerCase()));
        return matchType && matchSearch;
    });

    const exportToCSV = () => {
        const headers = ["Date", "Type", "Severity", "Model", "Part", "Description", "Reason/Coverage", "DEO", "Supervisor"];
        const rows = filtered.map(i => [
            i.date, i.issue_type, i.severity, i.model, i.sap_part_number,
            i.part_description, i.issue_type === 'REJECTION' ? i.rejection_reason : `${i.coverage_days} days`,
            i.deo_name, i.supervisor_name
        ]);
        const content = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Issues_Alert_Export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-4">
            {/* Command Header */}
            <div className="flex flex-col md:flex-row items-center justify-between px-3 py-2 border-b border-gray-100 bg-white gap-4">
                {/* <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-200">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-gray-800 tracking-tight uppercase">System Alert & Issues Center</h3>
                        
                    </div>
                </div> */}
                <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-6 bg-[#f37021] rounded-full">
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-[#f37021] tracking-tight">System Alert & Issues Center</h3>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Filter by Part, Model, Reason..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-xs bg-ind-bg/50 border border-ind-border/60 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                        />
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:text-indigo-600 hover:border-indigo-200 rounded-xl transition-all shadow-xs"
                    >
                        <Download size={15} />
                        <span className="text-xs font-bold uppercase tracking-wider">CSV</span>
                    </button>
                </div>
            </div>

            {/* Quick Slicers */}
            <div className="flex items-center gap-2 px-6 py-2 bg-white border-b border-gray-50 overflow-x-auto no-scrollbar">
                <Filter size={12} className="text-gray-400 shrink-0" />
                {(['ALL', 'REJECTION', 'LOW COVERAGE'] as const).map(t => {
                    const count = t === 'ALL' ? issues.length : issues.filter(i => i.issue_type === t).length;
                    const isActive = filterType === t;
                    return (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={`px-3 py-1 rounded-full text-[0.6rem] font-bold uppercase tracking-widest transition-all border whitespace-nowrap ${isActive
                                    ? 'bg-gray-800 text-white border-gray-800'
                                    : 'bg-gray-50 text-gray-400 border-transparent hover:border-gray-200'
                                }`}
                        >
                            {t} <span className={`ml-1.5 ${isActive ? 'opacity-70' : 'text-gray-300'}`}>{count}</span>
                        </button>
                    );
                })}
                {isLoading && <Loader2 size={14} className="text-indigo-500 animate-spin ml-2" />}
            </div>

            {/* HIGH DENSITY TABLE CHART */}
            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full border-collapse">
                    <thead className='bg-white border-b-2 border-[#f37021] text-xs font-bold text-black uppercase tracking-wider'>
                        <tr className="bg-gray-50/80 border-b border-gray-100">
                            <th className="px-6 py-2 text-left text-[0.65rem] font-black text-black uppercase tracking-[0.1em]">Details</th>
                            <th className="px-4 py-2 text-left text-[0.65rem] font-black text-black uppercase tracking-[0.1em]">Event Type</th>
                            <th className="px-4 py-2 text-left text-[0.65rem] font-black text-black uppercase tracking-[0.1em]">Severity</th>
                            <th className="px-4 py-2 text-left text-[0.65rem] font-black text-black uppercase tracking-[0.1em]">Model/Line</th>
                            <th className="px-4 py-2 text-left text-[0.65rem] font-black text-black uppercase tracking-[0.1em]">Metric / Reason</th>
                            <th className="px-4 py-2 text-left text-[0.65rem] font-black text-black uppercase tracking-[0.1em]">Personnel</th>
                            <th className="px-6 py-2 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-20 text-center">
                                    <ShieldAlert size={40} className="mx-auto text-gray-100 mb-3" />
                                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">No Active Alerts Detected</p>
                                    <p className="text-[0.6rem] text-gray-300 mt-1 uppercase tracking-[0.1em]">System state: Verified Healthy</p>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((issue, idx) => {
                                const sev = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.MEDIUM;
                                const isExpanded = expanded === issue.id;

                                return (
                                    <React.Fragment key={issue.id}>
                                        <tr
                                            className={`hover:bg-gray-50/50 transition-colors cursor-pointer group ${isExpanded ? 'bg-indigo-50/30' : ''}`}
                                            onClick={() => setExpanded(isExpanded ? null : issue.id)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[0.6rem] font-black text-gray-800 font-mono tracking-tighter uppercase mb-0.5">
                                                        {issue.sap_part_number}
                                                    </span>
                                                    <span className="text-[0.65rem] font-bold text-gray-500 truncate max-w-[120px]">
                                                        {issue.part_description || 'No description available'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[0.55rem] font-black tracking-widest ${ISSUE_TYPE_STYLE[issue.issue_type]}`}>
                                                    {issue.issue_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg border font-black text-[0.6rem] ${sev.bg} ${sev.text} ${sev.border}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sev.dot} animate-pulse`} />
                                                    {sev.label}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[0.7rem] font-black text-indigo-600 uppercase tracking-tight">{issue.model}</span>
                                                    <span className="text-[0.55rem] font-bold text-gray-400">{issue.line}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {issue.issue_type === 'REJECTION' ? (
                                                    <div className="flex items-center gap-2 text-red-600">
                                                        <AlertTriangle size={12} />
                                                        <span className="text-[0.65rem] font-black uppercase tracking-tight italic">
                                                            {issue.rejection_reason || 'Quality Reject'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center justify-between gap-4 mb-1">
                                                            <span className="text-[0.6rem] font-black text-amber-600 uppercase tracking-widest">Low Stock</span>
                                                            <span className="text-[0.65rem] font-black text-amber-700">{issue.coverage_days}d Left</span>
                                                        </div>
                                                        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${(Math.min(issue.coverage_days, 5) / 5) * 100}%` }}
                                                                className={`h-full ${issue.coverage_days < 1 ? 'bg-red-500' : 'bg-amber-500'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <User size={10} className="text-gray-400" />
                                                        <span className="text-[0.6rem] font-bold text-gray-600">{issue.deo_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <UserCheck size={10} className="text-indigo-400" />
                                                        <span className="text-[0.6rem] font-bold text-indigo-700">{issue.supervisor_name}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-[0.55rem] text-gray-400 font-bold uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
                                                    <Calendar size={10} /> {issue.date}
                                                </div>
                                                <button className="text-gray-400 group-hover:text-indigo-600 transition-colors">
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* EXPANDABLE DEEP DIVE */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={7} className="p-0 border-b border-gray-100 bg-indigo-50/10">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-10 py-6 border-l-4 border-indigo-400">
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                                                    <div className="space-y-3">
                                                                        <div>
                                                                            <h4 className="text-[0.55rem] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Part Core ID</h4>
                                                                            <p className="text-sm font-black text-gray-800 font-mono">{issue.sap_part_number}</p>
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-[0.55rem] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Stock Position</h4>
                                                                            <p className="text-sm font-black text-gray-800 tracking-tight">{issue.todays_stock} <span className="text-xs text-gray-400">Available</span></p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <div>
                                                                            <h4 className="text-[0.55rem] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Consumption Rate</h4>
                                                                            <p className="text-sm font-black text-gray-800 tracking-tight">{issue.per_day} <span className="text-xs text-gray-400">/ Day</span></p>
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-[0.55rem] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Burn Rate Status</h4>
                                                                            <p className={`text-sm font-black tracking-tight ${issue.coverage_days < 2 ? 'text-red-600' : 'text-amber-600'}`}>
                                                                                {issue.coverage_days < 1 ? 'STOCK OUT IMMINENT' : 'CRITICAL STOCK LEVEL'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-span-2 space-y-3">
                                                                        <div>
                                                                            <h4 className="text-[0.55rem] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Detailed Breakdown</h4>
                                                                            <div className="p-3 bg-white border border-gray-100 rounded-xl text-[0.65rem] text-gray-600 font-medium leading-relaxed italic border-l-4 border-indigo-600">
                                                                                {issue.issue_type === 'REJECTION'
                                                                                    ? `Quality alert raised by Supervisor ${issue.supervisor_name} for model ${issue.model}. Part ${issue.sap_part_number} (${issue.part_description}) failed inspection. Recorded by operator ${issue.deo_name}. Reference Log ID: #${issue.log_id}.`
                                                                                    : `Logistics alert: Material ${issue.sap_part_number} (${issue.part_description}) is projected to run out in ${issue.coverage_days} days based on today's stock of ${issue.todays_stock} and daily consumption of ${issue.per_day}. Immediate replenishment required for Line: ${issue.line}.`
                                                                                }
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <button className="px-3 py-1.5 bg-indigo-600 text-white text-[0.55rem] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-700 transition-all">Report Deficiency</button>
                                                                            <button className="px-3 py-1.5 bg-gray-100 text-gray-600 text-[0.55rem] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-all">View Full Log</button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    </td>
                                                </tr>
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Stats */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        <span className="text-[0.6rem] font-black text-gray-500 uppercase tracking-widest">Rejections: {issues.filter(i => i.issue_type === 'REJECTION').length}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="text-[0.6rem] font-black text-gray-500 uppercase tracking-widest">Low Stock: {issues.filter(i => i.issue_type === 'LOW COVERAGE').length}</span>
                    </div>
                </div>
                <div className="text-[0.6rem] text-gray-400 font-bold uppercase tracking-widest">
                    Showing {filtered.length} of {issues.length} System Alert Entries
                </div>
            </div>
        </div>
    );
};
