import { useState, useEffect, useCallback } from 'react';
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  UserX, 
  UserCheck,
  Mail,
  Smartphone,
  Shield,
  Building2,
  Calendar,
  Trash2
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

  const handleToggleStatus = async (user: User) => {
    try {
      await leadService.updateUser(user.id, { status: !user.status });
      fetchUsers();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      alert(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete "${user.fullName}" (@${user.username})?`)) {
      return;
    }

    try {
      await leadService.deleteUser(user.id);
      fetchUsers();
    } catch (error: any) {
      if (error.response?.status === 409 && error.response?.data?.hasAssignedProjects) {
        const data = error.response.data;
        const confirmForce = window.confirm(
          `⚠️ ASSIGNED LEADS/PROJECTS FOUND!\n\n` +
          `"${user.fullName}" is currently assigned to ${data.count} lead(s) in project(s):\n` +
          `👉 ${data.projects?.length > 0 ? data.projects.join(', ') : 'General Projects'}\n\n` +
          `Click OK to FORCE delete and unassign all these leads, or Cancel to reassign them manually.`
        );
        if (confirmForce) {
          try {
            await leadService.deleteUser(user.id, true);
            fetchUsers();
          } catch (forceError: any) {
            alert(forceError.response?.data?.message || 'Failed to force delete user');
          }
        }
      } else {
        console.error('Error deleting user:', error);
        alert(error.response?.data?.message || 'Failed to delete user');
      }
    }
  };

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
      case 'DM_EXECUTIVE': return 'bg-sky-50 text-sky-600 border-sky-100';
      case 'FA': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'LA': return 'bg-teal-50 text-teal-600 border-teal-100';
      case 'VENDOR_MANAGEMENT': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'CLIENT_FACILITATOR': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-black text-[#313a46] font-rubik tracking-tight uppercase flex items-center gap-3">
             <div className="p-2.5 bg-brand/10 rounded-xl text-brand">
                <UsersIcon size={26} />
             </div>
             User Management
          </h2>
          <p className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest ml-14">System Access Control & Staff Directory</p>
        </div>
        
        <button 
          onClick={() => { setSelectedUser(null); setIsModalOpen(true); }}
          className="bg-brand text-white px-6 py-3 rounded-xl text-xs md:text-sm font-extrabold uppercase tracking-[0.12em] font-rubik hover:bg-[#004d30] transition-all shadow-lg shadow-brand/20 flex items-center gap-2 group"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Create New User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#e3eaef] overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 md:p-5 border-b border-gray-100 bg-gray-50/60 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search by name, username or email..."
                className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm md:text-base focus:border-brand focus:ring-1 focus:ring-brand transition-all font-medium text-gray-700 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>

           <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-gray-300">
                <Filter size={16} className="text-gray-500" />
                <select 
                  className="text-xs md:text-sm font-bold uppercase tracking-wider text-gray-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="BUSINESS_HEAD">Business Head</option>
                  <option value="DM_EXECUTIVE">DM Executive</option>
                  <option value="FA">FA</option>
                  <option value="LA">LA</option>
                  <option value="VENDOR_MANAGEMENT">Vendor Management</option>
                  <option value="CLIENT_FACILITATOR">Client Facilitator</option>
                </select>
              </div>
           </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-6 py-4 text-xs md:text-sm font-black text-gray-600 uppercase tracking-wider font-rubik">Profile & Info</th>
                <th className="px-6 py-4 text-xs md:text-sm font-black text-gray-600 uppercase tracking-wider font-rubik">Role & Showroom</th>
                <th className="px-6 py-4 text-xs md:text-sm font-black text-gray-600 uppercase tracking-wider font-rubik">Contact Details</th>
                <th className="px-6 py-4 text-xs md:text-sm font-black text-gray-600 uppercase tracking-wider font-rubik text-center">Status</th>
                <th className="px-6 py-4 text-xs md:text-sm font-black text-gray-600 uppercase tracking-wider font-rubik text-center">Signature</th>
                <th className="px-6 py-4 text-xs md:text-sm font-black text-gray-600 uppercase tracking-wider font-rubik text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8">
                       <div className="h-4 bg-gray-100 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                     <div className="flex flex-col items-center gap-4 opacity-50">
                        <UsersIcon size={48} className="text-gray-300" />
                        <p className="text-base font-bold text-gray-400 font-rubik uppercase tracking-widest">No users found matching your criteria</p>
                     </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand/10 to-brand/20 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden text-brand font-black text-lg">
                          {user.avatar ? (
                            <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            user.fullName.charAt(0)
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-extrabold text-[#313a46] font-rubik text-base leading-snug">{user.fullName}</p>
                          <p className="text-xs md:text-sm font-semibold text-gray-400 font-rubik">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        <span className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider border inline-flex items-center gap-1 ${getRoleBadgeColor(user.role)}`}>
                          <Shield size={12} className="-mt-0.5" /> {user.role.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Building2 size={14} className="opacity-70 text-gray-400" />
                          <span className="text-xs md:text-sm font-semibold font-rubik">{user.showroom?.name || 'Unassigned'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-gray-600 group-hover:text-brand transition-colors">
                          <Mail size={14} className="opacity-70 text-gray-400" />
                          <span className="text-xs md:text-sm font-semibold font-roboto">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Smartphone size={14} className="opacity-70 text-gray-400" />
                          <span className="text-xs md:text-sm font-semibold font-roboto">{user.phone || 'No phone'}</span>
                        </div>
                      </div>
                    </td>
                     <td className="px-6 py-5 text-center">
                        <div className="flex flex-col items-center gap-1">
                           <span className={`w-3 h-3 rounded-full ${user.status ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`} />
                           <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">{user.status ? 'Active' : 'Inactive'}</span>
                        </div>
                     </td>
                     <td className="px-6 py-5">
                        <div className="flex justify-center">
                           {user.signaturePhoto ? (
                             <div className="h-10 w-24 bg-gray-50 rounded-lg border border-gray-200 p-1 flex items-center justify-center">
                               <img 
                                 src={`${API_ROOT}${user.signaturePhoto.path}`} 
                                 className="max-h-full max-w-full object-contain" 
                                 alt="Signature" 
                               />
                             </div>
                           ) : (
                             <span className="text-xs text-gray-400 italic">No Signature</span>
                           )}
                        </div>
                     </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedUser(user); setIsModalOpen(true); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200" 
                          title="Edit User"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(user)}
                          className={`p-2 rounded-lg transition-colors border border-transparent ${user.status ? 'text-amber-600 hover:bg-amber-50 hover:border-amber-200' : 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200'}`}
                          title={user.status ? 'Deactivate User' : 'Activate User'}
                        >
                          {user.status ? <UserX size={18} /> : <UserCheck size={18} />}
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200" 
                          title="Delete User"
                        >
                          <Trash2 size={18} />
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
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs md:text-sm font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-2 font-rubik">
               <Calendar size={15} /> Registered Users: {filteredUsers.length}
            </p>
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
