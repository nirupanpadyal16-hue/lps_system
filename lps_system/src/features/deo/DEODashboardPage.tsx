/**
 * DEODashboardPage.tsx
 * Primary page component for the Data Entry Operator (DEO) Console.
 * It handles the operator dashboard layouts, stats widgets, charts, shortage requests,
 * and routing paths/tabs within the operator workflow.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutGrid, Factory, Calendar, ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { API_BASE } from '../../lib/apiConfig';
import { getToken } from '../../lib/storage';
import {
    // DEO_DASHBOARD,
    DEO_SHORTAGE,
    DEO_SHORTAGE_HISTORY,
    DEO_ENTRY
} from '../../config/routePaths';
import { CustomModal, RejectionModal } from './components/DEOModals';
import { DEOStats } from './components/DEOStats';
import { DEOAnalytics } from './components/DEOAnalytics';
import DEOShortageRequests from './DEOShortageRequests';
import DEOShortageHistoryPage from './DEOShortageHistoryPage';
import DEODailyProduction from './components/DEODailyProduction';

/**
 * AssignedModel Interface
 * Defines the structure of vehicle model assignments, target outputs, supervisor info,
 * and production counts allocated to the currently authenticated DEO.
 */
interface AssignedModel {
    id: number;
    name: string;
    model_code: string;
    line_name: string;
    customer_name: string;
    deo_accepted: boolean;
    is_submitted_today?: boolean;
    status?: string;
    supervisor_name?: string;
    supervisor_email?: string;
    manager_name?: string;
    manager_email?: string;
    customer_email?: string;
    target_quantity?: number;
    verified_at?: string;
    supervisor_comment?: string;
    planned_qty?: number;
    actual_qty?: number;
}

/**
 * CustomSearchDropdown Component
 * A robust search-and-select dropdown component featuring:
 * - Search filtering capabilities.
 * - Out-of-bounds click listener to auto-close dropdown.
 * - Glassmorphism-style styling.
 */
