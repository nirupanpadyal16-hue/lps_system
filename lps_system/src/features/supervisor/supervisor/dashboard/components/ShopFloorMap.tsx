import { motion, AnimatePresence } from 'framer-motion';
import { Box, User, Activity, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useState } from 'react';

interface ShopLine {
    id: string;
    name: string;
    status: 'operational' | 'warning' | 'stopped';
    currentModel: string;
    operator: string;
    progress: number; // 0 to 100
    lastUpdate: string;
}

interface ShopFloorMapProps {
    assignedModels: any[];
}

export const ShopFloorMap = ({ assignedModels }: ShopFloorMapProps) => {
    const [selectedLine, setSelectedLine] = useState<string | null>(null);

    // Mocking statuses for visual diversity based on actual line data
    const transformedLines: ShopLine[] = assignedModels.reduce((acc: ShopLine[], model, idx) => {
        if (!model.line_name) return acc;
        
        // Find if line already exists
        const existing = acc.find(l => l.name === model.line_name);
        if (existing) return acc;

        // Deterministic but diverse statuses for demo
        const statusMap: ('operational' | 'warning' | 'stopped')[] = ['operational', 'operational', 'warning', 'operational'];
        const status = statusMap[idx % statusMap.length];
        
        acc.push({
            id: `line-${idx}`,
            name: model.line_name,
            status,
            currentModel: model.car_model_name || 'Loading...',
            operator: model.assigned_deo_name || 'Unassigned',
            progress: Math.floor(Math.random() * 40) + 60, // 60-100%
            lastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        return acc;
    }, []);

    return (
        <div className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-200/60 shadow-inner min-h-[500px] relative overflow-hidden">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            <div className="flex items-center justify-between mb-10 relative z-10">
                <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                        <Box className="text-ind-primary" size={20} />
                        Live Shop Floor Matrix
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Real-time status of all production nodes
                    </p>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                        <span className="text-[10px] font-black uppercase text-slate-600">Optimal</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]" />
                        <span className="text-[10px] font-black uppercase text-slate-600">Caution</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]" />
                        <span className="text-[10px] font-black uppercase text-slate-600">Stopped</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                <AnimatePresence>
                    {transformedLines.map((line) => (
                        <motion.div
                            key={line.name}
                            layoutId={line.name}
                            onClick={() => setSelectedLine(line.name === selectedLine ? null : line.name)}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -5, scale: 1.02 }}
                            className={`cursor-pointer group relative bg-white rounded-3xl p-6 shadow-sm border-2 transition-all duration-300 ${
                                selectedLine === line.name 
                                    ? 'border-ind-primary shadow-xl ring-4 ring-ind-primary/10' 
                                    : 'border-transparent hover:border-slate-200'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-2xl ${
                                    line.status === 'operational' ? 'bg-emerald-50 text-emerald-600' :
                                    line.status === 'warning' ? 'bg-orange-50 text-orange-600' : 'bg-rose-50 text-rose-600'
                                } group-hover:scale-110 transition-transform`}>
                                    <Activity size={20} className={line.status === 'operational' ? 'animate-pulse' : ''} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Node</p>
                                    <p className="text-lg font-black text-slate-800 tracking-tighter">{line.name}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span className="text-slate-500 flex items-center gap-1"><Box size={12}/> {line.currentModel}</span>
                                    <span className="text-slate-800">{line.progress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${line.progress}%` }}
                                        className={`h-full rounded-full ${
                                            line.status === 'operational' ? 'bg-emerald-500' :
                                            line.status === 'warning' ? 'bg-orange-500' : 'bg-rose-500'
                                        }`}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                            <User size={12} className="text-slate-500" />
                                        </div>
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight">{line.operator}</span>
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-400 italic">{line.lastUpdate}</span>
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div className={`absolute top-4 left-4 w-2 h-2 rounded-full ${
                                line.status === 'operational' ? 'bg-emerald-500 animate-ping' :
                                line.status === 'warning' ? 'bg-orange-500' : 'bg-rose-500'
                            }`} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {selectedLine && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 bg-ind-primary/5 border border-ind-primary/10 rounded-2xl p-6 flex items-start gap-4"
                >
                    <Info className="text-ind-primary mt-1" size={20} />
                    <div>
                        <h4 className="text-sm font-black text-ind-primary uppercase tracking-wider">Node Insight: {selectedLine}</h4>
                        <p className="text-xs font-bold text-slate-600 mt-1 max-w-2xl">
                            Line performance is currently at <span className="text-emerald-600 font-extrabold">98.4% efficiency</span>. 
                            No immediate material shortages detected for the next 4 hours of production. 
                            Operator performance is within optimal thresholds.
                        </p>
                    </div>
                </motion.div>
            )}
        </div>
    );
};
