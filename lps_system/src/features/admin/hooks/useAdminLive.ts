import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../../../api/apiClient';

export interface LiveLine {
    line_name: string;
    model: string;
    model_code: string;
    deo_name: string;
    supervisor_name: string;
    log_status: string;
    last_updated: string | null;
    entries_count: number;
    pending_reviews: number;
    today_actual: number;
    today_planned: number;
}

export interface LiveSupervisor {
    id: number;
    name: string;
    username: string;
    shop: string | null;
    assigned_models: string[];
    logs_pending_review: number;
    logs_approved_today: number;
    logs_rejected_today: number;
    efficiency_pct: number;
    total_reviews: number;
    last_activity: string | null;
}

export interface LiveDEO {
    id: number;
    name: string;
    username: string;
    model: string;
    model_code: string;
    line: string;
    log_status: string;
    entries_submitted: number;
    entries_verified: number;
    entries_pending: number;
    last_submission: string | null;
    logs_count: number;
}

export interface LiveIssue {
    id: number;
    date: string | null;
    issue_type: 'REJECTION' | 'LOW COVERAGE';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    sap_part_number: string;
    part_description: string | null;
    model: string;
    line: string;
    deo_name: string;
    supervisor_name: string;
    rejection_reason: string | null;
    coverage_days: number;
    todays_stock: number;
    per_day: number;
    log_id: number;
}

export interface LiveKPIs {
    total_actual_qty: number;
    total_planned_qty: number;
    oee_pct: number;
    active_lines: number;
    pending_reviews: number;
    total_issues: number;
    supervisors_active: number;
    deos_submitted_today: number;
}

interface Filters {
    curModel: string;
    curLine: string;
    curSupervisor: string;
    curDEO: string;
    curTime: string;
    curDate: string | null;
}

export const useAdminLive = (filters: Filters) => {
    const [liveLines, setLiveLines] = useState<LiveLine[]>([]);
    const [liveSupervisors, setLiveSupervisors] = useState<LiveSupervisor[]>([]);
    const [liveDEOs, setLiveDEOs] = useState<LiveDEO[]>([]);
    const [liveIssues, setLiveIssues] = useState<LiveIssue[]>([]);
    const [liveKPIs, setLiveKPIs] = useState<LiveKPIs | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchLive = useCallback(async () => {
        try {
            const res = await apiClient.admin.getDashboardLive({
                model: filters.curModel !== 'all' ? filters.curModel : undefined,
                line: filters.curLine !== 'all' ? filters.curLine : undefined,
                supervisor: filters.curSupervisor !== 'all' ? filters.curSupervisor : undefined,
                deo: filters.curDEO !== 'all' ? filters.curDEO : undefined,
                time: filters.curTime,
                date: filters.curDate || undefined,
            });

            if (res.success) {
                setLiveLines(res.lines || []);
                setLiveSupervisors(res.supervisors || []);
                setLiveDEOs(res.deos || []);
                setLiveIssues(res.issues || []);
                setLiveKPIs(res.kpis || null);
                setLastRefreshed(new Date());
            }
        } catch (err) {
            console.error('useAdminLive fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [filters.curModel, filters.curLine, filters.curSupervisor, filters.curDEO, filters.curTime, filters.curDate]);

    // Fetch immediately on filter change
    useEffect(() => {
        setIsLoading(true);
        fetchLive();

        // Poll every 30 seconds
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(fetchLive, 30000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [fetchLive]);

    return {
        liveLines,
        liveSupervisors,
        liveDEOs,
        liveIssues,
        liveKPIs,
        lastRefreshed,
        isLoading,
        refresh: fetchLive,
    };
};
