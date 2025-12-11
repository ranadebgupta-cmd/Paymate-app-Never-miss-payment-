
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
  name: string;
  category: BillCategory;
  totalAmount: number;
  minDueAmount: number;
  dueDate: string; // ISO Date string YYYY-MM-DD
  isPaid: boolean;
  isRecurring: boolean;
  upiId?: string; // Virtual Payment Address for UPI payments
  paymentUrl?: string; // Direct link to biller's payment portal
  consumerNumber?: string; // BBPS Consumer ID / Account No
  billerId?: string; // BBPS Biller ID
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  dueDate: string; // ISO Date-Time string
  reminderDate?: string; // ISO Date-Time string for the specific alert
  isCompleted: boolean;
  isRecurring?: boolean;
}

export type ViewState = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD' | 'DASHBOARD';

export interface NotificationItem {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'success';
}

export interface EmailLog {
  id: string;
  timestamp: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed';
}

export interface EmailConfig {
  provider: 'simple' | 'emailjs';
  // EmailJS specific
  serviceId?: string;
  templateId?: string;
  publicKey?: string;
}