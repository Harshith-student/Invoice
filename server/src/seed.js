import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import { connectDB } from './config/db.js';
import User from './models/User.js';
import Client from './models/Client.js';
import Invoice from './models/Invoice.js';
import ReminderLog from './models/ReminderLog.js';

const computeTotals = (items, discount = 0) => {
  let subtotal = 0;
  let taxTotal = 0;

  const computed = items.map((it) => {
    const amount = Math.round(it.qty * it.rate);
    const gstAmount = Math.round((amount * it.gstPercent) / 100);
    subtotal += amount;
    taxTotal += gstAmount;
    return { ...it, amount, gstAmount };
  });

  const total = subtotal - discount + taxTotal;
  return { items: computed, subtotal, taxTotal, total };
};

const seedDatabase = async () => {
  console.log('🌱 Starting ChasePay demo database seed...');
  await connectDB();

  const demoEmail = 'demo@chasepay.in';

  // 1. Clean existing demo data
  const existingUser = await User.findOne({ email: demoEmail });
  if (existingUser) {
    console.log('🧹 Clearing prior demo user records...');
    await Invoice.deleteMany({ userId: existingUser._id });
    await Client.deleteMany({ userId: existingUser._id });
    await ReminderLog.deleteMany({ userId: existingUser._id });
    await User.deleteOne({ _id: existingUser._id });
  }

  // 2. Create Demo Freelancer User
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await User.create({
    name: 'Aditya Sharma',
    email: demoEmail,
    passwordHash,
    business: {
      name: 'Aditya Media & Code Labs',
      address: '702, Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
      gstin: '29AAPFU9999F1ZV',
      upiId: 'aditya@okhdfcbank',
    },
  });
  console.log(`👤 Created Demo User: ${user.name} (${user.email})`);

  // 3. Create 4 Diverse Clients
  const clientsData = [
    {
      userId: user._id,
      name: 'RazorFlow Technologies Pvt Ltd',
      email: 'accounts@razorflow.io',
      phone: '+91 98801 23456',
      address: 'Prestige Tech Park, Marathahalli, Bengaluru 560103',
      gstin: '29AABCR8888M1Z2',
    },
    {
      userId: user._id,
      name: 'Kavita Lifestyle Brands',
      email: 'finance@kavitalifestyle.com',
      phone: '+91 98200 87654',
      address: 'B-302, One BKC, Bandra Kurla Complex, Mumbai 400051',
      gstin: '27AAPFK5555L1Z8',
    },
    {
      userId: user._id,
      name: 'Nexus HyperScale Studio',
      email: 'billing@nexushyperscale.com',
      phone: '+91 90000 11223',
      address: 'HITEC City, Madhapur, Hyderabad, Telangana 500081',
      gstin: '36AAPFN3333P1Z9',
    },
    {
      userId: user._id,
      name: 'BrightFuture EdTech Foundation',
      email: 'payments@brightfuture.edu',
      phone: '+91 99112 34567',
      address: 'Connaught Place, New Delhi 110001',
      gstin: '', // Non-GST client
    },
  ];

  const clients = await Client.insertMany(clientsData);
  console.log(`🏢 Created ${clients.length} Clients with GSTINs`);

  // Helper date generators relative to today
  const now = new Date();
  const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const daysAhead = (n) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  // 4. Create 8 Invoices in Mixed Statuses
  const rawInvoices = [
    // 1. Paid - Large project (last month)
    {
      clientId: clients[0]._id,
      invoiceNumber: 'INV-2026-0001',
      issueDate: daysAgo(35),
      dueDate: daysAgo(20),
      status: 'paid',
      paidAt: daysAgo(18),
      items: [
        { description: 'Mobile App Architecture & Design Sprint', qty: 1, rate: 5000000, gstPercent: 18 }, // ₹50,000
        { description: 'React Native Cross-Platform Implementation', qty: 1, rate: 2500000, gstPercent: 18 }, // ₹25,000
      ],
      discount: 0,
      notes: 'Payment received via Razorpay UPI. Thank you for your business!',
    },
    // 2. Paid - Retainer (earlier this month)
    {
      clientId: clients[1]._id,
      invoiceNumber: 'INV-2026-0002',
      issueDate: daysAgo(22),
      dueDate: daysAgo(8),
      status: 'paid',
      paidAt: daysAgo(7),
      items: [
        { description: 'Monthly UI/UX Retainer - October 2026', qty: 1, rate: 4000000, gstPercent: 18 }, // ₹40,000
      ],
      discount: 0,
      notes: 'Monthly deliverables completed and signed off.',
    },
    // 3. Viewed - Due in 3 days (pre-due stage)
    {
      clientId: clients[2]._id,
      invoiceNumber: 'INV-2026-0003',
      issueDate: daysAgo(11),
      dueDate: daysAhead(3), // Exact match for pre-due
      status: 'viewed',
      items: [
        { description: 'Cloud Infrastructure & Kubernetes Setup', qty: 1, rate: 5500000, gstPercent: 18 }, // ₹55,000
      ],
      discount: 0,
      notes: 'Upcoming payment due in 3 days. UPI ID: aditya@okhdfcbank',
    },
    // 4. Sent - Due Today (due stage)
    {
      clientId: clients[0]._id,
      invoiceNumber: 'INV-2026-0004',
      issueDate: daysAgo(14),
      dueDate: new Date(), // Due today
      status: 'sent',
      items: [
        { description: 'Fullstack MERN Integration & Payment Gateway', qty: 1, rate: 10000000, gstPercent: 18 }, // ₹1,00,000
      ],
      discount: 0,
      notes: 'Milestone 2 deliverable. Due today.',
    },
    // 5. Overdue - 3 Days Overdue (overdue-1 stage)
    {
      clientId: clients[1]._id,
      invoiceNumber: 'INV-2026-0005',
      issueDate: daysAgo(17),
      dueDate: daysAgo(3), // 3 days late
      status: 'overdue',
      items: [
        { description: 'Performance Optimization & SEO Audit', qty: 1, rate: 3000000, gstPercent: 18 }, // ₹30,000
      ],
      discount: 0,
      notes: 'First payment reminder dispatched.',
    },
    // 6. Overdue - 8 Days Overdue (overdue-2 stage)
    {
      clientId: clients[3]._id,
      invoiceNumber: 'INV-2026-0006',
      issueDate: daysAgo(30),
      dueDate: daysAgo(8), // 8 days late
      status: 'overdue',
      items: [
        { description: 'EdTech Learning Management Dashboard', qty: 1, rate: 12000000, gstPercent: 18 }, // ₹1,20,000
      ],
      discount: 0,
      notes: 'Urgent notice sent: 8 days past due.',
    },
    // 7. Draft - New project proposal
    {
      clientId: clients[2]._id,
      invoiceNumber: 'INV-2026-0007',
      issueDate: daysAgo(2),
      dueDate: daysAhead(12),
      status: 'draft',
      items: [
        { description: 'Custom Analytics API Service', qty: 1, rate: 2500000, gstPercent: 18 }, // ₹25,000
      ],
      discount: 0,
      notes: 'Draft bill awaiting final scope confirmation.',
    },
    // 8. Draft - Security audit
    {
      clientId: clients[3]._id,
      invoiceNumber: 'INV-2026-0008',
      issueDate: daysAgo(1),
      dueDate: daysAhead(14),
      status: 'draft',
      items: [
        { description: 'Security Hardening & Penetration Testing', qty: 1, rate: 5000000, gstPercent: 18 }, // ₹50,000
      ],
      discount: 0,
      notes: 'Deliverable scheduled for completion next week.',
    },
  ];

  for (const invData of rawInvoices) {
    const { items: computedItems, subtotal, taxTotal, total } = computeTotals(
      invData.items,
      invData.discount
    );

    const created = await Invoice.create({
      userId: user._id,
      clientId: invData.clientId,
      invoiceNumber: invData.invoiceNumber,
      issueDate: invData.issueDate,
      dueDate: invData.dueDate,
      items: computedItems,
      subtotal,
      discount: invData.discount,
      taxTotal,
      total,
      status: invData.status,
      paidAt: invData.paidAt,
      notes: invData.notes,
      razorpayLinkId: `plink_seed_${invData.invoiceNumber.toLowerCase()}`,
      paymentLinkUrl: `${clientUrl}/i/demo-${invData.invoiceNumber.toLowerCase()}?pay=true`,
    });

    // If invoice is overdue, add a sample ReminderLog entry so reminder history shows up!
    if (invData.status === 'overdue') {
      await ReminderLog.create({
        invoiceId: created._id,
        userId: user._id,
        type: invData.dueDate < daysAgo(5) ? 'overdue-2' : 'overdue-1',
        subject: `Follow-up on Overdue Invoice ${created.invoiceNumber}`,
        body: `Dear Client,\n\nThis is an automated reminder regarding invoice ${created.invoiceNumber} for Rs. ${(created.total/100).toLocaleString('en-IN')}, which is now past due.\n\nPlease complete payment using the link: ${created.paymentLinkUrl}\n\nBest regards,\nAditya Sharma`,
        sentAt: daysAgo(1),
      });
    }
  }

  console.log(`📄 Created 8 Invoices across all statuses (paid, viewed, sent, overdue, draft)`);
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('🎉 SEEDING COMPLETE! You can log in with:');
  console.log(`   Email:    ${demoEmail}`);
  console.log(`   Password: password123`);
  console.log('══════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
};

seedDatabase().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
