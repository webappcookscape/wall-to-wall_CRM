import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Bell, 
  Users, 
  UserPlus, 
  ShoppingCart, 
  LayoutGrid, 
  TrendingUp, 
  XCircle,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  Edit3,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { leadService } from '../services/api';
import type { DashboardStats, Lead, MasterData } from '../types/crm';
import LeadModal from '../components/modals/LeadModal';
import UploadLeadModal from '../components/modals/UploadLeadModal';
import { useAuth } from '../contexts/AuthContext';
import { getRatingOption } from '../utils/rating';

const extractSiteLocation = (lead: any): string => {
  if (lead.siteLocation && String(lead.siteLocation).trim() !== '') {
    return String(lead.siteLocation).trim();
  }
  if (lead.comments) {
    const match = String(lead.comments).match(/Location:\s*([^|]+)/i);
    if (match && match[1]) return match[1].trim();
  }
  return '-';
};

const formatDate = (dateVal?: string | null): string => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateVal?: string | null): string => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true 
  });
};

const getStatusBadgeClass = (statusName?: string | null) => {
  const norm = String(statusName || '').trim().toLowerCase();
  if (norm.includes('fresh')) return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
  if (norm.includes('yet to follow')) return 'bg-amber-100 text-amber-900 border border-amber-300';
  if (norm.includes('follow-up') || norm.includes('follow up')) return 'bg-blue-100 text-blue-900 border border-blue-300';
  if (norm.includes('opportunity') || norm.includes('opportunities')) return 'bg-indigo-100 text-indigo-900 border border-indigo-300';
  if (norm.includes('order book')) return 'bg-teal-100 text-teal-900 border border-teal-300';
  if (norm.includes('disqualified')) return 'bg-rose-100 text-rose-900 border border-rose-300';
  return 'bg-gray-100 text-gray-800 border border-gray-300';
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Dashboard Stats State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Leads Table State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBrandId, setFilterBrandId] = useState('');
  const [filterStatusId, setFilterStatusId] = useState('');
  const [masters, setMasters] = useState<MasterData | null>(null);

  // Modals
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Roles that can add leads
  const canAddLead = useMemo(() => {
    const role = user?.role || '';
    return ['ADMIN', 'BUSINESS_HEAD', 'DM_EXECUTIVE', 'CLIENT_FACILITATOR', 'FA', 'CRE', 'DESIGNER'].includes(role);
  }, [user?.role]);

  // Fetch KPI Stats
  const fetchDashboardStats = async () => {
    setIsLoadingStats(true);
    setErrorMsg(null);
    try {
      const statsData = await leadService.getStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      setErrorMsg(error?.response?.data?.message || 'Unable to load dashboard stats.');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch Table Leads
  const fetchDashboardLeads = async (customPage?: number) => {
    setIsLoadingLeads(true);
    try {
      const p = customPage !== undefined ? customPage : page;
      const res = await leadService.getLeads({
        page: p,
        limit,
        search: searchTerm.trim() || undefined,
        brandId: filterBrandId || undefined,
        statusId: filterStatusId || undefined,
      });
      setLeads(res.data || []);
      setTotalLeads(res.total || 0);
    } catch (error) {
      console.error('Error fetching dashboard leads:', error);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  // Fetch Master Data
  const fetchMasterData = async () => {
    try {
      const m = await leadService.getMasters();
      setMasters(m);
    } catch (err) {
      console.error('Failed to load masters:', err);
    }
  };

  // Refresh everything
  const refreshAll = () => {
    fetchDashboardStats();
    fetchDashboardLeads(1);
    setPage(1);
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchDashboardLeads();
  }, [page, limit, filterBrandId, filterStatusId]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDashboardLeads(1);
  };

  const statTiles = [
    { label: 'Fresh Leads', value: stats?.freshlead ?? 0, icon: <LayoutGrid />, path: '/leadhub', color: 'border-emerald-500 text-emerald-700 bg-emerald-50/60' },
    { label: 'Yet To Follow-up', value: stats?.yettofollow ?? 0, icon: <Bell />, path: '/leads', color: 'border-amber-500 text-amber-700 bg-amber-50/60' },
    { label: 'Follow-ups', value: stats?.followup ?? 0, icon: <Users />, path: '/leads', color: 'border-blue-500 text-blue-700 bg-blue-50/60' },
    { label: 'Opportunities', value: stats?.opportunities ?? 0, icon: <TrendingUp />, path: '/leads', color: 'border-indigo-500 text-indigo-700 bg-indigo-50/60' },
    { label: 'Order Booked', value: stats?.orderbook ?? 0, icon: <ShoppingCart />, path: '/leads', color: 'border-teal-500 text-teal-700 bg-teal-50/60' },
    { label: 'Disqualified', value: stats?.disqualified ?? 0, icon: <XCircle />, path: '/leads', color: 'border-rose-500 text-rose-700 bg-rose-50/60' },
  ];

  const chartData = [
    { name: 'Total Leads', value: stats?.totalLeads || 0 },
    { name: 'Fresh Leads', value: stats?.freshlead || 0 },
    { name: 'Follow-ups', value: stats?.followup || 0 },
    { name: 'Opportunities', value: stats?.opportunities || 0 },
    { name: 'Orders Booked', value: stats?.orderbook || 0 },
  ];

  const totalPages = Math.ceil(totalLeads / limit) || 1;

  return (
    <div className="container-fluid py-6 px-4 md:px-8 space-y-8 bg-[#f8fafc] min-h-screen">
      {/* Top Banner & Greetings */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs md:text-sm font-black tracking-widest uppercase text-brand bg-brand/10 px-3 py-1 rounded-full border border-brand/20">
              {user?.role ? user.role.replace(/_/g, ' ') : 'CRM STAFF'}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight m-0">
            Welcome back, <span className="text-brand">{user?.fullName || 'Team Member'}</span>
          </h1>
          <p className="text-base md:text-lg font-semibold text-gray-500 m-0">
            Wall to Wall & Cookscape Centralized CRM System Dashboard
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button
            onClick={refreshAll}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm md:text-base font-extrabold px-5 py-3 rounded-xl transition-all shadow-sm active:scale-95"
            title="Refresh dashboard stats and table"
          >
            <RefreshCw size={18} className={isLoadingStats || isLoadingLeads ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canAddLead && (
            <>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm md:text-base font-extrabold px-5 py-3 rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95"
              >
                <FileSpreadsheet size={18} />
                <span>Upload Leads</span>
              </button>

              <button
                onClick={() => {
                  setEditingLead(null);
                  setIsLeadModalOpen(true);
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-brand hover:bg-[#004d30] text-white text-sm md:text-base font-extrabold px-6 py-3 rounded-xl transition-all shadow-md shadow-brand/20 active:scale-95"
              >
                <Plus size={20} />
                <span>Create Lead</span>
              </button>
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm md:text-base font-semibold">
          <AlertCircle size={20} className="text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Stats Grid - 2X Font Size */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight uppercase flex items-center gap-2 m-0">
            <TrendingUp className="text-brand" size={24} /> Key Performance Indicators
          </h2>
          <span className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider">
            Total System Leads: <strong className="text-gray-800 text-sm md:text-base">{stats?.totalLeads || totalLeads}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-5">
          {statTiles.map((tile, idx) => (
            <Link 
              key={idx} 
              to={tile.path}
              className={`rounded-2xl p-5 md:p-6 border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between ${tile.color}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs md:text-sm font-black uppercase tracking-wider">
                  {tile.label}
                </span>
                <div className="p-2 rounded-xl bg-white shadow-sm [&_svg]:w-5 [&_svg]:h-5 md:[&_svg]:w-6 md:[&_svg]:h-6">
                  {tile.icon}
                </div>
              </div>
              <div className="text-3xl md:text-5xl font-black tracking-tight mt-2">
                {isLoadingStats ? (
                  <div className="h-10 w-20 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  tile.value
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Auxiliary Metrics Bar: Reminders & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Reminders & Quick Insights */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <h3 className="text-lg md:text-xl font-black text-gray-800 m-0 flex items-center gap-2">
                <Bell className="text-amber-500" size={20} /> Urgent Reminders
              </h3>
              <span className="bg-rose-500 text-white text-xs md:text-sm font-black px-3 py-1 rounded-full">
                {stats?.remindersDue || 0} Due
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Clock className="text-amber-600 mt-1 shrink-0" size={20} />
                <div>
                  <h4 className="text-sm md:text-base font-bold text-gray-900 m-0">Daily Contact Follow-ups</h4>
                  <p className="text-xs md:text-sm text-gray-600 mt-1 m-0">
                    {stats?.remindersDue 
                      ? `${stats.remindersDue} leads are scheduled for contact follow-up today.`
                      : 'All scheduled follow-ups are up to date!'}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <UserPlus className="text-blue-600 mt-1 shrink-0" size={20} />
                <div>
                  <h4 className="text-sm md:text-base font-bold text-gray-900 m-0">Staff Assignment Queue</h4>
                  <p className="text-xs md:text-sm text-gray-600 mt-1 m-0">
                    CRE Leads: <strong className="text-gray-900 font-bold">{stats?.creleads ?? 0}</strong> • Designer Leads: <strong className="text-gray-900 font-bold">{stats?.designlead ?? 0}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4 flex justify-between items-center text-xs md:text-sm font-bold text-gray-500">
            <span>Live Sync Active</span>
            <Link to="/leads" className="text-brand hover:underline font-extrabold flex items-center gap-1">
              View Follow-ups <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        {/* Lead Activity Breakdown Chart */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <h3 className="text-lg md:text-xl font-black text-gray-800 m-0">
              Pipeline Conversion Overview
            </h3>
            <span className="text-xs md:text-sm font-bold text-gray-400 uppercase">Current Distribution</span>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#475569' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={44}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={['#10b981', '#0ea5e9', '#3b82f6', '#6366f1', '#14b8a6'][i % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DASHBOARD LEADS DATA TABLE (Requested Columns, 2X Font, Full Details) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Top Controls & Search Bar */}
        <div className="p-5 md:p-6 border-b border-gray-200 bg-gray-50/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900 m-0 tracking-tight flex items-center gap-2">
              <CheckCircle className="text-emerald-600" size={24} />
              Lead Records Directory
            </h2>
            <p className="text-xs md:text-sm font-bold text-gray-400 mt-1 m-0">
              Displaying all CRM leads with real-time contact and follow-up status
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, phone, email..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm md:text-base font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white shadow-inner transition-all"
              />
            </div>

            {/* Brand Filter */}
            <select
              value={filterBrandId}
              onChange={(e) => {
                setFilterBrandId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-gray-300 text-sm md:text-base font-bold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand transition-all"
            >
              <option value="">All Brands</option>
              {masters?.brands?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatusId}
              onChange={(e) => {
                setFilterStatusId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-gray-300 text-sm md:text-base font-bold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand transition-all"
            >
              <option value="">All Statuses</option>
              {masters?.statuses?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <button
              type="submit"
              className="bg-brand text-white text-sm md:text-base font-extrabold px-5 py-2.5 rounded-xl hover:bg-[#004d30] transition-colors shadow-sm"
            >
              Search
            </button>
          </form>
        </div>

        {/* The Table - Exactly matching user specifications */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-100/90 text-gray-700 border-b border-gray-200">
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider text-center w-16">S.no</th>
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider">Date Collected</th>
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider">Client Name</th>
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider">Mobile</th>
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider">Email</th>
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider">Brand</th>
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider">Project</th>
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider">Source</th>
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider">Status</th>
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider">Rating</th>
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider">Next Follow-up Date</th>
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider">Assigned Employee</th>
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider">Site Location</th>
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider">Instruction to Pass</th>
                <th className="py-4 px-4 text-xs md:text-sm font-black uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoadingLeads ? (
                <tr>
                  <td colSpan={15} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-base font-bold text-gray-500">Loading live leads directory...</span>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users size={40} className="text-gray-300" />
                      <h4 className="text-lg font-bold text-gray-700 m-0">No lead records found</h4>
                      <p className="text-sm text-gray-400 m-0">Try changing your filters or add a new lead to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead: any, idx: number) => {
                  const serialNumber = (page - 1) * limit + idx + 1;
                  const locationText = extractSiteLocation(lead);
                  const statusName = typeof lead.status === 'object' ? lead.status?.name : lead.status || lead.status_name || 'Fresh';
                  const brandName = lead.brand?.name || lead.brand_name || '-';
                  const projectName = lead.project?.name || '-';
                  const sourceName = lead.source?.name || '-';
                  const assignedName = lead.assignedTo?.fullName || (lead.assignedToId ? 'Assigned' : 'Unassigned');

                  return (
                    <tr 
                      key={lead.id} 
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* 1. S.no */}
                      <td className="py-4 px-4 text-center text-sm md:text-base font-black text-gray-500 font-mono">
                        #{serialNumber}
                      </td>

                      {/* 2. Date Collected */}
                      <td className="py-4 px-4 text-sm md:text-base font-bold text-gray-700 whitespace-nowrap">
                        {formatDate(lead.dataCollected || lead.createdAt)}
                      </td>

                      {/* 3. Client Name */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-brand/10 text-brand font-black text-sm flex items-center justify-center shrink-0">
                            {lead.name ? lead.name.charAt(0).toUpperCase() : 'L'}
                          </div>
                          <span className="text-base md:text-lg font-bold text-gray-900 group-hover:text-brand transition-colors">
                            {lead.name}
                          </span>
                        </div>
                      </td>

                      {/* 4. Mobile */}
                      <td className="py-4 px-4 text-sm md:text-base font-bold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <a 
                            href={`tel:${lead.phone}`}
                            className="text-brand hover:underline flex items-center gap-1 font-bold"
                            title="Call Phone"
                          >
                            <Phone size={14} className="text-gray-400" />
                            {lead.phone}
                          </a>
                          <a
                            href={`https://wa.me/${String(lead.phone).replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 p-1 rounded hover:bg-emerald-50 transition-colors"
                            title="Open WhatsApp chat"
                          >
                            <MessageCircle size={15} />
                          </a>
                        </div>
                      </td>

                      {/* 5. Email */}
                      <td className="py-4 px-4 text-xs md:text-sm font-semibold text-gray-600 whitespace-nowrap">
                        {lead.email ? (
                          <div className="flex items-center gap-1">
                            <Mail size={13} className="text-gray-400" />
                            <span>{lead.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 italic">—</span>
                        )}
                      </td>

                      {/* 6. Brand */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-block bg-gray-100 text-gray-800 border border-gray-200 text-xs md:text-sm font-extrabold px-2.5 py-1 rounded-md uppercase">
                          {brandName}
                        </span>
                      </td>

                      {/* 7. Project */}
                      <td className="py-4 px-4 text-xs md:text-sm font-bold text-gray-700 whitespace-nowrap">
                        {projectName}
                      </td>

                      {/* 8. Source */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 text-xs md:text-sm font-bold px-2.5 py-0.5 rounded-md">
                          {sourceName}
                        </span>
                      </td>

                      {/* 9. Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-block text-xs md:text-sm font-black px-3 py-1 rounded-full uppercase ${getStatusBadgeClass(statusName)}`}>
                          {statusName}
                        </span>
                      </td>

                      {/* 10. Rating */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {(() => {
                          const rOpt = getRatingOption(lead.rating, lead.ratingName);
                          return (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <div className="flex text-amber-500">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      size={14} 
                                      fill={i < (lead.rating || 0) ? 'currentColor' : 'none'} 
                                      className={i < (lead.rating || 0) ? 'text-amber-500' : 'text-gray-300'}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs md:text-sm font-bold text-gray-600">
                                  {lead.rating ? `${lead.rating}/5` : '0/5'}
                                </span>
                              </div>
                              {rOpt && (
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider w-fit ${rOpt.badgeBg} ${rOpt.textColor}`}>
                                  {rOpt.label}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 11. Next Follow-up Date (Fixed to display properly) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {lead.nextFollowUp ? (
                          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold">
                            <Calendar size={14} className="text-emerald-700" />
                            <span>{formatDateTime(lead.nextFollowUp)}</span>
                          </div>
                        ) : lead.contactableDate ? (
                          <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold">
                            <Clock size={14} className="text-amber-700" />
                            <span>{formatDateTime(lead.contactableDate)}</span>
                          </div>
                        ) : (
                          <span className="inline-block bg-gray-100 text-gray-500 text-xs md:text-sm font-bold px-2.5 py-1 rounded-md italic">
                            Not scheduled
                          </span>
                        )}
                      </td>

                      {/* 12. Assigned Employee */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm md:text-base font-bold text-gray-900">
                            {assignedName}
                          </span>
                          {lead.assignedTo?.role && (
                            <span className="text-[11px] font-extrabold text-brand uppercase">
                              {lead.assignedTo.role}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 13. Site Location */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm md:text-base font-bold text-gray-700">
                          {locationText !== '-' && <MapPin size={14} className="text-rose-500 shrink-0" />}
                          <span>{locationText}</span>
                        </div>
                      </td>

                      {/* 14. Instruction to Pass */}
                      <td className="py-4 px-4 max-w-xs">
                        {lead.instructionToPass ? (
                          <p className="text-xs md:text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2.5 m-0 leading-relaxed line-clamp-2" title={lead.instructionToPass}>
                            {lead.instructionToPass}
                          </p>
                        ) : (
                          <span className="text-gray-300 italic text-sm">—</span>
                        )}
                      </td>

                      {/* 15. Action */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLead(lead);
                            setIsLeadModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 bg-brand/10 hover:bg-brand text-brand hover:text-white text-xs md:text-sm font-black px-3.5 py-1.5 rounded-lg transition-colors"
                          title="Edit lead details"
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Bar */}
        <div className="p-4 md:p-5 border-t border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm md:text-base font-bold text-gray-600">
            <span>
              Showing {leads.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalLeads)} of {totalLeads} total records
            </span>
            <div className="hidden sm:flex items-center gap-2 ml-4">
              <span className="text-xs uppercase font-bold text-gray-400">Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded border border-gray-300 text-xs font-bold bg-white text-gray-700"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || isLoadingLeads}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} /> Prev
            </button>

            <span className="px-3 py-1.5 text-sm md:text-base font-black text-brand bg-brand/10 rounded-lg">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page >= totalPages || isLoadingLeads}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals Wired Directly to Dashboard */}
      {isLeadModalOpen && (
        <LeadModal
          isOpen={isLeadModalOpen}
          lead={editingLead}
          masters={masters}
          onClose={() => {
            setIsLeadModalOpen(false);
            setEditingLead(null);
          }}
          onSuccess={() => {
            refreshAll();
            setIsLeadModalOpen(false);
            setEditingLead(null);
          }}
        />
      )}

      {isUploadModalOpen && (
        <UploadLeadModal
          isOpen={isUploadModalOpen}
          masters={masters}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            refreshAll();
            setIsUploadModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
