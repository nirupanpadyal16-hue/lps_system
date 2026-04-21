import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
    Activity,
    AlertCircle,
    ChevronDown,
    Calendar,
} from 'lucide-react';
import { getPendingVerifications, verifyDailyProductionRow, verifyDailyProductionLog } from '../api';
import { API_BASE } from '../../../../lib/apiConfig';
import { getToken } from '../../../../lib/storage';
import {
    SUPERVISOR_VERIFY,
    SUPERVISOR_SHORTAGE,
    SUPERVISOR_REPORTS,
    SUPERVISOR_MONITORING,
    SUPERVISOR_ALERTS
} from '../../../../config/routePaths';
import { CustomModal } from '../../../deo/components/DEOModals';
import SupervisorShortageVerify from '../SupervisorShortageVerify';
import { SupervisorCalendar } from '../components/SupervisorCalendar';

// Modular Components
import { SupervisorVerifyLogs } from './components/SupervisorVerifyLogs';
import { LogDetailView } from './components/LogDetailModal';
import DEORowManualModal from '../../../deo/components/DEORowManualModal';
import { RowRejectionModal } from './components/RowRejectionModal';
import { SupervisorKPI } from './components/SupervisorKPI';
import { SupervisorAnalytics } from './components/SupervisorAnalytics';
// Removed AIPredictiveInsights import
import { SupervisorReports } from './components/SupervisorReports';
import { SupervisorMonitoring } from './components/SupervisorMonitoring';
import { SupervisorAlerts } from './components/SupervisorAlerts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssignedModel {
    line_name: string | null;
    assigned_deo_name: string | null;
    actual_qty?: number;
    car_model_id: string;
    [key: string]: unknown;
}

interface Verification {
    id: number;
    date: string;
    line_name: string | null;
    status: string | null;
    model_name: string;
    car_model_id: number;
    demand_id: number;
    deo_id: number;
    log_data: LogRow[];
    [key: string]: unknown;
}

interface LogRow {
    row_status?: string;
    'Production Status'?: string;
    rejection_reason?: string;
    'SAP PART NUMBER'?: string;
    'SAP PART #'?: string;
    sap_part_number?: string;
    [key: string]: unknown;
}

type ModalType = 'confirm' | 'alert' | 'input';

interface ModalConfig {
    isOpen: boolean;
    title: string;
    message: string;
    type: ModalType;
    onConfirm: () => void | Promise<void>;
}

// ─── Custom Hooks ─────────────────────────────────────────────────────────────

function useModal() {
    const CLOSED: ModalConfig = {
        isOpen: false,
        title: '',
        message: '',
        type: 'alert',
        onConfirm: () => { },
    };

    const [config, setConfig] = useState<ModalConfig>(CLOSED);

    const open = useCallback((partial: Omit<ModalConfig, 'isOpen'>) => {
        setConfig({ isOpen: true, ...partial });
    }, []);

    const close = useCallback(() => setConfig(CLOSED), []);

    return { config, open, close };
}

// ─── Component ────────────────────────────────────────────────────────────────

