import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Phone, Shield, Calendar, MapPin } from 'lucide-react';

const Profile: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="container-fluid py-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header/Cover */}
                <div className="h-32 bg-brand/10 relative">
                    <div className="absolute -bottom-12 left-8">
                        <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-md border border-gray-100">
                             <div className="w-full h-full rounded-xl bg-brand flex items-center justify-center text-white text-3xl font-bold uppercase">
                                {user?.fullName?.charAt(0)}
                             </div>
                        </div>
                    </div>
                </div>

                <div className="pt-14 sm:pt-16 pb-8 px-6 sm:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{user?.fullName}</h1>
                            <p className="text-brand font-bold text-[10px] sm:text-xs uppercase tracking-widest">{user?.role} Profile</p>
                        </div>
                        <button className="w-full sm:w-auto px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors uppercase tracking-tight">
                            Edit Profile
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                        {/* Account Info */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <User size={16} className="text-brand" /> Account Details
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                        <Mail size={18} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase m-0">Email Address</p>
                                        <p className="text-sm font-bold text-gray-700 m-0">{user?.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                        <Phone size={18} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase m-0">Phone Number</p>
                                        <p className="text-sm font-bold text-gray-700 m-0">{user?.phone || 'Not provided'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* System Info */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Shield size={16} className="text-brand" /> Permissions & Access
                            </h3>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                        <Calendar size={18} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase m-0">Member Since</p>
                                        <p className="text-sm font-bold text-gray-700 m-0">April 2026</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                        <MapPin size={18} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase m-0">Default Showroom</p>
                                        <p className="text-sm font-bold text-gray-700 m-0">Chennai HQ</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-100">
                         <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 flex items-start gap-4">
                            <Shield className="text-amber-500 mt-1" size={20} />
                            <div>
                                <h4 className="text-sm font-bold text-amber-900 m-0">Security Notice</h4>
                                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                    Your account is protected by role-based access control. As an <strong>{user?.role}</strong>, you have access to administrative configurations and team management features.
                                </p>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
