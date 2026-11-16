import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { leadService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth
import { RATING_OPTIONS as ratingOptions, getRatingName } from '../../utils/rating';
import QuickFollowUpChips from '../common/QuickFollowUpChips';
import { parseLeadLocationAndComments } from '../../utils/leadParsers';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lead?: any) => void;
  lead?: any;
  masters?: any;
}

const toLocalISOString = (dateString?: string | null) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

const formatIsoWithTime = (dateStr?: string | null) => {
  if (!dateStr) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const now = new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, onSuccess, lead, masters: initialMasters }) => {
  const { user } = useAuth(); // Use the useAuth hook
  const userRole = user?.role; // Get userRole from the context
  const [formData, setFormData] = useState<any>({
    name: '',
    email: '',
    phone: '',
    projectId: '',
    projectIds: [] as string[],
    referralName: '',
    sourceId: '',
    statusId: '',
    brandId: '',
    rating: 0,
    ratingName: '',
    metaLeadId: '',
    metaFormId: '',
    metaAdId: '',
    metaCampaignId: '',
    metaAdAccountId: '',
    nextFollowUp: '',
    comments: '',
    instructionToPass: '',
    dataCollected: toLocalISOString(new Date().toISOString()),
    contactableDate: '',
    assignedToId: '',
    siteLocation: '',
  });
  const [masters, setMasters] = useState<any>(initialMasters || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialMasters) {
      setMasters(initialMasters);
    }
  }, [initialMasters]);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const data = await leadService.getMasters();
        setMasters(data);
      } catch (err) {
        console.error('Failed to fetch masters in LeadModal:', err);
      }
    };
    if (isOpen && !initialMasters) fetchMasters();
  }, [isOpen, initialMasters]);


  const handleRatingChange = (rating: number) => {
    setFormData({
      ...formData,
      rating,
      ratingName: getRatingName(rating),
    });
  };

  useEffect(() => {
    if (lead) {
      const rating = lead.rating || 0;
      setFormData({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        projectId: lead.projectId || (lead.projects?.[0]?.id || ''),
        projectIds: lead.projects && Array.isArray(lead.projects) && lead.projects.length > 0 
          ? lead.projects.map((p: any) => p.id) 
          : (lead.projectId ? [lead.projectId] : []),
        referralName: lead.referralName || '',
        sourceId: lead.sourceId || lead.source?.id || '',
        statusId: lead.statusId || '',
        brandId: lead.brandId || '',
        rating,
        ratingName: lead.ratingName || getRatingName(rating),
        metaLeadId: lead.metaLeadId || '',
        metaFormId: lead.metaFormId || '',
        metaAdId: lead.metaAdId || '',
        metaCampaignId: lead.metaCampaignId || '',
        metaAdAccountId: lead.metaAdAccountId || '',
        nextFollowUp: toLocalISOString(lead.nextFollowUp || lead.contactableDate),
        comments: (() => {
          const { cleanComments } = parseLeadLocationAndComments(lead.comments, lead.siteLocation);
          return cleanComments || '';
        })(),
        instructionToPass: lead.instructionToPass || '',
        dataCollected: (() => {
          if (!lead.dataCollected) {
            return lead.createdAt ? toLocalISOString(lead.createdAt) : toLocalISOString(new Date().toISOString());
          }
          const d = new Date(lead.dataCollected);
          const isMidnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
          if (isMidnight && lead.createdAt) {
            const created = new Date(lead.createdAt);
            const combined = new Date(d.getFullYear(), d.getMonth(), d.getDate(), created.getHours(), created.getMinutes());
            return toLocalISOString(combined.toISOString());
          }
          return toLocalISOString(lead.dataCollected);
        })(),
        contactableDate: toLocalISOString(lead.contactableDate || lead.nextFollowUp),
        assignedToId: lead.assignedToId || '',
        siteLocation: (() => {
          const { siteLocation } = parseLeadLocationAndComments(lead.comments, lead.siteLocation);
          return siteLocation || '';
        })(),
      });
    } else {
        setFormData({
            name: '',
            email: '',
            phone: '',
            projectId: '',
            projectIds: [] as string[],
            referralName: '',
            sourceId: '',
            statusId: '',
            brandId: '',
            rating: 0,
            ratingName: '',
            metaLeadId: '',
            metaFormId: '',
            metaAdId: '',
            metaCampaignId: '',
            metaAdAccountId: '',
            nextFollowUp: '',
            comments: '',
            instructionToPass: '',
            dataCollected: toLocalISOString(new Date().toISOString()),
            contactableDate: '',
            assignedToId: (userRole === 'FA' || userRole === 'CLIENT_FACILITATOR') ? (user?.id || '') : '',
            siteLocation: '',
        });
    }
  }, [lead, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const followUpIso = formData.nextFollowUp ? new Date(formData.nextFollowUp).toISOString() : null;
      const collectedIso = formatIsoWithTime(formData.dataCollected);

      const finalComments = formData.comments?.trim() || null;
      const finalSiteLocation = formData.siteLocation?.trim() || null;

      const selectedSource = masters?.sources?.find((s: any) => s.id === formData.sourceId);

      const payload = {
        ...formData,
        name: formData.name?.trim(),
        phone: formData.phone?.trim(),
        email: formData.email?.trim() || null,
        projectId: formData.projectIds?.[0] || formData.projectId || null,
        projectIds: formData.projectIds || [],
        referralName: formData.referralName?.trim() || null,
        siteLocation: finalSiteLocation,
        sourceId: formData.sourceId || null,
        leadType: selectedSource?.name || 'Direct Lead',
        brandId: formData.brandId || null,
        statusId: formData.statusId || null,
        assignedToId: formData.assignedToId || null,
        comments: finalComments,
        instructionToPass: formData.instructionToPass?.trim() || null,
        rating: Number(formData.rating) || 0,
        ratingName: formData.ratingName || getRatingName(Number(formData.rating) || 0),
        nextFollowUp: followUpIso,
        dataCollected: collectedIso,
        contactableDate: followUpIso || collectedIso,
      };

      let savedLead: any = null;
      if (lead?.id) {
        if (userRole === 'DM_EXECUTIVE') {
          delete payload.assignedToId;
        }
        savedLead = await (leadService as any).updateLead(lead.id, payload);
      } else {
        if ((userRole === 'FA' || userRole === 'CLIENT_FACILITATOR') && !payload.assignedToId && user?.id) {
          payload.assignedToId = user.id;
        }
        savedLead = await leadService.createLead(payload);
      }
      onSuccess(savedLead);
      onClose();
    } catch (error: any) {
      console.error('Error saving lead:', error);
      if (error?.response?.data?.duplicate) {
        const dup = error.response.data.duplicate;
        console.warn(`[DUPLICATE LEAD DETECTED]: ID: ${dup.id}, Lead ID: ${dup.leadId}, Name: "${dup.name}", Phone: "${dup.phone}"`);
      }
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to save lead.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSource = masters?.sources?.find((s: any) => s.id === formData.sourceId);
  const isReferralSource = Boolean(selectedSource && /architect|interior|referral|designer/i.test(selectedSource.name));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="!text-white bg-[#3b3e47] p-4 flex items-center justify-between ">
          <h4 className="text-sm font-bold text-white uppercase m-0">{lead ? 'Edit Lead' : 'Create New Lead'}</h4>
          <button onClick={onClose} className="text-white opacity-50 hover:opacity-100">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Full Name <span className="text-red-500">*</span></label>
              <input 
                required
                type="text" 
                className="form-control !py-1.5 !text-[12px]"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Phone <span className="text-red-500">*</span></label>
              <input 
                required
                type="tel" 
                className="form-control !py-1.5 !text-[12px]"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Email</label>
              <input 
                type="email" 
                className="form-control !py-1.5 !text-[12px]"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Rating</label>
              <select 
                className="form-control !py-1.5 !text-[12px]"
                value={formData.rating}
                onChange={(e) => handleRatingChange(Number(e.target.value))}
              >
                <option value={0}>Select Rating</option>
                {ratingOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
              <select 
                className="form-control !py-1.5 !text-[12px]"
                value={formData.statusId}
                onChange={(e) => setFormData({...formData, statusId: e.target.value})}
              >
                <option value="">Fresh (Default)</option>
                {masters?.statuses?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Brand <span className="text-red-500">*</span></label>
              <select 
                required
                className="form-control !py-1.5 !text-[12px]"
                value={formData.brandId}
                onChange={(e) => setFormData({...formData, brandId: e.target.value})}
              >
                <option value="">Select Brand</option>
                {masters?.brands?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Source <span className="text-red-500">*</span></label>
              <select 
                required
                className="form-control !py-1.5 !text-[12px]"
                value={formData.sourceId}
                onChange={(e) => setFormData({...formData, sourceId: e.target.value})}
              >
                <option value="">Select Source</option>
                {masters?.sources?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* If Architect / Interior Referral, prompt for Referrer Name */}
            {isReferralSource && (
              <div className="space-y-1 sm:col-span-2 bg-amber-50/80 p-3 rounded-xl border border-amber-200 animate-in fade-in duration-200">
                <label className="text-[10px] font-bold text-amber-900 uppercase flex items-center justify-between">
                  <span>Architect / Interior Designer / Referrer Name <span className="text-red-500">*</span></span>
                  <span className="text-[9px] text-amber-700 font-bold">{selectedSource?.name}</span>
                </label>
                <input 
                  type="text"
                  required={isReferralSource}
                  placeholder="e.g. Ar. Rajesh Mehta or Studio Design Interiors"
                  className="form-control !bg-white !py-1.5 !text-[12px] border-amber-300 focus:border-amber-500"
                  value={formData.referralName || ''}
                  onChange={(e) => setFormData({...formData, referralName: e.target.value})}
                />
              </div>
            )}

            {/* Multi-Project Selector */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center justify-between">
                <span>Projects (Select Multiple)</span>
                {formData.projectIds && formData.projectIds.length > 0 && (
                  <span className="text-[10px] text-brand font-bold">
                    {formData.projectIds.length} project{formData.projectIds.length > 1 ? 's' : ''} selected
                  </span>
                )}
              </label>

              {/* Selected Project Badges */}
              {formData.projectIds && formData.projectIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {formData.projectIds.map((pid: string) => {
                    const p = masters?.projects?.find((proj: any) => proj.id === pid);
                    if (!p) return null;
                    return (
                      <span 
                        key={pid} 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-brand/10 text-brand border border-brand/20 shadow-xs"
                      >
                        {p.name}
                        <button
                          type="button"
                          onClick={() => {
                            const nextIds = formData.projectIds.filter((id: string) => id !== pid);
                            setFormData({
                              ...formData,
                              projectIds: nextIds,
                              projectId: nextIds[0] || ''
                            });
                          }}
                          className="hover:text-red-500 transition-colors cursor-pointer"
                          title="Remove project"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Add / Select Project Dropdown */}
              <select 
                className="form-control !py-1.5 !text-[12px]"
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const currentIds = formData.projectIds || [];
                  if (!currentIds.includes(val)) {
                    const nextIds = [...currentIds, val];
                    setFormData({
                      ...formData,
                      projectIds: nextIds,
                      projectId: nextIds[0] || ''
                    });
                  }
                }}
              >
                <option value="">+ Add / Select Project...</option>
                {masters?.projects?.map((p: any) => (
                  <option 
                    key={p.id} 
                    value={p.id}
                    disabled={formData.projectIds?.includes(p.id)}
                  >
                    {p.name} {formData.projectIds?.includes(p.id) ? '✓ (Selected)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Next Follow Up</label>
              <input 
                type="datetime-local"
                className="form-control !py-1.5 !text-[12px]"
                value={formData.nextFollowUp}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, nextFollowUp: val, contactableDate: val });
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Site Location</label>
              <input 
                type="text"
                placeholder="e.g. Velachery, Chennai"
                className="form-control !py-1.5 !text-[12px]"
                value={formData.siteLocation}
                onChange={(e) => setFormData({...formData, siteLocation: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Date Collected <span className="text-red-500">*</span></label>
              <input 
                required
                type="datetime-local" 
                className="form-control !py-1.5 !text-[12px]"
                value={formData.dataCollected}
                onChange={(e) => setFormData({...formData, dataCollected: e.target.value})}
              />
            </div>

            {(userRole === 'ADMIN' || userRole === 'BUSINESS_HEAD' || userRole === 'FA' || userRole === 'CLIENT_FACILITATOR' || (!lead?.id && userRole === 'DM_EXECUTIVE')) && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Assigned To</label>
                <select 
                  className="form-control !py-1.5 !text-[12px]"
                  value={formData.assignedToId || ''}
                  onChange={(e) => setFormData({...formData, assignedToId: e.target.value})}
                >
                  <option value="">{userRole === 'FA' || userRole === 'CLIENT_FACILITATOR' ? `Assign to Me (${user?.fullName || 'Self'})` : 'Unassigned'}</option>
                  {masters?.users
                    ?.filter((u: any) => userRole !== 'DM_EXECUTIVE' || !user?.id || u.id !== user.id)
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.name || u.email || 'User'} {u.email ? `(${u.email})` : ''} {u.role ? `— ${u.role}` : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {(userRole === "DM_EXECUTIVE" && user?.metaAccess) && (

                    <div className="space-y-3 border-t border-gray-100 pt-4">
                      <div>
                        <h5 className="text-[11px] font-bold uppercase text-gray-500 m-0">Meta Lead Details</h5>
                        <p className="text-[10px] text-gray-400 m-0">
                          Enter the IDs from the Facebook Lead Ad. The <strong>Meta Lead ID</strong> is required to send offline
                          conversion events (like 'Qualified' or 'Order Booked') back to Meta for ad optimization.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Meta Lead ID</label>
                          <input
                            type="text"
                            className="form-control !py-1.5 !text-[12px]"
                            value={formData.metaLeadId}
                            onChange={(e) => setFormData({...formData, metaLeadId: e.target.value})}
                            placeholder="Unique leadgen_id"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Meta Form ID</label>
                          <input
                            type="text"
                            className="form-control !py-1.5 !text-[12px]"
                            value={formData.metaFormId}
                            onChange={(e) => setFormData({...formData, metaFormId: e.target.value})}
                            placeholder="Instant form ID"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Meta Ad ID</label>
                          <input
                            type="text"
                            className="form-control !py-1.5 !text-[12px]"
                            value={formData.metaAdId}
                            onChange={(e) => setFormData({...formData, metaAdId: e.target.value})}
                            placeholder="Ad ID"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Meta Campaign ID</label>
                          <input
                            type="text"
                            className="form-control !py-1.5 !text-[12px]"
                            value={formData.metaCampaignId}
                            onChange={(e) => setFormData({...formData, metaCampaignId: e.target.value})}
                            placeholder="Campaign ID"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Meta Ad Account ID</label>
                          <input
                            type="text"
                            className="form-control !py-1.5 !text-[12px]"
                            value={formData.metaAdAccountId}
                            onChange={(e) => setFormData({...formData, metaAdAccountId: e.target.value})}
                            placeholder="Ad account ID"
                          />
                        </div>
                      </div>
                    </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Instruction to pass <span className="text-red-500">*</span></label>
            <textarea 
              required
              rows={2}
              className="form-control !py-1.5 !text-[12px] resize-none"
              value={formData.instructionToPass}
              onChange={(e) => setFormData({...formData, instructionToPass: e.target.value})}
              placeholder="Add instructions for the assigned team member..."
            />
          </div>

          <div className="space-y-2">
            <QuickFollowUpChips 
              value={formData.comments}
              onChange={(newComments) => setFormData({ ...formData, comments: newComments })}
              label="Quick Follow-up Presets (Click to add / combine):"
            />
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Comments (Appends to existing)</label>
              <textarea 
                rows={3}
                placeholder="Add comments or select presets above (e.g. Shared brochure / Waiting for resp)..."
                className="form-control !py-1.5 !text-[12px] resize-none"
                value={formData.comments}
                onChange={(e) => setFormData({...formData, comments: e.target.value})}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2 justify-end">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-gray-100 text-gray-600 font-bold text-[11px] uppercase"
            >
              Cancel
            </button>
            <button 
              disabled={isSubmitting}
              type="submit"
              className="px-6 py-1.5 rounded bg-brand text-white font-bold text-[11px] uppercase disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadModal;