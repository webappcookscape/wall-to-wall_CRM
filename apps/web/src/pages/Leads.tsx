import React, { useState, useEffect, useRef } from 'react';
import LeadDetailView from '../components/crm/LeadDetailView';
import { leadService } from '../services/api';
import type { Lead } from '../types/crm';
import { 
  Search, 
  Plus,
  Upload,
  ChevronRight
} from 'lucide-react';
import LeadModal from '../components/modals/LeadModal';
import UploadLeadModal from '../components/modals/UploadLeadModal';
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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const selectedLeadRef = useRef<Lead | null>(null);
  selectedLeadRef.current = selectedLead;
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

  const fetchLeads = async (forceSelectId?: string) => {
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
      
      if (res.data.length > 0) {
        const targetId = forceSelectId || selectedLeadRef.current?.id;
        const isStillInList = targetId ? res.data.some((l: Lead) => l.id === targetId) : false;
        
        if (!isStillInList) {
          if (window.innerWidth >= 1024) {
            fetchLeadDetail(res.data[0].id);
          } else {
            setSelectedLead(null);
          }
        } else if (forceSelectId) {
          fetchLeadDetail(forceSelectId);
        }
      } else {
        setSelectedLead(null);
        if (window.innerWidth < 1024) {
          setActiveView('LIST');
        }
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

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusId, brandId, projectId, tagId, stageId, rating, timeframe, contactDate, selectedUserId]);

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
    <div className="space-y-4 md:space-y-6 w-full">
      {/* Header Area */}
      <div className="card-box !mb-0 !p-4 md:!p-6 rounded-xl shadow-sm border border-gray-200/80">
        <div className="flex items-center justify-between mb-4">
           <h4 className="text-xl md:text-2xl font-black text-gray-800 uppercase tracking-wide m-0 font-rubik">Leads</h4>
           {['ADMIN', 'DM_EXECUTIVE', 'BUSINESS_HEAD', 'DESIGNER'].includes(user?.role || '') && (
             <div className="flex items-center gap-2">
               <button 
                 onClick={() => setIsUploadModalOpen(true)}
                 className="btn-custom !bg-white !text-gray-700 !border !border-gray-300 hover:!bg-gray-50 !rounded-lg !py-2.5 !px-4 text-xs md:text-sm font-bold flex items-center gap-2 shadow-xs transition-all"
               >
                 <Upload size={16} className="text-brand" /> Upload Leads
               </button>
               <button 
                 onClick={() => setIsModalOpen(true)}
                 className="btn-custom !rounded-lg !py-2.5 !px-5 text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow transition-all"
               >
                 <Plus size={16} /> Create Lead
               </button>
             </div>
           )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3.5 pt-4 border-t border-gray-100">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Brand</label>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="form-control !py-2 !px-3 !text-xs md:!text-sm font-medium rounded-lg border-gray-300">
              <option value="">-Select-</option>
              {masters?.brands.map((b: MasterItem) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="form-control !py-2 !px-3 !text-xs md:!text-sm font-medium rounded-lg border-gray-300">
              <option value="">-Select-</option>
              {masters?.projects.map((p: MasterItem) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Tag</label>
            <select value={tagId} onChange={(e) => setTagId(e.target.value)} className="form-control !py-2 !px-3 !text-xs md:!text-sm font-medium rounded-lg border-gray-300">
              <option value="">-Select-</option>
              {masters?.leadTags.map((t: MasterItem) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Users</label>
            <select
              disabled={!canFilterUsers}
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setPage(1);
              }}
              className="form-control !py-2 !px-3 !text-xs md:!text-sm font-medium rounded-lg border-gray-300"
            >
              <option value="">{canFilterUsers ? 'All Allowed Users' : user?.fullName}</option>
              {canFilterUsers && masters?.users.map((u: MasterUser) => (
                <option key={u.id} value={u.id}>{u.fullName}{u.role ? ` (${u.role})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Stage</label>
            <select value={stageId} onChange={(e) => setStageId(e.target.value)} className="form-control !py-2 !px-3 !text-xs md:!text-sm font-medium rounded-lg border-gray-300">
              <option value="">-Select-</option>
              {masters?.stages.map((s: MasterItem) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Rating</label>
            <select value={rating} onChange={(e) => setRating(e.target.value)} className="form-control !py-2 !px-3 !text-xs md:!text-sm font-medium rounded-lg border-gray-300">
              <option value="">-Select-</option>
              {[1,2,3,4,5].map(r => <option key={r} value={r}>{r} Stars</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Timeline</label>
            <select
              value={timeframe}
              onChange={(e) => {
                setTimeframe(e.target.value);
                if (e.target.value) setContactDate('');
                setPage(1);
              }}
              className="form-control !py-2 !px-3 !text-xs md:!text-sm font-medium rounded-lg border-gray-300"
            >
              <option value="">All</option>
              <option value="overdue">Overdue Only</option>
              <option value="today">Due Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Status</label>
            <select value={statusId} onChange={(e) => setStatusId(e.target.value)} className="form-control !py-2 !px-3 !text-xs md:!text-sm font-medium rounded-lg border-gray-300">
              <option value="">-Select-</option>
              {masters?.statuses.map((s: MasterItem) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Date Wise</label>
            <input
              type="date"
              value={contactDate}
              onChange={(e) => {
                setContactDate(e.target.value);
                if (e.target.value) setTimeframe('');
                setPage(1);
              }}
              className="form-control !py-2 !px-3 !text-xs md:!text-sm font-medium rounded-lg border-gray-300"
            />
          </div>
        </div>
      </div>

      {/* View Toggle for Mobile/Tablet */}
      <div className="lg:hidden flex bg-white border border-gray-200/80 p-1.5 rounded-xl shadow-sm">
        <button 
          onClick={() => setActiveView('LIST')}
          className={`flex-1 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all ${activeView === 'LIST' ? 'bg-brand text-white shadow-sm' : 'text-gray-500'}`}
        >
          Lead Inventory
        </button>
        <button 
          onClick={() => setActiveView('DETAIL')}
          className={`flex-1 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all ${activeView === 'DETAIL' ? 'bg-brand text-white shadow-sm' : 'text-gray-500'}`}
        >
          Lead Detail
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6 min-h-[620px]">
        {/* Left Column: List */}
        <div className={`col-span-12 lg:col-span-4 flex flex-col bg-white border border-gray-200/80 shadow-sm rounded-xl overflow-hidden h-[calc(100vh-270px)] min-h-[580px] ${activeView === 'DETAIL' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3.5 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
             <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-600">
                Show <select className="border border-gray-300 rounded px-2 py-1 text-xs md:text-sm font-bold"><option>10</option></select> entries
             </div>
             <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input 
                  type="text" 
                  placeholder="Search leads..." 
                  className="bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-xs md:text-sm outline-none w-32 md:w-48 font-medium focus:border-brand transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
          </div>

          <div className="divide-y divide-gray-100 overflow-y-auto flex-1 p-1">
            {isLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-brand border-t-transparent animate-spin rounded-full" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading leads...</span>
              </div>
            ) : leads.length === 0 ? (
              <div className="p-16 text-center text-gray-400 font-semibold text-sm">
                No leads match your current filter.
              </div>
            ) : leads.map(lead => (
              <div 
                key={lead.id}
                onClick={() => fetchLeadDetail(lead.id)}
                className={`p-3.5 cursor-pointer transition-all rounded-lg mb-1 border-l-4 ${selectedLead?.id === lead.id ? 'bg-blue-50/60 border-l-brand shadow-sm' : 'hover:bg-gray-50/80 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start gap-2">
                   <h6 className="text-sm md:text-base font-bold text-gray-800 m-0 font-rubik leading-snug">{lead.name}</h6>
                   <span className="bg-brand text-white px-2.5 py-0.5 rounded text-[10px] md:text-xs font-extrabold uppercase tracking-wide flex-shrink-0">
                     {typeof lead.status === 'object' ? lead.status?.name : lead.status}
                   </span>
                </div>
                <div className="text-xs md:text-sm text-brand font-semibold mt-1 flex items-center justify-between">
                   <span>{lead.phone}</span>
                   {lead.orderValue && (
                     <span className="text-emerald-600 font-bold text-xs">₹{lead.orderValue.toLocaleString()}</span>
                   )}
                </div>
                <div className="flex justify-between items-center mt-2 pt-1 border-t border-gray-100/60">
                   <span className="text-xs text-gray-500 font-medium truncate max-w-[180px]">{lead.project?.name || 'No Project'}</span>
                   <span className="text-xs text-gray-400 italic">{new Date(lead.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 text-gray-600 hover:text-brand disabled:opacity-30 transition-colors"><ChevronRight size={18} className="rotate-180" /></button>
            <span className="text-xs md:text-sm font-bold text-gray-600 uppercase">Page {page} of {Math.ceil(total / 10) || 1}</span>
            <button disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(p => p + 1)} className="p-1.5 text-gray-600 hover:text-brand disabled:opacity-30 transition-colors"><ChevronRight size={18} /></button>
          </div>
        </div>

        {/* Right Column: Lead Details */}
        <div className={`col-span-12 lg:col-span-8 h-[calc(100vh-270px)] min-h-[580px] rounded-xl overflow-hidden shadow-sm border border-gray-200/80 bg-white ${activeView === 'LIST' ? 'hidden lg:block' : 'block'}`}>
           {isDetailLoading ? (
               <div className="h-full bg-white flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-4 border-brand border-t-transparent animate-spin rounded-full" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading details...</span>
               </div>
           ) : (
               <LeadDetailView 
                 lead={selectedLead} 
                 onRefresh={() => {
                   fetchCounts();
                   if (selectedLeadRef.current) {
                     fetchLeadDetail(selectedLeadRef.current.id);
                     fetchLeads(selectedLeadRef.current.id);
                   } else {
                     fetchLeads();
                   }
                 }} 
               />
           )}
        </div>
      </div>

      {/* Bottom Panel Counts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
         {[
           { label: 'Upto Today', count: counts.uptoToday, color: 'bg-dark' },
           { label: 'Today', count: counts.today, color: 'bg-secondary' },
           { label: 'Tomorrow', count: counts.tomorrow, color: 'bg-brand' },
           { label: 'This Week', count: counts.week, color: 'bg-info' },
           { label: 'This Month', count: counts.month, color: 'bg-warning' },
         ].map((item, i) => (
           <div key={i} className="bg-white p-5 border border-gray-200/80 shadow-sm rounded-xl hover:shadow-md transition-shadow">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color} mb-2.5`} />
              <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest m-0">{item.label}</p>
              <h3 className="text-3xl md:text-4xl font-black text-gray-800 mt-1.5 font-rubik">{item.count}</h3>
           </div>
         ))}
      </div>

      <LeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => { fetchLeads(); fetchCounts(); setIsModalOpen(false); }} />
      <UploadLeadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onSuccess={() => { fetchLeads(); fetchCounts(); setIsUploadModalOpen(false); }} />
    </div>
  );
};

export default Leads;
