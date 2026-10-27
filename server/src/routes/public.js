import { Router } from 'express';
import { getPublicInvoice } from '../controllers/publicController.js';

const router = Router();

// No auth required for public client payment page
router.get('/invoices/:publicId', getPublicInvoice);

export default router;
