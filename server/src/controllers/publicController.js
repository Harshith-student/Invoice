import Invoice from '../models/Invoice.js';
import { createError } from '../middleware/errorHandler.js';
import { createPaymentLink } from '../services/razorpayService.js';

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
