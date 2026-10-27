import Razorpay from 'razorpay';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (razorpayInstance) return razorpayInstance;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (key_id && key_secret && key_id.startsWith('rzp_')) {
    razorpayInstance = new Razorpay({ key_id, key_secret });
    return razorpayInstance;
  }
  return null;
};

/**
 * Creates a Razorpay Order (for embedded checkout modal).
 * Returns orderId + keyId for frontend to open Razorpay modal.
 */
export const createOrder = async (invoice) => {
  const razorpay = getRazorpayInstance();

  if (razorpay) {
    try {
      const order = await razorpay.orders.create({
        amount: invoice.total, // already in paise
        currency: 'INR',
        receipt: invoice.invoiceNumber,
        notes: {
          invoiceId: invoice._id.toString(),
          publicId: invoice.publicId,
          invoiceNumber: invoice.invoiceNumber,
        },
      });

      console.log(`💳 Razorpay Order created: ${order.id}`);
      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      };
    } catch (err) {
      console.warn('⚠️ Razorpay Order creation failed:', err.message);
      throw err;
    }
  }

  // Fallback: demo/test mode with a fake orderId
  console.log(`💳 [DEMO] Simulated Razorpay Order for ${invoice.invoiceNumber}`);
  return {
    orderId: `order_demo_${nanoid(8)}`,
    amount: invoice.total,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo',
    demo: true,
  };
};

/**
 * Verifies Razorpay payment signature after checkout success.
 * razorpay_order_id + razorpay_payment_id signed with secret.
 */
export const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  try {
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return expectedSignature === razorpaySignature;
  } catch {
    return false;
  }
};

/**
 * Creates a Razorpay Payment Link or returns a demo link if test keys are not configured.
 */
export const createPaymentLink = async (invoice, user) => {
  const client = invoice.clientId || {};
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const callbackUrl = `${clientUrl}/i/${invoice.publicId}`;

  const razorpay = getRazorpayInstance();

  if (razorpay) {
    try {
      const link = await razorpay.paymentLink.create({
        amount: invoice.total, // paise
        currency: 'INR',
        accept_partial: false,
        description: `Invoice ${invoice.invoiceNumber} payment`,
        customer: {
          name: client.name || 'Valued Client',
          email: client.email || undefined,
          contact: client.phone || undefined,
        },
        notify: {
          sms: Boolean(client.phone),
          email: Boolean(client.email),
        },
        reminder_enable: true,
        callback_url: callbackUrl,
        callback_method: 'get',
        notes: {
          invoiceId: invoice._id.toString(),
          publicId: invoice.publicId,
          invoiceNumber: invoice.invoiceNumber,
        },
      });

      console.log(`💳 Razorpay link created: ${link.short_url} (${link.id})`);
      return {
        razorpayLinkId: link.id,
        paymentLinkUrl: link.short_url,
      };
    } catch (err) {
      console.warn('⚠️ Razorpay API error, falling back to mock link:', err.message);
    }
  }

  // Graceful Mock for local dev & evaluation without live Razorpay keys
  const mockLinkId = `plink_test_${nanoid(8)}`;
  const mockPayUrl = `${callbackUrl}?pay=true`;
  console.log(`💳 [DEMO] Generated Payment Link: ${mockPayUrl}`);

  return {
    razorpayLinkId: mockLinkId,
    paymentLinkUrl: mockPayUrl,
  };
};

/**
 * Verifies Razorpay Webhook signature
 */
export const verifyWebhookSignature = (rawBody, signature, secret) => {
  if (!signature || !secret) return false;
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');
    return expectedSignature === signature;
  } catch {
    return false;
  }
};
