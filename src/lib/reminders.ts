import { api } from './api';
import { PaymentReminder } from './types';

// Local date as YYYY-MM-DD (toISOString would give the UTC date, which can be a day off)
const localDateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Logs a reminder's payment as an expense dated today, then moves the reminder to its next due date
export async function logReminderAsExpense(reminder: PaymentReminder): Promise<void> {
  const res = await api.createTransaction({
    type: 'EXPENSE',
    amount: reminder.amount,
    description: reminder.title,
    categoryId: reminder.categoryId || undefined,
    transactionDate: localDateString(new Date()),
    paymentMethod: reminder.paymentMethod || undefined,
    notes: 'Logged from payment reminder',
  });
  if (!res.success) {
    throw new Error(res.message || 'Could not add the expense');
  }
  await api.logPaymentReminder(reminder.id);
}
