import prisma from '../lib/prisma.js';
import type { Request, Response } from 'express';
import { asyncHandler, apiResponse } from '../utils/apiUtils.js';
import { applyLeadVisibility, getRequestUser } from '../utils/leadAccess.js';


export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getRequestUser(req);
  const leadScope: any = {};
  await applyLeadVisibility(leadScope, currentUser);
  const scopedLeadWhere = (extra: any = {}) => ({
    AND: [
      extra,
      leadScope,
    ],
  });

  const [
    totalLeads,
    freshLeads,
    yetToFollowUp,
    followups,
    opportunities,
    orderBooked,
    disqualified,
    creLeads,
    designCompleted,
    fealeads,
    designlead,
    remindersDue,
  ] = await Promise.all([
    prisma.lead.count({ where: leadScope }),

    // Count leads by status/type
    prisma.lead.count({
      where: scopedLeadWhere({
        OR: [
          { status: { name: 'Fresh' } },
          { statusId: null }
        ]
      })
    }),
    prisma.lead.count({ where: scopedLeadWhere({ status: { name: 'Yet To Follow-up' } }) }),
    prisma.lead.count({ where: scopedLeadWhere({ status: { name: 'Follow-up' } }) }),
    prisma.lead.count({ where: scopedLeadWhere({ status: { name: 'Opportunities' } }) }),
    prisma.lead.count({ where: scopedLeadWhere({ status: { name: 'Order Booked' } }) }),
    
    // Disqualified
    prisma.lead.count({ where: scopedLeadWhere({ status: { name: 'Disqualified' } }) }),
    
    // CRE Leads (Assigned but not fresh)
    prisma.lead.count({ where: scopedLeadWhere({ NOT: { assignedToId: null } }) }),

    // Design Completed
    prisma.lead.count({ where: scopedLeadWhere({ status: { name: 'Design Completed' } }) }),

    // Feasibility Desk
    prisma.lead.count({ where: scopedLeadWhere({ status: { name: { contains: 'Feasibility', mode: 'insensitive' } } }) }),

    // Design Allocation
    prisma.lead.count({ where: scopedLeadWhere({ status: { name: { contains: 'Design', mode: 'insensitive' } } }) }),

    // Reminders Due (Due today + overdue in IST)
    (() => {
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const nowUtc = new Date();
      const nowIst = new Date(nowUtc.getTime() + istOffsetMs);
      const endOfDay = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate(), 23, 59, 59, 999) - istOffsetMs);
      return prisma.lead.count({ where: scopedLeadWhere({ contactableDate: { lte: endOfDay } }) });
    })(),
  ]);

  apiResponse.success(res, {
    totalLeads,
    freshlead: freshLeads,
    yettofollow: yetToFollowUp,
    followup: followups,
    opportunities: opportunities,
    orderbook: orderBooked,
    disqualified: disqualified,
    creleads: creLeads,
    designCompleted: designCompleted,
    fealeads: fealeads || 0,
    designlead: designlead || 0,
    remindersDue,
  });
});
