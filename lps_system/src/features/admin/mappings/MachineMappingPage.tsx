import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    Trash2,
    CheckCircle,
    X,
    Edit,
    Settings
} from 'lucide-react';
import { getToken } from '../../../lib/storage';
import { API_BASE } from '../../../lib/apiConfig';

// Simple Alert Component
const Alert = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
    <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-24 right-8 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 ${type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
    >
        {type === 'success' ? <CheckCircle size={20} /> : <X size={20} />}
        <span className="font-bold text-sm">{message}</span>
        <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full">
            <X size={14} />
        </button>
    </motion.div>
);

const MachineMappingPage = () => {
    const [mappings, setMappings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [alert, setAlert] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        part_number: '',
        sap_part_number: '',
        machine: ''
    });

    useEffect(() => {
        loadMappings();
    }, []);

    const loadMappings = async () => {
        setIsLoading(true);
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE}/manager/machine-mappings`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    setMappings(result.data);
                }
            }
        } catch (e) {
            console.error('Failed to load mappings', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenCreateModal = () => {
        setIsEditMode(false);
        setEditingId(null);
        setFormData({
            part_number: '',
            sap_part_number: '',
            machine: ''
        });
        setShowModal(true);
    };

    const handleOpenEditModal = (mapping: any) => {
        setIsEditMode(true);
        setEditingId(mapping.id);
        setFormData({
            part_number: mapping.part_number || '',
            sap_part_number: mapping.sap_part_number || '',
            machine: mapping.machine || ''
        });
        setShowModal(true);
    };

    const handleSaveMapping = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const token = getToken();

            if (isEditMode && editingId) {
                // UPDATE MAPPING
                const response = await fetch(`${API_BASE}/manager/machine-mappings/${editingId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData),
                });

                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.message || 'Failed to update mapping');

                setAlert({ message: 'Mapping updated successfully', type: 'success' });

            } else {
                // CREATE MAPPING
                const response = await fetch(`${API_BASE}/manager/machine-mappings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData),
                });

                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.message || 'Failed to create mapping');

                setAlert({ message: 'Mapping created successfully', type: 'success' });
            }

            setShowModal(false);
            loadMappings();
        } catch (error: any) {
            setAlert({ message: error.message || 'Operation failed', type: 'error' });
            setShowModal(false);
        } finally {
            setIsLoading(false);
        }
    };

    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, id: number | null }>({
        isOpen: false,
        id: null
    });

    const confirmDeleteMapping = async () => {
        if (deleteConfirmation.id) {
            try {
                const token = getToken();
                const response = await fetch(`${API_BASE}/manager/machine-mappings/${deleteConfirmation.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();
                if (response.ok && data.success) {
                    setAlert({ message: 'Mapping deleted successfully', type: 'success' });
                } else {
                    setAlert({ message: data.message || 'Failed to delete mapping', type: 'error' });
                }
            } catch (e) {
                console.error("Delete failed", e);
                setAlert({ message: 'Delete error', type: 'error' });
            }
            loadMappings();
            setDeleteConfirmation({ isOpen: false, id: null });
        }
    };

    // Filter mappings
    const filteredMappings = mappings.filter(m => {
        const query = searchTerm.toLowerCase();
        return (m.sap_part_number || '').toLowerCase().includes(query) ||
               (m.part_number || '').toLowerCase().includes(query) ||
               (m.machine || '').toLowerCase().includes(query);
    });

    const stats = {
        total: mappings.length
    };

    return (
        <div className="bg-gray-50/50">
            <AnimatePresence>
                {alert && (
                    <Alert
                        message={alert.message}
                        type={alert.type}
                        onClose={() => setAlert(null)}
                    />
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex xl:flex-row xl:items-center justify-between gap-4 bg-white border-b border-slate-100 py-2 px-4">
                <h1 className="text-[24px] font-black text-slate-800 tracking-tight leading-none flex items-center gap-3">
                    <Settings className="text-orange-500" /> Part-to-Machine Mappings
                </h1>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-4 px-4 py-2 bg-white rounded-xl border border-gray-200">
                        <div className="text-center">
                            <p className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider">Total Parts Mapped</p>
                            <p className="block text-base font-black text-slate-800 leading-none">{stats.total}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Controls */}
            <div className="sticky top-0 z-40 bg-white px-4 border-b border-gray-200 py-3">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="relative flex-1 md:w-96 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Search part number, SAP, or machine..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-slate-700 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm tracking-wide"
                        />
                    </div>
                    <button
                        onClick={handleOpenCreateModal}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-full font-bold text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:scale-95 shrink-0"
                    >
                        <Plus size={16} strokeWidth={3} />
                        <span className="hidden md:inline">Add New Mapping</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="p-4">
                <div className="grid grid-cols-12 px-6 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider border-b-2 border-orange-500 bg-white sticky top-0 z-[30]">
                    <div className="col-span-3 text-black">SAP Part Number</div>
                    <div className="col-span-4 text-black">Part Number</div>
                    <div className="col-span-3 text-center text-black">Machine Group</div>
                    <div className="col-span-2 text-right text-black">Actions</div>
                </div>

                <div className='h-[calc(100vh-260px)] overflow-y-auto bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200'>
                    {isLoading ? (
                        <div className="text-center py-20 text-slate-400 font-medium">Loading mappings...</div>
                    ) : filteredMappings.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 font-medium">No mappings found</div>
                    ) : (
                        filteredMappings.map((mapping) => (
                            <div key={mapping.id} className="grid grid-cols-12 items-center px-6 py-3 border-b border-gray-100 hover:bg-orange-50/30 transition-all">
                                <div className="col-span-3">
                                    <span className="text-sm font-black text-slate-800">{mapping.sap_part_number}</span>
                                </div>
                                <div className="col-span-4">
                                    <span className="text-xs font-semibold text-slate-500">{mapping.part_number || '—'}</span>
                                </div>
                                <div className="col-span-3 text-center">
                                    <span className="px-3 py-1 text-[11px] rounded-lg bg-orange-100 text-orange-700 font-black tracking-wider uppercase border border-orange-200">
                                        {mapping.machine || '—'}
                                    </span>
                                </div>
                                <div className="col-span-2 flex justify-end gap-2">
                                    <button onClick={() => handleOpenEditModal(mapping)} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                                        <Edit size={14} />
                                    </button>
                                    <button onClick={() => setDeleteConfirmation({ isOpen: true, id: mapping.id })} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        >
                            <div className="py-4 px-6 border-b border-gray-100 flex items-start justify-between bg-slate-50">
                                <div>
                                    <h3 className="font-black text-slate-800 text-xl tracking-tight">
                                        {isEditMode ? 'Edit Machine Mapping' : 'Add Machine Mapping'}
                                    </h3>
                                    <p className="text-gray-500 text-xs font-semibold mt-1">
                                        {isEditMode ? 'Modify part-to-machine routing rules.' : 'Create a new part-to-machine routing rule.'}
                                    </p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveMapping} className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">SAP Part Number <span className="text-red-500">*</span></label>
                                    <input type="text" required disabled={isEditMode} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-slate-800 placeholder:text-gray-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400" value={formData.sap_part_number} onChange={e => setFormData({ ...formData, sap_part_number: e.target.value })} placeholder="e.g. PTML12345" />
                                    {isEditMode && <p className="text-[10px] text-gray-400 ml-1">SAP Part Number cannot be changed once created.</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Part Number</label>
                                    <input type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-slate-800 placeholder:text-gray-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" value={formData.part_number} onChange={e => setFormData({ ...formData, part_number: e.target.value })} placeholder="e.g. 123-456-789" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Machine Group <span className="text-red-500">*</span></label>
                                    <input type="text" required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-slate-800 placeholder:text-gray-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" value={formData.machine} onChange={e => setFormData({ ...formData, machine: e.target.value })} placeholder="e.g. 320T" />
                                </div>

                                <div className="pt-4 flex items-center justify-end gap-3 mt-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                                    <button type="submit" disabled={isLoading} className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-sm transition-colors disabled:opacity-50">
                                        {isEditMode ? 'Update Mapping' : 'Save Mapping'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirmation.isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirmation({ isOpen: false, id: null })} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
                            <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-100">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="font-black text-slate-800 text-xl tracking-tight mb-2">Delete Mapping?</h3>
                            <p className="text-gray-500 text-sm font-medium mb-8">This part will no longer be auto-routed to a machine. This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteConfirmation({ isOpen: false, id: null })} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={confirmDeleteMapping} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 shadow-sm transition-colors">Yes, Delete</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MachineMappingPage;