import { useState } from 'react';
import {
    LayoutDashboard,
    Target,
    ClipboardList,
    Mail,
    Users,
    LogOut,
    Menu,
    ChevronLeft,
    X,
    Activity,
    Database,
    ClipboardCheck,
    Package
} from 'lucide-react';

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { getUser, clearTokens } from '../../lib/storage';
import { UserRole } from '../../config/roles';
import logoLps from '../../assets/logo_lps.png';

import {
    ADMIN_HOME,
    AUTH_LOGIN,
    ADMIN_LINES,
    ADMIN_MODELS,
    // ADMIN_ASSIGNMENTS,
    ADMIN_DEMAND,
    ADMIN_ORDERS,
    ADMIN_USERS,
    ADMIN_AUDIT,
    ADMIN_INVENTORY,
    DEO_DASHBOARD,
    DEO_MODELS,
    DEO_ENTRY,
    DEO_REPORTS,
    DEO_VERIFY,
    DEO_NOTIFICATIONS,
    DEO_SHORTAGE,
    SUPERVISOR_DASHBOARD,
    SUPERVISOR_VERIFY,
    SUPERVISOR_SHORTAGE,
    SUPERVISOR_REPORTS,
    SUPERVISOR_ALERTS,
    SUPERVISOR_MONITORING
} from '../../config/routePaths';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const user = getUser();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = () => {
        clearTokens();
        navigate(AUTH_LOGIN);
    };

    const normalizeRole = (role?: string) => role?.toLowerCase() || '';

    const isAdmin = normalizeRole(user?.role) === normalizeRole(UserRole.ADMIN);
    const isManager = normalizeRole(user?.role) === normalizeRole(UserRole.MANAGER);

    // Configuration for Admin (Full Access)
    const adminSections = [
        {

            items: [
                { icon: LayoutDashboard, label: ' Dashboard', path: ADMIN_HOME },
            ]
        },
        {
            title: 'DEMAND MANAGEMENT',
            items: [
                { icon: Target, label: 'New Demand', path: ADMIN_DEMAND },
                { icon: Activity, label: 'Production Lines', path: ADMIN_LINES },
                // { icon: Database, label: 'Car Models Assignment', path: ADMIN_ASSIGNMENTS },
                { icon: Mail, label: 'Order Requests', path: ADMIN_ORDERS },
                { icon: Target, label: 'New Registration Car Model', path: ADMIN_MODELS },
                { icon: Package, label: 'Inventory', path: ADMIN_INVENTORY },
            ]
        },
        {
            title: 'SYSTEM',
            items: [
                { icon: Users, label: 'User Accounts', path: ADMIN_USERS },
                { icon: Activity, label: 'System Audit', path: ADMIN_AUDIT },
            ]
        }
    ];

    // Configuration for Supervisor & Manager
    const supervisorNavigationItems = [
        {
            title: 'OVERSIGHT & VERIFICATION',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', path: SUPERVISOR_DASHBOARD },
                { icon: ClipboardCheck, label: 'Verify Daily Production', path: SUPERVISOR_VERIFY },
                { icon: Mail, label: 'Verify Shortage Requests', path: SUPERVISOR_SHORTAGE },
                // { icon: ClipboardList, label: 'Reports', path: SUPERVISOR_REPORTS },
                // { icon: Activity, label: 'Monitoring', path: SUPERVISOR_MONITORING },
                // { icon: Mail, label: 'Alerts', path: SUPERVISOR_ALERTS },
            ]
        }
    ];

    const managerSections = supervisorNavigationItems;
    const supervisorSections = supervisorNavigationItems;

    // Configuration for DEO
    const deoSections = [
        {
            title: 'OPERATOR CONSOLE',
            items: [
                { icon: Activity, label: 'Dashboard', path: DEO_DASHBOARD },
                // { icon: Database, label: 'My Assigned Models', path: DEO_MODELS },
                // { icon: ClipboardList, label: 'Production Entry', path: DEO_ENTRY },
                 { icon: Mail, label: 'Shortage Requests', path: DEO_SHORTAGE },
                // { icon: ClipboardCheck, label: 'Verification', path: DEO_VERIFY },
                // { icon: ClipboardList, label: 'Reports', path: DEO_REPORTS },
                // { icon: Mail, label: 'Notifications', path: DEO_NOTIFICATIONS },
            ]
        }
    ];

    // Select sections based on role
    const isSupervisor = normalizeRole(user?.role) === normalizeRole(UserRole.SUPERVISOR);
    const isDEO = normalizeRole(user?.role) === normalizeRole(UserRole.DEO);

    const sections = isAdmin ? adminSections :
        isManager ? managerSections :
            isSupervisor ? supervisorSections :
                isDEO ? deoSections : [];

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-ind-text/50 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-200"
                    onClick={onClose}
                />
            )}

            <div className={cn(
                "fixed inset-y-0 left-0 z-40 bg-ind-bg flex flex-col border-r border-ind-border/30 transition-transform duration-300 md:translate-x-0 md:static md:h-full shadow-2xl md:shadow-none",
                isOpen ? "translate-x-0" : "-translate-x-full",
                isCollapsed ? "w-24" : "w-72"
            )}>
                {/* CIE Branding - Large Box Style */}
                <div className=" relative">
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 p-2 text-ind-text/40 hover:text-ind-text md:hidden"
                    >
                        <X size={20} />
                    </button>

                    <div className={cn(
                        " flex items-center group transition-all duration-500 overflow-hidden relative bg-white h-14 p-2 px-4 border-b border-ind-border/50",
                        isCollapsed ? "justify-center px-0" : "justify-between"
                    )}>
                        {!isCollapsed && (
                            <img src={logoLps} alt="CIE" className="h-10 w-auto relative z-10 animate-in fade-in zoom-in-95 duration-500" />
                        )}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={cn(
                                "h-8 w-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-ind-border/20  transition-all duration-500 hover:bg-white hover:scale-110 active:scale-95 hidden md:flex shadow",
                                isCollapsed ? "" : "relative z-10"
                            )}
                        >
                            {isCollapsed ? <Menu size={18} className="text-black" /> : <ChevronLeft size={18} className="text-black" />}
                        </button>
                    </div>
                </div>

                {/* Navigation Sections */}
                <nav className="flex-1 px-4 py-2 space-y-3 overflow-y-auto pr-3 scrollbar-hide bg-white">
                    {sections.map((section: any, idx: number) => {
                        if (section.items.length === 0) return null;

                        return (
                            <div key={idx} className="space-y-2">
                                {!isCollapsed && (
                                    <h3 className="px-1 text-[10px] font-black text-ind-text/30 uppercase tracking-[0.2em] animate-in slide-in-from-left-2 duration-500">
                                        {section.title}
                                    </h3>
                                )}
                                <div className="space-y-1">
                                    {section.items.map((item: any) => {
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => onClose?.()}
                                                className={cn(
                                                    "flex items-center gap-4 px-4 py-2 rounded-xl transition-all duration-300 relative group overflow-hidden border-b border-ind-border/50",
                                                    isActive
                                                        ? "bg-ind-primary text-white font-bold"
                                                        : "text-ind-text2 hover:text-ind-text",
                                                    isCollapsed && "justify-center px-0"
                                                )}
                                            >
                                                <item.icon size={20} className={cn(
                                                    "transition-colors flex-shrink-0",
                                                    isActive ? "text-white" : "text-ind-text/30 group-hover:text-ind-primary"
                                                )} />
                                                {!isCollapsed && (
                                                    <span className="font-semibold text-[13px] tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-500">
                                                        {item.label}
                                                    </span>
                                                )}

                                                {/* Shine Effect on Active */}
                                                {isActive && (
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Footer / User Profile Card */}
                <div className="p-2 bg-white border-t border-ind-border/50">
                    <div className={cn(
                        "px-4 py-2 bg-white border border-ind-border/100 rounded-xl shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] flex items-center group transition-all duration-500",
                        isCollapsed ? "justify-center px-0" : "justify-between"
                    )}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {(user?.name || user?.username || 'A')?.[0]?.toUpperCase()}
                            </div>
                            {!isCollapsed && (
                                <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
                                    <span className="text-sm font-bold text-ind-text leading-none mb-1">{user?.name || user?.username || 'admin'}</span>
                                    <span className="text-[10px] font-semibold text-ind-primary uppercase tracking-widest">
                                        {user?.role?.toUpperCase() === 'MANAGER' ? 'SUPERVISOR' : (user?.role || 'ADMIN')}
                                    </span>
                                </div>
                            )}
                        </div>
                        {!isCollapsed && (
                            <button
                                onClick={handleLogout}
                                className="p-2 text-ind-text/20 hover:text-ind-text transition-colors animate-in fade-in duration-700"
                            >
                                <LogOut size={20} className="transform rotate-180" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
