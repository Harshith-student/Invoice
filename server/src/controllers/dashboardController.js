import Invoice from '../models/Invoice.js';
import { startOfMonth, endOfMonth } from '../utils/dateHelpers.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Total outstanding = sum of total for all sent/viewed/overdue invoices
    const outstandingResult = await Invoice.aggregate([
      { $match: { userId, status: { $in: ['sent', 'viewed', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const totalOutstanding = outstandingResult[0]?.total ?? 0;

    // Overdue amount
    const overdueResult = await Invoice.aggregate([
      { $match: { userId, status: 'overdue' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const overdueAmount = overdueResult[0]?.total ?? 0;

    // Paid this month
    const paidResult = await Invoice.aggregate([
      {
        $match: {
          userId,
          status: 'paid',
          paidAt: { $gte: startOfMonth(now), $lte: endOfMonth(now) },
        },
      },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const paidThisMonth = paidResult[0]?.total ?? 0;

    // Recent invoices (last 5)
    const recentInvoices = await Invoice.find({ userId })
      .populate('clientId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: { totalOutstanding, overdueAmount, paidThisMonth },
      recentInvoices,
    });
  } catch (err) {
    next(err);
  }
};
