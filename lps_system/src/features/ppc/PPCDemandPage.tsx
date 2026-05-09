/**
 * PPCDemandPage.tsx
 * Full demand management for PPC Planner — same UI as admin (DemandManagementPage),
 * using /api/ppc/demands endpoint instead of /api/admin/demands.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Car, Plus, Search, Edit2, Trash2, AlertTriangle,
    Eye, Calendar, Info, Clock, MapPin, ChevronDown, LayoutGrid
} from 'lucide-react';
import { getToken } from '../../lib/storage';
import { API_BASE } from '../../lib/apiConfig';
import DemandFormModal from '../admin/demand/DemandFormModal';

interface Demand {
    id: number;
    formatted_id?: string;
    model_id: string;
    model_name: string;
    quantity: number;
    start_date: string;
    end_date: string;
    status: string;
    line?: string;
    manager?: string;
    customer?: string;
    createdAt: string;
}

const PPCDemandPage = () => {
    const [demands, setDemands] = useState<Demand[]>([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [demandToDelete, setDemandToDelete] = useState<Demand | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [activeTab, setActiveTab] = useState('ALL');
    const [selectedInfoDemand, setSelectedInfoDemand] = useState<Demand | null>(null);

    const loadData = async () => {
        try {
            const token = getToken();
            // PPC uses /api/ppc/demands
            const res = await fetch(`${API_BASE}/ppc/demands`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                const data = result.data || [];
                setDemands(data);
                setStats({
                    total: data.length,
                    pending: data.filter((d: Demand) => d.status === 'PENDING').length,
                    inProgress: data.filter((d: Demand) => d.status === 'IN_PROGRESS').length,
                    completed: data.filter((d: Demand) => d.status === 'COMPLETED').length,
                });
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => { loadData(); }, []);

    const confirmDelete = async () => {
        if (!demandToDelete) return;
        try {
            const token = getToken();
            await fetch(`${API_BASE}/ppc/demands/${demandToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadData();
            setIsDeleteModalOpen(false);
            setDemandToDelete(null);
        } catch (e) { console.error(e); }
    };

    const filtered = demands.filter(d => {
        const matchSearch =
            d.model_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.formatted_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.customer?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchDate = !selectedDate || d.start_date === selectedDate;
        const matchTab = activeTab === 'ALL' || d.status === activeTab;
        return matchSearch && matchDate && matchTab;
    });

    return (
        <div className="max-w-[1800px] mx-auto bg-ind-bg/30">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white border-t border-ind-border/60 pb-2">
                <div className="flex xl:flex-row xl:items-center justify-between gap-4 bg-white border-b border-slate-100 mb-2 py-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
                        <h1 className="text-[24px] font-black text-ind-text tracking-tight leading-none">
                            Demand Management
                        </h1>
                    </div>
                    {/* Stats */}
                    <div className="flex items-center bg-white rounded-2xl border border-ind-border/50 p-1 shadow-sm overflow-hidden scale-90 origin-right mx-2">
                        {[
                            { label: 'TOTAL', val: stats.total, color: 'text-slate-800' },
                            { label: 'PENDING', val: stats.pending, color: 'text-amber-500' },
                            { label: 'IN PROGRESS', val: stats.inProgress, color: 'text-blue-500' },
                            { label: 'COMPLETED', val: stats.completed, color: 'text-emerald-500' },
                        ].map((s, i, arr) => (
                            <div key={s.label} className={`px-4 py-1 text-center ${i < arr.length - 1 ? 'border-r border-ind-border/50' : ''} ${s.color}`}>
                                <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">{s.label}</span>
                                <span className="block text-lg font-black leading-none">{s.val}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-2 px-2">
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {/* Status Filter */}
                        <div className="relative group w-full md:w-48">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-orange-50 rounded text-ind-primary pointer-events-none">
                                <LayoutGrid size={11} />
                            </div>
                            <select
                                value={activeTab}
                                onChange={e => setActiveTab(e.target.value)}
                                className="w-full bg-white border border-ind-border/60 focus:border-ind-primary rounded-full h-[42px] pl-12 pr-10 text-slate-700 font-bold text-[11px] tracking-wide outline-none shadow-sm appearance-none cursor-pointer"
                            >
                                {[
                                    { value: 'ALL', label: 'All Status' },
                                    { value: 'PENDING', label: 'Pending' },
                                    { value: 'IN_PROGRESS', label: 'In Progress' },
                                    { value: 'COMPLETED', label: 'Completed' },
                                ].map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ind-text3"><ChevronDown size={14} /></div>
                        </div>

                        {/* Search */}
                        <div className="relative group w-full md:w-64">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-ind-text3" size={14} />
                            <input
                                type="text"
                                placeholder="Search demands..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-ind-border/60 focus:border-ind-primary rounded-full h-[42px] pl-14 pr-6 text-slate-700 font-bold text-[11px] outline-none shadow-sm"
                            />
                        </div>

                        {/* Date Filter */}
                        <div className="relative group flex-shrink-0 hidden md:block">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-indigo-50/50 rounded text-indigo-400 pointer-events-none"><Calendar size={12} /></div>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="bg-white border border-ind-border/60 focus:border-ind-primary rounded-full h-[42px] pl-12 pr-5 text-slate-700 font-bold text-[11px] outline-none shadow-sm w-[180px]"
                            />
                            {selectedDate && (
                                <button onClick={() => setSelectedDate('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 font-black text-[9px] bg-white px-1 hover:underline">
                                    CLEAR
                                </button>
                            )}
                        </div>
                    </div>

                    {/* New Demand Button */}
                    <button
                        onClick={() => { setEditingDemand(null); setIsModalOpen(true); }}
                        className="w-full md:w-auto bg-gradient-to-r from-[#F37021] to-orange-600 text-white px-8 h-[42px] rounded-full font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        New Demand
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="px-2 py-2">
                <div className="overflow-x-auto rounded-2xl border border-ind-border/50 shadow-sm h-[calc(100vh-200px)] overflow-y-auto bg-white">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-ind-bg text-black border-b-2 border-[#f37021] uppercase text-[11px] tracking-wider sticky top-0 z-[50]">
                            <tr>
                                <th className="px-6 py-2 text-left">Demand</th>
                                <th className="px-6 py-2 text-center">Status</th>
                                <th className="px-6 py-2 text-right">Target</th>
                                <th className="px-6 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ind-border/40">
                            <AnimatePresence>
                                {filtered.map(demand => (
                                    <motion.tr
                                        key={demand.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="hover:bg-ind-bg/40 transition-colors"
                                    >
                                        <td className="px-6 py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-ind-primary">
                                                    <Car size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xs text-slate-800">{demand.model_name}</div>
                                                    <div className="text-[10px] text-ind-text3 font-medium uppercase">
                                                        {demand.formatted_id || `DEM-${demand.id}`} • {demand.line}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-2 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                                                demand.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                demand.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                demand.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                'bg-ind-bg text-ind-text2 border-ind-border'
                                            }`}>
                                                {demand.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-2 text-right">
                                            <div className="font-bold text-xs text-slate-800">{demand.quantity?.toLocaleString()} Units</div>
                                        </td>
                                        <td className="px-6 py-2 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedInfoDemand(demand)}
                                                    className="p-1 hover:bg-orange-50 rounded-md"
                                                >
                                                    <Info size={14} />
                                                </button>
                                                <button
                                                    onClick={() => { setEditingDemand(demand); setIsModalOpen(true); }}
                                                    className="p-1 hover:bg-blue-50 rounded-md"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => { setDemandToDelete(demand); setIsDeleteModalOpen(true); }}
                                                    className="p-1 hover:bg-rose-50 rounded-md"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Modal */}
            <AnimatePresence>
                {selectedInfoDemand && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80]"
                            onClick={() => setSelectedInfoDemand(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none p-4">
                            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto border border-ind-border/50">
                                <div className="p-8">
                                    <div className="flex justify-between items-start pb-2 mb-4 border-b border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-[#F37021] rounded-2xl flex items-center justify-center text-white shadow-xl">
                                                <Car size={28} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black text-ind-text3 uppercase tracking-widest block mb-1">Demand Details</span>
                                                <h3 className="text-2xl font-black text-ind-text uppercase">{selectedInfoDemand.model_name}</h3>
                                                <span className="text-[10px] font-black bg-ind-border/30 text-ind-text2 px-3 py-1 rounded-full">{selectedInfoDemand.formatted_id}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedInfoDemand(null)}
                                            className="w-10 h-10 bg-ind-bg rounded-full flex items-center justify-center text-ind-text3 hover:bg-rose-50 hover:text-rose-500 transition-all border border-ind-border/50">
                                            <Plus size={20} className="rotate-45" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-ind-bg/50 rounded-2xl p-4 border border-slate-100">
                                            <h4 className="text-[10px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <MapPin size={12} className="text-ind-primary" /> Context
                                            </h4>
                                            <div className="text-xs font-black text-slate-800 uppercase">{selectedInfoDemand.customer || 'CIE AUTOMOTIVE'}</div>
                                            <div className="text-[10px] text-gray-400">{selectedInfoDemand.line}</div>
                                        </div>
                                        <div className="bg-ind-bg/50 rounded-2xl p-4 border border-slate-100">
                                            <h4 className="text-[10px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Clock size={12} className="text-ind-primary" /> Timeline
                                            </h4>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-400">Start</span>
                                                <span className="font-bold">{selectedInfoDemand.start_date || '—'}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-400">End</span>
                                                <span className="font-bold">{selectedInfoDemand.end_date || '—'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedInfoDemand(null)}
                                        className="bg-[#F37021] text-white py-3 px-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center justify-center w-full">
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* DemandFormModal reused from admin */}
            <DemandFormModal
                isOpen={isModalOpen}
                editingDemand={editingDemand}
                onClose={() => { setIsModalOpen(false); setEditingDemand(null); }}
                onSuccess={() => { loadData(); setIsModalOpen(false); setEditingDemand(null); }}
            />

            {/* Delete Modal */}
            <AnimatePresence>
                {isDeleteModalOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
                            onClick={() => setIsDeleteModalOpen(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none p-4">
                            <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden pointer-events-auto border border-ind-border/50">
                                <div className="p-8 text-center space-y-6">
                                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto">
                                        <AlertTriangle size={36} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 uppercase mb-2">Confirm Deletion</h3>
                                        <p className="text-ind-text2 text-sm font-bold px-4">
                                            Delete demand for <span className="text-ind-text font-extrabold underline decoration-rose-200">{demandToDelete?.model_name}</span>?
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setIsDeleteModalOpen(false)}
                                            className="py-4 bg-ind-bg text-ind-text3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-ind-border/50">
                                            Cancel
                                        </button>
                                        <button onClick={confirmDelete}
                                            className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                                            <Trash2 size={14} /> Yes, Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PPCDemandPage;
