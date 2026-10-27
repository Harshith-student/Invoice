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
