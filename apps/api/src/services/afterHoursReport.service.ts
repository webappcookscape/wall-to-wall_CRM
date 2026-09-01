import prisma from '../lib/prisma.js';
import nodemailer from 'nodemailer';
import cron from 'node-cron';

export interface AuditLogParams {
  userId?: string | null | undefined;
  action: string;
  details?: string | null | undefined;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
}

/**
 * Record an audit log entry for user actions and logins
 */
export async function recordAuditLog(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        details: params.details || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    console.error('⚠️ Failed to record audit log:', error);
  }
}

/**
 * Helper to get current Indian Standard Time (IST, UTC+5:30) date object
 */
export function getNowIst(): { nowIst: Date; istHour: number; istMinutes: number } {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const nowUtc = new Date();
  const nowIst = new Date(nowUtc.getTime() + istOffsetMs);
  return {
    nowIst,
    istHour: nowIst.getUTCHours(),
    istMinutes: nowIst.getUTCMinutes(),
  };
}

/**
 * Format date/time string in IST readable format
 */
export function formatIstDateTime(date: Date): string {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Sends the hourly activity report email for the specified time window
 */
export async function sendHourlyAfterHoursReport(options?: {
  fromTime?: Date;
  toTime?: Date;
  isManualTrigger?: boolean;
}): Promise<{ success: boolean; message: string; activityCount: number }> {
  const intervalMinutes = parseInt(process.env.AFTER_HOURS_INTERVAL_MINUTES || '15', 10);
  const toTime = options?.toTime || new Date();
  const fromTime = options?.fromTime || new Date(toTime.getTime() - intervalMinutes * 60 * 1000); // 15 minutes ago by default

  const recipientEmail = process.env.AFTER_HOURS_REPORT_EMAIL || process.env.ALERT_EMAIL || 'admin@wall2wall.com';
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpFrom = process.env.SMTP_FROM || `"Wall to Wall CRM" <${smtpUser || 'no-reply@wall2wall.com'}>`;

  // Fetch activities in the window
  const [activities, auditLogs] = await Promise.all([
    prisma.leadActivity.findMany({
      where: {
        createdAt: { gte: fromTime, lte: toTime },
      },
      include: {
        user: { select: { id: true, fullName: true, username: true, role: true, email: true } },
        lead: { select: { id: true, leadId: true, name: true, phone: true, status: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.findMany({
      where: {
        createdAt: { gte: fromTime, lte: toTime },
      },
      include: {
        user: { select: { id: true, fullName: true, username: true, role: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalActions = activities.length + auditLogs.length;

  if (totalActions === 0 && !options?.isManualTrigger) {
    console.log(`ℹ️ [After-Hours Reporter] No activity recorded between ${formatIstDateTime(fromTime)} and ${formatIstDateTime(toTime)}. Skipping email.`);
    return { success: true, message: 'No activity in this time window', activityCount: 0 };
  }

  // Check if SMTP is configured
  if (!smtpHost || !smtpUser || !smtpPass) {
    const warningMsg = `⚠️ [After-Hours Reporter] SMTP credentials not configured in .env (SMTP_HOST, SMTP_USER, SMTP_PASS). Report for ${totalActions} actions could not be sent to ${recipientEmail}.`;
    console.warn(warningMsg);
    return { success: false, message: warningMsg, activityCount: totalActions };
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const fromFormatted = formatIstDateTime(fromTime);
  const toFormatted = formatIstDateTime(toTime);

  // Group unique users
  const activeUserSet = new Map<string, { name: string; role: string; email: string }>();
  activities.forEach(a => {
    if (a.user) activeUserSet.set(a.user.id, { name: a.user.fullName, role: a.user.role, email: a.user.email });
  });
  auditLogs.forEach(l => {
    if (l.user) activeUserSet.set(l.user.id, { name: l.user.fullName, role: l.user.role, email: l.user.email });
  });

  // Build HTML Email Content
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333; }
      .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e1e6eb; }
      .header { background: #006039; color: #ffffff; padding: 24px 30px; text-align: left; }
      .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
      .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
      .summary-cards { display: flex; gap: 12px; padding: 20px 30px; background: #fcfdfe; border-bottom: 1px solid #edf2f7; }
      .card { flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
      .card-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #718096; margin: 0; }
      .card-value { font-size: 22px; font-weight: 800; color: #006039; margin: 4px 0 0 0; }
      .content { padding: 25px 30px; }
      .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #2d3748; margin: 0 0 12px 0; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
      th { background-color: #f7fafc; color: #4a5568; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
      td { padding: 10px 12px; border-bottom: 1px solid #edf2f7; vertical-align: top; color: #4a5568; }
      tr:hover { background-color: #f8fafc; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
      .badge-user { background: #e6fffa; color: #234e52; }
      .badge-action { background: #ebf8ff; color: #2b6cb0; }
      .badge-login { background: #fefcbf; color: #744210; }
      .footer { background: #f7fafc; padding: 18px 30px; font-size: 11px; color: #a0aec0; text-align: center; border-top: 1px solid #edf2f7; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🌙 Wall to Wall CRM — After-Hours Activity Report</h1>
        <p>Reporting Period: <strong>${fromFormatted}</strong> to <strong>${toFormatted}</strong> (IST)</p>
      </div>

      <div class="summary-cards">
        <div class="card">
          <div class="card-label">Active Users</div>
          <div class="card-value">${activeUserSet.size}</div>
        </div>
        <div class="card">
          <div class="card-label">Lead Activities</div>
          <div class="card-value">${activities.length}</div>
        </div>
        <div class="card">
          <div class="card-label">Logins / Events</div>
          <div class="card-value">${auditLogs.length}</div>
        </div>
      </div>

      <div class="content">
        <div class="section-title">Active Staff Members (${activeUserSet.size})</div>
        <table>
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Role</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            ${Array.from(activeUserSet.values()).map(u => `
              <tr>
                <td><strong>${u.name}</strong></td>
                <td><span class="badge badge-user">${u.role}</span></td>
                <td>${u.email}</td>
              </tr>
            `).join('') || '<tr><td colspan="3" style="text-align: center; color: #a0aec0;">No users active</td></tr>'}
          </tbody>
        </table>

        ${activities.length > 0 ? `
          <div class="section-title">Lead Interactions & Updates (${activities.length})</div>
          <table>
            <thead>
              <tr>
                <th>Time (IST)</th>
                <th>Staff</th>
                <th>Lead</th>
                <th>Action & Details</th>
              </tr>
            </thead>
            <tbody>
              ${activities.map(a => `
                <tr>
                  <td style="white-space: nowrap;">${formatIstDateTime(a.createdAt).split(', ')[1]}</td>
                  <td><strong>${a.user?.fullName || 'System'}</strong><br><small style="color: #a0aec0;">${a.user?.role || ''}</small></td>
                  <td>${a.lead?.name || 'N/A'}<br><small style="color: #006039;">${a.lead?.phone || ''}</small></td>
                  <td><span class="badge badge-action">${a.type}</span><br>${a.content}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${auditLogs.length > 0 ? `
          <div class="section-title">System Logins & Events (${auditLogs.length})</div>
          <table>
            <thead>
              <tr>
                <th>Time (IST)</th>
                <th>Staff</th>
                <th>Event</th>
                <th>IP / Device Details</th>
              </tr>
            </thead>
            <tbody>
              ${auditLogs.map(l => `
                <tr>
                  <td style="white-space: nowrap;">${formatIstDateTime(l.createdAt).split(', ')[1]}</td>
                  <td><strong>${l.user?.fullName || 'Anonymous'}</strong></td>
                  <td><span class="badge badge-login">${l.action}</span></td>
                  <td>${l.details || ''} ${l.ipAddress ? `<br><small style="color: #a0aec0;">IP: ${l.ipAddress}</small>` : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>

      <div class="footer">
        Automated Security & Operations Digest · Wall to Wall CRM<br>
        Generated automatically at ${formatIstDateTime(new Date())} IST
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: recipientEmail,
      subject: `[Wall to Wall CRM] After-Hours Activity Report (${fromFormatted.split(', ')[1]} – ${toFormatted.split(', ')[1]} IST)`,
      html: htmlContent,
    });
    console.log(`✅ [After-Hours Reporter] Hourly report successfully sent to ${recipientEmail} (Message ID: ${info.messageId})`);
    return { success: true, message: `Report sent to ${recipientEmail}`, activityCount: totalActions };
  } catch (error: any) {
    console.error('❌ [After-Hours Reporter] Failed to send email:', error);
    return { success: false, message: `Failed to send email: ${error.message}`, activityCount: totalActions };
  }
}

/**
 * Initializes the cron job for after-hours reporting.
 * Runs every 15 minutes: checks if current IST time is after 4:00 PM (16:00) or before 6:00 AM (06:00).
 */
export function initAfterHoursCron() {
  const startHour = parseInt(process.env.AFTER_HOURS_START_HOUR || '16', 10); // 16 = 4:00 PM IST
  const endHour = parseInt(process.env.AFTER_HOURS_END_HOUR || '6', 10);      // 6 = 6:00 AM IST
  const intervalMinutes = parseInt(process.env.AFTER_HOURS_INTERVAL_MINUTES || '15', 10);

  console.log(`⏰ [After-Hours Reporter] Cron initialized. Running every ${intervalMinutes} minutes during active window: ${startHour}:00 IST (4:00 PM) to ${endHour}:00 IST.`);

  // Runs every 15 minutes (at :00, :15, :30, :45)
  cron.schedule('*/15 * * * *', async () => {
    const { istHour, nowIst } = getNowIst();

    // Check if within window (e.g. >= 16 OR < 6)
    const isAfterHours = istHour >= startHour || istHour < endHour;

    if (isAfterHours) {
      console.log(`🌙 [After-Hours Reporter] Triggering 15-minute report at ${formatIstDateTime(nowIst)} IST...`);
      try {
        await sendHourlyAfterHoursReport();
      } catch (err) {
        console.error('❌ Error executing after-hours report cron:', err);
      }
    }
  });
}
