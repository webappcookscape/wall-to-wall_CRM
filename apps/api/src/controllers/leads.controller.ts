import prisma from '../lib/prisma.js';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { sendMetaLead } from '../services/meta.service.js';
import { asyncHandler, apiResponse } from '../utils/apiUtils.js';
import {
  applyLeadVisibility,
  appendAndClause,
  ensureLeadAssignAccess,
  ensureLeadCreateAccess,
  ensureLeadDeleteAccess,
  ensureLeadUpdateAccess,
  ensureLeadViewAccess,
  getRequestUser,
} from '../utils/leadAccess.js';

const normalizePhone = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Take last 10 digits (standard Indian mobile format)
  return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
};

const getMetaEventNameForStatus = (statusName?: string | null): string | null => {
  if (!statusName) return null;

  const normalizedStatus = statusName.trim().toLowerCase();

  if (normalizedStatus === 'disqualified') return 'DisqualifiedLead';
  if (normalizedStatus === 'yet to follow-up') return 'LeadAwaitingFollowUp';
  if (normalizedStatus === 'fresh') return 'Lead';
  if (normalizedStatus === 'follow-up') return 'LeadModerate';
  if (normalizedStatus === 'opportunities') return 'Contact';
  if (normalizedStatus === 'order booked') return 'Purchase';

  return null;
};

const buildSyntheticLeadAudit = (lead: any) => {
  const activities = lead.activities || [];
  const synthetic: any[] = [];
  const createdByName = lead.createdBy?.fullName || 'Unknown User';
  const assignedToName = lead.assignedTo?.fullName;
  const statusName = lead.status?.name;

  const hasCreatedLog = activities.some((activity: any) =>
    activity.type === 'SYSTEM' && /^Lead created by /i.test(String(activity.content || ''))
  );
  if (!hasCreatedLog) {
    synthetic.push({
      id: `synthetic-created-${lead.id}`,
      type: 'SYSTEM',
      content: `Lead created by ${createdByName}`,
      user: lead.createdBy || null,
      createdAt: lead.createdAt,
    });
  }

  if (statusName && !activities.some((activity: any) => activity.type === 'STATUS_CHANGE')) {
    synthetic.push({
      id: `synthetic-status-${lead.id}`,
      type: 'STATUS_CHANGE',
      content: `Current status: ${statusName}`,
      user: null,
      createdAt: lead.updatedAt,
    });
  }

  if (assignedToName && !activities.some((activity: any) => activity.type === 'ASSIGNMENT')) {
    synthetic.push({
      id: `synthetic-assignment-${lead.id}`,
      type: 'ASSIGNMENT',
      content: `Assigned to ${assignedToName}${lead.assignedTo?.role ? ` (${lead.assignedTo.role})` : ''}`,
      user: null,
      createdAt: lead.updatedAt,
    });
  }

  return synthetic;
};


