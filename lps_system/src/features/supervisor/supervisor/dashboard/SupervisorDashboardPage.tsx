/**
 * SupervisorDashboardPage
 * 
 * The central orchestration component for the Supervisor role.
 * This page manages:
 * 1. Global state for production logs and assigned models.
 * 2. Tab-based routing across Verify Logs, Machine Monitoring, and Reporting modules.
 * 3. Real-time data synchronization with the backend API.
 * 4. Modal management for row-level rejection and verification workflows.
 */

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
    SUPERVISOR_SHORTAGE_HISTORY,
    SUPERVISOR_REPORTS,
    SUPERVISOR_MONITORING,
    SUPERVISOR_ALERTS
} from '../../../../config/routePaths';
import { CustomModal } from '../../../deo/components/DEOModals';
import SupervisorShortageVerify from '../SupervisorShortageVerify';
import DEOShortageHistoryPage from '../../../deo/DEOShortageHistoryPage';
import { SupervisorCalendar } from '../components/SupervisorCalendar';
import { supervisorMachineApi } from '../../../../api/newRolesApi';

// Modular Components
import { SupervisorVerifyLogs } from './components/SupervisorVerifyLogs';
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
    const [, setVerifications] = useState<Verification[]>([]);
    const [productionLogs, setProductionLogs] = useState<any[]>([]);
    const [assignedModels, setAssignedModels] = useState<AssignedModel[]>([]);
    const [, setShortageEntries] = useState<any[]>([]);
    const [selectedLog, setSelectedLog] = useState<Verification | null>(null);
    const [] = useState<number | null>(null);
    const [rejectingRowIndex, setRejectingRowIndex] = useState<number | null>(null);
    const [rowRejectionComment, setRowRejectionComment] = useState('');
    const [, setIsLineOpen] = useState(false);
    const [, setIsCalendarOpen] = useState(false);
    const [, setIsVerifying] = useState(false); // scoped loading for bulk verify

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
            const [modelsRes, data, shortageRes, logsRes] = await Promise.all([
                fetch(`${API_BASE}/deo/assigned-work`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                getPendingVerifications(),
                fetch(`${API_BASE}/supervisor/shortage-entries`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                supervisorMachineApi.getMachineEntries()
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
            if (logsRes.data?.success) {
                const mappedLogs = (logsRes.data.data || []).map((e: any) => ({
                    ...e,
                    machine_run_time: e.machine_runtime_mins ? (e.machine_runtime_mins / 60).toFixed(1) : '0'
                }));
                setProductionLogs(mappedLogs);
            }
            const rawVerifications = Array.isArray(data) ? data : (data?.data ?? []);
            const mappedVerifications = rawVerifications.map((v: any) => ({
                ...v,
                machine_run_time: v.machine_runtime_mins ? (v.machine_runtime_mins / 60).toFixed(1) : '0'
            }));
            setVerifications(mappedVerifications);
            if (!silent) setError(null);
        } catch (err) {
            console.error('Failed to load supervisor data', err);
            if (!silent)
                setError('Failed to connect to the server. Please check if the backend is running.');
        } finally {
            isRefreshing.current = false;
            if (!silent) setLoading(false);
        }
    }, [selectedDate]);

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
    }, [selectedDate]); // intentionally run once; refs keep values current

    // ── Filtering ────────────────────────────────────────────────────────────



    // ── KPI ──────────────────────────────────────────────────────────────────

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



    const handleVerifyMachineEntry = async (id: number, status: 'VERIFIED' | 'REJECTED', reason: string = '') => {
        try {
            await supervisorMachineApi.verifyEntry(id, { status, reason });
            refreshSupervisorData(true);
            setSelectedLog(null);
            openModal({
                title: 'Entry Verified',
                message: `Machine entry has been successfully ${status.toLowerCase()}.`,
                type: 'alert',
                onConfirm: closeModal
            });
        } catch (err) {
            console.error('Failed to verify entry', err);
            openModal({
                title: 'Verification Failed',
                message: 'Could not verify entry. Please try again.',
                type: 'alert',
                onConfirm: closeModal
            });
        }
    };



    // ── Route → content map (replaces switch) ───────────────────────────────
    const ROUTE_CONTENT: Record<string, React.ReactNode> = {
        [SUPERVISOR_VERIFY]: (
            <SupervisorVerifyLogs
                verifications={productionLogs}
                setSelectedLog={setSelectedLog}
                selectedLog={selectedLog}
                onVerify={handleVerifyMachineEntry} activeVerifyTab={'pending'} setActiveVerifyTab={function (tab: 'pending' | 'ready'): void {
                    throw new Error('Function not implemented.');
                }} />
        ),
        [SUPERVISOR_SHORTAGE]: <SupervisorShortageVerify />,
        [SUPERVISOR_SHORTAGE_HISTORY]: <DEOShortageHistoryPage />,
        [SUPERVISOR_REPORTS]: <SupervisorReports />,
        [SUPERVISOR_MONITORING]: <SupervisorMonitoring assignedModels={assignedModels} />,
        [SUPERVISOR_ALERTS]: <SupervisorAlerts />
    };

    /* vidyasagar: This function controls what component is rendered based on the sidebar selection. Change routes or add new modules here. */
    const renderContent = () =>
        ROUTE_CONTENT[location.pathname] ?? (
            <div className="hidden">
                {/* Dashboard content completely hidden per user request */}
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
        <div className="max-w-[1760px] mx-auto font-sans bg-ind-bg">
            <div className="py-0 relative">
                {renderContent()}
            </div>

            {/* ── Modals ─────────────────────────────────────────────────── */}
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
