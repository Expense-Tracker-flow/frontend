export type TransactionType = 'EXPENSE' | 'INCOME';

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

// A built-in code (UPI, CASH, ...) or the id of a user's custom payment type
export type PaymentMethod = string;

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  type: TransactionType;
  isSystem: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category?: Category;
  transactionDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface CategoryBreakdown {
  name: string;
  color: string;
  icon: string;
  amount: number;
  transactionCount: number;
  percentage: number;
}

export interface DailyTrend {
  date: string;
  expense: number;
  income: number;
}

export interface DashboardSummary {
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
  monthNetSavings: number;
  monthOverMonthGrowth: number;
  topCategories: CategoryBreakdown[];
  dailyPulse: DailyTrend[];
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message?: string;
  data: T;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  currency: string;
  timezone?: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserProfile;
}

// A bill that sends a phone alert before it is due. Stored on the server, so the alert arrives even when the app is closed
export interface PaymentReminder {
  id: string;
  title: string;
  amount: number;
  categoryId?: string | null;
  paymentMethod?: string | null;
  dueDay: number; // 1 - 31
  remindDaysBefore: number; // 0 - 7 (0 = on the due date)
  nextDueDate: string; // YYYY-MM-DD
  active: boolean;
}

export type PaymentReminderInput = Omit<PaymentReminder, 'id' | 'nextDueDate' | 'active'>;

export type AutomationFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface AutomationRule {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  frequency: AutomationFrequency;
  dayOfMonth?: number; // 1 - 31 for monthly
  dayOfWeek?: number; // 0 - 6 (0 is Sunday) for weekly
  categoryId?: string;
  categoryName?: string;
  paymentMethod: PaymentMethod;
  isActive: boolean;
  autoLog: boolean;
  notes?: string;
  lastExecuted?: string; // ISO date
  nextExecutionDate: string; // YYYY-MM-DD
  createdAt: string;
}
