import type { Request, Response } from 'express';
import { apiResponse } from '../utils/apiUtils.js';
import { sendMetaLead } from '../services/meta.service.js';

/**
 * Receives lead event data from a client (e.g., a website form) and forwards it
 * to the Meta (Facebook) Conversions API via the meta.service.
 * This acts as a server-side proxy to securely send conversion events.
 *
 * @route POST /api/v1/meta/lead
 */
export const sendLeadEvent = async (req: Request, res: Response) => {
  try {
    if (!req.body) {
      return apiResponse.error(res, 'Request body is missing', 400);
    }

    const { eventId, source, email, phone, pageUrl } = req.body;

    // Basic validation for required fields
    if (!eventId || !source || !pageUrl) {
      return apiResponse.error(res, 'eventId, source, and pageUrl are required', 400);
    }

    // Determine client IP address, respecting proxy headers
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0] || req.socket.remoteAddress;

    // Call the service to handle the actual API call to Meta
    const result = await sendMetaLead({
      eventId,
      source,
      email,
      phone,
      pageUrl,
      ip: ip || '',
      userAgent: req.headers['user-agent'] || ''
    });
    console.log('✅ Meta Lead Event Controller Result:', result);
    
    return apiResponse.success(
      res,
      result,
      'Lead event successfully processed'
    );
  } catch (error) {
    // Log the full error for better debugging
    console.error('❌ Meta Lead Event Controller Error:', error);

    // Respond with a generic error message to the client
    return apiResponse.error(
      res,
      'Failed to process lead event due to an internal error.',
      500
    );
  }
};

/**
 * Webhook verification for Meta / Facebook Lead Ads
 * @route GET /api/v1/meta/webhook
 */
export const verifyMetaWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe') {
      console.log('✅ Meta Webhook challenge verified');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }
  return res.sendStatus(400);
};

/**
 * Incoming Meta Lead Ads webhook.
 * Automated lead creation from Meta is currently disabled so that DM Executives can manually add and assign leads.
 * Responds with 200 OK so Meta webhook does not repeatedly fail or retry.
 * @route POST /api/v1/meta/webhook
 */
export const handleMetaWebhook = async (req: Request, res: Response) => {
  console.log('ℹ️ Incoming Meta webhook event received: Automated lead creation from Meta is currently DISABLED.');
  return apiResponse.success(
    res,
    { autoCreateDisabled: true },
    'Automated lead creation from Meta is currently disabled'
  );
};
