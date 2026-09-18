import React, { useState, useEffect, useRef } from 'react';
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
  Clock,
  Phone,
  CheckCircle2
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
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [reminderLeads, setReminderLeads] = useState<any[]>([]);
  const [isLoadingReminders, setIsLoadingReminders] = useState(false);
  const reminderDropdownRef = useRef<HTMLDivElement>(null);

  const remindersTotal = stats?.remindersDue || 0;
  const unreadReminders = Math.max(0, remindersTotal - lastSeenRemindersCount);

  // Close reminder dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reminderDropdownRef.current && !reminderDropdownRef.current.contains(e.target as Node)) {
        setIsReminderOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleToggleReminders = async () => {
    const nextState = !isReminderOpen;
    setIsReminderOpen(nextState);

    // Make the badge number disappear when opening reminders!
    if (stats?.remindersDue !== undefined) {
      localStorage.setItem('lastSeenRemindersCount', String(stats.remindersDue));
      setLastSeenRemindersCount(stats.remindersDue);
    }

    if (nextState) {
      setIsLoadingReminders(true);
      try {
        const res = await leadService.getLeads({
          page: 1,
          limit: 10,
          timeframe: 'today',
        });
        setReminderLeads(res.data || []);
      } catch (err) {
        console.error("Failed to load reminders for bell popover", err);
      } finally {
        setIsLoadingReminders(false);
      }
    }
  };

  const handleMarkAllRemindersRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stats?.remindersDue !== undefined) {
      localStorage.setItem('lastSeenRemindersCount', String(stats.remindersDue));
      setLastSeenRemindersCount(stats.remindersDue);
    }
  };

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
    { title: 'Reminders', path: '/reminders', icon: <Bell size={18} />, badge: unreadReminders > 0 ? unreadReminders : undefined },
    { title: 'Report', path: '/report', icon: <Flag size={18} /> },
  ];

  return (
    <header className="w-full">
      {/* Topbar Main */}
      <div className="bg-white border-b border-gray-100 h-[60px] md:h-[70px] flex items-center shadow-sm">
        <div className="container-fluid max-w-[1400px] mx-auto px-4 md:px-6 w-full flex justify-between items-center">
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
            {/* Reminders Bell with Notification Popover */}
            <div className="relative" ref={reminderDropdownRef}>
              <button 
                type="button"
                onClick={handleToggleReminders} 
                className="relative cursor-pointer p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none flex items-center justify-center"
                title="Lead Reminders & Follow-ups"
              >
                <Bell size={22} className={unreadReminders > 0 ? "text-[#006039]" : "text-gray-400"} />
                {unreadReminders > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full border-2 border-white shadow-sm animate-pulse">
                    {unreadReminders}
                  </span>
                )}
              </button>

              {/* Reminders Dropdown Popover */}
              {isReminderOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Popover Header */}
                  <div className="px-4 py-3 bg-[#006039] text-white flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-white" />
                      <span className="text-xs font-bold uppercase tracking-wider">Follow-up Reminders</span>
                      <span className="text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full text-white">
                        {remindersTotal} due
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleMarkAllRemindersRead}
                      className="text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors"
                      title="Clear badge count"
                    >
                      Mark read
                    </button>
                  </div>

                  {/* Popover List */}
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
                    {isLoadingReminders ? (
                      <div className="py-10 text-center text-gray-400 space-y-2">
                        <div className="w-5 h-5 border-2 border-[#006039] border-t-transparent animate-spin rounded-full mx-auto" />
                        <p className="text-[11px] font-medium">Checking due reminders...</p>
                      </div>
                    ) : reminderLeads.length === 0 ? (
                      <div className="py-8 px-4 text-center">
                        <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2 opacity-80" />
                        <p className="text-xs font-bold text-gray-700">No overdue or pending reminders!</p>
                        <p className="text-[10px] text-gray-400 mt-1">All scheduled lead follow-ups are up to date.</p>
                      </div>
                    ) : (
                      reminderLeads.map((lead: any) => {
                        const isOverdue = lead.contactableDate && new Date(lead.contactableDate).getTime() < new Date().setHours(0, 0, 0, 0);
                        return (
                          <div 
                            key={lead.id} 
                            className="p-3 hover:bg-gray-50 transition-colors flex flex-col gap-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <Link 
                                  to="/reminders" 
                                  onClick={() => setIsReminderOpen(false)} 
                                  className="text-xs font-bold text-gray-800 hover:text-[#006039] line-clamp-1"
                                >
                                  {lead.name}
                                </Link>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <a 
                                    href={`tel:${lead.phone}`} 
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006039] hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone size={10} /> {lead.phone}
                                  </a>
                                  {lead.assignedTo?.fullName && (
                                    <span className="text-[9px] font-medium text-gray-400">
                                      • {lead.assignedTo.fullName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${
                                isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isOverdue ? 'Overdue' : 'Due Today'}
                              </span>
                            </div>

                            {lead.contactableDate && (
                              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                <Clock size={10} className="text-amber-600" />
                                <span>{new Date(lead.contactableDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(lead.contactableDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                              </div>
                            )}

                            {(lead.instructionToPass || lead.requirement) && (
                              <p className="text-[10px] text-gray-500 line-clamp-1 italic bg-gray-50/80 px-2 py-0.5 rounded border border-gray-100/60 m-0">
                                {lead.instructionToPass || lead.requirement}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Popover Footer */}
                  <Link
                    to="/reminders"
                    onClick={() => setIsReminderOpen(false)}
                    className="block text-center py-2.5 bg-gray-50 hover:bg-gray-100 text-[11px] font-bold text-[#006039] uppercase tracking-wider border-t border-gray-100 transition-colors"
                  >
                    View All Leads Reminders Timeline →
                  </Link>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pl-6 border-l border-gray-100 group relative cursor-pointer py-2">
              <img 
                src="https://crm.cookscape.com/global/assets/images/users/avatar-1.jpg" 
                alt="user" 
                className="w-8 h-8 rounded-full border border-gray-200" 
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                  {user?.fullName || 'admin user!'} <ChevronDown size={14} className="text-gray-400" />
                </span>
              </div>
              
              {/* Profile Dropdown */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-white shadow-lg border border-gray-100 rounded-md py-2 hidden group-hover:block z-50">
                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                   <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Welcome!</p>
                   <p className="text-sm font-bold text-gray-700 truncate">{user?.fullName || 'admin user!'}</p>
                </div>
                <Link to="/profile" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand">My Profile</Link>
                <button 
                  onClick={logout}
                  className="w-full text-left block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-danger"
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
        <div className="container-fluid max-w-[1400px] mx-auto px-6 flex items-center justify-between">
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
          {/* <div className="ml-auto">
            <a 
              href="https://projects.orbixdesigns.com/" 
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#FF512F] to-[#DD2476] text-white rounded-full font-bold text-sm transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,81,47,0.4)] active:scale-95"
            >
              <ArrowRightLeft size={16} />
              <span>Switch to Project</span>
            </a>
          </div> */}
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
              
              {/* <div className="px-4 mt-6">
                <a 
                  href="https://projects.orbixdesigns.com/" 
                  className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-[#FF512F] to-[#DD2476] text-white rounded-xl font-bold text-sm shadow-xl"
                >
                  <ArrowRightLeft size={20} />
                  <span>SWITCH TO PROJECT</span>
                </a>
              </div> */}
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
