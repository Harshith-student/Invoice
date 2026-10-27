import { Router } from 'express';
import { handleRazorpayWebhook } from '../controllers/webhookController.js';

const router = Router();

// Razorpay webhook receiver
router.post('/razorpay', handleRazorpayWebhook);

export default router;
