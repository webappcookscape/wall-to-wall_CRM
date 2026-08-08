import prisma from '../lib/prisma.js';
import type { Request, Response } from 'express';
import { asyncHandler, apiResponse } from '../utils/apiUtils.js';
import { applyLeadVisibility, getAssignableUsersClause, getRequestUser } from '../utils/leadAccess.js';


export const getUserPerformance = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getRequestUser(req);
  const leadScope: any = {};
  await applyLeadVisibility(leadScope, currentUser);
  const scopedLeadWhere = (extra: any = {}) => ({
    ...extra,
    ...leadScope,
    AND: [
      ...(extra.AND || []),
      ...(leadScope.AND || []),
      ...(Object.keys(extra).some(key => key !== 'AND') && Object.keys(leadScope).some(key => key !== 'AND') ? [extra, leadScope] : []),
    ],
  });

  // Fetch all active users (you can filter by role if needed)
  const users = await prisma.user.findMany({
    where: getAssignableUsersClause(currentUser),
    select: { id: true, fullName: true, role: true }
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);

  const reportData = await Promise.all(users.map(async (user) => {
    // 1. CALLS
    const calls = await prisma.leadActivity.count({
      where: {
        userId: user.id,
        OR: [
          { type: { contains: 'call', mode: 'insensitive' } },
          { content: { contains: 'call', mode: 'insensitive' } }
        ],
        lead: leadScope
      }
    });

    // 2. PRP (Proposals)
    const prp = await prisma.leadActivity.count({
      where: {
        userId: user.id,
        OR: [
          { type: { contains: 'proposal', mode: 'insensitive' } },
          { content: { contains: 'proposal', mode: 'insensitive' } }
        ],
        lead: leadScope
      }
    });

    // 3. MSMT (Measurement)
    const msmt = await prisma.leadActivity.count({
      where: {
        userId: user.id,
        OR: [
          { type: { contains: 'measurement', mode: 'insensitive' } },
          { content: { contains: 'measurement', mode: 'insensitive' } }
        ],
        lead: leadScope
      }
    });

    // 5. ORDERS (Order Booked)
    const orders = await prisma.lead.count({
      where: scopedLeadWhere({
        assignedToId: user.id,
        status: { name: 'Order Booked' },
      })
    });

    // Helper to get ratings for a specific timeframe
    const getRatingsForTimeframe = async (startDate: Date) => {
      const leads = await prisma.lead.findMany({
        where: scopedLeadWhere({
          assignedToId: user.id,
          createdAt: { gte: startDate },
          rating: { gte: 5, lte: 9 },
        }),
        select: { rating: true }
      });

      const counts = { '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, 'total': leads.length };
      leads.forEach(l => {
        if (l.rating >= 5 && l.rating <= 9) {
          counts[l.rating.toString() as keyof typeof counts]++;
        }
      });
      return counts;
    };

    const upToDay = await getRatingsForTimeframe(todayStart);
    const thisWeek = await getRatingsForTimeframe(weekStart);

    return {
      userId: user.id,
      name: user.fullName,
      role: user.role,
      calls,
      upToDay,
      thisWeek,
      prp,
      msmt,
      orders
    };
  }));

  // Sort by name or role if needed
  reportData.sort((a, b) => a.name.localeCompare(b.name));

  return apiResponse.success(res, reportData, 'Performance report generated successfully');
});

export const getLeadsMasterReport = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getRequestUser(req);
  const where: any = {};
  await applyLeadVisibility(where, currentUser);

  const leads = await prisma.lead.findMany({
    where,
    include: {
      source: true,
      project: true,
      brand: true,
      status: true,
      assignedTo: true,
      tags: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const reportData = leads.map(lead => {
    // Determine Design Owner: if assigned to is DESIGNER, output name, else blank
    const isDesigner = lead.assignedTo?.role === 'DESIGNER';
    const designOwner = isDesigner ? lead.assignedTo?.fullName : '';

    return {
      id: lead.id,
      baseDate: lead.dataCollected ? lead.dataCollected.toISOString().split('T')[0] : lead.createdAt.toISOString().split('T')[0],
      baseSource: lead.source?.name || '',
      date: lead.createdAt.toISOString().split('T')[0],
      assignTo: lead.assignedTo?.fullName || '',
      clientName: lead.name,
      phNo1: lead.phone,
      dNo: lead.leadId,
      project: lead.project?.name || '',
      emailId: lead.email || '',
      phNo2: '', // Lead has only 1 phone field in Prisma schema
      feedBack: lead.comments || '',
      rating: lead.rating || 0,
      brand: lead.brand?.name || '',
      tag: lead.tags.map(t => t.name).join(', '),
      designOwner,
      instructionPass: lead.instructionToPass || '',
      cpCode: '', // Mock/Empty as there is no CP Code in schema
      status: lead.status?.name || ''
    };
  });

  return apiResponse.success(res, reportData, 'Leads master report generated successfully');
});
