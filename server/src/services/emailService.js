import nodemailer from 'nodemailer';
import { Resend } from 'resend';

/**
 * Format paise into Indian Rupees string (e.g. ₹50,000.00)
 */
const formatINR = (paise = 0) => {
  const rupees = (Number(paise) || 0) / 100;
  return 'Rs. ' + rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Sends an email with optional attachments using Resend, Nodemailer, or a console mock for testing.
 */
export const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  // 1. Check for Resend
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const res = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'ChasePay <onboarding@resend.dev>',
        to,
        subject,
        html,
        attachments: attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
        })),
      });
      console.log(`📧 Email sent via Resend to ${to} (ID: ${res.data?.id})`);
      return { success: true, messageId: res.data?.id };
    } catch (err) {
      console.error('⚠️ Resend failed, trying nodemailer/test fallback:', err.message);
    }
  }

  // 2. Check for SMTP in .env
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || `"ChasePay" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        attachments,
      });

      console.log(`📧 Email sent via SMTP to ${to} (ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('⚠️ SMTP failed:', err.message);
    }
  }

  // 3. Fallback: Log email to console for seamless demo testing without external credentials
  console.log('\n──────────────────────────────────────────────────────────');
  console.log(`📧 [MOCK EMAIL DISPATCH]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Attachments: ${attachments.map((a) => a.filename).join(', ')}`);
  console.log('Body Preview: Email rendered successfully (View in browser)');
  console.log('──────────────────────────────────────────────────────────\n');

  return { success: true, mock: true };
};

/**
 * Builds the HTML template and dispatches an invoice to a client
 */
export const sendInvoiceEmail = async (invoice, user, pdfBuffer) => {
  const client = invoice.clientId || {};
  const business = user?.business || {};
  const publicPayUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/i/${invoice.publicId}`;
  const totalStr = formatINR(invoice.total);

  const subject = `Tax Invoice ${invoice.invoiceNumber} from ${business.name || user?.name || 'ChasePay'}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { background-color: #ffffff; max-width: 580px; margin: 0 auto; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #4338ca, #6366f1); padding: 32px 28px; color: #ffffff; text-align: center; }
        .title { font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
        .subtitle { font-size: 13px; color: #e0e7ff; margin-top: 6px; }
        .content { padding: 28px; }
        .greeting { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
        .amount-box { background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0; }
        .amount-label { font-size: 11px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.5px; }
        .amount-val { font-size: 28px; font-weight: 900; color: #312e81; margin: 4px 0; }
        .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; margin: 16px 0; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25); }
        .footer { padding: 20px 28px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">New Invoice Received</h1>
          <div class="subtitle">${invoice.invoiceNumber} • Due ${new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>
        <div class="content">
          <p class="greeting">Hi ${client.name || 'there'},</p>
          <p style="font-size: 14px; line-height: 1.5; color: #475569;">
            ${business.name || user?.name || 'Your contractor'} has shared a GST-ready tax invoice for recent deliverables. A PDF copy is attached for your accounting records.
          </p>

          <div class="amount-box">
            <div class="amount-label">Amount Payable</div>
            <div class="amount-val">${totalStr}</div>
            <div style="font-size: 12px; color: #6366f1;">All taxes and GST included</div>
          </div>

          <div style="text-align: center;">
            <a href="${publicPayUrl}" class="btn">View & Pay Invoice Online →</a>
          </div>

          <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 14px;">
            Supports UPI (GPay/PhonePe/Paytm), Cards, and NetBanking.
          </p>
        </div>
        <div class="footer">
          Generated automatically by ChasePay • Invoicing for Indian Freelancers
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: client.email,
    subject,
    html,
    attachments: [
      {
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
};