const SupervisorDashboardPage = () => {
    /* vidyasagar: Start of Supervisor Dashboard logic. You can change state or hooks here. */
    const location = useLocation();

    // ── URL-persisted filters (survive refresh, shareable) ──────────────────
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedLine = searchParams.get('line') ?? 'Select Line';
    const selectedDate = searchParams.get('date') ?? new Date().toISOString().split('T')[0];

    const setSelectedLine = (line: string) =>
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            line === 'Select Line' ? next.delete('line') : next.set('line', line);
            return next;
        });

    const setSelectedDate = (date: string) =>
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('date', date);
            return next;
        });

    // ── Core state ──────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [verifications, setVerifications] = useState<Verification[]>([]);
    const [assignedModels, setAssignedModels] = useState<AssignedModel[]>([]);
    const [shortageEntries, setShortageEntries] = useState<any[]>([]);
    const [selectedLog, setSelectedLog] = useState<Verification | null>(null);
    const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
    const [rejectingRowIndex, setRejectingRowIndex] = useState<number | null>(null);
    const [rowRejectionComment, setRowRejectionComment] = useState('');
    const [activeVerifyTab, setActiveVerifyTab] = useState<'pending' | 'ready'>('pending');
    const [isLineOpen, setIsLineOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false); // scoped loading for bulk verify

    const { config: modalConfig, open: openModal, close: closeModal } = useModal();

    // ── Refs for stale-closure-safe heartbeat ────────────────────────────────
    const isRefreshing = useRef(false);
    const selectedLogRef = useRef(selectedLog);
    const modalOpenRef = useRef(modalConfig.isOpen);

    useEffect(() => { selectedLogRef.current = selectedLog; }, [selectedLog]);
    useEffect(() => { modalOpenRef.current = modalConfig.isOpen; }, [modalConfig.isOpen]);



    // ── Data fetching ────────────────────────────────────────────────────────
    const refreshSupervisorData = useCallback(async (silent = false) => {
        // Guard: prevent overlapping requests
        if (isRefreshing.current) return;
        isRefreshing.current = true;

        if (!silent) setLoading(true);
        const token = getToken();

        try {
            const [modelsRes, data, shortageRes] = await Promise.all([
                fetch(`${API_BASE}/deo/assigned-work`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                getPendingVerifications(),
                fetch(`${API_BASE}/supervisor/shortage-entries`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            if (modelsRes.ok) {
                const modelsData = await modelsRes.json();
                setAssignedModels(modelsData.data ?? []);
            }
            if (shortageRes.ok) {
                const shortData = await shortageRes.json();
                if (shortData.success && Array.isArray(shortData.data)) {
                    setShortageEntries(shortData.data);
                }
            }
            setVerifications(data);
            if (!silent) setError(null);
        } catch (err) {
            console.error('Failed to load supervisor data', err);
            if (!silent)
                setError('Failed to connect to the server. Please check if the backend is running.');
        } finally {
            isRefreshing.current = false;
            if (!silent) setLoading(false);
        }
    }, []);

    // Initial load + 5s heartbeat (stale-closure-safe via refs)
    useEffect(() => {
        refreshSupervisorData();

        const interval = setInterval(() => {
            const logOpen = selectedLogRef.current !== null;
            const modalOpen = modalOpenRef.current;
            if (!logOpen && !modalOpen) {
                refreshSupervisorData(true);
            }
        }, 5000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally run once; refs keep values current

    // ── Filtering ────────────────────────────────────────────────────────────
    const uniqueLines = useMemo(
        () =>
            Array.from(new Set(assignedModels.map(m => m.line_name).filter(Boolean))).sort() as string[],
        [assignedModels]
    );

    const filteredAssignedModels = useMemo(
        () =>
            selectedLine === 'Select Line'
                ? assignedModels
                : assignedModels.filter(m => m.line_name === selectedLine),
        [assignedModels, selectedLine]
    );

    const filteredVerifications = useMemo(() => {
        let filtered = verifications;
        if (selectedDate)
            filtered = filtered.filter(v => v.date === selectedDate);
        if (selectedLine !== 'Select Line')
            filtered = filtered.filter(v => v.line_name === selectedLine);
        return filtered;
    }, [verifications, selectedLine, selectedDate]);

    // ── KPI ──────────────────────────────────────────────────────────────────
    const kpiStats = useMemo(() => {
        const uniqueDeos = Array.from(
            new Set(filteredAssignedModels.map(m => m.assigned_deo_name).filter(Boolean))
        );
        const activeDeos = Array.from(
            new Set(
                filteredAssignedModels
                    .filter(m => (m.actual_qty ?? 0) > 0)
                    .map(m => m.assigned_deo_name)
            )
        ).length;

        const awaitingReview = filteredVerifications.filter(v =>
            ['SUBMITTED', 'PENDING', 'AWAITING'].includes(v.status?.toUpperCase() ?? '') || !v.status
        ).length;

        const verifiedShortages = shortageEntries.filter(e => e.status === 'VERIFIED').length;

        const pendingShortages = shortageEntries.filter(e => e.status === 'PENDING_SUPERVISOR').length;
        const rejectedShortages = shortageEntries.filter(e => e.status === 'REJECTED').length;

        return {
            totalDeos: uniqueDeos.length,
            activeDeos,
            verifiedShortages,
            pendingShortages,
            rejectedShortages,
            awaitingReview,
        };
    }, [filteredAssignedModels, filteredVerifications, shortageEntries]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const getSapPartNumber = (row: LogRow) =>
        row?.['SAP PART NUMBER'] ?? row?.['SAP PART #'] ?? row?.sap_part_number ?? '';

    /**
     * Returns a deep-copied log with the given row updated.
     * Avoids the shared-reference mutation bug.
     */
    const patchLogRow = (
        log: Verification,
        rowIndex: number,
        patch: Partial<LogRow>
    ): Verification => ({
        ...log,
        log_data: log.log_data.map((row, i) => (i === rowIndex ? { ...row, ...patch } : row)),
    });

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleRowVerify = async (
        rowIndex: number,
        status: 'VERIFIED' | 'REJECTED',
        reason = ''
    ) => {
        if (!selectedLog) return;

        const updatedLog = patchLogRow(selectedLog, rowIndex, {
            row_status: status,
            'Production Status': status,
            rejection_reason: reason,
        });
        setSelectedLog(updatedLog);

        const sapPartNumber = getSapPartNumber(selectedLog.log_data[rowIndex]);
        const success = await verifyDailyProductionRow(
            selectedLog.id,
            rowIndex,
            status,
            reason,
            sapPartNumber
        );

        if (!success) {
            openModal({
                title: 'Error',
                message: 'Failed to update row verification status.',
                type: 'alert',
                onConfirm: closeModal,
            });
        } else {
            refreshSupervisorData(true);
        }
    };

    const handleBulkVerify = async () => {
        if (!selectedLog) return;

        openModal({
            title: 'Verify Production',
            message: `Authorize final verification for ${selectedLog.model_name}?`,
            type: 'confirm',
            onConfirm: async () => {
                closeModal();
                setIsVerifying(true);
                try {
                    const token = getToken();

                    await Promise.all(
                        selectedLog.log_data.map((row, index) =>
                            verifyDailyProductionRow(
                                selectedLog.id,
                                index,
                                'VERIFIED',
                                'Bulk Verified by Supervisor',
                                getSapPartNumber(row)
                            )
                        )
                    );

                    const response = await fetch(
                        `${API_BASE}/supervisor/finalize-assignment/${selectedLog.car_model_id}`,
                        {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );

                    if (response.ok) {
                        openModal({
                            title: 'Verification Confirmed',
                            message: `The production log for ${selectedLog.model_name} has been successfully verified.`,
                            type: 'alert',
                            onConfirm: () => {
                                closeModal();
                                setSelectedLog(null);
                                refreshSupervisorData();
                            },
                        });
                    } else {
                        const errorData = await response.json();
                        openModal({
                            title: 'Failed',
                            message: `Finalization failed: ${errorData.message}`,
                            type: 'alert',
                            onConfirm: () => {
                                closeModal();
                                refreshSupervisorData();
                            },
                        });
                    }
                } catch (err) {
                    console.error('Bulk verify error:', err);
                    openModal({
                        title: 'Error',
                        message: 'An error occurred during bulk verification.',
                        type: 'alert',
                        onConfirm: closeModal,
                    });
                } finally {
                    setIsVerifying(false);
                }
            },
        });
    };

    const handleRejectLog = async (reason: string) => {
        if (!selectedLog) return;

        const success = await verifyDailyProductionLog(selectedLog.id, 'REJECTED', reason);
        if (success) {
            openModal({
                title: 'Submission Rejected',
                message: '',
                type: 'alert',
                onConfirm: () => {
                    closeModal();
                    setSelectedLog(null);
                    refreshSupervisorData();
                },
            });
        } else {
            openModal({
                title: 'Error',
                message: 'Failed to reject the submission. Please try again.',
                type: 'alert',
                onConfirm: closeModal,
            });
        }
    };

    const handleSupervisorRowSave = async (updatedRow: LogRow) => {
        if (selectedRowIndex === null || !selectedLog) return;

        const updatedLog = patchLogRow(selectedLog, selectedRowIndex, {
            ...updatedRow,
            row_status: 'VERIFIED',
        });
        setSelectedLog(updatedLog);

        const token = getToken();
        try {
            const res = await fetch(`${API_BASE}/supervisor/update-log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    log_id: selectedLog.id,
                    model_name: selectedLog.model_name,
                    car_model_id: selectedLog.car_model_id,
                    demand_id: selectedLog.demand_id,
                    deo_id: selectedLog.deo_id,
                    log_data: updatedLog.log_data,
                    is_final:
                        selectedLog.status === 'SUBMITTED' || selectedLog.status === 'VERIFIED',
                }),
            });
            if (res.ok) refreshSupervisorData(true);
        } catch (e) {
            console.error('Failed to sync supervisor edit', e);
        }

        setSelectedRowIndex(null);
    };

    const handleSupervisorRowVerify = async (
        status: 'VERIFIED' | 'REJECTED',
        reason: string = '',
        updatedRow?: LogRow
    ) => {
        if (selectedRowIndex === null || !selectedLog) return;

        if (updatedRow) {
            const updatedLog = patchLogRow(selectedLog, selectedRowIndex, {
                ...updatedRow,
                row_status: status,
                'Production Status': status,
                rejection_reason: reason,
            });
            setSelectedLog(updatedLog);

            const token = getToken();
            await fetch(`${API_BASE}/supervisor/update-log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    log_id: selectedLog.id,
                    model_name: selectedLog.model_name,
                    car_model_id: selectedLog.car_model_id,
                    demand_id: selectedLog.demand_id,
                    deo_id: selectedLog.deo_id,
                    log_data: updatedLog.log_data,
                    is_final: true,
                }),
            });
        }

        if (status === 'REJECTED') {
            setRejectingRowIndex(selectedRowIndex);
            setSelectedRowIndex(null);
        } else {
            await handleRowVerify(selectedRowIndex, status, reason);
            setSelectedRowIndex(null);
        }
    };

    // ── Route → content map (replaces switch) ───────────────────────────────
    const ROUTE_CONTENT: Record<string, React.ReactNode> = {
        [SUPERVISOR_VERIFY]: (
            <SupervisorVerifyLogs
                verifications={filteredVerifications}
                activeVerifyTab={activeVerifyTab}
                setActiveVerifyTab={setActiveVerifyTab}
                setSelectedLog={setSelectedLog}
            />
        ),
        [SUPERVISOR_SHORTAGE]: <SupervisorShortageVerify />,
        [SUPERVISOR_REPORTS]: <SupervisorReports />,
        [SUPERVISOR_MONITORING]: <SupervisorMonitoring assignedModels={assignedModels} />,
        [SUPERVISOR_ALERTS]: <SupervisorAlerts />
    };

    /* vidyasagar: This function controls what component is rendered based on the sidebar selection. Change routes or add new modules here. */
    const renderContent = () =>
        ROUTE_CONTENT[location.pathname] ?? (
            <div className="space-y-2 pb-2 font-sans">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-end gap-2 px-2">                    <div className="flex items-center gap-2 relative">
                    {/* Line filter */}
                    <div className="relative">
                        <div
                            role="combobox"
                            aria-expanded={isLineOpen}
                            aria-haspopup="listbox"
                            tabIndex={0}
                            onClick={() => setIsLineOpen(v => !v)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') setIsLineOpen(v => !v);
                                if (e.key === 'Escape') setIsLineOpen(false);
                            }}
                            className="bg-white rounded-xl px-4 py-2.5 flex items-center justify-between min-w-[140px] shadow-sm border border-ind-border/60 cursor-pointer hover:border-slate-300 transition-all group z-[60]"
                        >
                            <span
                                className={`text-[11px] font-bold ${selectedLine === 'Select Line'
                                        ? 'text-ind-text3'
                                        : 'text-ind-text'
                                    }`}
                            >
                                {selectedLine === 'Select Line' ? 'All lines' : selectedLine}
                            </span>
                            <ChevronDown
                                size={14}
                                className={`text-ind-text3 group-hover:text-ind-text2 transition-transform ${isLineOpen ? 'rotate-180' : ''
                                    }`}
                            />
                        </div>

                        {isLineOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-[55]"
                                    onClick={() => setIsLineOpen(false)}
                                />
                                <ul
                                    role="listbox"
                                    className="absolute top-[110%] left-0 w-full bg-white rounded-xl shadow-xl overflow-hidden z-[100] border border-ind-border/50 py-1 animate-in fade-in slide-in-from-top-2"
                                >
                                    <li
                                        role="option"
                                        aria-selected={selectedLine === 'Select Line'}
                                        onClick={() => {
                                            setSelectedLine('Select Line');
                                            setIsLineOpen(false);
                                        }}
                                        className="px-4 py-2.5 text-[10px] font-bold text-ind-text3 hover:bg-ind-bg cursor-pointer"
                                    >
                                        All
                                    </li>
                                    {uniqueLines.map(line => (
                                        <li
                                            key={line}
                                            role="option"
                                            aria-selected={selectedLine === line}
                                            onClick={() => {
                                                setSelectedLine(line);
                                                setIsLineOpen(false);
                                            }}
                                            className={`px-4 py-2.5 text-[10px] font-bold hover:bg-orange-50 hover:text-orange-900 cursor-pointer transition-colors ${selectedLine === line
                                                    ? 'bg-orange-50 text-orange-900'
                                                    : 'text-ind-text2'
                                                }`}
                                        >
                                            {line}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsCalendarOpen(v => !v)}
                            className="bg-white rounded-xl px-4 py-2.5 flex items-center gap-4 shadow-sm border border-ind-border/60 hover:border-slate-300 transition-all group cursor-pointer"
                        >
                            <span className="text-[11px] font-bold text-ind-text">
                                {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: '2-digit',
                                    year: 'numeric',
                                }) : 'Today'}
                            </span>
                            <Calendar
                                size={15}
                                className="text-ind-text3 group-hover:text-ind-primary transition-colors"
                            />
                        </button>
                        {isCalendarOpen && (
                            <SupervisorCalendar
                                value={selectedDate}
                                onChange={(date) => {
                                    if (date) setSelectedDate(date);
                                }}
                                onClose={() => setIsCalendarOpen(false)}
                            />
                        )}
                    </div>
                </div>
                </div>

                <SupervisorKPI
                    totalDeos={kpiStats.totalDeos}
                    awaitingReview={kpiStats.awaitingReview}
                    verifiedShortages={kpiStats.verifiedShortages}
                    pendingShortages={kpiStats.pendingShortages}
                    rejectedShortages={kpiStats.rejectedShortages}
                />


                <SupervisorAnalytics
                    assignedModels={filteredAssignedModels}
                    verifications={filteredVerifications}
                />
            </div>
        );

    // ── Render guards ────────────────────────────────────────────────────────
    if (loading)
        return (
            <div className="bg-ind-bg min-h-screen flex flex-col items-center justify-center">
                <Activity size={48} className="text-ind-primary animate-spin mb-6" />
                <div className="text-ind-text3 font-bold uppercase tracking-[0.2em] animate-pulse">
                    Syncing production data...
                </div>
            </div>
        );

    if (error)
        return (
            <div className="bg-ind-bg min-h-screen flex flex-col items-center justify-center">
                <AlertCircle size={48} className="text-rose-500 mb-6" />
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">
                    Sync Interrupted
                </h3>
                <p className="text-ind-text2 font-bold max-w-md text-center">{error}</p>
                <button
                    onClick={() => refreshSupervisorData()}
                    className="mt-6 px-6 py-2 bg-ind-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                >
                    Retry
                </button>
            </div>
        );

    // ── Main render ──────────────────────────────────────────────────────────
    return (
        <div className="max-w-[1760px] mx-auto min-h-screen font-sans bg-ind-bg">
            <div className="py-2 relative">
                {selectedLog ? (
                    <LogDetailView
                        selectedLog={selectedLog}
                        setSelectedLog={setSelectedLog}
                        onBulkVerify={handleBulkVerify}
                        onRejectLog={handleRejectLog}
                        onRowVerify={handleRowVerify}
                        isVerifying={isVerifying}
                    />
                ) : (
                    renderContent()
                )}
            </div>

            {/* ── Modals ─────────────────────────────────────────────────── */}
            <DEORowManualModal
                isOpen={selectedRowIndex !== null}
                onClose={() => setSelectedRowIndex(null)}
                row={selectedRowIndex !== null ? selectedLog?.log_data[selectedRowIndex] ?? null : null}
                isSupervisor={true}           // FIX: was incorrectly false
                onSave={handleSupervisorRowSave}
                onVerify={handleSupervisorRowVerify}
            />

            <RowRejectionModal
                rejectingRowIndex={rejectingRowIndex}
                setRejectingRowIndex={setRejectingRowIndex}
                rowRejectionComment={rowRejectionComment}
                setRowRejectionComment={setRowRejectionComment}
                handleRowVerify={handleRowVerify}
            />

            <CustomModal
                isOpen={modalConfig.isOpen}
                onClose={closeModal}
                onConfirm={modalConfig.onConfirm}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
            />
        </div>
    );
};

export default SupervisorDashboardPage;
