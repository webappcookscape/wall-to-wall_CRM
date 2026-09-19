import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import { leadService } from '../services/api';
import type { Lead, MasterData } from '../types/crm';
import {
  Users, 
  Plus, 
  RefreshCw, 
  FileUp, 
  Upload,
  ChevronRight,
  Edit3,
  Trash2
} from 'lucide-react';
import LeadModal from '../components/modals/LeadModal';
import UploadLeadModal from '../components/modals/UploadLeadModal';
import { useAuth } from '../contexts/AuthContext';

const LeadHub: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canAddLead = ['ADMIN', 'BUSINESS_HEAD', 'DM_EXECUTIVE', 'CLIENT_FACILITATOR', 'FA'].includes(user?.role || '');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | undefined>(undefined);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  
  const [masters, setMasters] = useState<MasterData | null>(null);
  const [activeFilters, setActiveFilters] = useState<any>({
    brandId: '',
    projectId: '',
    search: ''
  });
  
  const [tempFilters, setTempFilters] = useState<any>({
    brandId: '',
    projectId: '',
  });

  const fetchMasters = async () => {
    try {
      const data = await leadService.getMasters();
      setMasters(data);
    } catch (error) {
      console.error('Error fetching masters:', error);
    }
  };

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await leadService.getLeads({ 
        page, 
        limit: 10,
        ...activeFilters
      });
      setLeads(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, activeFilters]);

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleApplyFilters = () => {
    setActiveFilters((prev: any) => ({
      ...prev,
      ...tempFilters
    }));
    setPage(1);
  };

  const handleUpdateProjects = async () => {
    await fetchMasters();
    alert('Projects updated successfully!');
  };

  const handleBulkAssign = async () => {
    if (!targetUserId) {
      alert('Please select a user to assign to.');
      return;
    }
    setIsSubmittingBulk(true);
    try {
      await leadService.bulkAssignLeads(selectedLeads, targetUserId);
      alert(`Successfully assigned ${selectedLeads.length} leads.`);
      setSelectedLeads([]);
      setIsBulkModalOpen(false);
      setTargetUserId('');
      fetchLeads();
    } catch (error) {
      console.error('Error in bulk assign:', error);
      alert('Failed to bulk assign leads.');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    const confirmed = window.confirm(`Delete lead "${lead.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingLeadId(lead.id);
    try {
      await leadService.deleteLead(lead.id);
      setSelectedLeads(prev => prev.filter(id => id !== lead.id));
      await fetchLeads();
      alert('Lead deleted successfully.');
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      alert(error?.response?.data?.message || 'Failed to delete lead.');
    } finally {
      setDeletingLeadId(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const columns: Column[] = [
    {
      header: (
        <input 
          type="checkbox" 
          checked={selectedLeads.length > 0 && selectedLeads.length === leads.length}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
        />
      ),
      accessor: 'id',
      render: (row: Lead) => (
        <input 
          type="checkbox" 
          checked={selectedLeads.includes(row.id)}
          onChange={() => toggleSelectOne(row.id)}
          className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
        />
      )
    },
    { 
      header: 'Date', 
      accessor: 'createdAt',
      render: (row: Lead) => {
        const dateVal = row.dataCollected || row.createdAt;
        const nextDateVal = row.nextFollowUp || row.contactableDate;
        return (
          <div className="flex flex-col gap-1">
            <span className="font-extrabold text-gray-900 text-sm md:text-base">
              {new Date(dateVal).toLocaleDateString('en-GB')}
            </span>
            <span className="text-xs md:text-sm text-gray-500 font-semibold uppercase tracking-wide">
              {new Date(dateVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {nextDateVal && (
              <span className="inline-flex items-center gap-1 text-[11px] md:text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md w-fit mt-0.5">
                Next: {new Date(nextDateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </span>
            )}
          </div>
        );
      }
    },
    { 
      header: 'Lead ID', 
      accessor: 'leadId',
      render: (row: Lead) => (
        <span className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-md font-black text-gray-800 text-sm md:text-base tracking-tight">
          #{row.leadId}
        </span>
      )
    },
    { 
      header: 'Lead Details', 
      accessor: 'name',
      render: (row: Lead) => (
        <div className="flex flex-col gap-1">
          <span className="font-black text-gray-900 hover:text-brand cursor-pointer text-base md:text-lg leading-tight transition-colors">
            {row.name}
          </span>
          <span className="text-sm md:text-base text-brand font-extrabold tracking-wide">
            {row.phone}
          </span>
        </div>
      )
    },
    { 
      header: 'Context', 
      accessor: 'brand',
      render: (row: Lead) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm md:text-base font-black text-gray-800 uppercase tracking-tight">
            {row.brand?.name || '-'}
          </span>
          <span className="text-xs md:text-sm text-gray-600 font-bold">
            {row.project?.name || '-'}
          </span>
        </div>
      )
    },
    { 
      header: 'Status & Source', 
      accessor: 'status',
      render: (row: Lead) => {
        const rawStatus = typeof row.status === 'object' ? row.status?.name : row.status;
        const norm = String(rawStatus || '').toLowerCase();
        let badgeStyle = 'bg-blue-600 text-white';
        if (norm.includes('fresh')) badgeStyle = 'bg-emerald-600 text-white';
        else if (norm.includes('yet to follow')) badgeStyle = 'bg-sky-600 text-white';
        else if (norm.includes('opportunity') || norm.includes('opportunities')) badgeStyle = 'bg-indigo-600 text-white';
        else if (norm.includes('order book')) badgeStyle = 'bg-teal-600 text-white';
        else if (norm.includes('disqualified')) badgeStyle = 'bg-rose-600 text-white';

        return (
          <div className="flex flex-col gap-1.5 items-start">
            <span className={`px-3 py-1 rounded-md text-xs md:text-sm font-black uppercase tracking-wider shadow-xs ${badgeStyle}`}>
              {rawStatus || 'Fresh'}
            </span>
            <span className="text-xs md:text-sm text-gray-700 font-extrabold uppercase tracking-wide">
              {row.source?.name || 'Manual'}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Assigned To',
      accessor: 'assignedTo',
      render: (row: Lead) => (
        row.assignedTo?.fullName ? (
          <span className="text-sm md:text-base font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            {row.assignedTo.fullName}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-xs md:text-sm font-black uppercase tracking-wider">
            Unassigned
          </span>
        )
      )
    },
    {
      header: 'Action',
      accessor: 'actions',
      render: (row: Lead) => (
        <div className="flex items-center justify-end gap-2.5">
          <button 
            type="button"
            title="Edit lead"
            onClick={() => {
              setLeadToEdit(row);
              setIsModalOpen(true);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-brand/20 text-brand bg-brand/5 hover:bg-brand hover:text-white transition-all shadow-sm active:scale-95"
          >
            <Edit3 size={17} />
          </button>
          {isAdmin && (
            <button 
              type="button"
              title="Delete lead"
              disabled={deletingLeadId === row.id}
              onClick={() => handleDeleteLead(row)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingLeadId === row.id ? (
                <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <Trash2 size={17} />
              )}
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="container-fluid py-5">
      {/* Header Buttons */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <h4 className="page-title text-2xl md:text-3xl font-black text-gray-800 m-0">Lead Hub</h4>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 w-full lg:w-auto">
          {isAdmin && (
            <button
              onClick={handleUpdateProjects}
              className="btn-custom !bg-brand hover:!bg-[#004d30] !rounded-xl !px-4 sm:!px-5 !py-2.5 text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm active:scale-95"
            >
              <RefreshCw size={16} className="shrink-0" /> <span className="truncate">Update Projects</span>
            </button>
          )}
          {canAddLead && (
            <>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-custom !bg-brand hover:!bg-[#004d30] !rounded-xl !px-4 sm:!px-5 !py-2.5 text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                <FileUp size={16} className="shrink-0" /> <span className="truncate">Custom Upload</span>
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-custom !bg-brand hover:!bg-[#004d30] !rounded-xl !px-4 sm:!px-5 !py-2.5 text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                <Upload size={16} className="shrink-0" /> <span className="truncate">Upload Lead</span>
              </button>
              <button
                onClick={() => {
                  setLeadToEdit(undefined);
                  setIsModalOpen(true);
                }}
                className="btn-custom !bg-brand hover:!bg-[#004d30] !rounded-xl !px-4 sm:!px-5 !py-2.5 text-xs sm:text-sm font-black flex items-center justify-center gap-2 col-span-2 sm:col-auto shadow-md shadow-brand/20 active:scale-95"
              >
                <Plus size={18} className="shrink-0" /> <span className="truncate">Create Lead</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#d9edf7] border border-[#bce8f1] text-[#31708f] p-4 md:p-5 rounded-xl mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="flex flex-col gap-1.5 w-full md:w-auto">
            <label className="text-xs md:text-sm font-black uppercase tracking-wider text-sky-950">Brand</label>
            <select 
              className="form-control !bg-white !w-full md:!w-48 !py-2 !px-3.5 !text-sm md:!text-base font-bold border-sky-300 rounded-lg shadow-sm"
              value={tempFilters.brandId}
              onChange={(e) => setTempFilters({ ...tempFilters, brandId: e.target.value })}
            >
              <option value="">- All Brands -</option>
              {masters?.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 w-full md:w-auto">
            <label className="text-xs md:text-sm font-black uppercase tracking-wider text-sky-950">Project</label>
            <select 
              className="form-control !bg-white !w-full md:!w-56 !py-2 !px-3.5 !text-sm md:!text-base font-bold border-sky-300 rounded-lg shadow-sm"
              value={tempFilters.projectId}
              onChange={(e) => setTempFilters({ ...tempFilters, projectId: e.target.value })}
            >
              <option value="">- All Projects -</option>
              {masters?.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button 
            onClick={handleApplyFilters}
            className="btn-custom !w-full md:!w-auto !rounded-lg !py-2.5 !px-6 text-xs md:text-sm bg-brand hover:bg-[#004d30] text-white uppercase font-black tracking-widest mt-2 md:mt-0 shadow-md shadow-brand/20 active:scale-95"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedLeads.length > 0 && (
          <div className="bg-gray-800 text-white p-4 rounded-xl mb-4 flex items-center justify-between shadow-lg">
              <span className="text-sm md:text-base font-extrabold">{selectedLeads.length} Leads Selected</span>
              <div className="flex gap-3">
                  <button 
                    onClick={() => setIsBulkModalOpen(true)}
                    className="bg-brand hover:bg-[#004d30] text-white px-4 py-2 rounded-lg text-xs md:text-sm font-black uppercase tracking-wider shadow-sm"
                  >
                    Bulk Assign
                  </button>
                  <button className="text-gray-300 hover:text-white text-xs md:text-sm font-extrabold uppercase tracking-wider px-2" onClick={() => setSelectedLeads([])}>Cancel</button>
              </div>
          </div>
      )}

      {/* Inventory Table Container */}
      <div className="card-box !p-0 overflow-hidden rounded-xl">
          <div className="px-5 py-4 bg-[#f8f9fa] border-b border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2.5 text-base md:text-lg font-black text-gray-800 uppercase tracking-tight">
                  <Users size={18} className="text-brand" /> Lead Inventory
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input 
                      type="text" 
                      placeholder="Search leads..." 
                      className="form-control !w-full sm:!w-64 !py-2 !px-3.5 !text-sm md:!text-base font-bold border-gray-300 rounded-lg shadow-sm"
                      value={activeFilters.search}
                      onChange={(e) => setActiveFilters({ ...activeFilters, search: e.target.value })}
                  />
              </div>
          </div>
          
          <DataTable 
              columns={columns} 
              data={leads} 
              total={total} 
              page={page} 
              onPageChange={setPage} 
              isLoading={isLoading}
          />
      </div>

      <LeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => { setPage(1); fetchLeads(); setIsModalOpen(false); }} 
        lead={leadToEdit}
        masters={masters}
      />

      <UploadLeadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => { fetchLeads(); }}
        masters={masters}
      />

      {/* Bulk Assign Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="bg-[#3b3e47] p-6 flex items-center justify-between text-white">
              <h3 className="text-lg font-bold text-white font-rubik uppercase tracking-tight">Bulk Assign Leads</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronRight className="rotate-90" size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-1.5">
                  <p className="text-sm text-gray-500 mb-4">You are assigning <strong>{selectedLeads.length}</strong> leads to a new user.</p>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Team Member</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold text-[#313a46]"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                  >
                    <option value="">- Choose Member -</option>
                  {masters?.users
                        ?.filter(u => !user || user.role !== 'DM_EXECUTIVE' || u.id !== user.id)
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.role})
                          </option>
                        ))}
                  </select>
               </div>
               <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsBulkModalOpen(false)}
                    className="px-6 py-4 rounded-xl border border-gray-200 text-gray-400 font-bold text-[10px] hover:bg-gray-50 transition-all uppercase tracking-[0.2em]"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={isSubmittingBulk || !targetUserId}
                    onClick={handleBulkAssign}
                    className="flex-1 px-6 py-4 rounded-xl bg-brand text-white font-bold text-[10px] hover:bg-[#004d30] transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-brand/20 disabled:opacity-50"
                  >
                    {isSubmittingBulk ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                    ) : (
                      'Confirm Assignment'
                    )}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadHub;
