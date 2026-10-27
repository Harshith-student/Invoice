/**
 * Phase 5 smoke test — Razorpay Payment Links, Webhooks, Gemini AI Reminders, Cron & History
 * Run: node test-phase5.js
 */
import 'dotenv/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import http from 'http';

process.env.JWT_SECRET = 'test_secret_phase5';
process.env.JWT_EXPIRES_IN = '1h';

import { errorHandler } from './src/middleware/errorHandler.js';
import authRoutes from './src/routes/auth.js';
import clientRoutes from './src/routes/clients.js';
import invoiceRoutes from './src/routes/invoices.js';
import reminderRoutes from './src/routes/reminders.js';
import webhookRoutes from './src/routes/webhooks.js';
import { determineReminderType } from './src/services/reminderService.js';
import { generateAIReminderText } from './src/services/aiService.js';
import Invoice from './src/models/Invoice.js';

// ── helpers ──────────────────────────────────────────────────────────────────
let cookieJar = '';

const request = (options, body) =>
  new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5096,
        headers: {
          'Content-Type': 'application/json',
          ...(cookieJar ? { Cookie: cookieJar } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
        ...options,
      },
      (res) => {
        const sc = res.headers['set-cookie'];
        if (sc) cookieJar = sc.map((c) => c.split(';')[0]).join('; ');

        let raw = '';
        res.on('data', (d) => (raw += d));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch { resolve({ status: res.statusCode, body: raw }); }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });

const pass = (label) => console.log(`  ✅ ${label}`);
const fail = (label, detail) => { console.error(`  ❌ ${label}:`, JSON.stringify(detail)); process.exitCode = 1; };
const section = (title) => console.log(`\n─── ${title} ───`);

// ── setup ─────────────────────────────────────────────────────────────────────
const mongod = await MongoMemoryServer.create({ instance: { startupTimeout: 60000 } });
await mongoose.connect(mongod.getUri());

const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use(errorHandler);

const server = app.listen(5096);
console.log('\n🧪 ChasePay Phase 5 — Smoke Tests\n');

// ── 1. Register User & Client ─────────────────────────────────────────────────
section('Setup: User & Client');
await request({ method: 'POST', path: '/api/auth/register' }, {
  name: 'Dev Freelancer', email: 'dev@freelance.in', password: 'password123',
});
const clientRes = await request({ method: 'POST', path: '/api/clients' }, {
  name: 'Zenith Labs', email: 'billing@zenith.com', phone: '+91 9999900000',
});
const clientId = clientRes.body.client._id;
pass('User and client ready');

// ── 2. Invoice with Payment Link ──────────────────────────────────────────────
section('Razorpay: Payment Link Generation on Send');
const invRes = await request({ method: 'POST', path: '/api/invoices' }, {
  clientId,
  issueDate: '2026-10-20',
  dueDate: '2026-10-27',
  items: [{ description: 'Frontend Development', qty: 1, rate: 4500000, gstPercent: 18 }],
});
const invoiceId = invRes.body.invoice._id;

// Send invoice -> creates Razorpay link & emails
const sendRes = await request({ method: 'POST', path: `/api/invoices/${invoiceId}/send` });
sendRes.status === 200 ? pass('Invoice sent successfully') : fail('Send failed', sendRes.body);

const sentInvoice = sendRes.body.invoice;
sentInvoice.razorpayLinkId ? pass(`razorpayLinkId stored: ${sentInvoice.razorpayLinkId}`) : fail('Missing razorpayLinkId', sentInvoice);
sentInvoice.paymentLinkUrl ? pass(`paymentLinkUrl stored: ${sentInvoice.paymentLinkUrl}`) : fail('Missing paymentLinkUrl', sentInvoice);
sentInvoice.status === 'sent' ? pass('Status is sent') : fail('Status wrong', sentInvoice.status);

// ── 3. Razorpay Webhook Simulation ────────────────────────────────────────────
section('Razorpay: Webhook Verification & Idempotent Mark Paid');
const webhookPayload = {
  event: 'payment_link.paid',
  payload: {
    payment_link: {
      entity: {
        id: sentInvoice.razorpayLinkId,
        notes: {
          invoiceId: sentInvoice._id,
          publicId: sentInvoice.publicId,
        },
      },
    },
  },
};

