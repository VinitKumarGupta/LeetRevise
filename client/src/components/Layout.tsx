import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    CalendarRange,
    RefreshCw,
    BarChart3,
    Settings,
    LogOut,
    Code2,
    Menu,
    X,
    AlertTriangle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import api from "../services/api.js";

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [dueCount, setDueCount] = useState(0);

    const fetchCounts = async () => {
        try {
            const analyticsRes = await api.get("/analytics");
            setDueCount(analyticsRes.data?.summary?.dueCount || 0);
        } catch (err) {
            console.error("Failed to fetch due revision counts:", err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchCounts();
            const interval = setInterval(fetchCounts, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [user, location.pathname]);

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const navItems = [
        { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        {
            name: "Revision Queue",
            path: "/queue",
            icon: CalendarRange,
            badge: dueCount > 0 ? dueCount : undefined,
        },
        { name: "Sync LeetCode", path: "/sync", icon: RefreshCw },
        { name: "Analytics", path: "/analytics", icon: BarChart3 },
        { name: "Settings", path: "/settings", icon: Settings },
    ];

    return (
        <div className="h-[100dvh] w-full flex flex-col md:flex-row bg-bg-dark text-gray-100 overflow-hidden overscroll-none">
            {/* Mobile Top Navbar */}
            <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card-dark/90 backdrop-blur-md border-b border-border-dark/80 sticky top-0 z-50 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-md shadow-indigo-600/30">
                        <Code2 className="w-5 h-5" />
                    </div>
                    <span className="font-display font-bold text-lg bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        LeetRevise
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {dueCount > 0 && (
                        <Link
                            to="/queue"
                            className="text-amber-400 p-1 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-1 text-xs font-semibold px-2 py-1"
                            title="Revisions due today!"
                        >
                            <AlertTriangle className="w-4 h-4 animate-pulse text-amber-500" />
                            <span>{dueCount} Due</span>
                        </Link>
                    )}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 text-gray-300 hover:text-white rounded-xl bg-gray-900/60 border border-border-dark/60 active:scale-95 transition-all"
                        aria-label="Toggle Navigation Menu"
                    >
                        {mobileMenuOpen ? (
                            <X className="w-5 h-5" />
                        ) : (
                            <Menu className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </header>

            {/* Mobile Sidebar Backdrop Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden animate-fade-in"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside
                className={`
        fixed inset-y-0 left-0 z-50 w-72 md:w-64 md:shrink-0 bg-card-dark/98 border-r border-border-dark/60 p-6 flex flex-col justify-between transition-transform duration-300 transform overflow-y-auto
        md:translate-x-0 md:static md:h-full
        ${mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
      `}
            >
                <div className="flex flex-col gap-6">
                    {/* Logo */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/30">
                                <Code2 className="w-6 h-6" />
                            </div>
                            <span className="font-display font-extrabold text-xl bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
                                LeetRevise
                            </span>
                        </div>
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="md:hidden p-1.5 text-gray-400 hover:text-white rounded-lg"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex flex-col gap-1.5 mt-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`
                    flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 group active:scale-98
                    ${
                        isActive
                            ? "bg-indigo-600/20 text-indigo-300 border-l-4 border-indigo-500 font-semibold shadow-sm"
                            : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                    }
                  `}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Icon
                                            className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isActive ? "text-indigo-400" : "group-hover:scale-110"}`}
                                        />
                                        <span className="text-sm font-medium whitespace-nowrap truncate">
                                            {item.name}
                                        </span>
                                    </div>
                                    {item.badge !== undefined && (
                                        <span
                                            className={`
                      text-xs font-extrabold px-2 py-0.5 rounded-full shrink-0 ml-2 shadow-sm
                      ${item.name === "Revision Queue" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-indigo-600 text-white"}
                    `}
                                        >
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex flex-col gap-4 border-t border-border-dark/60 pt-6 mt-6">
                    <div className="mb-2 rounded-xl border border-border-dark/40 bg-gray-900/20 px-3 py-3">
                        <p className="text-[11px] leading-relaxed italic text-gray-500/80 tracking-wide">
                            “Mastery isn’t grinding 10 new problems a day; it’s
                            grinding 3 new problems and revising 3 old ones on
                            time.”
                        </p>
                    </div>

                    {/* User Card & Logout */}
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-900/40 border border-border-dark/40">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-display font-bold text-white shadow-md text-sm shrink-0">
                            {user?.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-bold truncate text-gray-200">
                                {user?.name}
                            </span>
                            <span className="text-[11px] text-gray-400 truncate">
                                {user?.email}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:bg-rose-500/10 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all w-full"
                    >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 overscroll-contain">
                <div className="max-w-6xl mx-auto animate-fade-in pb-12">
                    {dueCount > 0 && location.pathname !== "/queue" && (
                        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-300 shadow-md">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse text-amber-400" />
                                <span className="text-xs sm:text-sm font-medium">
                                    You have <strong>{dueCount}</strong>{" "}
                                    LeetCode problem(s) due for spaced
                                    repetition today!
                                </span>
                            </div>
                            <Link
                                to="/queue"
                                className="text-xs bg-amber-500 hover:bg-amber-400 text-bg-dark font-bold px-3.5 py-2 rounded-xl transition-all text-center shrink-0 active:scale-95 shadow-sm"
                            >
                                Revise Now
                            </Link>
                        </div>
                    )}
                    {children}
                </div>
            </main>
        </div>
    );
};
