import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Download, FileText, MailOpen, RefreshCw, Radio } from 'lucide-react';
import { useIndustrialState } from '../../hooks/useIndustrialState';
import { useAdminLive } from '../../hooks/useAdminLive';

// Existing Components
import { AdminFilterBar, IndustrialKPICards } from './FilterAndKPIs';
import { MailOrderSection } from './OrderManagement';
import { IndustrialTablesSection } from './IndustrialTables';
import { StageWorkProgress } from './StageWorkProgress';
import { OrderAnalyticsHub } from './OrderAnalyticsHub';

// New Live Components
import { LineStatusBoard } from './LineStatusBoard';
import { SupervisorActivityPanel } from './SupervisorActivityPanel';
import { DEOActivityPanel } from './DEOActivityPanel';
import { IssuesAlertTable } from './IssuesAlertTable';

function formatTime(date: Date | null): string {
    if (!date) return '—';
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const AdminIndustrialDashboard: React.FC = () => {
    const {
        lines, assignments, rejections, mailOrders, activeMaterialModel, materials,
        filters, stats, filteredProduction, filteredRejections,
        allModels, allDEOs, allSupervisors,
        setActiveMaterialModel, acceptOrder, rejectOrder,
        recordProduction, addLine, addAssignment
    } = useIndustrialState();

    // Live data hook — passes current filter state
    const {
        liveLines, liveSupervisors, liveDEOs, liveIssues, liveKPIs,
        lastRefreshed, isLoading: liveLoading, refresh: refreshLive
    } = useAdminLive({
        curModel: filters.curModel,
        curLine: filters.curLine,
        curSupervisor: filters.curSupervisor,
        curDEO: filters.curDEO,
        curTime: filters.curTime,
        curDate: filters.curDate,
    });

    const [isRejModalOpen, setIsRejModalOpen] = useState(false);
    const [selectedMailOrderId, setSelectedMailOrderId] = useState<string | null>(null);

    const selectedOrder = mailOrders.find(o => o.id === selectedMailOrderId);

    return (
        <div className="h-full bg-ind-bg text-ind-text relative overflow-x-hidden">

            <div className="relative z-10 max-w-[1760px] mx-auto py-2">

                {/* Header */}
               

                {/* Slicers */}
                <AdminFilterBar
                    filters={filters}
                    lines={lines}
                    allModels={allModels}
                    allDEOs={allDEOs}
                    allSupervisors={allSupervisors}
                />

                {/* KPI Cards — use live filter-aware KPIs when available */}
                <IndustrialKPICards stats={{
                    ...stats,
                    avgOEE: liveKPIs?.oee_pct ?? stats.avgOEE,
                    totalProduction: liveKPIs?.total_actual_qty ?? stats.totalProduction,
                    activeLines: liveKPIs?.active_lines ?? stats.activeLines,
                    pendingReviews: liveKPIs?.pending_reviews ?? stats.pendingReviews,
                }} />

                {/* LINE STATUS BOARD */}
                <div className="px-2 mb-0">
                    <LineStatusBoard lines={liveLines} isLoading={liveLoading} />
                </div>

                {/* Supervisor + DEO Activity side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 px-2 mb-2">
                    <SupervisorActivityPanel supervisors={liveSupervisors} isLoading={liveLoading} />
                    <DEOActivityPanel deos={liveDEOs} isLoading={liveLoading} />
                </div>

                {/* Issues & Alerts */}
                <div className="px-2 mb-0">
                    <IssuesAlertTable issues={liveIssues} isLoading={liveLoading} />
                </div>

                {/* Charts / Analytics */}
                <div className="grid grid-cols-2 gap-2 p-2">
                    <StageWorkProgress
                        productionEvents={filteredProduction}
                        lines={lines}
                        assignments={assignments}
                        mailOrders={mailOrders}
                    />
                    <OrderAnalyticsHub orders={mailOrders} />
                    <IndustrialTablesSection
                        lines={lines}
                        assignments={assignments}
                        orders={mailOrders}
                        rejections={rejections}
                        onRecordProd={recordProduction}
                        onAddLine={addLine}
                        onAssign={() => addAssignment({ model: lines[0]?.model || '', lineId: lines[0]?.id || '', deo: "New User", supervisor: "Admin" })}
                    />
                </div>

                {/* Mail Order Section */}
                <div className="mb-2 px-2">
                    <MailOrderSection orders={mailOrders} />
                </div>

            </div>

            {/* Rejection Modal */}
            <AnimatePresence>
                {isRejModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-ind-card2 border border-ind-border2 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl shadow-ind-red/10"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-ind-border bg-ind-bg2/50">
                                <div className="flex items-center gap-3 font-bold text-lg text-ind-text">
                                    <AlertTriangle className="text-ind-red" size={24} />
                                    Admin — Quality Rejection Center
                                </div>
                                <button onClick={() => setIsRejModalOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-ind-bg border border-ind-border text-ind-text3 hover:text-ind-red hover:border-ind-red/50 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <button className="flex items-center justify-center gap-2 py-3 bg-ind-g1/5 border border-ind-border2 rounded-xl text-ind-g1 font-bold text-sm hover:bg-ind-g1/10 transition-all">
                                        <Download size={18} /> Export as CSV
                                    </button>
                                    <button className="flex items-center justify-center gap-2 py-3 bg-ind-teal/5 border border-ind-border2 rounded-xl text-ind-teal font-bold text-sm hover:bg-ind-teal/10 transition-all">
                                        <FileText size={18} /> Quality Report
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {filteredRejections.length === 0 ? (
                                        <div className="text-center py-10 text-ind-text3 italic text-[0.7rem]">No defects matching current filters.</div>
                                    ) : (
                                        [...filteredRejections].reverse().map((r, i) => (
                                            <div key={i} className="bg-ind-bg2 border border-ind-border rounded-xl p-5 space-y-3 relative overflow-hidden group">
                                                <div className="flex justify-between items-start">
                                                    <div className="text-xl font-black text-ind-text">{r.model}</div>
                                                    <span className="font-mono-jet text-xs text-ind-text3 px-3 py-1 bg-ind-red/10 border border-ind-red/30 rounded-full text-ind-red font-bold">DEFECTIVE</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-y-3 font-mono-jet text-[0.7rem] text-ind-text2 capitalize">
                                                    <div><span className="text-ind-text3 block text-[0.55rem] uppercase tracking-widest mb-0.5">Affected Part</span> {r.part}</div>
                                                    <div><span className="text-ind-text3 block text-[0.55rem] uppercase tracking-widest mb-0.5">Failure Reason</span> <span className="text-ind-red font-bold">{r.reason}</span></div>
                                                    <div><span className="text-ind-text3 block text-[0.55rem] uppercase tracking-widest mb-0.5">Supervisor</span> <span className="text-ind-teal font-bold">{r.rejectedBy}</span></div>
                                                    <div><span className="text-ind-text3 block text-[0.55rem] uppercase tracking-widest mb-0.5">Line ID</span> {r.lineId}</div>
                                                </div>
                                                <div className="text-[0.6rem] text-ind-text3 flex justify-between pt-2 border-t border-white/5 italic">
                                                    <span>Recorded by {r.deo}</span>
                                                    <span>Log ID: {r.id} · {r.date}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Mail Order Modal */}
            <AnimatePresence>
                {selectedMailOrderId && selectedOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-ind-card2 border border-ind-border2 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl shadow-ind-teal/10"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-ind-border bg-ind-bg2/50">
                                <div className="flex items-center gap-3 font-bold text-lg text-ind-text">
                                    <MailOpen className="text-ind-yellow" size={24} />
                                    Order Intelligence — {selectedOrder.company}
                                </div>
                                <button onClick={() => setSelectedMailOrderId(null)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-ind-bg border border-ind-border text-ind-text3 hover:text-ind-red hover:border-ind-red/50 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="bg-ind-bg2 border border-ind-border rounded-xl p-5 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><span className="text-ind-text3 font-mono-jet text-[0.55rem] uppercase block mb-0.5">Order ID</span> <span className="text-ind-teal font-bold">{selectedOrder.id}</span></div>
                                        <div><span className="text-ind-text3 font-mono-jet text-[0.55rem] uppercase block mb-0.5">Customer</span> <span className="font-bold">{selectedOrder.customer}</span></div>
                                        <div><span className="text-ind-text3 font-mono-jet text-[0.55rem] uppercase block mb-0.5">Car Model</span> <span className="text-ind-g1 font-bold">{selectedOrder.model}</span></div>
                                        <div><span className="text-ind-text3 font-mono-jet text-[0.55rem] uppercase block mb-0.5">Status</span> <span className="uppercase text-xs font-bold text-ind-yellow">{selectedOrder.status}</span></div>
                                    </div>
                                    <div className="pt-4 border-t border-white/5">
                                        <span className="text-ind-text3 font-mono-jet text-[0.55rem] uppercase block mb-2 font-bold tracking-widest">Client Message</span>
                                        <div className="text-ind-text2 italic text-sm p-4 bg-ind-bg rounded-lg border border-ind-border">"{selectedOrder.msg}"</div>
                                    </div>
                                </div>
                                {selectedOrder.status === 'pending' && (
                                    <div className="flex gap-3 pt-4">
                                        <button onClick={() => { acceptOrder(selectedOrder.id); setSelectedMailOrderId(null); }} className="flex-1 flex items-center justify-center gap-2 py-3 bg-linear-to-br from-ind-g3 to-ind-g1 text-white font-bold rounded-xl shadow-lg shadow-ind-g4/20 hover:scale-105 transition-all">
                                            ACCEPT ORDER
                                        </button>
                                        <button onClick={() => { rejectOrder(selectedOrder.id); setSelectedMailOrderId(null); }} className="flex-1 flex items-center justify-center gap-2 py-3 bg-ind-red text-white font-bold rounded-xl shadow-lg shadow-ind-red/20 hover:scale-105 transition-all">
                                            REJECT
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
