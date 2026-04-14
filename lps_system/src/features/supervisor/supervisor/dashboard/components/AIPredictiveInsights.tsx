import { Brain, TrendingUp, AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export const AIPredictiveInsights = () => {
    const insights = [
        {
            id: 1,
            title: "Bottleneck Warning",
            description: "Line 2 is trending towards a 15% delay in the next 2 hours. Main cause: slow component verification.",
            type: "warning",
            icon: AlertCircle,
            action: "Optimize Line 2",
            confidence: 94
        },
        {
            id: 2,
            title: "Quality Optimization",
            description: "Model RX-500 shows 8% better FTR when running on Line 4 vs Line 1. Recommend prioritizing Line 4 for this batch.",
            type: "optimal",
            icon: CheckCircle2,
            action: "View Analysis",
            confidence: 89
        },
        {
            id: 3,
            title: "Efficiency Forecast",
            description: "Current shift is predicted to exceed the daily target by 45 units if the current 0.8s cycle time is maintained.",
            type: "info",
            icon: ShieldCheck,
            action: "View Full Report",
            confidence: 91
        }
    ];

    return (
        <div className="px-4 py-2">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                    <Brain className="text-indigo-600" size={20} strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">AI Predictive Insights</h3>
                    <p className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest">Powered by Industrial Neural Network</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {insights.map((insight, idx) => (
                    <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 relative overflow-hidden"
                    >
                        {/* Confidence Indicator */}
                        <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-50 border-bl border-indigo-100 rounded-bl-2xl">
                            <span className="text-[8px] font-black text-indigo-600 tracking-widest uppercase">{insight.confidence}% Confidence</span>
                        </div>

                        <div className="flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                    insight.type === 'warning' ? 'bg-orange-50 text-orange-500' :
                                    insight.type === 'optimal' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
                                }`}>
                                    <insight.icon size={16} />
                                </div>
                                <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{insight.title}</span>
                            </div>

                            <p className="text-[11px] font-bold text-slate-500 leading-relaxed mb-6">
                                {insight.description}
                            </p>

                            <div className="mt-auto flex items-center justify-between">
                                <button className="text-[10px] font-black text-indigo-600 uppercase tracking-wider hover:text-indigo-800 transition-colors">
                                    {insight.action} →
                                </button>
                                <div className="flex items-center gap-1">
                                    <TrendingUp size={12} className="text-emerald-500" />
                                    <span className="text-[10px] font-bold text-emerald-500">+12%</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// Internal Components
const CheckCircle2 = ({ size, className }: { size?: number, className?: string }) => (
    <div className={`rounded-full border-2 border-current flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <ShieldCheck size={size ? size - 4 : 12} />
    </div>
);
