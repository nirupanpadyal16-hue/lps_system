/**
 * SupervisorVerificationModal Component
 * 
 * A high-fidelity modal dialog that allows supervisors to drill down into 
 * specific production entries. It provides:
 * - Read-only view of machine, part, and production metrics.
 * - Operator remarks display.
 * - Feedback input for approval or rejection.
 * - Animated transitions using Framer Motion.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Zap,
    Cpu,
    Calendar,
    Clock,
    FileText,
    CheckCircle2,
    Edit2,
    Activity
} from 'lucide-react';

interface SupervisorVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    log: any;
    onVerify: (status: 'VERIFIED' | 'REJECTED', reason: string) => Promise<void>;
}

const SupervisorVerificationModal: React.FC<SupervisorVerificationModalProps> = ({
    isOpen,
    onClose,
    log,
    onVerify
}) => {
    const [rejectionReason, setRejectionReason] = useState('');

    /**
     * Logic to populate existing rejection reason/feedback if already present in the log.
     */
    useEffect(() => {
        if (isOpen && log) {
            setRejectionReason(log.rejection_reason || '');
        }
    }, [isOpen, log]);

    if (!isOpen || !log) return null;

    /**
     * Reusable UI block for standardized read-only data fields.
     */
    const renderReadOnlyField = (label: string, value: any) => (
        <div className="space-y-1.5 flex-1">
            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">
                {label}
            </label>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-black text-slate-800 shadow-sm">
                {value || '—'}
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-ind-border/50"
                >
                    {/* Header */}
                    <div className="p-5 border-b border-slate-50 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xl shadow-orange-500/30">
                                <Zap size={18} fill="white" strokeWidth={0} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">
                                    Verification Detail View
                                </h2>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reviewing Log ID: {log.id}</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-auto p-8 space-y-6 custom-scrollbar bg-white">
                        <div className="grid grid-cols-2 gap-6">
                            {renderReadOnlyField("Logging Date", log.date)}
                            {renderReadOnlyField("Assigned Shift", log.shift)}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Production Machine</label>
                            <div className="relative">
                                <Cpu size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-10 text-xs font-black text-slate-800 shadow-sm uppercase">
                                    {log.machine_name || 'Manual'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Sub-Machine Matrix</label>
                            <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-inner">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-100/30">
                                        <tr>
                                            <th className="px-5 py-3 text-[9px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">Sub Machine</th>
                                            <th className="px-5 py-3 text-[9px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">SAP Part Number</th>
                                            <th className="px-5 py-3 text-[9px] font-black text-slate-900 uppercase tracking-widest text-right whitespace-nowrap">Daily Production</th>
                                            <th className="px-5 py-3 text-[9px] font-black text-slate-900 uppercase tracking-widest text-right whitespace-nowrap">Machine Run Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className="bg-white/50">
                                            <td className="px-5 py-4">
                                                <div className="w-full bg-white border border-ind-border/60 rounded-lg py-2 px-3 text-[11px] font-black text-slate-800 uppercase">
                                                    {log.sub_machine_name || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="w-full bg-white border border-ind-border/60 rounded-lg py-2 px-3 text-[11px] font-black text-slate-800 uppercase">
                                                    {log.sap_part_number || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="w-24 bg-white border border-ind-border/60 rounded-lg py-2 px-3 text-[12px] font-black text-[#f97316] text-right ml-auto">
                                                    {log.parts_produced || log.actual_qty || '0'}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="w-24 bg-white border border-ind-border/60 rounded-lg py-2 px-3 text-[12px] font-black text-blue-600 text-right ml-auto">
                                                    {log.machine_run_time || '0'} hrs
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Operator Remarks</label>
                            <div className="relative">
                                <FileText size={14} className="absolute left-4 top-4 text-slate-400" />
                                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-6 text-[11px] font-bold text-slate-600 min-h-[80px] shadow-sm italic">
                                    {log.remarks || 'No remarks provided by operator.'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-4 border-t border-slate-50">
                            <label className="text-[10px] font-black text-[#f37021] uppercase tracking-widest ml-1">Supervisor Review Feedback</label>
                            <div className="relative group">
                                <Edit2 size={14} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-[#f37021] transition-colors" />
                                <textarea 
                                    rows={2}
                                    placeholder="Add review feedback or reason for rejection..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold text-slate-800 outline-none focus:border-[#f37021] transition-all shadow-sm resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 
                        FOOTER ACTIONS: Reject vs Authorize
                        'Reject' resets the status to REJECTED (sending it back to DEO).
                        'Authorize' moves the status to VERIFIED (completing the loop).
                    */}
                    <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex items-center gap-3">
                        <button
                            onClick={() => onVerify('REJECTED', rejectionReason)}
                            className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-400 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 hover:text-rose-500 hover:border-rose-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <X size={16} /> Reject Entry
                        </button>
                        
                        <button
                            onClick={() => onVerify('VERIFIED', rejectionReason)}
                            className="flex-[2] px-6 py-3 bg-gradient-to-r from-[#F37021] to-orange-600 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={16} /> Authorize & Verify
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SupervisorVerificationModal;