export const getLeads = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getRequestUser(req);
  const { 
    page = 1, 
    limit = 10, 
    statusIds, // Array
    projectIds, // Array
    sourceIds, // Array
    brandIds, // Array
    stageIds, // Array
    assignedToIds, // Array
    tagId,
    rating,
    timeframe, // 'today', 'tomorrow', 'week', 'month'
    fromDate,
    toDate,
    contactDate,
    search 
  } = req.body;
  const skip = (Number(page) - 1) * Number(limit);
  
  const where: any = {};
  
  if (statusIds && Array.isArray(statusIds) && statusIds.length > 0) where.statusId = { in: statusIds };
  else if (req.body.statusId) where.statusId = req.body.statusId;

  if (projectIds && Array.isArray(projectIds) && projectIds.length > 0) where.projectId = { in: projectIds };
  else if (req.body.projectId) where.projectId = req.body.projectId;

  if (sourceIds && Array.isArray(sourceIds) && sourceIds.length > 0) where.sourceId = { in: sourceIds };
  else if (req.body.sourceId) where.sourceId = req.body.sourceId;

  if (brandIds && Array.isArray(brandIds) && brandIds.length > 0) where.brandId = { in: brandIds };
  else if (req.body.brandId) where.brandId = req.body.brandId;

  if (stageIds && Array.isArray(stageIds) && stageIds.length > 0) where.currentStageId = { in: stageIds };

  if (assignedToIds && Array.isArray(assignedToIds) && assignedToIds.length > 0) where.assignedToId = { in: assignedToIds };

  if (rating) where.rating = Number(rating);
  if (tagId) {
    where.tags = { some: { id: tagId } };
  }
  
  // Explicit created-date range
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate);
    if (toDate) where.createdAt.lte = new Date(toDate);
  }

  if (contactDate) {
    const selectedDate = new Date(String(contactDate));
    const contactStart = new Date(selectedDate.setHours(0, 0, 0, 0));
    const contactEnd = new Date(selectedDate.setHours(23, 59, 59, 999));
    where.contactableDate = { gte: contactStart, lte: contactEnd };
  }
  
  if (timeframe) {
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const nowUtc = new Date();
    const nowIst = new Date(nowUtc.getTime() + istOffsetMs);
    
    const istYear = nowIst.getUTCFullYear();
    const istMonth = nowIst.getUTCMonth();
    const istDate = nowIst.getUTCDate();
    
    const startOfDay = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0) - istOffsetMs);
    const endOfDay = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);

    const tomorrowStart = new Date(Date.UTC(istYear, istMonth, istDate + 1, 0, 0, 0) - istOffsetMs);
    const tomorrowEnd = new Date(Date.UTC(istYear, istMonth, istDate + 1, 23, 59, 59, 999) - istOffsetMs);

    const weekEnd = new Date(Date.UTC(istYear, istMonth, istDate + 7, 23, 59, 59, 999) - istOffsetMs);
    const monthEnd = new Date(Date.UTC(istYear, istMonth + 1, istDate, 23, 59, 59, 999) - istOffsetMs);

    if (timeframe === 'today') {
      where.contactableDate = { gte: startOfDay, lte: endOfDay };
    } else if (timeframe === 'tomorrow') {
      where.contactableDate = { gte: tomorrowStart, lte: tomorrowEnd };
    } else if (timeframe === 'week') {
      where.contactableDate = { gte: startOfDay, lte: weekEnd };
    } else if (timeframe === 'month') {
      where.contactableDate = { gte: startOfDay, lte: monthEnd };
    } else if (timeframe === 'overdue') {
      where.contactableDate = { lt: startOfDay };
    }
  }
  
  if (search) {
    const searchConditions: any[] = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
    
    // Also search by numeric leadId if the search term is a valid number
    if (!isNaN(Number(search)) && search.trim() !== '') {
      searchConditions.push({ leadId: Number(search) });
    }

    // If we already have an OR clause (from date filter), combine using AND
    if (where.OR) {
      where.AND = [
        { OR: where.OR },
        { OR: searchConditions },
      ];
      delete where.OR;
    } else {
      where.OR = searchConditions;
    }
  }

  await applyLeadVisibility(where, currentUser);

  const [data, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: Number(limit),
      include: {
        status: true,
        project: true,
        source: true,
        brand: true,
        tags: true,
        currentStage: true,
        assignedTo: { select: { id: true, fullName: true, role: true } },
        createdBy: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.lead.count({ where }),
  ]);

  apiResponse.success(res, {
    data: data.map((l: any) => ({
        ...l,
        brand_name: l.brand?.name || '-',
        status_name: l.status?.name || '-',
    })),
    total,
    page: Number(page),
    limit: Number(limit)
  });
});

export const getContactableCounts = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = getRequestUser(req);
    const { userId } = req.query;
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    const tomorrowStart = new Date(startOfDay);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(endOfDay);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const weekEnd = new Date(startOfDay);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const monthEnd = new Date(startOfDay);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const filter: any = {};
    if (userId && (currentUser.role === 'ADMIN' || currentUser.role === 'BUSINESS_HEAD')) {
      filter.assignedToId = String(userId);
    }
    await applyLeadVisibility(filter, currentUser);

    const [uptoToday, today, tomorrow, week, month] = await Promise.all([
        prisma.lead.count({ where: { ...filter, contactableDate: { lte: endOfDay } } }),
        prisma.lead.count({ where: { ...filter, contactableDate: { gte: startOfDay, lte: endOfDay } } }),
        prisma.lead.count({ where: { ...filter, contactableDate: { gte: tomorrowStart, lte: tomorrowEnd } } }),
        prisma.lead.count({ where: { ...filter, contactableDate: { gte: startOfDay, lte: weekEnd } } }),
        prisma.lead.count({ where: { ...filter, contactableDate: { gte: startOfDay, lte: monthEnd } } }),
    ]);

    apiResponse.success(res, { uptoToday, today, tomorrow, week, month });
});

