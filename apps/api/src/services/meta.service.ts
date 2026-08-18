import { getMetaConfig } from '../config/meta.js';
import { hashValue } from '../utils/hash.js';

type SendMetaLeadInput = {
  eventId: string;
  source: string;
  eventName?: string;
  email?: string | undefined;
  phone?: string | undefined;
  pageUrl: string;
  ip?: string | undefined;
  userAgent?: string | undefined;
  metaLeadId?: string | undefined;
  value?: number | undefined;
};

export const sendMetaLead = async ({
  eventId,
  source,
  eventName = 'Lead',
  email,
  phone,
  pageUrl,
  ip,
  userAgent,
  metaLeadId,
  value,
}: SendMetaLeadInput) => {
  const { pixelId, accessToken } = getMetaConfig();

  if (!pixelId || !accessToken) {
    throw new Error('Meta pixel ID and access token are required');
  }

  const userData: Record<string, string | string[]> = {};
  const hashedEmail = hashValue(email);
  const hashedPhone = hashValue(phone);

  if (hashedEmail) userData.em = [hashedEmail];
  if (hashedPhone) userData.ph = [hashedPhone];
  if (ip) userData.client_ip_address = ip;
  if (userAgent) userData.client_user_agent = userAgent;
  if (metaLeadId) userData.lead_id = metaLeadId;

  const customData: Record<string, any> = {};
  if (eventName === 'Purchase') {
    customData.currency = 'INR';
    customData.value = value !== undefined && value !== null ? value : 100.0;
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: source,
        event_source_url: pageUrl,
        user_data: userData,
        ...(Object.keys(customData).length > 0 ? { custom_data: customData } : {}),
      },
    ],
    // ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  console.log('Meta payload:', JSON.stringify(payload, null, 2));
  const apiVersion = process.env.META_GRAPH_API_VERSION || 'v20.0';
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${pixelId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      access_token: accessToken,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(result));
  }
  console.log(result)
  return result;
};
