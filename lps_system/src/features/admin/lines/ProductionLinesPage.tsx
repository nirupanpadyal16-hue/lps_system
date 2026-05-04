import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Plus,
    Search,
    Settings2,
    Trash2,
    X,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Zap,
    AlertCircle,
    ArrowRight,
    Factory,
    Eye,
    Info,
    Calendar,
    LayoutGrid
} from 'lucide-react';
import { API_BASE } from '../../../lib/apiConfig';
import { getToken } from '../../../lib/storage';

interface ProductionLine {
    id: number;
    name: string;
    line_name: string;
    description: string;
    isActive: boolean;
    parent_id?: number | null;
    children?: ProductionLine[];
}

const ProductionLinesPage = () => {
    const [lines, setLines] = useState<ProductionLine[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedLine, setSelectedLine] = useState<ProductionLine | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [lineToDelete, setLineToDelete] = useState<ProductionLine | null>(null);
    // Hierarchy Selection States
    const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
    const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
    const [unitType, setUnitType] = useState<'area' | 'machine' | 'sub'>('area');

    // UI States
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        line_name: '',
        description: '',
        isActive: true,
        parent_id: null as number | null
    });

    const fetchLines = async () => {
        setIsLoading(true);
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE}/admin/lines`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success) setLines(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch lines:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLines();
    }, []);

    const toggleRow = (id: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const handleOpenAddModal = (line?: ProductionLine, asChild: boolean = false) => {
        if (line && !asChild) {
            // EDITING
            setSelectedLine(line);
            setFormData({
                name: line.name,
                line_name: line.line_name || '',
                description: line.description || '',
                isActive: line.isActive,
                parent_id: line.parent_id || null
            });

            // Determine type and pre-select parents for editing
            if (!line.parent_id) {
                setUnitType('area');
            } else {
                const parent = lines.find(l => l.id === line.parent_id);
                if (parent && !parent.parent_id) {
                    setUnitType('machine');
                    setSelectedAreaId(parent.id);
                } else if (parent && parent.parent_id) {
                    setUnitType('sub');
                    setSelectedAreaId(parent.parent_id);
                    setSelectedMachineId(parent.id);
                }
            }
            setIsEditing(true);
        } else if (line && asChild) {
            // ADDING CHILD TO SPECIFIC UNIT
            setSelectedLine(null);
            const isArea = !line.parent_id;
            if (isArea) {
                setUnitType('machine');
                setSelectedAreaId(line.id);
                setSelectedMachineId(null);
                setFormData({ name: '', line_name: '', description: '', isActive: true, parent_id: line.id });
            } else {
                setUnitType('sub');
                const areaId = line.parent_id || null;
                setSelectedAreaId(areaId);
                setSelectedMachineId(line.id);
                setFormData({ name: '', line_name: '', description: '', isActive: true, parent_id: line.id });
            }
            setIsEditing(false);
        } else {
            // NEW TOP LEVEL
            setSelectedLine(null);
            setUnitType('area');
            setSelectedAreaId(null);
            setSelectedMachineId(null);
            setFormData({ name: '', line_name: '', description: '', isActive: true, parent_id: null });
            setIsEditing(false);
        }
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setIsEditing(false);
        setSelectedLine(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = getToken();
            const url = isEditing
                ? `${API_BASE}/admin/lines/${selectedLine?.id}`
                : `${API_BASE}/admin/lines`;
            const method = isEditing ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                await fetchLines();
                handleCloseModal();
            }
        } catch (error) {
            console.error('Failed to save line:', error);
        }
    };

    const handleDeleteClick = (line: ProductionLine) => {
        setLineToDelete(line);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!lineToDelete) return;
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE}/admin/lines/${lineToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                fetchLines();
                setIsDeleteModalOpen(false);
                setLineToDelete(null);
            }
        } catch (error) {
            console.error('Failed to delete line:', error);
        }
    };

    const topLevelLines = useMemo(() => {
        return lines.filter(line => !line.parent_id);
    }, [lines]);

    // 3-Level Hierarchy Logic: Area (L0) -> Machine (L1) -> Sub-Machine (L2)
    const displayLines = useMemo(() => {
        const result: { machine: ProductionLine; area: ProductionLine; isEmptyArea?: boolean }[] = [];

        lines.forEach(area => {
            if (!area.parent_id) { // Level 0 (Area/Line Name)
                if (area.children && area.children.length > 0) {
                    area.children.forEach(machine => {
                        // Level 1 (Machine)
                        result.push({ machine, area });
                    });
                } else {
                    // Include empty areas so they can be deleted
                    result.push({
                        machine: { ...area, children: [] } as ProductionLine,
                        area,
                        isEmptyArea: true
                    });
                }
            }
        });

        return result.filter(item => {
            const search = searchTerm.toLowerCase();
            return item.machine.name.toLowerCase().includes(search) ||
                item.area.name.toLowerCase().includes(search) ||
                (item.machine.description || '').toLowerCase().includes(search);
        });
    }, [lines, searchTerm]);

    const activeCount = lines.filter(l => l.isActive).length;
    const offlineCount = lines.length - activeCount;

    return (
        <div className="bg-white flex flex-col h-[calc(100vh-64px)] overflow-hidden">
            {/* Header: Compact Version */}
            <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Machine Hierarchy</h1>

                <div className="flex items-center bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-2 border-r border-slate-50 text-center">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">TOTAL</span>
                        <span className="text-lg font-black text-slate-900 leading-none">{lines.length}</span>
                    </div>
                    <div className="px-5 py-2 border-r border-slate-50 text-center">
                        <span className="block text-[8px] font-black text-orange-400 uppercase tracking-widest mb-0.5">ACTIVE</span>
                        <span className="text-lg font-black text-slate-900 leading-none">{activeCount}</span>
                    </div>
                    <div className="px-5 py-2 border-r border-slate-50 text-center">
                        <span className="block text-[8px] font-black text-blue-400 uppercase tracking-widest mb-0.5">STAGING</span>
                        <span className="text-lg font-black text-slate-900 leading-none">0</span>
                    </div>
                    <div className="px-5 py-2 text-center">
                        <span className="block text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">OFFLINE</span>
                        <span className="text-lg font-black text-slate-900 leading-none">{offlineCount}</span>
                    </div>
                </div>
            </div>

            {/* Compact Filters Bar */}
            <div className="px-6 py-3 flex items-center gap-3 flex-shrink-0">
                <div className="relative group min-w-[180px]">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-ind-primary">
                        <LayoutGrid size={13} strokeWidth={3} />
                    </div>
                    <select className="w-full h-11 pl-12 pr-8 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none shadow-sm cursor-pointer focus:border-ind-primary/20 transition-all">
                        <option>All Status</option>
                        <option>Operational</option>
                        <option>Offline</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} strokeWidth={3} />
                </div>

                <div className="relative group flex-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                        type="text"
                        placeholder="Search machines..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-11 pl-12 pr-6 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none shadow-sm placeholder:text-slate-300 focus:border-ind-primary/20 transition-all"
                    />
                </div>

                <div className="relative group min-w-[200px]">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 pointer-events-none">
                        <Calendar size={14} strokeWidth={2.5} />
                    </div>
                    <input
                        type="date"
                        className="w-full h-11 pl-12 pr-6 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none shadow-sm cursor-pointer focus:border-ind-primary/20 transition-all uppercase appearance-none"
                    />
                </div>

                <button
                    onClick={() => handleOpenAddModal()}
                    className="h-11 px-6 bg-ind-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
                >
                    <Plus size={16} strokeWidth={4} />
                    Create New Line
                </button>
            </div>

            {/* Main Table Container: Increased padding for cleaner look */}
            <div className="flex-1 mx-6 mb-6 bg-white rounded-3xl border border-slate-100 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-white">
                            <tr>
                                <th className="py-5 px-6 text-[10px] font-black text-slate-900 uppercase tracking-widest">SN</th>
                                <th className="py-5 px-6 text-[10px] font-black text-slate-900 uppercase tracking-widest">Line Name</th>
                                <th className="py-5 px-6 text-[10px] font-black text-slate-900 uppercase tracking-widest">Machine Name</th>
                                <th className="py-5 px-6 text-[10px] font-black text-slate-900 uppercase tracking-widest">Sub-Machine</th>
                                <th className="py-5 px-6 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">Operational Status</th>
                                <th className="py-5 px-6 text-[10px] font-black text-slate-900 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                            <tr className="h-[2px] bg-ind-primary w-full absolute bottom-0 left-0"></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="p-12"><div className="h-12 bg-slate-50 rounded-2xl w-full" /></td>
                                    </tr>
                                ))
                            ) : displayLines.length > 0 ? (
                                displayLines.map((item, index) => {
                                    const { machine, area } = item;
                                    return (
                                        <React.Fragment key={machine.id}>
                                            <tr className="group hover:bg-slate-50/40 transition-colors border-b border-slate-50">
                                                <td className="py-3 px-6">
                                                    <span className="text-xs font-black text-slate-300">{(index + 1).toString().padStart(2, '0')}</span>
                                                </td>
                                                <td className="py-3 px-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-black text-slate-800 tracking-tight leading-none uppercase">{area.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div>
                                                        {item.isEmptyArea ? (
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No Machine Registered</span>
                                                        ) : (
                                                            <>
                                                                <span className="block text-[11px] font-bold text-slate-800 uppercase tracking-wide">{machine.name}</span>
                                                                {machine.description && (
                                                                    <span className="block text-[9px] font-medium text-slate-400 mt-0.5 truncate max-w-[150px]" title={machine.description}>
                                                                        {machine.description}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col gap-1.5">
                                                        {item.isEmptyArea ? (
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">N/A</span>
                                                        ) : machine.children && machine.children.length > 0 ? (
                                                            <button
                                                                onClick={() => toggleRow(machine.id)}
                                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all shadow-sm ${expandedRows.has(machine.id) ? 'bg-ind-primary text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                                    }`}
                                                            >
                                                                {machine.children.length} SUB-MACHINES
                                                                {expandedRows.has(machine.id) ? <ChevronDown size={10} strokeWidth={3} /> : <ChevronRight size={10} strokeWidth={3} />}
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">N/A</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-6 text-center">
                                                    <div className={`inline-flex items-center px-6 py-1.5 rounded-full font-black text-[9px] tracking-widest uppercase border ${machine.isActive
                                                        ? 'bg-emerald-50 text-emerald-500 border-emerald-100'
                                                        : 'bg-rose-50 text-rose-500 border-rose-100'
                                                        }`}>
                                                        {machine.isActive ? 'ACTIVE' : 'OFFLINE'}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleOpenAddModal(machine, true)}
                                                            className="w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-ind-primary transition-all shadow-sm group/add"
                                                            title="Add Sub-Machine"
                                                        >
                                                            <Plus size={16} strokeWidth={2.5} className="group-hover/add:scale-125 transition-transform" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenAddModal(machine)}
                                                            className="w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-all shadow-sm"
                                                            title="Configure"
                                                        >
                                                            <Settings2 size={16} strokeWidth={2.5} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(machine)}
                                                            className="w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all shadow-sm"
                                                            title="Decommission"
                                                        >
                                                            <Trash2 size={16} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            <AnimatePresence>
                                                {expandedRows.has(machine.id) && machine.children && machine.children.map((child, cIdx) => (
                                                    <motion.tr
                                                        key={child.id}
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="bg-slate-50/20 border-b border-slate-100/50"
                                                    >
                                                        <td className="py-3 px-6 opacity-40">
                                                            <span className="text-[10px] font-bold">{(index + 1)}.{cIdx + 1}</span>
                                                        </td>
                                                        <td className="py-3 px-6">
                                                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-tight">{area.name}</span>
                                                        </td>
                                                        <td className="py-3 px-6">
                                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{machine.name}</span>
                                                        </td>
                                                        <td className="py-3 px-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-ind-primary shadow-sm">
                                                                    <ArrowRight size={12} strokeWidth={3} />
                                                                </div>
                                                                <div>
                                                                    <span className="block text-xs font-black text-slate-600 uppercase tracking-wide">{child.name}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-6 text-center">
                                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase ${child.isActive ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 bg-slate-100'
                                                                }`}>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${child.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                                {child.isActive ? 'OPERATIONAL' : 'STANDBY'}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-6 text-right">
                                                            <div className="flex items-center justify-end gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleOpenAddModal(child)}
                                                                    className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-500 hover:text-ind-primary shadow-sm"
                                                                >
                                                                    <Settings2 size={12} strokeWidth={2.5} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteClick(child)}
                                                                    className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-500 hover:text-rose-500 shadow-sm"
                                                                >
                                                                    <Trash2 size={12} strokeWidth={2.5} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-48 text-center">
                                        <div className="w-28 h-28 bg-slate-50 rounded-[3rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-slate-100">
                                            <Activity size={56} className="text-slate-200" />
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">System Empty</h3>
                                        <p className="text-sm font-bold text-slate-400 mt-2 max-w-sm mx-auto">Initialize the machine hierarchy to begin tracking production assets.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upgraded Registration Modal - Premium Industrial Design */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
                            onClick={handleCloseModal}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.98 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
                        >
                            <div className="bg-white rounded-3xl w-full max-w-xl shadow-[0_40px_120px_-30px_rgba(0,0,0,0.3)] pointer-events-auto overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
                                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                                    {/* Compact Modal Header */}
                                    <div className="px-8 py-5 flex items-center justify-between border-b border-slate-50 shrink-0">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 bg-ind-primary rounded-xl text-white shadow-lg flex items-center justify-center">
                                                <Factory size={22} strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1 uppercase">
                                                    {isEditing ? 'Unit Configuration' : 'Register Asset'}
                                                </h2>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Management</p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95"
                                        >
                                            <X size={20} strokeWidth={3} />
                                        </button>
                                    </div>

                                    {/* Compact Modal Body */}
                                    <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar min-h-0">
                                        {/* Unit Type Selection */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Asset Classification</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[
                                                    { id: 'area', label: 'Line Area', icon: Factory },
                                                    { id: 'machine', label: 'Primary Machine', icon: Activity },
                                                    { id: 'sub', label: 'Sub-Machine', icon: LayoutGrid }
                                                ].map((type) => (
                                                    <button
                                                        key={type.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setUnitType(type.id as any);
                                                            if (type.id === 'area') setFormData(f => ({ ...f, parent_id: null }));
                                                        }}
                                                        className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all duration-300 transform active:scale-95 ${unitType === type.id
                                                            ? 'bg-orange-50/50 border-ind-primary text-ind-primary shadow-sm'
                                                            : 'bg-white border-slate-50 text-slate-400 hover:border-slate-200'
                                                            }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-0.5 transition-colors ${unitType === type.id ? 'bg-ind-primary text-white' : 'bg-slate-50 text-slate-400'}`}>
                                                            <type.icon size={16} strokeWidth={2.5} />
                                                        </div>
                                                        <span className="text-[8px] font-black uppercase tracking-tight">{type.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Dependent Hierarchical Dropdowns */}
                                        {(unitType === 'machine' || unitType === 'sub') && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Select Line Area</label>
                                                    <div className="relative">
                                                        <select
                                                            required
                                                            value={selectedAreaId || ''}
                                                            onChange={(e) => {
                                                                const id = Number(e.target.value);
                                                                setSelectedAreaId(id);
                                                                setSelectedMachineId(null);
                                                                if (unitType === 'machine') setFormData(f => ({ ...f, parent_id: id }));
                                                            }}
                                                            className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-5 text-sm font-bold text-slate-800 outline-none appearance-none focus:bg-white focus:border-ind-primary transition-all"
                                                        >
                                                            <option value="">Choose Area...</option>
                                                            {topLevelLines.map(area => (
                                                                <option key={area.id} value={area.id}>{area.name}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                                                    </div>
                                                </div>

                                                {unitType === 'sub' && (
                                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Select Parent Machine</label>
                                                        <div className="relative">
                                                            <select
                                                                required
                                                                value={selectedMachineId || ''}
                                                                onChange={(e) => {
                                                                    const id = Number(e.target.value);
                                                                    setSelectedMachineId(id);
                                                                    setFormData(f => ({ ...f, parent_id: id }));
                                                                }}
                                                                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-5 text-sm font-bold text-slate-800 outline-none appearance-none focus:bg-white focus:border-ind-primary transition-all"
                                                            >
                                                                <option value="">Choose Machine...</option>
                                                                {lines.find(l => l.id === selectedAreaId)?.children?.map(machine => (
                                                                    <option key={machine.id} value={machine.id}>{machine.name}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                                                {unitType === 'area' ? 'Line Area Name' : unitType === 'machine' ? 'Machine Identification' : 'Sub-Machine Name'}
                                            </label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder={unitType === 'area' ? "e.g. ABC" : unitType === 'machine' ? "e.g. 320T" : "e.g. SPINDLE-01"}
                                                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-5 text-sm font-bold text-slate-800 focus:bg-white focus:border-ind-primary transition-all outline-none uppercase placeholder:text-slate-300 shadow-inner"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 ${formData.isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white text-slate-300 border border-slate-100'}`}>
                                                    <Zap size={20} strokeWidth={2.5} fill={formData.isActive ? "currentColor" : "none"} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Operational State</span>
                                                    <span className={`text-sm font-black uppercase tracking-tight ${formData.isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                                                        {formData.isActive ? 'System Online' : 'System Offline'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div
                                                onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                                                className={`w-14 h-8 rounded-full p-1 transition-all duration-500 cursor-pointer relative ${formData.isActive ? 'bg-orange-500 shadow-lg shadow-orange-500/20' : 'bg-slate-200'}`}
                                            >
                                                <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-500 transform ${formData.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Compact Modal Footer */}
                                    <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center gap-3 shrink-0">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="flex-1 h-12 bg-white border border-slate-200 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all active:scale-95 shadow-sm"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-[2] h-12 bg-ind-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 size={16} strokeWidth={3} />
                                            Confirm
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Delete Confirmation */}
            <AnimatePresence>
                {isDeleteModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/80 backdrop-blur-lg z-[100]"
                            onClick={() => setIsDeleteModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 50 }}
                            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
                        >
                            <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden border border-rose-100">
                                <div className="p-12 text-center">
                                    <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-rose-100">
                                        <AlertCircle size={48} strokeWidth={3} />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-4 leading-none">Execute Purge?</h2>
                                    <p className="text-base font-bold text-slate-400 leading-relaxed mb-10">
                                        Permanently decommission <span className="text-rose-500 font-black uppercase tracking-tight">{lineToDelete?.name}</span>?
                                    </p>
                                    <div className="flex gap-5">
                                        <button
                                            onClick={() => setIsDeleteModalOpen(false)}
                                            className="flex-1 h-16 rounded-[1.25rem] bg-slate-50 text-slate-400 text-sm font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={confirmDelete}
                                            className="flex-1 h-16 rounded-[1.25rem] bg-rose-500 text-white text-sm font-black uppercase tracking-widest shadow-xl shadow-rose-500/40 hover:bg-rose-600 transition-all active:scale-95"
                                        >
                                            Execute
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

export default ProductionLinesPage;