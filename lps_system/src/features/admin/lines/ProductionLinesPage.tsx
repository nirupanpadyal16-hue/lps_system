import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Trash2, Eye, Activity, Factory,
    CheckCircle2, AlertCircle, X, ArrowLeft
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

const ProductionLinesPage = () => {
    const [lines, setLines] = useState<LineGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLineId, setSelectedLineId] = useState<number | null>(null);

    // Modals
    const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
    const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState(false);

    // Form state
    const [newGroupName, setNewGroupName] = useState('');
    const [newMachineName, setNewMachineName] = useState('');

    const fetchStatus = async () => {
        setIsLoading(true);
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE}/admin/machines/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setLines(result.data);
                }
            }
        } catch (error) {
            console.error('Failed to fetch machine status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    // Filtered lines
    const filteredLines = lines.filter(line =>
        line.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedLine = lines.find(l => l.id === selectedLineId) || null;

    // Derived stats
    const totalLines = lines.length;
    const activeLines = lines.filter(l => l.status === 'Active').length;
    const inactiveLines = totalLines - activeLines;

    // Handlers
    const handleAddGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE}/admin/lines`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ name: newGroupName, isActive: true })
            });
            if (response.ok) {
                setNewGroupName('');
                setIsAddGroupModalOpen(false);
                fetchStatus();
            }
        } catch (error) { console.error(error); }
    };

    const handleAddMachine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLineId) return;
        try {
            const response = await fetch(`${API_BASE}/admin/lines`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ name: newMachineName, isActive: true, parent_id: selectedLineId })
            });
            if (response.ok) {
                setNewMachineName('');
                setIsAddMachineModalOpen(false);
                fetchStatus();
            }
        } catch (error) { console.error(error); }
    };

    const handleDeleteLine = async (id: number) => {
        if (!confirm('Are you sure you want to delete this?')) return;
        try {
            const response = await fetch(`${API_BASE}/admin/lines/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (response.ok) {
                if (selectedLineId === id) setSelectedLineId(null);
                fetchStatus();
            }
        } catch (error) { console.error(error); }
    };

    return (
        <div className="bg-gray-50 min-h-[calc(100vh-64px)] p-6 font-sans text-gray-800">
            <div className="max-w-[1600px] mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-112px)]">

                {/* Header Section */}
                <div className="bg-white border-b border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Factory className="text-orange-600" />
                            Production Line Module
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Real-time telemetry and machine allocation dashboard</p>
                    </div>

                    {!selectedLine ? (
                        <div className="flex items-center gap-4">
                            <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                                <div className="px-4 py-2 border-r border-gray-200 flex flex-col items-center">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Total</span>
                                    <span className="font-bold text-lg text-gray-900">{totalLines}</span>
                                </div>
                                <div className="px-4 py-2 border-r border-gray-200 flex flex-col items-center">
                                    <span className="text-[10px] text-emerald-600 uppercase font-bold">Active</span>
                                    <span className="font-bold text-lg text-gray-900">{activeLines}</span>
                                </div>
                                <div className="px-4 py-2 flex flex-col items-center">
                                    <span className="text-[10px] text-red-500 uppercase font-bold">Offline</span>
                                    <span className="font-bold text-lg text-gray-900">{inactiveLines}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAddGroupModalOpen(true)}
                                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Plus size={16} /> Add Line Group
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSelectedLineId(null)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center gap-2 transition-colors border border-gray-200"
                            >
                                <ArrowLeft size={16} /> Back to Groups
                            </button>
                            <button
                                onClick={() => setIsAddMachineModalOpen(true)}
                                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Plus size={16} /> Register Machine
                            </button>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-auto custom-scrollbar bg-gray-50/50">
                    <AnimatePresence mode="wait">
                        {!selectedLine ? (
                            /* VIEW 1: Groups List */
                            <motion.div
                                key="groups"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-6"
                            >
                                <div className="mb-4 max-w-md relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search line name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-white border border-gray-300 text-gray-900 text-sm pl-10 pr-4 py-2 rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                                    />
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="py-3 px-6 font-semibold text-gray-600">Sr.NO</th>
                                                <th className="py-3 px-6 font-semibold text-gray-600">Line Name</th>
                                                <th className="py-3 px-6 font-semibold text-gray-600">Total Machines</th>
                                                <th className="py-3 px-6 font-semibold text-gray-600 text-center">Status</th>
                                                <th className="py-3 px-6 font-semibold text-gray-600 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {isLoading ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading...</td></tr>
                                            ) : filteredLines.length === 0 ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No lines found.</td></tr>
                                            ) : filteredLines.map((line, idx) => (
                                                <tr key={line.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-4 px-6 text-gray-500">{(idx + 1).toString().padStart(2, '0')}</td>
                                                    <td className="py-4 px-6 font-bold text-gray-900">{line.name}</td>
                                                    <td className="py-4 px-6 text-gray-600">{line.total_machines} Machines</td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${line.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {line.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => setSelectedLineId(line.id)}
                                                                className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-md text-xs font-semibold transition-colors flex items-center gap-1"
                                                            >
                                                                <Eye size={14} /> View
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteLine(line.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        ) : (
                            /* VIEW 2: Sub Machines List */
                            <motion.div
                                key="machines"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="p-6"
                            >
                                <div className="mb-4 flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500 uppercase font-bold">Current Group</span>
                                        <h2 className="text-xl font-bold text-gray-900">{selectedLine.name}</h2>
                                    </div>
                                    <div className="h-8 w-px bg-gray-200" />
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${selectedLine.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {selectedLine.status}
                                    </span>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="py-3 px-6 font-semibold text-gray-600">Sr.NO</th>
                                                <th className="py-3 px-6 font-semibold text-gray-600">Sub Machine</th>
                                                <th className="py-3 px-6 font-semibold text-gray-600">Part Number</th>
                                                <th className="py-3 px-6 font-semibold text-gray-600">Vehicle Type</th>
                                                <th className="py-3 px-6 font-semibold text-gray-600">Start Date</th>
                                                <th className="py-3 px-6 font-semibold text-gray-600">End Date</th>
                                                <th className="py-3 px-6 font-semibold text-gray-600">Coverage Day</th>
                                                <th className="py-3 px-6 font-semibold text-gray-600 text-center">Status</th>
                                                <th className="py-3 px-6 font-semibold text-gray-600 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {selectedLine.sub_machines.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className="p-12 text-center">
                                                        <Factory className="text-gray-300 mx-auto mb-3" size={32} />
                                                        <h3 className="text-lg font-semibold text-gray-700">No Machines Configured</h3>
                                                        <p className="text-gray-500 mt-1">Register a sub-machine to begin tracking production.</p>
                                                    </td>
                                                </tr>
                                            ) : selectedLine.sub_machines.map((sub, idx) => (
                                                <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-3 px-6 text-gray-500">{(idx + 1).toString().padStart(2, '0')}</td>
                                                    <td className="py-3 px-6">
                                                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md">
                                                            <Activity size={14} className="text-orange-600" />
                                                            <span className="font-bold text-gray-800">{sub.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-6">
                                                        {sub.part_number ? (
                                                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">{sub.part_number}</span>
                                                        ) : <span className="text-gray-400">-</span>}
                                                    </td>
                                                    <td className="py-3 px-6">
                                                        {sub.vehicle_type ? (
                                                            <span className="text-xs font-bold text-gray-700 uppercase">{sub.vehicle_type}</span>
                                                        ) : <span className="text-gray-400">-</span>}
                                                    </td>
                                                    <td className="py-3 px-6 text-gray-600 text-xs">
                                                        {sub.start_date || <span className="text-gray-400">-</span>}
                                                    </td>
                                                    <td className="py-3 px-6 text-gray-600 text-xs">
                                                        {sub.end_date || <span className="text-gray-400">-</span>}
                                                    </td>
                                                    <td className="py-3 px-6">
                                                        {sub.coverage_day ? (
                                                            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">{sub.coverage_day}</span>
                                                        ) : <span className="text-gray-400">-</span>}
                                                    </td>
                                                    <td className="py-3 px-6 text-center">
                                                        {sub.shortage_status ? (
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${sub.shortage_status === 'Complete'
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                                                }`}>
                                                                {sub.shortage_status}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-200">
                                                                IDLE
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-6 text-right">
                                                        <button
                                                            onClick={() => handleDeleteLine(sub.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {(isAddGroupModalOpen || isAddMachineModalOpen) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                            onClick={() => { setIsAddGroupModalOpen(false); setIsAddMachineModalOpen(false); }}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="relative bg-white border border-gray-200 rounded-2xl p-6 max-w-sm w-full shadow-xl"
                        >
                            <button
                                onClick={() => { setIsAddGroupModalOpen(false); setIsAddMachineModalOpen(false); }}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                                {isAddGroupModalOpen ? 'Create Line Group' : 'Register Machine'}
                            </h3>
                            <p className="text-sm text-gray-500 mb-6">
                                {isAddGroupModalOpen ? 'Define a new top-level production area.' : `Add a new physical machine to ${selectedLine?.name}.`}
                            </p>

                            <form onSubmit={isAddGroupModalOpen ? handleAddGroup : handleAddMachine}>
                                <div className="space-y-1 mb-6">
                                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                        {isAddGroupModalOpen ? 'Group Name' : 'Machine Name'}
                                    </label>
                                    <input
                                        autoFocus required type="text"
                                        value={isAddGroupModalOpen ? newGroupName : newMachineName}
                                        onChange={e => isAddGroupModalOpen ? setNewGroupName(e.target.value) : setNewMachineName(e.target.value)}
                                        placeholder={isAddGroupModalOpen ? "e.g. 320T" : "e.g. 320T-A"}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setIsAddGroupModalOpen(false); setIsAddMachineModalOpen(false); }}
                                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProductionLinesPage;