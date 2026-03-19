import { Currency, ExpenseCategory } from '../types';

//  Currency helpers
export const CURRENCY_META: Record<Currency, { symbol: string; name: string }> = {
  INR: { symbol: '₹', name: 'Indian Rupee' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
};

export const getCurrencySymbol = (code: Currency): string =>
  CURRENCY_META[code]?.symbol ?? code;

export const CURRENCIES: { code: Currency; symbol: string; name: string }[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

//  Group icon options
export const GROUP_ICONS: string[] = [
  '🏠', '✈️', '🍕', '🎉', '💼',
  '🏋️', '🎮', '🛒', '🌴', '🚗',
];

//  Expense category icons 
export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  Food:          '🍕',
  Travel:        '✈️',
  Utilities:     '💡',
  Entertainment: '🎮',
  Other:         '📦',
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Travel',
  'Utilities',
  'Entertainment',
  'Other',
];

//  Category colors
export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food:          '#FF6B6B',
  Travel:        '#4D96FF',
  Utilities:     '#FFD93D',
  Entertainment: '#845EC2',
  Other:         '#94A3B8',
};