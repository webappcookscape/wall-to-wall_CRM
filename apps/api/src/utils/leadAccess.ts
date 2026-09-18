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

export const getLeadVisibilityClause = async (user: RequestUser) => {
  if (user.role === 'ADMIN') return {};
  if (!user.id) return { id: '__no_access__' };

  if (
    user.role === DM_EXECUTIVE_ROLE || 
    user.role === 'BUSINESS_HEAD' || 
    user.role === 'CLIENT_FACILITATOR' || 
    user.role === 'FA' || 
    user.role === 'CRE' || 
    user.role === 'DESIGNER'
  ) {
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
  const allowedRoles = ['ADMIN', 'BUSINESS_HEAD', DM_EXECUTIVE_ROLE, 'CLIENT_FACILITATOR', 'FA', 'CRE', 'DESIGNER'];
  if (!allowedRoles.includes(user.role || '')) {
    throw { status: 403, message: 'Only admin, business heads, DM executives, client facilitators, and FAs can add leads.' };
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
    // DM executive can only assign while adding, not while editing!
    if (updatePayload?.assignedToId !== undefined && updatePayload.assignedToId !== lead.assignedToId) {
      throw { status: 403, message: 'DM executives can only assign leads while adding, not while editing.' };
    }
    return lead;
  }

  if (user.role === 'CLIENT_FACILITATOR' || user.role === 'FA' || user.role === 'CRE') {
    const isVisible = lead.assignedToId === user.id || lead.createdById === user.id;
    if (!isVisible) {
      throw { status: 403, message: 'Access denied: You can only edit leads assigned to you or added by you.' };
    }
    return lead;
  }

  if (lead.assignedToId !== user.id) {
    throw { status: 403, message: 'Access denied: You can only follow up on leads assigned to you.' };
  }

  if (updatePayload) {
    const allowedFollowUpFields = ['statusId', 'nextFollowUp', 'contactableDate', 'assignedToId', 'orderValue'];
    const fieldsToUpdate = Object.keys(updatePayload);
    const invalidFields = fieldsToUpdate.filter(field => !allowedFollowUpFields.includes(field));
    if (invalidFields.length > 0) {
      throw { 
        status: 403, 
        message: `Access denied: Only Admin, Business Head, DM Executive, Client Facilitator, and FA can edit lead details.` 
      };
    }
  }

  return lead;
};

export const ensureLeadDeleteAccess = async (leadId: string, user: RequestUser) => {
  if (user.role !== 'ADMIN') {
    throw { status: 403, message: 'Only admin has delete access.' };
  }

  await ensureLeadViewAccess(leadId, user);
};

export const ensureLeadAssignAccess = async (leadId: string, targetUserId: string | null, user: RequestUser) => {
  const existingLead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { assignedToId: true, createdById: true },
  });

  // If assignedToId hasn't changed, no assignment permission check is needed
  if (existingLead && (existingLead.assignedToId || null) === (targetUserId || null)) {
    return;
  }

  if (user.role === DM_EXECUTIVE_ROLE) {
    throw { status: 403, message: 'DM executives can only assign leads while adding, not while editing or following up.' };
  }

  if (user.role !== 'ADMIN' && user.role !== 'BUSINESS_HEAD' && user.role !== 'CRE') {
    throw { status: 403, message: 'Only admin and business heads can re-assign existing leads.' };
  }

  await ensureLeadViewAccess(leadId, user);

  if (!targetUserId) return;

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, businessHeadId: true, fullName: true },
  });

  if (!targetUser) {
    throw { status: 400, message: 'Invalid assignment target. User not found.' };
  }
};

export const getAssignableUsersClause = (user: RequestUser): any => {
  const role = String(user?.role || '').trim().toUpperCase();
  const isDmExecutive = role === DM_EXECUTIVE_ROLE;

  if (['ADMIN', 'BUSINESS_HEAD', 'CRE', 'DESIGNER', DM_EXECUTIVE_ROLE, 'CLIENT_FACILITATOR', 'FA'].includes(role)) {
    return {
      status: { not: false },
      ...(isDmExecutive && user?.id ? { id: { not: user.id } } : {})
    };
  }

  return {
    status: { not: false },
    id: user?.id || '__no_assignable_users__',
  };
};
