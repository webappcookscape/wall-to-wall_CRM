import React, { useState, useEffect, useCallback } from 'react';
import { Mail, MessageSquare, Plus, Trash2, Edit2, X, Eye } from 'lucide-react';
import { leadService } from '../services/api';

interface Template {
  id: string;
  name: string;
  subject?: string;
  content: string;
}

interface TemplateManagementProps {
  type: 'smsTemplate' | 'emailTemplate';
  title: string;
}

const TemplateManagement: React.FC<TemplateManagementProps> = ({ type, title }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: ''
  });

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await leadService.getMasters();
      const apiKey = type === 'smsTemplate' ? 'smsTemplates' : 'emailTemplates';
      setTemplates(res[apiKey] || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = type === 'emailTemplate' 
        ? formData 
        : { name: formData.name, content: formData.content };

      if (editingTemplate) {
        await leadService.updateMaster(type, editingTemplate.id, data);
      } else {
        await leadService.createMaster(type, data);
      }
      setIsModalOpen(false);
      setEditingTemplate(null);
      setFormData({ name: '', subject: '', content: '' });
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template. Ensure the name is unique.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await leadService.deleteMaster(type, id);
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const openEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject || '',
      content: template.content
    });
    setIsModalOpen(true);
  };

  return (
    <div className="container-fluid py-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h4 className="page-title text-xl font-bold text-gray-700 m-0">{title}</h4>
          <p className="text-[11px] text-gray-400 font-bold uppercase mt-1 tracking-wider">Manage your communication templates</p>
        </div>
        <button 
          onClick={() => {
            setEditingTemplate(null);
            setFormData({ name: '', subject: '', content: '' });
            setIsModalOpen(true);
          }}
          className="btn-custom !rounded-full !px-5 !py-2 text-[11px] flex items-center gap-2"
        >
          <Plus size={16} /> Create New
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center">
            <div className="inline-block w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-full py-20 bg-white border border-dashed border-gray-200 rounded-xl text-center">
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No templates found</p>
          </div>
        ) : templates.map((template) => (
          <div key={template.id} className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${type === 'smsTemplate' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                  {type === 'smsTemplate' ? <MessageSquare size={20} /> : <Mail size={20} />}
                </div>
                <div>
                  <h6 className="text-sm font-bold text-gray-700 m-0">{template.name}</h6>
                  <p className="text-[10px] text-gray-400 uppercase font-bold m-0">{type === 'smsTemplate' ? 'SMS' : 'Email'}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setPreviewTemplate(template); setIsPreviewOpen(true); }} className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand/5 rounded transition-colors" title="Preview">
                  <Eye size={14} />
                </button>
                <button onClick={() => openEdit(template)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(template.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="p-5">
              {type === 'emailTemplate' && (
                <div className="mb-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Subject</span>
                  <p className="text-xs text-gray-600 font-medium line-clamp-1">{template.subject || 'No subject'}</p>
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Content Snippet</span>
                <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{template.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="bg-[#3b3e47] p-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  {type === 'smsTemplate' ? <MessageSquare size={18} /> : <Mail size={18} />}
                </div>
                <h4 className="text-sm font-bold uppercase m-0 tracking-wider">
                  {editingTemplate ? 'Edit Template' : 'Add New Template'}
                </h4>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Template Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold text-[#313a46]"
                  placeholder="e.g. Welcome Message"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              {type === 'emailTemplate' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Subject</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold text-[#313a46]"
                    placeholder="e.g. Thanks for your inquiry"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Template Content</label>
                <textarea 
                  required
                  rows={8}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium text-gray-600 resize-none"
                  placeholder="Enter message content..."
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                />
                <p className="text-[9px] text-gray-400 italic">Use placeholders like {'{name}'}, {'{leadId}'} if supported by the delivery engine.</p>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-4 rounded-xl border border-gray-200 text-gray-400 font-bold text-[10px] hover:bg-gray-50 transition-all uppercase tracking-[0.2em]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 rounded-xl bg-brand text-white font-bold text-[10px] hover:bg-[#004d30] transition-all uppercase tracking-[0.2em] shadow-lg shadow-brand/20"
                >
                  {editingTemplate ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && previewTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase m-0 tracking-wider text-gray-700">Template Preview</h4>
              <button onClick={() => setIsPreviewOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 bg-gray-50 flex-1">
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                  {type === 'emailTemplate' && (
                    <div className="pb-4 border-b border-gray-50">
                        <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Subject:</span>
                        <p className="text-sm font-bold text-gray-800">{previewTemplate.subject}</p>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm text-gray-600 leading-relaxed">
                    {previewTemplate.content}
                  </div>
               </div>
            </div>
            <div className="p-4 bg-white border-t border-gray-50 text-center">
               <button onClick={() => setIsPreviewOpen(false)} className="text-[10px] font-bold text-brand uppercase tracking-widest hover:underline">Close Preview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManagement;
