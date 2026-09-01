import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  User, 
  Bell, 
  Flag, 
  Settings,
  ChevronDown,
  Menu,
  X,
  ArrowRightLeft,
  Phone
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { leadService } from '../../services/api';
import type { DashboardStats } from '../../types/crm';

const primaryLogo = '/assets/logos/Wall-to-wall_logo.jpeg';

interface MenuItem {
  title: string;
  path: string;
  icon?: React.ReactNode;
  badge?: string | number;
  submenu?: MenuItem[];
}

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const location = useLocation();
  const { user, logout } = useAuth();
  const [lastSeenCount, setLastSeenCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('lastSeenLeadsCount') || '0', 10);
  });
  const [lastSeenRemindersCount, setLastSeenRemindersCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('lastSeenRemindersCount') || '0', 10);
  });
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [dueReminders, setDueReminders] = useState<any[]>([]);
  const [isRemindersLoading, setIsRemindersLoading] = useState(false);

  const unreadRemindersCount = (stats?.remindersDue !== undefined && stats.remindersDue > lastSeenRemindersCount) 
    ? stats.remindersDue - lastSeenRemindersCount 
    : 0;

  const markRemindersSeen = () => {
    if (stats?.remindersDue !== undefined) {
      localStorage.setItem('lastSeenRemindersCount', String(stats.remindersDue));
      setLastSeenRemindersCount(stats.remindersDue);
    }
  };

  const fetchDueReminders = async () => {
    setIsRemindersLoading(true);
    try {
      const res = await leadService.getLeads({ page: 1, limit: 5, timeframe: 'today' });
      setDueReminders(res.data || []);
    } catch (e) {
      console.error('Failed to fetch due reminders in navbar:', e);
    } finally {
      setIsRemindersLoading(false);
    }
  };

  const requestDesktopNotification = async () => {
    if (!('Notification' in window)) {
      alert('Desktop notifications are not supported in this browser.');
      return;
    }
    if (Notification.permission === 'granted') {
      new Notification('Wall to Wall CRM', {
        body: `You have ${stats?.remindersDue || 0} reminders scheduled for today!`,
        icon: '/assets/logos/Wall-to-wall_logo.jpeg'
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Wall to Wall CRM', {
          body: 'Desktop notifications enabled successfully!',
          icon: '/assets/logos/Wall-to-wall_logo.jpeg'
        });
      }
    }
  };

  useEffect(() => {
    if (location.pathname === '/leadhub' || location.pathname === '/leads') {
      if (stats?.totalLeads !== undefined) {
        localStorage.setItem('lastSeenLeadsCount', String(stats.totalLeads));
        setLastSeenCount(stats.totalLeads);
      }
    }
    if (location.pathname === '/reminders') {
      if (stats?.remindersDue !== undefined) {
        localStorage.setItem('lastSeenRemindersCount', String(stats.remindersDue));
        setLastSeenRemindersCount(stats.remindersDue);
      }
    }
  }, [location.pathname, stats?.totalLeads, stats?.remindersDue]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        const data = await leadService.getStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch navbar stats", err);
      }
    };
    
    fetchStats();
    // Poll every 30 seconds for real-time feel
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const toggleExpand = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const menuItems: MenuItem[] = [
    { title: 'Dashboard', path: '/', icon: <Home size={18} /> },
    ...(user?.role === 'ADMIN' ? [{ 
      title: 'Settings', 
      path: '#', 
      icon: <Settings size={18} />,
      submenu: [
        { title: 'User Management', path: '/users' },
        { title: 'Customer Management', path: '/customers' },
        { title: 'Signature Photos', path: '/signature-photos' },
        { 
          title: 'Master Data', 
          path: '#',
          submenu: [
            { title: 'Brands', path: '/master/brand' },
            { title: 'Projects', path: '/master/project' },
            { title: 'Showrooms', path: '/master/showroom' },
            { title: 'Lead Statuses', path: '/master/lead-status' },
            { title: 'Stages', path: '/master/stages' },
            { title: 'Sources', path: '/master/source' },
            { title: 'Lead Tags', path: '/master/lead-tag' },
            { title: 'Bank Details', path: '/master/bank-details' },
            { title: 'Split Ups', path: '/master/split-up' },
            { title: 'Activity Types', path: '/master/activity' },
            { title: 'Salutations', path: '/master/salutation' },
            { title: 'Scope of Work', path: '/master/scope-of-work' },
            { title: 'Vendor Sources', path: '/master/vendor-source' },
            { title: 'Payment Modes', path: '/master/payment-mode' },
            { title: 'Production Holds', path: '/master/production-hold' },
            { title: 'Work Notifications', path: '/master/work-notification' },
          ]
        },
        { title: 'SMS Templates', path: '/master/sms-template' },
        { title: 'Email Templates', path: '/master/email-template' },
      ]
    }] : []),
    { title: 'Lead Hub', path: '/leadhub', icon: <Users size={18} />, badge: (stats?.totalLeads && stats.totalLeads > lastSeenCount) ? stats.totalLeads - lastSeenCount : undefined },
    { title: 'Leads', path: '/leads', icon: <User size={18} />, badge: (stats?.totalLeads && stats.totalLeads > lastSeenCount) ? stats.totalLeads - lastSeenCount : undefined },
    { title: 'Reminders', path: '/reminders', icon: <Bell size={18} />, badge: unreadRemindersCount > 0 ? unreadRemindersCount : undefined },
    { title: 'Report', path: '/report', icon: <Flag size={18} /> },
  ];

  return (
    <header className="w-full">
      {/* Topbar Main */}
      <div className="bg-white border-b border-gray-100 h-[60px] md:h-[70px] flex items-center shadow-sm">
        <div className="w-full px-4 md:px-6 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="block">
            <img 
              src={primaryLogo}
              alt="Wall to Wall" 
              className="h-8 md:h-[50px] object-contain"
            />
          </Link>

          {/* Topbar Right */}
          <div className="flex items-center gap-6">
            {/* Notification & Reminder Hub */}
            <div className="relative">
              <button 
                onClick={() => {
                  const nextOpen = !isNotificationOpen;
                  setIsNotificationOpen(nextOpen);
                  if (nextOpen) {
                    fetchDueReminders();
                    markRemindersSeen();
                  }
                }}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-brand focus:outline-none"
                title="Notifications & Reminders"
              >
                <Bell size={22} className={unreadRemindersCount > 0 ? 'text-amber-500 animate-pulse' : 'text-gray-500'} />
                {unreadRemindersCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-danger text-white text-xs font-black px-1.5 py-0.2 rounded-full border-2 border-white min-w-[18px] text-center shadow-sm">
                    {unreadRemindersCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotificationOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsNotificationOpen(false)} 
                  />
                  <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200/80 z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-4 bg-[#313a46] text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell size={18} className="text-amber-400" />
                        <h4 className="text-sm font-black uppercase tracking-wide font-rubik m-0">Reminders & Alerts</h4>
                      </div>
                      <button 
                        onClick={markRemindersSeen}
                        className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase transition-colors"
                        title="Mark all reminders as seen"
                      >
                        {stats?.remindersDue || 0} Total · Mark Seen
                      </button>
                    </div>

                    <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                      {isRemindersLoading ? (
                        <div className="p-8 flex flex-col items-center justify-center gap-2">
                          <div className="w-6 h-6 border-2 border-brand border-t-transparent animate-spin rounded-full" />
                          <span className="text-xs font-bold text-gray-400 uppercase">Loading alerts...</span>
                        </div>
                      ) : dueReminders.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className="text-sm font-bold text-gray-700 m-0">🎉 All caught up!</p>
                          <p className="text-xs text-gray-400 mt-0.5">No overdue or pending reminders for today.</p>
                        </div>
                      ) : (
                        dueReminders.map((lead: any) => (
                          <div key={lead.id} className="p-3.5 hover:bg-gray-50 transition-colors flex items-start justify-between gap-3">
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h6 className="text-sm font-bold text-gray-800 truncate m-0 font-rubik">{lead.name}</h6>
                                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 uppercase">
                                  Due
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-brand m-0">{lead.phone}</p>
                              {lead.instructionToPass && (
                                <p className="text-xs text-gray-500 italic truncate m-0">{lead.instructionToPass}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <a 
                                href={`tel:${lead.phone}`} 
                                className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
                                title="Call Client"
                              >
                                <Phone size={14} />
                              </a>
                              <Link 
                                to="/reminders" 
                                onClick={() => setIsNotificationOpen(false)}
                                className="p-2 rounded-lg bg-blue-50 text-brand hover:bg-brand hover:text-white transition-colors"
                                title="Open Reminder"
                              >
                                <ArrowRightLeft size={14} />
                              </Link>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                      <button 
                        onClick={requestDesktopNotification}
                        className="text-xs font-bold text-gray-500 hover:text-brand transition-colors"
                      >
                        🔔 Enable Desktop Alerts
                      </button>
                      <Link 
                        to="/reminders" 
                        onClick={() => setIsNotificationOpen(false)}
                        className="text-xs font-extrabold text-brand hover:underline"
                      >
                        View All Schedule →
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile User Dropdown */}
            <div className="flex items-center gap-3 pl-6 border-l border-gray-100 group relative cursor-pointer py-2">
              <div className="w-9 h-9 rounded-full bg-brand text-white font-black text-sm flex items-center justify-center border-2 border-white shadow-sm font-rubik">
                {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                  {user?.fullName || user?.username || 'Staff User'} <ChevronDown size={14} className="text-gray-400" />
                </span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider -mt-0.5">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
              
              {/* Profile Dropdown */}
              <div className="absolute right-0 top-full mt-1 w-52 bg-white shadow-xl border border-gray-100 rounded-xl py-2 hidden group-hover:block z-50">
                <div className="px-4 py-2.5 border-b border-gray-100 mb-1">
                   <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-wider">Logged in as</p>
                   <p className="text-sm font-bold text-gray-800 truncate m-0">{user?.fullName || user?.username}</p>
                   <p className="text-xs text-brand font-semibold m-0">{user?.email}</p>
                </div>
                <Link to="/profile" className="block px-4 py-2 text-xs md:text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-brand">My Profile</Link>
                <Link to="/reminders" className="block px-4 py-2 text-xs md:text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-brand">My Reminders</Link>
                <button 
                  onClick={logout}
                  className="w-full text-left block px-4 py-2 text-xs md:text-sm font-bold text-danger hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 text-gray-600"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Bar Custom */}
      <nav className="bg-[var(--color-dark)] hidden xl:block">
        <div className="w-full px-4 md:px-6 flex items-center justify-between">
          <ul className="flex items-center">
            {menuItems.map((item, idx) => {
              if (item.title === 'Lead Hub' && user?.role !== 'ADMIN' && user?.role !== 'BUSINESS_HEAD') return null;
              return (
                <li key={idx} className="relative group">
                <Link 
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors border-b-2 border-transparent ${
                    location.pathname === item.path 
                      ? 'text-white border-white bg-white/5' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.icon}
                  <span>{item.title}</span>
                  {item.badge !== undefined ? (
                    <span className="ml-1 bg-[#f05050] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  ) : null}
                  {item.submenu && <ChevronDown size={14} className="ml-1 opacity-50" />}
                </Link>

                {item.submenu && (
                  <div className="absolute left-0 top-full min-w-[200px] bg-white shadow-xl rounded-b-md py-2 hidden group-hover:block z-[60] border border-gray-100">
                    {item.submenu.map((sub, sidx) => (
                      <div key={sidx} className="relative group/sub">
                        <Link 
                          to={sub.path}
                          className={`flex items-center justify-between px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand font-medium ${sub.submenu ? 'cursor-default' : ''}`}
                        >
                          {sub.title}
                          {sub.submenu && <ChevronDown size={14} className="-rotate-90 opacity-50" />}
                        </Link>
                        
                        {sub.submenu && (
                          <div className="absolute left-full top-0 min-w-[200px] bg-white shadow-xl rounded-md py-2 hidden group-hover/sub:block border border-gray-100 ml-0.5">
                            {sub.submenu.map((nested, nidx) => (
                              <Link 
                                key={nidx} 
                                to={nested.path}
                                className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand font-medium"
                              >
                                {nested.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </li>
              );
            })}
          </ul>
          
          {/* Switch to Project Button */}
          <div className="ml-auto">
            <a 
              href="https://projects.wall2wall.com/" 
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#FF512F] to-[#DD2476] text-white rounded-full font-bold text-sm transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,81,47,0.4)] active:scale-95"
            >
              <ArrowRightLeft size={16} />
              <span>Switch to Project</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[90] xl:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-[280px] bg-[var(--color-dark)] z-[100] xl:hidden shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="bg-white p-2 rounded-lg">
                <img 
                  src={primaryLogo}
                  alt="Wall to Wall" 
                  className="h-6 object-contain"
                />
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
              {menuItems.map((item, idx) => {
                if (item.title === 'Lead Hub' && user?.role !== 'ADMIN' && user?.role !== 'BUSINESS_HEAD') return null;
                const hasSubmenu = item.submenu && item.submenu.length > 0;
                const isExpanded = expandedItems.includes(item.title);
                
                return (
                  <div key={idx} className="px-2">
                    {hasSubmenu ? (
                      <div className="mb-1">
                        <button 
                          onClick={() => toggleExpand(item.title)}
                          className="w-full flex items-center justify-between px-4 py-3 text-gray-300 font-bold text-xs uppercase tracking-widest border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {item.icon}
                            <span>{item.title}</span>
                          </div>
                          <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isExpanded && (
                          <div className="pl-6 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                            {item.submenu?.map((sub, sidx) => {
                              const isSubExpanded = expandedItems.includes(sub.title);
                              return (
                                <div key={sidx}>
                                  {sub.submenu ? (
                                    <div className="py-1">
                                      <button 
                                        onClick={() => toggleExpand(sub.title)}
                                        className="w-full flex items-center justify-between px-4 py-2 text-[10px] text-gray-500 font-black uppercase tracking-widest hover:text-gray-300 transition-colors"
                                      >
                                        {sub.title}
                                        <ChevronDown size={12} className={`transition-transform duration-200 ${isSubExpanded ? 'rotate-180' : ''}`} />
                                      </button>
                                      
                                      {isSubExpanded && (
                                        <div className="pl-2 space-y-1 mt-1 border-l border-white/10 ml-4">
                                          {sub.submenu.map((nested, nidx) => (
                                            <Link 
                                              key={nidx}
                                              to={nested.path}
                                              onClick={() => setIsMobileMenuOpen(false)}
                                              className="flex items-center px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                              {nested.title}
                                            </Link>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <Link 
                                      to={sub.path}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="flex items-center px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                      {sub.title}
                                    </Link>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link 
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors mb-1 ${
                          location.pathname === item.path ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-gray-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span className="text-sm font-medium">{item.title}</span>
                        </div>
                        {item.badge !== undefined ? (
                          <span className="bg-[#f05050] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    )}
                  </div>
                );
              })}
              
              <div className="px-4 mt-6">
                <a 
                  href="https://projects.wall2wall.com/" 
                  className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-[#FF512F] to-[#DD2476] text-white rounded-xl font-bold text-sm shadow-xl"
                >
                  <ArrowRightLeft size={20} />
                  <span>SWITCH TO PROJECT</span>
                </a>
              </div>
            </div>
            <div className="p-4 border-t border-white/10 bg-black/20">
               <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-3 text-danger hover:text-red-300 text-sm font-bold uppercase tracking-widest"
               >
                 Logout
               </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default Navbar;
