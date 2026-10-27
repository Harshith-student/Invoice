import Invoice from '../models/Invoice.js';
import ReminderLog from '../models/ReminderLog.js';
import User from '../models/User.js';
import { generateAIReminderText } from './aiService.js';
import { sendEmail } from './emailService.js';

/**
 * Calculates difference in days between two dates (ignoring time)
 * positive = future, 0 = today, negative = past due
 */
const getDayDifference = (targetDate, baseDate = new Date()) => {
  const d1 = new Date(targetDate);
  const d2 = new Date(baseDate);

  const midnight1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
  const midnight2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();

  return Math.round((midnight1 - midnight2) / (1000 * 60 * 60 * 24));
};

/**
 * Determines which reminder type applies to an invoice based on due date
 */
export const determineReminderType = (dueDate, baseDate = new Date()) => {
  const diffDays = getDayDifference(dueDate, baseDate);

  if (diffDays === 3) return { type: 'pre-due', daysLate: 0 };
  if (diffDays === 0) return { type: 'due', daysLate: 0 };
  if (diffDays === -3) return { type: 'overdue-1', daysLate: 3 };
  if (diffDays <= -7) return { type: 'overdue-2', daysLate: Math.abs(diffDays) };

  return null;
};

/**
 * Executes the reminder engine for eligible invoices.
 * Can be scoped to a specific userId or run globally for all users.
 */
export const runReminders = async ({ userId = null, baseDate = new Date() } = {}) => {
  const query = {
    status: { $in: ['sent', 'viewed', 'overdue'] },
  };
  if (userId) query.userId = userId;

  const invoices = await Invoice.find(query)
    .populate('clientId')
    .populate('userId');

  console.log(`⏰ Reminder engine running: inspecting ${invoices.length} active invoices...`);

  let checkedCount = 0;
  let remindedCount = 0;
  let markedOverdueCount = 0;
  const processedLogs = [];

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  for (const invoice of invoices) {
    checkedCount++;
    const diffDays = getDayDifference(invoice.dueDate, baseDate);

    // 1. Mark past-due invoices as overdue
    if (diffDays < 0 && invoice.status !== 'overdue' && invoice.status !== 'paid') {
      invoice.status = 'overdue';
      await invoice.save();
      markedOverdueCount++;
    }

    // 2. Check if this invoice matches any reminder schedule
    const reminderInfo = determineReminderType(invoice.dueDate, baseDate);
    if (!reminderInfo) continue;

    const { type, daysLate } = reminderInfo;

    // 3. Skip if already logged for this invoice and reminder stage
    const alreadySent = await ReminderLog.findOne({
      invoiceId: invoice._id,
      type,
    });
    if (alreadySent) {
      continue;
    }

    const client = invoice.clientId || {};
    const freelancer = invoice.userId || {};
    const payUrl = invoice.paymentLinkUrl || `${clientUrl}/i/${invoice.publicId}`;

    // 4. Generate AI reminder text
    const { subject, body } = await generateAIReminderText({
      type,
      clientName: client.name,
      amountPaise: invoice.total,
      invoiceNumber: invoice.invoiceNumber,
      daysLate,
      freelancerName: freelancer.business?.name || freelancer.name,
      payUrl,
    });

    // 5. Send reminder email if client email is present
    if (client.email) {
      await sendEmail({
        to: client.email,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <p style="white-space: pre-line; color: #1e293b; font-size: 14px; line-height: 1.6;">${body}</p>
            <div style="margin-top: 24px; text-align: center;">
              <a href="${payUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
                Pay ${invoice.invoiceNumber} Now →
              </a>
            </div>
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px;">Sent via ChasePay Automated Reminders</p>
          </div>
        `,
      });
    }

    // 6. Record ReminderLog
    const log = await ReminderLog.create({
      invoiceId: invoice._id,
      userId: invoice.userId._id || invoice.userId,
      type,
      subject,
      body,
      sentAt: new Date(),
    });

    remindedCount++;
    processedLogs.push(log);
    console.log(`✉️ Reminder [${type}] sent for ${invoice.invoiceNumber} to ${client.email}`);
  }

  return {
    checked: checkedCount,
    reminded: remindedCount,
    markedOverdue: markedOverdueCount,
    logs: processedLogs,
  };
};
