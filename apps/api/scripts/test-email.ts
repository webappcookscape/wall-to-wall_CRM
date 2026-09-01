import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, '../.env') });

import { sendHourlyAfterHoursReport } from '../src/services/afterHoursReport.service.js';

async function testEmail() {
  console.log('📧 Testing After-Hours Report Email sending via Gmail SMTP...');
  console.log(`- SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`- SMTP_USER: ${process.env.SMTP_USER}`);
  console.log(`- RECIPIENT: ${process.env.AFTER_HOURS_REPORT_EMAIL}`);

  const toTime = new Date();
  const fromTime = new Date(toTime.getTime() - 24 * 60 * 60 * 1000); // past 24 hours of activities

  const result = await sendHourlyAfterHoursReport({
    fromTime,
    toTime,
    isManualTrigger: true,
  });

  console.log('Result:', result);
}

testEmail().catch(err => {
  console.error('❌ Test email failed:', err);
  process.exit(1);
});
