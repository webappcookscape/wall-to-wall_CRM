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
      case 'EMAIL': return <Mail size={16} className="text-brand" />;
      case 'SMS': return <MessageSquare size={16} className="text-secondary" />;
      case 'PHONE': return <Phone size={16} className="text-brand" />;
      case 'STATUS_CHANGE': return <RefreshCcw size={16} className="text-warning" />;
      case 'ASSIGNMENT': return <UserPlus size={16} className="text-indigo-500" />;
      case 'NOTE': return <FileText size={16} className="text-gray-500" />;
      default: return <Clock size={16} className="text-gray-400" />;
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 italic text-xs md:text-sm font-bold uppercase tracking-widest font-rubik">
        No recent activity logged
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-gray-200/80 shadow-sm">
      <div className="bg-brand text-white px-5 py-3 rounded-t-xl text-xs md:text-sm font-black uppercase tracking-[0.2em] font-rubik flex items-center gap-2.5">
        <History size={18} /> Activity Log
      </div>
      <div className="bg-white divide-y divide-gray-100">
        {activities.map((activity) => (
          <div key={activity.id} className="p-4 md:p-5 flex gap-4 hover:bg-gray-50/50 transition-all group">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shadow-sm group-hover:bg-white transition-all">
                {getIcon(activity.type)}
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between items-start">
                <span className="text-xs md:text-sm font-bold text-brand font-rubik">
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
                  <span className="bg-secondary text-white text-[10px] md:text-xs font-black px-2.5 py-0.5 rounded shadow-sm uppercase tracking-wider">
                    {activity.user.role}
                  </span>
                )}
              </div>
              <p className="text-sm md:text-base text-gray-800 font-medium leading-relaxed m-0 whitespace-pre-line">
                {activity.content}
                {activity.user && (
                  <span className="text-gray-500 font-bold ml-1.5 italic opacity-80">
                    — {activity.user.fullName}
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
