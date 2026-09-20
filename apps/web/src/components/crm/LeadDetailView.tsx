import { useState, type ElementType, type FC } from 'react';
import { 
  Star, 
  User,
  Activity,
  Edit2,
  Trash2,
  MessageSquare,
  MapPin
} from 'lucide-react';
import type { Lead } from '../../types/crm';
import ActionModal from '../modals/ActionModal';
import LeadModal from '../modals/LeadModal';
import { useAuth } from '../../contexts/AuthContext';
import ActivityTimeline from './ActivityTimeline';
import { leadService } from '../../services/api';
import { RATING_OPTIONS, getRatingOption, getRatingLabel, getRatingName } from '../../utils/rating';

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
  const [isUpdatingRating, setIsUpdatingRating] = useState(false);

  const ratingOpt = getRatingOption(lead?.rating, lead?.ratingName);

  // Extract site location and requirement cleanly from lead or comments
  const rawComments = lead?.comments || '';
  const locMatch = rawComments.match(/Location:\s*([^|]+)/i);
  const siteLocation = (lead as any)?.siteLocation || (locMatch ? locMatch[1].trim() : null);

  const reqMatch = rawComments.match(/Requirement:\s*([^|]+)/i);
  const requirement = (lead as any)?.requirement || (reqMatch ? reqMatch[1].trim() : null);

  // Strip out "Location: ..." and "Requirement: ..." so Comments box only shows true comments/message
  const cleanComments = rawComments
    .replace(/Location:\s*[^|]+(\s*\|\s*)?/gi, '')
    .replace(/Requirement:\s*[^|]+(\s*\|\s*)?/gi, '')
    .replace(/^(\s*\|\s*|\s*\/\s*)+|(\s*\|\s*|\s*\/\s*)+$/g, '')
    .trim();

  // Split multi-part comments by slash, pipe, or newlines for clean readability
  const commentSegments = cleanComments
    ? cleanComments.split(/\s*[/|]\s*|\n+/).map(s => s.trim()).filter(Boolean)
    : [];

  const handleRatingChange = async (newRating: number) => {
    if (!lead || !canEditLead || isUpdatingRating) return;
    setIsUpdatingRating(true);
    try {
      const newRatingName = getRatingName(newRating);
      await leadService.updateLead(lead.id, {
        rating: newRating,
        ratingName: newRatingName,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to update lead rating", err);
      alert('Failed to update rating. See console for details.');
    } finally {
      setIsUpdatingRating(false);
    }
  };

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
               <div className="flex text-amber-400 gap-1 items-center">
                 {[1, 2, 3, 4, 5].map((starVal) => {
                   const isFilled = starVal <= (lead.rating || 0);
                   return (
                     <button
                       key={starVal}
                       type="button"
                       disabled={!canEditLead || isUpdatingRating}
                       onClick={() => handleRatingChange(starVal === lead.rating ? 0 : starVal)}
                       title={canEditLead ? `Click to set rating: ${getRatingLabel(starVal)}` : getRatingLabel(lead.rating, lead.ratingName)}
                       className={`${canEditLead ? 'cursor-pointer hover:scale-125 transition-transform' : 'cursor-default'} p-0.5 focus:outline-none`}
                     >
                       <Star 
                         size={18} 
                         fill={isFilled ? "currentColor" : "none"} 
                         className={isFilled ? "text-amber-500" : "text-gray-300 hover:text-amber-300"} 
                       />
                     </button>
                   );
                 })}
               </div>
               <div className="flex items-center gap-1.5">
                 {ratingOpt ? (
                   <span className={`text-xs font-black px-2.5 py-0.5 rounded border uppercase tracking-wider ${ratingOpt.badgeBg} ${ratingOpt.textColor}`}>
                     {ratingOpt.label}
                   </span>
                 ) : (
                   <span className="text-xs font-black text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                     {lead.rating ? `Rating (${lead.rating}/5)` : 'Not Rated'}
                   </span>
                 )}
               </div>
            </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-5">
            <div className="space-y-1">
               <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Source</label>
               <p className="text-sm md:text-base font-bold text-gray-800 m-0">{lead.source?.name || lead.leadType || 'Direct Lead'}</p>
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
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Lead Rating</label>
              {canEditLead ? (
                <select 
                  className={`form-control !py-1 !px-2.5 text-xs md:text-sm font-bold border rounded-lg outline-none transition-all cursor-pointer ${ratingOpt?.badgeBg || 'bg-gray-50 border-gray-200'} ${ratingOpt?.textColor || 'text-gray-800'}`}
                  value={lead.rating || 0}
                  disabled={isUpdatingRating}
                  onChange={(e) => handleRatingChange(Number(e.target.value))}
                >
                  <option value={0}>Select Rating</option>
                  {RATING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`px-2.5 py-1 rounded-lg text-xs md:text-sm font-black border ${ratingOpt?.badgeBg || 'bg-gray-50 border-gray-200'} ${ratingOpt?.textColor || 'text-gray-800'}`}>
                    ★ {ratingOpt?.label || (lead.rating ? `${lead.rating} - ${lead.ratingName || 'Rated'}` : 'Not Rated')}
                  </span>
                </div>
              )}
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
           {siteLocation && (
             <div className="space-y-1">
               <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                 <MapPin size={12} className="text-brand" /> Site Location
               </label>
               <p className="text-sm md:text-base font-bold text-gray-800 m-0">{siteLocation}</p>
             </div>
           )}
           {requirement && (
             <div className="space-y-1">
               <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Requirement</label>
               <p className="text-sm md:text-base font-bold text-gray-800 m-0">{requirement}</p>
             </div>
           )}
            {commentSegments.length > 0 && (
              <div className="space-y-1.5 col-span-2 md:col-span-3 mt-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-brand" /> Comments & Message
                </label>
                <div className="space-y-2 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/70 shadow-xs">
                  {commentSegments.map((seg, idx) => (
                    <div key={idx} className="text-sm md:text-base font-semibold text-gray-800 flex items-start gap-2">
                      {commentSegments.length > 1 && (
                        <span className="h-2 w-2 rounded-full bg-brand mt-2 shrink-0" />
                      )}
                      <span>{seg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
