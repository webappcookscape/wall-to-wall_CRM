import prisma from '../lib/prisma.js';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { sendMetaLead } from '../services/meta.service.js';
import { asyncHandler, apiResponse } from '../utils/apiUtils.js';
import {
  applyLeadVisibility,
  appendAndClause,
  DM_EXECUTIVE_ROLE,
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

const parseDateWithCurrentTime = (dateStr: string): Date => {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;
  const now = new Date();
  return new Date(year, month, day, now.getHours(), now.getMinutes(), now.getSeconds());
};

const getMetaEventNameForStatus = (statusName?: string | null): string | null => {
  if (!statusName) return null;

  const normalizedStatus = String(statusName).trim().toLowerCase();

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
    timeframe, // 'today', 'tomorrow', 'week', 'month', 'all'
    fromDate,
    toDate,
    contactDate,
    search,
    sortBy,
    sortOrder = 'desc',
  } = req.body;
  const skip = (Number(page) - 1) * Number(limit);
  
  const where: any = {};
  
  if (statusIds && Array.isArray(statusIds) && statusIds.length > 0) where.statusId = { in: statusIds };
  else if (req.body.statusId) where.statusId = req.body.statusId;

  if (projectIds && Array.isArray(projectIds) && projectIds.length > 0) {
    appendAndClause(where, {
      OR: [
        { projectId: { in: projectIds } },
        { projects: { some: { id: { in: projectIds } } } }
      ]
    });
  } else if (req.body.projectId) {
    appendAndClause(where, {
      OR: [
        { projectId: req.body.projectId },
        { projects: { some: { id: req.body.projectId } } }
      ]
    });
  }

  if (sourceIds && Array.isArray(sourceIds) && sourceIds.length > 0) where.sourceId = { in: sourceIds };
  else if (req.body.sourceId) where.sourceId = req.body.sourceId;

  if (brandIds && Array.isArray(brandIds) && brandIds.length > 0) where.brandId = { in: brandIds };
  else if (req.body.brandId) where.brandId = req.body.brandId;

  if (stageIds && Array.isArray(stageIds) && stageIds.length > 0) where.currentStageId = { in: stageIds };

  if (assignedToIds && Array.isArray(assignedToIds) && assignedToIds.length > 0) {
    where.assignedToId = { in: assignedToIds };
  } else if (req.body.assignedToId) {
    if (req.body.assignedToId === 'unassigned') {
      where.assignedToId = null;
    } else {
      where.assignedToId = req.body.assignedToId;
    }
  }

  if (req.body.createdByIds && Array.isArray(req.body.createdByIds) && req.body.createdByIds.length > 0) {
    where.createdById = { in: req.body.createdByIds };
  } else if (req.body.createdById) {
    where.createdById = req.body.createdById;
  }

  if (req.body.assignedById) {
    where.activities = {
      some: {
        type: 'ASSIGNMENT',
        userId: req.body.assignedById
      }
    };
  }

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
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    if (timeframe === 'today') {
      // Today's leads: due today OR overdue (no future ones), excluding disqualified
      where.contactableDate = { lte: endOfDay };
      appendAndClause(where, {
        OR: [
          { statusId: null },
          { status: { name: { not: 'Disqualified' } } },
        ]
      });
    } else if (timeframe === 'tomorrow') {
      const tomorrowStart = new Date(startOfDay);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const tomorrowEnd = new Date(endOfDay);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
      where.contactableDate = { gte: tomorrowStart, lte: tomorrowEnd };
    } else if (timeframe === 'week') {
      const weekEnd = new Date(startOfDay);
      weekEnd.setDate(weekEnd.getDate() + 7);
      where.contactableDate = { gte: startOfDay, lte: weekEnd };
    } else if (timeframe === 'month') {
      const monthEnd = new Date(startOfDay);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      where.contactableDate = { gte: startOfDay, lte: monthEnd };
    } else if (timeframe === 'overdue') {
      where.contactableDate = { lt: startOfDay };
      appendAndClause(where, {
        OR: [
          { statusId: null },
          { status: { name: { not: 'Disqualified' } } },
        ]
      });
    } else if (timeframe === 'all' || timeframe === 'timeline') {
      where.contactableDate = { not: null };
    }
  }
  
  if (search) {
    const trimmedSearch = String(search).trim();
    const searchConditions: any[] = [
      { name: { contains: trimmedSearch, mode: 'insensitive' } },
      { phone: { contains: trimmedSearch, mode: 'insensitive' } },
      { email: { contains: trimmedSearch, mode: 'insensitive' } },
      { siteLocation: { contains: trimmedSearch, mode: 'insensitive' } },
      { comments: { contains: trimmedSearch, mode: 'insensitive' } },
      { project: { name: { contains: trimmedSearch, mode: 'insensitive' } } },
      { status: { name: { contains: trimmedSearch, mode: 'insensitive' } } },
      { source: { name: { contains: trimmedSearch, mode: 'insensitive' } } },
      { brand: { name: { contains: trimmedSearch, mode: 'insensitive' } } },
      { assignedTo: { fullName: { contains: trimmedSearch, mode: 'insensitive' } } },
    ];
    
    // Also search by numeric leadId if the search term is a valid number (strip # if present)
    const cleanedLeadIdSearch = trimmedSearch.replace(/^#/, '').trim();
    if (!isNaN(Number(cleanedLeadIdSearch)) && cleanedLeadIdSearch !== '') {
      searchConditions.push({ leadId: Number(cleanedLeadIdSearch) });
    }

    appendAndClause(where, { OR: searchConditions });
  }

  await applyLeadVisibility(where, currentUser);

  let leadOrderBy: any = { createdAt: 'desc' };
  if (sortBy) {
    leadOrderBy = { [sortBy]: sortOrder };
  } else if (timeframe) {
    leadOrderBy = { contactableDate: 'asc' };
  }

  const [data, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: Number(limit),
      include: {
        status: true,
        project: true,
        projects: true,
        source: true,
        brand: true,
        tags: true,
        currentStage: true,
        assignedTo: { select: { id: true, fullName: true, role: true } },
        createdBy: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: leadOrderBy,
    }),
    prisma.lead.count({ where }),
  ]);

  apiResponse.success(res, {
    data: data.map((l: any) => {
      let siteLocation: string | null = l.siteLocation ? String(l.siteLocation).trim() : null;
      if (!siteLocation && l.comments && typeof l.comments === 'string') {
        const match = l.comments.match(/Location:\s*([^|\n]+)/i);
        if (match && match[1]) {
          const locStr = match[1].trim();
          siteLocation = locStr.includes('/') ? (locStr.split(/\s*\/\s*/)[0]?.trim() || locStr) : locStr;
        }
      }
      return {
        ...l,
        brand_name: l.brand?.name || '-',
        status_name: l.status?.name || '-',
        siteLocation: siteLocation || null,
      };
    }),
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
    if (userId && (currentUser.role === 'ADMIN' || currentUser.role === 'BUSINESS_HEAD' || currentUser.role === DM_EXECUTIVE_ROLE || currentUser.role === 'FA' || currentUser.role === 'CLIENT_FACILITATOR')) {
      filter.assignedToId = String(userId);
    }
    await applyLeadVisibility(filter, currentUser);

    const notDisqualifiedClause = {
      OR: [
        { statusId: null },
        { status: { name: { not: 'Disqualified' } } },
      ]
    };

    const [uptoToday, today, tomorrow, week, month] = await Promise.all([
        prisma.lead.count({ where: { ...filter, contactableDate: { lte: endOfDay }, ...notDisqualifiedClause } }),
        prisma.lead.count({ where: { ...filter, contactableDate: { gte: startOfDay, lte: endOfDay }, ...notDisqualifiedClause } }),
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

  // Check for duplicate lead by phone number
  const existingLead = await prisma.lead.findFirst({
    where: {
      phone: {
        contains: normalizedPhone
      }
    },
    select: { id: true, leadId: true, name: true, phone: true }
  });

  if (existingLead) {
    console.warn(`[DUPLICATE LEAD ATTEMPT] Phone: "${existingLead.phone}", Name: "${existingLead.name}", Lead ID: ${existingLead.leadId || existingLead.id} (DB ID: ${existingLead.id})`);
    return res.status(409).json({
      success: false,
      message: `A lead with this phone number already exists: ${existingLead.name} (Lead ID: ${existingLead.leadId || existingLead.id})`,
      duplicate: {
        id: existingLead.id,
        leadId: existingLead.leadId,
        name: existingLead.name,
        phone: existingLead.phone,
      }
    });
  }

  
  const allowedFields = [
    'name', 'email', 'phone', 'projectId', 'sourceId', 'statusId', 
    'brandId', 'rating', 'nextFollowUp', 'comments', 'assignedToId',
    'instructionToPass', 'dataCollected', 'contactableDate', 'leadType',
    'ratingName', 'metaLeadId', 'metaFormId', 'metaAdId', 'metaCampaignId', 'metaAdAccountId',
    'referralName', 'siteLocation'
  ];
  
  const data: any = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      if (['projectId', 'sourceId', 'statusId', 'brandId', 'assignedToId'].includes(field) && req.body[field] === '') {
        data[field] = null;
      } else if (['nextFollowUp', 'dataCollected', 'contactableDate'].includes(field)) {
        if (field === 'dataCollected') {
          if (req.body[field]) {
            const valStr = String(req.body[field]).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(valStr)) {
              data[field] = parseDateWithCurrentTime(valStr);
            } else {
              data[field] = new Date(valStr);
            }
          } else {
            data[field] = new Date();
          }
        } else if (field === 'contactableDate') {
          data[field] = req.body[field] 
            ? new Date(String(req.body[field])) 
            : (req.body.nextFollowUp ? new Date(String(req.body.nextFollowUp)) : (data.dataCollected || new Date()));
        } else {
          data[field] = req.body[field] ? new Date(String(req.body[field])) : null;
        }
      } else if (field === 'rating') {
        data[field] = Number(req.body[field]);
      } else if (field === 'phone') {
        data[field] = normalizedPhone;
      } else {
        data[field] = req.body[field];
      }
    }
  });

  // Support employee email lookup if assignedToId not explicitly provided
  if (!data.assignedToId && (req.body.employeeEmail || req.body.assignedToEmail)) {
    const emailToLookup = String(req.body.employeeEmail || req.body.assignedToEmail).trim().toLowerCase();
    const matchedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: emailToLookup, mode: 'insensitive' } },
          { fullName: { equals: emailToLookup, mode: 'insensitive' } }
        ]
      },
      select: { id: true }
    });
    if (matchedUser) {
      data.assignedToId = matchedUser.id;
    }
  }

  if (currentUser.role === DM_EXECUTIVE_ROLE && currentUser.id && data.assignedToId === currentUser.id) {
    return apiResponse.error(res, 'DM executives cannot assign leads to themselves. Please assign to another user.', 400);
  }

  // If created by FA or Client Facilitator and no explicit assignee selected, default to self-assignment
  if (!data.assignedToId && (currentUser.role === 'FA' || currentUser.role === 'CLIENT_FACILITATOR') && currentUser.id) {
    data.assignedToId = currentUser.id;
  }

  if (!data.statusId && req.body.statusName) {
    const matchedStatus = await prisma.leadStatus.findFirst({
      where: { name: { equals: String(req.body.statusName).trim(), mode: 'insensitive' } },
      select: { id: true }
    });
    if (matchedStatus) {
      data.statusId = matchedStatus.id;
    }
  }

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

  // Synchronize source and leadType
  if (!data.sourceId && (req.body.sourceName || req.body.source)) {
    const srcName = String(req.body.sourceName || req.body.source).trim();
    const matchedSource = await prisma.source.findFirst({
      where: { name: { equals: srcName, mode: 'insensitive' } }
    });
    if (matchedSource) {
      data.sourceId = matchedSource.id;
      data.leadType = matchedSource.name;
    } else {
      data.leadType = srcName;
    }
  } else if (data.sourceId) {
    const src = await prisma.source.findUnique({ where: { id: data.sourceId } });
    if (src) {
      data.leadType = src.name;
    }
  }

  // Handle multi-projects connection
  const projectIds = req.body.projectIds;
  if (projectIds && Array.isArray(projectIds) && projectIds.length > 0) {
    data.projects = {
      connect: projectIds.map((pid: string) => ({ id: String(pid) }))
    };
    if (!data.projectId) {
      data.projectId = String(projectIds[0]);
    }
  } else if (data.projectId) {
    data.projects = {
      connect: [{ id: String(data.projectId) }]
    };
  }

  const lead = await prisma.lead.create({ 
      data,
      include: {
        status: true,
        brand: true,
        project: true,
        projects: true,
        source: true,
        assignedTo: { select: { id: true, fullName: true, role: true } },
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
    'orderValue', 'referralName', 'siteLocation'
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
        if (field === 'dataCollected') {
          if (req.body[field]) {
            const valStr = String(req.body[field]).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(valStr)) {
              data[field] = parseDateWithCurrentTime(valStr);
            } else {
              data[field] = new Date(valStr);
            }
          } else {
            data[field] = undefined;
          }
        } else {
          data[field] = req.body[field] ? new Date(String(req.body[field])) : null;
        }
      } else if (field === 'rating') {
        data[field] = Number(req.body[field]);
      } else if (field === 'orderValue') {
        data[field] = req.body[field] !== null && req.body[field] !== '' ? Number(req.body[field]) : null;
      } else {
        data[field] = req.body[field];
      }
    }
  });

  // Handle multi-projects update
  if (req.body.projectIds !== undefined) {
    if (Array.isArray(req.body.projectIds)) {
      data.projects = {
        set: req.body.projectIds.map((pid: string) => ({ id: String(pid) }))
      };
      data.projectId = req.body.projectIds[0] || null;
    }
  } else if (data.projectId !== undefined) {
    if (data.projectId) {
      data.projects = {
        set: [{ id: String(data.projectId) }]
      };
    } else {
      data.projects = {
        set: []
      };
    }
  }

  if (data.sourceId !== undefined) {
    if (data.sourceId) {
      const src = await prisma.source.findUnique({ where: { id: data.sourceId } });
      if (src) {
        data.leadType = src.name;
      }
    }
  }

  // Fetch existing lead to handle comments preservation and audit messages.
  const existingLead = await prisma.lead.findUnique({
    where: { id: String(id) },
    include: {
      status: true,
      assignedTo: { select: { id: true, fullName: true, role: true } }
    }
  });

  if (req.body.comments !== undefined) {
    const rawNewComments = req.body.comments !== null && req.body.comments !== undefined 
      ? String(req.body.comments).trim() 
      : null;
    let existingComments = existingLead?.comments 
      ? String(existingLead.comments).trim() 
      : null;

    // Clean existingComments of any legacy "Location: ..." prefix so follow-up messages are NEVER merged with location
    if (existingComments && existingComments.includes('Location:')) {
      const locMatch = existingComments.match(/Location:\s*([^|\n]+)/i);
      if (locMatch && locMatch[1]) {
        const fullLoc = locMatch[1].trim();
        const parts = fullLoc.split(/\s*\/\s*/);
        const extractedLoc = parts[0]?.trim();
        const followUpRemainder = parts.slice(1).join(' / ').trim();

        if (extractedLoc && !data.siteLocation && !existingLead?.siteLocation) {
          data.siteLocation = extractedLoc;
        }

        existingComments = existingComments
          .replace(locMatch[0], followUpRemainder ? ` | ${followUpRemainder}` : '')
          .replace(/^(\s*\|\s*|\s*\/\s*)+|(\s*\|\s*|\s*\/\s*)+$/g, '')
          .trim() || null;
      }
    }

    if (rawNewComments !== existingComments) {
      if (existingComments && rawNewComments && !rawNewComments.includes(existingComments)) {
        data.comments = `${existingComments} / ${rawNewComments}`;
      } else {
        data.comments = rawNewComments;
      }
      
      // Log new comment as a NOTE activity if a non-empty comment exists
      if (data.comments) {
        const newPart = existingComments && data.comments.startsWith(existingComments) 
            ? data.comments.replace(existingComments, '').replace(/^ \/ /, '').trim()
            : data.comments.trim();

        if (newPart && !req.body.skipActivityLog) {
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
      projects: true,
      source: true,
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

  let siteLocation: string | null = lead.siteLocation ? String(lead.siteLocation).trim() : null;
  if (!siteLocation && lead.comments && typeof lead.comments === 'string') {
    const match = lead.comments.match(/Location:\s*([^|\n]+)/i);
    if (match && match[1]) {
      const locStr = match[1].trim();
      siteLocation = locStr.includes('/') ? (locStr.split(/\s*\/\s*/)[0]?.trim() || locStr) : locStr;
    }
  }

  lead.activities = [...lead.activities, ...buildSyntheticLeadAudit(lead)]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  apiResponse.success(res, {
    ...lead,
    siteLocation,
    brand_name: lead.brand?.name || '-',
    status_name: lead.status?.name || '-',
  });
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

export const bulkDeleteLeads = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getRequestUser(req);
  if (currentUser.role !== 'ADMIN') {
    return apiResponse.error(res, 'Only admin has delete access.', 403);
  }

  const { leadIds } = req.body;
  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return apiResponse.error(res, 'Lead IDs are required', 400);
  }

  const normalizedLeadIds = leadIds.map((id: any) => String(id));

  await prisma.$transaction(async (tx: any) => {
    // 1. Delete related appointments
    await tx.appointment.deleteMany({
      where: { leadId: { in: normalizedLeadIds } },
    });

    // 2. Delete related showroom visits
    await tx.showroomVisit.deleteMany({
      where: { leadId: { in: normalizedLeadIds } },
    });

    // 3. Delete related lead activities
    await tx.leadActivity.deleteMany({
      where: { leadId: { in: normalizedLeadIds } },
    });

    // 4. Delete related tasks
    await tx.task.deleteMany({
      where: { leadId: { in: normalizedLeadIds } },
    });

    // 5. Disconnect tags for these leads
    for (const id of normalizedLeadIds) {
      await tx.lead.update({
        where: { id },
        data: { tags: { set: [] } },
      }).catch(() => {});
    }

    // 6. Delete the leads
    await tx.lead.deleteMany({
      where: { id: { in: normalizedLeadIds } },
    });
  });

  apiResponse.success(res, null, `Successfully deleted ${normalizedLeadIds.length} leads`);
});

export const deleteLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = getRequestUser(req);
  const leadId = String(id);
  await ensureLeadDeleteAccess(leadId, user);

  try {
    await prisma.$transaction(async (tx: any) => {
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

export const importLeads = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = getRequestUser(req);
  ensureLeadCreateAccess(currentUser);

  const {
    leads,
    defaultStatusId,
    defaultAssignedToId,
    defaultEmployeeEmail,
    defaultBrandId,
    defaultSourceId,
    defaultProjectId,
    skipDuplicates = true,
  } = req.body;

  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    return apiResponse.error(res, 'No lead records provided for import', 400);
  }

  // Pre-fetch master data (mutable so dynamically created masters are reused across rows)
  const [allStatuses, allUsers, allBrands, allSources, allProjects, allStages] = await Promise.all([
    prisma.leadStatus.findMany(),
    prisma.user.findMany({ select: { id: true, email: true, fullName: true, role: true } }),
    prisma.brand.findMany(),
    prisma.source.findMany(),
    prisma.project.findMany(),
    prisma.stage.findMany(),
  ]);

  // Helper to normalize alphanumeric strings for fuzzy matching
  const cleanKey = (str: any): string => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Resolve default assigned user
  let fallbackAssignedUserId: string | null = defaultAssignedToId || null;
  if (!fallbackAssignedUserId && defaultEmployeeEmail) {
    const cleanEmail = String(defaultEmployeeEmail).trim().toLowerCase();
    const cleanEmailKey = cleanKey(cleanEmail);
    const found = allUsers.find(
      (u: any) => (u.email && u.email.toLowerCase() === cleanEmail) || 
           (u.fullName && u.fullName.toLowerCase() === cleanEmail) ||
           (u.fullName && cleanKey(u.fullName) === cleanEmailKey)
    );
    if (found) fallbackAssignedUserId = found.id;
  }

  if (currentUser.role === DM_EXECUTIVE_ROLE && currentUser.id && fallbackAssignedUserId === currentUser.id) {
    return apiResponse.error(res, 'DM executives cannot assign leads to themselves. Please assign to another user.', 400);
  }

  // Resolve default status
  let fallbackStatusId: string | null = defaultStatusId || null;
  if (!fallbackStatusId) {
    const followUp = allStatuses.find((s: any) => cleanKey(s.name) === 'followup');
    const fresh = allStatuses.find((s: any) => cleanKey(s.name) === 'fresh');
    fallbackStatusId = followUp?.id || fresh?.id || allStatuses[0]?.id || null;
  }

  // Fallbacks for Brand and Source
  const fallbackBrandId = defaultBrandId || allBrands[0]?.id || null;
  const fallbackSourceId = defaultSourceId || allSources.find((s: any) => /upload|import|direct/i.test(s.name))?.id || allSources[0]?.id || null;

  const results = {
    total: leads.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    duplicates: [] as { row: number; phone: string; name: string; existingId: string; existingLeadId?: number | null; existingName: string }[],
    errors: [] as { row: number; leadName?: string; error: string }[],
  };

  // Track phone numbers seen within this batch to prevent duplicate creates in the same import file
  const seenPhonesInBatch = new Map<string, { row: number; name: string }>();

  const parseLeadRating = (val: any): { rating: number; name: string } | null => {
    if (val === undefined || val === null || val === '') return null;
    const str = String(val).trim().toLowerCase();
    if (str === '1' || str.includes('disqualified')) return { rating: 1, name: 'DISQUALIFIED' };
    if (str === '2' || str.includes('low')) return { rating: 2, name: 'LOW_QUALITY' };
    if (str === '3' || str.includes('moderate') || str.includes('warm')) return { rating: 3, name: 'MODERATE' };
    if (str === '4' || str.includes('qualified') || str.includes('hot')) return { rating: 4, name: 'QUALIFIED' };
    if (str === '5' || str.includes('order') || str.includes('booked')) return { rating: 5, name: 'ORDER_BOOKED' };
    const num = Number(val);
    if (!isNaN(num) && num >= 1 && num <= 5) {
      const names = ['', 'DISQUALIFIED', 'LOW_QUALITY', 'MODERATE', 'QUALIFIED', 'ORDER_BOOKED'];
      return { rating: num, name: names[num] || '' };
    }
    return null;
  };

  for (let i = 0; i < leads.length; i++) {
    const rawLead = leads[i];
    const rowNum = rawLead.sNo || i + 1;

    try {
      const name = String(rawLead.name || rawLead.clientName || rawLead.customerName || rawLead.fullName || rawLead.leadName || '').trim();
      const phoneRaw = String(rawLead.phone || rawLead.number || rawLead.mobile || rawLead.contact || rawLead.whatsapp || rawLead.phoneNo || rawLead.mobileNo || '').trim();

      if (!name || !phoneRaw) {
        results.skipped++;
        continue;
      }

      const normalizedPhone = normalizePhone(phoneRaw);
      if (!normalizedPhone || normalizedPhone.length < 10) {
        results.errors.push({
          row: rowNum,
          leadName: name,
          error: `Invalid phone number "${phoneRaw}" (minimum 10 digits required)`
        });
        results.skipped++;
        continue;
      }

      // 1. Source Resolution: Prioritize Sheet value -> match exact (normalized) or dynamically create
      let sourceId: string | null = null;
      let resolvedLeadType: string = 'Direct Lead';
      const rawSourceName = String(rawLead.source || rawLead.sourceName || rawLead.leadSource || rawLead.channel || rawLead.platform || '').trim();

      if (rawSourceName) {
        const cleanRaw = cleanKey(rawSourceName);
        const matched = allSources.find((s: any) => cleanKey(s.name) === cleanRaw);

        if (matched) {
          sourceId = matched.id;
          resolvedLeadType = matched.name;
        } else {
          try {
            const newSource = await prisma.source.create({
              data: { name: rawSourceName }
            });
            allSources.push(newSource);
            sourceId = newSource.id;
            resolvedLeadType = newSource.name;
          } catch {
            const existing = await prisma.source.findFirst({
              where: { name: { equals: rawSourceName, mode: 'insensitive' } }
            });
            if (existing) {
              sourceId = existing.id;
              resolvedLeadType = existing.name;
            } else {
              sourceId = fallbackSourceId;
              resolvedLeadType = rawSourceName;
            }
          }
        }
      } else if (rawLead.sourceId) {
        sourceId = rawLead.sourceId;
        const s = allSources.find((x: any) => x.id === sourceId);
        resolvedLeadType = s?.name || 'Direct Lead';
      } else if (fallbackSourceId) {
        sourceId = fallbackSourceId;
        const s = allSources.find((x: any) => x.id === sourceId);
        resolvedLeadType = s?.name || 'Direct Lead';
      }

      // 2. Brand Resolution: Prioritize Sheet value -> match exact (normalized) or dynamically create
      let brandId: string | null = null;
      const rawBrandName = String(rawLead.brand || rawLead.brandName || rawLead.company || '').trim();

      if (rawBrandName) {
        const cleanRaw = cleanKey(rawBrandName);
        const matched = allBrands.find((b: any) => cleanKey(b.name) === cleanRaw);

        if (matched) {
          brandId = matched.id;
        } else {
          try {
            const newBrand = await prisma.brand.create({
              data: { name: rawBrandName }
            });
            allBrands.push(newBrand);
            brandId = newBrand.id;
          } catch {
            const existing = await prisma.brand.findFirst({
              where: { name: { equals: rawBrandName, mode: 'insensitive' } }
            });
            brandId = existing?.id || fallbackBrandId;
          }
        }
      } else if (rawLead.brandId) {
        brandId = rawLead.brandId;
      } else {
        brandId = fallbackBrandId;
      }

      // 3. Project Resolution: Support single or multiple comma-separated projects (e.g. "Modular Kitchen, Wardrobe")
      const resolvedProjectIds: string[] = [];
      const rawProjectsList: string[] = [];

      if (Array.isArray(rawLead.projectIds) && rawLead.projectIds.length > 0) {
        resolvedProjectIds.push(...rawLead.projectIds.map(String));
      } else if (Array.isArray(rawLead.projects) && rawLead.projects.length > 0) {
        rawProjectsList.push(...rawLead.projects.map((p: any) => String(p).trim()).filter(Boolean));
      } else {
        const rawProjStr = String(rawLead.project || rawLead.projectName || '').trim();
        if (rawProjStr) {
          rawProjectsList.push(...rawProjStr.split(/[,;/]+/).map(s => s.trim()).filter(Boolean));
        }
      }

      for (const rawProj of rawProjectsList) {
        const cleanRaw = cleanKey(rawProj);
        let matched = allProjects.find((p: any) => cleanKey(p.name) === cleanRaw);
        if (!matched) {
          try {
            matched = await prisma.project.create({ data: { name: rawProj } });
            allProjects.push(matched);
          } catch {
            matched = await prisma.project.findFirst({
              where: { name: { equals: rawProj, mode: 'insensitive' } }
            }) || undefined;
          }
        }
        if (matched && !resolvedProjectIds.includes(matched.id)) {
          resolvedProjectIds.push(matched.id);
        }
      }

      if (resolvedProjectIds.length === 0 && rawLead.projectId) {
        resolvedProjectIds.push(rawLead.projectId);
      } else if (resolvedProjectIds.length === 0 && defaultProjectId) {
        resolvedProjectIds.push(defaultProjectId);
      }

      const projectId: string | null = resolvedProjectIds[0] || null;

      // 4. Status Resolution
      let statusId: string | null = fallbackStatusId;
      const rawStatus = String(rawLead.status || rawLead.statusName || '').trim();
      if (rawStatus) {
        const cleanRaw = cleanKey(rawStatus);
        const directMatch = allStatuses.find((s: any) => cleanKey(s.name) === cleanRaw);
        if (directMatch) {
          statusId = directMatch.id;
        } else {
          const partialMatch = allStatuses.find((s: any) => {
            const sClean = cleanKey(s.name);
            return sClean.includes(cleanRaw) || cleanRaw.includes(sClean);
          });
          if (partialMatch) statusId = partialMatch.id;
        }
      }

      // 5. Rating & Stage resolution
      const resolvedRating = parseLeadRating(rawLead.rating || rawLead.ratingName);
      let currentStageId: string | null = null;
      const rawStage = String(rawLead.stage || rawLead.currentStage || rawLead.stageName || '').trim();
      if (rawStage) {
        const cleanRaw = cleanKey(rawStage);
        const foundStage = allStages.find((s: any) => cleanKey(s.name) === cleanRaw || cleanKey(s.name).includes(cleanRaw));
        if (foundStage) currentStageId = foundStage.id;
      }

      // 6. Assignee Resolution
      let assignedToId: string | null = fallbackAssignedUserId;
      const rawEmp = String(rawLead.employeeEmail || rawLead.assignedTo || rawLead.assignedEmployee || rawLead.staff || '').trim();
      if (rawEmp) {
        const cleanEmp = rawEmp.toLowerCase();
        const cleanEmpKey = cleanKey(cleanEmp);
        const foundUser = allUsers.find((u: any) => {
          const uEmail = (u.email || '').toLowerCase();
          const uName = (u.fullName || '').toLowerCase();
          const uKey = cleanKey(uName);
          return (
            uEmail === cleanEmp ||
            uName === cleanEmp ||
            uKey === cleanEmpKey ||
            (cleanEmpKey.length >= 3 && (uKey.includes(cleanEmpKey) || cleanEmpKey.includes(uKey)))
          );
        });
        if (foundUser) {
          assignedToId = foundUser.id;
        }
      } else if (rawLead.assignedToId) {
        assignedToId = rawLead.assignedToId;
      }

      // 7. Date collected resolution
      let dataCollectedDate: Date = new Date();
      const rawDateCollected = rawLead.dataCollected || rawLead.dateCollected || rawLead.leadDate;
      if (rawDateCollected) {
        const valStr = String(rawDateCollected).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(valStr)) {
          dataCollectedDate = parseDateWithCurrentTime(valStr);
        } else {
          const d = new Date(rawDateCollected);
          if (!isNaN(d.getTime())) dataCollectedDate = d;
        }
      }

      // 8. Next Follow-up Date resolution
      let nextFollowUpDate: Date | null = null;
      if (rawLead.nextFollowUp || rawLead.nextDate) {
        const d = new Date(rawLead.nextFollowUp || rawLead.nextDate);
        if (!isNaN(d.getTime())) nextFollowUpDate = d;
      }

      const instructionText = rawLead.instructionToPass || rawLead.instructions || null;
      const rawReferralName = String(
        rawLead.referralName || 
        rawLead.referrerName || 
        rawLead.architect || 
        rawLead.architectName || 
        rawLead.interiorDesigner || 
        rawLead.referredBy || 
        ''
      ).trim() || null;

      // 9. Collect Comments, Messages, and Remarks comprehensively
      const commentSections: string[] = [];
      const rawReq = String(rawLead.requirement || rawLead.service || rawLead.workRequired || rawLead.workType || '').trim();
      if (rawReq) {
        commentSections.push(`Requirement: ${rawReq}`);
      }
      const rawLoc = String(rawLead.siteLocation || rawLead.location || rawLead.address || rawLead.city || '').trim();
      
      // Capture Message (from "Message", "Follow up message", "Client Message", "Comment Message", etc.)
      const rawMessage = String(
        rawLead.message || 
        rawLead.followUpMessage || 
        rawLead.followupMessage || 
        rawLead.followUpNotes ||
        rawLead.commentMessage || 
        rawLead.clientMessage || 
        ''
      ).trim();
      if (rawMessage && !commentSections.some(c => c.includes(rawMessage))) {
        commentSections.push(rawMessage);
      }

      // Capture Comments (from "Comments", "Discussion Comments", "Remarks", "Notes", etc.)
      const rawComments = String(rawLead.comments || rawLead.discussionComments || rawLead.remarks || rawLead.notes || '').trim();
      if (rawComments && !commentSections.some(c => c.includes(rawComments))) {
        commentSections.push(rawComments);
      }

      // If status from sheet didn't map to a master status, record it in comments
      if (rawStatus && !allStatuses.some((s: any) => cleanKey(s.name) === cleanKey(rawStatus))) {
        commentSections.push(`Status Notes: ${rawStatus}`);
      }

      const combinedComments = commentSections.join(' | ') || null;

      // 10. Check unique phone number against existing database and current batch
      // Check if phone was already seen in this file
      if (seenPhonesInBatch.has(normalizedPhone)) {
        const prevRow = seenPhonesInBatch.get(normalizedPhone)!;
        console.warn(`[DUPLICATE LEAD IN IMPORT FILE] Row ${rowNum} has duplicate phone "${normalizedPhone}" (Name: "${name}"). Already present in Row ${prevRow.row} (Name: "${prevRow.name}")`);
        results.errors.push({
          row: rowNum,
          leadName: name,
          error: `Duplicate phone number "${phoneRaw}" (already appears in row ${prevRow.row})`
        });
        results.skipped++;
        continue;
      }

      // Check existing leads in DB matching phone number
      const candidateLeads = await prisma.lead.findMany({
        where: { phone: { contains: normalizedPhone } },
        include: { status: true, assignedTo: true, brand: true, source: true, project: true }
      });

      // Match lead where phone matches. If exact lead found, we update. If duplicate phone exists, log and do not create duplicate!
      const existingLead = candidateLeads[0];

      if (existingLead) {
        // Log duplicate lead in console with phone, name, and id
        console.warn(`[DUPLICATE LEAD IN IMPORT] Row: ${rowNum}, Phone: "${normalizedPhone}", Incoming Name: "${name}", Existing Lead Name: "${existingLead.name}", ID: ${existingLead.id}, Lead ID: ${existingLead.leadId}`);
        results.duplicates.push({
          row: rowNum,
          phone: normalizedPhone,
          name: name,
          existingId: existingLead.id,
          existingLeadId: existingLead.leadId,
          existingName: existingLead.name,
        });

        // Record that phone is seen in batch
        seenPhonesInBatch.set(normalizedPhone, { row: rowNum, name });

        const updateData: any = {};
        const noteParts: string[] = [];

        // Synchronize name casing if provided
        if (name && existingLead.name !== name) {
          updateData.name = name;
        }

        // Update comments/message if new content provided
        if (combinedComments) {
          const existingCmt = existingLead.comments || '';
          const newParts = commentSections.filter(part => !existingCmt.includes(part));
          if (newParts.length > 0) {
            const appended = newParts.join(' | ');
            updateData.comments = existingCmt ? `${existingCmt} / ${appended}` : appended;
            noteParts.push(appended);
          }
        }

        // Update Follow-up dates
        if (nextFollowUpDate) {
          updateData.nextFollowUp = nextFollowUpDate;
          updateData.contactableDate = nextFollowUpDate;
          noteParts.push(`Follow-up date updated`);
        }

        // Update Rating if provided
        if (resolvedRating && existingLead.rating !== resolvedRating.rating) {
          updateData.rating = resolvedRating.rating;
          updateData.ratingName = resolvedRating.name;
          noteParts.push(`Rating: ${resolvedRating.name}`);
        }

        // Update Stage if provided
        if (currentStageId && existingLead.currentStageId !== currentStageId) {
          updateData.currentStageId = currentStageId;
          noteParts.push(`Stage updated`);
        }

        // Update Instruction if provided
        if (instructionText && existingLead.instructionToPass !== instructionText) {
          updateData.instructionToPass = instructionText;
          noteParts.push(`Instructions updated`);
        }

        // Update Status if provided from sheet
        if (rawStatus && statusId && existingLead.statusId !== statusId) {
          updateData.statusId = statusId;
          noteParts.push(`Status: ${rawStatus}`);
        } else if (existingLead.status?.name?.toLowerCase() === 'fresh' && fallbackStatusId) {
          updateData.statusId = fallbackStatusId;
        }

        // Update Source if provided from sheet
        if (rawSourceName && sourceId && existingLead.sourceId !== sourceId) {
          updateData.sourceId = sourceId;
          updateData.leadType = resolvedLeadType;
          noteParts.push(`Source: ${rawSourceName}`);
        }

        // Update Brand if provided from sheet
        if (rawBrandName && brandId && existingLead.brandId !== brandId) {
          updateData.brandId = brandId;
          noteParts.push(`Brand: ${rawBrandName}`);
        }

        // Update Projects if provided from sheet
        if (resolvedProjectIds.length > 0) {
          updateData.projects = {
            set: resolvedProjectIds.map(id => ({ id }))
          };
          if (projectId && existingLead.projectId !== projectId) {
            updateData.projectId = projectId;
            noteParts.push(`Projects updated`);
          }
        }

        // Update Referral Name if provided from sheet
        if (rawReferralName && existingLead.referralName !== rawReferralName) {
          updateData.referralName = rawReferralName;
          noteParts.push(`Referral: ${rawReferralName}`);
        }

        // Update Assignee
        if (assignedToId && (!existingLead.assignedToId || rawEmp)) {
          updateData.assignedToId = assignedToId;
          noteParts.push(`Assigned user updated`);
        }

        // Update Email if provided from sheet
        if (rawLead.email && String(rawLead.email).trim() && existingLead.email !== String(rawLead.email).trim()) {
          updateData.email = String(rawLead.email).trim();
          noteParts.push(`Email updated`);
        }

        // Update Data Collected if provided from sheet
        if (rawLead.dataCollected || rawLead.dateCollected || rawLead.leadDate) {
          if (dataCollectedDate && (!existingLead.dataCollected || existingLead.dataCollected.getTime() !== dataCollectedDate.getTime())) {
            updateData.dataCollected = dataCollectedDate;
          }
        }

        // Update Site Location if provided from sheet
        if (rawLoc && (!existingLead.siteLocation || existingLead.siteLocation !== rawLoc)) {
          updateData.siteLocation = rawLoc;
          noteParts.push(`Site location updated: ${rawLoc}`);
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: updateData,
          });

          const activityContent = noteParts.length > 0 
            ? `Updated via import: ${noteParts.join(' | ')}`
            : `Lead details updated via spreadsheet re-import`;

          await prisma.leadActivity.create({
            data: {
              leadId: existingLead.id,
              type: 'NOTE',
              content: activityContent,
              userId: currentUser.id || null,
            }
          });

          results.updated++;
        } else {
          // Both name and phone or existing phone matched; lead is recognized and kept up to date
          results.updated++;
        }
        continue;
      }

      // Mark this phone as seen in batch
      seenPhonesInBatch.set(normalizedPhone, { row: rowNum, name });

      // Create new lead
      const leadCreatePayload: any = {
        name,
        phone: normalizedPhone,
        email: rawLead.email ? String(rawLead.email).trim() : null,
        brandId,
        sourceId,
        leadType: resolvedLeadType,
        projectId,
        siteLocation: rawLoc || null,
        referralName: rawReferralName,
        statusId,
        currentStageId,
        rating: resolvedRating?.rating || 0,
        ratingName: resolvedRating?.name || null,
        assignedToId,
        createdById: currentUser.id || 'system',
        nextFollowUp: nextFollowUpDate,
        contactableDate: nextFollowUpDate,
        comments: combinedComments,
        instructionToPass: instructionText,
        dataCollected: dataCollectedDate,
      };

      if (resolvedProjectIds.length > 0) {
        leadCreatePayload.projects = {
          connect: resolvedProjectIds.map(id => ({ id }))
        };
      }

      const createdLead: any = await prisma.lead.create({
        data: leadCreatePayload,
        include: {
          status: true,
          assignedTo: { select: { fullName: true, role: true } },
          createdBy: { select: { fullName: true } }
        }
      });

      // Audit Activity logs
      await prisma.leadActivity.create({
        data: {
          leadId: createdLead.id,
          type: 'SYSTEM',
          content: `Lead imported by ${createdLead.createdBy?.fullName || 'System'}${createdLead.status ? ` with status "${createdLead.status.name}"` : ''}`,
          userId: currentUser.id || null,
        }
      });

      if (createdLead.assignedTo) {
        await prisma.leadActivity.create({
          data: {
            leadId: createdLead.id,
            type: 'ASSIGNMENT',
            content: `Assigned to ${createdLead.assignedTo.fullName}${createdLead.assignedTo.role ? ` (${createdLead.assignedTo.role})` : ''} on import`,
            userId: currentUser.id || null,
          }
        });
      }

      if (combinedComments) {
        await prisma.leadActivity.create({
          data: {
            leadId: createdLead.id,
            type: 'NOTE',
            content: combinedComments,
            userId: currentUser.id || null,
          }
        });
      }

      results.imported++;
    } catch (err: any) {
      console.error(`Error importing row ${rowNum}:`, err);
      results.errors.push({
        row: rowNum,
        leadName: rawLead.name || rawLead.clientName,
        error: err.message || 'Unknown error occurred'
      });
    }
  }

  apiResponse.success(res, results, `Import complete: ${results.imported} imported, ${results.updated} updated, ${results.skipped} skipped`);
});
