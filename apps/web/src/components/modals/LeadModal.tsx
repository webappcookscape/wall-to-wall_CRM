import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { leadService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lead?: any;
}

const ratingOptions = [
  { value: 1, label: '1 - Disqualified', ratingName: 'DISQUALIFIED' },
  { value: 2, label: '2 - Low Quality', ratingName: 'LOW_QUALITY' },
  { value: 3, label: '3 - Moderate', ratingName: 'MODERATE' },
  { value: 4, label: '4 - Qualified', ratingName: 'QUALIFIED' },
  { value: 5, label: '5 - Order Booked', ratingName: 'ORDER_BOOKED' },
];

const getRatingName = (rating: number) => {
  return ratingOptions.find((option) => option.value === rating)?.ratingName || '';
};

const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, onSuccess, lead }) => {
  const { user } = useAuth(); // Use the useAuth hook
  const userRole = user?.role; // Get userRole from the context
  const [formData, setFormData] = useState<any>({
    name: '',
    email: '',
    phone: '',
    projectId: '',
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
    tagIds: [],
    comments: '',
    instructionToPass: '',
    dataCollected: new Date().toISOString().split('T')[0],
    contactableDate: '',
    assignedToId: '',
  });
  const [masters, setMasters] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    const fetchMasters = async () => {
      const data = await leadService.getMasters();
      setMasters(data);
    };
    if (isOpen) fetchMasters();
  }, [isOpen]);

  const toLocalISOString = (dateString?: string | null) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

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
        projectId: lead.projectId || '',
        sourceId: lead.sourceId || '',
        statusId: lead.statusId || '',
        brandId: lead.brandId || '',
        rating,
        ratingName: lead.ratingName || getRatingName(rating),
        metaLeadId: lead.metaLeadId || '',
        metaFormId: lead.metaFormId || '',
        metaAdId: lead.metaAdId || '',
        metaCampaignId: lead.metaCampaignId || '',
        metaAdAccountId: lead.metaAdAccountId || '',
        nextFollowUp: toLocalISOString(lead.nextFollowUp),
        tagIds: lead.tags?.map((t: any) => t.id) || [],
        comments: lead.comments || '',
        instructionToPass: lead.instructionToPass || '',
        dataCollected: lead.dataCollected ? new Date(lead.dataCollected).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        contactableDate: toLocalISOString(lead.contactableDate),
        assignedToId: lead.assignedToId || '',
      });
    } else {
        setFormData({
            name: '',
            email: '',
            phone: '',
            projectId: '',
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
            tagIds: [],
            comments: '',
            instructionToPass: '',
            dataCollected: new Date().toISOString().split('T')[0],
            contactableDate: '',
            assignedToId: '',
        });
    }
  }, [lead, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        ratingName: formData.ratingName || getRatingName(formData.rating),
        nextFollowUp: formData.nextFollowUp ? new Date(formData.nextFollowUp).toISOString() : null,
        contactableDate: formData.nextFollowUp ? new Date(formData.nextFollowUp).toISOString() : null,
      };
      if (lead?.id) {
        await (leadService as any).updateLead(lead.id, payload);
      } else {
        // console.log(payload)
        await leadService.createLead(payload);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving lead:', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to save lead.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="!text-white bg-[#313a46] p-5 flex items-center justify-between">
          <h4 className="text-base md:text-lg font-black text-white uppercase tracking-wider m-0 font-rubik">{lead ? 'Edit Lead' : 'Create New Lead'}</h4>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Full Name <span className="text-red-500">*</span></label>
              <input 
                required
                type="text" 
                className="form-control !py-2.5 !px-3.5 !text-sm font-medium rounded-lg border-gray-300"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter client's full name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Phone <span className="text-red-500">*</span></label>
              <input 
                required
                type="tel" 
                className="form-control !py-2.5 !px-3.5 !text-sm font-medium rounded-lg border-gray-300"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="10-digit mobile number"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Email</label>
              <input 
                type="email" 
                className="form-control !py-2.5 !px-3.5 !text-sm font-medium rounded-lg border-gray-300"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="client@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Rating</label>
              <select 
                className="form-control !py-2.5 !px-3.5 !text-sm font-medium rounded-lg border-gray-300"
                value={formData.rating}
                onChange={(e) => handleRatingChange(Number(e.target.value))}
              >
                <option value={0}>Select Rating</option>
                {ratingOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Brand <span className="text-red-500">*</span></label>
              <select 
                required
                className="form-control !py-2.5 !px-3.5 !text-sm font-medium rounded-lg border-gray-300"
                value={formData.brandId}
                onChange={(e) => setFormData({...formData, brandId: e.target.value})}
              >
                <option value="">Select Brand</option>
                {masters?.brands?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Source <span className="text-red-500">*</span></label>
              <select 
                required
                className="form-control !py-2.5 !px-3.5 !text-sm font-medium rounded-lg border-gray-300"
                value={formData.sourceId}
                onChange={(e) => setFormData({...formData, sourceId: e.target.value})}
              >
                <option value="">Select Source</option>
                {masters?.sources?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Project</label>
              <select 
                className="form-control !py-2.5 !px-3.5 !text-sm font-medium rounded-lg border-gray-300"
                value={formData.projectId}
                onChange={(e) => setFormData({...formData, projectId: e.target.value})}
              >
                <option value="">Select Project</option>
                {masters?.projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Next Follow Up</label>
              <input 
                type="datetime-local"
                className="form-control !py-2.5 !px-3.5 !text-sm font-medium rounded-lg border-gray-300"
                value={formData.nextFollowUp}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, nextFollowUp: val, contactableDate: val });
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Date Collected <span className="text-red-500">*</span></label>
              <input 
                required
                type="date"
                className="form-control !py-2.5 !px-3.5 !text-sm font-medium rounded-lg border-gray-300"
                value={formData.dataCollected}
                onChange={(e) => setFormData({...formData, dataCollected: e.target.value})}
              />
            </div>

            {['ADMIN', 'BUSINESS_HEAD'].includes(userRole || '') && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Assigned To</label>
                <select 
                  className="form-control !py-2.5 !px-3.5 !text-sm font-medium rounded-lg border-gray-300"
                  value={formData.assignedToId || ''}
                  onChange={(e) => setFormData({...formData, assignedToId: e.target.value})}
                >
                  <option value="">Unassigned</option>
                  {masters?.users?.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {(userRole === "ADMIN" || (userRole === "DM_EXECUTIVE" && user?.metaAccess)) && (
            <div className="space-y-4 border-t border-gray-100 pt-5 bg-blue-50/40 p-4 rounded-xl border border-blue-100">
              <div>
                <h5 className="text-sm font-black uppercase text-blue-900 m-0 font-rubik tracking-wide">Meta / Facebook Lead Details</h5>
                <p className="text-xs text-gray-500 mt-1 mb-0">
                  Enter the IDs from the Facebook Lead Ad. The <strong>Meta Lead ID</strong> is required to send offline conversion events back to Meta.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Meta Lead ID</label>
                  <input
                    type="text"
                    className="form-control !py-2 !px-3 !text-sm font-mono rounded-lg border-gray-300"
                    value={formData.metaLeadId}
                    onChange={(e) => setFormData({...formData, metaLeadId: e.target.value})}
                    placeholder="Unique leadgen_id"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Meta Form ID</label>
                  <input
                    type="text"
                    className="form-control !py-2 !px-3 !text-sm font-mono rounded-lg border-gray-300"
                    value={formData.metaFormId}
                    onChange={(e) => setFormData({...formData, metaFormId: e.target.value})}
                    placeholder="Instant form ID"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Meta Ad ID</label>
                  <input
                    type="text"
                    className="form-control !py-2 !px-3 !text-sm font-mono rounded-lg border-gray-300"
                    value={formData.metaAdId}
                    onChange={(e) => setFormData({...formData, metaAdId: e.target.value})}
                    placeholder="Ad ID"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Meta Campaign ID</label>
                  <input
                    type="text"
                    className="form-control !py-2 !px-3 !text-sm font-mono rounded-lg border-gray-300"
                    value={formData.metaCampaignId}
                    onChange={(e) => setFormData({...formData, metaCampaignId: e.target.value})}
                    placeholder="Campaign ID"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Meta Ad Account ID</label>
                  <input
                    type="text"
                    className="form-control !py-2 !px-3 !text-sm font-mono rounded-lg border-gray-300"
                    value={formData.metaAdAccountId}
                    onChange={(e) => setFormData({...formData, metaAdAccountId: e.target.value})}
                    placeholder="Ad account ID"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Instruction to pass <span className="text-red-500">*</span></label>
            <textarea 
              required
              rows={2}
              className="form-control !py-2.5 !px-3.5 !text-sm font-medium rounded-lg border-gray-300 resize-none"
              value={formData.instructionToPass}
              onChange={(e) => setFormData({...formData, instructionToPass: e.target.value})}
              placeholder="Add instructions for the assigned team member..."
            />
          </div>


          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Comments (Appends to existing)</label>
            <textarea 
              rows={3}
              className="form-control !py-2.5 !px-3.5 !text-sm font-medium rounded-lg border-gray-300 resize-none"
              value={formData.comments}
              onChange={(e) => setFormData({...formData, comments: e.target.value})}
              placeholder="Enter client remarks or follow-up notes..."
            />
          </div>

          <div className="flex gap-3 pt-3 justify-end border-t border-gray-100">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs md:text-sm uppercase hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              disabled={isSubmitting}
              type="submit"
              className="px-7 py-2.5 rounded-lg bg-brand text-white font-bold text-xs md:text-sm uppercase shadow-sm hover:bg-brand/90 disabled:opacity-50 transition-all"
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