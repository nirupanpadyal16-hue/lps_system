import { Activity, Cpu, Server, Wifi, Zap } from 'lucide-react';
import { ShopFloorMap } from './ShopFloorMap';

interface SupervisorMonitoringProps {
    assignedModels: any[];
}

export const SupervisorMonitoring = ({ assignedModels }: SupervisorMonitoringProps) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-4">
                        <Activity className="text-ind-primary" size={32} strokeWidth={3} />
                        Operational Telemetry
                    </h2>
                    <p className="text-ind-text3 font-extrabold text-[10px] uppercase tracking-[0.3em] mt-2 ml-1">
                        Live production-grade environment health
                    </p>
                </div>
                
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Pulse: 72 BPM</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/10 transition-colors" />
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            <Server size={24} className="text-blue-400" />
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-200">Online</span>
                            </div>
                            <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Node Cluster 01</span>
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Database Sync Status</p>
                    <p className="text-4xl font-black tracking-tighter">99.9<span className="text-xl text-slate-500">%</span></p>
                </div>

                <div className="bg-gradient-to-br from-ind-primary to-orange-600 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/20 transition-colors" />
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            <Cpu size={24} className="text-orange-100" />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-orange-200">Optimal</span>
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200 mb-1">Compute Throughput</p>
                    <p className="text-4xl font-black tracking-tighter tabular-nums">1.2k <span className="text-lg font-bold text-orange-200 tracking-normal uppercase">IOPS</span></p>
                </div>

                <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm group hover:border-ind-primary/20 transition-colors duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-ind-bg transition-colors">
                            <Wifi size={24} className="text-slate-600" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">Low Latency</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Backplane Response</p>
                    <p className="text-4xl font-black tracking-tighter text-slate-800">42 <span className="text-xl text-slate-400">ms</span></p>
                </div>

                <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm group hover:border-ind-primary/20 transition-colors duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-ind-bg transition-colors">
                            <Zap size={24} className="text-slate-600" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">High Load</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Active Site Terminals</p>
                    <p className="text-4xl font-black tracking-tighter text-slate-800">14 <span className="text-xl text-slate-400">Nodes</span></p>
                </div>
            </div>

            {/* Live Shop Floor Matrix */}
            <ShopFloorMap assignedModels={assignedModels} />
        </div>
    );
};

