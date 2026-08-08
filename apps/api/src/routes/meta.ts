import express from 'express';
import { sendLeadEvent } from '../controllers/meta.controller.js';

const router = express.Router();

router.post('/lead', sendLeadEvent);

export default router;
