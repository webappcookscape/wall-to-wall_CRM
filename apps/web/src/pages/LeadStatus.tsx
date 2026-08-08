import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Check,
  AlertCircle,
  Loader2,
  ListFilter
} from 'lucide-react';
import { leadService } from '../services/api';

interface LeadStatusData {
  id: string;
  name: string;
  leadsCount?: number;
}

const LeadStatus: React.FC = () => {
  const [statuses, setStatuses] = useState<LeadStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<LeadStatusData | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStatuses = useCallback(async () => {
    try {
      const result = await leadService.getMasters();
      setStatuses(result.statuses || []);
    } catch (err) {
      console.error(err);
      setError('Could not load lead statuses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    try {
      if (currentStatus) {
        await leadService.updateMaster('leadStatus', currentStatus.id, { name });
      } else {
        await leadService.createMaster('leadStatus', { name });
      }

      fetchStatuses();
      closeModal();
    } catch (err) {
      console.error(err);
      setError('Failed to save status. Name might already exist.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This might affect leads with this status.')) return;

    try {
      await leadService.deleteMaster('leadStatus', id);
      setStatuses(statuses.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
      setError('Could not delete status. It might be in use.');
    }
  };

  const openModal = (status?: LeadStatusData) => {
    if (status) {
      setCurrentStatus(status);
      setName(status.name);
    } else {
      setCurrentStatus(null);
      setName('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentStatus(null);
    setName('');
    setError(null);
  };

  const filteredStatuses = statuses.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Lead Status Management</h1>
            <p className="text-gray-500 mt-1">Configure and manage lead workflow statuses</p>
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-lg font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20"
          >
            <Plus size={18} />
            Add New Status
          </button>
        </div>

        {/* Filters and Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search statuses..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <ListFilter size={16} />
              Total Statuses: {filteredStatuses.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Status Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-20 text-center">
                      <Loader2 className="animate-spin mx-auto text-brand mb-2" size={30} />
                      <span className="text-gray-500 font-medium">Loading statuses...</span>
                    </td>
                  </tr>
                ) : filteredStatuses.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-20 text-center">
                      <p className="text-gray-500 font-medium">No lead statuses found</p>
                    </td>
                  </tr>
                ) : (
                  filteredStatuses.map((status) => (
                    <tr key={status.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-700">{status.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
                          <Check size={10} /> Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openModal(status)}
                            className="p-2 text-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(status.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800">
                {currentStatus ? 'Edit Lead Status' : 'Add New Lead Status'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Status Name
                </label>
                <input
                  autoFocus
                  type="text"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all font-medium"
                  placeholder="e.g. New Lead, Interested, Site Visit..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="mb-6 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-brand text-white rounded-lg font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20"
                >
                  {currentStatus ? 'Update Status' : 'Create Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadStatus;
