import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const itemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    qty: { type: Number, required: true, min: 0 },        // decimal units
    rate: { type: Number, required: true, min: 0 },       // paise
    gstPercent: { type: Number, required: true, default: 18 }, // 0, 5, 12, 18, 28
    // Computed server-side and stored
    amount: { type: Number },   // qty * rate in paise
    gstAmount: { type: Number }, // amount * gstPercent / 100 in paise
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    invoiceNumber: { type: String, required: true }, // INV-2024-0001
    publicId: { type: String, default: () => nanoid(10), unique: true },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    items: [itemSchema],
    // All amounts in paise (integer)
    subtotal: { type: Number, default: 0 },   // sum of item amounts before GST
    discount: { type: Number, default: 0 },   // paise
    taxTotal: { type: Number, default: 0 },   // sum of all GST amounts
    total: { type: Number, default: 0 },      // subtotal - discount + taxTotal
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'paid', 'overdue'],
      default: 'draft',
    },
    razorpayLinkId: { type: String, default: '' },
    paymentLinkUrl: { type: String, default: '' },
    paidAt: { type: Date },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Unique invoice number per user
invoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });
// Fast query for cron: find sent/viewed invoices by due date
invoiceSchema.index({ status: 1, dueDate: 1 });

export default mongoose.model('Invoice', invoiceSchema);
