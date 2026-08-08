import React, { useState, useEffect } from 'react';
import LeadDetailView from '../components/crm/LeadDetailView';
import { leadService } from '../services/api';
import type { Lead } from '../types/crm';
import { 
  Search, 
  Plus,
  ChevronRight
} from 'lucide-react';
import LeadModal from '../components/modals/LeadModal';
import { useAuth } from '../contexts/AuthContext';

interface MasterItem { id: string; name: string; }
interface MasterUser { id: string; fullName: string; role?: string; }

const Leads: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [masters, setMasters] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [counts, setCounts] = useState<any>({ today: 0, tomorrow: 0, week: 0, month: 0 });

  // Filters State
  const [search, setSearch] = useState('');
  const [statusId, setStatusId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tagId, setTagId] = useState('');
  const [stageId, setStageId] = useState('');
  const [rating, setRating] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [contactDate, setContactDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const [activeView, setActiveView] = useState<'LIST' | 'DETAIL'>('LIST');

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const res = await leadService.getLeads({ 
        page, 
        limit: 10,
        search,
        statusId: statusId || undefined,
        brandId: brandId || undefined,
        projectId: projectId || undefined,
        tagId: tagId || undefined,
        stageId: stageId || undefined,
        rating: rating || undefined,
        timeframe: timeframe || undefined,
        contactDate: contactDate || undefined,
        assignedToIds: selectedUserId ? [selectedUserId] : undefined,
      });
      setLeads(res.data);
      setTotal(res.total);
      
      if (res.data.length > 0 && !selectedLead && window.innerWidth >= 1024) {
        fetchLeadDetail(res.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const userId = selectedUserId || (user?.role === 'ADMIN' || user?.role === 'BUSINESS_HEAD' ? undefined : user?.id);
      const res = await leadService.getContactableCounts(userId);
      setCounts(res);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const fetchLeadDetail = async (id: string) => {
    setIsDetailLoading(true);
    try {
      const res = await leadService.getLead(id);
      setSelectedLead(res);
      if (window.innerWidth < 1024) {
        setActiveView('DETAIL');
      }
    } catch (error) {
      console.error('Error fetching lead detail:', error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const masterData = await leadService.getMasters();
      setMasters(masterData);
      fetchCounts();
    };
    init();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 500); // 500ms debounce for search input
    return () => clearTimeout(timer);
  }, [page, search, statusId, brandId, projectId, tagId, stageId, rating, timeframe, contactDate, selectedUserId]);

  useEffect(() => {
    fetchCounts();
  }, [selectedUserId]);

  const canFilterUsers = user?.role === 'ADMIN' || user?.role === 'BUSINESS_HEAD';

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header Area */}
      <div className="card-box !mb-0 !p-3 md:!p-4">
        <div className="flex items-center justify-between mb-4">
           <h4 className="text-sm md:text-base font-bold text-gray-700 uppercase m-0">Leads</h4>
           {(user?.role === 'ADMIN' || user?.role === 'DM_EXECUTIVE') && (
             <button 
               onClick={() => setIsModalOpen(true)}
               className="btn-custom !rounded !py-1 text-[10px] md:text-[11px] flex items-center gap-2"
             >
               <Plus size={14} /> Create Lead
             </button>
           )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8 gap-3 pt-3 border-t border-gray-100">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Brand</label>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="form-control !py-1 !px-2 !text-[11px]">
              <option value="">-Select-</option>
              {masters?.brands.map((b: MasterItem) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="form-control !py-1 !px-2 !text-[11px]">
              <option value="">-Select-</option>
              {masters?.projects.map((p: MasterItem) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Tag</label>
            <select value={tagId} onChange={(e) => setTagId(e.target.value)} className="form-control !py-1 !px-2 !text-[11px]">
              <option value="">-Select-</option>
              {masters?.leadTags.map((t: MasterItem) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Users</label>
            <select
              disabled={!canFilterUsers}
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setPage(1);
              }}
              className="form-control !py-1 !px-2 !text-[11px]"
            >
              <option value="">{canFilterUsers ? 'All Allowed Users' : user?.fullName}</option>
              {canFilterUsers && masters?.users.map((u: MasterUser) => (
                <option key={u.id} value={u.id}>{u.fullName}{u.role ? ` (${u.role})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Stage</label>
            <select value={stageId} onChange={(e) => setStageId(e.target.value)} className="form-control !py-1 !px-2 !text-[11px]">
              <option value="">-Select-</option>
              {masters?.stages.map((s: MasterItem) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Rating</label>
            <select value={rating} onChange={(e) => setRating(e.target.value)} className="form-control !py-1 !px-2 !text-[11px]">
              <option value="">-Select-</option>
              {[1,2,3,4,5].map(r => <option key={r} value={r}>{r} Stars</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Timeline</label>
            <select
              value={timeframe}
              onChange={(e) => {
                setTimeframe(e.target.value);
                if (e.target.value) setContactDate('');
                setPage(1);
              }}
              className="form-control !py-1 !px-2 !text-[11px]"
            >
              <option value="">All</option>
              <option value="overdue">Overdue Only</option>
              <option value="today">Due Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
            <select value={statusId} onChange={(e) => setStatusId(e.target.value)} className="form-control !py-1 !px-2 !text-[11px]">
              <option value="">-Select-</option>
              {masters?.statuses.map((s: MasterItem) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Date Wise</label>
            <input
              type="date"
              value={contactDate}
              onChange={(e) => {
                setContactDate(e.target.value);
                if (e.target.value) setTimeframe('');
                setPage(1);
              }}
              className="form-control !py-1 !px-2 !text-[11px]"
            />
          </div>
        </div>
      </div>

      {/* View Toggle for Mobile/Tablet */}
      <div className="2xl:hidden flex bg-white border border-gray-100 p-1 rounded-lg">
        <button 
          onClick={() => setActiveView('LIST')}
          className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${activeView === 'LIST' ? 'bg-brand text-white' : 'text-gray-400'}`}
        >
          Lead Inventory
        </button>
        <button 
          onClick={() => setActiveView('DETAIL')}
          className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${activeView === 'DETAIL' ? 'bg-brand text-white' : 'text-gray-400'}`}
        >
          Lead Detail
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6 min-h-[600px]">
        {/* Left Column: List */}
        <div className={`col-span-12 2xl:col-span-4 flex flex-col bg-white border border-gray-100 shadow-sm h-[calc(100vh-320px)] ${activeView === 'DETAIL' ? 'hidden 2xl:flex' : 'flex'}`}>
          <div className="p-3 border-b border-gray-50 bg-[#f8f9fa] flex items-center justify-between">
             <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-bold text-gray-500">
                Show <select className="border border-gray-200 rounded px-1"><option>10</option></select> entries
             </div>
             <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="bg-white border border-gray-200 rounded pl-6 pr-2 py-1 text-[10px] md:text-[11px] outline-none w-24 md:w-32"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
          </div>

          <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-10 flex flex-col items-center"><div className="w-6 h-6 border-2 border-brand border-t-transparent animate-spin rounded-full" /></div>
            ) : leads.map(lead => (
              <div 
                key={lead.id}
                onClick={() => fetchLeadDetail(lead.id)}
                className={`p-3 cursor-pointer transition-colors border-l-4 ${selectedLead?.id === lead.id ? 'bg-gray-50 border-l-brand' : 'hover:bg-gray-50 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start">
                   <h6 className="text-[12px] md:text-[13px] font-bold text-gray-700 m-0">{lead.name}</h6>
                   <span className="bg-brand text-white px-1.5 py-0.5 rounded text-[8px] md:text-[9px] font-bold uppercase">
                     {typeof lead.status === 'object' ? lead.status?.name : lead.status}
                   </span>
                </div>
                <div className="text-[10px] md:text-[11px] text-brand font-medium mt-1">{lead.phone}</div>
                <div className="flex justify-between items-center mt-2">
                   <span className="text-[9px] md:text-[10px] text-gray-400">{lead.project?.name || 'No Project'}</span>
                   <span className="text-[8px] md:text-[9px] text-gray-300 italic">{new Date(lead.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 bg-[#f8f9fa] border-t border-gray-100 flex items-center justify-between">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 text-gray-600 disabled:opacity-30"><ChevronRight size={16} className="rotate-180" /></button>
            <span className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase">Page {page} of {Math.ceil(total / 10) || 1}</span>
            <button disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(p => p + 1)} className="p-1 text-gray-600 disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* Right Column: Lead Details */}
        <div className={`col-span-12 2xl:col-span-8 h-[calc(100vh-320px)] ${activeView === 'LIST' ? 'hidden 2xl:block' : 'block'}`}>
           {isDetailLoading ? (
               <div className="h-full bg-white border border-gray-100 flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-brand border-t-transparent animate-spin rounded-full" />
               </div>
           ) : (
               <LeadDetailView 
                 lead={selectedLead} 
                 onRefresh={() => {
                   fetchLeads();
                   fetchCounts();
                   if (selectedLead) fetchLeadDetail(selectedLead.id);
                 }} 
               />
           )}
        </div>
      </div>

      {/* Bottom Panel Counts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4">
         {[
           { label: 'Upto Today', count: counts.uptoToday, color: 'bg-dark' },
           { label: 'Today', count: counts.today, color: 'bg-secondary' },
           { label: 'Tomorrow', count: counts.tomorrow, color: 'bg-brand' },
           { label: 'This Week', count: counts.week, color: 'bg-info' },
           { label: 'This Month', count: counts.month, color: 'bg-warning' },
         ].map((item, i) => (
           <div key={i} className="bg-white p-4 border border-gray-100 shadow-sm rounded">
              <div className={`w-2 h-2 rounded-full ${item.color} mb-2`} />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider m-0">{item.label}</p>
              <h3 className="text-2xl font-bold text-gray-700 mt-1">{item.count}</h3>
           </div>
         ))}
      </div>

      <LeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => { fetchLeads(); fetchCounts(); setIsModalOpen(false); }} />
    </div>
  );
};

export default Leads;
