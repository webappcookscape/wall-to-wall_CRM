export const getMetaConfig = () => ({
  pixelId: process.env.META_PIXEL_ID,
  accessToken: process.env.META_ACCESS_TOKEN,
  // testEventCode: process.env.META_TEST_EVENT_CODE,
  autoCreateLead: process.env.META_AUTO_CREATE_LEAD === 'true', // Disabled by default
});
