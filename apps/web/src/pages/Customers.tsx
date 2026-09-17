import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import { leadService } from '../services/api';
import type { Lead, MasterData } from '../types/crm';
import { 
  Users, 
  FileUp, 
  ChevronRight 
} from 'lucide-react';

const Customers: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  
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
      // Find 'Order Booked' status ID
      const orderBookedStatus = masters?.statuses.find(s => s.name === 'Order Booked');
      
      const res = await leadService.getLeads({ 
        page, 
        limit: 10,
        ...activeFilters,
        statusIds: orderBookedStatus ? [orderBookedStatus.id] : undefined
      });
      setLeads(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, activeFilters, masters]);

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    if (masters) {
      fetchLeads();
    }
  }, [fetchLeads, masters]);

  const handleApplyFilters = () => {
    setActiveFilters((prev: any) => ({
      ...prev,
      ...tempFilters
    }));
    setPage(1);
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
      header: 'Booking Date', 
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
        header: 'Customer ID', 
        accessor: 'leadId',
        render: (row: Lead) => <span className="text-xs text-gray-500 font-bold">CUST-{row.leadId}</span>
    },
    { 
      header: 'Customer Name', 
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
      header: 'Fulfillment', 
      accessor: 'status',
      render: (row: Lead) => (
        <div className="flex flex-col">
          <span className="bg-green-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold uppercase w-fit">
            Booked
          </span>
          <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">
            {row.source?.name || 'Manual'}
          </span>
        </div>
      )
    },
    {
        header: 'Relationship Manager',
        accessor: 'assignedTo',
        render: (row: Lead) => (
            <span className="text-[11px] font-medium text-gray-600">
                {row.assignedTo?.fullName || <span className="text-gray-300 italic">Unassigned</span>}
            </span>
        )
    },
    {
      header: 'Action',
      accessor: 'actions',
      render: () => (
        <button className="text-gray-400 hover:text-brand transition-colors">
          <ChevronRight size={16} />
        </button>
      )
    }
  ];

  const handleExport = () => {
    if (leads.length === 0) return;
    
    const csvContent = [
      ['Date', 'Customer ID', 'Name', 'Phone', 'Email', 'Brand', 'Project', 'Manager'],
      ...leads.map(l => [
        new Date(l.createdAt).toLocaleDateString(),
        `CUST-${l.leadId}`,
        l.name,
        l.phone,
        l.email || '-',
        l.brand?.name || '-',
        l.project?.name || '-',
        l.assignedTo?.fullName || 'Unassigned'
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `customer_list_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container-fluid py-4">
      {/* Header Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h4 className="page-title text-xl font-bold text-gray-700 m-0">Customer Management</h4>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleExport}
            className="btn-custom !bg-green-600 hover:!bg-green-700 !rounded-full !px-4 !py-1.5 text-[11px] flex items-center gap-2"
          >
            <FileUp size={14} /> Export Customers
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Brand</label>
            <select 
              className="w-full sm:w-40 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all"
              value={tempFilters.brandId}
              onChange={(e) => setTempFilters({ ...tempFilters, brandId: e.target.value })}
            >
              <option value="">-Select-</option>
              {masters?.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Project Type</label>
            <select 
              className="w-full sm:w-48 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all"
              value={tempFilters.projectId}
              onChange={(e) => setTempFilters({ ...tempFilters, projectId: e.target.value })}
            >
              <option value="">-Select-</option>
              {masters?.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button 
            onClick={handleApplyFilters}
            className="w-full sm:w-auto px-6 py-2 rounded-lg bg-brand text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#004d30] transition-all shadow-lg shadow-brand/10"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedLeads.length > 0 && (
          <div className="bg-gray-800 text-white p-3 rounded mb-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
              <span className="text-xs font-bold">{selectedLeads.length} Customers Selected</span>
              <div className="flex gap-3">
                  <button 
                    onClick={() => setIsBulkModalOpen(true)}
                    className="bg-brand text-white px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-[#004d30] transition-colors"
                  >
                    Reassign Manager
                  </button>
                  <button className="text-gray-400 hover:text-white text-[10px] font-bold uppercase transition-colors" onClick={() => setSelectedLeads([])}>Cancel</button>
              </div>
          </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                  <Users size={14} className="text-brand" /> Active Customer Database
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input 
                      type="text" 
                      placeholder="Search customers..." 
                      className="bg-white border border-gray-200 rounded-lg px-4 py-1.5 text-[11px] font-medium w-full sm:w-64 outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all"
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

      {/* Reassign Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="bg-[#3b3e47] p-6 flex items-center justify-between text-white">
              <h3 className="text-lg font-bold text-white font-rubik uppercase tracking-tight">Reassign Manager</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronRight className="rotate-90" size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-1.5">
                  <p className="text-sm text-gray-500 mb-4">Reassigning <strong>{selectedLeads.length}</strong> customer accounts to a new relationship manager.</p>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Manager</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold text-[#313a46]"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                  >
                    <option value="">- Choose Member -</option>
                    {masters?.users.map(u => (
                      <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
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
                      'Confirm Update'
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

export default Customers;
