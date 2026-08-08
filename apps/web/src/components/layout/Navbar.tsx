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
  ArrowRightLeft
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
            { title: 'Projects', path: '/master/project' },
            { title: 'Brands', path: '/master/brand' },
          ]
        },
        { title: 'SMS Templates', path: '/master/sms-template' },
        { title: 'Email Templates', path: '/master/email-template' },
      ]
    }] : []),
    { title: 'Lead Hub', path: '/leadhub', icon: <Users size={18} />, badge: stats?.totalLeads || undefined },
    { title: 'Leads', path: '/leads', icon: <User size={18} />, badge: stats?.totalLeads || undefined },
    { title: 'Reminders', path: '/reminders', icon: <Bell size={18} />, badge: stats?.remindersDue || undefined },
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
            <Link to="/reminders" className="relative cursor-pointer">
              <Bell size={22} className="text-gray-400" />
              <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold px-1.5 rounded-full border-2 border-white">
                {stats?.remindersDue || 0}
              </span>
            </Link>

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
              className="2xl:hidden p-2 text-gray-600"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Bar Custom */}
      <nav className="bg-[var(--color-dark)] hidden 2xl:block">
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
          <div className="ml-auto">
            <a 
              href="https://projects.orbixdesigns.com/" 
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
            className="fixed inset-0 bg-black/50 z-[90] 2xl:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-[280px] bg-[var(--color-dark)] z-[100] 2xl:hidden shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
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
                  href="https://projects.orbixdesigns.com/" 
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
