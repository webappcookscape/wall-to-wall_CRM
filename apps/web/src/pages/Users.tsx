import { useState, useEffect, useCallback } from 'react';
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  UserX, 
  UserCheck, 
  MoreVertical,
  Mail,
  Smartphone,
  Shield,
  Building2,
  Calendar
} from 'lucide-react';
import { leadService } from '../services/api';
import type { User, Role } from '../types/crm';
import UserModal from '../components/modals/UserModal';

const Users = () => {
  const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await leadService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case 'ADMIN': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'BUSINESS_HEAD': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'DESIGNER': return 'bg-pink-50 text-pink-600 border-pink-100';
      case 'CRE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'DM_EXECUTIVE': return 'bg-sky-50 text-sky-600 border-sky-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-[#313a46] font-rubik tracking-tight uppercase flex items-center gap-3">
             <div className="p-2 bg-brand/10 rounded-lg text-brand">
                <UsersIcon size={24} />
             </div>
             User Management
          </h2>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-12 italic">System Access Control & Staff Directory</p>
        </div>
        
        <button 
          onClick={() => { setSelectedUser(null); setIsModalOpen(true); }}
          className="bg-brand text-white px-5 py-2.5 rounded text-[11px] font-bold uppercase tracking-[0.15em] font-rubik hover:bg-[#004d30] transition-all shadow-lg shadow-brand/20 flex items-center gap-2 group"
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform" /> Create New User
        </button>
      </div>

      <div className="bg-white rounded shadow-sm border border-[#e3eaef] overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Search by name, username or email..."
                className="w-full pl-10 pr-4 py-2 rounded border border-gray-200 text-sm focus:border-brand-300 focus:ring-1 focus:ring-brand-300 transition-all font-medium text-gray-600 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>

           <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-gray-200">
                <Filter size={14} className="text-gray-400" />
                <select 
                  className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="BUSINESS_HEAD">Business Head</option>
                  <option value="CRE">CRE</option>
                  <option value="DM_EXECUTIVE">DM Executive</option>
                  <option value="DESIGNER">Designer</option>
                </select>
              </div>
           </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest font-rubik">Profile & Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest font-rubik">Role & Showroom</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest font-rubik">Contact Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest font-rubik text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest font-rubik text-center">Signature</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest font-rubik text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8">
                       <div className="h-4 bg-gray-100 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                     <div className="flex flex-col items-center gap-4 opacity-50">
                        <UsersIcon size={48} className="text-gray-300" />
                        <p className="text-sm font-bold text-gray-400 font-rubik uppercase tracking-widest">No users found matching your criteria</p>
                     </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden text-brand font-black text-lg">
                          {user.avatar ? (
                            <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            user.fullName.charAt(0)
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-extrabold text-[#313a46] font-rubik text-sm leading-none">{user.fullName}</p>
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-rubik">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-[0.1em] border ${getRoleBadgeColor(user.role)}`}>
                          <Shield size={10} className="inline mr-1 -mt-0.5" /> {user.role.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Building2 size={12} className="opacity-60" />
                          <span className="text-[11px] font-bold font-rubik">{user.showroom?.name || 'Unassigned'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-gray-500 group-hover:text-brand transition-colors">
                          <Mail size={12} className="opacity-60" />
                          <span className="text-[11px] font-medium font-roboto">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <Smartphone size={12} className="opacity-60" />
                          <span className="text-[11px] font-medium font-roboto">{user.phone || 'No phone'}</span>
                        </div>
                      </div>
                    </td>
                     <td className="px-6 py-5 text-center">
                        <div className="flex flex-col items-center gap-1">
                           <span className={`w-2.5 h-2.5 rounded-full ${user.status ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`} />
                           <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">{user.status ? 'Active' : 'Inactive'}</span>
                        </div>
                     </td>
                     <td className="px-6 py-5">
                        <div className="flex justify-center">
                           {user.signaturePhoto ? (
                             <div className="h-10 w-20 bg-gray-50 rounded border border-gray-100 p-1 flex items-center justify-center">
                               <img 
                                 src={`${API_ROOT}${user.signaturePhoto.path}`} 
                                 className="max-h-full max-w-full object-contain" 
                                 alt="Signature" 
                               />
                             </div>
                           ) : (
                             <span className="text-[10px] text-gray-300 italic">No Signature</span>
                           )}
                        </div>
                     </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedUser(user); setIsModalOpen(true); }}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" 
                          title="Edit User"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className={`p-2 rounded-lg transition-colors border border-transparent ${user.status ? 'text-rose-500 hover:bg-rose-50 hover:border-rose-100' : 'text-emerald-500 hover:bg-emerald-50 hover:border-emerald-100'}`}
                          title={user.status ? 'Deactivate' : 'Activate'}
                        >
                          {user.status ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                           <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        {!isLoading && (
          <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 font-rubik">
               <Calendar size={12} /> Registered Users: {filteredUsers.length}
            </p>
            <div className="flex gap-2">
               {/* Pagination could go here */}
            </div>
          </div>
        )}
      </div>

      <UserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        onSuccess={() => {
          fetchUsers();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};

export default Users;
