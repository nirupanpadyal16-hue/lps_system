import { Users, ClipboardCheck, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface KPIProps {
    totalDeos: number;
    awaitingReview: number;
    verifiedShortages: number;
    pendingShortages: number;
    rejectedShortages: number;
}

export const SupervisorKPI = ({
    totalDeos,
    awaitingReview,
    verifiedShortages,
    pendingShortages,
    rejectedShortages
}: KPIProps) => {
    const navigate = useNavigate();

    const kpis = [
        {
            label: 'Total DEOs',
            value: totalDeos,
            icon: Users,
            colorUrl: 'blue',
            badgeText: 'LIVE',
            badgeColor: 'bg-blue-50 text-blue-600',
            iconColor: 'bg-blue-50 text-blue-600',
            borderColor: 'border-t-blue-500',
            path: null,
            glow: ''
        },
        {
            label: 'Pending Production Logs',
            value: awaitingReview,
            icon: ClipboardCheck,
            colorUrl: 'indigo',
            badgeText: 'AWAITING ACTION',
            badgeColor: 'bg-indigo-50 text-indigo-600',
            iconColor: 'bg-indigo-50 text-indigo-600',
            borderColor: 'border-t-indigo-500',
            path: null, // Stays on dashboard to click a log
            glow: ''
        },
        {
            label: 'Shortage Verified',
            value: verifiedShortages,
            icon: ClipboardCheck,
            colorUrl: 'emerald',
            badgeText: 'COMPLETED',
            badgeColor: 'bg-emerald-50 text-emerald-600',
            iconColor: 'bg-emerald-50 text-emerald-600',
            borderColor: 'border-t-emerald-500',
            path: '/supervisor/shortage',
            glow: ''
        },
        {
            label: 'Verify Shortage Requests',
            value: pendingShortages,
            icon: Clock,
            colorUrl: 'orange',
            badgeText: 'ACTION NEEDED',
            badgeColor: 'bg-orange-50 text-orange-600',
            iconColor: 'bg-orange-50 text-orange-600',
            borderColor: 'border-t-orange-500',
            path: '/supervisor/shortage',
            glow: ''
        },
        {
            label: 'Rejected Shortage Request',
            value: rejectedShortages,
            icon: AlertTriangle,
            colorUrl: 'red',
            badgeText: 'ALERT',
            badgeColor: 'bg-red-50 text-red-600',
            iconColor: 'bg-red-50 text-red-600',
            borderColor: 'border-t-red-500',
            path: '/supervisor/shortage',
            glow: ''
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {kpis.map((kpi, index) => (
                <div
                    key={index}
                    onClick={() => {
                        if (kpi.path) {
                            navigate(kpi.path);
                        }
                    }}
                    className={`bg-white rounded-[1.25rem] p-3 border border-x-gray-200 border-b-gray-200 border-t-[4px] shadow-sm flex justify-between items-stretch transition-all duration-300 group
                        ${kpi.borderColor} 
                        ${kpi.path ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}
                    `}
                >
                    <div className="flex flex-col justify-between h-full gap-2">
                        <h3 className="text-[10px] font-bold text-gray-700 capitalize  leading-none">
                            {kpi.label}
                        </h3>
                        <span className="text-[2.5rem] font-bold text-gray-900 leading-none tabular-nums tracking-tighter">
                            {kpi.value}
                        </span>
                    </div>

                    <div className="flex flex-col items-end justify-between h-full space-y-2">
                        <span className={`px-2.5 py-1 ${kpi.badgeColor} text-[8px] font-black uppercase tracking-widest rounded-lg`}>
                            {kpi.badgeText}
                        </span>
                        <div className={`w-9 h-9 rounded-full ${kpi.iconColor} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                            <kpi.icon size={16} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
