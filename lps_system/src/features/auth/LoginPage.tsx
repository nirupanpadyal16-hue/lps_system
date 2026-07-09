import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Lock,
    User,
    ArrowRight,
    ShieldCheck,
    Code2,
    Loader2
} from 'lucide-react';
import logoLps from '../../assets/logo_lps.png';
import bgImage from '../../assets/loginpage.jpg';

import { setToken, setUser } from '../../lib/storage';
import { login } from './api';
// localDB removed – all auth goes through backend API
import { UserRole } from '../../config/roles';
import {
    MANAGER_DASHBOARD,
    ADMIN_HOME,
    AUTH_LOGIN,
    SUPERVISOR_DASHBOARD,
    DEO_DASHBOARD,
    DEO_SHORTAGE,
    PPC_DEMAND,
    SK_RM_QUEUE,
    SUPERVISOR_SHORTAGE,
} from '../../config/routePaths';

// ─── Developer Mode quick-login accounts ──────────────────────────────────────
// Seeded dev/test users so testers don't have to remember passwords.
// Safe to remove for production (or gate behind import.meta.env.DEV).
const DEV_ACCOUNTS: { label: string; username: string; password: string; color: string }[] = [
    { label: 'Admin',        username: 'admin',   password: 'admin',   color: 'bg-slate-800 hover:bg-slate-900' },
    { label: 'PPC Planner',  username: 'ppc1',    password: 'test',    color: 'bg-indigo-600 hover:bg-indigo-700' },
    { label: 'Store Keeper', username: 'sk1',     password: 'test',    color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Supervisor',   username: 'sup1',    password: 'test',    color: 'bg-sky-600 hover:bg-sky-700' },
    { label: 'DEO',          username: 'deo1',    password: 'test',    color: 'bg-orange-600 hover:bg-orange-700' },
    { label: 'Manager',      username: 'manager', password: 'manager', color: 'bg-purple-600 hover:bg-purple-700' },
];

const LoginPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [devLoading, setDevLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Core login routine, callable with explicit credentials (used by the
    // normal form AND by the Developer Mode quick-login buttons).
    const doLogin = async (uname: string, pwd: string) => {
        setError(null);
        setLoading(true);

        try {
            const response = await login(uname, pwd);

            if (response.success) {
                setToken(response.data.access_token);
                setUser(response.data.user);

                const role = response.data.user.role ? response.data.user.role.toUpperCase() : '';
                switch (role) {
                    case UserRole.ADMIN.toUpperCase():
                        navigate(ADMIN_HOME);
                        break;
                    case UserRole.MANAGER.toUpperCase():
                        navigate(MANAGER_DASHBOARD);
                        break;
                    case UserRole.SUPERVISOR.toUpperCase():
                        navigate(SUPERVISOR_SHORTAGE);
                        break;
                    case UserRole.DEO.toUpperCase():
                        navigate(DEO_SHORTAGE);
                        break;
                    case UserRole.PPC_PLANNER.toUpperCase():
                        navigate(PPC_DEMAND);
                        break;
                    case UserRole.STORE_KEEPER.toUpperCase():
                        navigate(SK_RM_QUEUE);
                        break;
                    default:
                        navigate(AUTH_LOGIN);
                        break;
                }
            } else {
                setError(response.message || 'Authentication failed');
            }
        } catch (err: any) {
            setError('System synchronization error. Please check your credentials.');
        } finally {
            setLoading(false);
            setDevLoading(null);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        await doLogin(username, password);
    };

    const handleQuickLogin = (uname: string, pwd: string) => {
        // Reflect the chosen creds in the fields for visual feedback, then log in.
        setUsername(uname);
        setPassword(pwd);
        setDevLoading(uname);
        doLogin(uname, pwd);
    };

    return (
        // <div className="min-h-screen bg-ind-bg flex items-center justify-center p-6 relative overflow-hidden">
        //     {/* Subtle Background Elements */}
        //     <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
        //     <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        //     <motion.div
        //         initial={{ opacity: 0, y: 20 }}
        //         animate={{ opacity: 1, y: 0 }}
        //         className="w-full max-w-[420px] relative z-10"
        //     >
        //         <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative overflow-hidden border border-ind-border/50">

        //             {/* Branding */}
        //             <div className="text-center mb-8">
        //                 <div className="w-64 mx-auto mb-6">
        //                     <img src={logoLps} alt="CIE Automotive" className="w-full h-auto object-contain" />
        //                 </div>
        //                 <h1 className="text-2xl font-black text-slate-800 tracking-wide uppercase mb-2 font-sans">PRODUCTION SYSTEM</h1>
        //                 <p className="text-ind-text3 font-bold text-xs">Sign in to access your dashboard</p>
        //             </div>

        //             <form onSubmit={handleLogin} className="space-y-5">
        //                 <div className="space-y-1.5">
        //                     <label className="text-[10px] font-black text-ind-text3 uppercase tracking-widest ml-1">USERNAME</label>
        //                     <div className="relative group">
        //                         <User className="absolute left-4 top-1/2 -translate-y-1/2 text-ind-text3 group-focus-within:text-ind-primary transition-colors" size={20} />
        //                         <input
        //                             type="text"
        //                             value={username}
        //                             onChange={(e) => setUsername(e.target.value)}
        //                             placeholder="Enter your username"
        //                             className="w-full bg-ind-bg border-2 border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-700 placeholder:text-ind-text3 focus:bg-white focus:border-ind-primary focus:ring-4 focus:ring-orange-500/10 transition-all font-bold outline-none"
        //                             required
        //                         />
        //                     </div>
        //                 </div>

        //                 <div className="space-y-1.5">
        //                     <label className="text-[10px] font-black text-ind-text3 uppercase tracking-widest ml-1">PASSWORD</label>
        //                     <div className="relative group">
        //                         <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ind-text3 group-focus-within:text-ind-primary transition-colors" size={20} />
        //                         <input
        //                             type="password"
        //                             value={password}
        //                             onChange={(e) => setPassword(e.target.value)}
        //                             placeholder="••••••••"
        //                             className="w-full bg-ind-bg border-2 border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-700 placeholder:text-ind-text3 focus:bg-white focus:border-ind-primary focus:ring-4 focus:ring-orange-500/10 transition-all font-bold outline-none"
        //                             required
        //                         />
        //                     </div>
        //                 </div>

        //                 {error && (
        //                     <motion.div
        //                         initial={{ opacity: 0, x: -10 }}
        //                         animate={{ opacity: 1, x: 0 }}
        //                         className="bg-rose-50 border border-rose-100 text-rose-500 px-4 py-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2"
        //                     >
        //                         <ShieldCheck size={14} />
        //                         {error}
        //                     </motion.div>
        //                 )}

        //                 <button
        //                     type="submit"
        //                     disabled={loading}
        //                     className="w-full bg-[#F37021] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_10px_30px_rgba(243,112,33,0.3)] hover:shadow-[0_15px_35px_rgba(243,112,33,0.4)] hover:-translate-y-1 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group mt-6"
        //                 >
        //                     {loading ? (
        //                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        //                     ) : (
        //                         <>
        //                             <span>SIGN IN</span>
        //                             <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        //                         </>
        //                     )}
        //                 </button>
        //             </form>

        //             <div className="mt-4 text-center space-y-4">
        //                 <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">CIE AUTOMOTIVE PRODUCTION SYSTEM V3.0</p>

        //             </div>
        //         </div>
        //     </motion.div>
        // </div>
        <div className="min-h-screen flex items-center justify-end p-6 relative overflow-hidden">

            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: `url('${bgImage}')`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            />

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Subtle Background Elements */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-500/10 rounded-full  pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full  pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[420px] relative z-10"
            >
                <div className="bg-white backdrop-blur-xl rounded-[30px] px-6 py-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden border border-white/20">

                    {/* Branding */}
                    <div className="text-center mb-4">
                        <div className="w-64 mx-auto mb-4">
                            <img src={logoLps} alt="CIE Automotive" className="w-full h-auto object-contain" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-wide uppercase mb-2 font-sans">
                            PRODUCTION SYSTEM
                        </h1>
                        <p className="text-ind-text3 font-bold text-xs">
                            Sign in to access your dashboard
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">

                        {/* Username */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-black uppercase  ml-1">
                                USERNAME
                            </label>
                            <div className="relative group">
                                <User
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-ind-text3 group-focus-within:text-ind-primary transition-colors"
                                    size={20}
                                />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter your username"
                                    className="w-full font-medium bg-slate-100 border-2 border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-black placeholder:text-ind-text3 focus:bg-white focus:border-ind-primary focus:ring-4 focus:ring-orange-500/10 transition-all font-bold outline-none text-sm"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-black uppercase  ml-1">
                                PASSWORD
                            </label>
                            <div className="relative group">
                                <Lock
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-ind-text3 group-focus-within:text-ind-primary transition-colors"
                                    size={20}
                                />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-100 font-medium border-2 border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-black placeholder:text-ind-text3 focus:bg-white focus:border-ind-primary focus:ring-4 focus:ring-orange-500/10 transition-all font-bold outline-none text-sm"
                                    required
                                />
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-rose-50 border border-rose-100 text-rose-500 px-4 py-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2"
                            >
                                <ShieldCheck size={14} />
                                {error}
                            </motion.div>
                        )}

                        {/* Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#F37021] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest  disabled:opacity-50 flex items-center justify-center gap-2 group mt-6"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>SIGN IN</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* ─── Developer Mode: one-click role login ─────────────── */}
                    <div className="mt-6 pt-4 border-t border-dashed border-slate-200">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <Code2 size={13} className="text-orange-500" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Developer Mode — Quick Login
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {DEV_ACCOUNTS.map((acc) => (
                                <button
                                    key={acc.username}
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleQuickLogin(acc.username, acc.password)}
                                    title={`Login as ${acc.username} / ${acc.password}`}
                                    className={`flex items-center justify-center gap-1.5 ${acc.color} text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50`}
                                >
                                    {devLoading === acc.username ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                        <>
                                            <span>{acc.label}</span>
                                        </>
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 text-center mt-2.5">
                            Test accounts — no password needed. Remove before production.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 text-center space-y-4">
                        <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">
                            CIE AUTOMOTIVE PRODUCTION SYSTEM V3.0
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage;
