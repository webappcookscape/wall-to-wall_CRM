import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, Phone, Shield, Building2, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { leadService } from '../../services/api';
import type { User, Role } from '../../types/crm';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: User | null; // If provided, we're in edit mode
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSuccess, user }) => {
  const [formData, setFormData] = useState<Partial<User> & { password?: string }>({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    role: 'CRE',
    showroomId: '',
    signaturePhotoId: '',
    businessHeadId: '',
    status: true,
    metaAccess: false,
  });
  const [masters, setMasters] = useState<any>(null);
  const [signaturePhotos, setSignaturePhotos] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const data = await leadService.getMasters();
        setMasters(data);
      } catch (error) {
        console.error('Error fetching masters:', error);
      }
    };
    const fetchSignaturePhotos = async () => {
      try {
        const photos = await leadService.getPhotos();
        setSignaturePhotos(photos || []);
      } catch (error) {
        console.error('Error fetching signature photos:', error);
      }
    };

    if (isOpen) {
      fetchMasters();
      fetchSignaturePhotos();
    }
  }, [isOpen]);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'CRE',
        showroomId: user.showroomId || '',
        signaturePhotoId: user.signaturePhotoId || '',
        businessHeadId: user.businessHeadId || '',
        status: user.status ?? true,
        metaAccess: user.metaAccess ?? false,
        password: '',
      });
    } else {
      setFormData({
        fullName: '',
        username: '',
        email: '',
        phone: '',
        role: 'CRE',
        showroomId: '',
        businessHeadId: '',
        status: true,
        metaAccess: false,
        password: '',
      });
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (user?.id) {
        await leadService.updateUser(user.id, formData);
      } else {
        await leadService.createUser(formData as any);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      const message = error.response?.data?.message || 'Failed to save user. Please check if the username or email already exists.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#3b3e47] p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white/10 rounded-lg">
                <UserPlus className="w-6 h-6" />
             </div>
             <div>
                <h3 className="text-lg font-bold text-white font-rubik uppercase tracking-widest leading-none">
                  {user ? 'Edit User Profile' : 'Create New User'}
                </h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-1 font-bold">
                  {user ? 'Modify system access and details' : 'Register a new staff member'}
                </p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          {/* Internal Header */}
          <div className="space-y-6">
             <h4 className="text-[10px] font-bold text-brand uppercase tracking-[0.2em] border-b border-brand/10 pb-2">Identity Details</h4>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                     <UserIcon size={12} className="text-brand" /> Full Name <span className="text-brand font-bold">*</span>
                   </label>
                   <input
                     required
                     type="text"
                     className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm font-medium bg-gray-50/30 transition-all font-rubik"
                     value={formData.fullName}
                     onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                     placeholder="John Doe"
                   />
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                     <Shield size={12} className="text-brand" /> Username <span className="text-brand font-bold">*</span>
                   </label>
                   <input
                     required
                     type="text"
                     className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm font-medium bg-gray-50/30 transition-all font-rubik"
                     value={formData.username}
                     onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                     placeholder="johndoe123"
                   />
                 </div>
             </div>
          </div>

          <div className="space-y-6">
             <h4 className="text-[10px] font-bold text-brand uppercase tracking-[0.2em] border-b border-brand/10 pb-2">Contact Information</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                     <Mail size={12} className="text-brand" /> Email Address <span className="text-brand font-bold">*</span>
                   </label>
                   <input
                     required
                     type="email"
                     className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm font-medium bg-gray-50/30 transition-all font-roboto"
                     value={formData.email}
                     onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                     placeholder="john@cookscape.com"
                   />
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                     <Phone size={12} className="text-brand" /> Mobile Number
                   </label>
                   <input
                     type="tel"
                     className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm font-medium bg-gray-50/30 transition-all font-roboto"
                     value={formData.phone || ''}
                     onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                     placeholder="+91 98765 43210"
                   />
                 </div>
             </div>
          </div>

          <div className="space-y-6">
             <h4 className="text-[10px] font-bold text-brand uppercase tracking-[0.2em] border-b border-brand/10 pb-2">Access & Permissions</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                     <Shield size={12} className="text-brand" /> Assigned Role <span className="text-red-500">*</span>
                   </label>
                   <select
                     required
                     className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm font-bold bg-gray-50/30 transition-all font-rubik uppercase appearance-none"
                     value={formData.role}
                     onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                   >
                     <option value="CRE">CRE</option>
                     <option value="ADMIN">Admin</option>
                     <option value="BUSINESS_HEAD">Business Head</option>
                     <option value="DM_EXECUTIVE">DM Executive</option>
                     <option value="DESIGNER">Designer</option>
                   </select>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                     <Building2 size={12} className="text-brand" /> Active Showroom
                   </label>
                   <select
                     className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm font-bold bg-gray-50/30 transition-all font-rubik uppercase appearance-none"
                     value={formData.showroomId || ''}
                     onChange={(e) => setFormData({ ...formData, showroomId: e.target.value })}
                   >
                     <option value="">Select Showroom</option>
                     {masters?.showrooms?.map((showroom: any) => (
                       <option key={showroom.id} value={showroom.id}>{showroom.name}</option>
                     ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Lock size={12} className="text-brand" /> E-Signature Photo
                    </label>
                    <select
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm font-bold bg-gray-50/30 transition-all font-rubik uppercase appearance-none"
                      value={formData.signaturePhotoId || ''}
                      onChange={(e) => setFormData({ ...formData, signaturePhotoId: e.target.value })}
                    >
                      <option value="">Select Signature</option>
                      {signaturePhotos.map((photo) => (
                        <option key={photo.id} value={photo.id}>{photo.name}</option>
                      ))}
                    </select>
                  </div>

                  {['CRE', 'DESIGNER', 'DM_EXECUTIVE'].includes(formData.role || '') && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <UserIcon size={12} className="text-brand" /> Business Head
                      </label>
                      <select
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm font-bold bg-gray-50/30 transition-all font-rubik uppercase appearance-none"
                        value={formData.businessHeadId || ''}
                        onChange={(e) => setFormData({ ...formData, businessHeadId: e.target.value })}
                      >
                        <option value="">Select Business Head</option>
                        {masters?.users?.filter((u: any) => u.role === 'BUSINESS_HEAD').map((head: any) => (
                          <option key={head.id} value={head.id}>{head.fullName}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.role === 'DM_EXECUTIVE' && (
                    <div className="space-y-1.5 md:col-span-2 flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 mt-2">
                      <div className="flex-1">
                        <p className="text-[11px] font-extrabold text-[#313a46] font-rubik uppercase tracking-wider leading-none">Enable Meta Access</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-bold">Allow this DM Executive to input Facebook/Meta details on leads</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, metaAccess: !formData.metaAccess })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.metaAccess ? 'bg-brand' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.metaAccess ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  )}
              </div>
          </div>

            <div className="space-y-6">
               <h4 className="text-[10px] font-bold text-brand uppercase tracking-[0.2em] border-b border-brand/10 pb-2">Security</h4>
               <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={user ? "Type a new password to reset it (leave blank to keep current)" : "Enter custom password or leave blank for default"}
                    className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm font-medium bg-gray-50/30 transition-all font-rubik"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <p className="mt-2 text-[10px] text-gray-400 font-bold italic">
                    {user ? "Note: Only type a password here if you want to overwrite their existing password." : "Note: If left blank, the default password 'Welcome@123' will be used."}
                  </p>
               </div>
            </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
             <div className="flex-1">
                <p className="text-[11px] font-extrabold text-[#313a46] font-rubik uppercase tracking-wider leading-none">Account Status</p>
                <p className="text-[10px] text-gray-400 mt-1 font-bold">Determine if this user can currently login</p>
             </div>
             <button
               type="button"
               onClick={() => setFormData({ ...formData, status: !formData.status })}
               className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.status ? 'bg-brand' : 'bg-gray-200'}`}
             >
               <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.status ? 'translate-x-6' : 'translate-x-1'}`} />
             </button>
          </div>
        </form>

        <div className="p-6 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
           <button 
             type="button"
             onClick={onClose}
             className="px-6 py-2 rounded text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
           >
             Cancel
           </button>
           <button 
             onClick={handleSubmit}
             disabled={isSubmitting}
             className="bg-[#3b3e47] text-white px-8 py-2 rounded text-[11px] font-bold uppercase tracking-widest hover:bg-[#2c2f36] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {isSubmitting ? 'Saving...' : user ? 'Update Profile' : 'Create User'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
