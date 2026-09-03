import prisma from '../lib/prisma.js';

export const DM_EXECUTIVE_ROLE = 'DM_EXECUTIVE';

export type RequestUser = {
  id?: string;
  role?: string;
};

export const getRequestUser = (req: { user?: any }): RequestUser => (req.user || {}) as RequestUser;

export const appendAndClause = (where: any, clause: any) => {
  if (!clause || Object.keys(clause).length === 0) return;

  if (where.AND && Array.isArray(where.AND)) {
    where.AND.push(clause);
    return;
  }

  const existingKeys = Object.keys(where);
  if (existingKeys.length === 0) {
    Object.assign(where, clause);
    return;
  }

  const snapshot = { ...where };
  existingKeys.forEach((key) => delete where[key]);
  where.AND = [snapshot, clause];
};

export const ALL_ASSIGNABLE_ROLES = ['FA', 'LA', 'VENDOR_MANAGEMENT', 'CLIENT_FACILITATOR', 'BUSINESS_HEAD', 'ADMIN'];

export const getLeadVisibilityClause = async (user: RequestUser) => {
  if (user.role === 'ADMIN') return {};
  if (!user.id) return { id: '__no_access__' };

  if (['DM_EXECUTIVE', 'BUSINESS_HEAD', 'FA', 'LA', 'VENDOR_MANAGEMENT', 'CLIENT_FACILITATOR'].includes(user.role || '')) {
    return {
      OR: [
        { assignedToId: user.id },
        { createdById: user.id }
      ]
    };
  }

  return { assignedToId: user.id };
};

export const applyLeadVisibility = async (where: any, user: RequestUser) => {
  appendAndClause(where, await getLeadVisibilityClause(user));
};

export const ensureLeadViewAccess = async (leadId: string, user: RequestUser) => {
  const where: any = { id: leadId };
  await applyLeadVisibility(where, user);

  const visibleLead = await prisma.lead.findFirst({
    where,
    select: { id: true },
  });

  if (!visibleLead) {
    throw { status: 403, message: 'Access denied to this lead.' };
  }

  return visibleLead;
};

export const ensureLeadCreateAccess = (user: RequestUser) => {
  if (!['ADMIN', DM_EXECUTIVE_ROLE, 'BUSINESS_HEAD', 'FA', 'LA', 'VENDOR_MANAGEMENT', 'CLIENT_FACILITATOR'].includes(user.role || '')) {
    throw { status: 403, message: 'Only authorized team members can add leads.' };
  }
};

export const ensureLeadUpdateAccess = async (leadId: string, user: RequestUser, updatePayload?: any) => {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      createdById: true,
      assignedToId: true,
      status: { select: { name: true } },
    },
  });

  if (!lead) {
    throw { status: 404, message: 'Lead not found.' };
  }

  if (user.role === 'ADMIN') {
    return lead;
  }

  if (user.role === 'BUSINESS_HEAD') {
    const isVisible = lead.assignedToId === user.id || lead.createdById === user.id;
    if (!isVisible) {
      throw { status: 403, message: 'Access denied: You can only edit leads assigned to you or added by you.' };
    }
    return lead;
  }

  if (user.role === DM_EXECUTIVE_ROLE) {
    const isVisible = lead.assignedToId === user.id || lead.createdById === user.id;
    if (!isVisible) {
      throw { status: 403, message: 'Access denied: You can only edit leads assigned to you or added by you.' };
    }
    const statusName = lead.status?.name || 'Fresh';
    if (statusName.trim().toLowerCase() !== 'fresh') {
      throw { status: 403, message: 'DM executives can edit only fresh leads.' };
    }
    if (lead.assignedToId !== null && lead.assignedToId !== user.id) {
      throw { status: 403, message: 'DM executives can edit leads only before they are assigned to others.' };
    }
    return lead;
  }

  if (lead.assignedToId !== user.id) {
    throw { status: 403, message: 'Access denied: You can only follow up on leads assigned to you.' };
  }

  if (updatePayload) {
    const allowedFollowUpFields = ['statusId', 'nextFollowUp', 'contactableDate', 'assignedToId'];
    const fieldsToUpdate = Object.keys(updatePayload);
    const invalidFields = fieldsToUpdate.filter(field => !allowedFollowUpFields.includes(field));
    if (invalidFields.length > 0) {
      throw { 
        status: 403, 
        message: `Access denied: Only Admin, Business Head, and DM Executive (for fresh leads) can edit lead details. Your role (${user.role || 'Unknown'}) can only update follow-up fields (invalid fields: ${invalidFields.join(', ')}).` 
      };
    }
  }

  return lead;
};

export const ensureLeadDeleteAccess = async (leadId: string, user: RequestUser) => {
  if (user.role !== 'ADMIN') {
    throw { status: 403, message: 'Only admin can delete leads.' };
  }

  await ensureLeadViewAccess(leadId, user);
};

export const ensureLeadAssignAccess = async (leadId: string, targetUserId: string | null, user: RequestUser) => {
  if (!['ADMIN', 'BUSINESS_HEAD', 'FA', 'LA', 'VENDOR_MANAGEMENT', 'CLIENT_FACILITATOR'].includes(user.role || '')) {
    throw { status: 403, message: 'Only admin, business heads, FA, LA, vendor management, and client facilitators can assign leads.' };
  }

  await ensureLeadViewAccess(leadId, user);

  if (!targetUserId) return;

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, businessHeadId: true, fullName: true },
  });

  if (!targetUser || targetUser.role === DM_EXECUTIVE_ROLE) {
    throw { status: 400, message: 'Invalid assignment target.' };
  }
};

export const getAssignableUsersClause = (user: RequestUser): any => {
  if (['ADMIN', 'BUSINESS_HEAD', 'FA', 'LA', 'VENDOR_MANAGEMENT', 'CLIENT_FACILITATOR'].includes(user.role || '')) {
    return {
      status: true,
      role: { not: DM_EXECUTIVE_ROLE },
    };
  }

  return {
    status: true,
    id: user.id || '__no_assignable_users__',
  };
};
