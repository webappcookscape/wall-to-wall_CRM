import React from 'react';
import {
  Mail,
  MessageSquare,
  Phone,
  RefreshCcw,
  UserPlus,
  FileText,
  Clock,
  History
} from 'lucide-react';
import type { LeadActivity } from '../../types/crm';

interface ActivityTimelineProps {
  activities: LeadActivity[];
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'EMAIL': return <Mail size={14} className="text-brand" />;
      case 'SMS': return <MessageSquare size={14} className="text-secondary" />;
      case 'PHONE': return <Phone size={14} className="text-brand" />;
      case 'STATUS_CHANGE': return <RefreshCcw size={14} className="text-warning" />;
      case 'ASSIGNMENT': return <UserPlus size={14} className="text-indigo-500" />;
      case 'NOTE': return <FileText size={14} className="text-gray-500" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="p-8 text-center text-gray-300 italic text-[11px] uppercase tracking-widest font-rubik">
        No recent activity logged
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="bg-brand text-white px-4 py-2 rounded-t text-[11px] font-black uppercase tracking-[0.2em] font-rubik flex items-center gap-2">
        <History size={14} /> Activity Log
      </div>
      <div className="bg-white border-x border-b border-[#e3eaef] rounded-b divide-y divide-gray-50">
        {activities.map((activity) => (
          <div key={activity.id} className="p-4 flex gap-4 hover:bg-gray-50/50 transition-all group">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shadow-sm group-hover:bg-white transition-all">
                {getIcon(activity.type)}
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[12px] font-bold text-brand font-rubik">
                  {new Date(activity.createdAt).toLocaleString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                  })}
                </span>
                {activity.user && (
                  <span className="bg-secondary text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm uppercase tracking-tighter">
                    {activity.user.role}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[#313a46] font-medium leading-relaxed">
                {activity.content}
                {activity.user && (
                  <span className="text-gray-400 font-bold ml-1 italic opacity-70">
                    - {activity.user.fullName}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityTimeline;
