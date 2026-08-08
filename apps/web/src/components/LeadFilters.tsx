import React from 'react';
import type { MasterData } from '../types/crm';
import { X, Filter, Calendar, Users, Briefcase, Tag, Target, MapPin } from 'lucide-react';

interface LeadFiltersProps {
  masters: MasterData;
  filters: any;
  setFilters: (filters: any) => void;
  onApply: () => void;
  onClear: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const LeadFilters: React.FC<LeadFiltersProps> = ({
  masters,
  filters,
  setFilters,
  onApply,
  onClear,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const handleMultiSelect = (key: string, id: string) => {
    const current = filters[key] || [];
    if (current.includes(id)) {
      setFilters({ ...filters, [key]: current.filter((i: string) => i !== id) });
    } else {
      setFilters({ ...filters, [key]: [...current, id] });
    }
  };

  return (
    <div className="bg-white border-b border-[#e3eaef] shadow-sm animate-in slide-in-from-top duration-300 overflow-hidden">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-brand">
            <Filter size={20} />
            <h3 className="font-bold uppercase tracking-wider text-sm">Advanced Filters</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & Project */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                <Target size={14} /> Brands
              </label>
              <div className="flex flex-wrap gap-2">
                {masters.brands.map(brand => (
                  <button
                    key={brand.id}
                    onClick={() => handleMultiSelect('brandIds', brand.id)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      filters.brandIds?.includes(brand.id)
                        ? 'bg-brand text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                <Briefcase size={14} /> Projects
              </label>
              <select
                multiple
                value={filters.projectIds || []}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setFilters({ ...filters, projectIds: values });
                }}
                className="w-full text-xs border-gray-200 rounded-md focus:ring-brand focus:border-brand min-h-[100px] p-2"
              >
                {masters.projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & Stage */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                <Tag size={14} /> Lead Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {masters.statuses.map(status => (
                  <label key={status.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filters.statusIds?.includes(status.id)}
                      onChange={() => handleMultiSelect('statusIds', status.id)}
                      className="rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-xs text-gray-600 group-hover:text-gray-900">{status.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                <MapPin size={14} /> Showroom
              </label>
              <select
                className="w-full text-xs border-gray-200 rounded-md focus:ring-brand focus:border-brand p-2"
                onChange={(e) => setFilters({ ...filters, showroomId: e.target.value })}
                value={filters.showroomId || ''}
              >
                <option value="">All Showrooms</option>
                {masters.showrooms.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CRE & Source */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                <Users size={14} /> Assigned To (CRE)
              </label>
              <select
                multiple
                value={filters.assignedToIds || []}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setFilters({ ...filters, assignedToIds: values });
                }}
                className="w-full text-xs border-gray-200 rounded-md focus:ring-brand focus:border-brand min-h-[100px] p-2"
              >
                {masters.users.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                <Calendar size={14} /> Date Range
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 w-8">FROM</span>
                  <input
                    type="date"
                    className="flex-1 text-xs border-gray-200 rounded-md focus:ring-brand focus:border-brand p-1.5"
                    value={filters.fromDate || ''}
                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 w-8">TO</span>
                  <input
                    type="date"
                    className="flex-1 text-xs border-gray-200 rounded-md focus:ring-brand focus:border-brand p-1.5"
                    value={filters.toDate || ''}
                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex gap-2">
              <button
                onClick={onApply}
                className="flex-1 bg-brand text-white text-xs font-bold py-2.5 rounded shadow-sm hover:bg-brand/90 transition-colors uppercase tracking-widest"
              >
                Apply Filters
              </button>
              <button
                onClick={onClear}
                className="px-4 border border-gray-200 text-gray-500 text-xs font-bold py-2.5 rounded hover:bg-gray-50 transition-colors uppercase tracking-widest"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadFilters;
