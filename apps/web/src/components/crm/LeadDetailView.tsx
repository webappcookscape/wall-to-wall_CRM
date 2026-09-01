import { useState, type ElementType, type FC } from 'react';
import { 
  Star, 
  User,
  Activity,
  Edit2,
  Trash2,
  Bell,
  UserCheck
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
    className={`${color} text-white px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold uppercase flex items-center justify-center gap-2 hover:opacity-90 shadow-sm transition-all`}
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
  const isFreshLead = statusName.trim().toLowerCase() === 'fresh';
  const isOwnerOrAssignee = lead ? (lead.assignedToId === currentUser?.id || lead.createdById === currentUser?.id) : false;

  let canEditLead = false;
  if (currentUser?.role === 'ADMIN') {
    canEditLead = true;
  } else if (currentUser?.role === 'BUSINESS_HEAD' && lead) {
    canEditLead = isOwnerOrAssignee;
  } else if (isDmEmployee && lead) {
    canEditLead = isFreshLead && isOwnerOrAssignee;
  }
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
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white border border-gray-100 rounded-xl shadow-sm p-12">
        <User size={64} className="opacity-20 mb-4" />
        <h4 className="text-sm md:text-base font-bold uppercase tracking-widest text-gray-500">Select a lead to view details</h4>
      </div>
    );
  }

  return (
    <div className="h-full bg-white border border-gray-200/80 shadow-sm overflow-y-auto rounded-xl">
      {/* Header Info */}
      <div className="p-5 md:p-6 border-b border-gray-100 bg-gray-50/40">
        <div className="flex justify-between items-start mb-6">
           <div className="space-y-1.5">
              <h2 className="text-2xl md:text-3xl font-black text-gray-800 m-0 font-rubik tracking-tight">{lead.name}</h2>
              <div className="text-sm md:text-base font-bold text-gray-700 flex flex-wrap items-center gap-3">
                 <span className="text-brand font-semibold">{lead.phone}</span>
                 {lead.email && <span className="text-gray-500 font-medium">· {lead.email}</span>}
                 {lead.orderValue && (
                   <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-0.5 rounded-full text-xs font-black">
                     Order Value: ₹{lead.orderValue.toLocaleString()}
                   </span>
                 )}
              </div>
           </div>
           
           <div className="flex flex-col items-end gap-1.5 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex text-warning gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < (lead.rating || 0) ? "currentColor" : "none"} />
                ))}
              </div>
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Rating ({lead.rating}/5)</span>
           </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-6">
           <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Lead Type</label>
              <p className="text-sm md:text-base font-bold text-gray-800 m-0">{lead.leadType || 'Direct Lead'}</p>
           </div>
           <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Created By</label>
              <p className="text-sm md:text-base font-bold text-gray-800 m-0">{lead.createdBy?.fullName || '-'}</p>
           </div>
           <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Assigned To</label>
              <p className="text-sm md:text-base font-bold text-gray-800 m-0">{lead.assignedTo?.fullName || '-'}</p>
           </div>
           <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Status</label>
              <p className="text-sm md:text-base font-extrabold text-brand uppercase tracking-wide m-0">{statusName}</p>
           </div>
           <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Date Collected</label>
              <p className="text-sm md:text-base font-bold text-gray-800 m-0">{lead.dataCollected ? new Date(lead.dataCollected).toLocaleDateString() : '-'}</p>
           </div>
           <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Contactable Date & Time</label>
              <p className="text-sm md:text-base font-bold text-gray-800 m-0">
                {lead.contactableDate ? new Date(lead.contactableDate).toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true 
                }) : '-'}
              </p>
           </div>
            <div className="space-y-1.5 col-span-2 md:col-span-3 mt-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Instructions</label>
              <p className="text-sm md:text-base font-medium text-gray-800 bg-white p-3.5 rounded-xl border border-gray-200/80 italic leading-relaxed m-0 whitespace-pre-wrap break-words">{lead.instructionToPass || 'No instructions provided'}</p>
            </div>
            {(lead.metaLeadId || lead.metaCampaignId || lead.metaAdId || lead.metaFormId || lead.metaAdAccountId) && (
              <div className="col-span-2 md:col-span-3 mt-2 bg-blue-50/60 p-4 rounded-xl border border-blue-200/80 shadow-sm">
                 <div className="flex items-center gap-2 mb-3">
                   <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                   <label className="text-xs md:text-sm font-black text-blue-900 uppercase tracking-wider font-rubik">Meta / Facebook Lead Details</label>
                 </div>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs md:text-sm">
                   {lead.metaLeadId && (
                     <div>
                       <span className="text-blue-700/80 font-bold block text-[11px] uppercase tracking-wider">Lead ID</span>
                       <span className="font-mono text-gray-900 font-bold">{lead.metaLeadId}</span>
                     </div>
                   )}
                   {lead.metaCampaignId && (
                     <div>
                       <span className="text-blue-700/80 font-bold block text-[11px] uppercase tracking-wider">Campaign ID</span>
                       <span className="font-mono text-gray-900 font-bold">{lead.metaCampaignId}</span>
                     </div>
                   )}
                   {lead.metaFormId && (
                     <div>
                       <span className="text-blue-700/80 font-bold block text-[11px] uppercase tracking-wider">Form ID</span>
                       <span className="font-mono text-gray-900 font-bold">{lead.metaFormId}</span>
                     </div>
                   )}
                   {lead.metaAdId && (
                     <div>
                       <span className="text-blue-700/80 font-bold block text-[11px] uppercase tracking-wider">Ad ID</span>
                       <span className="font-mono text-gray-900 font-bold">{lead.metaAdId}</span>
                     </div>
                   )}
                   {lead.metaAdAccountId && (
                     <div>
                       <span className="text-blue-700/80 font-bold block text-[11px] uppercase tracking-wider">Ad Account ID</span>
                       <span className="font-mono text-gray-900 font-bold">{lead.metaAdAccountId}</span>
                     </div>
                   )}
                 </div>
              </div>
            )}
            {lead.brand?.logo && (
              <div className="col-span-2 md:col-span-3 mt-1 pt-3 border-t border-gray-100">
                 <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Associated Brand</label>
                 <img src={lead.brand.logo} alt={lead.brand.name} className="h-14 object-contain" />
              </div>
            )}
        </div>
      </div>

      <div className="p-5 md:p-6 space-y-6">
        {/* Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
           {canEditLead && (
             <ActionButton icon={Edit2} label="Edit" color="bg-brand" onClick={() => setIsEditModalOpen(true)} />
           )}
           {!isDmEmployee && (
             <>
               <ActionButton icon={Activity} label="Followup" color="bg-secondary" onClick={() => setModalType('FOLLOWUP')} />
               <ActionButton icon={Bell} label="Reminder" color="bg-amber-500" onClick={() => setModalType('REMINDER')} />
             </>
           )}
           {(currentUser?.role === 'ADMIN' || currentUser?.role === 'BUSINESS_HEAD') && (
             <ActionButton icon={UserCheck} label="Reassign" color="bg-indigo-600" onClick={() => setModalType('SWITCH_USER')} />
           )}
           {currentUser?.role === 'ADMIN' && (
             <ActionButton icon={Trash2} label="Delete" color="bg-danger" onClick={handleDelete} />
           )}
        </div>

        <div className="pt-4 border-t border-gray-100">
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
