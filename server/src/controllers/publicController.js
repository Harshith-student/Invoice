import Invoice from '../models/Invoice.js';
import { createError } from '../middleware/errorHandler.js';

export const getPublicInvoice = async (req, res, next) => {
  try {
    const { publicId } = req.params;

    // Find invoice and populate client and freelancer user details (business name, gstin, upiId)
    const invoice = await Invoice.findOne({ publicId })
      .populate('clientId', 'name email phone address gstin')
      .populate('userId', 'name business');

    if (!invoice) {
      throw createError('Invoice not found or link has expired', 404);
    }

    // If invoice status was 'sent', automatically mark as 'viewed' (first client view!)
    if (invoice.status === 'sent') {
      invoice.status = 'viewed';
      await invoice.save();
    }

    res.json({
      success: true,
      invoice,
    });
  } catch (err) {
    next(err);
  }
};
