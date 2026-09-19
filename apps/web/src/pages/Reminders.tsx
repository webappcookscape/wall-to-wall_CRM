import React, { useState, useEffect, useCallback } from 'react';
import { leadService } from '../services/api';
import { 
  Bell, 
  Phone, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  CalendarDays
} from 'lucide-react';
import ActionModal from '../components/modals/ActionModal';
import { useAuth } from '../contexts/AuthContext';
import { getRatingLabel } from '../utils/rating';

type TimeframeType = 'overdue' | 'today' | 'tomorrow' | 'week' | 'month' | 'all';

const Reminders: React.FC = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [timeframe, setTimeframe] = useState<TimeframeType>('today');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [masters, setMasters] = useState<any>(null);
    const [modalType, setModalType] = useState<'FOLLOWUP' | 'REMINDER' | null>(null);
    const [activeView, setActiveView] = useState<'LIST' | 'DETAIL'>('LIST');
    const [contactCounts, setContactCounts] = useState<{
        uptoToday?: number;
        today?: number;
        tomorrow?: number;
        week?: number;
        month?: number;
    }>({});

    const canFilterEmployees = user?.role === 'ADMIN' || user?.role === 'BUSINESS_HEAD' || user?.role === 'DM_EXECUTIVE';

    // Load master data (for employee dropdown)
    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const data = await leadService.getMasters();
                setMasters(data);
            } catch (err) {
                console.error('Failed to load masters in Reminders:', err);
            }
        };
        fetchMasters();
    }, []);

    // Load reminder timeline counts
    const fetchCounts = useCallback(async () => {
        try {
            const counts = await leadService.getContactableCounts(selectedEmployeeId || undefined);
            setContactCounts(counts || {});
        } catch (err) {
            console.error('Failed to fetch contactable counts:', err);
        }
    }, [selectedEmployeeId]);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    const handleDismissReminder = async (leadId: string) => {
        if (!window.confirm('Are you sure you want to mark this reminder as completed?')) return;
        try {
            await leadService.updateLead(leadId, { contactableDate: null });
            await leadService.addLeadActivity(leadId, {
                type: 'NOTE',
                content: 'Reminder marked as completed/dismissed'
            });
            fetchReminders();
            fetchCounts();
        } catch (error) {
            console.error('Error completing reminder:', error);
            alert('Failed to complete reminder.');
        }
    };

    const fetchReminders = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await leadService.getLeads({
                page,
                limit: 20,
                timeframe,
                assignedToIds: selectedEmployeeId ? [selectedEmployeeId] : undefined,
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
    }, [page, timeframe, selectedEmployeeId]);

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

    const tabs: { key: TimeframeType; label: string; count?: number }[] = [
        { key: 'overdue', label: 'Overdue', count: Math.max(0, (contactCounts.uptoToday || 0) - (contactCounts.today || 0)) },
        { key: 'today',   label: 'Today', count: contactCounts.today },
        { key: 'tomorrow',label: 'Tomorrow', count: contactCounts.tomorrow },
        { key: 'week',    label: 'This Week', count: contactCounts.week },
        { key: 'month',   label: 'This Month', count: contactCounts.month },
        { key: 'all',     label: 'All Timeline' },
    ];

    return (
        <div className="container-fluid py-4 space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h4 className="page-title text-xl font-bold text-gray-800 m-0 flex items-center gap-2">
                        <Bell size={22} className="text-[#006039]" /> Lead Reminders Timeline
                    </h4>
                    <p className="text-[11px] text-gray-500 font-medium mt-1">
                        {canFilterEmployees 
                            ? (selectedEmployeeId ? 'Viewing reminders assigned to selected employee' : 'Showing reminders for all leads across all employees')
                            : 'Showing reminders for leads assigned to you'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Employee Filter Dropdown for Admin & Managers */}
                    {canFilterEmployees && (
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                            <Users size={14} className="text-[#006039]" />
                            <select
                                value={selectedEmployeeId}
                                onChange={(e) => { setSelectedEmployeeId(e.target.value); setPage(1); }}
                                className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
                            >
                                <option value="">All Leads Timeline (All Employees)</option>
                                {masters?.users?.map((u: any) => (
                                    <option key={u.id} value={u.id}>
                                        {u.fullName || u.email} {u.role ? `(${u.role})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Timeframe Tabs */}
                    <div className="flex flex-wrap items-center gap-1 bg-gray-50 border border-gray-200 rounded-full p-1 shadow-sm">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => { setTimeframe(tab.key); setPage(1); }}
                                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-full transition-all flex items-center gap-1.5 ${
                                    timeframe === tab.key
                                        ? 'bg-[#006039] text-white shadow'
                                        : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                <span>{tab.label}</span>
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                                        timeframe === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Stat Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div 
                    onClick={() => { setTimeframe('overdue'); setPage(1); }}
                    className={`cursor-pointer bg-white p-3.5 rounded-xl border transition-all ${
                        timeframe === 'overdue' ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-100 hover:border-red-200'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Overdue</span>
                        <AlertCircle size={16} className="text-red-500" />
                    </div>
                    <div className="text-xl font-bold text-gray-800 mt-1">
                        {Math.max(0, (contactCounts.uptoToday || 0) - (contactCounts.today || 0))}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Needs immediate follow-up</div>
                </div>

                <div 
                    onClick={() => { setTimeframe('today'); setPage(1); }}
                    className={`cursor-pointer bg-white p-3.5 rounded-xl border transition-all ${
                        timeframe === 'today' ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-100 hover:border-amber-200'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Today</span>
                        <Clock size={16} className="text-amber-500" />
                    </div>
                    <div className="text-xl font-bold text-gray-800 mt-1">{contactCounts.today || 0}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Scheduled for today</div>
                </div>

                <div 
                    onClick={() => { setTimeframe('tomorrow'); setPage(1); }}
                    className={`cursor-pointer bg-white p-3.5 rounded-xl border transition-all ${
                        timeframe === 'tomorrow' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100 hover:border-blue-200'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Tomorrow</span>
                        <Calendar size={16} className="text-blue-500" />
                    </div>
                    <div className="text-xl font-bold text-gray-800 mt-1">{contactCounts.tomorrow || 0}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Coming tomorrow</div>
                </div>

                <div 
                    onClick={() => { setTimeframe('week'); setPage(1); }}
                    className={`cursor-pointer bg-white p-3.5 rounded-xl border transition-all ${
                        timeframe === 'week' ? 'border-purple-400 ring-2 ring-purple-100' : 'border-gray-100 hover:border-purple-200'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">This Week</span>
                        <CalendarDays size={16} className="text-purple-500" />
                    </div>
                    <div className="text-xl font-bold text-gray-800 mt-1">{contactCounts.week || 0}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Next 7 days timeline</div>
                </div>

                <div 
                    onClick={() => { setTimeframe('all'); setPage(1); }}
                    className={`cursor-pointer bg-white p-3.5 rounded-xl border transition-all ${
                        timeframe === 'all' ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-100 hover:border-emerald-200'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#006039]">All Timeline</span>
                        <Bell size={16} className="text-[#006039]" />
                    </div>
                    <div className="text-xl font-bold text-gray-800 mt-1">{total}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Total scheduled leads</div>
                </div>
            </div>

            {/* View Toggle for Mobile/Tablet */}
            <div className="lg:hidden flex bg-white border border-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveView('LIST')}
                    className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${activeView === 'LIST' ? 'bg-[#006039] text-white shadow' : 'text-gray-400'}`}
                >
                    Reminders List ({total})
                </button>
                <button 
                    onClick={() => setActiveView('DETAIL')}
                    className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${activeView === 'DETAIL' ? 'bg-[#006039] text-white shadow' : 'text-gray-400'}`}
                >
                    Reminder Details
                </button>
            </div>

            {/* List and Detail Split View */}
            <div className="grid grid-cols-12 gap-6">
                {/* Reminders List Panel */}
                <div className={`col-span-12 lg:col-span-4 bg-white border border-gray-100 shadow-sm rounded-xl flex flex-col overflow-hidden h-[calc(100vh-280px)] lg:h-[calc(100vh-260px)] ${activeView === 'DETAIL' ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                            {total} Reminder{total !== 1 ? 's' : ''} Listed
                        </span>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))} 
                                disabled={page === 1} 
                                className="p-1 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-[10px] font-bold text-gray-500">
                                Page {page} / {Math.max(1, Math.ceil(total / 20))}
                            </span>
                            <button 
                                onClick={() => setPage(p => p + 1)} 
                                disabled={page >= Math.max(1, Math.ceil(total / 20))} 
                                className="p-1 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
                        {isLoading ? (
                            <div className="p-10 flex flex-col items-center justify-center text-gray-400 space-y-2">
                                <div className="w-6 h-6 border-2 border-[#006039] border-t-transparent animate-spin rounded-full" />
                                <span className="text-xs">Loading schedule...</span>
                            </div>
                        ) : leads.length === 0 ? (
                            <div className="p-10 text-center">
                                <CheckCircle2 size={42} className="text-gray-300 mx-auto mb-3" />
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    No reminders found
                                </p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                    No follow-ups scheduled for this timeframe or filter.
                                </p>
                            </div>
                        ) : leads.map(lead => {
                            const urgency = lead.contactableDate ? getUrgencyBadge(lead.contactableDate) : null;
                            const isSelected = selectedLead?.id === lead.id;
                            return (
                                <div
                                    key={lead.id}
                                    onClick={() => {
                                        setSelectedLead(lead);
                                        if (window.innerWidth < 1024) {
                                            setActiveView('DETAIL');
                                        }
                                    }}
                                    className={`p-3.5 cursor-pointer transition-all border-l-4 ${
                                        isSelected
                                            ? (lead.contactableDate ? getUrgencyColor(lead.contactableDate) : 'bg-emerald-50/50 border-l-[#006039]')
                                            : 'hover:bg-gray-50 border-l-transparent'
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <h6 className="text-[13px] font-bold text-gray-800 m-0 line-clamp-1">
                                            {lead.name}
                                        </h6>
                                        {urgency && (
                                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${urgency.cls}`}>
                                                {urgency.label}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5">
                                        <div className="flex items-center gap-1 font-semibold text-[#006039]">
                                            <Phone size={11} />
                                            <span>{lead.phone}</span>
                                        </div>
                                        {lead.assignedTo?.fullName && (
                                            <span className="text-[10px] text-gray-500 font-medium bg-gray-100 px-1.5 py-0.2 rounded">
                                                {lead.assignedTo.fullName}
                                            </span>
                                        )}
                                    </div>

                                    {lead.contactableDate && (
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                            <Clock size={11} className="text-amber-500" />
                                            <span>{new Date(lead.contactableDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                        </div>
                                    )}

                                    {lead.instructionToPass && (
                                        <div className="mt-1.5 text-[10px] text-gray-500 line-clamp-1 italic bg-white/70 px-1.5 py-0.5 rounded border border-gray-200/50">
                                            {lead.instructionToPass}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Reminder Details Panel */}
                <div className={`col-span-12 lg:col-span-8 bg-white border border-gray-100 shadow-sm rounded-xl flex flex-col overflow-hidden relative h-[calc(100vh-280px)] lg:h-[calc(100vh-260px)] ${activeView === 'LIST' ? 'hidden lg:flex' : 'flex'}`}>
                    {selectedLead ? (
                        <div className="flex flex-col h-full">
                            {/* Detail Header */}
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800 m-0">{selectedLead.name}</h2>
                                        {selectedLead.contactableDate && (() => {
                                            const urgency = getUrgencyBadge(selectedLead.contactableDate);
                                            return (
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-1.5 ${urgency.cls}`}>
                                                    <AlertCircle size={11} /> {urgency.label} — {new Date(selectedLead.contactableDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <a
                                            href={`tel:${selectedLead.phone}`}
                                            className="flex items-center gap-1.5 bg-[#006039] text-white px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase hover:bg-[#004d30] shadow-sm transition-all"
                                        >
                                            <Phone size={14} /> Call Now
                                        </a>
                                        <button
                                            onClick={() => setModalType('FOLLOWUP')}
                                            className="flex items-center gap-1.5 bg-brand text-white px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase hover:bg-brand/90 shadow-sm transition-all"
                                        >
                                            <Calendar size={14} /> Log Follow-up
                                        </button>
                                        <button
                                            onClick={() => setModalType('REMINDER')}
                                            className="flex items-center gap-1.5 bg-amber-500 text-white px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase hover:bg-amber-600 shadow-sm transition-all"
                                        >
                                            <Bell size={14} /> Reschedule
                                        </button>
                                        <button
                                            onClick={() => handleDismissReminder(selectedLead.id)}
                                            className="flex items-center gap-1.5 bg-emerald-600 text-white px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase hover:bg-emerald-700 shadow-sm transition-all"
                                        >
                                            <CheckCircle2 size={14} /> Mark Completed
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Detail Body */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1">
                                {/* Contact Info */}
                                <div className="space-y-3 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1.5 m-0">Contact Details</p>
                                    {[
                                        { label: 'Phone', value: selectedLead.phone },
                                        { label: 'Email', value: selectedLead.email || '—' },
                                        { label: 'Rating', value: getRatingLabel(selectedLead.rating, selectedLead.ratingName) },
                                        { label: 'Stage', value: selectedLead.currentStage?.name || selectedLead.stage?.name || '—' },
                                    ].map((row, i) => (
                                        <div key={i} className="flex justify-between items-center py-1 border-b border-gray-100/80 last:border-0">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">{row.label}</span>
                                            <span className="text-xs font-bold text-gray-700">{row.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Lead Info */}
                                <div className="space-y-3 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1.5 m-0">Lead Details</p>
                                    {[
                                        { label: 'Status', value: selectedLead.status?.name || 'Fresh' },
                                        { label: 'Brand', value: selectedLead.brand?.name || '—' },
                                        { label: 'Project', value: selectedLead.project?.name || '—' },
                                        { label: 'Source', value: selectedLead.source?.name || '—' },
                                        { label: 'Assigned To', value: selectedLead.assignedTo?.fullName || 'Unassigned' },
                                    ].map((row, i) => (
                                        <div key={i} className="flex justify-between items-center py-1 border-b border-gray-100/80 last:border-0">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">{row.label}</span>
                                            <span className="text-xs font-bold text-gray-700">{row.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Instruction to Pass */}
                                {selectedLead.instructionToPass && (
                                    <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
                                        <p className="text-[10px] font-bold text-amber-700 uppercase mb-1 flex items-center gap-1.5">
                                            <AlertCircle size={12} /> Instruction to Pass
                                        </p>
                                        <p className="text-xs font-medium text-gray-800 m-0">{selectedLead.instructionToPass}</p>
                                    </div>
                                )}

                                {/* Comments / Discussion Notes */}
                                {selectedLead.comments && (
                                    <div className="md:col-span-2 bg-blue-50/70 border border-blue-100 rounded-xl p-4">
                                        <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">
                                            Discussion & History Notes
                                        </p>
                                        <p className="text-xs text-gray-700 m-0 whitespace-pre-wrap">{selectedLead.comments}</p>
                                    </div>
                                )}

                                {/* Latest Activity */}
                                {selectedLead.activities && selectedLead.activities.length > 0 && (
                                    <div className="md:col-span-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b pb-2 mb-3">Activity Timeline</p>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {selectedLead.activities.slice(0, 5).map((act: any) => (
                                                <div key={act.id} className="flex gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                                                    <div className="w-7 h-7 bg-[#006039]/10 rounded-full flex items-center justify-center flex-shrink-0 text-[#006039]">
                                                        <Calendar size={13} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-700 m-0">{act.content}</p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                                            {new Date(act.createdAt).toLocaleString()} {act.user?.fullName ? `• by ${act.user.fullName}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-8">
                            <Bell size={64} className="opacity-15 mb-3" />
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                Select a reminder from the list to view full lead details
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for follow-up / reschedule actions */}
            {modalType && selectedLead && (
                <ActionModal 
                    isOpen={modalType !== null}
                    onClose={() => setModalType(null)}
                    onSuccess={() => {
                        setModalType(null);
                        fetchReminders();
                        fetchCounts();
                    }}
                    lead={selectedLead}
                    type={modalType}
                />
            )}
        </div>
    );
};

export default Reminders;
