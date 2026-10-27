/**
 * Phase 1 smoke test — uses mongodb-memory-server so no local MongoDB needed.
 * Run: node test-phase1.js
 */
import 'dotenv/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import http from 'http';

// ── patch env so JWT works ──────────────────────────────────────────────────
process.env.JWT_SECRET = 'test_secret_for_smoke_test';
process.env.JWT_EXPIRES_IN = '1h';

import { errorHandler } from './src/middleware/errorHandler.js';
import authRoutes from './src/routes/auth.js';

// ── helpers ─────────────────────────────────────────────────────────────────
let cookieJar = '';

const request = (options, body) =>
  new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5099,
        headers: {
          'Content-Type': 'application/json',
          ...(cookieJar ? { Cookie: cookieJar } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
        ...options,
      },
      (res) => {
        // capture Set-Cookie
        const sc = res.headers['set-cookie'];
        if (sc) cookieJar = sc.map((c) => c.split(';')[0]).join('; ');

        let raw = '';
        res.on('data', (d) => (raw += d));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });

const pass = (label) => console.log(`  ✅ ${label}`);
const fail = (label, detail) => { console.error(`  ❌ ${label}:`, detail); process.exitCode = 1; };
const section = (title) => console.log(`\n─── ${title} ───`);

// ── main ─────────────────────────────────────────────────────────────────────
const mongod = await MongoMemoryServer.create({ instance: { startupTimeout: 60000 } });
await mongoose.connect(mongod.getUri());

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

const server = app.listen(5099);
console.log('\n🧪 ChasePay Phase 1 — Smoke Tests\n');

// ── 1. Register ───────────────────────────────────────────────────────────────
section('POST /api/auth/register');
const reg = await request({ method: 'POST', path: '/api/auth/register' }, {
  name: 'Arjun Dev', email: 'arjun@example.com', password: 'test123',
});
reg.status === 201 && reg.body.success ? pass('Returns 201 with user object') : fail('Register', reg);
reg.body.user?.email === 'arjun@example.com' ? pass('Email matches') : fail('Email mismatch', reg.body);
!reg.body.user?.passwordHash ? pass('passwordHash not exposed') : fail('passwordHash EXPOSED!', reg.body);
cookieJar ? pass('Set-Cookie header received') : fail('No cookie set', '');

// ── 2. Duplicate register ────────────────────────────────────────────────────
section('POST /api/auth/register (duplicate)');
const dup = await request({ method: 'POST', path: '/api/auth/register' }, {
  name: 'Arjun Dev', email: 'arjun@example.com', password: 'test123',
});
dup.status === 409 ? pass('Returns 409 for duplicate email') : fail('Should be 409', dup.status);

// ── 3. Logout ────────────────────────────────────────────────────────────────
section('POST /api/auth/logout');
const lo = await request({ method: 'POST', path: '/api/auth/logout' });
lo.status === 200 && lo.body.success ? pass('Returns 200') : fail('Logout failed', lo);
cookieJar = ''; // clear local jar to simulate logged-out client

// ── 4. /me without auth ──────────────────────────────────────────────────────
section('GET /api/auth/me (unauthenticated)');
const meAnon = await request({ method: 'GET', path: '/api/auth/me' });
meAnon.status === 401 ? pass('Returns 401 when no cookie') : fail('Should be 401', meAnon.status);

// ── 5. Login ─────────────────────────────────────────────────────────────────
section('POST /api/auth/login');
const login = await request({ method: 'POST', path: '/api/auth/login' }, {
  email: 'arjun@example.com', password: 'test123',
});
login.status === 200 && login.body.success ? pass('Returns 200') : fail('Login failed', login);
cookieJar ? pass('Cookie set after login') : fail('No cookie after login', '');

// Wrong password
const badLogin = await request({ method: 'POST', path: '/api/auth/login' }, {
  email: 'arjun@example.com', password: 'wrongpass',
});
badLogin.status === 401 ? pass('Returns 401 for wrong password') : fail('Should be 401', badLogin.status);

// ── 6. /me with auth ─────────────────────────────────────────────────────────
// Re-login to get fresh cookie
const relogin = await request({ method: 'POST', path: '/api/auth/login' }, {
  email: 'arjun@example.com', password: 'test123',
});
section('GET /api/auth/me (authenticated)');
const me = await request({ method: 'GET', path: '/api/auth/me' });
me.status === 200 && me.body.user?.email === 'arjun@example.com'
  ? pass('Returns current user') : fail('/me failed', me);

// ── 7. PUT /profile ───────────────────────────────────────────────────────────
section('PUT /api/auth/profile');
const prof = await request({ method: 'PUT', path: '/api/auth/profile' }, {
  name: 'Arjun Kumar',
  business: { name: 'AK Designs', gstin: '27AAPFU0939F1ZV', upiId: 'arjun@upi' },
});
prof.status === 200 ? pass('Returns 200') : fail('Profile update failed', prof);
prof.body.user?.business?.gstin === '27AAPFU0939F1ZV' ? pass('GSTIN saved') : fail('GSTIN not saved', prof.body);
prof.body.user?.name === 'Arjun Kumar' ? pass('Name updated') : fail('Name not updated', prof.body);

// ── 8. Zod validation ─────────────────────────────────────────────────────────
section('Zod validation (bad input)');
const bad = await request({ method: 'POST', path: '/api/auth/register' }, {
  name: 'X', email: 'not-an-email', password: '123',
});
bad.status === 422 ? pass('Returns 422 for invalid input') : fail('Should be 422', bad.status);

// ── done ──────────────────────────────────────────────────────────────────────
server.close();
await mongoose.disconnect();
await mongod.stop();
console.log(`\n${process.exitCode === 1 ? '❌ Some tests FAILED' : '✅ All Phase 1 tests PASSED'}\n`);
