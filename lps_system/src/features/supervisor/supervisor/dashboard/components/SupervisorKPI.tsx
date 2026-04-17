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
            label: 'TOTAL DEOS',
            value: totalDeos,
            icon: <Users size={16} />,
            badgeText: 'LIVE',
            color: 'blue',
            path: null,
        },
        {
            label: 'PENDING PRODUCTION LOGS',
            value: awaitingReview,
            icon: <ClipboardCheck size={16} />,
            badgeText: 'AWAITING ACTION',
            color: 'indigo',
            path: null,
        },
        {
            label: 'SHORTAGE VERIFIED',
            value: verifiedShortages,
            icon: <ClipboardCheck size={16} />,
            badgeText: 'COMPLETED',
            color: 'emerald',
            path: '/supervisor/shortage',
        },
        {
            label: 'VERIFY SHORTAGE REQUESTS',
            value: pendingShortages,
            icon: <Clock size={16} />,
            badgeText: 'ACTION NEEDED',
            color: 'orange',
            path: '/supervisor/shortage',
        },
        {
            label: 'REJECTED SHORTAGE REQUESTS',
            value: rejectedShortages,
            icon: <AlertTriangle size={16} />,
            badgeText: 'ALERT',
            color: 'red',
            path: '/supervisor/shortage',
        }
    ];

    const getColors = (color: string) => {
        const maps: Record<string, { border: string; icon: string; badge: string }> = {
            blue: { border: 'border-t-blue-500', icon: 'bg-blue-50 text-blue-500', badge: 'bg-blue-50 text-blue-600' },
            indigo: { border: 'border-t-indigo-500', icon: 'bg-indigo-50 text-indigo-500', badge: 'bg-indigo-50 text-indigo-600' },
            emerald: { border: 'border-t-emerald-500', icon: 'bg-emerald-50 text-emerald-500', badge: 'bg-emerald-50 text-emerald-600' },
            orange: { border: 'border-t-orange-500', icon: 'bg-orange-50 text-orange-500', badge: 'bg-orange-50 text-orange-600' },
            red: { border: 'border-t-red-500', icon: 'bg-red-50 text-red-500', badge: 'bg-red-50 text-red-600' },
        };
        return maps[color] || maps.blue;
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-2 pb-0 px-2">
            {kpis.map((kpi, index) => {
                const colors = getColors(kpi.color);
                return (
                    <div
                        key={index}
                        onClick={() => {
                            if (kpi.path) {
                                navigate(kpi.path);
                            }
                        }}
                        className={`bg-white border-t-[4px] ${colors.border} rounded-2xl py-2 px-4 shadow-sm transition-all group flex flex-col justify-between
                            ${kpi.path ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}
                        `}
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-[0.6rem] font-bold text-black tracking-wider uppercase">{kpi.label}</span>
                            <div className="flex items-center gap-2">
                                <span className={`inline-block px-3 py-0.5 rounded-lg text-[0.55rem] font-black [font-variant:small-caps] tracking-widest ${colors.badge}`}>
                                    {kpi.badgeText}
                                </span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="mt-1">
                                <div className="text-2xl font-black text-ind-text tracking-tight">{kpi.value}</div>
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.icon}`}>
                                {kpi.icon}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
