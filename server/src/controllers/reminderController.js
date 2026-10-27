import { runReminders } from '../services/reminderService.js';
import ReminderLog from '../models/ReminderLog.js';
import Invoice from '../models/Invoice.js';
import { createError } from '../middleware/errorHandler.js';

export const triggerManualReminders = async (req, res, next) => {
  try {
    const stats = await runReminders({ userId: req.user._id });
    res.json({
      success: true,
      message: `Processed ${stats.checked} invoices: ${stats.reminded} reminders sent, ${stats.markedOverdue} marked overdue.`,
      stats,
    });
  } catch (err) {
    next(err);
  }
};

export const getInvoiceReminders = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id });
    if (!invoice) throw createError('Invoice not found', 404);

    const reminders = await ReminderLog.find({ invoiceId: req.params.id })
      .sort({ sentAt: -1 });

    res.json({
      success: true,
      reminders,
    });
  } catch (err) {
    next(err);
  }
};
