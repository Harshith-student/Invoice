import { Router } from 'express';
import {
  getPublicInvoice,
  processPublicPayment,
  simulatePublicPay,
} from '../controllers/publicController.js';

const router = Router();

// Public routes (no auth required)
router.get('/invoices/:publicId', getPublicInvoice);
router.post('/invoices/:publicId/pay', processPublicPayment);
router.post('/invoices/:publicId/simulate-pay', simulatePublicPay);

export default router;