export const createLead = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getRequestUser(req);
  ensureLeadCreateAccess(currentUser);
  const { 
      name, phone, projectId, sourceId, statusId, 
      brandId, rating, nextFollowUp, tagIds, 
      comments, createdById, instructionToPass,
      dataCollected, contactableDate
  } = req.body;

  if (!name || !phone) {
      return apiResponse.error(res, 'Name and phone are required', 400);
  }

  const normalizedPhone = normalizePhone(phone);

  // Check for duplicate lead
  const existingLead = await prisma.lead.findFirst({
    where: {
      phone: {
        contains: normalizedPhone
      }
    },
    select: { id: true, leadId: true, name: true }
  });

  if (existingLead) {
    return apiResponse.error(res, `A lead with this phone number already exists: ${existingLead.name} (Lead ID: ${existingLead.leadId})`, 409);
  }

  
  const allowedFields = [
    'name', 'email', 'phone', 'projectId', 'sourceId', 'statusId', 
    'brandId', 'rating', 'nextFollowUp', 'comments', 'assignedToId',
    'instructionToPass', 'dataCollected', 'contactableDate', 'leadType',
    'ratingName', 'metaLeadId', 'metaFormId', 'metaAdId', 'metaCampaignId', 'metaAdAccountId'
  ];
  
  const data: any = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      if (['projectId', 'sourceId', 'statusId', 'brandId', 'assignedToId'].includes(field) && req.body[field] === '') {
        data[field] = null;
      } else if (['nextFollowUp', 'dataCollected', 'contactableDate'].includes(field)) {
        data[field] = req.body[field] ? new Date(String(req.body[field])) : (field === 'dataCollected' ? new Date() : null);
      } else if (field === 'rating') {
        data[field] = Number(req.body[field]);
      } else if (field === 'phone') {
        data[field] = normalizedPhone;
      } else {
        data[field] = req.body[field];
      }
    }
  });

  if (!data.statusId) {
    const freshStatus = await prisma.leadStatus.findUnique({
      where: { name: 'Fresh' },
      select: { id: true }
    });
    data.statusId = freshStatus?.id || null;
  }

  if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
    data.tags = { 
      connect: tagIds.map((id: string) => ({ id: String(id) })) 
    };
  }
  
  // If no createdById, find first admin or use a system placeholder
  if (currentUser.id) {
      data.createdById = currentUser.id;
  } else if (!data.createdById) {
      const firstAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      data.createdById = firstAdmin?.id || 'system';
  }

  const lead = await prisma.lead.create({ 
      data,
      include: {
        status: true,
        brand: true,
        project: true,
        source: true,
        createdBy: { select: { id: true, fullName: true, role: true } }
      }
  });

  // Log Initial Contact Activity
  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: 'SYSTEM',
      content: `Lead created by ${lead.createdBy?.fullName || 'System'} via ${lead.source?.name || 'Direct Source'}`,
      userId: currentUser.id || data.createdById || null
    }
  });

  if (comments) {
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'NOTE',
        content: comments,
        userId: currentUser.id || data.createdById || null
      }
    });
  }

  if (lead.status?.name) {
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'STATUS_CHANGE',
        content: `Status changed to ${lead.status.name}`,
        userId: currentUser.id || data.createdById || null
      }
    });
  }

  if (lead.assignedToId) {
    const assignedUser = await prisma.user.findUnique({
      where: { id: String(lead.assignedToId) },
      select: { fullName: true, role: true }
    });

    if (assignedUser) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'ASSIGNMENT',
          content: `Assigned to ${assignedUser.fullName}${assignedUser.role ? ` (${assignedUser.role})` : ''}`,
          userId: currentUser.id || data.createdById || null
        }
      });
    }
  }

  apiResponse.success(res, lead, 'Lead created successfully', 201);
});

