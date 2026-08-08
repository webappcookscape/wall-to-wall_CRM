import React, { useState, useEffect, useCallback } from 'react';
import { leadService } from '../services/api';
import { Bell, Phone, Calendar, ChevronLeft, ChevronRight, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

const Reminders: React.FC = () => {
    const [leads, setLeads] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [timeframe, setTimeframe] = useState<'overdue' | 'today' | 'tomorrow' | 'week'>('today');

    const fetchReminders = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await leadService.getLeads({
                page,
                limit: 20,
                timeframe,
            });
            setLeads(res.data);
            setTotal(res.total);
            if (res.data.length > 0) {
                setSelectedLead(res.data[0]);
            } else {
                setSelectedLead(null);
            }
        } catch (error) {
            console.error('Error fetching reminders:', error);
        } finally {
            setIsLoading(false);
        }
    }, [page, timeframe]);

    useEffect(() => {
        fetchReminders();
    }, [fetchReminders]);

    const getUrgencyColor = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'border-l-[#f05050] bg-red-50';
        if (diffDays === 0) return 'border-l-amber-500 bg-amber-50/30';
        return 'border-l-green-500 bg-green-50/20';
    };

    const getUrgencyBadge = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { label: 'Overdue', cls: 'bg-[#f05050] text-white' };
        if (diffDays === 0) return { label: 'Today', cls: 'bg-amber-500 text-white' };
        return { label: 'Upcoming', cls: 'bg-green-600 text-white' };
    };

    const tabs: { key: typeof timeframe; label: string }[] = [
        { key: 'overdue', label: 'Overdue' },
        { key: 'today',   label: 'Today' },
        { key: 'tomorrow',label: 'Tomorrow' },
        { key: 'week',    label: 'This Week' },
    ];

    return (
        <div className="container-fluid py-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h4 className="page-title text-xl font-bold text-gray-700 m-0 flex items-center gap-2">
                        <Bell size={20} className="text-[#006039]" /> Reminders
                    </h4>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1">
                        Lead Follow-up Schedule
                    </p>
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-full p-1 shadow-sm">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setTimeframe(tab.key); setPage(1); }}
                            className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-full transition-all ${
                                timeframe === tab.key
                                    ? 'bg-[#006039] text-white shadow'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-240px)]">
                {/* List */}
                <div className="col-span-12 lg:col-span-4 bg-white border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-3 bg-[#f8f9fa] border-b border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                            {total} Reminder{total !== 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 text-gray-600 disabled:opacity-30">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-[10px] font-bold text-gray-500">
                                Page {page} / {Math.max(1, Math.ceil(total / 20))}
                            </span>
                            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.max(1, Math.ceil(total / 20))} className="p-1 text-gray-600 disabled:opacity-30">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
                        {isLoading ? (
                            <div className="p-10 flex justify-center">
                                <div className="w-6 h-6 border-2 border-[#006039] border-t-transparent animate-spin rounded-full" />
                            </div>
                        ) : leads.length === 0 ? (
                            <div className="p-10 text-center">
                                <CheckCircle2 size={40} className="text-gray-200 mx-auto mb-3" />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    No reminders for this period
                                </p>
                            </div>
                        ) : leads.map(lead => {
                            const urgency = lead.contactableDate ? getUrgencyBadge(lead.contactableDate) : null;
                            return (
                                <div
                                    key={lead.id}
                                    onClick={() => setSelectedLead(lead)}
                                    className={`p-4 cursor-pointer transition-colors border-l-4 ${
                                        selectedLead?.id === lead.id
                                            ? (lead.contactableDate ? getUrgencyColor(lead.contactableDate) : 'bg-gray-50 border-l-[#006039]')
                                            : 'hover:bg-gray-50 border-l-transparent'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h6 className="text-[13px] font-bold text-gray-700 m-0 line-clamp-1">
                                            {lead.name}
                                        </h6>
                                        {urgency && (
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${urgency.cls}`}>
                                                {urgency.label}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
                                        <Phone size={10} className="text-[#006039]" />
                                        <span>{lead.phone}</span>
                                    </div>
                                    {lead.contactableDate && (
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                            <Clock size={10} className="text-amber-500" />
                                            <span>{new Date(lead.contactableDate).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Detail */}
                <div className="col-span-12 lg:col-span-8 bg-white border border-gray-100 shadow-sm flex flex-col overflow-hidden relative">
                    {selectedLead ? (
                        <div className="flex flex-col h-full">
                            {/* Detail Header */}
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-700 m-0">{selectedLead.name}</h2>
                                        {selectedLead.contactableDate && (() => {
                                            const urgency = getUrgencyBadge(selectedLead.contactableDate);
                                            return (
                                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded uppercase mt-1 ${urgency.cls}`}>
                                                    <AlertCircle size={10} /> {urgency.label} — {new Date(selectedLead.contactableDate).toLocaleString()}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <a
                                        href={`tel:${selectedLead.phone}`}
                                        className="flex items-center gap-2 bg-[#006039] text-white px-4 py-2 rounded text-[10px] font-bold uppercase"
                                    >
                                        <Phone size={14} /> Call Now
                                    </a>
                                </div>
                            </div>

                            {/* Detail Body */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1">
                                {/* Contact Info */}
                                <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b pb-2">Contact Details</p>
                                    {[
                                        { label: 'Phone', value: selectedLead.phone },
                                        { label: 'Email', value: selectedLead.email || '—' },
                                        { label: 'Rating', value: selectedLead.rating || '—' },
                                        { label: 'Stage', value: selectedLead.stage?.name || '—' },
                                    ].map((row, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">{row.label}</span>
                                            <span className="text-sm font-bold text-gray-700">{row.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Lead Info */}
                                <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b pb-2">Lead Info</p>
                                    {[
                                        { label: 'Source', value: selectedLead.source?.name || '—' },
                                        { label: 'Brand', value: selectedLead.brand?.name || '—' },
                                        { label: 'Project', value: selectedLead.project?.name || '—' },
                                        { label: 'Assigned To', value: selectedLead.assignedTo?.fullName || '—' },
                                    ].map((row, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">{row.label}</span>
                                            <span className="text-sm font-bold text-gray-700">{row.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Instruction */}
                                {selectedLead.instructionToPass && (
                                    <div className="md:col-span-2 bg-amber-50 border border-amber-100 rounded p-4">
                                        <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Instruction to Pass</p>
                                        <p className="text-sm text-gray-700">{selectedLead.instructionToPass}</p>
                                    </div>
                                )}

                                {/* Latest Activity */}
                                {selectedLead.activities && selectedLead.activities.length > 0 && (
                                    <div className="md:col-span-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b pb-2 mb-3">Last Activity</p>
                                        <div className="flex gap-3 p-3 bg-gray-50 rounded border border-gray-100">
                                            <div className="w-8 h-8 bg-[#006039]/10 rounded-full flex items-center justify-center flex-shrink-0">
                                                <Calendar size={14} className="text-[#006039]" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-700 m-0">{selectedLead.activities[0].content}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {new Date(selectedLead.activities[0].createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                            <Bell size={60} className="opacity-10 mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Select a reminder to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reminders;
