import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarRange, 
  RefreshCw, 
  BarChart3, 
  Bell, 
  Settings, 
  LogOut, 
  BookOpen, 
  Menu, 
  X,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [dueCount, setDueCount] = useState(0);

  // Fetch unread notifications count and due revisions
  const fetchCounts = async () => {
    try {
      const notifRes = await api.get('/notifications');
      const unread = notifRes.data?.notifications?.filter((n: any) => !n.isRead).length || 0;
      setUnreadNotifications(unread);

      // Check due revisions
      const checkRes = await api.post('/notifications/check-due');
      setDueCount(checkRes.data?.dueCount || 0);
    } catch (err) {
      console.error('Failed to fetch navbar counts:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCounts();
      // Poll every 5 minutes
      const interval = setInterval(fetchCounts, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { 
      name: 'Revision Queue', 
      path: '/queue', 
      icon: CalendarRange,
      badge: dueCount > 0 ? dueCount : undefined 
    },
    { name: 'Sync LeetCode', path: '/sync', icon: RefreshCw },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { 
      name: 'Notifications', 
      path: '/notifications', 
      icon: Bell,
      badge: unreadNotifications > 0 ? unreadNotifications : undefined
    },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg-dark text-gray-100">
      {/* Mobile Top Navbar */}
      <header className="md:hidden flex items-center justify-between p-4 bg-card-dark/80 backdrop-blur-md border-b border-border-dark sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            LeetRevise
          </span>
        </div>
        <div className="flex items-center gap-4">
          {dueCount > 0 && (
            <Link to="/queue" className="text-amber-500 relative" title="Revisions due!">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </Link>
          )}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 text-gray-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-card-dark/95 border-r border-border-dark/60 p-6 flex flex-col justify-between transition-transform duration-300 transform
        md:translate-x-0 md:static md:h-screen
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="hidden md:flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="font-display font-extrabold text-xl bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
              LeetRevise
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
                    ${isActive 
                      ? 'bg-indigo-600/20 text-indigo-300 border-l-4 border-indigo-500 font-medium' 
                      : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-200'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-indigo-400' : 'group-hover:scale-110'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className={`
                      text-xs font-bold px-2 py-0.5 rounded-full
                      ${item.name === 'Revision Queue' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-indigo-600 text-white'}
                    `}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="flex flex-col gap-4 border-t border-border-dark/60 pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-display font-bold text-white shadow-md">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate text-gray-200">{user?.name}</span>
              <span className="text-xs text-gray-500 truncate">{user?.email}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto max-h-[calc(100vh-60px)] md:max-h-screen p-6 md:p-10">
        <div className="max-w-6xl mx-auto animate-fade-in">
          {dueCount > 0 && location.pathname !== '/queue' && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-amber-300">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 animate-pulse text-amber-500" />
                <span>You have <strong>{dueCount}</strong> LeetCode problem(s) due for spaced repetition today!</span>
              </div>
              <Link 
                to="/queue" 
                className="text-xs bg-amber-500 hover:bg-amber-600 text-bg-dark font-semibold px-3 py-1.5 rounded-lg transition-colors"
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