export const getAllActivities = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = getRequestUser(req);
    const { from_date, to_date, activity_type, lead_status_id } = req.body;
    
    const where: any = {};
    
    if (from_date || to_date) {
        where.createdAt = {};
        if (from_date) where.createdAt.gte = new Date(String(from_date));
        if (to_date) where.createdAt.lte = new Date(String(to_date));
    }
    
    if (activity_type) {
        where.type = activity_type;
    }
    
    if (lead_status_id) {
        where.lead = {
            statusId: lead_status_id
        };
    }

    where.lead = where.lead || {};
    await applyLeadVisibility(where.lead, currentUser);
    
    const activities = await prisma.leadActivity.findMany({
        where,
        include: {
            lead: {
                select: {
                    id: true,
                    name: true,
                    status: true
                }
            },
            user: {
                select: {
                    id: true,
                    fullName: true,
                    role: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 100 // Limit to last 100 activities for performance
    });
    
    apiResponse.success(res, activities);
});

export const updateLead = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getRequestUser(req);
  const { id } = req.params;
  await ensureLeadUpdateAccess(String(id), currentUser, req.body);
  const actor = currentUser.id
    ? await prisma.user.findUnique({ where: { id: currentUser.id }, select: { fullName: true } })
    : null;
  const actorName = actor?.fullName || 'User';

  if (req.body.assignedToId !== undefined) {
    await ensureLeadAssignAccess(String(id), req.body.assignedToId ? String(req.body.assignedToId) : null, currentUser);
  }

  const { tagIds } = req.body;
  const allowedFields = [
    'name', 'email', 'phone', 'projectId', 'sourceId', 'statusId', 
    'brandId', 'rating', 'nextFollowUp', 'comments', 'assignedToId',
    'instructionToPass', 'dataCollected', 'contactableDate', 'leadType',
    'ratingName', 'metaLeadId', 'metaFormId', 'metaAdId', 'metaCampaignId', 'metaAdAccountId',
    'orderValue'
  ];

  const data: any = {};
  
  if (req.body.phone) {
    const normalizedPhone = normalizePhone(req.body.phone);
    const duplicate = await prisma.lead.findFirst({
      where: {
        phone: { contains: normalizedPhone },
        NOT: { id: String(id) }
      }
    });
    if (duplicate) {
      return apiResponse.error(res, `Another lead already exists with this phone number: ${duplicate.name}`, 409);
    }
    data.phone = normalizedPhone;
  }

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      if (field === 'phone') return; // Handled above
      if (['projectId', 'sourceId', 'statusId', 'brandId', 'assignedToId'].includes(field) && req.body[field] === '') {
        data[field] = null;
      } else if (['nextFollowUp', 'dataCollected', 'contactableDate'].includes(field)) {
        data[field] = req.body[field] ? new Date(String(req.body[field])) : (field === 'dataCollected' ? undefined : null);
      } else if (field === 'rating') {
        data[field] = Number(req.body[field]);
      } else if (field === 'orderValue') {
        data[field] = req.body[field] !== null && req.body[field] !== '' ? Number(req.body[field]) : null;
      } else {
        data[field] = req.body[field];
      }
    }
  });

  // Fetch existing lead to handle comments preservation and audit messages.
  const existingLead = await prisma.lead.findUnique({
    where: { id: String(id) },
    include: {
      status: true,
      assignedTo: { select: { id: true, fullName: true, role: true } }
    }
  });

  if (req.body.comments !== undefined && req.body.comments !== existingLead?.comments) {
    if (existingLead?.comments && !req.body.comments.includes(existingLead.comments)) {
      data.comments = `${existingLead.comments} / ${req.body.comments}`;
    } else {
      data.comments = req.body.comments;
    }
    
    // Log new comment as a NOTE activity
    const newPart = existingLead?.comments && data.comments.startsWith(existingLead.comments) 
        ? data.comments.replace(existingLead.comments, '').replace(/^ \/ /, '')
        : data.comments;

    if (newPart.trim()) {
        await prisma.leadActivity.create({
            data: {
                leadId: String(id),
                type: 'NOTE',
                content: `Added comment: ${newPart}`,
                userId: currentUser.id || req.body.userId || null
            }
        });
    }
  }

  const updated = await prisma.lead.update({
    where: { id: String(id) },
    data: {
        ...data,
        tags: tagIds && Array.isArray(tagIds) ? { 
            set: tagIds.map((tid: string) => ({ id: String(tid) })) 
        } : undefined,
    },
    include: {
      tags: true,
      brand: true,
      status: true,
      project: true,
      assignedTo: { select: { id: true, fullName: true, role: true } }
    }
  });

  if (data.statusId && data.statusId !== existingLead?.statusId) {
    await prisma.leadActivity.create({
      data: {
        leadId: updated.id,
        type: 'STATUS_CHANGE',
        content: `Status changed by ${actorName} from ${existingLead?.status?.name || 'No Status'} to ${updated.status?.name || 'No Status'}`,
        userId: currentUser.id || null
      }
    });

    // Send Meta Conversion event when follow-up/status changes to a mapped status.
    if (updated.metaLeadId) {
      const eventName = getMetaEventNameForStatus(updated.status?.name);

      if (eventName) {
        try {
          console.log(`✅ Sending Meta event '${eventName}' for lead ${updated.id} with metaLeadId ${updated.metaLeadId} on status change`);
          
          const forwardedFor = req.headers['x-forwarded-for'];
          const ip = Array.isArray(forwardedFor)
            ? forwardedFor[0]
            : forwardedFor?.split(',')[0] || req.socket.remoteAddress;

          await sendMetaLead({
              eventName,
              eventId: randomUUID(), // A unique ID for this specific event
              source: 'crm',
              email: updated.email || undefined,
              phone: updated.phone || undefined,
              pageUrl: 'https://crm.wall2wall.com/lead', // Main CRM URL as source
              ip: ip || '',
              userAgent: req.headers['user-agent'] || '',
              metaLeadId: updated.metaLeadId, // Pass the lead_id for matching
              value: updated.orderValue !== null && updated.orderValue !== undefined ? Number(updated.orderValue) : undefined,
          });
        } catch (metaError) {
          console.error(`❌ Failed to send Meta event for lead ${updated.id} on status change:`, metaError);
          // Non-blocking: Log the error but don't fail the main API request.
        }
      }
    }
  } else if (data.assignedToId !== undefined && data.assignedToId !== existingLead?.assignedToId) {
    await prisma.leadActivity.create({
      data: {
        leadId: updated.id,
        type: 'ASSIGNMENT',
        content: updated.assignedTo
          ? `Lead assigned by ${actorName} to ${updated.assignedTo.fullName}${updated.assignedTo.role ? ` (${updated.assignedTo.role})` : ''}`
          : `Lead unassigned by ${actorName}`,
        userId: currentUser.id || null
      }
    });
  } else {
    await prisma.leadActivity.create({
      data: {
        leadId: updated.id,
        type: 'SYSTEM',
        content: `Lead details updated by ${actorName}`,
        userId: currentUser.id || null
      }
    });
  }

  apiResponse.success(res, updated, 'Lead updated successfully');
});

