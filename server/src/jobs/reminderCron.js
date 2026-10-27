import cron from 'node-cron';
import { runReminders } from '../services/reminderService.js';

/**
 * Initializes the automated daily cron job for payment reminders at 9:00 AM
 */
export const initReminderCron = () => {
  // '0 9 * * *' = At 09:00 every day
  const task = cron.schedule('0 9 * * *', async () => {
    console.log('⏰ [CRON 09:00 AM] Triggering daily payment reminder check...');
    try {
      const stats = await runReminders();
      console.log(`⏰ [CRON DONE] Inspected ${stats.checked} invoices, sent ${stats.reminded} reminders.`);
    } catch (err) {
      console.error('❌ [CRON ERROR] Reminder job failed:', err.message);
    }
  });

  console.log('🕒 Daily reminder cron scheduled: 09:00 AM every day');
  return task;
};
