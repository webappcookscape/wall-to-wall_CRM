import React, { useState, useEffect } from 'react';
import { leadService } from '../services/api';
import { Plus, Search, Edit2, Trash2, CheckCircle2, X } from 'lucide-react';

interface MasterDataViewProps {
  title: string;
  type: string;
  apiKey: string;
}

const MasterDataView: React.FC<MasterDataViewProps> = ({ title, type, apiKey }) => {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const masters = await leadService.getMasters();
      setItems(masters[apiKey] || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [apiKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await leadService.updateMaster(type, editingItem.id, formData);
      } else {
        await leadService.createMaster(type, formData);
      }
      fetchItems();
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '' });
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await leadService.deleteMaster(type, id);
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const filteredItems = items.filter(item => 
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container-fluid py-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h4 className="page-title text-xl font-bold text-gray-700 m-0">{title}</h4>
           <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">Master Data Management</p>
        </div>
        <button 
          onClick={() => { setEditingItem(null); setFormData({ name: '' }); setIsModalOpen(true); }}
          className="btn-custom !rounded-full !px-5 !py-1.5 text-[11px] flex items-center gap-2"
        >
          <Plus size={16} /> Add New
        </button>
      </div>

      <div className="bg-white border border-gray-100 shadow-sm rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
           <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Search items..." 
                className="bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-xs outline-none w-full focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
           <span className="text-[10px] font-bold text-gray-400 uppercase">Total: {filteredItems.length} Items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-gray-400 italic text-sm">
                    <div className="w-6 h-6 border-2 border-brand border-t-transparent animate-spin rounded-full mx-auto mb-2" />
                    Loading data...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-gray-400 italic text-sm">
                    No items found
                  </td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-bold text-[#313a46]">{item.name}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingItem(item); setFormData({ name: item.name }); setIsModalOpen(true); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="bg-[#3b3e47] p-6 flex items-center justify-between text-white">
              <h3 className="text-lg font-bold font-rubik uppercase tracking-tight">{editingItem ? 'Update' : 'Add New'} {title}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Entry Name</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold text-[#313a46]"
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    placeholder={`Enter ${title.toLowerCase()} name...`}
                  />
               </div>
               <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-4 rounded-xl border border-gray-200 text-gray-400 font-bold text-[10px] hover:bg-gray-50 transition-all uppercase tracking-[0.2em]"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={isSubmitting}
                    type="submit"
                    className="flex-1 px-6 py-4 rounded-xl bg-brand text-white font-bold text-[10px] hover:bg-[#004d30] transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-brand/20 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                    ) : (
                      <>Save Changes <CheckCircle2 size={14} /></>
                    )}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterDataView;
