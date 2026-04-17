import { Bell, AlertTriangle, Info, CheckCircle2, Siren } from 'lucide-react';

export const SupervisorAlerts = () => {
    const mockAlerts = [
        { id: 1, type: 'critical', title: 'High Production Variance', message: 'Line 4 is creating a high volume of rejected components.', time: '10 mins ago', icon: Siren },
        { id: 2, type: 'warning', title: 'Shortage Warning', message: 'Inventory for SAP Part #8829 is running below 15%.', time: '1 hour ago', icon: AlertTriangle },
        { id: 3, type: 'info', title: 'DEO Shift Ended', message: 'Shift A operators have logged off.', time: '2 hours ago', icon: Info },
        { id: 4, type: 'success', title: 'Database Sync Completed', message: 'Daily routine backup complete successfully.', time: '5 hours ago', icon: CheckCircle2 },
    ];

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'critical': return 'bg-rose-50 border-rose-200 text-rose-700';
            case 'warning': return 'bg-orange-50 border-orange-200 text-orange-700';
            case 'success': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
            case 'info': default: return 'bg-blue-50 border-blue-200 text-blue-700';
        }
    };

    const getIconColor = (type: string) => {
        switch (type) {
            case 'critical': return 'text-rose-600';
            case 'warning': return 'text-orange-600';
            case 'success': return 'text-emerald-600';
            case 'info': default: return 'text-blue-600';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 font-sans">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[24px] font-black text-ind-text tracking-tight  leading-none">
                       
                        System Alerts
                    </h2>
                    <p className="text-ind-text3 font-bold text-xs uppercase tracking-[0.2em] mt-1 ml-10">
                        Operational notifications and warnings
                    </p>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest text-ind-text3 hover:text-ind-primary transition-colors">
                    Mark all as read
                </button>
            </div>

            <div className="space-y-3">
                {mockAlerts.map(alert => (
                    <div key={alert.id} className={`p-5 rounded-2xl border flex gap-4 ${getTypeStyles(alert.type)} transition-all hover:-translate-y-0.5 hover:shadow-md`}>
                        <div className={`mt-0.5 ${getIconColor(alert.type)}`}>
                            <alert.icon size={22} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-black tracking-tight text-sm uppercase">{alert.title}</h3>
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{alert.time}</span>
                            </div>
                            <p className="text-xs font-bold opacity-80">{alert.message}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-center pt-8">
                <button className="px-6 py-2 border-2 border-ind-border/60 text-ind-text3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-ind-primary hover:text-ind-primary transition-all">
                    Load Archive
                </button>
            </div>
        </div>
    );
};
