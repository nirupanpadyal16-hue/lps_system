import { useState, useEffect, useMemo } from 'react';
import {
    Factory, RefreshCw, Calendar, Search, Filter,
    CheckCircle2, Clock, AlertCircle, Loader2, ChevronDown
} from 'lucide-react';
import { supervisorMachineApi } from '../../api/newRolesApi';

const SHIFTS = ['Shift 1', 'Shift 2', 'Shift 3'];

const SHIFT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'Shift 1': { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'  },
    'Shift 2': { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
    'Shift 3': { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
};

const STATUS_CFG: Record<string, { bg: string; text: string; icon: JSX.Element }> = {
    VERIFIED: {
        bg: 'bg-emerald-50 border-emerald-200',
        text: 'text-emerald-700',
        icon: <CheckCircle2 size={11} className="text-emerald-600" />,
    },
    PENDING: {
        bg: 'bg-amber-50 border-amber-200',
        text: 'text-amber-700',
        icon: <Clock size={11} className="text-amber-500" />,
    },
    REJECTED: {
        bg: 'bg-rose-50 border-rose-200',
        text: 'text-rose-700',
        icon: <AlertCircle size={11} className="text-rose-500" />,
    },
};

export default function AdminMachineMonitorPage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [shiftFilter, setShiftFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const r = await supervisorMachineApi.getMachineEntries({
                date: selectedDate,
                shift: shiftFilter === 'all' ? undefined : shiftFilter,
            });
            setEntries(r.data?.data || []);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEntries(); }, [selectedDate, shiftFilter]);

    // Derived stats
    const totalLogs    = entries.length;
    const shift1Count  = entries.filter(e => e.shift === 'Shift 1').length;
    const shift2Count  = entries.filter(e => e.shift === 'Shift 2').length;
    const shift3Count  = entries.filter(e => e.shift === 'Shift 3').length;

    // Filter + search
    const filtered = useMemo(() => {
        return entries.filter(e => {
            const q = search.toLowerCase();
            const matchSearch = !q ||
                e.sap_part_number?.toLowerCase().includes(q) ||
                e.machine_name?.toLowerCase().includes(q) ||
                e.inventory_item?.part_description?.toLowerCase().includes(q) ||
                e.deo_name?.toLowerCase().includes(q);
            const matchStatus = statusFilter === 'all' || e.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [entries, search, statusFilter]);

    // Group by machine
    const grouped = useMemo(() => {
        return filtered.reduce((acc, entry) => {
            const key = entry.machine_name || 'Unknown Machine';
            if (!acc[key]) acc[key] = [];
            acc[key].push(entry);
            return acc;
        }, {} as Record<string, any[]>);
    }, [filtered]);

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow">
                            <Factory size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900">Daily Production Console</h1>
                            <p className="text-[11px] font-black text-orange-500 uppercase tracking-widest mt-0.5">
                                Admin — Read-Only View · All DEO Entries
                            </p>
                        </div>
                    </div>

                    {/* KPI pills */}
                    <div className="flex items-center gap-2">
                        {[
                            { label: 'TOTAL LOGS', value: totalLogs,   color: 'bg-slate-50 border-slate-200 text-slate-700' },
                            { label: 'SHIFT I',    value: shift1Count,  color: 'bg-amber-50 border-amber-200 text-amber-700'  },
                            { label: 'SHIFT II',   value: shift2Count,  color: 'bg-orange-50 border-orange-200 text-orange-700'},
                            { label: 'SHIFT III',  value: shift3Count,  color: 'bg-indigo-50 border-indigo-200 text-indigo-700'},
                        ].map(k => (
                            <div key={k.label} className={`px-4 py-2 rounded-xl border ${k.color} text-center`}>
                                <div className="text-lg font-black leading-none">{k.value}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest mt-0.5 opacity-70">{k.label}</div>
                            </div>
                        ))}
                        <button
                            onClick={fetchEntries}
                            disabled={loading}
                            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-400"
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-gray-50">
                {/* Date */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm">
                    <Calendar size={14} className="text-gray-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none"
                    />
                </div>

                {/* Shift filter */}
                <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white">
                    {['all', ...SHIFTS].map(s => (
                        <button
                            key={s}
                            onClick={() => setShiftFilter(s)}
                            className={`px-3 py-2 text-xs font-black transition-colors uppercase ${
                                shiftFilter === s ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-gray-50'
                            }`}
                        >
                            {s === 'all' ? 'All Shifts' : s}
                        </button>
                    ))}
                </div>

                {/* Status filter */}
                <div className="relative">
                    <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="pl-8 pr-7 py-2.5 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none bg-white text-gray-700"
                    >
                        <option value="all">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="VERIFIED">Verified</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                    <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Search */}
                <div className="relative flex-1 min-w-48 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Factory className="text-orange-500 animate-pulse" size={22} />
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Loading Production Data...</p>
                    </div>
                ) : Object.keys(grouped).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-3">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                            <Factory size={28} className="text-gray-200" />
                        </div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No Production Logs Found</p>
                        <p className="text-xs text-gray-300">No entries for {selectedDate}</p>
                    </div>
                ) : (
                    Object.entries(grouped).map(([machineName, machineEntries]) => (
                        <div key={machineName} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                            {/* Machine header */}
                            <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                                        <Factory size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-800 text-sm">{machineName}</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            {machineEntries.length} {machineEntries.length === 1 ? 'entry' : 'entries'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Total Produced</div>
                                        <div className="text-base font-black text-blue-700">
                                            {machineEntries.reduce((s, e) => s + (e.parts_produced || 0), 0).toLocaleString()} pcs
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Entries table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-50 bg-white">
                                            {['SR NO', 'Machine', 'Sub Machine', 'SAP Part No', 'Daily Production', 'Machine Run Time', 'Shift', 'DEO', 'Status'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(machineEntries as any[]).map((entry, idx) => {
                                            const shiftStyle = SHIFT_COLORS[entry.shift] || { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' };
                                            const statusCfg = STATUS_CFG[entry.status] || STATUS_CFG.PENDING;
                                            return (
                                                <tr key={entry.id} className="hover:bg-orange-50/20 transition-colors">
                                                    <td className="px-4 py-3.5 font-black text-gray-400 text-[11px]">{idx + 1}</td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="font-black text-gray-800 text-[11px]">{entry.machine_name || '—'}</span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="font-bold text-gray-600 text-[11px]">{entry.sub_machine_name || '—'}</span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="font-mono font-black text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 whitespace-nowrap">
                                                            {entry.sap_part_number || entry.inventory_item?.sap_part_number || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="text-base font-black text-gray-900">{(entry.parts_produced || 0).toLocaleString()}</span>
                                                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest ml-1">pcs</span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-gray-500 font-bold">
                                                        {entry.machine_runtime_mins
                                                            ? `${(entry.machine_runtime_mins / 60).toFixed(1)}h`
                                                            : entry.machine_runtime_hours
                                                                ? `${entry.machine_runtime_hours}h`
                                                                : '—'}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${shiftStyle.bg} ${shiftStyle.text} ${shiftStyle.border}`}>
                                                            {entry.shift || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-gray-500 font-bold text-[11px]">
                                                        {entry.deo_name || '—'}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${statusCfg.bg} ${statusCfg.text}`}>
                                                            {statusCfg.icon}
                                                            {entry.status === 'VERIFIED' ? 'Verified' : entry.status === 'REJECTED' ? 'Rejected' : 'Pending'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
