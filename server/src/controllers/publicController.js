import Invoice from '../models/Invoice.js';
import { createError } from '../middleware/errorHandler.js';
import { createPaymentLink, createOrder, verifyPaymentSignature } from '../services/razorpayService.js';

export const getPublicInvoice = async (req, res, next) => {
  try {
    const { publicId } = req.params;

    // Find invoice and populate client and freelancer user details
    const invoice = await Invoice.findOne({ publicId })
      .populate('clientId', 'name email phone address gstin')
      .populate('userId', 'name business');

    if (!invoice) {
      throw createError('Invoice not found or link has expired', 404);
    }

    // Auto-generate payment link on the fly if not already generated
    if (!invoice.paymentLinkUrl && invoice.status !== 'paid') {
      try {
        const linkData = await createPaymentLink(invoice, invoice.userId);
        invoice.razorpayLinkId = linkData.razorpayLinkId;
        invoice.paymentLinkUrl = linkData.paymentLinkUrl;
        await invoice.save();
      } catch (linkErr) {
        console.warn('⚠️ Could not auto-generate Razorpay link on view:', linkErr.message);
      }
    }

    // If invoice status was 'sent', automatically mark as 'viewed' (first client view!)
    if (invoice.status === 'sent') {
      invoice.status = 'viewed';
      await invoice.save();
    }

    res.json({
      success: true,
      invoice,
    });
  } catch (err) {
    next(err);
  }
};

export const processPublicPayment = async (req, res, next) => {
  try {
    const { publicId } = req.params;

    const invoice = await Invoice.findOne({ publicId })
      .populate('clientId', 'name email phone address gstin')
      .populate('userId', 'name business');

    if (!invoice) {
      throw createError('Invoice not found or link has expired', 404);
    }

    if (invoice.status === 'paid') {
      return res.json({ success: true, message: 'Invoice already paid', invoice });
    }

    // Ensure payment link exists
    if (!invoice.paymentLinkUrl) {
      const linkData = await createPaymentLink(invoice, invoice.userId);
      invoice.razorpayLinkId = linkData.razorpayLinkId;
      invoice.paymentLinkUrl = linkData.paymentLinkUrl;
      if (invoice.status === 'draft') invoice.status = 'sent';
      await invoice.save();
    }

    res.json({
      success: true,
      paymentLinkUrl: invoice.paymentLinkUrl,
      invoice,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /public/invoices/:publicId/create-order
 * Creates a Razorpay Order for embedded checkout modal
 */
export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { publicId } = req.params;

    const invoice = await Invoice.findOne({ publicId })
      .populate('clientId', 'name email phone address gstin')
      .populate('userId', 'name business');

    if (!invoice) {
      throw createError('Invoice not found', 404);
    }

    if (invoice.status === 'paid') {
      return res.json({ success: true, message: 'Invoice already paid', alreadyPaid: true, invoice });
    }

    const orderData = await createOrder(invoice);

    // Return order details + client info for pre-filling checkout
    res.json({
      success: true,
      ...orderData,
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        publicId: invoice.publicId,
      },
      prefill: {
        name: invoice.clientId?.name || '',
        email: invoice.clientId?.email || '',
        contact: invoice.clientId?.phone || '',
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /public/invoices/:publicId/verify-payment
 * Verifies Razorpay payment signature and marks invoice paid
 */
export const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { publicId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const invoice = await Invoice.findOne({ publicId });
    if (!invoice) {
      throw createError('Invoice not found', 404);
    }

    if (invoice.status === 'paid') {
      return res.json({ success: true, message: 'Already paid', invoice });
    }

    // Verify signature (skip in demo mode)
    const isDemo = razorpay_order_id?.startsWith('order_demo_');
    if (!isDemo) {
      const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (!isValid) {
        throw createError('Payment verification failed — invalid signature', 400);
      }
    }

    // Mark paid
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.razorpayPaymentId = razorpay_payment_id;
    invoice.razorpayOrderId = razorpay_order_id;
    await invoice.save();

    console.log(`✅ Invoice ${invoice.invoiceNumber} marked PAID via checkout verification.`);

    res.json({
      success: true,
      message: 'Payment verified and invoice marked paid!',
      invoice,
    });
  } catch (err) {
    next(err);
  }
};

export const simulatePublicPay = async (req, res, next) => {
  try {
    const { publicId } = req.params;

    const invoice = await Invoice.findOne({ publicId });
    if (!invoice) {
      throw createError('Invoice not found', 404);
    }

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice marked paid successfully!',
      invoice,
    });
  } catch (err) {
    next(err);
  }
};
