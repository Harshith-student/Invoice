import { Router } from 'express';
import { triggerManualReminders, getInvoiceReminders } from '../controllers/reminderController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.post('/run', triggerManualReminders);
router.get('/invoices/:id', getInvoiceReminders);

export default router;
