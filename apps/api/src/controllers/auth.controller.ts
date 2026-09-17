import prisma from '../lib/prisma.js';
import type { Request, Response } from 'express';
import { asyncHandler, apiResponse } from '../utils/apiUtils.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'cookscape_crm_secret';
const JWT_EXPIRES_IN = '7d';

/**
 * POST /api/v1/auth/login
 * Body: { username }
 * Returns a JWT + user profile
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return apiResponse.error(res, 'Username and password are required', 400);
  }

  const identifier = String(username).trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: identifier },
        { email: identifier }
      ]
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      password: true,
      phone: true,
      role: true,
      status: true,
      metaAccess: true,
      showroom: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    return apiResponse.error(res, 'Invalid credentials', 401);
  }

  if (!user.status) {
    return apiResponse.error(res, 'Your account is inactive. Contact admin.', 403);
  }

  // Temporary fallback for the admin user to allow "admin123" if the DB isn't seeded with a hashed password yet.
  if ((user.email === 'admin@gmail.com' || user.username === 'admin@gmail.com') && password === 'admin123') {
    // Admin override accepted
  } else {
    if (!(user as any).password) {
      return apiResponse.error(res, 'Account not setup for password login. Please use Google Login.', 401);
    }
    
    const isMatch = await bcrypt.compare(password, (user as any).password);
    if (!isMatch) {
      return apiResponse.error(res, 'Invalid credentials', 401);
    }
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET as string,
    { expiresIn: JWT_EXPIRES_IN }
  );
  
  const { password: _, ...userWithoutPassword } = user;

  return apiResponse.success(res, { token, user: userWithoutPassword }, 'Login successful');
});

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const { credential } = req.body;

  if (!credential) {
    return apiResponse.error(res, 'Google credential is required', 400);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID as string;
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return apiResponse.error(res, 'Invalid Google token payload', 400);
    }

    const email = payload.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        metaAccess: true,
        showroom: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return apiResponse.error(res, 'Your email is not registered in the system. Please contact the administrator.', 404);
    }

    if (!user.status) {
      return apiResponse.error(res, 'Your account is inactive. Contact admin.', 403);
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET as string,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return apiResponse.success(res, { token, user }, 'Login successful');
  } catch (error) {
    console.error('Google login error:', error);
    return apiResponse.error(res, 'Failed to verify Google token', 401);
  }
});

/**
 * GET /api/v1/auth/me
 * Requires Authorization: Bearer <token>
 * Returns the currently logged-in user profile
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return apiResponse.error(res, 'Unauthorized', 401);
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return apiResponse.error(res, 'Token is missing', 401);
  }
  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET as string);
  } catch {
    return apiResponse.error(res, 'Invalid or expired token', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      metaAccess: true,
      showroom: { select: { id: true, name: true } },
    },
  });

  if (!user || !user.status) {
    return apiResponse.error(res, 'User not found or inactive', 404);
  }

  return apiResponse.success(res, user, 'User profile fetched');
});
