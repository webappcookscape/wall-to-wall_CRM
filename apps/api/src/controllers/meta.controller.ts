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