const CustomSearchDropdown = ({
    options,
    value,
    onChange,
    placeholder,
    searchPlaceholder,
    allLabel
}: any) => {
    // Dropdown open state
    const [isOpen, setIsOpen] = useState(false);
    // User search input query state
    const [searchTerm, setSearchTerm] = useState('');
    // Reference to dropdown container element to handle click outside
    const containerRef = useRef<HTMLDivElement>(null);

    // Effect: Close the dropdown if the user clicks anywhere outside the container
    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter dropdown options based on the case-insensitive search term
    const filteredOptions = options.filter((o: any) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));

    // Get label to show in the collapsed button state
    const selectedLabel = value === 'all' ? allLabel : options.find((o: any) => o.id === value)?.label || placeholder;

    return (
        <div className="relative flex-1" ref={containerRef}>
            {/* Collapsed Dropdown Header Button */}
            <div
                className="w-full bg-transparent text-xs font-semibold text-ind-text flex items-center justify-between cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="truncate pr-2">{selectedLabel}</span>
                {isOpen ? <ChevronUp size={14} className="text-ind-text3 flex-shrink-0" /> : <ChevronDown size={14} className="text-ind-text3 flex-shrink-0" />}
            </div>

            {/* Dropdown Options Panel */}
            {isOpen && (
                <div className="absolute top-full -left-2 mt-3 w-[240px] bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-ind-border z-50 overflow-hidden flex flex-col pt-3 pb-1 animate-in fade-in zoom-in-95 duration-200">
                    {/* Search Field Input Header */}
                    <div className="px-3 pb-3 border-b border-ind-border/40">
                        <div className="relative flex items-center border border-blue-500 rounded-lg overflow-hidden group focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                            <Search size={13} className="text-gray-400 ml-2.5 flex-shrink-0" />
                            <input
                                type="text"
                                className="w-full py-1.5 px-2.5 text-[11px] font-semibold text-gray-800 outline-none placeholder:text-gray-400"
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()} // Prevent closing dropdown on input click
                            />
                        </div>
                    </div>
                    {/* Scrollable List of Options */}
                    <div className="flex-1 max-h-[220px] overflow-y-auto custom-scrollbar pt-1">
                        {/* 'Select All' default option */}
                        <div
                            className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-wider cursor-pointer flex items-center justify-between ${value === 'all' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-600 hover:bg-gray-50'}`}
                            onClick={() => { onChange('all'); setIsOpen(false); setSearchTerm(''); }}
                        >
                            {allLabel}
                            {value === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                        </div>
                        {/* Iterated sub-options */}
                        {filteredOptions.map((opt: any) => (
                            <div
                                key={opt.id}
                                className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-wider cursor-pointer flex items-center justify-between ${value === opt.id ? 'text-blue-600 bg-blue-50/50' : 'text-gray-600 hover:bg-gray-50'}`}
                                onClick={() => { onChange(opt.id); setIsOpen(false); setSearchTerm(''); }}
                            >
                                {opt.label}
                                {value === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * DEODashboardPage Component
 * Main page container managing DEO-specific routes, data fetching, global filters,
 * statistics dashboard metrics, and sub-module rendering.
 */
const DEODashboardPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // State: List of assigned models returned from API
    const [assignedModels, setAssignedModels] = useState<AssignedModel[]>([]);
    // State: Screen loading spinner indicator
    const [isLoading, setIsLoading] = useState(true);
    // State: Selected vehicle model filter value
    const [selectedModelName, setSelectedModelName] = useState<string | null>(null);
    // State: Logs of daily production entries
    const [submissionHistory, setSubmissionHistory] = useState<any[]>([]);
    // State: Active shortage requests
    const [shortageRequests, setShortageRequests] = useState<any[]>([]);

    // State: Generic modal overlay config (input forms, alerts, confirm boxes)
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message?: string;
        defaultValue: string;
        type: 'input' | 'confirm' | 'alert';
        onConfirm: (val: string) => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        defaultValue: '',
        type: 'input',
        onConfirm: () => { }
    });

    // State: Config data to handle modal details for rejected production logs
    const [rejectionModalData, setRejectionModalData] = useState<{ part: string; reason: string } | null>(null);

    // Dashboard filter state: Selected assembly/production line
    const [selectedLine, setSelectedLine] = useState('ALL LINES');
    // Dashboard filter state: Selected logging/tracking calendar date (default to today)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    /**
     * uniqueLines Memo
     * Extracts a distinct set of production line names from assigned models and active shortage requests.
     */
    const uniqueLines = useMemo(() => {
        const linesSet = new Set<string>();
        assignedModels.forEach(m => { if (m.line_name) linesSet.add(m.line_name); });
        shortageRequests.forEach(r => {
            if (r.line_name) linesSet.add(r.line_name);
            else if (r.inventory_item?.line_name) linesSet.add(r.inventory_item.line_name);
        });
        return ['ALL LINES', ...Array.from(linesSet).sort()];
    }, [assignedModels, shortageRequests]);

    /**
     * availableModels Memo
     * Extracts a list of available vehicle names/models from assignments and shortage requests.
     */
    const availableModels = useMemo(() => {
        const names = new Set<string>();
        assignedModels.forEach(m => { if (m.name) names.add(m.name); });
        shortageRequests.forEach(r => {
            const name = r.inventory_item?.vehicle_name || r.vehicle_name;
            if (name) names.add(name);
        });
        return Array.from(names).sort().map(name => ({ id: name, name }));
    }, [assignedModels, shortageRequests]);

    /**
     * filteredAssignedModels Memo
     * Filters the base assigned models matching both selected production line and vehicle model filters.
     */
    const filteredAssignedModels = useMemo(() => {
        let filtered = assignedModels;
        if (selectedLine !== 'ALL LINES') {
            filtered = filtered.filter(m => m.line_name === selectedLine);
        }
        if (selectedModelName) {
            filtered = filtered.filter(m => m.name === selectedModelName);
        }
        return filtered;
    }, [assignedModels, selectedLine, selectedModelName]);

    /**
     * filteredSubmissionHistory Memo
     * Filters logged production submissions matching the active date, selected line, and selected model name.
     */
    const filteredSubmissionHistory = useMemo(() => {
        if (!selectedDate) return submissionHistory;

        const dateStr = new Date(selectedDate).toISOString().split('T')[0];
        let filtered = submissionHistory.filter(s => s.date?.split('T')[0] === dateStr);

        if (selectedLine !== 'ALL LINES') {
            filtered = filtered.filter(s => {
                const model = assignedModels.find(m => m.id === s.car_model_id || m.name === s.model_name);
                return model?.line_name === selectedLine;
            });
        }
        if (selectedModelName) {
            filtered = filtered.filter(s => {
                const model = assignedModels.find(m => m.id === s.car_model_id || m.name === s.model_name);
                return model?.name === selectedModelName || s.model_name === selectedModelName;
            });
        }
        return filtered;
    }, [submissionHistory, selectedDate, selectedLine, assignedModels, selectedModelName]);

    /**
     * filteredShortages Memo
     * Filters active shortage requests matching the selected production line and vehicle model filters.
     */
    const filteredShortages = useMemo(() => {
        let filtered = shortageRequests;

        if (selectedLine !== 'ALL LINES') {
            filtered = filtered.filter(r => r.line_name === selectedLine || r.inventory_item?.line_name === selectedLine);
        }
        if (selectedModelName) {
            filtered = filtered.filter(r => (r.inventory_item?.vehicle_name === selectedModelName || r.vehicle_name === selectedModelName));
        }
        return filtered;
    }, [shortageRequests, selectedLine, selectedModelName]);

    /**
     * fetchDashboardData Function
     * Asynchronously fetches operator dashboard values from backend API endpoints in parallel.
     * @param silent If true, refreshes the state silently in the background without triggering global page spinner.
     */
    const fetchDashboardData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const token = getToken();
            const [workRes, historyRes, shortageRes] = await Promise.all([
                fetch(`${API_BASE}/deo/assigned-work`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE}/deo/history`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE}/deo/shortage-requests`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (workRes.ok) {
                const result = await workRes.json();
                if (result.success) {
                    setAssignedModels(result.data);
                }
            }
            if (historyRes.ok) {
                const result = await historyRes.json();
                if (result.success) setSubmissionHistory(result.data);
            }
            if (shortageRes.ok) {
                const result = await shortageRes.json();
                if (result.success) setShortageRequests(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    /**
     * activeTab Memo
     * Mappings to identify current workspace view/route to load relevant components.
     */
    const activeTab = useMemo(() => {
        const path = location.pathname;
        if (path === DEO_SHORTAGE) return 'SHORTAGE';
        if (path === DEO_SHORTAGE_HISTORY) return 'SHORTAGE_HISTORY';
        if (path === DEO_ENTRY) return 'DAILY_PRODUCTION';
        return 'DASHBOARD';
    }, [location.pathname]);

    // Effect: Pull initial dashboard metrics on load
    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Effect: Setup 60-second periodic background sync when input modals are closed
    useEffect(() => {
        const interval = setInterval(() => {
            if (!modalConfig.isOpen) {
                fetchDashboardData(true);
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [modalConfig.isOpen]);

    /**
     * renderContent Function
     * Standard view switch checking the active tab and rendering the matching panel layout:
     * - 'DASHBOARD': Visual charts, KPI metrics, vehicle performance graphs, and trend summaries.
     * - 'SHORTAGE': Shortage requests queue component.
     * - 'SHORTAGE_HISTORY': Closed shortage history logs.
     * - 'DAILY_PRODUCTION': Operator daily production entry console.
     */
    const renderContent = () => {
        // Render skeleton screen loaders during initial data fetching
        if (isLoading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-white border border-ind-border/50 rounded-[2.5rem] animate-pulse" />
                    ))}
                </div>
            );
        }

        switch (activeTab) {
            case 'DASHBOARD':
                return (
                    <div className="space-y-6 animate-in fade-in duration-700 px-2">
                        {/* Filter Bar Panel */}
                        {false && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
                                {/* Vehicle Model Selection */}
                                <div className="bg-white border border-ind-border rounded-[1.25rem] p-4 flex flex-col justify-between shadow-sm hover:border-ind-border2 transition-all group ">
                                    <div className="flex items-center gap-2.5 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50/50 text-blue-500 flex items-center justify-center transition-all">
                                            <LayoutGrid size={16} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-sm whitespace-nowrap font-semibold">Vehicle Model</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 bg-[#f5f5f5] rounded-full">
                                        <CustomSearchDropdown
                                            options={availableModels.map((m: any) => ({ id: m.name, label: m.name }))}
                                            value={selectedModelName || 'all'}
                                            onChange={(val: any) => setSelectedModelName(val === 'all' ? null : val)}
                                            placeholder="Select Vehicle"
                                            searchPlaceholder="Search Vehicle Model..."
                                            allLabel="ALL VEHICLES"
                                        />
                                    </div>
                                </div>

                                {/* Production Line Selection */}
                                <div className="bg-white border border-ind-border rounded-[1.25rem] p-4 flex flex-col justify-between shadow-sm hover:border-ind-border2 transition-all group">
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 text-ind-text3 flex items-center justify-center transition-all">
                                            <Factory size={16} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-sm whitespace-nowrap font-semibold">Production Line</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 bg-[#f5f5f5] rounded-full">
                                        <CustomSearchDropdown
                                            options={uniqueLines.filter(l => l !== 'ALL LINES').map(l => ({ id: l, label: l }))}
                                            value={selectedLine === 'ALL LINES' ? 'all' : selectedLine}
                                            onChange={(val: any) => setSelectedLine(val === 'all' ? 'ALL LINES' : val)}
                                            placeholder="Select Line"
                                            searchPlaceholder="Search Production Line..."
                                            allLabel="ALL PRODUCTIONS"
                                        />
                                    </div>
                                </div>

                                {/* Time Period & Date Picker Selection */}
                                <div className="bg-white border border-ind-border rounded-[1.25rem] p-4 flex flex-col justify-between shadow-sm hover:border-ind-border2 transition-all group ">
                                    <div className="flex items-center gap-2.5 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-orange-50/50 text-ind-primary flex items-center justify-center transition-all">
                                            <Calendar size={16} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-sm whitespace-nowrap font-semibold">Time Period</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-1 mt-auto">
                                        {/* Selector: Daily, Weekly, Monthly */}
                                        <div className="relative flex-1">
                                            <select
                                                className="w-full bg-[#f5f5f5] border border-ind-border/40 rounded-lg py-1 px-2 text-[0.7rem] font-bold text-ind-text uppercase outline-none focus:ring-2 focus:ring-ind-blue/10 appearance-none cursor-pointer pr-6"
                                            >
                                                <option value="daily">DAILY</option>
                                                <option value="weekly">WEEKLY</option>
                                                <option value="monthly">MONTHLY</option>
                                            </select>
                                            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-ind-text3 pointer-events-none" />
                                        </div>

                                        {/* Calendar Date Picker Input */}
                                        <div className="relative flex items-center group/cal">
                                            <input
                                                type="date"
                                                value={selectedDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-8"
                                            />
                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg border border-ind-border bg-white text-ind-text3 hover:border-ind-blue group-hover/cal:border-ind-blue transition-all">
                                                <Calendar size={13} strokeWidth={2.5} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* KPI Statistics Metrics Grid (DEOStats) & Analytical Charts (DEOAnalytics) */}
                        {false && (
                            <>
                                <DEOStats
                                    assignedModels={filteredAssignedModels}
                                    submissionHistory={filteredSubmissionHistory}
                                    shortageRequests={filteredShortages}
                                    selectedDate={selectedDate}
                                />
                                <DEOAnalytics
                                    assignedModels={filteredAssignedModels}
                                    submissionHistory={filteredSubmissionHistory}
                                    shortageRequests={filteredShortages}
                                    selectedDate={selectedDate}
                                />
                            </>
                        )}
                    </div>
                );

            case 'SHORTAGE':
                return (
                    <div className="animate-in fade-in duration-500 h-full flex flex-col min-h-0">
                        <DEOShortageRequests />
                    </div>
                );

            case 'SHORTAGE_HISTORY':
                return (
                    <div className="animate-in fade-in duration-500 h-full flex flex-col min-h-0">
                        <DEOShortageHistoryPage />
                    </div>
                );

            case 'DAILY_PRODUCTION':
                return (
                    <div className="animate-in fade-in duration-500 h-full flex flex-col min-h-0">
                        <DEODailyProduction />
                    </div>
                );

            default: return null;
        }
    };

    return (
        <div className="h-full bg-ind-bg flex flex-col overflow-hidden">
            {/* Outer Responsive Wrapper container */}
            <div className="flex-1 max-w-[1700px] mx-auto w-full px-0 lg:px-0 flex flex-col min-h-full max-h-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        className="flex-1 flex flex-col min-h-0"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className={`flex-1 ${['DASHBOARD', 'DAILY_PRODUCTION'].includes(activeTab) ? 'overflow-y-scroll custom-scrollbar pr-2 pb-2 pt-2' : 'overflow-hidden flex flex-col min-h-0'}`}>
                                {renderContent()}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Global Overlays & Modals */}
            <CustomModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={modalConfig.onConfirm}
                title={modalConfig.title}
                message={modalConfig.message}
                defaultValue={modalConfig.defaultValue}
                type={modalConfig.type}
            />

            {/* Rejection Comments Modal */}
            <RejectionModal
                data={rejectionModalData}
                onClose={() => setRejectionModalData(null)}
            />
        </div>
    );
};

export default DEODashboardPage;