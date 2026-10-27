import { Router } from 'express';
import {
  getPublicInvoice,
  processPublicPayment,
  simulatePublicPay,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../controllers/publicController.js';

const router = Router();

// Public routes (no auth required)
router.get('/invoices/:publicId', getPublicInvoice);
router.post('/invoices/:publicId/pay', processPublicPayment);
router.post('/invoices/:publicId/simulate-pay', simulatePublicPay);

// Razorpay embedded checkout routes
router.post('/invoices/:publicId/create-order', createRazorpayOrder);
router.post('/invoices/:publicId/verify-payment', verifyRazorpayPayment);

export default router;
