import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  CheckCircle, 
  Activity,
  Send,
  User
} from 'lucide-react';
import { leadService } from '../../services/api';
import type { Lead } from '../../types/crm';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lead: Lead;
  type: 'FOLLOWUP' | 'REMINDER' | 'STATUS' | 'NOTE' | 'SWITCH_USER';
}

const ActionModal: React.FC<ActionModalProps> = ({ isOpen, onClose, onSuccess, lead, type }) => {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<any>({
    statusId: lead.statusId || '',
    nextFollowUp: tomorrowStr,
    content: '',
    type: 'NOTE',
    activityType: '',
    smsContent: '',
    reminderSet: true,
    selfAssign: false,
    reminderAssignTo: lead.assignedToId || '',
    targetUserId: '', // For Switch User
    orderValue: lead.orderValue || ''
  });
  const [masters, setMasters] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStatus = masters?.statuses?.find((s: any) => s.id === formData.statusId);
  const isOrderBooked = selectedStatus?.name?.toLowerCase() === 'order booked';

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const data = await leadService.getMasters();
        setMasters(data);
      } catch (error) {
        console.error('Error fetching masters:', error);
      }
    };
    if (isOpen) fetchMasters();
  }, [isOpen]);

  useEffect(() => {
    const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1);
    const defaultDate = tmrw.toISOString().split('T')[0];
    setFormData({
      statusId: lead.statusId || '',
      nextFollowUp: defaultDate,
      content: '',
      type: type === 'FOLLOWUP' ? 'STATUS_CHANGE' : type === 'REMINDER' ? 'NOTE' : 'NOTE',
      activityType: '',
      smsContent: '',
      reminderSet: true,
      reminderAssignTo: lead.assignedToId || '',
      targetUserId: '',
      orderValue: lead.orderValue || ''
    });
  }, [type, lead, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (type === 'SWITCH_USER') {
        if (!formData.targetUserId) throw new Error('Target user required');
        await leadService.assignLead(lead.id, formData.targetUserId);
        onSuccess();
        onClose();
        return;
      }

      let activityContent = formData.content;
      if (type === 'FOLLOWUP') {
        const activityLabel = formData.activityType === 'PHONE' ? 'Phone Call' : formData.activityType === 'EMAIL' ? 'Email Sent' : 'Site Visit';
        activityContent = `[${activityLabel}] ${formData.content}`;
        if (formData.smsContent) {
          activityContent += `\n\nSMS Sent: ${formData.smsContent}`;
        }
        if (formData.reminderSet && formData.nextFollowUp) {
          activityContent += `\n\nNext Reminder: ${formData.nextFollowUp}`;
        }
      } else if (type === 'REMINDER') {
        activityContent = `[Reminder Scheduled for ${formData.nextFollowUp}] ${formData.content}`;
      }

      await leadService.addLeadActivity(lead.id, {
        type: type === 'FOLLOWUP' ? (formData.activityType || 'PHONE') : formData.type || 'NOTE',
        content: activityContent
      });

      if (type === 'FOLLOWUP' || type === 'STATUS' || type === 'REMINDER') {
        const updatePayload: any = {};

        if (type === 'FOLLOWUP' || type === 'STATUS') {
          updatePayload.statusId = formData.statusId;
          updatePayload.nextFollowUp = formData.nextFollowUp || null;
          if (isOrderBooked) {
            updatePayload.orderValue = formData.orderValue !== '' ? Number(formData.orderValue) : null;
          }
        }

        // Update contactableDate on FOLLOWUP or REMINDER when a date is selected
        if ((type === 'FOLLOWUP' && formData.reminderSet && formData.nextFollowUp) || (type === 'REMINDER' && formData.nextFollowUp)) {
          const localMidnight = new Date(formData.nextFollowUp + (formData.nextFollowUp.includes('T') ? '' : 'T00:00:00'));
          updatePayload.contactableDate = isNaN(localMidnight.getTime()) ? formData.nextFollowUp : localMidnight.toISOString();
          updatePayload.assignedToId = formData.reminderAssignTo || undefined;
          if (formData.content) {
            updatePayload.instructionToPass = formData.content;
          }
        }

        if ((type === 'FOLLOWUP' || type === 'REMINDER') && formData.content) {
          updatePayload.instructionToPass = formData.content;
        }

        await leadService.updateLead(lead.id, updatePayload);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error recording action:', error);
      alert('Failed to record action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const getTitle = () => {
    switch (type) {
      case 'FOLLOWUP': return 'Record Follow-up';
      case 'STATUS': return 'Change Status';
      case 'SWITCH_USER': return 'Assign Lead';
      default: return 'Add Internal Note';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'FOLLOWUP': return <Activity className="w-6 h-6" />;
      case 'STATUS': return <CheckCircle className="w-6 h-6" />;
      case 'SWITCH_USER': return <User className="w-6 h-6" />;
      default: return <MessageSquare className="w-6 h-6" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#313a46] p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-white/10 rounded-xl">
                {getIcon()}
             </div>
             <div>
                <h3 className="text-xl font-black text-white font-rubik uppercase tracking-tight m-0">{getTitle()}</h3>
                <p className="text-xs text-gray-300 uppercase tracking-widest font-bold mt-0.5 m-0">Action Matrix Protocol</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 flex items-center gap-4 mb-4">
             <div className="w-11 h-11 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                <User size={22} />
             </div>
             <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest m-0">Targeting Lead</p>
                <h4 className="text-base font-black text-[#313a46] m-0 mt-0.5">{lead.name}</h4>
             </div>
          </div>

          {type === 'SWITCH_USER' ? (
            <div className="space-y-4">
               <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  Assign To User <span className="text-brand font-bold">*</span>
                </label>
                <select 
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold text-[#313a46]"
                  value={formData.targetUserId}
                  onChange={(e) => setFormData({...formData, targetUserId: e.target.value})}
                >
                  <option value="">Select User</option>
                  {masters?.users?.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <>
              {type === 'FOLLOWUP' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        Activity Type <span className="text-brand font-bold">*</span>
                      </label>
                      <select 
                        required
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-semibold text-[#313a46]"
                        value={formData.activityType}
                        onChange={(e) => setFormData({...formData, activityType: e.target.value})}
                      >
                        <option value="">-Select-</option>
                        <option value="PHONE">Phone Call</option>
                        <option value="EMAIL">Email Sent</option>
                        <option value="VISIT">Site Visit</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        Target Status <span className="text-brand font-bold">*</span>
                      </label>
                      <select 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold text-[#313a46]"
                        value={formData.statusId}
                        onChange={(e) => setFormData({...formData, statusId: e.target.value})}
                      >
                        <option value="">-Select-</option>
                        {masters?.statuses?.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {isOrderBooked && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        Order Value (INR) <span className="text-brand font-bold">*</span>
                      </label>
                      <input 
                        type="number"
                        required
                        min="0"
                        step="any"
                        placeholder="Enter order value..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold text-[#313a46]"
                        value={formData.orderValue || ''}
                        onChange={(e) => setFormData({...formData, orderValue: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              )}

              {type === 'FOLLOWUP' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    SMS Content (Optional)
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Draft message for lead..."
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium text-[#313a46] resize-none"
                    value={formData.smsContent}
                    onChange={(e) => setFormData({...formData, smsContent: e.target.value})}
                  />
                </div>
              )}

              {type === 'FOLLOWUP' && (
                 <div className="border-t border-gray-100 pt-5 space-y-4">
                    <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                       <h4 className="text-xs font-black text-[#313a46] uppercase tracking-wider font-rubik m-0">Schedule Next Action / Reminder</h4>
                       <input 
                         type="checkbox" 
                         checked={formData.reminderSet}
                         onChange={(e) => setFormData({...formData, reminderSet: e.target.checked})}
                         className="w-4 h-4 text-brand rounded border-gray-300 focus:ring-brand cursor-pointer"
                       />
                    </div>

                    {formData.reminderSet && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                         <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                            Assign Reminder To
                          </label>
                          <select 
                            className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-semibold text-[#313a46]"
                            value={formData.reminderAssignTo}
                            onChange={(e) => setFormData({...formData, reminderAssignTo: e.target.value})}
                          >
                            <option value="">-Select Staff-</option>
                            {masters?.users?.filter((u: any) => u.role !== 'DM_EXECUTIVE').map((u: any) => (
                              <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                            Next Contactable Date <span className="text-brand font-bold">*</span>
                          </label>
                          <input 
                            type="date"
                            required
                            min={today}
                            className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-semibold text-[#313a46]"
                            value={formData.nextFollowUp}
                            onChange={(e) => setFormData({...formData, nextFollowUp: e.target.value})}
                          />
                        </div>
                      </div>
                    )}
                 </div>
              )}

              {type === 'REMINDER' && (
                <div className="space-y-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200/80">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                        Reminder Date <span className="text-brand font-bold">*</span>
                      </label>
                      <input 
                        type="date"
                        required
                        min={today}
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold text-[#313a46]"
                        value={formData.nextFollowUp}
                        onChange={(e) => setFormData({...formData, nextFollowUp: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                        Assign Reminder To
                      </label>
                      <select 
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-semibold text-[#313a46]"
                        value={formData.reminderAssignTo}
                        onChange={(e) => setFormData({...formData, reminderAssignTo: e.target.value})}
                      >
                        <option value="">-Select Staff-</option>
                        {masters?.users?.filter((u: any) => u.role !== 'DM_EXECUTIVE').map((u: any) => (
                          <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {type === 'STATUS' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Transition Schedule Date
                  </label>
                  <input 
                    type="date"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-semibold text-[#313a46]"
                    value={formData.nextFollowUp}
                    onChange={(e) => setFormData({...formData, nextFollowUp: e.target.value})}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  {type === 'REMINDER' ? 'Reminder Reason / Instruction to Pass' : 'Action specific Notes / Comment'}
                </label>
                <textarea 
                  required={type === 'REMINDER'}
                  rows={3}
                  placeholder={type === 'REMINDER' ? 'What needs to be done on this reminder date?' : 'Record summary of this interaction...'}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium text-[#313a46] resize-none"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-3 justify-end border-t border-gray-100">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs md:text-sm hover:bg-gray-50 transition-all uppercase tracking-wider font-rubik"
            >
              Cancel
            </button>
            <button 
              disabled={isSubmitting}
              type="submit"
              className="px-7 py-2.5 rounded-xl bg-brand text-white font-bold text-xs md:text-sm hover:bg-[#004d30] transition-all uppercase tracking-wider font-rubik flex items-center justify-center gap-2.5 shadow-md shadow-brand/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
              ) : (
                <>Save & Record <Send size={15} /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActionModal;
