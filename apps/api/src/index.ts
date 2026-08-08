import express from 'express'; // reload
import type { Request, Response, NextFunction } from 'express';
import { apiResponse } from './utils/apiUtils.js';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Import Routes
import leadRoutes from './routes/leads.js';
import userRoutes from './routes/users.js';
import masterRoutes from './routes/masters.js';
import photoRoutes from './routes/photos.js';
import authRoutes from './routes/auth.js';
import metaRoutes from './routes/meta.js';
import reportRoutes from './routes/report.js';
import { getDashboardStats } from './controllers/dashboard.controller.js';
import { authenticate } from './middleware/auth.middleware.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWhatsAppLead } from './controllers/whatsapp.controller.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, '../.env') });

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Security and Logging Middlewares
app.use(helmet());
app.use(morgan('dev'));

// General API rate limiter — 1000 req per 15 min per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  skip: (req) => req.path.includes('/dashboard/stats'), // never throttle polling
});
app.use('/api/', limiter as any);

// Strict limiter for auth endpoints only — prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 login attempts per 15 min
  message: 'Too many login attempts, please try again after 15 minutes',
});
app.use('/api/v1/auth/login', authLimiter as any);
app.use('/api/v1/auth/google-login', authLimiter as any);

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

app.get("/", (req, res) => {
  console.log("Root endpoint hit");
});

app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

// API Routes
app.use('/api/v1/auth', authRoutes); // Unprotected
app.use('/api/v1/meta', metaRoutes); // Public Meta conversion events
app.post('/api/v1/leads/whatsapp', createWhatsAppLead); // Public WhatsApp intake

// Protected API Routes
app.use('/api/v1/leads', authenticate, leadRoutes);
app.use('/api/v1/users', authenticate, userRoutes);
app.use('/api/v1/masters', authenticate, masterRoutes);
app.use('/api/v1/photos', authenticate, photoRoutes);
app.use('/api/v1/report', authenticate, reportRoutes);

app.use("/api/meta", metaRoutes);

// Dashboard
app.get('/api/v1/dashboard/stats', authenticate, getDashboardStats);

// Auth routes (Mock for now)
app.get('/auth/google', (_req: Request, res: Response) => {
  res.redirect('http://localhost:5173/'); // Redirect back to frontend
});

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('🔥 Global Error:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  apiResponse.error(res, message, status, err);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
