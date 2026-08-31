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
  Search,
  CalendarDays
} from 'lucide-react';
import ActionModal from '../components/modals/ActionModal';
import ActivityTimeline from '../components/crm/ActivityTimeline';

const Reminders: React.FC = () => {
    const [leads, setLeads] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [timeframe, setTimeframe] = useState<'overdue' | 'today' | 'tomorrow' | 'week' | 'month'>('today');
    const [modalType, setModalType] = useState<'FOLLOWUP' | 'REMINDER' | null>(null);
    const [activeView, setActiveView] = useState<'LIST' | 'DETAIL'>('LIST');

    // Counts for tabs
    const [counts, setCounts] = useState({
        overdue: 0,
        today: 0,
        tomorrow: 0,
        week: 0,
        month: 0,
    });

    const fetchCounts = async () => {
        try {
            const [overdueRes, todayRes, tomorrowRes, weekRes, monthRes] = await Promise.all([
                leadService.getLeads({ page: 1, limit: 1, timeframe: 'overdue' }),
                leadService.getLeads({ page: 1, limit: 1, timeframe: 'today' }),
                leadService.getLeads({ page: 1, limit: 1, timeframe: 'tomorrow' }),
                leadService.getLeads({ page: 1, limit: 1, timeframe: 'week' }),
                leadService.getLeads({ page: 1, limit: 1, timeframe: 'month' }),
            ]);
            setCounts({
                overdue: overdueRes.total || 0,
                today: todayRes.total || 0,
                tomorrow: tomorrowRes.total || 0,
                week: weekRes.total || 0,
                month: monthRes.total || 0,
            });
        } catch (e) {
            console.error('Failed to fetch reminder counts:', e);
        }
    };

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
                limit: 15,
                timeframe,
                search: search || undefined,
            });
            setLeads(res.data);
            setTotal(res.total);
            if (res.data.length > 0) {
                // If currently selected lead is still in data, preserve it or select the first
                const stillSelected = res.data.find((l: any) => l.id === selectedLead?.id);
                setSelectedLead(stillSelected || res.data[0]);
            } else {
                setSelectedLead(null);
            }
        } catch (error) {
            console.error('Error fetching reminders:', error);
        } finally {
            setIsLoading(false);
        }
    }, [page, timeframe, search]);

    useEffect(() => {
        fetchCounts();
    }, []);

    useEffect(() => {
        fetchReminders();
    }, [fetchReminders]);

    const getUrgencyColor = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'border-l-red-500 bg-red-50/50';
        if (diffDays === 0) return 'border-l-amber-500 bg-amber-50/40';
        return 'border-l-emerald-500 bg-emerald-50/30';
    };

    const getUrgencyBadge = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { label: 'Overdue', cls: 'bg-red-500 text-white' };
        if (diffDays === 0) return { label: 'Due Today', cls: 'bg-amber-500 text-white' };
        if (diffDays === 1) return { label: 'Tomorrow', cls: 'bg-blue-600 text-white' };
        return { label: 'Upcoming', cls: 'bg-emerald-600 text-white' };
    };

    const tabs: { key: typeof timeframe; label: string; count: number; color: string }[] = [
        { key: 'overdue', label: 'Overdue', count: counts.overdue, color: 'text-red-500' },
        { key: 'today',   label: 'Due Today', count: counts.today, color: 'text-amber-500' },
        { key: 'tomorrow',label: 'Tomorrow', count: counts.tomorrow, color: 'text-blue-500' },
        { key: 'week',    label: 'This Week', count: counts.week, color: 'text-emerald-500' },
        { key: 'month',   label: 'This Month', count: counts.month, color: 'text-purple-500' },
    ];

    return (
        <div className="space-y-4 md:space-y-6 w-full">
            {/* Header & Tabs Area */}
            <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200/80 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h4 className="text-xl md:text-2xl font-black text-gray-800 uppercase tracking-wide m-0 font-rubik flex items-center gap-2.5">
                            <Bell size={24} className="text-brand" /> Reminders & Follow-up Schedule
                        </h4>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1 m-0">
                            Manage lead contact schedules, scheduled meetings, and client follow-ups
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 bg-gray-100/80 p-1.5 rounded-xl border border-gray-200">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => { setTimeframe(tab.key); setPage(1); }}
                                className={`px-4 py-2 text-xs md:text-sm font-bold uppercase rounded-lg transition-all flex items-center gap-2 ${
                                    timeframe === tab.key
                                        ? 'bg-brand text-white shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                                    timeframe === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* View Toggle for Mobile/Tablet */}
            <div className="lg:hidden flex bg-white border border-gray-200/80 p-1.5 rounded-xl shadow-sm">
                <button 
                    onClick={() => setActiveView('LIST')}
                    className={`flex-1 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all ${activeView === 'LIST' ? 'bg-brand text-white shadow-sm' : 'text-gray-500'}`}
                >
                    Reminders List ({total})
                </button>
                <button 
                    onClick={() => setActiveView('DETAIL')}
                    className={`flex-1 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all ${activeView === 'DETAIL' ? 'bg-brand text-white shadow-sm' : 'text-gray-500'}`}
                >
                    Reminder Details
                </button>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-4 md:gap-6 min-h-[620px]">
                {/* Left Column: Reminders List */}
                <div className={`col-span-12 lg:col-span-4 bg-white border border-gray-200/80 shadow-sm rounded-xl flex flex-col overflow-hidden h-[calc(100vh-270px)] min-h-[580px] ${activeView === 'DETAIL' ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-3.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between gap-3">
                        <span className="text-xs md:text-sm font-extrabold text-gray-600 uppercase tracking-wider">
                            {total} Reminder{total !== 1 ? 's' : ''}
                        </span>
                        <div className="relative flex-1 max-w-[220px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                            <input 
                                type="text" 
                                placeholder="Search client..." 
                                className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-xs md:text-sm outline-none font-medium focus:border-brand transition-all"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100 overflow-y-auto flex-1 p-1">
                        {isLoading ? (
                            <div className="p-16 flex flex-col items-center justify-center gap-3">
                                <div className="w-8 h-8 border-3 border-brand border-t-transparent animate-spin rounded-full" />
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading reminders...</span>
                            </div>
                        ) : leads.length === 0 ? (
                            <div className="p-16 text-center">
                                <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-3 opacity-60" />
                                <h5 className="text-sm md:text-base font-bold text-gray-700 m-0">No reminders scheduled</h5>
                                <p className="text-xs font-medium text-gray-400 mt-1">
                                    All clear for the selected period!
                                </p>
                            </div>
                        ) : leads.map(lead => {
                            const urgency = lead.contactableDate ? getUrgencyBadge(lead.contactableDate) : null;
                            return (
                                <div
                                    key={lead.id}
                                    onClick={() => {
                                        setSelectedLead(lead);
                                        if (window.innerWidth < 1024) {
                                            setActiveView('DETAIL');
                                        }
                                    }}
                                    className={`p-3.5 cursor-pointer transition-all rounded-lg mb-1 border-l-4 ${
                                        selectedLead?.id === lead.id
                                            ? (lead.contactableDate ? `${getUrgencyColor(lead.contactableDate)} shadow-sm` : 'bg-blue-50/60 border-l-brand shadow-sm')
                                            : 'hover:bg-gray-50/80 border-l-transparent'
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <h6 className="text-sm md:text-base font-bold text-gray-800 m-0 font-rubik leading-snug">
                                            {lead.name}
                                        </h6>
                                        {urgency && (
                                            <span className={`text-[10px] md:text-xs font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wide ${urgency.cls}`}>
                                                {urgency.label}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-xs md:text-sm text-brand font-semibold mt-1">
                                        <span className="flex items-center gap-1.5">
                                            <Phone size={13} /> {lead.phone}
                                        </span>
                                        {lead.assignedTo && (
                                            <span className="text-gray-500 text-xs font-medium truncate max-w-[130px]">
                                                👤 {lead.assignedTo.fullName}
                                            </span>
                                        )}
                                    </div>
                                    {lead.contactableDate && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mt-1.5 pt-1 border-t border-gray-100/60">
                                            <Clock size={13} className="text-amber-500" />
                                            <span>
                                                {new Date(lead.contactableDate).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: 'numeric',
                                                    minute: 'numeric',
                                                    hour12: true
                                                })}
                                            </span>
                                            {lead.project?.name && (
                                                <span className="text-gray-400 ml-auto truncate max-w-[140px]">
                                                    · {lead.project.name}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 text-gray-600 hover:text-brand disabled:opacity-30 transition-colors">
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-xs md:text-sm font-bold text-gray-600 uppercase">
                            Page {page} of {Math.max(1, Math.ceil(total / 15))}
                        </span>
                        <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.max(1, Math.ceil(total / 15))} className="p-1.5 text-gray-600 hover:text-brand disabled:opacity-30 transition-colors">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Right Column: Selected Reminder Detail */}
                <div className={`col-span-12 lg:col-span-8 bg-white border border-gray-200/80 shadow-sm rounded-xl flex flex-col overflow-hidden h-[calc(100vh-270px)] min-h-[580px] ${activeView === 'LIST' ? 'hidden lg:flex' : 'flex'}`}>
                    {selectedLead ? (
                        <div className="flex flex-col h-full overflow-y-auto">
                            {/* Detail Header */}
                            <div className="p-5 md:p-6 border-b border-gray-100 bg-gray-50/40">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h2 className="text-2xl md:text-3xl font-black text-gray-800 m-0 font-rubik tracking-tight">{selectedLead.name}</h2>
                                        {selectedLead.contactableDate && (() => {
                                            const urgency = getUrgencyBadge(selectedLead.contactableDate);
                                            return (
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase mt-2 shadow-sm ${urgency.cls}`}>
                                                    <AlertCircle size={14} /> {urgency.label} — {new Date(selectedLead.contactableDate).toLocaleString('en-US', {
                                                        month: 'long',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: 'numeric',
                                                        minute: 'numeric',
                                                        hour12: true
                                                    })}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex flex-wrap gap-2.5">
                                        <a
                                            href={`tel:${selectedLead.phone}`}
                                            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold uppercase hover:bg-emerald-700 shadow-sm transition-all"
                                        >
                                            <Phone size={15} /> Call Now
                                        </a>
                                        <button
                                            onClick={() => setModalType('FOLLOWUP')}
                                            className="flex items-center gap-2 bg-brand text-white px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold uppercase hover:bg-brand/90 shadow-sm transition-all"
                                        >
                                            <Calendar size={15} /> Followup
                                        </button>
                                        <button
                                            onClick={() => setModalType('REMINDER')}
                                            className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold uppercase hover:bg-amber-600 shadow-sm transition-all"
                                        >
                                            <Bell size={15} /> Reschedule
                                        </button>
                                        <button
                                            onClick={() => handleDismissReminder(selectedLead.id)}
                                            className="flex items-center gap-2 bg-danger text-white px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold uppercase hover:bg-danger/90 shadow-sm transition-all"
                                        >
                                            <CheckCircle2 size={15} /> Complete
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Detail Body */}
                            <div className="p-5 md:p-6 space-y-6">
                                {/* Grid Info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/60">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Phone</span>
                                        <span className="text-sm md:text-base font-bold text-brand block mt-0.5">{selectedLead.phone}</span>
                                    </div>
                                    <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/60">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Email</span>
                                        <span className="text-sm md:text-base font-bold text-gray-800 block mt-0.5 truncate">{selectedLead.email || '—'}</span>
                                    </div>
                                    <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/60">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Project</span>
                                        <span className="text-sm md:text-base font-bold text-gray-800 block mt-0.5">{selectedLead.project?.name || '—'}</span>
                                    </div>
                                    <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/60">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Assigned Staff</span>
                                        <span className="text-sm md:text-base font-bold text-gray-800 block mt-0.5">{selectedLead.assignedTo?.fullName || 'Unassigned'}</span>
                                    </div>
                                </div>

                                {/* Instruction to Pass */}
                                {selectedLead.instructionToPass && (
                                    <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <CalendarDays size={16} className="text-amber-700" />
                                            <p className="text-xs font-black text-amber-800 uppercase tracking-wider m-0">Instructions / Scheduled Task</p>
                                        </div>
                                        <p className="text-sm md:text-base text-gray-800 font-medium italic m-0">{selectedLead.instructionToPass}</p>
                                    </div>
                                )}

                                {/* Timeline History */}
                                <div className="pt-2">
                                    <ActivityTimeline activities={selectedLead.activities || []} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12">
                            <Bell size={64} className="opacity-20 mb-4" />
                            <h4 className="text-sm md:text-base font-bold uppercase tracking-widest text-gray-500">Select a reminder to view details</h4>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Modals */}
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
