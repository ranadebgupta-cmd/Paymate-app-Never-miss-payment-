
export interface User {
  id: string;
  email: string;
  passwordHash: string; // In a real app, never store plain passwords. Mocking here.
  name: string;
}

export type BillCategory = 
  | 'Credit Card' 
  | 'Electricity' 
  | 'Gas' 
  | 'Water' 
  | 'Internet' 
  | 'Telephone' 
  | 'Insurance' 
  | 'Rent' 
  | 'Subscription' 
  | 'Loan'
  | 'Other';

export interface Bill {
  id: string;
  userId: string;
  name: string; // Generalized from cardName
  category: BillCategory;
  totalAmount: number;
  minDueAmount: number;
  dueDate: string; // ISO Date string YYYY-MM-DD
  isPaid: boolean;
  isRecurring: boolean;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  dueDate: string; // ISO Date-Time string
  reminderDate?: string; // ISO Date-Time string for the specific alert
  isCompleted: boolean;
}

export type ViewState = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD' | 'DASHBOARD';

export interface NotificationItem {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'success';
}

export interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}
