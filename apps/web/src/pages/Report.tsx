import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Download, 
  Calendar, 
  Activity, 
  Clock, 
  User, 
  ArrowRight,
  BarChart2,
  Table,
  FileSpreadsheet,
  Users
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { leadService, reportService } from '../services/api';
import type { DashboardStats, MasterData } from '../types/crm';

type ReportActivity = {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  lead?: {
    id: string;
    name: string;
    status?: { name: string };
  };
  user?: {
    fullName: string;
  };
};

type PerformanceRow = {
  userId: string;
  name: string;
  role: string;
  calls: number;
  upToDay: { '5': number, '6': number, '7': number, '8': number, '9': number, total: number };
  thisWeek: { '5': number, '6': number, '7': number, '8': number, '9': number, total: number };
  prp: number;
  msmt: number;
  orders: number;
};

type LeadsMasterRow = {
  id: string;
  baseDate: string;
  baseSource: string;
  date: string;
  assignTo: string;
  clientName: string;
  phNo1: string;
  dNo: number;
  project: string;
  emailId: string;
  phNo2: string;
  feedBack: string;
  rating: number;
  brand: string;
  tag: string;
  designOwner: string;
  instructionPass: string;
  cpCode: string;
  status: string;
};

const Report: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'performance' | 'activities' | 'leadsMaster'>('performance');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ReportActivity[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceRow[]>([]);
  const [leadsMasterData, setLeadsMasterData] = useState<LeadsMasterRow[]>([]);
  const [masters, setMasters] = useState<MasterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    activity_type: '',
    lead_status_id: ''
  });

  const fetchData = useCallback(async (searchFilters = {}) => {
    setIsSearching(true);
    try {
      const [statsData, activitiesData, mastersData, perfData, leadsData] = await Promise.all([
        leadService.getStats(),
        leadService.getActivities(searchFilters),
        leadService.getMasters(),
        reportService.getUserPerformance(),
        reportService.getLeadsMaster()
      ]);
      setStats(statsData);
      setActivities(activitiesData);
      setMasters(mastersData);
      setPerformanceData(perfData);
      setLeadsMasterData(leadsData);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(filters);
  };

  const handleExportPerformanceExcel = () => {
    if (performanceData.length === 0) return;

    const wb = XLSX.utils.book_new();

    const headers = [
      ["FR/CRE", "CALLS", "UPTODAY", "", "", "", "", "", "THIS WEEK", "", "", "", "", "", "PRP", "MSMT", "ORDERS"],
      ["", "", "5", "6", "7", "8", "9", "TOTAL", "5", "6", "7", "8", "9", "TOTAL", "", "", ""]
    ];

    const rows = performanceData.map(item => [
      item.name,
      item.calls,
      item.upToDay['5'], item.upToDay['6'], item.upToDay['7'], item.upToDay['8'], item.upToDay['9'], item.upToDay.total,
      item.thisWeek['5'], item.thisWeek['6'], item.thisWeek['7'], item.thisWeek['8'], item.thisWeek['9'], item.thisWeek.total,
      item.prp,
      item.msmt,
      item.orders
    ]);

    const ws_data = [...headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 0, c: 7 } },
      { s: { r: 0, c: 8 }, e: { r: 0, c: 13 } },
      { s: { r: 0, c: 14 }, e: { r: 1, c: 14 } },
      { s: { r: 0, c: 15 }, e: { r: 1, c: 15 } },
      { s: { r: 0, c: 16 }, e: { r: 1, c: 16 } }
    ];

    const max_len = rows.reduce((w, r) => Math.max(w, String(r[0]).length), 10);
    ws['!cols'] = [
      { wch: max_len + 4 },
      { wch: 8 },
      ...Array(12).fill({ wch: 6 }),
      { wch: 8 }, { wch: 8 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "User Performance");
    XLSX.writeFile(wb, `User_Performance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportLeadsMasterExcel = () => {
    if (leadsMasterData.length === 0) return;

    const wb = XLSX.utils.book_new();

    // Merged headers with 'CRM COOKSCAPE' on top row, centered
    const headers = [
      ["CRM COOKSCAPE", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["Base Date", "Base Source", "Date", "Assign To", "Client Name", "Ph no-1", "D.No", "Project", "Email Id", "Ph no-2", "Feed Back", "Rating", "Brand", "Tag", "Design Owner", "Instruction Pass", "CP Code", "Status"]
    ];

    const rows = leadsMasterData.map(item => [
      item.baseDate,
      item.baseSource,
      item.date,
      item.assignTo,
      item.clientName,
      item.phNo1,
      item.dNo,
      item.project,
      item.emailId,
      item.phNo2,
      item.feedBack,
      item.rating,
      item.brand,
      item.tag,
      item.designOwner,
      item.instructionPass,
      item.cpCode,
      item.status
    ]);

    const ws_data = [...headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Apply the top header merge (row 0, column 0 to column 17)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 17 } }
    ];

    // Column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 20 },
      { wch: 14 }, { wch: 8 }, { wch: 16 }, { wch: 22 }, { wch: 10 },
      { wch: 25 }, { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 18 },
      { wch: 25 }, { wch: 10 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Leads Master");
    XLSX.writeFile(wb, `Leads_Master_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportActivitiesCSV = () => {
    if (activities.length === 0) return;
    
    const csvContent = [
      ['Date', 'User', 'Activity', 'Lead', 'Content'],
      ...activities.map(a => {
        const date = a.createdAt ? new Date(a.createdAt) : new Date();
        return [
          date.toLocaleString(),
          a.user?.fullName || 'System',
          a.type || '-',
          a.lead?.name || 'N/A',
          (a.content || '').replace(/,/g, ';')
        ];
      })
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `activity_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand/5 flex items-center justify-center text-brand">
            <BarChart2 size={26} />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-gray-800 m-0">System Performance Reports</h4>
            <p className="text-xs text-gray-400 uppercase font-black tracking-widest mt-1">Export high-fidelity business intelligence reports</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="bg-gray-100/80 p-1 rounded-xl flex flex-wrap gap-1 border border-gray-200/50">
          <button 
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'performance' 
                ? 'bg-brand text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Table size={14} /> User Performance
          </button>
          <button 
            onClick={() => setActiveTab('leadsMaster')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'leadsMaster' 
                ? 'bg-brand text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Users size={14} /> Leads Master
          </button>
          <button 
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'activities' 
                ? 'bg-brand text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Activity size={14} /> Activity Log
          </button>
        </div>
      </div>

      {activeTab === 'performance' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h5 className="text-base font-bold text-gray-700 m-0 flex items-center gap-2">
                  <FileSpreadsheet className="text-brand" size={18} /> CRE / FR Performance Metrics
                </h5>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Real-time star rating count & lead metrics</p>
              </div>

              <button 
                onClick={handleExportPerformanceExcel}
                className="bg-brand text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#004d30] transition-all shadow-lg shadow-brand/20 active:scale-95 border-0"
              >
                <Download size={14} /> Export to Excel (.xlsx)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-spacing-0 text-left text-xs">
                <thead>
                  <tr className="bg-gray-100/80 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                    <th className="px-4 py-3 border-r border-gray-200/60 font-black text-center" rowSpan={2}>FR/CRE</th>
                    <th className="px-4 py-3 border-r border-gray-200/60 font-black text-center" rowSpan={2}>CALLS</th>
                    <th className="px-4 py-2 border-r border-gray-200/60 font-black text-center bg-blue-50/30" colSpan={6}>UPTODAY</th>
                    <th className="px-4 py-2 border-r border-gray-200/60 font-black text-center bg-purple-50/20" colSpan={6}>THIS WEEK</th>
                    <th className="px-3 py-3 border-r border-gray-200/60 font-black text-center" rowSpan={2}>PRP</th>
                    <th className="px-3 py-3 border-r border-gray-200/60 font-black text-center" rowSpan={2}>MSMT</th>
                    <th className="px-4 py-3 font-black text-center" rowSpan={2}>ORDERS</th>
                  </tr>
                  <tr className="bg-gray-50/60 text-gray-400 font-bold text-[10px] border-b border-gray-200">
                    <th className="px-2 py-1.5 border-r border-gray-200/40 text-center font-bold bg-blue-50/10">5</th>
                    <th className="px-2 py-1.5 border-r border-gray-200/40 text-center font-bold bg-blue-50/10">6</th>
                    <th className="px-2 py-1.5 border-r border-gray-200/40 text-center font-bold bg-blue-50/10">7</th>
                    <th className="px-2 py-1.5 border-r border-gray-200/40 text-center font-bold bg-blue-50/10">8</th>
                    <th className="px-2 py-1.5 border-r border-gray-200/40 text-center font-bold bg-blue-50/10">9</th>
                    <th className="px-2 py-1.5 border-r border-gray-200/60 text-center font-black bg-blue-100/20 text-blue-700">TOTAL</th>
                    <th className="px-2 py-1.5 border-r border-gray-200/40 text-center font-bold bg-purple-50/10">5</th>
                    <th className="px-2 py-1.5 border-r border-gray-200/40 text-center font-bold bg-purple-50/10">6</th>
                    <th className="px-2 py-1.5 border-r border-gray-200/40 text-center font-bold bg-purple-50/10">7</th>
                    <th className="px-2 py-1.5 border-r border-gray-200/40 text-center font-bold bg-purple-50/10">8</th>
                    <th className="px-2 py-1.5 border-r border-gray-200/40 text-center font-bold bg-purple-50/10">9</th>
                    <th className="px-2 py-1.5 border-r border-gray-200/60 text-center font-black bg-purple-100/20 text-purple-700">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                  {performanceData.map((row) => (
                    <tr key={row.userId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 border-r border-gray-100 font-bold text-gray-800 capitalize flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand/5 text-brand flex items-center justify-center font-black text-[10px] border border-brand/10">
                          {row.name.charAt(0)}
                        </div>
                        {row.name.toLowerCase()}
                      </td>
                      <td className="px-4 py-3 border-r border-gray-100 text-center text-gray-600 font-bold">{row.calls}</td>
                      
                      <td className="px-2 py-3 border-r border-gray-100 text-center text-gray-400">{row.upToDay['5'] || ''}</td>
                      <td className="px-2 py-3 border-r border-gray-100 text-center text-gray-400">{row.upToDay['6'] || ''}</td>
                      <td className="px-2 py-3 border-r border-gray-100 text-center text-gray-400">{row.upToDay['7'] || ''}</td>
                      <td className="px-2 py-3 border-r border-gray-100 text-center text-gray-400">{row.upToDay['8'] || ''}</td>
                      <td className="px-2 py-3 border-r border-gray-100 text-center text-gray-400">{row.upToDay['9'] || ''}</td>
                      <td className="px-2 py-3 border-r border-gray-100 text-center font-black text-blue-700 bg-blue-50/20">{row.upToDay.total || '0'}</td>

                      <td className="px-2 py-3 border-r border-gray-100 text-center text-gray-400">{row.thisWeek['5'] || ''}</td>
                      <td className="px-2 py-3 border-r border-gray-100 text-center text-gray-400">{row.thisWeek['6'] || ''}</td>
                      <td className="px-2 py-3 border-r border-gray-100 text-center text-gray-400">{row.thisWeek['7'] || ''}</td>
                      <td className="px-2 py-3 border-r border-gray-100 text-center text-gray-400">{row.thisWeek['8'] || ''}</td>
                      <td className="px-2 py-3 border-r border-gray-100 text-center text-gray-400">{row.thisWeek['9'] || ''}</td>
                      <td className="px-2 py-3 border-r border-gray-100 text-center font-black text-purple-700 bg-purple-50/10">{row.thisWeek.total || '0'}</td>

                      <td className="px-3 py-3 border-r border-gray-100 text-center font-bold text-gray-600">{row.prp || ''}</td>
                      <td className="px-3 py-3 border-r border-gray-100 text-center font-bold text-gray-600">{row.msmt || ''}</td>
                      <td className="px-4 py-3 text-center font-black text-emerald-600 bg-emerald-50/10">{row.orders || ''}</td>
                    </tr>
                  ))}
                  {performanceData.length === 0 && (
                    <tr>
                      <td colSpan={17} className="py-20 text-center text-gray-400 uppercase font-black tracking-widest text-xs">
                        No Performance Data Recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leadsMaster' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Leads Master Grid Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h5 className="text-base font-bold text-gray-700 m-0 flex items-center gap-2">
                  <FileSpreadsheet className="text-brand" size={18} /> Leads Master Database
                </h5>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Exact CRM database extraction sheet</p>
              </div>

              <button 
                onClick={handleExportLeadsMasterExcel}
                className="bg-brand text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#004d30] transition-all shadow-lg shadow-brand/20 active:scale-95 border-0"
              >
                <Download size={14} /> Export Leads Master (.xlsx)
              </button>
            </div>

            {/* Leads Master Spreadsheet Grid */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-spacing-0 text-left text-xs whitespace-nowrap">
                <thead>
                  {/* Top Centered CRM COOKSCAPE Header */}
                  <tr className="bg-gray-100 text-gray-800 border-b border-gray-200">
                    <th colSpan={18} className="px-4 py-3 text-center font-black text-sm uppercase tracking-widest">
                      CRM COOKSCAPE
                    </th>
                  </tr>
                  <tr className="bg-gray-50 text-gray-500 font-black uppercase tracking-wider text-[10px] border-b border-gray-200">
                    <th className="px-4 py-2.5 border-r border-gray-200/50">Base Date</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50">Base Source</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50">Date</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50">Assign To</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50">Client Name</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50">Ph no-1</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50 text-center">D.No</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50">Project</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50">Email Id</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50">Ph no-2</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50">Feed Back</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50 text-center">Rating</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50">Brand</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50">Tag</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50">Design Owner</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50">Instruction Pass</th>
                    <th className="px-4 py-2.5 border-r border-gray-200/50">CP Code</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-600 font-medium">
                  {leadsMasterData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2.5 border-r border-gray-100">{row.baseDate}</td>
                      <td className="px-4 py-2.5 border-r border-gray-100 font-bold text-gray-700">{row.baseSource}</td>
                      <td className="px-4 py-2.5 border-r border-gray-100">{row.date}</td>
                      <td className="px-4 py-2.5 border-r border-gray-100 font-bold text-gray-700 capitalize">{row.assignTo.toLowerCase()}</td>
                      <td className="px-4 py-2.5 border-r border-gray-100 font-black text-gray-800 capitalize">{row.clientName.toLowerCase()}</td>
                      <td className="px-4 py-2.5 border-r border-gray-100">{row.phNo1}</td>
                      <td className="px-4 py-2.5 border-r border-gray-100 text-center font-bold">{row.dNo}</td>
                      <td className="px-4 py-2.5 border-r border-gray-100">{row.project}</td>
                      <td className="px-4 py-2.5 border-r border-gray-100 text-gray-500">{row.emailId}</td>
                      <td className="px-4 py-2.5 border-r border-gray-100 text-gray-400">{row.phNo2 || '-'}</td>
                      <td className="px-4 py-2.5 border-r border-gray-100 text-gray-500 max-w-[200px] overflow-hidden text-ellipsis">{row.feedBack}</td>
                      <td className="px-4 py-2.5 border-r border-gray-100 text-center">
                        <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-black border border-amber-200/50">
                          {row.rating || '0'} ★
                        </span>
                      </td>
                      <td className="px-4 py-2.5 border-r border-gray-100">{row.brand}</td>
                      <td className="px-4 py-2.5 border-r border-gray-100">
                        <span className="text-[10px] bg-brand/5 text-brand px-1.5 py-0.5 rounded border border-brand/10 font-bold">
                          {row.tag || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 border-r border-gray-100 capitalize">{row.designOwner.toLowerCase() || '-'}</td>
                      <td className="px-4 py-2.5 border-r border-gray-100 text-gray-500 max-w-[200px] overflow-hidden text-ellipsis">{row.instructionPass || '-'}</td>
                      <td className="px-4 py-2.5 border-r border-gray-100 text-gray-400">{row.cpCode || '-'}</td>
                      <td className="px-4 py-2.5 font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          row.status === 'Order Booked' ? 'bg-emerald-100 text-emerald-700' :
                          row.status === 'Opportunities' ? 'bg-blue-100 text-blue-700' :
                          row.status === 'Disqualified' ? 'bg-rose-100 text-rose-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {leadsMasterData.length === 0 && (
                    <tr>
                      <td colSpan={18} className="py-20 text-center text-gray-400 uppercase font-black tracking-widest text-xs">
                        No Leads Master Records Found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activities' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Filters Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-gray-400">Search Activity Records</h5>
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="date" 
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all"
                    value={filters.from_date}
                    onChange={(e) => setFilters({...filters, from_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">To Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="date" 
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all"
                    value={filters.to_date}
                    onChange={(e) => setFilters({...filters, to_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Activity Type</label>
                <select 
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all appearance-none"
                  value={filters.activity_type}
                  onChange={(e) => setFilters({...filters, activity_type: e.target.value})}
                >
                  <option value="">-- All Activities --</option>
                  <option value="created">Created</option>
                  <option value="updated">Updated</option>
                  <option value="NOTE">Note Added</option>
                  <option value="SYSTEM">System Log</option>
                  <option value="Order Booked">Order Booked</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Lead Status</label>
                <select 
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all appearance-none"
                  value={filters.lead_status_id}
                  onChange={(e) => setFilters({...filters, lead_status_id: e.target.value})}
                >
                  <option value="">-- All Statuses --</option>
                  {masters?.statuses?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button 
                  type="submit"
                  disabled={isSearching}
                  className="flex-1 bg-brand text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#004d30] transition-all shadow-lg shadow-brand/20 disabled:opacity-50 border-0"
                >
                  {isSearching ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Search size={16} />}
                  Search
                </button>
                <button 
                  type="button"
                  onClick={handleExportActivitiesCSV}
                  className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all border border-gray-100 active:scale-95"
                  title="Export to CSV"
                >
                  <Download size={18} />
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            <div className="lg:col-span-9">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h5 className="text-sm font-bold text-gray-700 m-0 flex items-center gap-2">
                    <Activity size={18} className="text-brand" /> Activity Log
                  </h5>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{activities.length} Records Found</span>
                </div>
                
                <div className="p-8 max-h-[800px] overflow-y-auto scrollbar-thin">
                  {activities.length === 0 ? (
                    <div className="py-20 text-center">
                      <Clock size={48} className="text-gray-100 mx-auto mb-4" />
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No activity records found</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 pb-4">
                      {activities.map((activity, idx) => (
                        <div key={activity.id || `activity-${idx}`} className="relative pl-8">
                          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white bg-brand shadow-sm"></div>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                activity.type === 'created' ? 'bg-green-100 text-green-700' : 
                                activity.type === 'NOTE' ? 'bg-blue-100 text-blue-700' : 
                                activity.type === 'SYSTEM' ? 'bg-gray-100 text-gray-600' : 
                                'bg-brand/10 text-brand'
                              }`}>
                                {activity.type}
                              </span>
                              <span className="text-xs font-bold text-gray-700">{activity.user?.fullName || 'System'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                              <Clock size={12} />
                              {new Date(activity.createdAt).toLocaleString()}
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 group hover:border-brand/20 transition-all">
                            {activity.lead && (
                              <div className="flex items-center gap-1 mb-2">
                                <User size={12} className="text-gray-400" />
                                <span className="text-[11px] font-bold text-brand hover:underline cursor-pointer">{activity.lead.name}</span>
                                {activity.lead.status && (
                                  <span className="text-[10px] text-gray-400 ml-1">• {activity.lead.status.name}</span>
                                )}
                              </div>
                            )}
                            <p className="text-sm text-gray-600 leading-relaxed m-0">{activity.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-6">
              <div className="bg-[#111] rounded-2xl shadow-xl p-6 text-white overflow-hidden relative">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
                <h5 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-white/50 border-b border-white/10 pb-4">Status Summary</h5>
                
                <div className="space-y-4">
                  {[
                    { label: 'Fresh Leads', value: stats?.freshlead || 0, color: 'bg-[#00BCD4]' },
                    { label: 'Follow-ups', value: stats?.followup || 0, color: 'bg-[#EB4386]' },
                    { label: 'Opportunities', value: stats?.opportunities || 0, color: 'bg-[#3373ED]' },
                    { label: 'Order Booked', value: stats?.orderbook || 0, color: 'bg-[#7519C8]' },
                    { label: 'Disqualified', value: stats?.disqualified || 0, color: 'bg-[#28C9A2]' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.color}`}></div>
                        <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors">{item.label}</span>
                      </div>
                      <span className="text-sm font-black tracking-wider">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Operations</span>
                  <span className="text-xl font-black text-brand">
                    {(stats?.freshlead || 0) + (stats?.followup || 0) + (stats?.opportunities || 0) + (stats?.orderbook || 0)}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-gray-400">Quick Links</h5>
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-xs font-bold text-gray-600 transition-all border border-transparent hover:border-gray-100">
                    Lead Hub <ArrowRight size={14} className="text-gray-300" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Animations helper styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
};

export default Report;
