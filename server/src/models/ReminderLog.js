import mongoose from 'mongoose';

const reminderLogSchema = new mongoose.Schema(
  {
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['pre-due', 'due', 'overdue-1', 'overdue-2'],
      required: true,
    },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

reminderLogSchema.index({ invoiceId: 1, type: 1 });

export default mongoose.model('ReminderLog', reminderLogSchema);
