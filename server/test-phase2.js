/**
 * Phase 2 smoke test — clients, invoices, dashboard stats
 * Run: node test-phase2.js
 */
import 'dotenv/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import http from 'http';

process.env.JWT_SECRET = 'test_secret';
process.env.JWT_EXPIRES_IN = '1h';

import { errorHandler } from './src/middleware/errorHandler.js';
import authRoutes from './src/routes/auth.js';
import clientRoutes from './src/routes/clients.js';
import invoiceRoutes from './src/routes/invoices.js';
import dashboardRoutes from './src/routes/dashboard.js';

// ── helpers ──────────────────────────────────────────────────────────────────
let cookieJar = '';

const request = (options, body) =>
  new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5098,
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
app.use('/api/dashboard', dashboardRoutes);
app.use(errorHandler);

const server = app.listen(5098);
console.log('\n🧪 ChasePay Phase 2 — Smoke Tests\n');

// ── seed: register + login ────────────────────────────────────────────────────
await request({ method: 'POST', path: '/api/auth/register' }, {
  name: 'Priya Dev', email: 'priya@example.com', password: 'test123',
});

// ─── CLIENTS ─────────────────────────────────────────────────────────────────
section('POST /api/clients');
const c1 = await request({ method: 'POST', path: '/api/clients' }, {
  name: 'Acme Corp', email: 'acme@corp.com', phone: '9999999999',
  address: 'Mumbai', gstin: '27AAPFU0939F1ZV',
});
c1.status === 201 && c1.body.success ? pass('Creates client (201)') : fail('Create client', c1.body);
const clientId = c1.body.client?._id;

section('GET /api/clients');
const cl = await request({ method: 'GET', path: '/api/clients' });
cl.status === 200 && cl.body.clients.length === 1 ? pass('Lists 1 client') : fail('List clients', cl.body);

section('GET /api/clients/:id');
const cg = await request({ method: 'GET', path: `/api/clients/${clientId}` });
cg.status === 200 && cg.body.client.name === 'Acme Corp' ? pass('Fetches by id') : fail('Get client', cg.body);

section('PUT /api/clients/:id');
const cu = await request({ method: 'PUT', path: `/api/clients/${clientId}` }, {
  name: 'Acme Corp Ltd', email: 'acme@corp.com', phone: '8888888888', address: 'Delhi', gstin: '',
});
cu.status === 200 && cu.body.client.name === 'Acme Corp Ltd' ? pass('Updates client') : fail('Update client', cu.body);

// wrong client (other user's id)
const wrongClient = await request({ method: 'GET', path: `/api/clients/000000000000000000000001` });
wrongClient.status === 404 ? pass('404 for non-existent client') : fail('Should be 404', wrongClient.status);

// validation
const badClient = await request({ method: 'POST', path: '/api/clients' }, { name: '', email: 'bad' });
badClient.status === 422 ? pass('422 for invalid client input') : fail('Should be 422', badClient.status);

// ─── INVOICES ────────────────────────────────────────────────────────────────
section('POST /api/invoices');
const inv = await request({ method: 'POST', path: '/api/invoices' }, {
  clientId,
  issueDate: '2024-01-15',
  dueDate: '2024-01-30',
  items: [
    { description: 'Web design', qty: 1, rate: 5000000, gstPercent: 18 },  // ₹50,000 in paise
    { description: 'Logo', qty: 2, rate: 1000000, gstPercent: 18 },        // ₹10,000 each
  ],
  discount: 500000, // ₹5,000 discount in paise
  notes: 'Due in 15 days',
});
inv.status === 201 && inv.body.success ? pass('Creates invoice (201)') : fail('Create invoice', inv.body);

const invoice = inv.body.invoice;
// verify server-side totals
// item1: 1 * 5000000 = 5000000; gst = 900000
// item2: 2 * 1000000 = 2000000; gst = 360000
// subtotal = 7000000; taxTotal = 1260000; discount = 500000
// total = 7000000 - 500000 + 1260000 = 7760000
invoice?.subtotal === 7000000 ? pass(`Subtotal correct: ${invoice.subtotal} paise`) : fail('Subtotal wrong', invoice?.subtotal);
invoice?.taxTotal === 1260000 ? pass(`Tax total correct: ${invoice.taxTotal} paise`) : fail('Tax total wrong', invoice?.taxTotal);
invoice?.total === 7760000 ? pass(`Total correct: ${invoice.total} paise (₹${invoice.total/100})`) : fail('Total wrong', invoice?.total);
invoice?.invoiceNumber?.startsWith('INV-') ? pass(`Invoice number: ${invoice.invoiceNumber}`) : fail('Bad invoice number', invoice?.invoiceNumber);
invoice?.status === 'draft' ? pass('Status is draft') : fail('Status wrong', invoice?.status);
invoice?.clientId?.name ? pass('Client populated') : fail('Client not populated', invoice);

