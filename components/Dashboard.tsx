
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { User, Bill, NotificationItem, BillCategory, Task, EmailLog, EmailConfig } from '../types';
import { getFinancialAdvice } from '../services/geminiService';
import { 
  Plus, CheckCircle, Trash2, LogOut, RefreshCw, 
  CreditCard, Zap, Landmark, Shield, Tv, Receipt, 
  Repeat, AlertTriangle, Home, FileText, Calendar as CalendarIcon, 
  BarChart2, Settings, Search, Bell, User as UserIcon,
  Flame, Droplets, Wifi, Phone, Home as HomeIcon, Volume2, Mail, Smartphone, PieChart,
  Clock, AlertCircle, FileDown, FileSpreadsheet, Pencil, Filter, X, Save, ExternalLink,
  ListTodo, CheckSquare, Square, Info, HelpCircle, ChevronRight, ChevronDown, Copy,
  Loader2, History, Key, Link, Sparkles, Send, Music, Calendar, TrendingUp, DollarSign,
  ArrowUpRight, ArrowDownRight, Activity, QrCode, Lock, Globe
} from 'lucide-react';
import { BillForm } from './BillForm';
import { TaskForm } from './TaskForm';
import { NotificationToast } from './NotificationToast';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import emailjs from '@emailjs/browser';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  user: User;
  onLogout: () => void;
}

type Tab = 'home' | 'bills' | 'tasks' | 'reports' | 'settings';
type FilterStatus = 'all' | 'pending' | 'overdue' | 'paid';

const DEFAULT_EMAIL_CONFIG: EmailConfig = {
    provider: 'simple',
    serviceId: 'service_f3f9kg1',
    templateId: '', 
    publicKey: ''
};

const CATEGORY_COLORS: Record<string, string> = {
    'Credit Card': '#818cf8', // Indigo-400
    'Electricity': '#fbbf24', // Amber-400
    'Gas': '#fb923c', // Orange-400
    'Water': '#22d3ee', // Cyan-400
    'Internet': '#a78bfa', // Violet-400
    'Telephone': '#f472b6', // Pink-400
    'Rent': '#2dd4bf', // Teal-400
    'Insurance': '#f87171', // Red-400
    'Subscription': '#c084fc', // Purple-400
    'Loan': '#4ade80', // Green-400
    'Other': '#94a3b8' // Slate-400
};

// Smart Payment Links Database
const SMART_LINKS: Record<string, { url: string, name: string }> = {
    'airtel': { url: 'https://www.airtel.in/pay-bill', name: 'Airtel Thanks' },
    'jio': { url: 'https://www.jio.com/selfcare/paybill', name: 'MyJio' },
    'vi': { url: 'https://www.myvi.in/postpaid/quick-bill-pay', name: 'Vi App' },
    'vodafone': { url: 'https://www.myvi.in/postpaid/quick-bill-pay', name: 'Vi App' },
    'bsnl': { url: 'https://portal.bsnl.in/myportal/quickpayment.do', name: 'BSNL Portal' },
    'sbi': { url: 'https://www.onlinesbi.sbi/sbicollect/icollecthome.htm', name: 'SBI Collect' },
    'hdfc': { url: 'https://www.hdfcbank.com/personal/pay/bill-payments', name: 'HDFC BillPay' },
    'icici': { url: 'https://www.icicibank.com/personal-banking/payments/bill-payments', name: 'ICICI BillPay' },
    'axis': { url: 'https://www.axisbank.com/make-payments/bill-payment', name: 'Axis Bank' },
    'lic': { url: 'https://ebiz.licindia.in/D2CPM/#/DirectPay', name: 'LIC Pay Direct' },
    'act': { url: 'https://selfcare.actcorp.in/quick-pay', name: 'ACT Fibernet' },
    'bescom': { url: 'https://www.bescom.co.in/SCP/Myhome.aspx', name: 'BESCOM' },
    'mahadiscom': { url: 'https://wss.mahadiscom.in/wss/wss_view_pay_bill.aspx', name: 'Mahadiscom' },
    'netflix': { url: 'https://www.netflix.com/youraccount', name: 'Netflix' },
    'prime': { url: 'https://www.amazon.in/manage-your-content-and-devices', name: 'Amazon Prime' },
    'hotstar': { url: 'https://www.hotstar.com/in/subscribe/my-account', name: 'Hotstar' }
};

// Comprehensive Paytm Links for all categories (Web)
const AGGREGATOR_LINKS: Record<string, string> = {
    'Electricity': 'https://paytm.com/electricity-bill-payment',
    'Credit Card': 'https://paytm.com/credit-card-bill-payment',
    'Gas': 'https://paytm.com/gas-bill-payment',
    'Water': 'https://paytm.com/water-bill-payment',
    'Internet': 'https://paytm.com/broadband-bill-payment',
    'Telephone': 'https://paytm.com/recharge',
    'Insurance': 'https://paytm.com/insurance-premium-payment',
    'Rent': 'https://paytm.com/rent-payment',
    'Loan': 'https://paytm.com/loan-emi-payment',
    'Subscription': 'https://paytm.com/subscription-payment',
    'Other': 'https://paytm.com/challan-bill-payment',
    'default': 'https://paytm.com/'
};

