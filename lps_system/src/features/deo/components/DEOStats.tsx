import React from 'react';
import { motion } from 'framer-motion';
import {
    Flame,
    Activity,
    Clock,
    ClipboardCheck,
    AlertTriangle
} from 'lucide-react';

import { DEOAnalytics } from './DEOAnalytics';

interface AssignedModel {
    id: number;
    name: string;
    model_code: string;
    line_name: string;
    customer_name: string;
    deo_accepted: boolean;
    planned_qty?: number;
    actual_qty?: number;
    status?: string;
    supervisor_name?: string;
    supervisor_email?: string;
    manager_name?: string;
    manager_email?: string;
    customer_email?: string;
    target_quantity?: number;
    verified_at?: string;
}

interface DEOStatsProps {
    assignedModels: AssignedModel[];
    submissionHistory: any[];
    shortageRequests: any[];
    selectedDate: string;
}

export const DEOStats: React.FC<DEOStatsProps> = ({
    assignedModels,
    submissionHistory,
    shortageRequests,
    selectedDate
}) => {
    // Updated KPI mappings to exactly mirror Shortage Requests page header
    // Total Demand now shows the SUM of units for models remaining in PENDING status
    const totalDemand = shortageRequests
        .filter(r => r.status === 'PENDING')
        .reduce((sum, r) => sum + (r.shortage_quantity || 0), 0);
    const pendingModelsCount = shortageRequests.filter(r => r.status === 'PENDING').length;
    const activeModelsCount = shortageRequests.filter(r => r.status === 'IN_PROGRESS' || r.status === 'REJECTED').length;
    const readyModelsCount = shortageRequests.filter(r => r.status === 'COMPLETED' || r.status === 'DEO_FILLED').length;
    const rejections = shortageRequests.filter(r => r.status === 'REJECTED').length;

    const kpis = [
        {
            label: 'Total Demand',
            value: totalDemand,
            icon: Flame,
            color: 'text-blue-500',
            border: 'border-t-blue-500',
            badge: 'bg-blue-50 text-blue-600',
            iconBg: 'bg-blue-50'
        },
        {
            label: 'Active Models',
            value: activeModelsCount,
            icon: Activity,
            color: 'text-orange-500',
            border: 'border-t-orange-500',
            badge: 'bg-orange-50 text-orange-600',
            iconBg: 'bg-orange-50'
        },
        {
            label: 'Pending Models',
            value: pendingModelsCount,
            icon: Clock,
            color: 'text-indigo-500',
            border: 'border-t-indigo-500',
            badge: 'bg-indigo-50 text-indigo-600',
            iconBg: 'bg-indigo-50'
        },
        {
            label: 'Ready Models',
            value: readyModelsCount,
            icon: ClipboardCheck,
            color: 'text-emerald-500',
            border: 'border-t-emerald-500',
            badge: 'bg-emerald-50 text-emerald-600',
            iconBg: 'bg-emerald-50'
        },
        {
            label: 'Rejections',
            value: rejections,
            icon: AlertTriangle,
            color: 'text-rose-500',
            border: 'border-t-rose-500',
            badge: 'bg-rose-50 text-rose-600',
            iconBg: 'bg-rose-50'
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-2 px-0">
            {kpis.map((kpi, i) => {
                return (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.4 }}
                        className={`bg-white border-t-[4px] ${kpi.border} rounded-2xl py-2 px-4 shadow-sm transition-all hover:shadow-md group flex flex-col justify-between`}
                    >
                        {/* Top row: Label + Badge */}
                        <div className="flex justify-between items-center">
                            <span className="text-[0.6rem] font-black text-black uppercase tracking-widest [font-variant:small-caps]">
                                {kpi.label}
                            </span>
                            <div className={`inline-block px-3 py-0.5 rounded-lg text-[0.55rem] font-black uppercase tracking-widest ${kpi.badge} [font-variant:small-caps]`}>
                                Live
                            </div>
                        </div>

                        {/* Bottom row: Value + Icon */}
                        <div className="flex justify-between items-center mt-1">
                            <div className="text-2xl font-black text-ind-text tracking-tight">
                                {kpi.value.toLocaleString()}
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${kpi.iconBg} transition-transform group-hover:scale-110`}>
                                <kpi.icon size={16} className={kpi.color} strokeWidth={2.5} />
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};