const invoiceId = invoice?._id;

section('GET /api/invoices');
const il = await request({ method: 'GET', path: '/api/invoices' });
il.status === 200 && il.body.invoices.length === 1 ? pass('Lists 1 invoice') : fail('List invoices', il.body);

section('GET /api/invoices?status=draft');
const ifd = await request({ method: 'GET', path: '/api/invoices?status=draft' });
ifd.body.invoices.length === 1 ? pass('Status filter works (draft)') : fail('Filter failed', ifd.body);

const ifo = await request({ method: 'GET', path: '/api/invoices?status=paid' });
ifo.body.invoices.length === 0 ? pass('Status filter works (paid = 0 results)') : fail('Filter paid wrong', ifo.body);

section('GET /api/invoices/:id');
const ig = await request({ method: 'GET', path: `/api/invoices/${invoiceId}` });
ig.status === 200 ? pass('Fetches invoice by id') : fail('Get invoice', ig.body);

section('PUT /api/invoices/:id');
const iu = await request({ method: 'PUT', path: `/api/invoices/${invoiceId}` }, {
  notes: 'Updated notes',
  discount: 0,
  items: [{ description: 'Revised design', qty: 1, rate: 6000000, gstPercent: 18 }],
});
iu.status === 200 ? pass('Updates invoice') : fail('Update invoice', iu.body);
// recomputed: subtotal=6000000, gst=1080000, total=7080000
iu.body.invoice?.total === 7080000 ? pass('Totals recomputed on update') : fail('Recompute wrong', iu.body.invoice?.total);

section('Invoice number sequence');
const inv2 = await request({ method: 'POST', path: '/api/invoices' }, {
  clientId, issueDate: '2024-02-01', dueDate: '2024-02-15',
  items: [{ description: 'SEO', qty: 1, rate: 2000000, gstPercent: 18 }],
});
const year = new Date().getFullYear();
inv2.body.invoice?.invoiceNumber === `INV-${year}-0002` ? pass(`Second invoice: ${inv2.body.invoice.invoiceNumber}`) : fail('Sequence wrong', inv2.body.invoice?.invoiceNumber);

section('DELETE /api/invoices/:id (draft only)');
const del = await request({ method: 'DELETE', path: `/api/invoices/${invoiceId}` });
del.status === 200 ? pass('Deletes draft invoice') : fail('Delete failed', del.body);

section('DELETE /api/clients/:id');
const cd = await request({ method: 'DELETE', path: `/api/clients/${clientId}` });
cd.status === 200 ? pass('Deletes client') : fail('Delete client', cd.body);

section('GET /api/dashboard/stats');
// create some invoices first for meaningful stats
await request({ method: 'POST', path: '/api/clients' }, { name: 'Test Co', email: 't@t.com', phone: '', address: '', gstin: '' });
const cl2 = await request({ method: 'GET', path: '/api/clients' });
const cid2 = cl2.body.clients[0]?._id;
await request({ method: 'POST', path: '/api/invoices' }, {
  clientId: cid2, issueDate: '2024-01-01', dueDate: '2024-01-31',
  items: [{ description: 'Dev work', qty: 1, rate: 10000000, gstPercent: 18 }],
});
const stats = await request({ method: 'GET', path: '/api/dashboard/stats' });
stats.status === 200 && stats.body.stats ? pass('Dashboard stats returns 200') : fail('Stats failed', stats.body);
typeof stats.body.stats.totalOutstanding === 'number' ? pass('totalOutstanding is a number') : fail('totalOutstanding missing', stats.body.stats);
Array.isArray(stats.body.recentInvoices) ? pass('recentInvoices is an array') : fail('recentInvoices missing', stats.body);

// ── done ──────────────────────────────────────────────────────────────────────
server.close();
await mongoose.disconnect();
await mongod.stop();
console.log(`\n${process.exitCode === 1 ? '❌ Some tests FAILED' : '✅ All Phase 2 tests PASSED'}\n`);
