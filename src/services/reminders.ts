import { WhatsAppService } from "./whatsapp";

/**
 * Reminder Logic Service
 * 
 * Reusable functions to track and notify users. Designed keeping future 
 * automation (e.g., node-cron) in mind.
 */

export interface ReminderJob {
  userId: string;
  dueDate: Date;
  phoneNumber?: string;
  userName: string;
}

export const ReminderService = {
  /**
   * Process pending reminders.
   * Can be hooked into a cron job on a backend server or a scheduled cloud function.
   */
  processOverdueReminders: async (reminders: ReminderJob[]): Promise<void> => {
    const today = new Date();
    
    for (const reminder of reminders) {
      if (reminder.dueDate < today && reminder.phoneNumber) {
        // Build generic template
        const message = `Hi ${reminder.userName}, your gym subscription was due on ${reminder.dueDate.toDateString()}. Please renew at the earliest.`;
        
        // Push notification via WhatsApp modular service
        await WhatsAppService.sendMessage({
          to: reminder.phoneNumber,
          message: message,
        });
      }
    }
  },

  /**
   * Process reminders for subscriptions expiring soon (e.g. within 3 days).
   */
  processUpcomingReminders: async (reminders: ReminderJob[], daysWarning = 3): Promise<void> => {
    const today = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysWarning);
    
    for (const reminder of reminders) {
      if (reminder.dueDate >= today && reminder.dueDate <= threshold && reminder.phoneNumber) {
        const message = `Hi ${reminder.userName}, your gym subscription will expire on ${reminder.dueDate.toDateString()}.`;
        
        await WhatsAppService.sendMessage({
          to: reminder.phoneNumber,
          message: message,
        });
      }
    }
  }
};
