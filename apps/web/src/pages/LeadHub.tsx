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
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isSubmittingBulkDelete, setIsSubmittingBulkDelete] = useState(false);
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

  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) return;
    setIsSubmittingBulkDelete(true);
    try {
      const res = await leadService.bulkDeleteLeads(selectedLeads);
      alert(res?.message || `Successfully deleted ${selectedLeads.length} leads completely.`);
      setSelectedLeads([]);
      setIsBulkDeleteModalOpen(false);
      await fetchLeads();
    } catch (error: any) {
      console.error('Error in bulk delete:', error);
      alert(error?.response?.data?.message || 'Failed to bulk delete leads.');
    } finally {
      setIsSubmittingBulkDelete(false);
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
          className="border-gray-300"
        />
      ),
      accessor: 'id',
      render: (row: Lead) => (
        <input 
          type="checkbox" 
          checked={selectedLeads.includes(row.id)}
          onChange={() => toggleSelectOne(row.id)}
          className="border-gray-300"
        />
      )
    },
    { 
      header: 'Date', 
      accessor: 'createdAt',
      render: (row: Lead) => (
        <div className="flex flex-col">
            <span className="font-bold text-gray-700 text-xs">
                {new Date(row.createdAt).toLocaleDateString('en-GB')}
            </span>
            <span className="text-[9px] text-gray-400 uppercase">
                {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
      )
    },
    { 
        header: 'Lead ID', 
        accessor: 'leadId',
        render: (row: Lead) => <span className="text-xs text-gray-500">#{row.leadId}</span>
    },
    { 
      header: 'Lead Details', 
      accessor: 'name',
      render: (row: Lead) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-700 hover:text-brand cursor-pointer text-[13px]">
            {row.name}
          </span>
          <span className="text-[11px] text-brand font-medium">{row.phone}</span>
        </div>
      )
    },
    { 
        header: 'Context', 
        accessor: 'brand',
        render: (row: Lead) => (
            <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-600 uppercase">{row.brand?.name || '-'}</span>
                <span className="text-[10px] text-gray-400">{row.project?.name || '-'}</span>
            </div>
        )
    },
    { 
      header: 'Status & Source', 
      accessor: 'status',
      render: (row: Lead) => (
        <div className="flex flex-col">
          <span className="bg-brand text-white px-1.5 py-0.5 rounded text-[9px] font-bold uppercase w-fit">
            {typeof row.status === 'object' ? row.status?.name || 'Fresh' : row.status || 'Fresh'}
          </span>
          <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">
            {row.source?.name || 'Manual'}
          </span>
        </div>
      )
    },
    ...(user?.role === 'ADMIN' || user?.role === 'BUSINESS_HEAD' ? [{
        header: 'Assigned To',
        accessor: 'assignedTo',
        render: (row: Lead) => (
            <span className="text-[11px] font-medium text-gray-600">
                {row.assignedTo?.fullName || <span className="text-gray-300 italic">Unassigned</span>}
            </span>
        )
    }] : []),
    {
      header: 'Action',
      accessor: 'actions',
      render: (row: Lead) => (
        <div className="flex items-center justify-end gap-2">
          <button 
            type="button"
            title="Edit lead"
            onClick={() => {
              setLeadToEdit(row);
              setIsModalOpen(true);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-brand/15 text-brand hover:bg-brand hover:text-white transition-colors"
          >
            <Edit3 size={14} />
          </button>
          <button 
            type="button"
            title="Delete lead"
            disabled={deletingLeadId === row.id}
            onClick={() => handleDeleteLead(row)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deletingLeadId === row.id ? (
              <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="container-fluid py-4">
      {/* Header Buttons */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <h4 className="page-title text-xl font-bold text-gray-700 m-0">Lead Hub</h4>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full lg:w-auto">
          {isAdmin && (
            <>
              <button
                onClick={handleUpdateProjects}
                className="btn-custom !bg-brand hover:!bg-[#004d30] !rounded-full !px-3 sm:!px-4 !py-1.5 text-[10px] sm:text-[11px] flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <RefreshCw size={14} className="shrink-0" /> <span className="truncate">Update Projects</span>
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-custom !bg-brand hover:!bg-[#004d30] !rounded-full !px-3 sm:!px-4 !py-1.5 text-[10px] sm:text-[11px] flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <FileUp size={14} className="shrink-0" /> <span className="truncate">Custom Upload</span>
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-custom !bg-brand hover:!bg-[#004d30] !rounded-full !px-3 sm:!px-4 !py-1.5 text-[10px] sm:text-[11px] flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <Upload size={14} className="shrink-0" /> <span className="truncate">Upload Lead</span>
              </button>
              <button
                onClick={() => {
                  setLeadToEdit(undefined);
                  setIsModalOpen(true);
                }}
                className="btn-custom !bg-brand hover:!bg-[#004d30] !rounded-full !px-3 sm:!px-4 !py-1.5 text-[10px] sm:text-[11px] flex items-center justify-center gap-1.5 sm:gap-2 col-span-2 sm:col-auto"
              >
                <Plus size={14} className="shrink-0" /> <span className="truncate">Create Lead</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar (Simplified alert-info style) */}
      <div className="bg-[#d9edf7] border border-[#bce8f1] text-[#31708f] p-3 md:p-4 rounded mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-3 md:gap-4">
          <div className="flex flex-col gap-1 w-full md:w-auto">
            <label className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider">Brand</label>
            <select 
              className="form-control !bg-white !w-full md:!w-40 !py-1 !text-[11px]"
              value={tempFilters.brandId}
              onChange={(e) => setTempFilters({ ...tempFilters, brandId: e.target.value })}
            >
              <option value="">-Select-</option>
              {masters?.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full md:w-auto">
            <label className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider">Project</label>
            <select 
              className="form-control !bg-white !w-full md:!w-48 !py-1 !text-[11px]"
              value={tempFilters.projectId}
              onChange={(e) => setTempFilters({ ...tempFilters, projectId: e.target.value })}
            >
              <option value="">-Select-</option>
              {masters?.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button 
            onClick={handleApplyFilters}
            className="btn-custom !w-full md:!w-auto !rounded !py-1 !px-4 text-[11px] bg-brand hover:bg-[#004d30] text-white uppercase font-bold tracking-widest mt-2 md:mt-0"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedLeads.length > 0 && (
          <div className="bg-gray-800 text-white p-3 rounded mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <span className="text-xs font-bold">{selectedLeads.length} Leads Selected</span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setIsBulkModalOpen(true)}
                    className="bg-brand hover:bg-[#004d30] text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1.5"
                  >
                    <Users size={13} /> Bulk Assign
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => setIsBulkDeleteModalOpen(true)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1.5"
                    >
                      <Trash2 size={13} /> Bulk Delete
                    </button>
                  )}
                  <button 
                    className="text-gray-400 hover:text-white px-2 py-1 text-[10px] font-bold uppercase transition-colors ml-auto sm:ml-0" 
                    onClick={() => setSelectedLeads([])}
                  >
                    Cancel
                  </button>
              </div>
          </div>
      )}

      {/* Inventory Table Container */}
      <div className="card-box !p-0 overflow-hidden">
          <div className="px-4 py-3 bg-[#f8f9fa] border-b border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase">
                  <Users size={14} /> Lead Inventory
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input 
                      type="text" 
                      placeholder="Search..." 
                      className="form-control !w-full sm:!w-48 !py-1 !px-3 !text-[11px]"
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
        onSuccess={() => { fetchLeads(); setIsModalOpen(false); }} 
        lead={leadToEdit}
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
                        .filter(u => u.role !== "DM_EXECUTIVE")
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

      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="bg-red-600 p-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Trash2 size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-rubik uppercase tracking-tight">Bulk Delete Leads</h3>
                  <p className="text-[11px] text-red-100 m-0">Permanent deletion of selected records</p>
                </div>
              </div>
              <button 
                onClick={() => !isSubmittingBulkDelete && setIsBulkDeleteModalOpen(false)} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <ChevronRight className="rotate-90" size={20} />
              </button>
            </div>
            <div className="p-6 md:p-8 space-y-5">
              <div className="bg-red-50 border border-red-200/80 rounded-xl p-4 text-red-800 text-sm">
                <p className="font-bold text-xs uppercase tracking-wider mb-1 text-red-700">Warning: Permanent Action</p>
                <p className="text-xs text-red-600/90 leading-relaxed m-0">
                  You are about to delete <strong className="text-red-900 font-bold">{selectedLeads.length}</strong> lead(s) completely.
                  This will permanently remove all related appointments, showroom visits, activities, and tasks. This action <strong className="underline">cannot be undone</strong>.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  disabled={isSubmittingBulkDelete}
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="px-5 py-3.5 rounded-xl border border-gray-200 text-gray-500 font-bold text-[10px] hover:bg-gray-50 transition-all uppercase tracking-[0.2em] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  disabled={isSubmittingBulkDelete}
                  onClick={handleBulkDelete}
                  className="flex-1 px-5 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {isSubmittingBulkDelete ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Delete {selectedLeads.length} Leads Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Leads Modal */}
      <UploadLeadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchLeads();
          setIsUploadModalOpen(false);
        }}
      />
    </div>
  );
};

export default LeadHub;
