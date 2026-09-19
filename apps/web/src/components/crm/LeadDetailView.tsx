import { useState, type ElementType, type FC } from 'react';
import { 
  Star, 
  User,
  Activity,
  Edit2,
  Trash2
} from 'lucide-react';
import type { Lead } from '../../types/crm';
import ActionModal from '../modals/ActionModal';
import LeadModal from '../modals/LeadModal';
import { useAuth } from '../../contexts/AuthContext';
import ActivityTimeline from './ActivityTimeline';
import { leadService } from '../../services/api';

interface LeadDetailViewProps {
  lead: Lead | null;
  onRefresh?: () => void;
}

interface ActionButtonProps {
  icon: ElementType;
  label: string;
  color?: string;
  onClick: () => void;
}

const ActionButton = ({ icon: Icon, label, color = 'bg-brand', onClick }: ActionButtonProps) => (
  <button 
    onClick={onClick}
    className={`${color} text-white px-4 py-2.5 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-sm active:scale-95`}
  >
     <Icon size={16} /> {label}
  </button>
);

const getLeadStatusName = (lead: Lead | null) => {
  if (!lead?.status) return 'Fresh';
  return typeof lead.status === 'object' ? lead.status.name : lead.status;
};

const LeadDetailView: FC<LeadDetailViewProps> = ({ lead, onRefresh }) => {
  const { user: currentUser } = useAuth();
  const isDmEmployee = currentUser?.role === 'DM_EXECUTIVE';
  const statusName = getLeadStatusName(lead);
  const isOwnerOrAssignee = lead ? (lead.assignedToId === currentUser?.id || lead.createdById === currentUser?.id) : false;

  let canEditLead = false;
  if (currentUser?.role === 'ADMIN') {
    canEditLead = true;
  } else if (lead && ['BUSINESS_HEAD', 'DM_EXECUTIVE', 'CLIENT_FACILITATOR', 'FA'].includes(currentUser?.role || '')) {
    canEditLead = isOwnerOrAssignee;
  }

  const canAssignLead = ['ADMIN', 'BUSINESS_HEAD'].includes(currentUser?.role || '');
  const [modalType, setModalType] = useState<'FOLLOWUP' | 'REMINDER' | 'STATUS' | 'NOTE' | 'SWITCH_USER' | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleDelete = async () => {
    if (!lead) return;
    if (window.confirm('Are you sure you want to delete this lead and all its related data? This action cannot be undone.')) {
        try {
            await leadService.deleteLead(lead.id);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Failed to delete lead", error);
            alert('Failed to delete lead. See console for details.');
        }
    }
  };

  if (!lead) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white border border-gray-100 rounded shadow-sm">
        <User size={48} className="opacity-20 mb-4" />
        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">Select a lead to view details</h4>
      </div>
    );
  }

  return (
    <div className="h-full bg-white border border-gray-100 shadow-sm overflow-y-auto">
      {/* Header Info */}
      <div className="p-5 md:p-6 border-b border-gray-100">
        <div className="flex justify-between items-start mb-5">
           <div className="space-y-1.5">
              <h2 className="text-2xl md:text-3xl font-black text-gray-800 m-0">{lead.name}</h2>
              <div className="text-sm md:text-base font-bold text-gray-700 flex items-center gap-3">
                 <span className="text-brand font-extrabold">{lead.phone}</span>
                 {lead.email && <span className="text-gray-500 font-medium">{lead.email}</span>}
              </div>
           </div>
           
           <div className="flex flex-col items-end gap-1.5">
              <div className="flex text-amber-400 gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < (lead.rating || 0) ? "currentColor" : "none"} />
                ))}
              </div>
              <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Rating ({lead.rating || 0}/5)</span>
           </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-5">
           <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Lead Type</label>
              <p className="text-sm md:text-base font-bold text-gray-800 m-0">{lead.leadType || 'Direct Lead'}</p>
           </div>
           <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Created By</label>
              <p className="text-sm md:text-base font-bold text-gray-800 m-0">{lead.createdBy?.fullName || '-'}</p>
           </div>
           <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Assigned To</label>
              <p className="text-sm md:text-base font-bold text-gray-800 m-0">{lead.assignedTo?.fullName || '-'}</p>
           </div>
           <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Status</label>
              <p className="text-sm md:text-base font-black text-brand uppercase m-0">{statusName}</p>
           </div>
           <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Date Collected</label>
              <p className="text-sm md:text-base font-bold text-gray-800 m-0">{lead.dataCollected ? new Date(lead.dataCollected).toLocaleDateString('en-GB') : '-'}</p>
           </div>
           <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Contactable Date & Time</label>
              <p className="text-sm md:text-base font-bold text-gray-800 m-0">
                {lead.contactableDate ? new Date(lead.contactableDate).toLocaleString('en-GB', { 
                  day: '2-digit',
                  month: 'short', 
                  year: 'numeric',
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                }) : '-'}
              </p>
           </div>
            <div className="space-y-1.5 col-span-2 md:col-span-3 mt-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Instructions</label>
              <p className="text-sm md:text-base font-semibold text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200 m-0 italic">{lead.instructionToPass || 'No instructions provided'}</p>
            </div>
            {lead.brand?.logo && (
              <div className="col-span-2 md:col-span-3 mt-2 pt-2 border-t border-gray-100">
                 <label className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 block">Associated Brand</label>
                 <img src={lead.brand.logo} alt={lead.brand.name} className="h-12 object-contain" />
              </div>
            )}
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-6">
        {/* Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
           {canEditLead && (
             <ActionButton icon={Edit2} label="Edit" color="bg-brand" onClick={() => setIsEditModalOpen(true)} />
           )}
           {canAssignLead && (
             <ActionButton icon={User} label="Assign" color="bg-indigo-600" onClick={() => setModalType('SWITCH_USER')} />
           )}
           {!isDmEmployee && (
             <ActionButton icon={Activity} label="Followup" color="bg-secondary" onClick={() => setModalType('FOLLOWUP')} />
           )}
           {currentUser?.role === 'ADMIN' && (
             <ActionButton icon={Trash2} label="Delete" color="bg-danger" onClick={handleDelete} />
           )}
        </div>

        <div className="pt-4 border-t border-gray-50">
           <ActivityTimeline activities={lead.activities || []} />
        </div>
      </div>

      {modalType && (
        <ActionModal 
          isOpen={true}
          onClose={() => setModalType(null)}
          onSuccess={() => {
            if (onRefresh) onRefresh();
            setModalType(null);
          }}
          lead={lead}
          type={modalType}
        />
      )}

      {canEditLead && (
        <LeadModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
              if (onRefresh) onRefresh();
              setIsEditModalOpen(false);
          }}
          lead={lead}
        />
      )}
    </div>
  );
};

export default LeadDetailView;
