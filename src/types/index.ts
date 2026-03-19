export type Currency = 'INR' | 'USD' | 'EUR';

export type AvatarColor =
  | '#FF6B6B'
  | '#FFB347'
  | '#FFD93D'
  | '#6BCB77'
  | '#4D96FF'
  | '#845EC2'
  | '#F9A8D4'
  | '#94A3B8';

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export type ExpenseCategory =
  | 'Food'
  | 'Travel'
  | 'Utilities'
  | 'Entertainment'
  | 'Other';

export interface User {
  id:              string;
  name:            string;
  email:           string;
  displayCurrency: Currency;
  avatarColor:     AvatarColor;
  createdAt:       string;
}

export interface AuthState {
  isLoggedIn:             boolean;
  user:                   User | null;
  hasCompletedOnboarding: boolean;
  isHydrated:             boolean;
}

export interface Contact {
  id:          string;
  name:        string;
  email:       string;
  avatarColor: AvatarColor;
}

export interface Group {
  id:           string;
  name:         string;
  icon:         string;    
  description?: string;
  memberIds:    string[];  
  createdAt:    string;     
  updatedAt:    string;    
  isArchived:   boolean;
}


export interface SplitShare {
  memberId:    string;
  amount:      number;     
  percentage?: number;       
  shares?:     number;      
}

export interface LocationTag {
  name: string;
  lat:  number;
  lon:  number;
}

export interface AuditEntry {
  id:             string;
  changedAt:      string;   
  changedBy:      string;   
  description:    string;   
  previousValues: Partial<Expense>;
}

export interface Expense {
  id:          string;
  groupId:     string;
  description: string;
  amount:      number;
  currency:    Currency;
  category:    ExpenseCategory;
  date:        string;     
  paidById:    string;     
  splitType:   SplitType;
  splits:      SplitShare[];

  receiptUri?: string;
  location?:   LocationTag;

  historicalRate?: Record<string, number>;

  auditLog:  AuditEntry[];
  createdAt: string;
  updatedAt: string;
}


export interface Settlement {
  id:        string;
  groupId:   string;
  fromId:    string;
  toId:      string;  
  amount:    number;
  currency:  Currency;
  date:      string;   
  note?:     string;
  createdAt: string;
}

export interface MemberBalance {
  memberId:  string;
  netAmount: number;
  currency:  Currency;
}

export interface DebtSuggestion {
  fromId:   string;
  toId:     string;
  amount:   number;
  currency: Currency;
}


export interface CachedRates {
  base:      string;              
  rates:     Record<string, number>; 
  fetchedAt: string;               
}

export type RootStackParamList = {
  Onboarding: undefined;
  Login:      undefined;
  Main:       undefined;
};

export type MainTabParamList = {
  GroupsTab:    undefined;
  AnalyticsTab: undefined;
  ProfileTab:   undefined;
};

export type GroupsStackParamList = {
  GroupList:     undefined;
  GroupDetail:   { groupId: string };
  CreateGroup:   undefined;
  AddExpense:    { groupId: string };
  ExpenseDetail: { expenseId: string; groupId: string };
  EditExpense:   { expenseId: string; groupId: string };
  Balance:       { groupId: string };
  Settlement:    { groupId: string; fromId?: string; toId?: string };
};