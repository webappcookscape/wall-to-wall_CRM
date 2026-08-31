import express from 'express';
import { getUserPerformance, getLeadsMasterReport } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { sendHourlyAfterHoursReport } from '../services/afterHoursReport.service.js';
import { apiResponse, asyncHandler } from '../utils/apiUtils.js';

const router = express.Router();

// Only ADMIN should be able to access this in production, but we use the existing authenticate middleware
router.get('/user-performance', authenticate, getUserPerformance);
router.get('/leads-master', authenticate, getLeadsMasterReport);

// Manual trigger for testing After-Hours activity report email
router.post('/trigger-after-hours-email', authenticate, asyncHandler(async (req, res) => {
  const { hoursAgo = 1 } = req.body;
  const toTime = new Date();
  const fromTime = new Date(toTime.getTime() - Number(hoursAgo) * 60 * 60 * 1000);
  
  const result = await sendHourlyAfterHoursReport({
    fromTime,
    toTime,
    isManualTrigger: true,
  });

  if (result.success) {
    return apiResponse.success(res, result, 'After-hours report email triggered successfully');
  } else {
    return apiResponse.error(res, result.message, 400);
  }
}));

export default router;
