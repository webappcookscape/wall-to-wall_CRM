import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    username: z.string({ message: 'Username is required' }),
  }),
});

export const googleLoginSchema = z.object({
  body: z.object({
    credential: z.string({ message: 'Google credential is required' }),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    username: z.string({ message: 'Username is required' }),
    fullName: z.string({ message: 'Full name is required' }),
    email: z.string({ message: 'Email is required' }).email('Invalid email address'),
    password: z.string({ message: 'Password is required' }).min(6, 'Password must be at least 6 characters'),
  }),
});