export const assignLead = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getRequestUser(req);
  const { id } = req.params;
  const { user_id } = req.body;
  await ensureLeadAssignAccess(String(id), user_id ? String(user_id) : null, currentUser);

  const actor = currentUser.id
    ? await prisma.user.findUnique({ where: { id: currentUser.id }, select: { fullName: true } })
    : null;
  const actorName = actor?.fullName || 'User';

  const targetUser = user_id
    ? await prisma.user.findUnique({
        where: { id: String(user_id) },
        select: { fullName: true, role: true }
      })
    : null;
  const updated = await prisma.lead.update({
    where: { id: String(id) },
    data: { assignedToId: user_id ? String(user_id) : null },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: updated.id,
      type: 'ASSIGNMENT',
      content: user_id
        ? `Lead assigned by ${actorName} to ${targetUser?.fullName || 'Unknown User'}${targetUser?.role ? ` (${targetUser.role})` : ''}`
        : `Lead unassigned by ${actorName}`,
      userId: currentUser.id || null
    }
  });

  apiResponse.success(res, updated, 'Lead assigned successfully');
});

export const addActivity = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getRequestUser(req);
  const { id } = req.params;
  await ensureLeadViewAccess(String(id), currentUser);
  const { type, content, userId } = req.body;
  const activity = await prisma.leadActivity.create({
    data: {
      leadId: String(id),
      type: type || 'NOTE',
      content: String(content),
      userId: currentUser.id || userId || null
    },
    include: { user: true }
  });
  apiResponse.success(res, activity, 'Activity added successfully', 201);
});

