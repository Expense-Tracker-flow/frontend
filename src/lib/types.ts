export type TransactionType = 'EXPENSE' | 'INCOME';

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

export type PaymentMethod = 'UPI' | 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'OTHER';

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
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserProfile;
}

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
