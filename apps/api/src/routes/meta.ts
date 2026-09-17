import express from 'express';
import { sendLeadEvent, verifyMetaWebhook, handleMetaWebhook } from '../controllers/meta.controller.js';

const router = express.Router();

// Public Meta conversion events proxy (sends signal to Meta CAPI)
router.post('/lead', sendLeadEvent);

// Public Meta Webhook endpoints (automated lead creation from Meta disabled)
router.get('/webhook', verifyMetaWebhook);
router.post('/webhook', handleMetaWebhook);

export default router;
