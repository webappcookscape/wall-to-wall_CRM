import prisma from '../lib/prisma.js';
import type { Request, Response } from 'express';
import { asyncHandler, apiResponse } from '../utils/apiUtils.js';
import bcrypt from 'bcryptjs';

const normalizeCredential = (value: string) => String(value).trim().toLowerCase();

export const getUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    include: {
      showroom: true,
      signaturePhoto: true,
      businessHead: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  apiResponse.success(res, users);
});

export const createUser = asyncHandler(async (req, res) => {
  const { username, fullName, email, phone, role, showroomId, signaturePhotoId, businessHeadId, status, password, metaAccess } = req.body;
  
  if (!username || !email || !fullName) {
    return apiResponse.error(res, 'Username, Email, and Full Name are required', 400);
  }

  // Sanitize empty strings to null for optional relations
  const data: any = {
    username: normalizeCredential(username),
    fullName: String(fullName),
    email: normalizeCredential(email),
    phone: phone ? String(phone) : null,
    role: role || 'CRE',
    status: status !== undefined ? Boolean(status) : true,
    metaAccess: metaAccess !== undefined ? Boolean(metaAccess) : false,
    showroomId: showroomId && showroomId !== '' ? String(showroomId) : null,
    signaturePhotoId: signaturePhotoId && signaturePhotoId !== '' ? String(signaturePhotoId) : null,
    businessHeadId: businessHeadId && businessHeadId !== '' ? String(businessHeadId) : null,
  };

  if (password) {
    data.password = await bcrypt.hash(password, 10);
  } else {
    // Default fallback if frontend doesn't provide one
    data.password = await bcrypt.hash('Welcome@123', 10);
  }

  try {
    const user = await prisma.user.create({
      data,
      include: { showroom: true, signaturePhoto: true, businessHead: true }
    });
    apiResponse.success(res, user, 'User created successfully', 201);
  } catch (error: any) {
    console.error('❌ Prisma Create User Error:', error);
    if (error.code === 'P2002') {
      return apiResponse.error(res, 'Username or Email already exists', 400);
    }
    return apiResponse.error(res, error.message || 'Failed to create user', 500, error);
  }
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowedFields = ['username', 'fullName', 'email', 'phone', 'role', 'showroomId', 'signaturePhotoId', 'businessHeadId', 'status', 'password', 'metaAccess'];
  
  console.log('Updating user:', id, 'Body:', req.body);
  
  const updateData: any = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      // Convert empty strings to null for relation IDs
      if (['showroomId', 'signaturePhotoId', 'businessHeadId'].includes(field) && req.body[field] === '') {
        updateData[field] = null;
      } else if (field === 'username' || field === 'email') {
        updateData[field] = normalizeCredential(req.body[field]);
      } else if (field === 'password' && req.body[field]) {
        updateData[field] = await bcrypt.hash(req.body[field], 10);
      } else if (field === 'password' && !req.body[field]) {
        // Skip empty password updates
        continue;
      } else {
        updateData[field] = req.body[field];
      }
    }
  }

  console.log('Filtered update data:', updateData);

  try {
    const updated = await prisma.user.update({
      where: { id: String(id) },
      data: updateData,
      include: { showroom: true, signaturePhoto: true, businessHead: true }
    });
    apiResponse.success(res, updated, 'User updated successfully');
  } catch (error: any) {
    console.error('❌ Prisma Update User Error:', error);
    if (error.code === 'P2002') {
      return apiResponse.error(res, 'Username or Email already exists', 400);
    }
    return apiResponse.error(res, error.message || 'Failed to update user', 500, error);
  }
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = String(id);

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    return apiResponse.error(res, 'User not found', 404);
  }

  // Prevent deleting the only remaining admin
  if (targetUser.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return apiResponse.error(res, 'Cannot delete the only remaining Admin account', 400);
    }
  }

  const force = req.query.force === 'true';

  // Check if the user is assigned to any leads and find their project names
  const assignedLeads = await prisma.lead.findMany({
    where: { assignedToId: userId },
    include: { project: true },
  });

  if (assignedLeads.length > 0 && !force) {
    const projectNames = Array.from(
      new Set(assignedLeads.map((l) => l.project?.name).filter(Boolean))
    );
    const projectSummary = projectNames.length > 0 ? projectNames.join(', ') : 'General Projects';
    return res.status(409).json({
      success: false,
      hasAssignedProjects: true,
      count: assignedLeads.length,
      projects: projectNames,
      message: `User "${targetUser.fullName}" is currently assigned to ${assignedLeads.length} lead(s) in project(s): ${projectSummary}. Reassign these leads or confirm to force delete and unassign them.`
    });
  }

  // Find a fallback admin to reassign any required createdBy records
  const fallbackAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN', id: { not: userId } }
  });

  await prisma.$transaction(async (tx) => {
    // 1. Unassign leads from this user
    await tx.lead.updateMany({
      where: { assignedToId: userId },
      data: { assignedToId: null }
    });

    // 2. Reassign leads created by this user to fallback admin
    if (fallbackAdmin) {
      await tx.lead.updateMany({
        where: { createdById: userId },
        data: { createdById: fallbackAdmin.id }
      });
    }

    // 3. Unassign tasks
    await tx.task.updateMany({
      where: { assignedToId: userId },
      data: { assignedToId: null }
    });

    // 4. Reassign tasks created by this user
    if (fallbackAdmin) {
      await tx.task.updateMany({
        where: { createdById: userId },
        data: { createdById: fallbackAdmin.id }
      });
    }

    // 5. Unlink lead activities
    await tx.leadActivity.updateMany({
      where: { userId: userId },
      data: { userId: null }
    });

    // 6. Unlink subordinates reporting to this user
    await tx.user.updateMany({
      where: { businessHeadId: userId },
      data: { businessHeadId: null }
    });

    // 7. Delete the user
    await tx.user.delete({
      where: { id: userId }
    });
  });

  apiResponse.success(res, null, 'User and all associations deleted successfully');
});

