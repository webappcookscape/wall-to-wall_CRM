import express from 'express';
import { getUserPerformance, getLeadsMasterReport } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Only ADMIN should be able to access this in production, but we use the existing authenticate middleware
// You can add role-based middleware here if you have one, e.g., requireAdmin
router.get('/user-performance', authenticate, getUserPerformance);
router.get('/leads-master', authenticate, getLeadsMasterReport);

export default router;
