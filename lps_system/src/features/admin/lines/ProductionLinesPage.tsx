import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Trash2, Eye, Activity, Factory, CheckCircle2, AlertTriangle, LayoutGrid, Calendar,
    X, ArrowLeft, Loader2, ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import { API_BASE } from '../../../lib/apiConfig';
import { getToken } from '../../../lib/storage';

interface SubMachine {
    id: number;
    name: string;
    is_active: boolean;
    status: string;
    part_number: string | null;
    vehicle_type: string | null;
    start_date: string | null;
    end_date: string | null;
    coverage_day: string | null;
    shortage_status: string | null;
}

interface LineGroup {
    id: number;
    name: string;
    status: string;
    total_machines: number;
    active_machines: number;
    inactive_machines: number;
    sub_machines: SubMachine[];
}

const PAGE_SIZE = 10;

interface ProductionLinesPageProps {
    canAddGroup?: boolean; // Admin = true, DEO = false
}

const ProductionLinesPage = ({ canAddGroup = true }: ProductionLinesPageProps) => {
    const [lines, setLines] = useState<LineGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLine, setSelectedLine] = useState<LineGroup | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    
    // Shortage data state
    const [requests, setRequests] = useState<any[]>([]);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');

    // Modals
    const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
    const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newMachineName, setNewMachineName] = useState('');

    const fetchStatus = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/admin/machines/status`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (res.ok) {
                const result = await res.json();
                if (result.success) setLines(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch machine status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await fetch(`${API_BASE}/deo/shortage-requests`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (res.ok) {
                const result = await res.json();
                if (result.success) setRequests(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch requests:', error);
        }
    };

    useEffect(() => { 
        fetchStatus();
        fetchRequests();
    }, []);

    // Stats
    const totalLines = lines.length;
    const activeLines = lines.filter(l => l.status === 'Active').length;
    const offlineLines = totalLines - activeLines;
    const totalMachines = lines.reduce((s, l) => s + l.total_machines, 0);

    // Filtered + paginated
    const filtered = lines.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    useEffect(() => { setCurrentPage(1); }, [searchTerm]);

    const handleAddGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch(`${API_BASE}/admin/lines`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ name: newGroupName, isActive: true })
            });
            setNewGroupName('');
            setIsAddGroupModalOpen(false);
            fetchStatus();
        } catch (error) { console.error(error); }
    };

    const handleAddMachine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLine) return;
        try {
            await fetch(`${API_BASE}/admin/lines`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ name: newMachineName, isActive: true, parent_id: selectedLine.id })
            });
            setNewMachineName('');
            setIsAddMachineModalOpen(false);
            fetchStatus();
            fetchRequests();
        } catch (error) { console.error(error); }
    };

    const handleDeleteLine = async (id: number) => {
        if (!confirm('Are you sure you want to delete this?')) return;
        try {
            await fetch(`${API_BASE}/admin/lines/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (selectedLine?.id === id) setSelectedLine(null);
            fetchStatus();
        } catch (error) { console.error(error); }
    };

    // ─── Sub-Machine Detail View ──────────────────────────────────────────────
    if (selectedLine) {
        // Detailed view logic similar to ShortageDashboard
        const shortagesForLine = requests.filter(req => {
            const rawLine = req.master_machine || req.line_name || 'UNASSIGNED';
            const individualLines = rawLine.split(',').map(s => s.trim());
            return individualLines.includes(selectedLine.name);
        }).filter(r => {
            let matches = true;
            if (filterStatus === 'pending') matches = r.status === 'PENDING';
            else if (filterStatus === 'in-progress') matches = r.status === 'IN_PROGRESS' || r.status === 'REJECTED' || r.status === 'DEO_FILLED' || r.status === 'VERIFIED';
            else if (filterStatus === 'rejected') matches = r.status === 'REJECTED';
            else if (filterStatus === 'completed') matches = r.status === 'COMPLETED' || r.status === 'VERIFIED';
            if (!matches) return false;

            const query = searchQuery.toLowerCase();
            const partMatch = r.inventory_item?.sap_part_number?.toLowerCase().includes(query) ||
                            r.inventory_item?.part_description?.toLowerCase().includes(query);
            if (searchQuery && !partMatch) return false;

            if (selectedDate && r.created_at?.split('T')[0] !== selectedDate) return false;
            return true;
        });

        const totalShortages = shortagesForLine.length;
        const pendingShortages = shortagesForLine.filter(r => r.status === 'PENDING').length;
        const verifiedShortages = shortagesForLine.filter(r => r.status === 'VERIFIED' || r.status === 'COMPLETED').length;

        return (
            <div className="min-h-screen bg-gray-50/30">
                {/* Header with KPIs */}
                <div className="p-6 bg-white border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSelectedLine(null)}
                            className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <Factory size={16} className="text-orange-600" />
                                </div>
                                <h1 className="text-2xl font-black text-gray-900">Shortages: {selectedLine.name}</h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-gray-50 rounded-2xl border border-gray-200 p-1">
                            <div className="px-4 py-1 text-center border-r border-gray-200 min-w-[80px]">
                                <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider">TOTAL</span>
                                <span className="block text-lg font-black text-gray-800 leading-none">{totalShortages}</span>
                            </div>
                            <div className="px-4 py-1 text-center border-r border-gray-200 text-amber-500 min-w-[80px]">
                                <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">PENDING</span>
                                <span className="block text-lg font-black leading-none">{pendingShortages}</span>
                            </div>
                            <div className="px-4 py-1 text-center text-emerald-500 min-w-[80px]">
                                <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">VERIFIED</span>
                                <span className="block text-lg font-black leading-none">{verifiedShortages}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsAddMachineModalOpen(true)}
                            className="h-[42px] px-6 bg-orange-600 hover:bg-orange-700 text-white rounded-full text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-orange-600/20"
                        >
                            <Plus size={16} /> Register Machine
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3 px-6 py-4">
                    <div className="relative group w-48">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-orange-50 rounded text-orange-500 pointer-events-none">
                            <LayoutGrid size={11} />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-full h-[40px] pl-12 pr-10 text-gray-700 font-bold text-[11px] tracking-wide outline-none transition-all appearance-none uppercase"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in-progress">In progress</option>
                            <option value="rejected">Rejected</option>
                            <option value="completed">Completed</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    <div className="relative group w-72">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search shortages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-full h-[40px] pl-14 pr-6 text-gray-700 font-bold text-[11px] tracking-wide outline-none transition-all uppercase"
                        />
                    </div>

                    <div className="relative group flex-shrink-0">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-indigo-50/50 rounded text-indigo-400 pointer-events-none">
                            <Calendar size={12} />
                        </div>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-white border border-gray-200 rounded-full h-[40px] pl-12 pr-5 text-gray-700 font-bold text-[11px] tracking-wide outline-none transition-all w-[180px] uppercase cursor-pointer"
                        />
                    </div>
                </div>

                {/* Sub-machines table with shortage columns */}
                <div className="px-6 pb-6">
                    <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-white text-gray-900 border-b-2 border-orange-500 uppercase text-[11px] font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-4 whitespace-nowrap">Sr.NO</th>
                                    <th className="px-6 py-4 whitespace-nowrap">Sub Machine</th>
                                    <th className="px-6 py-4 whitespace-nowrap">Part Number</th>
                                    <th className="px-6 py-4 text-center whitespace-nowrap">Demand Date</th>
                                    <th className="px-6 py-4 text-center whitespace-nowrap">Coverage Day</th>
                                    <th className="px-6 py-4 text-center whitespace-nowrap">SAP Stock</th>
                                    <th className="px-6 py-3 text-center whitespace-nowrap">Opening</th>
                                    <th className="px-6 py-3 text-center whitespace-nowrap">Today's</th>
                                    <th className="px-6 py-3 text-center whitespace-nowrap">Target</th>
                                    <th className="px-6 py-3 text-center whitespace-nowrap">Status</th>
                                    <th className="px-6 py-3 text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {selectedLine.sub_machines.map((sub, idx) => {
                                    // Only show a machine as OCCUPIED if it has an ACTIVE (non-completed) shortage
                                    const req = shortagesForLine.find(r =>
                                        (r.line_name?.trim().toUpperCase() === sub.name.trim().toUpperCase()) &&
                                        !['COMPLETED', 'REJECTED'].includes(r.status)
                                    );
                                    // For display purposes, also find the last completed req for history
                                    const completedReq = !req && shortagesForLine.find(r =>
                                        r.line_name?.trim().toUpperCase() === sub.name.trim().toUpperCase() &&
                                        r.status === 'COMPLETED'
                                    );
                                    const isVacant = !req;
                                    const coverage = req?.todays_stock && req.per_day ? (req.todays_stock / req.per_day).toFixed(1) : "—";
                                    
                                    return (
                                        <tr key={sub.id} className={`hover:bg-gray-50 transition-colors group ${isVacant ? 'bg-emerald-50/30' : ''}`}>
                                            <td className="px-6 py-4">
                                                <span className="text-[11px] font-black text-gray-400">{(idx + 1).toString().padStart(2, '0')}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                                                        isVacant
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            : 'bg-orange-50 text-orange-600 border-orange-100'
                                                    }`}>
                                                        <Activity size={14} />
                                                    </div>
                                                    <span className="text-[12px] font-black text-gray-900 tracking-tight">{sub.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isVacant ? (
                                                    <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200 uppercase tracking-tight">
                                                        VACANT
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-tight">
                                                        {req?.inventory_item?.sap_part_number || '—'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                                                    {req?.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-[10px] font-black tabular-nums px-2 py-1 rounded border ${
                                                    isVacant ? 'text-gray-300 border-transparent' :
                                                    coverage === "—" ? "text-gray-300 border-transparent" :
                                                    Number(coverage) >= 5 ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-rose-600 bg-rose-50 border-rose-100"
                                                }`}>
                                                    {isVacant ? '—' : `${coverage} ${coverage !== "—" ? "Days" : ""}`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-[11px] font-black text-gray-900 tabular-nums">{req?.sap_stock ?? '—'}</td>
                                            <td className="px-6 py-3 text-center text-[11px] font-black text-gray-900 tabular-nums">{req?.opening_stock ?? '—'}</td>
                                            <td className="px-6 py-3 text-center text-[11px] font-black text-orange-600 tabular-nums">{req?.todays_stock ?? '—'}</td>
                                            <td className="px-6 py-3 text-center text-[11px] font-black text-blue-600 tabular-nums">{req?.target_quantity || req?.inventory_item?.demand_quantity || '—'}</td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                                    isVacant
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : req?.status === 'COMPLETED' || req?.status === 'VERIFIED'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : req?.status === 'PENDING'
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : 'bg-gray-100 text-gray-400 border-gray-200'
                                                }`}>
                                                    {isVacant ? 'VACANT' : (req?.status || 'IDLE')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <button
                                                    onClick={() => handleDeleteLine(sub.id)}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modals */}
                {isAddMachineModalOpen && (
                    <AddModal
                        title="Register Machine"
                        description={`Add a physical machine to ${selectedLine.name}`}
                        label="Machine Name"
                        placeholder="e.g. 320T-A"
                        value={newMachineName}
                        onChange={setNewMachineName}
                        onSubmit={handleAddMachine}
                        onClose={() => setIsAddMachineModalOpen(false)}
                    />
                )}
            </div>
        );
    }

    // ─── Main Lines List View ─────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Factory size={16} className="text-orange-600" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900">Production Lines</h1>
                    </div>
                    <p className="text-sm text-gray-400 font-semibold ml-11">Manage production line groups and sub-machines</p>
                </div>

                {/* KPI badges + Add button */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                        {[
                            { label: 'TOTAL', value: totalLines, color: 'text-gray-700' },
                            { label: 'ACTIVE', value: activeLines, color: 'text-emerald-600' },
                            { label: 'OFFLINE', value: offlineLines, color: 'text-red-500' },
                            { label: 'MACHINES', value: totalMachines, color: 'text-orange-600' },
                        ].map((k, i) => (
                            <div key={k.label} className={`px-4 py-2 flex flex-col items-center ${i < 3 ? 'border-r border-gray-100' : ''}`}>
                                <span className={`text-lg font-black ${k.color}`}>{k.value}</span>
                                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{k.label}</span>
                            </div>
                        ))}
                    </div>
                    {canAddGroup && (
                        <button
                            onClick={() => setIsAddGroupModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                        >
                            <Plus size={16} /> Add Line Group
                        </button>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="px-6 pt-5 pb-3">
                <div className="relative max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search line name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-800 font-medium"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="px-6 pb-6">
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b-2 border-orange-500 bg-white">
                                {['SR.NO', 'Line Name', 'Total Machines', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="py-3.5 px-6 text-[11px] font-black text-black uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <Loader2 size={32} className="animate-spin text-orange-400 mx-auto mb-3" />
                                        <p className="text-gray-400 text-sm font-bold">Loading lines...</p>
                                    </td>
                                </tr>
                            ) : paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <Factory size={40} className="text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-400 text-sm font-black uppercase tracking-widest">No lines found</p>
                                    </td>
                                </tr>
                            ) : paginated.map((line, idx) => (
                                <tr key={line.id} className="hover:bg-orange-50/30 transition-colors">
                                    <td className="py-4 px-6">
                                        <span className="text-sm font-black text-gray-400">{(currentPage - 1) * PAGE_SIZE + idx + 1}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                                                <Factory size={15} className="text-orange-500" />
                                            </div>
                                            <span className="font-black text-gray-900">{line.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm font-bold text-orange-600">
                                            {line.total_machines} Machines
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                            line.status === 'Active'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${line.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                            {line.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedLine(line)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg text-xs font-bold transition-colors border border-orange-200"
                                            >
                                                <Eye size={13} /> VIEW
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLine(line.id)}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 px-1">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                            SHOWING {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)} TO {Math.min(currentPage * PAGE_SIZE, filtered.length)} OF {filtered.length} LINES
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={14} /> PREV
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                                        p === currentPage
                                            ? 'bg-orange-500 text-white shadow-sm'
                                            : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                NEXT <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Line Group Modal */}
            {isAddGroupModalOpen && (
                <AddModal
                    title="Create Line Group"
                    description="Define a new top-level production area"
                    label="Group Name"
                    placeholder="e.g. 320T"
                    value={newGroupName}
                    onChange={setNewGroupName}
                    onSubmit={handleAddGroup}
                    onClose={() => setIsAddGroupModalOpen(false)}
                />
            )}
        </div>
    );
};

// ─── Reusable Add Modal ───────────────────────────────────────────────────────

function AddModal({ title, description, label, placeholder, value, onChange, onSubmit, onClose }: {
    title: string;
    description: string;
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}) {
    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-300 hover:text-gray-700 transition-colors"
                    >
                        <X size={18} />
                    </button>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Plus size={15} className="text-orange-600" />
                        </div>
                        <h3 className="text-base font-black text-gray-900">{title}</h3>
                    </div>
                    <p className="text-xs text-gray-400 font-semibold mb-5 ml-11">{description}</p>
                    <form onSubmit={onSubmit}>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">{label}</label>
                        <input
                            autoFocus required type="text"
                            value={value}
                            onChange={e => onChange(e.target.value)}
                            placeholder={placeholder}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 mb-5"
                        />
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-[2] py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-black transition-colors shadow-sm"
                            >
                                Confirm
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

export default ProductionLinesPage;