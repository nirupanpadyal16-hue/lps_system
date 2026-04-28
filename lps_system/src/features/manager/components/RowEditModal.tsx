import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, ClipboardList } from 'lucide-react';

interface RowEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedRow: any) => void;
    onDelete: (id: number) => void;
    row: any;
    commonHeaders: string[];
    productionHeaders: string[];
    materialHeaders: string[];
}

const RowEditModal: React.FC<RowEditModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    row,
    commonHeaders,
    productionHeaders,
    materialHeaders
}) => {
    const [formData, setFormData] = useState<any>(null);

    useEffect(() => {
        if (isOpen && row) {
            setFormData({ ...row });
        }
    }, [isOpen, row]);

    if (!isOpen || !formData) return null;

    const handleChange = (key: string, value: string) => {
        setFormData((prev: any) => {
            const newData = { ...prev, [key]: value };

            // Auto-calculate RM SIZE if dimensions are edited
            if (['RM Thk mm', 'Sheet Width', 'Sheet Length'].includes(key)) {
                const thk = key === 'RM Thk mm' ? value : (prev['RM Thk mm'] || '');
                const width = key === 'Sheet Width' ? value : (prev['Sheet Width'] || '');
                const length = key === 'Sheet Length' ? value : (prev['Sheet Length'] || '');

                if (thk || width || length) {
                    newData['RM SIZE'] = `${thk}X${width}X${length}`.replace(/XX/g, 'X').replace(/^X|X$/g, '');
                }
            }

            return newData;
        });
    };

    const renderInput = (label: string, icon?: any) => {
        const isReadOnly = label === 'Coverage Days' || label === 'RM SIZE' || label === 'PER DAY' ||
            ['SR.NO', 'SR NO', 'SR. NO.', 'SN NO', 'S.', 'SN. NO'].includes(label.toUpperCase());
        const NUMERIC_FIELDS = [
            "TOTAL SCHEDULE QTY", "SAP Stock", "Opening Stock", "Todays Stock",
            "PER DAY", "Coverage Days"
        ];
        const isNumeric = NUMERIC_FIELDS.includes(label);

        return (
            <div className="space-y-1 group">
                <label className="flex items-center gap-2 text-xs font-bold text-black capitalize  pl-1">
                    {icon && React.createElement(icon, { size: 12, className: "text-ind-primary" })}
                    {label}
                    {['SAP PART NUMBER'].includes(label.toUpperCase()) && <span className="text-rose-500 ml-1">*</span>}
                </label>
                <input
                    type="text"
                    value={formData[label] || ''}
                    onChange={(e) => {
                        if (isReadOnly) return;
                        let val = e.target.value;
                        if (isNumeric) {
                            // Allow only numbers and decimal point
                            val = val.replace(/[^0-9.]/g, '');
                            // Prevent multiple decimal points
                            const parts = val.split('.');
                            if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                        }
                        handleChange(label, isNumeric ? val : val.toUpperCase());
                    }}
                    readOnly={isReadOnly}
                    className={`w-full border border-ind-border rounded-xl py-2.5 px-4 text-black capitalize text-sm outline-none transition-all placeholder:text-slate-200 ${isReadOnly ? 'bg-slate-50 cursor-not-allowed text-ind-text3 font-bold' : 'bg-white focus:border-ind-primary/30 focus:bg-white'
                        }`}
                    placeholder={isReadOnly ? 'Calculated automatically' : `Enter ${label.toLowerCase()}...`}
                />
            </div>
        );
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-ind-border/50 overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="px-8 py-4 border-b border-ind-border/50 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-ind-primary shadow-sm border border-orange-100/50">
                                <ClipboardList size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-ind-text uppercase tracking-tight">
                                    {formData.row_status === 'NEW' ? 'Add Component Row' : 'Edit Component Row'}
                                </h3>
                                <p className="text-[10px] font-black text-ind-text3 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                    <span>Part #{formData["PART NUMBER"] || 'NEW'}</span>
                                    <span className="text-slate-200 tracking-normal">•</span>
                                    <span className="text-ind-primary">Master Data Entry</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 hover:bg-ind-border/30 rounded-full transition-all text-ind-text3 hover:text-ind-text group"
                        >
                            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {/* Section 1: Identification */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">

                                <span className="text-sm font-bold text-ind-primary uppercase ">Identification</span>
                                <div className="h-px flex-1 bg-ind-border/30" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 border rounded-xl border-slate-100 shadow p-4">
                                {commonHeaders.filter(h => h.toUpperCase() !== 'S.').map(h => (
                                    <div key={h}>
                                        {renderInput(h)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Section 2: G-Chart View Data */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">

                                <span className="text-sm font-bold text-ind-primary uppercase">Operational Targets & Stock</span>
                                <div className="h-px flex-1 bg-ind-border/30" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 border rounded-xl border-slate-100 shadow p-4">
                                {productionHeaders.map(h => (
                                    <div key={h}>
                                        {renderInput(h)}
                                    </div>
                                ))}
                                {["TOTAL SCHEDULE QTY", "PER DAY", "SAP Stock", "Opening Stock", "Todays Stock", "Coverage Days"].map(h => (
                                    <div key={h}>
                                        {renderInput(h)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Section 3: Material Data */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">

                                <span className="text-sm font-bold text-ind-primary uppercase">Material Data</span>
                                <div className="h-px flex-1 bg-ind-border/30" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 border rounded-xl border-slate-100 shadow p-4 lg:grid-cols-4 gap-3">
                                {materialHeaders.filter(h => !["TOTAL SCHEDULE QTY", "PER DAY"].includes(h)).map(h => (
                                    <div key={h}>
                                        {renderInput(h)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-3 bg-ind-bg border-t border-ind-border/50 flex items-center justify-between sticky bottom-0 z-10">


                        <div className="flex gap-4 justify-end w-full">
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-white hover:bg-ind-border/30 border border-ind-border text-ind-text2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => onSave(formData)}
                                className="px-10 py-3 bg-[#F37021] hover:bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all  flex items-center gap-2"
                            >
                                <Save size={16} />
                                Save Changes
                            </button>
                        </div>
                    </div>

                    {/* Decorative Background Accents */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-ind-bg rounded-full -translate-y-1/2 translate-x-1/2 -z-10 opacity-50" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-50 rounded-full translate-y-1/2 -translate-x-1/2 -z-10 opacity-30" />
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default RowEditModal;