export const getLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUser = getRequestUser(req);
  await ensureLeadViewAccess(String(id), currentUser);
  const lead = await prisma.lead.findUnique({
    where: { id: String(id) },
    include: {
      status: true,
      project: true,
      source: true,
      brand: true,
      tags: true,
      currentStage: true,
      assignedTo: { select: { id: true, fullName: true, role: true } },
      createdBy: { select: { id: true, fullName: true, role: true } },
      activities: { orderBy: { createdAt: 'desc' }, include: { user: true } },
    },
  });

  if (!lead) {
    return apiResponse.error(res, 'Lead not found', 404);
  }

  lead.activities = [...lead.activities, ...buildSyntheticLeadAudit(lead)]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  apiResponse.success(res, lead);
});

export const bulkAssignLeads = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getRequestUser(req);
  const { leadIds, userId } = req.body;
  
  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return apiResponse.error(res, 'Lead IDs are required', 400);
  }

  const normalizedLeadIds = leadIds.map(id => String(id));
  await Promise.all(normalizedLeadIds.map(leadId =>
    ensureLeadAssignAccess(leadId, userId ? String(userId) : null, currentUser)
  ));

  const actor = currentUser.id
    ? await prisma.user.findUnique({ where: { id: currentUser.id }, select: { fullName: true } })
    : null;
  const actorName = actor?.fullName || 'User';

  const targetUser = userId
    ? await prisma.user.findUnique({
        where: { id: String(userId) },
        select: { fullName: true, role: true }
      })
    : null;

  await prisma.lead.updateMany({
    where: { id: { in: normalizedLeadIds } },
    data: { assignedToId: userId ? String(userId) : null },
  });

  // Create activities for each lead
  const activities = normalizedLeadIds.map(id => ({
    leadId: String(id),
    type: 'ASSIGNMENT',
    content: userId
      ? `Lead assigned by ${actorName} to ${targetUser?.fullName || 'Unknown User'}${targetUser?.role ? ` (${targetUser.role})` : ''} via bulk assignment`
      : `Lead unassigned by ${actorName} via bulk assignment`,
    userId: currentUser.id || null,
  }));

  await prisma.leadActivity.createMany({ data: activities });

  apiResponse.success(res, null, `Successfully assigned ${leadIds.length} leads`);
});

export const deleteLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = getRequestUser(req);
  const leadId = String(id);
  await ensureLeadDeleteAccess(leadId, user);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete related appointments
      await tx.appointment.deleteMany({
        where: { leadId: leadId },
      });

      // 2. Delete related showroom visits
      await tx.showroomVisit.deleteMany({
        where: { leadId: leadId },
      });

      // 3. Delete related lead activities
      await tx.leadActivity.deleteMany({
        where: { leadId: leadId },
      });

      // 4. Delete related tasks
      await tx.task.deleteMany({
        where: { leadId: leadId },
      });

      // 5. Disconnect lead from all tags
      await tx.lead.update({
        where: { id: leadId },
        data: { tags: { set: [] } },
      });

      // 6. Finally, delete the lead itself
      await tx.lead.delete({
        where: { id: leadId },
      });
    });

    apiResponse.success(res, null, 'Lead and all related data deleted successfully');
  } catch (error: any) {
    // Check if the error is because the lead was not found
    if (error.code === 'P2025') { // Prisma error code for record not found
        return apiResponse.error(res, 'Lead not found', 404);
    }
    // For other errors, pass them to the global error handler
    throw error;
  }
});