// Paytm Native App Deep Links
const PAYTM_APP_LINKS: Record<string, string> = {
    'Electricity': 'paytmmp://electricity',
    'Credit Card': 'paytmmp://credit_card',
    'Gas': 'paytmmp://gas',
    'Water': 'paytmmp://water',
    'Internet': 'paytmmp://broadband',
    'Telephone': 'paytmmp://mobile_postpaid',
    'Insurance': 'paytmmp://insurance',
    'Rent': 'paytmmp://rent_payment',
    'Loan': 'paytmmp://loan_payment',
    'Subscription': 'paytmmp://subscription',
    'Other': 'paytmmp://utilities',
    'default': 'paytmmp://'
};

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-700/50 py-3 last:border-0">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-left font-medium text-indigo-300 hover:text-indigo-200 focus:outline-none transition-colors">
        <span className="pr-4">{question}</span>
        <ChevronDown size={16} className={`transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <p className="mt-2 text-sm text-gray-400 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">{answer}</p>}
    </div>
  );
};

export const Dashboard: React.FC<Props> = ({ user, onLogout }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [notification, setNotification] = useState<NotificationItem | null>(null);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);
  const [billToTogglePay, setBillToTogglePay] = useState<Bill | null>(null);
  const [billToPayNow, setBillToPayNow] = useState<Bill | null>(null); // State for Payment Gateway
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  
  // Modal States
  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  
  // Settings State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailHistory, setEmailHistory] = useState<EmailLog[]>([]);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  
  // Config State
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(DEFAULT_EMAIL_CONFIG);
  const [showEmailConfig, setShowEmailConfig] = useState(false);

  // AI Advice State
  const [advice, setAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  useEffect(() => {
    // Sync notification permission on mount
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    // Load global settings
    const storedEmailPref = localStorage.getItem('billmate_email_pref');
    if (storedEmailPref !== null) {
      setEmailNotifications(JSON.parse(storedEmailPref));
    }
    
    // Load User-Specific Email Config
    const userConfigKey = `paymate_email_config_${user.id}`;
    const storedUserConfig = localStorage.getItem(userConfigKey);
    
    if (storedUserConfig) {
        const parsed = JSON.parse(storedUserConfig);
        if (!parsed.provider) parsed.provider = 'simple';
        setEmailConfig(parsed);
    }
    
    // Load Email History
    const history = localStorage.getItem('paymate_email_history');
    if (history) setEmailHistory(JSON.parse(history));
    
    loadBills();
    loadTasks();

    // Periodic Check (every 60s)
    const interval = setInterval(() => {
      const currentEmailPref = localStorage.getItem('billmate_email_pref');
      const isEnabled = currentEmailPref !== null ? JSON.parse(currentEmailPref) : true;
      checkTaskDueDates(storageService.getTasks(user.id), isEnabled);
      checkDueDates(storageService.getBills(user.id), isEnabled);
    }, 60000);

    return () => clearInterval(interval);
  }, [user.id]);

  const loadBills = () => {
    const userBills = storageService.getBills(user.id);
    setBills(userBills);
  };

  const loadTasks = () => {
    const userTasks = storageService.getTasks(user.id);
    setTasks(userTasks);
  };

  const saveEmailConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(`paymate_email_config_${user.id}`, JSON.stringify(emailConfig));
    setNotification({ id: Date.now().toString(), message: 'Settings saved!', type: 'success' });
    setShowEmailConfig(false);
  };
  
  const saveEmailLog = (subject: string, status: 'sent' | 'failed') => {
      const newLog: EmailLog = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          recipient: user.email,
          subject: subject,
          status: status
      };
      const updatedHistory = [newLog, ...emailHistory].slice(0, 50);
      setEmailHistory(updatedHistory);
      localStorage.setItem('paymate_email_history', JSON.stringify(updatedHistory));
  };

  const sendRealEmail = async (subject: string, message: string, detailAmount: string, detailDate: string) => {
    const isSimple = emailConfig.provider === 'simple';
    
    try {
        if (isSimple) {
            // FormSubmit Simple Integration
            const response = await fetch(`https://formsubmit.co/ajax/${user.email.trim()}`, {
                method: "POST",
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    _subject: subject,
                    _template: "box", 
                    _captcha: "false", 
                    _honey: "", 
                    app: "Paymate Bill Manager",
                    recipient: user.name,
                    alert_type: subject,
                    details: message,
                    amount_due: detailAmount,
                    due_date: detailDate
                })
            });
            const data = await response.json();
            const success = response.ok && data.success === "true";
            
            saveEmailLog(subject, success ? 'sent' : 'failed');
            return success;
        } else {
            // Advanced EmailJS Integration
            if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) return false;
            
            const templateParams = {
                to_name: user.name,
                to_email: user.email,
                bill_name: subject,
                message: message,
                amount: detailAmount,
                due_date: detailDate
            };
            const result = await emailjs.send(emailConfig.serviceId, emailConfig.templateId, templateParams, emailConfig.publicKey);
            const success = result.status === 200;
            saveEmailLog(subject, success ? 'sent' : 'failed');
            return success;
        }
    } catch (e) {
        console.error("Email send failed", e);
        const errorMsg = e instanceof Error ? e.message : 'Unknown Error';
        setNotification({id: Date.now().toString(), message: `Email Error: ${errorMsg}`, type: 'warning'});
        saveEmailLog(subject, 'failed');
        return false;
    }
  };
  
  const handleSendActivation = async () => {
    setIsSendingEmail(true);
    try {
       await fetch(`https://formsubmit.co/ajax/${user.email.trim()}`, {
           method: "POST",
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
               _subject: "Paymate Activation",
               message: "This is a setup email to activate FormSubmit for Paymate notifications. Please click Activate in the email you receive."
           })
       });
       setNotification({ id: Date.now().toString(), message: 'Activation email sent! Please check your Inbox and Spam folder.', type: 'info' });
    } catch (e) {
        setNotification({ id: Date.now().toString(), message: 'Failed to send activation.', type: 'warning' });
    }
    setIsSendingEmail(false);
  };

  const showAppLevelNotification = async (title: string, body: string) => {
    if (Notification.permission !== "granted") return;

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          registration.showNotification(title, {
            body: body,
            icon: "https://cdn-icons-png.flaticon.com/512/10543/10543329.png",
            badge: "https://cdn-icons-png.flaticon.com/512/10543/10543329.png",
            vibrate: [200, 100, 200],
            tag: 'paymate-alert'
          } as any);
          return;
        }
      } catch (e) {
        console.error("SW Notification failed", e);
      }
    }
    
    new Notification(title, { 
      body: body, 
      icon: "https://cdn-icons-png.flaticon.com/512/10543/10543329.png" 
    });
  };

  const checkDueDates = async (currentBills: Bill[], isEmailEnabled: boolean) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const alertKey = `billmate_alerts_freq_${todayStr}`;
    let dailyRecords: any = {};
    try { dailyRecords = JSON.parse(localStorage.getItem(alertKey) || '{}'); } catch {}

    const sortedBills = [...currentBills].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    let alertTriggered = false;
    const now = Date.now();

    for (const bill of sortedBills) {
      if (bill.isPaid) continue;
      const record = dailyRecords[bill.id] || { count: 0, lastAlertTime: 0 };
      if (record.count >= 2) continue; 
      if (record.count > 0 && (now - record.lastAlertTime < 14400000)) continue; 

      const due = new Date(bill.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (86400000));
      
      let message = '';
      let type: 'warning' | 'info' = 'info';
      const isDueToday = bill.dueDate === todayStr;

      if (diffDays < 0) { message = `OVERDUE: ${bill.name}`; type = 'warning'; } 
      else if (isDueToday || diffDays === 0) { message = `URGENT: ${bill.name} Due Today!`; type = 'warning'; } 
      else if (diffDays === 1) { message = `Reminder: ${bill.name} due tomorrow`; type = 'info'; }
      else if (diffDays > 1 && diffDays <= 3) { message = `${bill.name} due in ${diffDays} days`; type = 'info'; }

      if (message) {
        if (isEmailEnabled) {
             await sendRealEmail(`Bill Due: ${bill.name}`, message, bill.totalAmount.toString(), bill.dueDate);
        }
        await showAppLevelNotification("Paymate Bill Alert", message);
        setNotification({ id: Date.now().toString(), message, type });
        dailyRecords[bill.id] = { count: record.count + 1, lastAlertTime: now };
        alertTriggered = true;
        break; 
      }
    }
    if (alertTriggered) localStorage.setItem(alertKey, JSON.stringify(dailyRecords));
  };

  const checkTaskDueDates = async (currentTasks: Task[], isEmailEnabled: boolean) => {
     const now = new Date();
    const notifiedKey = 'paymate_task_alerts';
    let notifiedItems: string[] = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
    let updatedNotified = false;

    for (const task of currentTasks) {
      if (task.isCompleted) continue;
      const due = new Date(task.dueDate);
      let triggered = false;
      
      if (task.reminderDate) {
          const remindAt = new Date(task.reminderDate);
          const reminderId = `${task.id}_reminder`;
          if (now >= remindAt && !notifiedItems.includes(reminderId) && now < due) {
             const message = `Reminder: ${task.title}`;
             if (isEmailEnabled) await sendRealEmail(`Task: ${task.title}`, message, "-", task.dueDate);
             await showAppLevelNotification("Task Reminder", message);
             setNotification({ id: Date.now().toString(), message, type: 'info' });
             notifiedItems.push(reminderId);
             updatedNotified = true;
             triggered = true;
          }
      }
      if (!triggered) {
        const dueId = `${task.id}_due`;
        if (now >= due && !notifiedItems.includes(dueId)) {
            const message = `Task Due: ${task.title}`;
            if (isEmailEnabled) await sendRealEmail(`Due: ${task.title}`, message, "-", task.dueDate);
            await showAppLevelNotification("Task Due", message);
            setNotification({ id: Date.now().toString(), message, type: 'warning' });
            notifiedItems.push(dueId);
            updatedNotified = true;
            triggered = true;
          }
      }
      if (triggered) break;
    }
    if (updatedNotified) localStorage.setItem(notifiedKey, JSON.stringify(notifiedItems));
  };

  const toggleEmailNotifications = () => {
      const newValue = !emailNotifications;
      setEmailNotifications(newValue);
      localStorage.setItem('billmate_email_pref', JSON.stringify(newValue));
      setNotification({ id: Date.now().toString(), message: `Email notifications ${newValue ? 'enabled' : 'disabled'}`, type: 'info' });
  };
  
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      setNotification({ id: Date.now().toString(), message: "This browser does not support notifications", type: "warning" });
      return;
    }

    if (Notification.permission === 'granted') {
         setNotification({ id: Date.now().toString(), message: "Notifications are already enabled.", type: "info" });
         showAppLevelNotification("Paymate", "Daily reminders are active.");
         return;
    }

    if (Notification.permission === 'denied') {
         setNotification({ 
             id: Date.now().toString(), 
             message: "Notifications are blocked by browser.", 
             type: "warning" 
         });
         alert("Notifications are BLOCKED. Please click the Lock icon in your address bar or go to Settings > Site Settings and ALLOW Notifications for Paymate.");
         return;
    }

    try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === "granted") {
            setNotification({ id: Date.now().toString(), message: "Push enabled! You will get daily reminders.", type: "success" });
            showAppLevelNotification("Paymate", "Setup Complete. You will be reminded twice daily for due bills.");
        }
    } catch (e) {
        console.error(e);
        setNotification({ id: Date.now().toString(), message: "Error requesting permission.", type: "warning" });
    }
  };

  const handleTestAlert = async () => {
     if (Notification.permission === "granted") {
         showAppLevelNotification("Paymate Test", "This is a test notification from the app.");
     } else {
         try {
            new Notification("Paymate Test", { body: "Browser notification test" });
         } catch (e) {
             console.log("Notification API error (likely Android WebView)", e);
             setNotification({ id: Date.now().toString(), message: "Test alert triggered (check status bar)", type: "info" });
         }
     }
     
     if (emailNotifications) {
         setIsSendingEmail(true);
         const sent = await sendRealEmail("Test Alert", "This is a test email from Paymate.", "0.00", new Date().toISOString().split('T')[0]);
         setIsSendingEmail(false);
         if (sent) setNotification({ id: Date.now().toString(), message: 'Email sent! Check Spam if not found.', type: 'success' });
     }
  };

  const addToGoogleCalendar = (title: string, dueDate: string, details: string = '') => {
    // Set time to 09:00 AM local time on the due date
    const d = new Date(dueDate);
    d.setHours(9, 0, 0, 0);
    
    // Format to YYYYMMDDTHHMMSS
    const start = d.toISOString().replace(/-|:|\.\d\d\d/g, "").slice(0, 15);
    
    // End time 5:00 PM (17:00)
    d.setHours(17, 0, 0, 0);
    const end = d.toISOString().replace(/-|:|\.\d\d\d/g, "").slice(0, 15);

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(details)}&recur=RRULE:FREQ=DAILY`;
    window.open(url, '_blank');
  };

  const handleSaveBill = (bill: Bill, autoCalendar: boolean) => {
    if (editingBill) {
      storageService.updateBill(bill);
      setNotification({ id: Date.now().toString(), message: 'Bill updated successfully!', type: 'success' });
    } else {
      storageService.saveBill(bill);
      setNotification({ id: Date.now().toString(), message: 'Bill added successfully!', type: 'success' });
      // Trigger Auto-Calendar
      if (autoCalendar) {
          addToGoogleCalendar(`Bill Due: ${bill.name}`, bill.dueDate, `Amount: ${bill.totalAmount}. Pay via Paymate.`);
      }
    }
    loadBills();
    setShowAddForm(false);
    setEditingBill(null);
  };
  
  const handleSaveTask = (task: Task) => {
    if (editingTask) {
        storageService.updateTask(task);
        setNotification({ id: Date.now().toString(), message: 'Task updated!', type: 'success' });
    } else {
        storageService.saveTask(task);
        setNotification({ id: Date.now().toString(), message: 'Task added!', type: 'success' });
        // Auto-calendar for tasks
        addToGoogleCalendar(`Task Due: ${task.title}`, task.dueDate, "Paymate Task Reminder");
    }
    loadTasks();
    setShowTaskForm(false);
    setEditingTask(null);
  }

  const handleDeleteBill = () => {
    if (billToDelete) {
      storageService.deleteBill(billToDelete);
      setNotification({ id: Date.now().toString(), message: 'Bill deleted.', type: 'info' });
      setBillToDelete(null);
      loadBills();
    }
  };
  
  const handleDeleteTask = () => {
      if (taskToDelete) {
          storageService.deleteTask(taskToDelete);
          setNotification({ id: Date.now().toString(), message: 'Task deleted.', type: 'info' });
          setTaskToDelete(null);
          loadTasks();
      }
  };

  const executeTogglePaid = () => {
    if (!billToTogglePay) return;
    
    const updatedBill = { ...billToTogglePay, isPaid: !billToTogglePay.isPaid };
    storageService.updateBill(updatedBill);
    
    // Logic for Recurring Bills
    if (billToTogglePay.isRecurring && !billToTogglePay.isPaid) {
        // Was unpaid, now marking paid -> Create next month's bill
        const currentDueDate = new Date(billToTogglePay.dueDate);
        const nextDueDate = new Date(currentDueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        
        const newBill: Bill = {
            ...billToTogglePay,
            id: Date.now().toString(36) + Math.random().toString(36).substring(2),
            dueDate: nextDueDate.toISOString().split('T')[0],
            isPaid: false
        };
        storageService.saveBill(newBill);
        setNotification({ 
            id: Date.now().toString(), 
            message: 'Bill paid! Next month\'s bill created automatically.', 
            type: 'success' 
        });
    } else {
        setNotification({ 
            id: Date.now().toString(), 
            message: `Bill marked as ${updatedBill.isPaid ? 'Paid' : 'Unpaid'}`, 
            type: 'success' 
        });
    }

    loadBills();
    setBillToTogglePay(null);
  };
  
  const handleToggleTask = (task: Task) => {
      const updatedTask = { ...task, isCompleted: !task.isCompleted };
      storageService.updateTask(updatedTask);
      
      // Recurring Task Logic
      if (task.isRecurring && !task.isCompleted) {
          const due = new Date(task.dueDate);
          const nextDue = new Date(due.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
          
          const newTask: Task = {
              ...task,
              id: Date.now().toString(36) + Math.random().toString(36).substring(2),
              dueDate: nextDue.toISOString().slice(0, 16), // Keep format YYYY-MM-DDTHH:mm
              isCompleted: false
          };
          storageService.saveTask(newTask);
          setNotification({ id: Date.now().toString(), message: 'Task completed! Next week\'s task created.', type: 'success' });
      } else {
           setNotification({ id: Date.now().toString(), message: 'Task updated', type: 'info' });
      }
      loadTasks();
  }

  const handlePayViaUPI = () => {
    if (billToPayNow) {
        const updatedBill = { ...billToPayNow, isPaid: true };
        storageService.updateBill(updatedBill);
        setNotification({ id: Date.now().toString(), message: 'Payment recorded successfully!', type: 'success' });
        loadBills();
        setBillToPayNow(null);
    }
  };

  const generateReport = async () => {
    setLoadingAdvice(true);
    const result = await getFinancialAdvice(bills);
    setAdvice(result);
    setLoadingAdvice(false);
  };
  
  const handleExportPDF = () => {
    try {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(99, 102, 241); // Indigo color
        doc.text("Paymate Financial Report", 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        doc.text(`User: ${user.name}`, 14, 36);

        // Summary Stats
        const total = bills.reduce((sum, b) => sum + b.totalAmount, 0);
        const paid = bills.filter(b => b.isPaid).reduce((sum, b) => sum + b.totalAmount, 0);
        const pending = total - paid;
        
        doc.text(`Total Bill Amount: ${total.toFixed(2)}`, 14, 46);
        doc.text(`Paid Amount: ${paid.toFixed(2)}`, 14, 52);
        doc.text(`Pending Amount: ${pending.toFixed(2)}`, 14, 58);

        const tableData = bills.map(b => [
            b.name, 
            b.category, 
            b.dueDate, 
            b.totalAmount.toFixed(2), 
            b.isPaid ? "PAID" : "PENDING"
        ]);

        autoTable(doc, {
            head: [['Bill Name', 'Category', 'Due Date', 'Amount', 'Status']],
            body: tableData,
            startY: 65,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241] }
        });

        doc.save(`Paymate_Report_${new Date().toISOString().slice(0,10)}.pdf`);
        setNotification({ id: Date.now().toString(), message: 'PDF Exported Successfully!', type: 'success' });
    } catch (e) {
        console.error(e);
        setNotification({ id: Date.now().toString(), message: 'Failed to export PDF.', type: 'warning' });
    }
  };

  const handleExportExcel = () => {
    try {
        const wb = XLSX.utils.book_new();
        const data = bills.map(b => ({
            "Bill Name": b.name,
            "Category": b.category,
            "Total Amount": b.totalAmount,
            "Due Date": b.dueDate,
            "Status": b.isPaid ? "Paid" : "Pending",
            "Recurring": b.isRecurring ? "Yes" : "No"
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "My Bills");
        XLSX.writeFile(wb, `Paymate_Bills_${new Date().toISOString().slice(0,10)}.xlsx`);
        setNotification({ id: Date.now().toString(), message: 'Excel Exported Successfully!', type: 'success' });
    } catch (e) {
        console.error(e);
        setNotification({ id: Date.now().toString(), message: 'Failed to export Excel.', type: 'warning' });
    }
  };
  
  // Smart Link Detector
  const detectPaymentPlatform = (bill: Bill) => {
      // 1. Check custom URL
      if (bill.paymentUrl) return { url: bill.paymentUrl, name: 'Biller Website' };
      
      const lowerName = bill.name.toLowerCase();
      
      // 2. Check Name Database
      for (const [key, val] of Object.entries(SMART_LINKS)) {
          if (lowerName.includes(key)) {
              return val;
          }
      }
      
      // 3. Fallback to Aggregators by Category
      if (AGGREGATOR_LINKS[bill.category]) return { url: AGGREGATOR_LINKS[bill.category], name: 'Paytm' };
      
      return { url: AGGREGATOR_LINKS['default'], name: 'Paytm' };
  };

  // --- Render Helpers ---

  const renderHome = () => {
    // 1. Calculate Stats
    const totalDue = bills.filter(b => !b.isPaid).reduce((sum, b) => sum + b.totalAmount, 0);
    const totalMinDue = bills.filter(b => !b.isPaid).reduce((sum, b) => sum + (b.minDueAmount || 0), 0);
    const overdueCount = bills.filter(b => !b.isPaid && new Date(b.dueDate) < new Date(new Date().setHours(0,0,0,0))).length;
    const upcomingCount = bills.filter(b => !b.isPaid && new Date(b.dueDate) >= new Date(new Date().setHours(0,0,0,0))).length;
    
    // 2. Spending Chart Data (Last 6 months)
    const paidBills = bills.filter(b => b.isPaid);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const chartLabels = [];
    const chartData = [];
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(currentMonth - i);
        const mIdx = d.getMonth();
        const year = d.getFullYear();
        chartLabels.push(months[mIdx]);
        
        const monthlyTotal = paidBills
            .filter(b => {
                const bDate = new Date(b.dueDate);
                return bDate.getMonth() === mIdx && bDate.getFullYear() === year;
            })
            .reduce((sum, b) => sum + b.totalAmount, 0);
        chartData.push(monthlyTotal);
    }
    
    const maxVal = Math.max(...chartData, 100);
    const points = chartData.map((val, i) => {
        const x = (i / (chartData.length - 1)) * 100;
        const y = 100 - (val / maxVal) * 80; // Scale to fit
        return `${x},${y}`;
    }).join(' ');

    // 3. Category Breakdown (Paid vs Due)
    type CategoryStat = { name: string; paid: number; due: number; total: number; count: number };
    const categoryStats: CategoryStat[] = Object.keys(CATEGORY_COLORS).map(cat => {
        const catBills = bills.filter(b => b.category === cat);
        const paid = catBills.filter(b => b.isPaid).length;
        const due = catBills.filter(b => !b.isPaid).length;
        const total = catBills.filter(b => !b.isPaid).reduce((sum, b) => sum + b.totalAmount, 0);
        return { name: cat, paid, due, total, count: catBills.length };
    }).filter(c => c.count > 0);

    // 4. Recent Activity
    const recentActivity = [...bills]
        .filter(b => b.isPaid)
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
        .slice(0, 5);

    return (
      <div className="space-y-6 pb-24 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
            <div>
               <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Welcome, {user.name}</h1>
               <p className="text-gray-400 text-sm">Here's your financial overview</p>
            </div>
            <button onClick={loadBills} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition">
                <RefreshCw size={18} className="text-indigo-400" />
            </button>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl border-l-4 border-indigo-500 relative overflow-hidden group">
                <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition"><DollarSign size={40} /></div>
                <h3 className="text-xs text-gray-400 uppercase font-bold">Total Due</h3>
                <p className="text-xl font-bold text-white mt-1">₹{totalDue.toLocaleString()}</p>
            </div>
             <div className="glass-panel p-4 rounded-2xl border-l-4 border-orange-500 relative overflow-hidden group">
                <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition"><Receipt size={40} /></div>
                <h3 className="text-xs text-gray-400 uppercase font-bold">Min Due</h3>
                <p className="text-xl font-bold text-orange-400 mt-1">₹{totalMinDue.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border-l-4 border-red-500 relative overflow-hidden group">
                <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition"><AlertCircle size={40} /></div>
                <h3 className="text-xs text-gray-400 uppercase font-bold">Overdue</h3>
                <p className="text-xl font-bold text-red-400 mt-1">{overdueCount}</p>
            </div>
             <div className="glass-panel p-4 rounded-2xl border-l-4 border-blue-500 relative overflow-hidden group">
                <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition"><CalendarIcon size={40} /></div>
                <h3 className="text-xs text-gray-400 uppercase font-bold">Upcoming</h3>
                <p className="text-xl font-bold text-blue-400 mt-1">{upcomingCount}</p>
            </div>
        </div>

        {/* Chart Section */}
        <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-indigo-400"/> Monthly Spending Trend</h3>
            <div className="h-40 relative flex items-end justify-between px-2">
                 <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.5)" />
                            <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
                        </linearGradient>
                    </defs>
                    <path d={`M0,100 ${points.split(' ').map(p => `L${p}`).join(' ')} L100,100 Z`} fill="url(#chartGradient)" />
                    <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                 </svg>
                 {chartLabels.map((l, i) => (
                     <div key={i} className="text-[10px] text-gray-500 z-10">{l}</div>
                 ))}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Grid */}
            <div>
                 <h3 className="font-bold text-gray-200 mb-4 flex items-center justify-between">
                    <span>Category Breakdown</span>
                    <span className="text-xs text-gray-500 font-normal">Paid vs Due</span>
                 </h3>
                 <div className="grid grid-cols-2 gap-3">
                     {categoryStats.map(cat => (
                         <div key={cat.name} className="bg-gray-800/40 p-3 rounded-xl border border-gray-700 hover:border-indigo-500/50 transition cursor-pointer" onClick={() => { setSearchQuery(cat.name); setActiveTab('bills'); }}>
                             <div className="flex justify-between items-start mb-2">
                                 <span className="text-xs font-bold text-gray-300 truncate w-20">{cat.name}</span>
                                 <div className="w-2 h-2 rounded-full" style={{backgroundColor: CATEGORY_COLORS[cat.name] || '#ccc'}}></div>
                             </div>
                             <div className="flex items-end justify-between">
                                 <div>
                                     <div className="text-[10px] text-gray-500">Due</div>
                                     <div className="font-bold text-white">₹{cat.total.toLocaleString()}</div>
                                 </div>
                                 <div className="flex gap-1 text-[10px]">
                                     <span className="text-green-400 bg-green-400/10 px-1.5 rounded">{cat.paid}</span>
                                     <span className="text-red-400 bg-red-400/10 px-1.5 rounded">{cat.due}</span>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
            </div>

            {/* Recent Activity Sidebar */}
            <div>
                <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2"><Activity size={18} className="text-indigo-400"/> Recent Activity</h3>
                <div className="space-y-3">
                    {recentActivity.length > 0 ? recentActivity.map(bill => (
                        <div key={bill.id} className="bg-gray-800/30 p-3 rounded-xl flex items-center justify-between border border-gray-700/50">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-500/10 p-2 rounded-full"><CheckCircle size={16} className="text-green-400" /></div>
                                <div>
                                    <div className="text-sm font-bold text-white">{bill.name}</div>
                                    <div className="text-xs text-gray-500">{new Date(bill.dueDate).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-white">₹{bill.totalAmount}</div>
                                <div className="text-[10px] text-green-400">Paid</div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-gray-500 text-sm">No recent payments</div>
                    )}
                </div>
                
                {/* Quick Actions */}
                <div className="mt-6 bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                    <h4 className="text-indigo-300 text-sm font-bold mb-3">Quick Actions</h4>
                    <div className="flex gap-2">
                        <button onClick={() => setShowAddForm(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-2 rounded-lg text-xs font-bold transition">Add Bill</button>
                        <button onClick={() => setShowTaskForm(true)} className="flex-1 bg-pink-600 hover:bg-pink-700 py-2 rounded-lg text-xs font-bold transition">Add Task</button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  };

  const renderBillList = () => {
    const filteredBills = bills.filter(bill => {
      const matchesSearch = bill.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            bill.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isOverdue = !bill.isPaid && new Date(bill.dueDate) < new Date(new Date().setHours(0,0,0,0));
      
      if (filterStatus === 'paid') return matchesSearch && bill.isPaid;
      if (filterStatus === 'pending') return matchesSearch && !bill.isPaid;
      if (filterStatus === 'overdue') return matchesSearch && isOverdue;
      return matchesSearch;
    });

    return (
      <div className="space-y-4 pb-24 animate-in fade-in duration-500">
        <div className="flex gap-2 mb-2 sticky top-0 bg-gray-950/80 backdrop-blur-md z-10 py-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search bills..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>
            <button onClick={() => setShowAddForm(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl shadow-lg transition">
                <Plus size={24} />
            </button>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {['all', 'pending', 'overdue', 'paid'].map(status => (
                <button 
                    key={status}
                    onClick={() => setFilterStatus(status as FilterStatus)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition capitalize ${filterStatus === status ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                    {status}
                </button>
            ))}
        </div>

        {filteredBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
            <div className="bg-gray-800 p-4 rounded-full mb-4">
                <Receipt size={40} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-300">No bills found</h3>
            <p className="text-gray-500 text-sm max-w-xs mt-2">Try adjusting your filters or add your first bill to get started.</p>
            <button onClick={() => setShowAddForm(true)} className="mt-6 text-indigo-400 font-bold text-sm hover:underline">Add New Bill</button>
          </div>
        ) : (
          filteredBills.map(bill => {
            const isOverdue = !bill.isPaid && new Date(bill.dueDate) < new Date(new Date().setHours(0,0,0,0));
            return (
                <div key={bill.id} className={`glass-panel p-5 rounded-2xl border transition-all hover:border-gray-500 ${isOverdue ? 'border-red-500/50 bg-red-900/10' : bill.isPaid ? 'border-green-500/50' : 'border-gray-700'}`}>
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-inner" style={{backgroundColor: CATEGORY_COLORS[bill.category]}}>
                        {bill.category.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg leading-tight">{bill.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">{bill.category}</span>
                            {bill.isRecurring && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded flex items-center gap-1"><Repeat size={10} /> Monthly</span>}
                        </div>
                    </div>
                    </div>
                    <div className="text-right">
                    <div className="text-xl font-bold text-white tracking-tight">₹{bill.totalAmount.toLocaleString()}</div>
                    {bill.minDueAmount > 0 && !bill.isPaid && (
                        <div className="text-xs text-orange-400 font-medium mt-1">Min: ₹{bill.minDueAmount.toLocaleString()}</div>
                    )}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/50">
                    <div className={`flex items-center gap-2 text-sm font-medium ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                        <CalendarIcon size={16} />
                        <span>{isOverdue ? 'Overdue' : 'Due'}: {new Date(bill.dueDate).toLocaleDateString()}</span>
                    </div>

                    <div className="flex gap-1 items-center">
                        {!bill.isPaid && (
                           <button 
                                onClick={() => setBillToPayNow(bill)}
                                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-500/20 mr-1"
                                title="Pay Now via UPI"
                           >
                               <Smartphone size={16} /> Pay Now
                           </button>
                        )}
                        
                        <button 
                             onClick={() => addToGoogleCalendar(`Bill Due: ${bill.name}`, bill.dueDate, `Amount: ₹${bill.totalAmount}`)}
                             className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                             title="Set Device Reminder"
                        >
                            <CalendarIcon size={18} />
                        </button>

                        <button 
                            onClick={() => { setEditingBill(bill); setShowAddForm(true); }}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                            title="Edit"
                        >
                            <Pencil size={18} />
                        </button>
                        
                        <button 
                            onClick={() => setBillToTogglePay(bill)}
                            className={`p-2 rounded-lg transition ${bill.isPaid ? 'text-green-400 hover:bg-green-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                            title={bill.isPaid ? "Mark Unpaid" : "Mark Paid"}
                        >
                            <CheckCircle size={18} className={bill.isPaid ? "fill-green-400/20" : ""} />
                        </button>

                         <button 
                            onClick={() => setBillToDelete(bill.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                            title="Delete"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
                </div>
            );
          })
        )}
      </div>
    );
  };
  
  const renderTasks = () => {
    const sortedTasks = [...tasks].sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    return (
      <div className="space-y-4 pb-24 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-gray-950/80 backdrop-blur-md z-10 py-2">
            <h2 className="text-xl font-bold flex items-center gap-2"><ListTodo className="text-pink-500"/> My Tasks</h2>
            <button onClick={() => setShowTaskForm(true)} className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition flex items-center gap-2">
                <Plus size={18} /> Add Task
            </button>
        </div>
        
        {sortedTasks.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
            <div className="bg-gray-800 p-4 rounded-full mb-4">
                <CheckSquare size={40} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-300">All caught up!</h3>
            <p className="text-gray-500 text-sm max-w-xs mt-2">No pending tasks. Add a new one to stay organized.</p>
           </div>
        ) : (
           sortedTasks.map(task => {
               const isOverdue = !task.isCompleted && new Date(task.dueDate) < new Date();
               return (
                   <div key={task.id} className={`glass-panel p-4 rounded-xl border flex items-center gap-3 transition-all ${task.isCompleted ? 'opacity-50 border-gray-800' : 'border-gray-700 hover:border-pink-500/50'}`}>
                       <button onClick={() => handleToggleTask(task)} className={`shrink-0 transition-colors ${task.isCompleted ? 'text-green-400' : 'text-gray-500 hover:text-pink-500'}`}>
                           {task.isCompleted ? <CheckSquare size={24} /> : <Square size={24} />}
                       </button>
                       <div className="flex-1 min-w-0">
                           <h4 className={`font-bold truncate ${task.isCompleted ? 'line-through text-gray-500' : 'text-white'}`}>{task.title}</h4>
                           <div className="flex items-center gap-3 mt-1">
                               <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                                   <Clock size={12} /> {new Date(task.dueDate).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                               </span>
                               {task.isRecurring && <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded flex items-center gap-1"><Repeat size={10} /> Weekly</span>}
                               {task.reminderDate && <span className="text-[10px] text-indigo-300 flex items-center gap-1"><Bell size={10} /> Set</span>}
                           </div>
                       </div>
                       
                       <div className="flex gap-1 shrink-0">
                            <button 
                                onClick={() => addToGoogleCalendar(`Task: ${task.title}`, task.dueDate, "Paymate Task")}
                                className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg"
                            >
                                <CalendarIcon size={16} />
                            </button>
                           <button onClick={() => { setEditingTask(task); setShowTaskForm(true); }} className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg">
                               <Pencil size={16} />
                           </button>
                           <button onClick={() => setTaskToDelete(task.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg">
                               <Trash2 size={16} />
                           </button>
                       </div>
                   </div>
               );
           })
        )}
      </div>
    );
  }

  const renderReports = () => {
     const total = bills.reduce((sum, b) => sum + b.totalAmount, 0);
     const paid = bills.filter(b => b.isPaid).reduce((sum, b) => sum + b.totalAmount, 0);
     const pending = total - paid;
     const percentage = total > 0 ? Math.round((paid / total) * 100) : 0;
     
     return (
         <div className="space-y-6 pb-24 animate-in fade-in duration-500">
             <div className="flex justify-between items-center mb-2">
                 <h2 className="text-xl font-bold flex items-center gap-2"><PieChart className="text-indigo-500"/> Financial Reports</h2>
                 <div className="flex gap-2">
                     <button onClick={handleExportPDF} className="bg-gray-800 p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition" title="Export PDF"><FileDown size={20}/></button>
                     <button onClick={handleExportExcel} className="bg-gray-800 p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition" title="Export Excel"><FileSpreadsheet size={20}/></button>
                 </div>
             </div>

             <div className="glass-panel p-6 rounded-2xl text-center">
                 <div className="relative w-40 h-40 mx-auto mb-4 flex items-center justify-center">
                     <svg className="w-full h-full transform -rotate-90">
                         <circle cx="80" cy="80" r="70" stroke="#1f2937" strokeWidth="12" fill="none" />
                         <circle cx="80" cy="80" r="70" stroke="#6366f1" strokeWidth="12" fill="none" strokeDasharray="440" strokeDashoffset={440 - (440 * percentage) / 100} className="transition-all duration-1000 ease-out" />
                     </svg>
                     <div className="absolute flex flex-col items-center">
                         <span className="text-4xl font-bold text-white">{percentage}%</span>
                         <span className="text-xs text-gray-400">Paid</span>
                     </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 text-left">
                     <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                         <div className="text-gray-400 text-xs mb-1">Total Paid</div>
                         <div className="text-xl font-bold text-green-400">₹{paid.toLocaleString()}</div>
                     </div>
                     <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                         <div className="text-gray-400 text-xs mb-1">Pending</div>
                         <div className="text-xl font-bold text-red-400">₹{pending.toLocaleString()}</div>
                     </div>
                 </div>
             </div>

             {/* Smart Advice */}
             <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 bg-indigo-900/10">
                 <h3 className="font-bold text-indigo-300 mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2"><Sparkles size={18}/> AI Financial Advice</span>
                    {advice && <button onClick={() => setAdvice('')} className="p-1 hover:bg-white/10 rounded-full"><X size={16}/></button>}
                 </h3>
                 
                 {advice ? (
                     <div className="prose prose-invert prose-sm max-w-none">
                         <p className="whitespace-pre-line text-gray-300 leading-relaxed">{advice}</p>
                     </div>
                 ) : (
                     <div className="text-center py-6">
                         <p className="text-gray-400 text-sm mb-4">Get personalized insights on how to prioritize your bill payments.</p>
                         <button 
                            onClick={generateReport}
                            disabled={loadingAdvice}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold transition flex items-center gap-2 mx-auto disabled:opacity-50"
                         >
                            {loadingAdvice ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                            {loadingAdvice ? 'Analyzing...' : 'Generate Smart Plan'}
                         </button>
                     </div>
                 )}
             </div>
         </div>
     );
  }
  
  const renderSettings = () => {
    return (
        <div className="space-y-6 pb-24 animate-in fade-in duration-500">
             <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><Settings className="text-gray-400"/> Settings</h2>

             {/* Account Section */}
             <div className="glass-panel p-5 rounded-2xl">
                 <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Account</h3>
                 <div className="flex items-center gap-4 mb-6">
                     <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg">
                         {user.name.charAt(0)}
                     </div>
                     <div>
                         <h4 className="font-bold text-white text-lg">{user.name}</h4>
                         <p className="text-gray-400 text-sm">{user.email}</p>
                     </div>
                 </div>
                 <button onClick={onLogout} className="w-full bg-gray-800 hover:bg-red-900/30 text-gray-300 hover:text-red-400 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition">
                     <LogOut size={18} /> Logout
                 </button>
             </div>

             {/* Notifications Section */}
             <div className="glass-panel p-5 rounded-2xl">
                 <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Notifications</h3>
                 
                 <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700/50">
                     <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-lg ${emailNotifications ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-800 text-gray-500'}`}><Mail size={20}/></div>
                         <div>
                            <p className="text-white font-medium">Email Alerts</p>
                            <p className="text-xs text-gray-500">{emailNotifications ? 'Enabled' : 'Disabled'}</p>
                         </div>
                     </div>
                     <button 
                        onClick={toggleEmailNotifications}
                        className={`w-12 h-6 rounded-full transition-colors relative ${emailNotifications ? 'bg-indigo-500' : 'bg-gray-700'}`}
                     >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${emailNotifications ? 'left-7' : 'left-1'}`}></div>
                     </button>
                 </div>
                 
                 <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700/50">
                      <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-lg ${notificationPermission === 'granted' ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}><Bell size={20}/></div>
                         <div>
                            <p className="text-white font-medium">Push Notifications</p>
                            <p className="text-xs text-gray-500">Status: {notificationPermission}</p>
                         </div>
                     </div>
                     {notificationPermission !== 'granted' && (
                         <button onClick={requestNotificationPermission} className="text-indigo-400 text-xs font-bold hover:underline">Enable</button>
                     )}
                 </div>

                 <button onClick={handleTestAlert} disabled={isSendingEmail} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
                     {isSendingEmail ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                     Test Alert / Email
                 </button>
                 
                 {/* Schedule All Reminders */}
                 <button 
                    onClick={() => bills.filter(b => !b.isPaid).forEach(b => addToGoogleCalendar(`Bill Due: ${b.name}`, b.dueDate, `Amount: ₹${b.totalAmount}`))}
                    className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2"
                 >
                     <CalendarIcon size={16} /> Schedule All Reminders
                 </button>
             </div>

             {/* Email Configuration Section */}
             <div className="glass-panel p-5 rounded-2xl">
                  <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex justify-between items-center">
                      Email Configuration
                      <button onClick={() => setShowEmailConfig(!showEmailConfig)} className="text-indigo-400 text-xs font-bold hover:underline">
                          {showEmailConfig ? 'Hide' : 'Edit'}
                      </button>
                  </h3>
                  
                  {showEmailConfig ? (
                      <form onSubmit={saveEmailConfig} className="space-y-4 animate-in fade-in slide-in-from-top-2">
                           {/* Simple Mode (Default) */}
                           <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                               <div className="flex items-center gap-2 mb-2">
                                   <input 
                                     type="radio" 
                                     id="simple" 
                                     name="provider" 
                                     checked={emailConfig.provider === 'simple'}
                                     onChange={() => setEmailConfig({...emailConfig, provider: 'simple'})}
                                     className="text-indigo-500 focus:ring-indigo-500"
                                   />
                                   <label htmlFor="simple" className="text-white font-medium">Simple Mode (Recommended)</label>
                               </div>
                               <p className="text-xs text-gray-400 ml-6 mb-3">Uses FormSubmit. No API keys required. Just activate your email once.</p>
                               
                               {emailConfig.provider === 'simple' && (
                                   <button 
                                      type="button" 
                                      onClick={handleSendActivation}
                                      disabled={isSendingEmail}
                                      className="ml-6 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded transition"
                                   >
                                      Send Activation Email
                                   </button>
                               )}
                           </div>

                           {/* Advanced Mode (EmailJS) */}
                           <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                               <div className="flex items-center gap-2 mb-2">
                                   <input 
                                     type="radio" 
                                     id="emailjs" 
                                     name="provider" 
                                     checked={emailConfig.provider === 'emailjs'}
                                     onChange={() => setEmailConfig({...emailConfig, provider: 'emailjs'})}
                                     className="text-indigo-500 focus:ring-indigo-500"
                                   />
                                   <label htmlFor="emailjs" className="text-white font-medium">Advanced (EmailJS)</label>
                               </div>
                               
                               {emailConfig.provider === 'emailjs' && (
                                   <div className="space-y-3 mt-3 ml-6">
                                       <div>
                                           <label className="block text-xs text-gray-400 mb-1">Service ID</label>
                                           <input 
                                              type="text" 
                                              value={emailConfig.serviceId || ''} 
                                              onChange={e => setEmailConfig({...emailConfig, serviceId: e.target.value})}
                                              className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                                           />
                                       </div>
                                       <div>
                                           <label className="block text-xs text-gray-400 mb-1">Template ID</label>
                                           <input 
                                              type="text" 
                                              value={emailConfig.templateId || ''} 
                                              onChange={e => setEmailConfig({...emailConfig, templateId: e.target.value})}
                                              className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                                           />
                                       </div>
                                       <div>
                                           <label className="block text-xs text-gray-400 mb-1">Public Key</label>
                                           <input 
                                              type="text" 
                                              value={emailConfig.publicKey || ''} 
                                              onChange={e => setEmailConfig({...emailConfig, publicKey: e.target.value})}
                                              className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                                           />
                                       </div>
                                   </div>
                               )}
                           </div>
                           
                           <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold text-sm">Save Configuration</button>
                      </form>
                  ) : (
                      <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${emailConfig.provider === 'simple' ? 'bg-green-400' : 'bg-blue-400'}`}></div>
                          <span className="text-sm text-gray-300">Using {emailConfig.provider === 'simple' ? 'Simple Mode (FormSubmit)' : 'EmailJS'}</span>
                      </div>
                  )}
             </div>
             
             {/* Email History Log */}
             <div className="glass-panel p-5 rounded-2xl">
                 <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2"><History size={16}/> Email History</h3>
                 <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                     {emailHistory.length === 0 ? (
                         <p className="text-xs text-gray-500 italic">No emails sent yet.</p>
                     ) : (
                         emailHistory.map(log => (
                             <div key={log.id} className="flex justify-between items-center text-xs p-2 bg-gray-800/50 rounded border border-gray-700">
                                 <div>
                                     <div className="text-gray-300 font-medium">{log.subject}</div>
                                     <div className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</div>
                                 </div>
                                 <span className={`px-2 py-0.5 rounded ${log.status === 'sent' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                     {log.status}
                                 </span>
                             </div>
                         ))
                     )}
                 </div>
                 <button onClick={() => { localStorage.removeItem('paymate_email_history'); setEmailHistory([]); }} className="text-xs text-gray-500 hover:text-white mt-2 underline">Clear History</button>
             </div>

             {/* Support Section */}
             <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setShowHelp(true)} className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center hover:bg-gray-800/50 transition border border-gray-700">
                     <HelpCircle size={24} className="text-indigo-400 mb-2" />
                     <span className="text-sm font-bold text-gray-300">Help & FAQ</span>
                 </button>
                 <button onClick={() => setShowAbout(true)} className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center hover:bg-gray-800/50 transition border border-gray-700">
                     <Info size={24} className="text-pink-400 mb-2" />
                     <span className="text-sm font-bold text-gray-300">About App</span>
                 </button>
             </div>
             
             {/* Debug/Reset */}
             <div className="text-center">
                <button onClick={() => { localStorage.removeItem(`billmate_alerts_freq_${new Date().toISOString().split('T')[0]}`); setNotification({id:Date.now().toString(), message:"Alert limits cleared", type:"info"}); }} className="text-xs text-gray-600 hover:text-gray-400">
                    Reset Daily Alert Limits (Debug)
                </button>
             </div>
        </div>
    );
  };
  
  const renderAboutModal = () => (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="glass-panel max-w-sm w-full p-6 rounded-2xl relative">
              <button onClick={() => setShowAbout(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
              <div className="flex flex-col items-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/30">
                      <span className="text-3xl font-bold text-white">P</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Paymate</h2>
                  <p className="text-gray-400 text-sm">v1.2.0</p>
              </div>
              <p className="text-gray-300 text-center mb-6 leading-relaxed">
                  Never miss a bill payment again. Organize tasks, get intelligent reminders, and track your financial health in one place.
              </p>
              <div className="space-y-2 text-sm text-gray-400 mb-6">
                  <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-400"/> Smart Bill Scanning and upload</div>
                  <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-400"/> Interactive Dashboard</div>
                  <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-400"/> Google Calendar Integration</div>
                  <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-400"/> AI Financial Advice</div>
              </div>
              <div className="text-center text-xs text-gray-500 border-t border-gray-700 pt-4">
                  Smart bill tracking and Task organizer
              </div>
          </div>
      </div>
  );
  
  const renderHelpModal = () => (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl relative max-h-[80vh] overflow-y-auto">
              <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><HelpCircle/> Help & Support</h2>
              
              <div className="space-y-1">
                  <FAQItem question="How do I scan a bill?" answer="Click 'Add Bill' then tap the camera icon area. You can upload an image or PDF. AI will automatically extract the details." />
                  <FAQItem question="Why aren't I getting emails?" answer="1. Check your Spam folder. 2. Go to Settings > Email Config > Send Activation Email. 3. Click the 'Activate' link sent to your inbox." />
                  <FAQItem question="How do device reminders work?" answer="Click the Calendar icon on any bill. It opens your phone's native calendar app to save a reminder that will ring even if this app is closed." />
                  <FAQItem question="Is my data safe?" answer="Yes. All data is stored locally on your device. We do not have a backend server storing your personal financial data." />
                  <FAQItem question="How do recurring bills work?" answer="Mark a bill as 'Recurring' when adding it. When you mark it as Paid, the app automatically creates a new bill for the next month." />
              </div>
              
              <div className="mt-6 bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-xl text-center">
                  <p className="text-indigo-300 font-bold mb-1">Still need help?</p>
                  <p className="text-gray-400 text-xs">Contact support at support@paymate.app</p>
              </div>
          </div>
      </div>
  );
  
  // Render Smart Payment Modal
  const renderPaymentModal = () => {
    if (!billToPayNow) return null;
    
    const detectedPlatform = detectPaymentPlatform(billToPayNow);
    const paytmUrl = AGGREGATOR_LINKS[billToPayNow.category] || AGGREGATOR_LINKS['default'];
    
    // Determine the Deep Link for the Paytm App
    const paytmAppUrl = PAYTM_APP_LINKS[billToPayNow.category] || PAYTM_APP_LINKS['default'];

    // Check if UPI ID is missing for deep links validation
    const isUpiMissing = !billToPayNow.upiId;

    // Pass Consumer No in Transaction Note for visibility in UPI Apps
    const note = `Bill Pay ${billToPayNow.consumerNumber ? 'Cons:' + billToPayNow.consumerNumber : ''}`;
    
    // Construct UPI Params
    const upiParams = `pa=${billToPayNow.upiId || ''}&pn=${encodeURIComponent(billToPayNow.name)}&am=${billToPayNow.totalAmount}&cu=INR&tn=${encodeURIComponent(note)}`;
    
    const handleCopyDetails = () => {
        if (billToPayNow.consumerNumber) {
            navigator.clipboard.writeText(billToPayNow.consumerNumber);
            setNotification({ id: Date.now().toString(), message: "Consumer Number copied to clipboard!", type: "success" });
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
           <div className="glass-panel p-6 rounded-3xl max-w-sm w-full relative border border-gray-700 bg-gray-900 shadow-2xl overflow-y-auto max-h-[90vh]">
               <button onClick={() => setBillToPayNow(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
               
               <div className="text-center mb-6">
                   <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center mb-3 p-2">
                      <img src="https://cdn-icons-png.flaticon.com/512/825/825506.png" alt="UPI" className="w-full h-full object-contain" />
                   </div>
                   <h2 className="text-2xl font-bold text-white">Pay ₹{billToPayNow.totalAmount}</h2>
                   <p className="text-gray-400 text-sm mt-1">to {billToPayNow.name}</p>
               </div>
               
               {/* BBPS Fetch Section */}
               {(billToPayNow.consumerNumber || billToPayNow.billerId) && (
                   <div className="bg-indigo-900/30 border border-indigo-500/30 p-4 rounded-xl mb-4 text-center animate-in slide-in-from-bottom-2">
                       <h4 className="text-indigo-300 font-bold text-sm mb-1">BBPS Details Found</h4>
                       <p className="text-[10px] text-gray-400 mb-2">Consumer No: {billToPayNow.consumerNumber}</p>
                       <a 
                          href={`upi://pay?${upiParams}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={handleCopyDetails}
                          className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold text-xs transition"
                       >
                           Pay via UPI (ID Copied)
                       </a>
                       <p className="text-[9px] text-gray-500 mt-1">Number copied to clipboard. Paste in app if required.</p>
                   </div>
               )}

               {/* Smart Payment Link (Direct Biller App/Site) */}
               {detectedPlatform && (
                  <div className="mb-2 animate-in slide-in-from-top-2">
                      <a 
                          href={detectedPlatform.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-bold text-center transition shadow-lg flex items-center justify-center gap-2 mb-2"
                      >
                          <Globe size={18} /> Pay on {detectedPlatform.name}
                      </a>
                  </div>
               )}

               {/* Pay via PhonePe App */}
               <div className="mb-2 animate-in slide-in-from-top-2">
                    <a 
                        href={isUpiMissing ? "phonepe://" : `phonepe://pay?${upiParams}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setNotification({id:Date.now().toString(), message:"Opening PhonePe...", type:"info"})}
                        className="block w-full bg-[#5f259f] hover:bg-[#4a1c7c] text-white py-3 rounded-xl font-bold text-center transition shadow-lg flex items-center justify-center gap-2"
                    >
                        <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/phonepe-icon.png" alt="PhonePe" className="w-5 h-5 rounded-md" />
                        Pay via PhonePe App
                    </a>
               </div>

               {/* Pay via Paytm App */}
               <div className="mb-2 animate-in slide-in-from-top-2">
                    <a 
                        href={paytmAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setNotification({id:Date.now().toString(), message:"Opening Paytm App... Please login if prompted.", type:"info"})}
                        className="block w-full bg-gradient-to-r from-[#00baf2] to-[#002e6e] text-white py-3 rounded-xl font-bold text-center transition shadow-lg flex items-center justify-center gap-2"
                    >
                        <img src="https://cdn-icons-png.flaticon.com/512/825/825454.png" alt="Paytm" className="w-5 h-5 filter brightness-0 invert" />
                        Pay via Paytm App
                    </a>
                    <p className="text-center text-[9px] text-gray-500 mt-1">Directly opens {billToPayNow.category} section in app</p>
               </div>

               {/* Pay via Paytm Website (Specific to Category) */}
               <div className="mb-4">
                    <a 
                        href={paytmUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white py-3 rounded-xl font-bold text-center transition shadow-lg flex items-center justify-center gap-2"
                    >
                         <img src="https://cdn-icons-png.flaticon.com/512/825/825454.png" alt="Paytm" className="w-5 h-5" />
                        Pay via Paytm Website
                    </a>
               </div>


               {/* QR Code Section */}
               <div className="bg-white p-4 rounded-xl mb-6 mx-auto w-fit shadow-lg">
                   {isUpiMissing ? (
                       <div className="w-[150px] h-[150px] flex flex-col items-center justify-center text-gray-400 text-xs text-center border-2 border-dashed border-gray-300">
                           <AlertTriangle size={24} className="mb-2 text-orange-400"/>
                           No UPI ID Found
                       </div>
                   ) : (
                       <QRCodeSVG 
                          value={`upi://pay?${upiParams}`}
                          size={150}
                          level="M"
                       />
                   )}
               </div>
               
               <div className="space-y-3">
                   <div className="text-xs text-gray-400 text-center font-bold mb-1 uppercase tracking-wide">Pay via UPI Apps</div>
                   
                   {isUpiMissing && (
                       <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-lg text-xs text-orange-300 text-center mb-2">
                           Biller UPI ID is missing. Edit bill to enable app buttons.
                       </div>
                   )}

                   {/* Specific UPI App Buttons */}
                   <div className={`grid grid-cols-3 gap-2 mb-3 ${isUpiMissing ? 'opacity-50 pointer-events-none' : ''}`}>
                       <a href={`tez://upi/pay?${upiParams}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={() => {
                              handleCopyDetails();
                              setNotification({id:Date.now().toString(), message:"Opening GPay...", type:"info"});
                          }}
                          className="flex flex-col items-center justify-center bg-gray-800 hover:bg-gray-700 p-2 rounded-xl border border-gray-600 transition"
                       >
                           <img src="https://cdn-icons-png.flaticon.com/512/6124/6124998.png" alt="GPay" className="w-8 h-8 mb-1" />
                           <span className="text-[10px] text-gray-300">GPay</span>
                       </a>
                       <a href={`phonepe://pay?${upiParams}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={() => {
                              handleCopyDetails();
                              setNotification({id:Date.now().toString(), message:"Opening PhonePe...", type:"info"});
                          }}
                          className="flex flex-col items-center justify-center bg-gray-800 hover:bg-gray-700 p-2 rounded-xl border border-gray-600 transition"
                       >
                           <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/phonepe-icon.png" alt="PhonePe" className="w-8 h-8 mb-1 rounded-lg" />
                           <span className="text-[10px] text-gray-300">PhonePe</span>
                       </a>
                       <a href={`paytmmp://pay?${upiParams}`}
                           target="_blank" rel="noopener noreferrer"
                           onClick={() => {
                               handleCopyDetails();
                               setNotification({id:Date.now().toString(), message:"Opening Paytm...", type:"info"});
                           }}
                           className="flex flex-col items-center justify-center bg-gray-800 hover:bg-gray-700 p-2 rounded-xl border border-gray-600 transition"
                       >
                           <img src="https://cdn-icons-png.flaticon.com/512/825/825454.png" alt="Paytm" className="w-8 h-8 mb-1" />
                           <span className="text-[10px] text-gray-300">Paytm</span>
                       </a>
                   </div>

                   {/* Generic UPI Button */}
                   <a 
                      href={`upi://pay?${upiParams}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={handleCopyDetails}
                      className={`block w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-bold text-center transition shadow-lg transform active:scale-95 ${isUpiMissing ? 'opacity-50 pointer-events-none' : ''}`}
                   >
                       Open UPI App (Generic)
                   </a>

                   {/* Mark as Paid Button */}
                   <button 
                      onClick={handlePayViaUPI}
                      className="block w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition shadow-lg mt-4"
                   >
                       I Have Paid (Mark Done)
                   </button>
               </div>
           </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 relative">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        
        {/* Main Content Area */}
        {activeTab === 'home' && renderHome()}
        {activeTab === 'bills' && renderBillList()}
        {activeTab === 'tasks' && renderTasks()}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'settings' && renderSettings()}

        {/* Floating Add Button (Mobile Only, visible on Home/Bills) */}
        {(activeTab === 'home' || activeTab === 'bills') && (
            <button 
                onClick={() => setShowAddForm(true)}
                className="fixed bottom-24 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl shadow-indigo-900/50 z-40 md:hidden transition-transform hover:scale-110 active:scale-95"
            >
                <Plus size={28} />
            </button>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-md">
        <div className="glass-panel rounded-full px-6 py-3 flex justify-between items-center shadow-2xl border border-gray-700/50 backdrop-blur-xl">
            <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'home' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}>
                <HomeIcon size={22} className={activeTab === 'home' ? 'fill-indigo-400/20' : ''} />
                <span className="text-[10px] font-medium">Home</span>
            </button>
            <button onClick={() => setActiveTab('bills')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'bills' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}>
                <Receipt size={22} className={activeTab === 'bills' ? 'fill-indigo-400/20' : ''} />
                <span className="text-[10px] font-medium">Bills</span>
            </button>
             <button onClick={() => setActiveTab('tasks')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'tasks' ? 'text-pink-400' : 'text-gray-500 hover:text-gray-300'}`}>
                <ListTodo size={22} className={activeTab === 'tasks' ? 'fill-pink-400/20' : ''} />
                <span className="text-[10px] font-medium">To-Do</span>
            </button>
            <button onClick={() => setActiveTab('reports')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'reports' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}>
                <BarChart2 size={22} className={activeTab === 'reports' ? 'fill-indigo-400/20' : ''} />
                <span className="text-[10px] font-medium">Reports</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'settings' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}>
                <Settings size={22} className={activeTab === 'settings' ? 'fill-indigo-400/20' : ''} />
                <span className="text-[10px] font-medium">Settings</span>
            </button>
        </div>
      </div>

      {/* Modals */}
      {showAddForm && (
        <BillForm 
          userId={user.id} 
          onClose={() => { setShowAddForm(false); setEditingBill(null); }} 
          onSave={handleSaveBill}
          initialData={editingBill || undefined}
        />
      )}
      
      {showTaskForm && (
          <TaskForm 
            userId={user.id}
            onClose={() => { setShowTaskForm(false); setEditingTask(null); }}
            onSave={handleSaveTask}
            initialData={editingTask || undefined}
          />
      )}
      
      {/* Delete Confirmation Modal */}
      {(billToDelete || taskToDelete) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="glass-panel p-6 rounded-2xl max-w-xs w-full text-center border border-gray-700">
                <div className="bg-red-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Item?</h3>
                <p className="text-gray-400 text-sm mb-6">Are you sure you want to delete this? This action cannot be undone.</p>
                <div className="flex gap-3">
                    <button onClick={() => { setBillToDelete(null); setTaskToDelete(null); }} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition">Cancel</button>
                    <button onClick={billToDelete ? handleDeleteBill : handleDeleteTask} className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold transition">Delete</button>
                </div>
            </div>
        </div>
      )}

      {/* Toggle Paid Confirmation Modal */}
      {billToTogglePay && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="glass-panel p-6 rounded-2xl max-w-sm w-full text-center border border-gray-700">
                <div className={`p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 ${billToTogglePay.isPaid ? 'bg-gray-700' : 'bg-green-500/20'}`}>
                    {billToTogglePay.isPaid ? <X size={32} className="text-gray-400" /> : <CheckCircle size={32} className="text-green-500" />}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                    Mark as {billToTogglePay.isPaid ? 'Unpaid' : 'Paid'}?
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                    {billToTogglePay.isPaid 
                        ? "This will mark the bill as pending again." 
                        : "Great job paying this bill off!"}
                </p>
                
                {!billToTogglePay.isPaid && billToTogglePay.isRecurring && (
                    <div className="bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-lg mb-6 text-left">
                        <p className="text-indigo-300 text-xs font-bold flex items-center gap-1 mb-1"><Repeat size={12}/> Recurring Bill Detected</p>
                        <p className="text-gray-400 text-xs">Marking this as paid will <span className="text-white font-bold">automatically create a new bill</span> for next month.</p>
                    </div>
                )}

                <div className="flex gap-3">
                    <button onClick={() => setBillToTogglePay(null)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition">Cancel</button>
                    <button onClick={executeTogglePaid} className={`flex-1 py-2 rounded-lg text-white font-bold transition ${billToTogglePay.isPaid ? 'bg-gray-600 hover:bg-gray-500' : 'bg-green-600 hover:bg-green-700'}`}>
                        Confirm
                    </button>
                </div>
             </div>
          </div>
      )}

      {/* Payment Gateway Modal (UPI & Direct Link) */}
      {renderPaymentModal()}

      {showAbout && renderAboutModal()}
      {showHelp && renderHelpModal()}
      
      <NotificationToast 
        notification={notification} 
        onClose={() => setNotification(null)} 
      />
    </div>
  );
};
