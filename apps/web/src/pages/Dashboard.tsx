import React, { useEffect, useState, useCallback } from 'react';
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
  CheckCircle2, 
  Phone, 
  ArrowRight, 
  RefreshCw, 
  Award 
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
import type { DashboardStats, MasterData } from '../types/crm';
import LeadModal from '../components/modals/LeadModal';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [masters, setMasters] = useState<MasterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filters
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('all');
  const [employeeSearch, setEmployeeSearch] = useState<string>('');

  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'BUSINESS_HEAD';

  const fetchMasters = async () => {
    try {
      const data = await leadService.getMasters();
      setMasters(data);
    } catch (err) {
      console.error('Error fetching masters for dashboard:', err);
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const statsData = await leadService.getStats({
        userId: selectedUserId || undefined,
        timeframe: timeframe !== 'all' ? timeframe : undefined
      });
      setStats(statsData);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setStats(null);
      setErrorMsg(error?.response?.data?.message || 'Unable to load dashboard data right now.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedUserId, timeframe]);

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectEmployee = (empId: string) => {
    setSelectedUserId(empId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'BUSINESS_HEAD': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'DESIGNER': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'CRE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DM_EXECUTIVE': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrator';
      case 'BUSINESS_HEAD': return 'Business Head';
      case 'DESIGNER': return 'Interior Designer';
      case 'CRE': return 'Customer Relationship Exec';
      case 'DM_EXECUTIVE': return 'DM Executive';
      default: return role;
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Loading Dashboard Data...</p>
      </div>
    );
  }

  if (errorMsg && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="max-w-md rounded-2xl border border-red-100 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-sm font-bold text-red-700">{errorMsg}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-xl bg-brand px-6 py-2 text-[11px] font-bold uppercase text-white hover:bg-[#004d30] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statTiles = [
    { label: 'Fresh Leads', value: stats?.freshlead || 0, icon: <LayoutGrid />, path: '/leadhub', color: 'from-blue-500/10 to-transparent' },
    { label: 'Yet To Follow-up', value: stats?.yettofollow || 0, icon: <Bell />, path: '/leads', color: 'from-amber-500/10 to-transparent' },
    { label: 'In Follow-ups', value: stats?.followup || 0, icon: <Users />, path: '/leads', color: 'from-indigo-500/10 to-transparent' },
    { label: 'Opportunities', value: stats?.opportunities || 0, icon: <TrendingUp />, path: '/leads', color: 'from-cyan-500/10 to-transparent' },
    { label: 'Order Booked', value: stats?.orderbook || 0, icon: <ShoppingCart />, path: '/leads', color: 'from-emerald-500/10 to-transparent' },
    { label: 'Disqualified', value: stats?.disqualified || 0, icon: <XCircle />, path: '/leads', color: 'from-rose-500/10 to-transparent' },
  ];

  const chartData = [
    { name: 'Fresh', value: stats?.freshlead || 0, fill: '#3b82f6' },
    { name: 'Yet To Follow', value: stats?.yettofollow || 0, fill: '#f59e0b' },
    { name: 'Follow-ups', value: stats?.followup || 0, fill: '#6366f1' },
    { name: 'Opportunities', value: stats?.opportunities || 0, fill: '#06b6d4' },
    { name: 'Order Booked', value: stats?.orderbook || 0, fill: '#10b981' },
    { name: 'Disqualified', value: stats?.disqualified || 0, fill: '#f43f5e' }
  ];

  const filteredEmployees = (stats?.employeeBreakdown || []).filter(emp => 
    emp.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.email.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.role.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const activeEmployeeObj = masters?.users.find(u => u.id === selectedUserId);

  return (
    <div className="container-fluid py-4 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-2xl font-bold text-gray-800 tracking-tight">
              {selectedUserId && activeEmployeeObj 
                ? `${activeEmployeeObj.fullName}'s Dashboard`
                : (isManagerOrAdmin ? 'Executive Dashboard' : 'My Workspace Dashboard')}
            </h4>
            {selectedUserId && activeEmployeeObj ? (
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeClass(activeEmployeeObj.role || '')}`}>
                {formatRoleLabel(activeEmployeeObj.role || '')}
              </span>
            ) : (
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeClass(user?.role || '')}`}>
                {formatRoleLabel(user?.role || '')}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 font-medium">
            {selectedUserId && activeEmployeeObj
              ? `Viewing live pipeline metrics and activity for employee ${activeEmployeeObj.fullName}`
              : isManagerOrAdmin 
                ? 'Overview of team pipeline, performance metrics, and lead conversions.'
                : `Welcome back, ${user?.fullName}! Here is your current pipeline status.`}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Employee Filter (Admin & Business Head) */}
          {isManagerOrAdmin && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-brand/10 focus-within:border-brand transition-all">
              <Users size={14} className="text-gray-400 shrink-0" />
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer pr-2"
              >
                <option value="">🏢 All Team Members</option>
                {masters?.users?.map(u => (
                  <option key={u.id} value={u.id}>
                    👤 {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Timeframe Selector */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'Week' },
              { id: 'this_month', label: 'Month' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  timeframe === t.id 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {['ADMIN', 'DM_EXECUTIVE', 'BUSINESS_HEAD', 'DESIGNER'].includes(user?.role || '') && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-custom !rounded-xl !px-4 !py-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-brand/10"
            >
              <Plus size={15} /> Create Lead
            </button>
          )}
        </div>
      </div>

      {/* Selected Employee Filter Alert */}
      {selectedUserId && activeEmployeeObj && (
        <div className="bg-brand/5 border border-brand/20 p-3.5 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs">
              {activeEmployeeObj.fullName.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">
                Filtered view: <span className="text-brand">{activeEmployeeObj.fullName}</span> ({formatRoleLabel(activeEmployeeObj.role || '')})
              </p>
              <p className="text-[10px] text-gray-500">
                Displaying only leads and tasks assigned directly to this team member.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedUserId('')}
            className="text-[11px] font-bold text-brand hover:underline px-3 py-1 rounded-lg hover:bg-brand/10 transition-colors"
          >
            Clear Employee Filter
          </button>
        </div>
      )}

      {/* Primary Status Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {statTiles.map((tile, idx) => (
          <Link 
            key={idx} 
            to={tile.path}
            className="group relative bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-lg hover:border-gray-200 transition-all duration-200 overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-gray-600 transition-colors">
                {tile.label}
              </span>
              <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-brand group-hover:bg-brand/10 transition-all [&_svg]:w-4 [&_svg]:h-4">
                {tile.icon}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                {tile.value.toLocaleString()}
              </h2>
            </div>
          </Link>
        ))}
      </div>

      {/* Secondary Role Counts & Reminders Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reminders Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <Bell size={15} />
              </div>
              <h5 className="font-bold text-sm text-gray-800 m-0">Pending Reminders</h5>
            </div>
            <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-100">
              {stats?.remindersDue || 0} Due
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-between">
            {stats?.upcomingReminders && stats.upcomingReminders.length > 0 ? (
              <div className="space-y-2.5">
                {stats.upcomingReminders.map(rem => (
                  <div 
                    key={rem.id} 
                    className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 transition-colors border border-gray-100 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-800 truncate">{rem.name}</span>
                        <span className="text-[9px] font-bold text-gray-400">#CUST-{rem.leadId}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1 text-brand font-medium">
                          <Phone size={10} /> {rem.phone}
                        </span>
                        {rem.project?.name && (
                          <span className="truncate text-gray-400">• {rem.project.name}</span>
                        )}
                      </div>
                    </div>
                    {rem.contactableDate && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 shrink-0">
                        {new Date(rem.contactableDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center text-gray-400 gap-2">
                <CheckCircle2 size={32} className="text-emerald-400 opacity-60" />
                <p className="text-xs font-medium">All reminders are up to date</p>
              </div>
            )}

            <Link 
              to="/reminders" 
              className="mt-4 pt-3 border-t border-gray-50 text-[11px] font-bold text-brand hover:text-[#004d30] flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider"
            >
              Open Reminders Hub <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Pipeline & Assignment Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserPlus size={15} />
              </div>
              <h5 className="font-bold text-sm text-gray-800 m-0">Team Lead Allocations</h5>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Queue</span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Assigned to CRE Queue', value: stats?.creleads || 0, role: 'CRE', color: 'bg-blue-500' },
              { label: 'Assigned to Interior Designers', value: stats?.designlead || 0, role: 'DESIGNER', color: 'bg-emerald-500' },
              { label: 'Feasibility & Estimation Desk', value: stats?.fealeads || 0, role: 'FEASIBILITY', color: 'bg-indigo-500' },
              { label: 'Design Completed / Approved', value: stats?.designCompleted || 0, role: 'COMPLETED', color: 'bg-purple-500' },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-700">{item.label}</p>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{item.role}</span>
                </div>
                <span className="text-lg font-black text-gray-800">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Activity Funnel Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={15} />
              </div>
              <h5 className="font-bold text-sm text-gray-800 m-0">Pipeline Stage Distribution</h5>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Total: {stats?.totalLeads || 0}
            </span>
          </div>

          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94a3b8' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 600 }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={28}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 flex justify-between items-center text-[10px] text-gray-400 font-bold border-t border-gray-50">
            <span>Stage conversion breakdown</span>
            <span className="text-emerald-600">
              {stats?.totalLeads && stats?.orderbook 
                ? `${((stats.orderbook / stats.totalLeads) * 100).toFixed(1)}% Conversion` 
                : '0.0% Conversion'}
            </span>
          </div>
        </div>
      </div>

      {/* Employee Performance Leaderboard (for Admin & Business Head) */}
      {isManagerOrAdmin && stats?.employeeBreakdown && stats.employeeBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Award size={18} className="text-brand" />
                <h5 className="font-bold text-base text-gray-800 m-0">Employee Performance Breakdown</h5>
              </div>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Lead allocation, active follow-ups, and conversion metrics per team member.
              </p>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search employee by name/role..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-center">Assigned Leads</th>
                  <th className="py-3 px-3 text-center">Yet To Follow</th>
                  <th className="py-3 px-3 text-center">In Follow-up</th>
                  <th className="py-3 px-3 text-center">Opportunities</th>
                  <th className="py-3 px-3 text-center">Won (Booked)</th>
                  <th className="py-3 px-3 text-center">Conversion</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedUserId === emp.id;
                  return (
                    <tr 
                      key={emp.id} 
                      className={`hover:bg-gray-50/70 transition-colors ${isSelected ? 'bg-brand/5' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand to-emerald-400 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {emp.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 text-xs truncate">{emp.fullName}</p>
                            <p className="text-[10px] text-gray-400 truncate">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeClass(emp.role)}`}>
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-gray-700">
                        {emp.totalAssigned}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`font-bold ${emp.yettofollow > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {emp.yettofollow}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-indigo-600">
                        {emp.followup}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-cyan-600">
                        {emp.opportunities}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-100 text-[11px]">
                          {emp.orderbook}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-bold text-gray-700">{emp.conversionRate}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleSelectEmployee(isSelected ? '' : emp.id)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg transition-all ${
                            isSelected 
                              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              : 'bg-brand/10 text-brand hover:bg-brand hover:text-white'
                          }`}
                        >
                          {isSelected ? 'Reset View' : 'View Stats'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lead Creation Modal */}
      <LeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          fetchData();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};

export default Dashboard;
