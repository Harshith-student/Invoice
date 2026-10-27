import { Router } from 'express';
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoicePDF,
  sendInvoice,
  invoiceCreateSchema,
  invoiceUpdateSchema,
} from '../controllers/invoiceController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(protect);

router.get('/', getInvoices);
router.get('/:id', getInvoice);
router.get('/:id/pdf', getInvoicePDF);
router.post('/:id/send', sendInvoice);
router.post('/', validate(invoiceCreateSchema), createInvoice);
router.put('/:id', validate(invoiceUpdateSchema), updateInvoice);
router.delete('/:id', deleteInvoice);

export default router;
