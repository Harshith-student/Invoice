import { z } from 'zod';
import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import { createError } from '../middleware/errorHandler.js';
import { generateInvoicePDF } from '../services/pdfService.js';
import { sendInvoiceEmail } from '../services/emailService.js';
import { createPaymentLink } from '../services/razorpayService.js';

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const itemSchema = z.object({
  description: z.string().min(1, 'Item description required'),
  qty: z.number().positive('Qty must be positive'),
  rate: z.number().int().nonnegative('Rate must be non-negative integer (paise)'),
  gstPercent: z.number().refine((v) => [0, 5, 12, 18, 28].includes(v), {
    message: 'GST must be 0, 5, 12, 18, or 28',
  }),
});

export const invoiceCreateSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  items: z.array(itemSchema).min(1, 'At least one item required'),
  discount: z.number().int().nonnegative().optional().default(0),
  notes: z.string().optional().default(''),
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial();

// ─── Helper: compute totals (server-side only) ────────────────────────────────
const computeTotals = (items, discount = 0) => {
  let subtotal = 0;
  let taxTotal = 0;

  const computed = items.map((item) => {
    const amount = Math.round(item.qty * item.rate);           // paise
    const gstAmount = Math.round(amount * item.gstPercent / 100); // paise
    subtotal += amount;
    taxTotal += gstAmount;
    return { ...item, amount, gstAmount };
  });

  const total = subtotal - discount + taxTotal;
  return { items: computed, subtotal, taxTotal, total };
};

// ─── Auto-generate invoiceNumber: INV-YYYY-NNNN ──────────────────────────────
const generateInvoiceNumber = async (userId) => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Find the latest invoice number for this user in this year
  const latest = await Invoice.findOne(
    { userId, invoiceNumber: { $regex: `^${prefix}` } },
    { invoiceNumber: 1 },
    { sort: { invoiceNumber: -1 } }
  );

  let seq = 1;
  if (latest) {
    const parts = latest.invoiceNumber.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
};

// ─── Controllers ─────────────────────────────────────────────────────────────

export const getInvoices = async (req, res, next) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const invoices = await Invoice.find(filter)
      .populate('clientId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, invoices });
  } catch (err) {
    next(err);
  }
};

export const getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('clientId');
    if (!invoice) throw createError('Invoice not found', 404);
    res.json({ success: true, invoice });
  } catch (err) {
    next(err);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const { clientId, issueDate, dueDate, items, discount, notes } = req.body;

    // Verify client belongs to this user
    const client = await Client.findOne({ _id: clientId, userId: req.user._id });
    if (!client) throw createError('Client not found', 404);

    const invoiceNumber = await generateInvoiceNumber(req.user._id);
    const { items: computedItems, subtotal, taxTotal, total } = computeTotals(items, discount);

    const invoice = await Invoice.create({
      userId: req.user._id,
      clientId,
      invoiceNumber,
      issueDate,
      dueDate,
      items: computedItems,
      subtotal,
      discount,
      taxTotal,
      total,
      notes,
      status: 'draft',
    });

    const populated = await invoice.populate('clientId', 'name email');
    res.status(201).json({ success: true, invoice: populated });
  } catch (err) {
    next(err);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const existing = await Invoice.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existing) throw createError('Invoice not found', 404);

    // Only allow editing drafts (guard against editing sent/paid invoices accidentally)
    if (!['draft'].includes(existing.status) && req.body.items) {
      throw createError('Cannot edit line items of a non-draft invoice', 400);
    }

    const updates = { ...req.body };

    // Recompute totals if items or discount changed
    if (req.body.items) {
      const { items: computedItems, subtotal, taxTotal, total } = computeTotals(
        req.body.items,
        req.body.discount ?? existing.discount
      );
      updates.items = computedItems;
      updates.subtotal = subtotal;
      updates.taxTotal = taxTotal;
      updates.total = total;
    }

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: false, // we handle validation via zod
    }).populate('clientId', 'name email');

    res.json({ success: true, invoice });
  } catch (err) {
    next(err);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
      status: 'draft', // safety: only delete drafts
    });
    if (!invoice) throw createError('Invoice not found or cannot delete non-draft', 404);
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    next(err);
  }
};

export const getInvoicePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('clientId');
    if (!invoice) throw createError('Invoice not found', 404);

    const pdfBuffer = await generateInvoicePDF(invoice, req.user);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

export const sendInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('clientId');
    if (!invoice) throw createError('Invoice not found', 404);

    if (!invoice.clientId?.email) {
      throw createError('Client has no email address configured', 400);
    }

    // Generate or ensure Razorpay payment link
    if (!invoice.paymentLinkUrl) {
      const { razorpayLinkId, paymentLinkUrl } = await createPaymentLink(invoice, req.user);
      invoice.razorpayLinkId = razorpayLinkId;
      invoice.paymentLinkUrl = paymentLinkUrl;
    }

    const pdfBuffer = await generateInvoicePDF(invoice, req.user);
    await sendInvoiceEmail(invoice, req.user, pdfBuffer);

    // If invoice was draft, update status to sent
    if (invoice.status === 'draft') {
      invoice.status = 'sent';
    }
    await invoice.save();

    res.json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} emailed to ${invoice.clientId.email}`,
      invoice,
    });
  } catch (err) {
    next(err);
  }
};

