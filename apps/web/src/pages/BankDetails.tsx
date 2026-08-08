import React, { useState, useEffect, useCallback } from 'react';
import { Landmark, Plus, Trash2, Edit2, X } from 'lucide-react';
import { leadService } from '../services/api';

interface BankDetail {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  branch: string;
  updatedAt: string;
  updatedBy: string | null;
}

const BankDetails: React.FC = () => {
  const [banks, setBanks] = useState<BankDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankDetail | null>(null);
  const [formData, setFormData] = useState({
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    branch: ''
  });

  const fetchBanks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await leadService.getMasters();
      setBanks(res.bankDetails || []);
    } catch (error) {
      console.error('Error fetching bank details:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanks();
  }, [fetchBanks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBank) {
        await leadService.updateMaster('bankDetail', editingBank.id, formData);
      } else {
        await leadService.createMaster('bankDetail', formData);
      }
      setIsModalOpen(false);
      setEditingBank(null);
      setFormData({ accountHolderName: '', accountNumber: '', bankName: '', branch: '' });
      fetchBanks();
    } catch (error) {
      console.error('Error saving bank detail:', error);
      alert('Failed to save bank detail. Ensure account number is unique.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank detail?')) return;
    try {
      await leadService.deleteMaster('bankDetail', id);
      fetchBanks();
    } catch (error) {
      console.error('Error deleting bank detail:', error);
    }
  };

  const openEdit = (bank: BankDetail) => {
    setEditingBank(bank);
    setFormData({
      accountHolderName: bank.accountHolderName,
      accountNumber: bank.accountNumber,
      bankName: bank.bankName,
      branch: bank.branch
    });
    setIsModalOpen(true);
  };

  return (
    <div className="container-fluid py-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h4 className="page-title text-xl font-bold text-gray-700 m-0">Masters - Bank Details</h4>
          <p className="text-[11px] text-gray-400 font-bold uppercase mt-1 tracking-wider">Manage system bank accounts</p>
        </div>
        <button 
          onClick={() => {
            setEditingBank(null);
            setFormData({ accountHolderName: '', accountNumber: '', bankName: '', branch: '' });
            setIsModalOpen(true);
          }}
          className="btn-custom !rounded-full !px-5 !py-2 text-[11px] flex items-center gap-2"
        >
          <Plus size={16} /> Create New
        </button>
      </div>

      <div className="card-box !p-0 overflow-hidden border border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fa] border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Account Holder Name</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Account Number</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bank Name</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Updated On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="inline-block w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                  </td>
                </tr>
              ) : banks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic text-sm">No bank details found</td>
                </tr>
              ) : banks.map((bank) => (
                <tr key={bank.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(bank)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(bank.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-700">{bank.accountHolderName}</td>
                  <td className="px-6 py-4 text-sm text-brand font-medium">{bank.accountNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{bank.bankName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{bank.branch}</td>
                  <td className="px-6 py-4 text-[11px] text-gray-400 font-bold uppercase">
                    {new Date(bank.updatedAt).toLocaleDateString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="bg-[#3b3e47] p-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Landmark size={18} className="text-white" />
                </div>
                <h4 className="text-sm font-bold uppercase m-0 tracking-wider">
                  {editingBank ? 'Edit Bank Detail' : 'Add Bank Detail'}
                </h4>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Holder Name</label>
                <input 
                  required
                  type="text" 
                  className="form-control !py-2 !text-sm"
                  value={formData.accountHolderName}
                  onChange={(e) => setFormData({...formData, accountHolderName: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Number</label>
                <input 
                  required
                  type="text" 
                  className="form-control !py-2 !text-sm"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bank Name</label>
                <input 
                  required
                  type="text" 
                  className="form-control !py-2 !text-sm"
                  value={formData.bankName}
                  onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Branch</label>
                <input 
                  required
                  type="text" 
                  className="form-control !py-2 !text-sm"
                  value={formData.branch}
                  onChange={(e) => setFormData({...formData, branch: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-gray-50 text-gray-500 font-bold text-[11px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-brand text-white font-bold text-[11px] uppercase tracking-widest hover:bg-[#004d30] shadow-lg shadow-brand/20 transition-all"
                >
                  {editingBank ? 'Update Detail' : 'Save Detail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankDetails;
