import { useState, useMemo } from 'react';
import {
    ClipboardCheck, ArrowLeft, Clock, Shield, ShieldAlert, AlertCircle, Database
} from 'lucide-react';
import { cn } from '../../../../../lib/utils';
import { SupervisorRowVerifyModal } from './SupervisorRowVerifyModal';

interface LogDetailViewProps {
    selectedLog: any;
    setSelectedLog: (log: any) => void;
    onBulkVerify: () => Promise<void>;
    onRejectLog: (reason: string) => Promise<void>;
    onRowVerify?: (rowIndex: number, status: 'VERIFIED' | 'REJECTED', reason?: string) => Promise<void>;
    isVerifying?: boolean;
}

export const LogDetailView = ({
    selectedLog,
    setSelectedLog,
    onBulkVerify,
    onRejectLog,
    onRowVerify,
    isVerifying = false
}: LogDetailViewProps) => {
    const [selectedRowDetail, setSelectedRowDetail] = useState<any>(null);

    if (!selectedLog) return null;

    const logData: any[] = selectedLog.log_data || [];

    // Count statuses
    const verifiedCount = logData.filter(r => r.row_status === 'VERIFIED').length;
    const rejectedCount = logData.filter(r => r.row_status === 'REJECTED').length;
    const pendingCount = logData.length - verifiedCount - rejectedCount;

    // Dynamic Columns Logic
    const labelMap: Record<string, string> = {
        "SN. NO": "Sn.",
        "SAP PART NUMBER": "Sap part number",
        "PART NUMBER": "Part number",
        "PART DESCRIPTION": "Part description",
        "ASSEMBLY NUMBER": "Assembly number",
        "PER DAY": "Per day",
        "SAP Stock": "Sap stock",
        "Opening Stock": "Opening stock",
        "Todays Stock": "Todays stock",
        "Coverage Days": "Coverage days"
    };

    const displayColumns = useMemo(() => {
        const base = ["SN. NO", "SAP PART NUMBER", "PART NUMBER", "PART DESCRIPTION"];
        const hasAssembly = logData.some(r => r["ASSEMBLY NUMBER"] && r["ASSEMBLY NUMBER"] !== "—");
        if (hasAssembly) base.push("ASSEMBLY NUMBER");
        base.push("PER DAY", "SAP Stock", "Opening Stock", "Todays Stock", "Coverage Days");
        return base;
    }, [logData]);

    const handleApproveAll = async () => {
        await onBulkVerify();
    };

    const handleRejectSubmit = async () => {
        await onRejectLog("Log rejected for correction by Supervisor");
    };

    const handleSingleRowVerify = async (rowIndex: number, status: 'VERIFIED' | 'REJECTED', reason: string = "") => {
        if (!onRowVerify) return;
        try {
            await onRowVerify(rowIndex, status, reason);
        } catch (error) {
            console.error('Error verifying row:', error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="bg-white rounded-[2rem] border border-ind-border/50 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-ind-text text-white flex items-center justify-center shadow-lg">
                            <ClipboardCheck size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-0.5">
                                <h1 className="text-2xl font-black text-ind-text uppercase tracking-tight">{selectedLog.model_name}</h1>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                    selectedLog.status === 'VERIFIED' || selectedLog.status === 'APPROVED'
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        : selectedLog.status === 'REJECTED'
                                            ? "bg-red-50 text-red-600 border-red-100"
                                            : "bg-amber-50 text-amber-600 border-amber-100"
                                )}>
                                    {selectedLog.status || 'SUBMITTED'}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-ind-text3 uppercase tracking-[0.15em] mt-1">
                                DEO Submission • ORDER ID: <span className="text-ind-primary font-black">{selectedLog.formatted_id || `DEM-${selectedLog.id?.toString().padStart(3, '0')}`}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedLog(null)}
                        className="h-10 px-6 bg-ind-border/30 text-ind-text2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-ind-border/50 transition-all flex items-center gap-2"
                    >
                        <ArrowLeft size={14} /> Back to List
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-ind-bg rounded-2xl p-4 border border-ind-border/50">
                        <span className="text-[9px] font-black text-ind-text3 uppercase tracking-widest block mb-1">Target</span>
                        <span className="text-xl font-black text-ind-text">{selectedLog.target_vehicles || 0}</span>
                        <span className="text-[9px] font-black text-ind-text3 ml-1">VEH</span>
                    </div>
                    <div className="bg-ind-bg rounded-2xl p-4 border border-ind-border/50">
                        <span className="text-[9px] font-black text-ind-text3 uppercase tracking-widest block mb-1">Parts</span>
                        <span className="text-xl font-black text-ind-text">{logData.length}</span>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1">✓ Verified</span>
                        <span className="text-xl font-black text-emerald-600">{verifiedCount}</span>
                    </div>
                    <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                        <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block mb-1">✗ Rejected</span>
                        <span className="text-xl font-black text-red-600">{rejectedCount}</span>
                    </div>
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">⏳ Pending</span>
                        <span className="text-xl font-black text-amber-600">{pendingCount}</span>
                    </div>
                </div>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-slate-50 px-2">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[9px] font-black text-ind-text3 uppercase tracking-widest">
                            Customer: <span className="text-ind-text">{selectedLog.customer_name || 'CIE AUTOMOTIVE'}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-ind-text3" />
                        <span className="text-[9px] font-black text-ind-text3 uppercase tracking-widest">
                            Operator: <span className="text-ind-text">{selectedLog.deo_name || 'N/A'}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-ind-primary" />
                        <span className="text-[9px] font-black text-ind-text3 uppercase tracking-widest">
                            Line: <span className="text-ind-text">{selectedLog.line_name || 'N/A'}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <Clock size={12} className="text-ind-text3" />
                        <span className="text-[9px] font-black text-ind-text3 uppercase tracking-widest">
                            Submission Date: <span className="text-ind-text">{selectedLog.date}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Data Table — High Density Modernized */}
            <div className="bg-white rounded-[2rem] border border-ind-border/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar" style={{ maxHeight: '600px' }}>
                    <table className="w-full text-sm text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-white border-b-2 border-orange-500">
                                {displayColumns.map((h, i) => (
                                    <th
                                        key={h}
                                        className={cn(
                                            "px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-900 border-b-2 border-orange-500 bg-white z-30 whitespace-nowrap",
                                            i === 0 && "sticky left-0 z-40",
                                            (h === "Sap stock" || h === "Opening stock" || h === "Todays stock") && "bg-orange-50/20"
                                        )}
                                    >
                                        <div className={cn(
                                            "flex items-center gap-2",
                                            i === 0 || i === 1 || h.includes("PART") ? "justify-start" : "justify-center"
                                        )}>
                                            {h === "SAP PART NUMBER" && <Database size={10} className="text-orange-500" />}
                                            {labelMap[h] || h}
                                        </div>
                                    </th>
                                ))}
                                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-900 text-center border-b-2 border-orange-500 sticky right-0 bg-white z-30 whitespace-nowrap">
                                    Vetting action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {logData.map((row: any, index: number) => {
                                const coverage = parseFloat(row['Coverage Days'] || '0');
                                const isLowCoverage = coverage > 0 && coverage < 5;

                                const prodStatus = row['Production Status'];
                                const rowStatus = prodStatus === 'VERIFIED'
                                    ? 'VERIFIED'
                                    : prodStatus === 'REJECTED'
                                        ? 'REJECTED'
                                        : null;

                                return (
                                    <tr
                                        key={row.id || index}
                                        onClick={() => setSelectedRowDetail({ ...row, index })}
                                        className={cn(
                                            "hover:bg-slate-50 transition-colors cursor-pointer group",
                                            rowStatus === 'VERIFIED' && "bg-emerald-50/20",
                                            rowStatus === 'REJECTED' && "bg-rose-50/20"
                                        )}
                                    >
                                        {displayColumns.map((h, i) => {
                                            const val = h === "SN. NO" ? (index + 1).toString() : (row[h] || "—");
                                            const isIdentity = h === "SAP PART NUMBER" || h === "PART NUMBER" || h === "SN. NO";
                                            const isHighlight = h === "Todays stock" || h === "TOTAL PRODUCTION";

                                            return (
                                                <td
                                                    key={h}
                                                    className={cn(
                                                        "px-6 py-4 border-b border-slate-50 transition-all",
                                                        i === 0 && "sticky left-0 bg-inherit z-10",
                                                        (h === "Sap stock" || h === "Opening stock" || h === "Todays stock") && "bg-orange-50/10 group-hover:bg-orange-100/20"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "flex items-center gap-2",
                                                        i === 0 || i === 1 || h.includes("PART") ? "justify-start" : "justify-center"
                                                    )}>
                                                        {h === "SN. NO" && (
                                                            <span className="text-[11px] font-black text-slate-900">{val}</span>
                                                        )}
                                                        
                                                        {h === "SAP PART NUMBER" && (
                                                            <span className="text-[11px] font-black text-ind-primary uppercase tracking-tight">
                                                                {val}
                                                            </span>
                                                        )}

                                                        {h === "PART NUMBER" && (
                                                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                                                                {val}
                                                            </span>
                                                        )}

                                                        {h === "PART DESCRIPTION" && (
                                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight leading-tight max-w-[200px] truncate" title={val as string}>
                                                                {val}
                                                            </span>
                                                        )}

                                                        {!isIdentity && h !== "PART DESCRIPTION" && (
                                                            <span className={cn(
                                                                "text-[11px] font-black tabular-nums",
                                                                isHighlight ? "text-orange-600 text-[13px]" : "text-slate-900",
                                                                h === "Coverage Days" && (
                                                                    isLowCoverage 
                                                                        ? "px-2 py-1 bg-rose-100 text-rose-600 rounded border border-rose-200" 
                                                                        : "px-2 py-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-100"
                                                                )
                                                            )}>
                                                                {val} {h === "Coverage Days" && val !== "—" && "Days"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="px-6 py-4 border-b border-slate-50 sticky right-0 bg-inherit z-10 text-right">
                                            <div className="flex items-center justify-end">
                                                {rowStatus === 'VERIFIED' ? (
                                                    <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                                        Verified
                                                    </div>
                                                ) : rowStatus === 'REJECTED' ? (
                                                    <div className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                                        <div className="w-1 h-1 rounded-full bg-rose-500" />
                                                        Rejected
                                                    </div>
                                                ) : (
                                                    <button className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:bg-ind-primary hover:shadow-lg hover:shadow-orange-500/20 transition-all flex items-center gap-2">
                                                        Review
                                                        <ArrowLeft className="rotate-180" size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Buttons */}
            {selectedLog.status !== 'APPROVED' && (
                <div className="bg-white rounded-[2rem] border border-ind-border/50 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield size={20} className="text-ind-text3" />
                            <div>
                                <h3 className="text-sm font-black text-ind-text uppercase tracking-tight">Verification Decision</h3>
                                <p className="text-[10px] font-bold text-ind-text3 uppercase tracking-widest">
                                    Review the DEO's data above and approve or reject
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleRejectSubmit}
                                disabled={isVerifying}
                                className="group flex items-center gap-3 bg-red-50 text-red-600 border-2 border-red-200 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 hover:border-red-300 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <ShieldAlert size={16} className="group-hover:scale-110 transition-transform" />
                                {isVerifying ? 'Processing...' : 'Not Verified — Send Back'}
                            </button>
                            <button
                                onClick={handleApproveAll}
                                disabled={isVerifying}
                                className="group flex items-center gap-3 bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Shield size={16} className="group-hover:rotate-12 transition-transform" />
                                {isVerifying ? 'Approving...' : 'Approve & Verify All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Row Detail View Modal - Using Centralized Component */}
            <SupervisorRowVerifyModal
                isOpen={!!selectedRowDetail}
                onClose={() => { setSelectedRowDetail(null); }}
                onVerify={async (status, reason) => {
                    if (selectedRowDetail) {
                        await handleSingleRowVerify(selectedRowDetail.index, status, reason);
                        setSelectedRowDetail(null);
                    }
                }}
                row={selectedRowDetail}
            />
        </div>
    );
};
