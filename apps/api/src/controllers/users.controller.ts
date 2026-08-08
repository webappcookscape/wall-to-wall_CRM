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
  const { username, fullName, email, phone, role, showroomId, signaturePhotoId, businessHeadId, status, password } = req.body;
  
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
  const allowedFields = ['username', 'fullName', 'email', 'phone', 'role', 'showroomId', 'signaturePhotoId', 'businessHeadId', 'status', 'password'];
  
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
  await prisma.user.delete({ where: { id: String(id) } });
  apiResponse.success(res, null, 'User deleted successfully', 204);
});
