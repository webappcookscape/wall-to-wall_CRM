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

  if (user.role === 'BUSINESS_HEAD') {
    const subordinates = await prisma.user.findMany({
      where: { businessHeadId: user.id, status: true },
      select: { id: true },
    });
    const visibleUserIds = [user.id, ...subordinates.map((u) => u.id)];
    return { assignedToId: { in: visibleUserIds } };
  }

  if (user.role === DM_EXECUTIVE_ROLE) {
    return { createdById: user.id };
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
  if (user.role !== 'ADMIN' && user.role !== DM_EXECUTIVE_ROLE) {
    throw { status: 403, message: 'Only admin and DM executives can add leads.' };
  }
};

export const ensureLeadUpdateAccess = async (leadId: string, user: RequestUser) => {
  if (user.role === DM_EXECUTIVE_ROLE) {
    const where: any = { id: leadId };
    await applyLeadVisibility(where, user);

    const visibleLead = await prisma.lead.findFirst({
      where,
      select: {
        id: true,
        status: { select: { name: true } },
      },
    });

    if (!visibleLead) {
      throw { status: 403, message: 'Access denied to this lead.' };
    }

    const statusName = visibleLead.status?.name || 'Fresh';

    if (statusName.trim().toLowerCase() !== 'fresh') {
      throw { status: 403, message: 'DM executives can edit only fresh leads.' };
    }

    return visibleLead;
  }

  await ensureLeadViewAccess(leadId, user);
};

export const ensureLeadDeleteAccess = async (leadId: string, user: RequestUser) => {
  if (user.role !== 'ADMIN' && user.role !== 'BUSINESS_HEAD') {
    throw { status: 403, message: 'Only admin and business heads can delete leads.' };
  }

  await ensureLeadViewAccess(leadId, user);
};

export const ensureLeadAssignAccess = async (leadId: string, targetUserId: string | null, user: RequestUser) => {
  if (user.role !== 'ADMIN' && user.role !== 'BUSINESS_HEAD') {
    throw { status: 403, message: 'Only admin and business heads can assign leads.' };
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

  if (user.role === 'BUSINESS_HEAD' && targetUser.businessHeadId !== user.id && targetUser.id !== user.id) {
    throw { status: 403, message: 'Business heads can assign leads only to themselves or their employees.' };
  }
};

export const getAssignableUsersClause = (user: RequestUser): any => {
  if (user.role === 'ADMIN') {
    return {
      status: true,
      role: { not: DM_EXECUTIVE_ROLE },
    };
  }

  if (user.role === 'BUSINESS_HEAD' && user.id) {
    return {
      status: true,
      role: { not: DM_EXECUTIVE_ROLE },
      OR: [
        { id: user.id },
        { businessHeadId: user.id },
      ],
    };
  }

  return {
    status: true,
    id: user.id || '__no_assignable_users__',
  };
};
