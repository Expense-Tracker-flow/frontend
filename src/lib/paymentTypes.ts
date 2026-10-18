import { api } from './api';

export interface PaymentTypeInfo {
  code: string;
  label: string;
  builtIn: boolean;
}

// Labels for the built-in codes, matching the backend
const BUILT_IN_LABELS: Record<string, string> = {
  UPI: 'UPI',
  CASH: 'Cash',
  CREDIT_CARD: 'Credit card',
  DEBIT_CARD: 'Debit card',
  BANK_TRANSFER: 'Bank transfer',
  OTHER: 'Other',
};

// The built-in types are the defaults. They are always shown, even if the server list cannot be loaded.
const BUILT_IN_TYPES: PaymentTypeInfo[] = Object.entries(BUILT_IN_LABELS).map(([code, label]) => ({
  code,
  label,
  builtIn: true,
}));

// Cached copy of the user's custom payment types
let customTypes: PaymentTypeInfo[] = [];

export async function loadPaymentTypes(): Promise<PaymentTypeInfo[]> {
  try {
    const res = await api.getPaymentTypes();
    if (res.success && res.data) {
      customTypes = res.data.filter((t) => !t.builtIn);
      return res.data;
    }
  } catch {
    // Server list unavailable (for example, an older backend): fall back to the defaults
  }
  customTypes = [];
  return BUILT_IN_TYPES;
}

export function getCustomPaymentTypes(): PaymentTypeInfo[] {
  return customTypes;
}

export function clearPaymentTypes() {
  customTypes = [];
}

// Human label for a stored payment code. Built-in codes map to their label; custom ids map to the name.
export function paymentLabel(code?: string | null): string {
  if (!code) return BUILT_IN_LABELS.CASH;
  if (BUILT_IN_LABELS[code]) return BUILT_IN_LABELS[code];
  const custom = customTypes.find((t) => t.code === code);
  return custom ? custom.label : 'Payment type';
}