const hookRes1 = await request({ method: 'POST', path: '/api/webhooks/razorpay' }, webhookPayload);
hookRes1.status === 200 && hookRes1.body.status === 'ok' ? pass('Webhook handled (200 OK)') : fail('Webhook failed', hookRes1);

const paidCheck1 = await Invoice.findById(sentInvoice._id);
paidCheck1.status === 'paid' ? pass('Invoice marked PAID in database') : fail('Status not paid', paidCheck1.status);
paidCheck1.paidAt ? pass(`paidAt recorded: ${paidCheck1.paidAt}`) : fail('paidAt missing', paidCheck1);

// Idempotent second call
const hookRes2 = await request({ method: 'POST', path: '/api/webhooks/razorpay' }, webhookPayload);
hookRes2.status === 200 ? pass('Idempotent second webhook call acknowledged cleanly') : fail('Second call failed', hookRes2);

// ── 4. AI Reminder Generation & Tones ─────────────────────────────────────────
section('Gemini AI: Reminder Tone Progression');
const stages = ['pre-due', 'due', 'overdue-1', 'overdue-2'];
for (const stage of stages) {
  const result = await generateAIReminderText({
    type: stage,
    clientName: 'Zenith Labs',
    amountPaise: 5310000,
    invoiceNumber: sentInvoice.invoiceNumber,
    daysLate: stage.includes('overdue') ? 7 : 0,
    freelancerName: 'Dev Freelancer',
    payUrl: sentInvoice.paymentLinkUrl,
  });

  result.subject && result.body
    ? pass(`Generated ${stage} reminder text (Subject: "${result.subject.slice(0, 45)}...")`)
    : fail(`Failed to generate ${stage} text`, result);
}

// ── 5. Reminder Logic: Stages & Transitions ──────────────────────────────────
section('Reminder Engine: Stage Detection');
const today = new Date();
const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
const dueToday = new Date();
const late3Days = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
const late8Days = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

determineReminderType(in3Days)?.type === 'pre-due' ? pass('+3 days detected as pre-due') : fail('pre-due mismatch', determineReminderType(in3Days));
determineReminderType(dueToday)?.type === 'due' ? pass('0 days detected as due today') : fail('due mismatch', determineReminderType(dueToday));
determineReminderType(late3Days)?.type === 'overdue-1' ? pass('-3 days detected as overdue-1') : fail('overdue-1 mismatch', determineReminderType(late3Days));
determineReminderType(late8Days)?.type === 'overdue-2' ? pass('-8 days detected as overdue-2') : fail('overdue-2 mismatch', determineReminderType(late8Days));

// ── 6. POST /api/reminders/run & History ──────────────────────────────────────
section('POST /api/reminders/run & History');
// Create an unpaid invoice that is due today
const localTodayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const invDueToday = await request({ method: 'POST', path: '/api/invoices' }, {
  clientId,
  issueDate: '2026-10-15',
  dueDate: localTodayStr,
  items: [{ description: 'Backend API Audit', qty: 1, rate: 3000000, gstPercent: 18 }],
});
// Send it to make status 'sent'
await request({ method: 'POST', path: `/api/invoices/${invDueToday.body.invoice._id}/send` });

// Run reminders engine
const runRes = await request({ method: 'POST', path: '/api/reminders/run' });
runRes.status === 200 && runRes.body.success ? pass('POST /api/reminders/run succeeded') : fail('Reminders run failed', runRes.body);
runRes.body.stats.reminded >= 1 ? pass(`Sent ${runRes.body.stats.reminded} automated reminders`) : fail('No reminders sent', runRes.body);

// Check reminder history for this invoice
const histRes = await request({ method: 'GET', path: `/api/reminders/invoices/${invDueToday.body.invoice._id}` });
histRes.status === 200 && histRes.body.reminders?.length >= 1
  ? pass(`Fetched reminder history (${histRes.body.reminders.length} log entry found)`)
  : fail('History fetch failed', histRes.body);

// Duplicate check: running again should skip already reminded stage
const runRes2 = await request({ method: 'POST', path: '/api/reminders/run' });
runRes2.body.stats.reminded === 0 ? pass('Skipped already reminded stage (idempotent)') : fail('Duplicate reminder was sent', runRes2.body);

// ── done ──────────────────────────────────────────────────────────────────────
server.close();
await mongoose.disconnect();
await mongod.stop();
console.log(`\n${process.exitCode === 1 ? '❌ Some tests FAILED' : '✅ All Phase 5 tests PASSED'}\n`);
