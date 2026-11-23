import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    CalendarRange,
    BarChart3,
    Settings,
    LogOut,
    BookOpen,
    Sparkles,
    Menu,
    X,
    AlertTriangle,
    ArrowUpRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { useAnalytics } from "../services/useAnalytics.js";
import { DailyGoal, practiceListUrl } from "./DailyGoal.js";
import { Modal } from "./ui.js";
import { Brand } from "./Brand.js";

interface LayoutProps {
    children: React.ReactNode;
}

const dailyMessages = [
    "Look who it is! Your dedication is seriously impressive. Let's crush today's review!",
    "You're back! Every single day you show up is a day you get closer to your goals. Let's do this!",
    "Another day, another layer of knowledge. You are building an incredible habit. Welcome back!",
    "Your consistency is your superpower. Ready to keep that amazing momentum going today?",
    "Streak champion! You're making this look easy. Let's ace today's revision!",
    "Consistency pays off. Your future self is definitely thanking you for showing up today.",
    "Back at it again! Your brain is getting stronger with every single visit. Let's dive in.",
    "You are on fire! Coming here daily takes real discipline, and you're nailing it.",
    "Welcome back. Progress isn't about perfection; it's about showing up just like you did today.",
    "Glad to see you again! Take it one question at a time. You've got this.",
    "Small daily steps lead to massive results. Thank you for making us a part of your daily routine!",
    "Keep growing, day by day. You're doing amazing work just by being here.",
];

const getLocalDateKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getDailyMessageIndex = (dateKey: string) => {
    const dateNumber = Number(dateKey.replace(/-/g, ""));
    return dateNumber % dailyMessages.length;
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [dailyMessage, setDailyMessage] = useState<string | null>(null);
    const mainContent = useRef<HTMLElement>(null);

    useLayoutEffect(() => {
        if (mainContent.current) mainContent.current.scrollTop = 0;
    }, [location.pathname]);

    const { data: analytics, isError } = useAnalytics();

    const dueCount = analytics?.summary?.dueCount ?? 0;

    useEffect(() => {
        if (!user) {
            setDailyMessage(null);
            return;
        }

        const dateKey = getLocalDateKey();
        const storageKey = `daily-welcome:${user.id}`;

        if (localStorage.getItem(storageKey) === dateKey) {
            return;
        }

        localStorage.setItem(storageKey, dateKey);
        setDailyMessage(dailyMessages[getDailyMessageIndex(dateKey)]);
    }, [user]);

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
        { name: "Analytics", path: "/analytics", icon: BarChart3 },
        {
            name: "NeetCode 250",
            path: practiceListUrl,
            icon: BookOpen,
            external: true,
        },
        { name: "Settings", path: "/settings", icon: Settings },
    ];

    const menuToggle = useRef<HTMLButtonElement>(null);
    const menuClose = useRef<HTMLButtonElement>(null);
    const closeMenu = () => setMobileMenuOpen(false);

    useEffect(() => {
        if (!mobileMenuOpen) return;

        menuClose.current?.focus();
        const desktop = window.matchMedia('(min-width: 768px)');
        const onResize = () => {
            if (desktop.matches) closeMenu();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeMenu();
                requestAnimationFrame(() => menuToggle.current?.focus());
            }
        };
        desktop.addEventListener('change', onResize);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            desktop.removeEventListener('change', onResize);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [mobileMenuOpen]);

    const dismissMenu = () => {
        closeMenu();
        requestAnimationFrame(() => menuToggle.current?.focus());
    };

    return (
        <>
            <div className="app-shell">
                <header className="mobile-header" inert={mobileMenuOpen}>
                    <Brand onClick={closeMenu} />
                    <div className="flex items-center gap-2">
                        {dueCount > 0 && (
                            <Link to="/queue" className="badge" data-tone="medium">
                                <AlertTriangle aria-hidden="true" /> {dueCount} due
                            </Link>
                        )}
                        <button
                            ref={menuToggle}
                            type="button"
                            className="icon-button"
                            aria-label="Open navigation"
                            aria-expanded={mobileMenuOpen}
                            aria-controls="workspace-sidebar"
                            onClick={() => setMobileMenuOpen(true)}
                        >
                            <Menu aria-hidden="true" />
                        </button>
                    </div>
                </header>

                {mobileMenuOpen && <div className="mobile-backdrop" aria-hidden="true" onClick={dismissMenu} />}

                <aside id="workspace-sidebar" className="sidebar" data-open={mobileMenuOpen}>
                    <div className="sidebar-brand">
                        <Brand onClick={closeMenu} />
                        <button
                            ref={menuClose}
                            type="button"
                            className="icon-button mobile-close"
                            aria-label="Close navigation"
                            onClick={dismissMenu}
                        >
                            <X aria-hidden="true" />
                        </button>
                    </div>

                    <nav className="sidebar-nav" aria-label="Main navigation">
                        {navItems.map(({ name, path, icon: Icon, badge, external }) =>
                            external ? (
                                <a key={path} href={path} target="_blank" rel="noreferrer" onClick={dismissMenu} className="nav-item">
                                    <Icon aria-hidden="true" />
                                    <span className="truncate">{name}</span>
                                    <ArrowUpRight className="nav-external" aria-hidden="true" />
                                </a>
                            ) : (
                                <Link
                                    key={path}
                                    to={path}
                                    aria-current={location.pathname === path ? 'page' : undefined}
                                    onClick={closeMenu}
                                    className="nav-item"
                                >
                                    <Icon aria-hidden="true" />
                                    <span className="truncate">{name}</span>
                                    {badge !== undefined && (
                                        <span className="badge nav-count" data-tone="medium" aria-label={`${badge} due`}>{badge}</span>
                                    )}
                                </Link>
                            ),
                        )}
                    </nav>

                    <div className="sidebar-bottom">
                        <DailyGoal
                            solved={analytics?.summary.todaySolvedCount}
                            reviewed={analytics?.summary.todayRevisedCount}
                            unavailable={isError && !analytics}
                            onNavigate={closeMenu}
                        />

                        <blockquote className="sidebar-quote">
                            “Mastery isn’t grinding 10 new problems a day. It’s grinding 3 new problems and revising 3 old ones on time.”
                        </blockquote>

                        <div className="sidebar-account">
                            <div className="avatar" aria-hidden="true">{user?.name.charAt(0).toUpperCase()}</div>
                            <div className="grid min-w-0 gap-0.5">
                                <span className="truncate text-xs font-semibold">{user?.name}</span>
                                <span className="truncate text-[11px] text-muted" title={user?.email}>{user?.email}</span>
                            </div>
                        </div>
                        <button type="button" className="button button-ghost button-small sign-out" onClick={handleLogout}>
                            <LogOut aria-hidden="true" />
                            Sign Out
                        </button>
                    </div>
                </aside>

                <main ref={mainContent} className="app-main" inert={mobileMenuOpen}>
                    <div className="page-content">{children}</div>
                </main>
            </div>

            {dailyMessage && (
                <Modal onClose={() => setDailyMessage(null)} aria-labelledby="daily-welcome-title" aria-describedby="daily-welcome-description">
                    <div className="flex items-start gap-3">
                        <span className="section-icon"><Sparkles aria-hidden="true" /></span>
                        <div className="min-w-0 flex-1">
                            <h2 id="daily-welcome-title" className="panel-heading">Welcome back!</h2>
                            <p id="daily-welcome-description" className="mt-2 text-sm text-muted">{dailyMessage}</p>
                        </div>
                        <button type="button" className="icon-button -mr-1 -mt-1" aria-label="Close daily message" onClick={() => setDailyMessage(null)}>
                            <X aria-hidden="true" />
                        </button>
                    </div>
                    <button type="button" className="button button-primary mt-5 w-full" onClick={() => setDailyMessage(null)} autoFocus>
                        Start revising
                    </button>
                </Modal>
            )}
        </>
    );
};
