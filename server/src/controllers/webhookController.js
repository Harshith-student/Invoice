import Invoice from '../models/Invoice.js';
import { verifyWebhookSignature } from '../services/razorpayService.js';

export const handleRazorpayWebhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  // Signature validation if secret is configured
  if (webhookSecret && webhookSecret.trim() !== '') {
    const isValid = verifyWebhookSignature(req.body, signature, webhookSecret);
    if (!isValid) {
      console.warn('⚠️ Razorpay webhook signature verification failed');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }
  }

  const event = req.body?.event;
  console.log(`🔔 Razorpay webhook received: ${event}`);

  // Handled events: payment_link.paid, payment.captured, order.paid
  if (event === 'payment_link.paid' || event === 'payment.captured' || event === 'order.paid') {
    const payload = req.body?.payload;
    const paymentLink = payload?.payment_link?.entity;
    const payment = payload?.payment?.entity;

    // Identify invoice by notes or razorpay link ID
    const invoiceId =
      paymentLink?.notes?.invoiceId ||
      payment?.notes?.invoiceId;

    const publicId =
      paymentLink?.notes?.publicId ||
      payment?.notes?.publicId;

    const razorpayLinkId = paymentLink?.id;

    let invoice = null;

    if (invoiceId) {
      invoice = await Invoice.findById(invoiceId);
    } else if (publicId) {
      invoice = await Invoice.findOne({ publicId });
    } else if (razorpayLinkId) {
      invoice = await Invoice.findOne({ razorpayLinkId });
    }

    if (invoice) {
      // Idempotent: only update if not already marked paid
      if (invoice.status !== 'paid') {
        invoice.status = 'paid';
        invoice.paidAt = new Date();
        await invoice.save();
        console.log(`✅ Invoice ${invoice.invoiceNumber} marked PAID via Razorpay webhook.`);
      } else {
        console.log(`ℹ️ Invoice ${invoice.invoiceNumber} already marked paid (idempotent skip).`);
      }
    } else {
      console.warn('⚠️ Webhook received but no matching invoice found for payment link payload');
    }
  }

  // Always acknowledge receipt to Razorpay
  return res.status(200).json({ status: 'ok' });
};
