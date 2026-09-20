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
      currentStage: true,
      assignedTo: true,
      createdBy: true,
      tags: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const reportData = leads.map(lead => {
    let siteLocation = '';
    let cleanComments = lead.comments || '';
    if (lead.comments) {
      const locMatch = lead.comments.match(/Location:\s*([^|]+)/i);
      if (locMatch && locMatch[1]) siteLocation = locMatch[1].trim();
      cleanComments = lead.comments
        .replace(/Location:\s*[^|]+(\s*\|\s*)?/gi, '')
        .replace(/Requirement:\s*[^|]+(\s*\|\s*)?/gi, '')
        .replace(/^(\s*\|\s*|\s*\/\s*)+|(\s*\|\s*|\s*\/\s*)+$/g, '')
        .trim();
    }

    const nextDateVal = lead.nextFollowUp || lead.contactableDate;
    const nextDateStr = nextDateVal ? nextDateVal.toISOString().split('T')[0] : '';
    const baseDateStr = lead.dataCollected ? lead.dataCollected.toISOString().split('T')[0] : lead.createdAt.toISOString().split('T')[0];
    const createdDateStr = lead.createdAt.toISOString().split('T')[0];
    const sourceName = lead.source?.name || lead.leadType || 'Direct Lead';

    return {
      id: lead.id,
      leadId: `#${lead.leadId}`,
      clientName: lead.name,
      phone: lead.phone,
      email: lead.email || '',
      brand: lead.brand?.name || 'Wall to Wall',
      source: sourceName,
      project: lead.project?.name || '-',
      status: lead.status?.name || 'Fresh',
      stage: lead.currentStage?.name || '-',
      rating: lead.rating ? `${lead.rating} - ${lead.ratingName || 'Rated'}` : 'Not Rated',
      dateCollected: baseDateStr,
      createdDate: createdDateStr,
      nextFollowUp: nextDateStr,
      assignedTo: lead.assignedTo?.fullName || 'Unassigned',
      createdBy: lead.createdBy?.fullName || 'System',
      siteLocation: siteLocation || '-',
      comments: cleanComments || '-',
      instructionToPass: lead.instructionToPass || '-',
      tags: lead.tags.map(t => t.name).join(', ') || '-',

      // Backward compatible aliases
      baseDate: baseDateStr,
      baseSource: sourceName,
      date: createdDateStr,
      assignTo: lead.assignedTo?.fullName || 'Unassigned',
      phNo1: lead.phone,
      emailId: lead.email || '',
      feedBack: cleanComments || '-',
      instructionPass: lead.instructionToPass || '-',
    };
  });

  return apiResponse.success(res, reportData, 'Leads master report generated successfully');
});
