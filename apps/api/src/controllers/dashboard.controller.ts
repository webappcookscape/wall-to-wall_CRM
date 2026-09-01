import prisma from '../lib/prisma.js';
import type { Request, Response } from 'express';
import { asyncHandler, apiResponse } from '../utils/apiUtils.js';
import { applyLeadVisibility, getRequestUser } from '../utils/leadAccess.js';

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getRequestUser(req);
  const { userId: filterUserId, timeframe } = req.query as { userId?: string; timeframe?: string };

  const leadScope: any = {};
  
  // If user requested a specific employee's dashboard and has permission:
  if (filterUserId && (currentUser.role === 'ADMIN' || currentUser.role === 'BUSINESS_HEAD' || currentUser.id === filterUserId)) {
    leadScope.OR = [
      { assignedToId: filterUserId },
      { createdById: filterUserId }
    ];
  } else {
    await applyLeadVisibility(leadScope, currentUser);
  }

  // Date filtering logic
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const nowUtc = new Date();
  const nowIst = new Date(nowUtc.getTime() + istOffsetMs);
  const endOfDay = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate(), 23, 59, 59, 999) - istOffsetMs);

  let dateFilterClause: any = {};
  if (timeframe && timeframe !== 'all') {
    let startDate: Date | null = null;
    if (timeframe === 'today') {
      startDate = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate(), 0, 0, 0, 0) - istOffsetMs);
    } else if (timeframe === 'this_week') {
      const day = nowIst.getUTCDay();
      const diff = nowIst.getUTCDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), diff, 0, 0, 0, 0) - istOffsetMs);
    } else if (timeframe === 'this_month') {
      startDate = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), 1, 0, 0, 0, 0) - istOffsetMs);
    } else if (timeframe === 'this_year') {
      startDate = new Date(Date.UTC(nowIst.getUTCFullYear(), 0, 1, 0, 0, 0, 0) - istOffsetMs);
    }

    if (startDate) {
      dateFilterClause = { createdAt: { gte: startDate } };
    }
  }

  const scopedLeadWhere = (extra: any = {}) => ({
    AND: [
      extra,
      dateFilterClause,
      leadScope,
    ],
  });

  // Base metrics for current scope
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
    upcomingReminders,
    selectedEmployee
  ] = await Promise.all([
    prisma.lead.count({ where: scopedLeadWhere({}) }),

    // Fresh leads
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
    prisma.lead.count({ where: scopedLeadWhere({ status: { name: 'Disqualified' } }) }),
    
    // CRE Leads (Assigned to CRE)
    prisma.lead.count({ where: scopedLeadWhere({ assignedTo: { role: 'CRE' } }) }),

    // Design Completed
    prisma.lead.count({ where: scopedLeadWhere({ status: { name: 'Design Completed' } }) }),

    // Feasibility Desk
    prisma.lead.count({ 
      where: scopedLeadWhere({ 
        OR: [
          { status: { name: { contains: 'Feasibility', mode: 'insensitive' } } },
          { currentStage: { name: { contains: 'Feasibility', mode: 'insensitive' } } }
        ]
      }) 
    }),

    // Design Leads (Assigned to Designer)
    prisma.lead.count({ where: scopedLeadWhere({ assignedTo: { role: 'DESIGNER' } }) }),

    // Reminders Due (Due today + overdue in IST)
    prisma.lead.count({ where: scopedLeadWhere({ contactableDate: { lte: endOfDay } }) }),

    // Top 5 upcoming reminders in this scope
    prisma.lead.findMany({
      where: scopedLeadWhere({ contactableDate: { not: null } }),
      select: {
        id: true,
        leadId: true,
        name: true,
        phone: true,
        contactableDate: true,
        status: { select: { name: true } },
        project: { select: { name: true } },
        assignedTo: { select: { fullName: true } }
      },
      orderBy: { contactableDate: 'asc' },
      take: 5
    }),

    // Details of filtered user if any
    filterUserId ? prisma.user.findUnique({
      where: { id: filterUserId },
      select: { id: true, fullName: true, role: true, email: true }
    }) : null
  ]);

  // If currentUser is ADMIN or BUSINESS_HEAD, fetch employee breakdown summary
  let employeeBreakdown: any[] = [];
  if (currentUser.role === 'ADMIN' || currentUser.role === 'BUSINESS_HEAD') {
    const activeUsers = await prisma.user.findMany({
      where: { 
        status: true,
        role: { in: ['CRE', 'DESIGNER', 'BUSINESS_HEAD', 'DM_EXECUTIVE'] }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatar: true
      },
      orderBy: { fullName: 'asc' }
    });

    employeeBreakdown = await Promise.all(activeUsers.map(async (u) => {
      const userLeadWhere = (extraStatus?: string) => ({
        AND: [
          { assignedToId: u.id },
          dateFilterClause,
          extraStatus ? { status: { name: extraStatus } } : {}
        ]
      });

      const [assignedCount, yetToFollowCount, followUpCount, oppCount, wonCount, disqCount, userReminders] = await Promise.all([
        prisma.lead.count({ where: userLeadWhere() }),
        prisma.lead.count({ where: userLeadWhere('Yet To Follow-up') }),
        prisma.lead.count({ where: userLeadWhere('Follow-up') }),
        prisma.lead.count({ where: userLeadWhere('Opportunities') }),
        prisma.lead.count({ where: userLeadWhere('Order Booked') }),
        prisma.lead.count({ where: userLeadWhere('Disqualified') }),
        prisma.lead.count({ 
          where: { 
            AND: [
              { assignedToId: u.id },
              dateFilterClause,
              { contactableDate: { lte: endOfDay } }
            ] 
          } 
        })
      ]);

      const conversionRate = assignedCount > 0 
        ? ((wonCount / assignedCount) * 100).toFixed(1)
        : '0.0';

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        avatar: u.avatar,
        totalAssigned: assignedCount,
        yettofollow: yetToFollowCount,
        followup: followUpCount,
        opportunities: oppCount,
        orderbook: wonCount,
        disqualified: disqCount,
        remindersDue: userReminders,
        conversionRate
      };
    }));
  }

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
    upcomingReminders: upcomingReminders || [],
    selectedEmployee: selectedEmployee || null,
    employeeBreakdown: employeeBreakdown || []
  });
});
