/**
 * Phase 4 smoke test — PDF generation, Email dispatch, Public Invoice View & Status transitions
 * Run: node test-phase4.js
 */
import 'dotenv/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import http from 'http';

process.env.JWT_SECRET = 'test_secret_phase4';
process.env.JWT_EXPIRES_IN = '1h';

import { errorHandler } from './src/middleware/errorHandler.js';
import authRoutes from './src/routes/auth.js';
import clientRoutes from './src/routes/clients.js';
import invoiceRoutes from './src/routes/invoices.js';
import dashboardRoutes from './src/routes/dashboard.js';
import publicRoutes from './src/routes/public.js';

// ── helpers ──────────────────────────────────────────────────────────────────
let cookieJar = '';

const request = (options, body, isBinary = false) =>
  new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5097,
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

        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          const rawBuffer = Buffer.concat(chunks);
          if (isBinary) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              buffer: rawBuffer,
            });
          } else {
            const rawStr = rawBuffer.toString('utf8');
            try {
              resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(rawStr) });
            } catch {
              resolve({ status: res.statusCode, headers: res.headers, body: rawStr });
            }
          }
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
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicRoutes);
app.use(errorHandler);

const server = app.listen(5097);
console.log('\n🧪 ChasePay Phase 4 — Smoke Tests\n');

// ── 1. Register User with Business details ────────────────────────────────────
section('Setup: Register & Profile');
await request({ method: 'POST', path: '/api/auth/register' }, {
  name: 'Karan Sharma', email: 'karan@freelance.in', password: 'password123',
});

await request({ method: 'PUT', path: '/api/auth/profile' }, {
  business: {
    name: 'Karan Creative Labs',
    address: '404 Innovate Hub, Indiranagar, Bengaluru',
    gstin: '29AABCK1234F1Z5',
    upiId: 'karan@upi',
  },
});
pass('User registered and business details configured');

// ── 2. Create Client ──────────────────────────────────────────────────────────
section('Setup: Create Client');
const clientRes = await request({ method: 'POST', path: '/api/clients' }, {
  name: 'Acme Digital Inc',
  email: 'finance@acmedigital.com',
  phone: '+91 9876543210',
  address: 'Level 5, Express Towers, Nariman Point, Mumbai',
  gstin: '27AAPFA9999K1Z1',
});
const clientId = clientRes.body.client?._id;
clientId ? pass('Client created with GSTIN') : fail('Failed to create client', clientRes.body);

// ── 3. Create Draft Invoice ───────────────────────────────────────────────────
section('Setup: Create Invoice');
const invRes = await request({ method: 'POST', path: '/api/invoices' }, {
  clientId,
  issueDate: '2026-10-27',
  dueDate: '2026-11-10',
  items: [
    { description: 'Fullstack MERN Development', qty: 1, rate: 8000000, gstPercent: 18 }, // ₹80,000
    { description: 'Cloud Architecture Setup', qty: 2, rate: 1500000, gstPercent: 18 },    // ₹30,000
  ],
  discount: 1000000, // ₹10,000 discount
  notes: 'Payment terms: Due within 14 days.\nUPI: karan@upi',
});
const invoice = invRes.body.invoice;
const invoiceId = invoice?._id;
const publicId = invoice?.publicId;

invoiceId ? pass(`Draft invoice created: ${invoice.invoiceNumber}`) : fail('Invoice creation failed', invRes.body);
invoice?.status === 'draft' ? pass('Initial status is draft') : fail('Status not draft', invoice?.status);

// ── 4. GET /api/invoices/:id/pdf ──────────────────────────────────────────────
section('GET /api/invoices/:id/pdf (PDFKit generation)');
const pdfRes = await request({ method: 'GET', path: `/api/invoices/${invoiceId}/pdf` }, null, true);
pdfRes.status === 200 ? pass('Returns 200 OK') : fail('PDF endpoint failed', pdfRes.status);
pdfRes.headers['content-type'] === 'application/pdf' ? pass('Content-Type is application/pdf') : fail('Bad content type', pdfRes.headers);

const isPdf = pdfRes.buffer.subarray(0, 5).toString('ascii') === '%PDF-';
isPdf ? pass(`Valid PDF binary generated (${pdfRes.buffer.length} bytes)`) : fail('Invalid PDF signature', pdfRes.buffer.subarray(0, 5));

// ── 5. POST /api/invoices/:id/send ────────────────────────────────────────────
section('POST /api/invoices/:id/send (Email with PDF attachment)');
const sendRes = await request({ method: 'POST', path: `/api/invoices/${invoiceId}/send` });
sendRes.status === 200 && sendRes.body.success ? pass('Returns 200 on email send') : fail('Send invoice failed', sendRes.body);
sendRes.body.invoice?.status === 'sent' ? pass('Status updated from draft to sent') : fail('Status did not transition to sent', sendRes.body);

// ── 6. GET /api/public/invoices/:publicId (Unauthenticated Client View) ───────
section('GET /api/public/invoices/:publicId (Public View & Auto-Transition to viewed)');
// Clear cookie jar to simulate unauthenticated client
cookieJar = '';

const publicRes = await request({ method: 'GET', path: `/api/public/invoices/${publicId}` });
publicRes.status === 200 && publicRes.body.success ? pass('Public invoice accessible without auth') : fail('Public access failed', publicRes);
publicRes.body.invoice?.clientId?.name === 'Acme Digital Inc' ? pass('Client populated on public invoice') : fail('Client missing', publicRes.body);
publicRes.body.invoice?.userId?.business?.name === 'Karan Creative Labs' ? pass('Freelancer business details populated') : fail('Business missing', publicRes.body);

// Check that status was automatically updated to 'viewed'
publicRes.body.invoice?.status === 'viewed'
  ? pass('Status automatically transitioned from "sent" to "viewed"')
  : fail('Status not transitioned to viewed', publicRes.body.invoice?.status);

// ── done ──────────────────────────────────────────────────────────────────────
server.close();
await mongoose.disconnect();
await mongod.stop();
console.log(`\n${process.exitCode === 1 ? '❌ Some tests FAILED' : '✅ All Phase 4 tests PASSED'}\n`);
