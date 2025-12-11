
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { User, Bill, NotificationItem, BillCategory, Task, EmailLog } from '../types';
import { 
  Plus, CheckCircle, Trash2, LogOut, RefreshCw, 
  CreditCard, Zap, Landmark, Shield, Tv, Receipt, 
  Repeat, AlertTriangle, Home, FileText, Calendar as CalendarIcon, 
  BarChart2, Settings, Search, Bell, User as UserIcon,
  Flame, Droplets, Wifi, Phone, Home as HomeIcon, Volume2, Mail, Smartphone, PieChart,
  Clock, AlertCircle, FileDown, FileSpreadsheet, Pencil, Filter, X, Save, ExternalLink,
  ListTodo, CheckSquare, Square, Info, HelpCircle, ChevronRight, ChevronDown, Copy,
  Loader2, History
} from 'lucide-react';
import { BillForm } from './BillForm';
import { TaskForm } from './TaskForm';
import { NotificationToast } from './NotificationToast';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Props {
  user: User;
  onLogout: () => void;
}

type Tab = 'home' | 'bills' | 'tasks' | 'calendar' | 'reports' | 'settings';
type FilterStatus = 'all' | 'pending' | 'overdue' | 'paid';

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

  useEffect(() => {
    // Load settings
    const storedEmailPref = localStorage.getItem('billmate_email_pref');
    if (storedEmailPref !== null) {
      setEmailNotifications(JSON.parse(storedEmailPref));
    }
    
    // Load Email History
    const history = localStorage.getItem('paymate_email_history');
    if (history) {
        setEmailHistory(JSON.parse(history));
    }
    
    loadBills();
    loadTasks();

    // Check alerts periodically (every minute)
    const interval = setInterval(() => {
      // Re-read settings inside interval to get fresh value if it changed
      const currentEmailPref = localStorage.getItem('billmate_email_pref');
      const isEnabled = currentEmailPref !== null ? JSON.parse(currentEmailPref) : true;
      
      // Check Tasks
      checkTaskDueDates(storageService.getTasks(user.id), isEnabled);
      
      // Check Bills (now supports twice daily checks)
      checkDueDates(storageService.getBills(user.id), isEnabled);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const loadBills = () => {
    const userBills = storageService.getBills(user.id);
    setBills(userBills);
    const storedEmailPref = localStorage.getItem('billmate_email_pref');
    const isEmailEnabled = storedEmailPref !== null ? JSON.parse(storedEmailPref) : true;
    checkDueDates(userBills, isEmailEnabled);
  };

  const loadTasks = () => {
    const userTasks = storageService.getTasks(user.id);
    setTasks(userTasks);
    // Initial check
    const storedEmailPref = localStorage.getItem('billmate_email_pref');
    const isEmailEnabled = storedEmailPref !== null ? JSON.parse(storedEmailPref) : true;
    checkTaskDueDates(userTasks, isEmailEnabled);
  };

  const saveEmailLog = (subject: string, status: 'sent' | 'failed') => {
      const newLog: EmailLog = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          recipient: user.email,
          subject: subject,
          status: status
      };
      
      const updatedHistory = [newLog, ...emailHistory].slice(0, 50); // Keep last 50
      setEmailHistory(updatedHistory);
      localStorage.setItem('paymate_email_history', JSON.stringify(updatedHistory));
  };

  const sendRealEmail = async (subject: string, message: string, detailAmount: string, detailDate: string) => {
    if (!user.email || !user.email.includes('@')) {
        console.warn("Invalid email address for user");
        return false;
    }

    // Sanitize email
    const recipient = user.email.trim();

    try {
      console.log(`Attempting to send email to ${recipient}...`);
      
      const payload = {
            _subject: subject,
            _template: 'table',
            _captcha: "false", // Must be string "false" for some APIs, CRITICAL to skip captcha
            _honey: "", // Anti-spam field, leave empty
            // Data Fields
            "Alert Details": message,
            "Amount Due": `₹${detailAmount}`,
            "Due Date": detailDate,
            "Sent Via": "Paymate App"
      };

      const response = await fetch(`https://formsubmit.co/ajax/${recipient}`, {
        method: "POST",
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      console.log("Email Result:", result);
      
      if (response.ok) {
          saveEmailLog(subject, 'sent');
          return true;
      } else {
          console.error("Email API Error:", result);
          saveEmailLog(subject, 'failed');
          return false;
      }
    } catch (error) {
      console.error("Email Network Error:", error);
      saveEmailLog(subject, 'failed');
      return false;
    }
  };

  const checkDueDates = async (currentBills: Bill[], isEmailEnabled: boolean) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Key structure change: We now store object { [billId]: { count: number, lastAlertTime: number } }
    // Using a new key suffix 'freq' to avoid conflicts with old array-based data
    const alertKey = `billmate_alerts_freq_${todayStr}`;
    
    interface DailyAlertRecord {
        count: number;
        lastAlertTime: number;
    }
    
    let dailyRecords: Record<string, DailyAlertRecord> = {};
    try {
        const stored = localStorage.getItem(alertKey);
        if (stored) {
            dailyRecords = JSON.parse(stored);
        }
    } catch {
        dailyRecords = {};
    }

    const sortedBills = [...currentBills].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    let alertTriggered = false;
    const now = Date.now();
    const MIN_ALERT_GAP = 4 * 60 * 60 * 1000; // 4 Hours minimum gap between alerts

    for (const bill of sortedBills) {
      if (bill.isPaid) continue;

      const record = dailyRecords[bill.id] || { count: 0, lastAlertTime: 0 };
      
      // If we have alerted 2 or more times today, skip
      if (record.count >= 2) continue;

      // Check if enough time has passed since last alert (if not first alert)
      if (record.count > 0 && (now - record.lastAlertTime < MIN_ALERT_GAP)) continue;

      // Robust Date Comparison
      const due = new Date(bill.dueDate);
      due.setHours(0, 0, 0, 0);
      
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let message = '';
      let type: 'warning' | 'info' = 'info';

      // Check strict strings for today to avoid timezone edge cases
      const isDueToday = bill.dueDate === todayStr;

      if (diffDays < 0) {
        message = `OVERDUE: ${bill.name} was due on ${bill.dueDate}!`;
        type = 'warning';
      } else if (isDueToday || diffDays === 0) {
        message = `URGENT: ${bill.name} is due TODAY!`;
        type = 'warning';
      } else if (diffDays === 1) {
        message = `Reminder: ${bill.name} is due tomorrow.`;
        type = 'info';
      } else if (diffDays > 1 && diffDays <= 3) {
        message = `Upcoming: ${bill.name} is due in ${diffDays} days.`;
        type = 'info';
      }

      if (message) {
        // Append retry count info to log or message if needed, but keeping UI clean
        let emailSent = false;
        if (isEmailEnabled) {
             const success = await sendRealEmail(`Bill Alert: ${bill.name}`, message, bill.totalAmount.toString(), bill.dueDate);
             if (success) emailSent = true;
        }
        
        if (Notification.permission === "granted") {
          new Notification("Paymate Alert", {
            body: message,
            icon: "https://cdn-icons-png.flaticon.com/512/10543/10543329.png"
          });
        }
        
        setNotification({
          id: Date.now().toString(),
          message: `${message}${emailSent ? ` (Email sent)` : ''}`,
          type
        });

        // Update record
        dailyRecords[bill.id] = {
            count: record.count + 1,
            lastAlertTime: now
        };
        
        alertTriggered = true;
        break; // Crucial: Stop after one alert to avoid machine-gun effect. Next pass (in 1 min) will check next bill if applicable.
      }
    }

    if (alertTriggered) {
        localStorage.setItem(alertKey, JSON.stringify(dailyRecords));
    }
  };

  const checkTaskDueDates = async (currentTasks: Task[], isEmailEnabled: boolean) => {
    const now = new Date();
    
    // Store alerts as composite keys: 'taskId_reminder' or 'taskId_due'
    const notifiedKey = 'paymate_task_alerts';
    let notifiedItems: string[] = [];
    try {
        notifiedItems = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
    } catch {
        notifiedItems = [];
    }

    let updatedNotified = false;

    for (const task of currentTasks) {
      if (task.isCompleted) continue;

      const due = new Date(task.dueDate);
      let triggered = false;
      
      // 1. Check Specific Reminder
      if (task.reminderDate) {
          const remindAt = new Date(task.reminderDate);
          const reminderId = `${task.id}_reminder`;
          
          if (now >= remindAt && !notifiedItems.includes(reminderId) && now < due) {
             const message = `Reminder: ${task.title} is coming up at ${due.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
             
             let emailSent = false;
             if (isEmailEnabled) {
                const success = await sendRealEmail(`Task Reminder: ${task.title}`, message, "-", task.dueDate.replace('T', ' '));
                if (success) emailSent = true;
             }

             if (Notification.permission === "granted") {
                new Notification("Task Reminder", {
                    body: message,
                    icon: "https://cdn-icons-png.flaticon.com/512/10543/10543329.png"
                });
             }

             setNotification({
                id: Date.now().toString(),
                message: `${message}${emailSent ? ' (Email sent)' : ''}`,
                type: 'info'
             });

             notifiedItems.push(reminderId);
             updatedNotified = true;
             triggered = true;
          }
      }

      // 2. Check Actual Due Date (Due Now / Overdue)
      // Only check if we haven't already triggered the reminder for this same task in this loop cycle
      if (!triggered) {
        const dueId = `${task.id}_due`;
        if (now >= due && !notifiedItems.includes(dueId)) {
            const message = `Task Due Now: ${task.title}`;
            
            let emailSent = false;
            if (isEmailEnabled) {
                const success = await sendRealEmail(`Task Due: ${task.title}`, message, "-", task.dueDate.replace('T', ' '));
                if (success) emailSent = true;
            }

            if (Notification.permission === "granted") {
                new Notification("Task Due", {
                    body: message,
                    icon: "https://cdn-icons-png.flaticon.com/512/10543/10543329.png"
                });
            }

            setNotification({
                id: Date.now().toString(),
                message: `${message}${emailSent ? ` (Email sent)` : ''}`,
                type: 'warning'
            });

            notifiedItems.push(dueId);
            updatedNotified = true;
            triggered = true;
        }
      }

      // Important: Stop after finding ONE alert to play. 
      // This prevents 10 tasks from stacking 10 notification sounds instantly.
      if (triggered) {
          break;
      }
    }

    if (updatedNotified) {
      localStorage.setItem(notifiedKey, JSON.stringify(notifiedItems));
    }
  };

  const toggleEmailNotifications = () => {
      const newValue = !emailNotifications;
      setEmailNotifications(newValue);
      localStorage.setItem('billmate_email_pref', JSON.stringify(newValue));
      setNotification({
          id: Date.now().toString(),
          message: `Email notifications ${newValue ? 'enabled' : 'disabled'}`,
          type: 'info'
      });
  };
  
  const requestNotificationPermission = () => {
    if (!("Notification" in window)) {
      setNotification({ id: Date.now().toString(), message: "This browser does not support notifications.", type: "warning" });
      return;
    }
    
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            setNotification({ id: Date.now().toString(), message: "Push notifications enabled!", type: "success" });
        } else {
             setNotification({ id: Date.now().toString(), message: "Notifications blocked.", type: "warning" });
        }
    });
  };

  const handleTestAlert = async () => {
    const msg = 'This is a test alert from Paymate.';
    
    if (Notification.permission === "granted") {
       new Notification("Paymate Test", { body: msg, icon: "https://cdn-icons-png.flaticon.com/512/10543/10543329.png" });
    }

    if (emailNotifications) {
         setNotification({ id: Date.now().toString(), message: 'Sending test email to ' + user.email + '...', type: 'info' });
         setIsSendingEmail(true);
         const success = await sendRealEmail("Test Alert", "This is a test email from Paymate to verify your setup.", "0.00", new Date().toISOString().split('T')[0]);
         setIsSendingEmail(false);
         
         if (success) {
            setNotification({ id: Date.now().toString(), message: 'Email Sent! Check your SPAM folder for "Activate FormSubmit".', type: 'success' });
         } else {
             setNotification({ id: Date.now().toString(), message: 'Test email failed. Check settings/network.', type: 'warning' });
         }
    } else {
         setNotification({ id: Date.now().toString(), message: 'Test audio alert played (Email disabled)', type: 'info' });
    }
  };

  const resetDailyAlerts = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.removeItem(`billmate_alerts_freq_${todayStr}`); // Clear new key
    localStorage.removeItem(`paymate_task_alerts`);
    setEmailHistory([]); // Clear history
    localStorage.removeItem('paymate_email_history');
    setNotification({
        id: Date.now().toString(),
        message: 'Alert & Email history cleared.',
        type: 'success'
    });
  };

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  // --- Bill Handlers ---
  const handleSaveBill = (bill: Bill) => {
    if (editingBill) {
      storageService.updateBill(bill);
      setNotification({ id: Date.now().toString(), message: 'Bill updated successfully', type: 'success' });
    } else {
      storageService.saveBill(bill);
      setNotification({ id: Date.now().toString(), message: 'Bill added successfully', type: 'success' });
    }
    loadBills();
    setShowAddForm(false);
    setEditingBill(null);
  };

  const handleMarkPaid = (bill: Bill) => {
    const isPaying = !bill.isPaid;
    const updated = { ...bill, isPaid: isPaying };
    storageService.updateBill(updated);

    if (isPaying && bill.isRecurring) {
        const nextDate = new Date(bill.dueDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
        const nextDueDateStr = nextDate.toISOString().split('T')[0];
        const newBill: Bill = { ...bill, id: generateId(), dueDate: nextDueDateStr, isPaid: false };
        storageService.saveBill(newBill);
        setNotification({ id: Date.now().toString(), message: `Recurring bill created for next month`, type: 'success' });
    }
    loadBills();
  };

  const confirmDeleteBill = () => {
    if (billToDelete) {
      storageService.deleteBill(billToDelete);
      setBillToDelete(null);
      loadBills();
      setNotification({ id: Date.now().toString(), message: 'Bill deleted', type: 'info' });
    }
  };

  // --- Task Handlers ---
  const handleSaveTask = (task: Task) => {
    if (editingTask) {
      storageService.updateTask(task);
      setNotification({ id: Date.now().toString(), message: 'Task updated', type: 'success' });
    } else {
      storageService.saveTask(task);
      setNotification({ id: Date.now().toString(), message: 'Task added', type: 'success' });
    }
    loadTasks();
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleToggleTask = (task: Task) => {
    const updated = { ...task, isCompleted: !task.isCompleted };
    storageService.updateTask(updated);
    loadTasks();
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      storageService.deleteTask(taskToDelete);
      setTaskToDelete(null);
      loadTasks();
      setNotification({ id: Date.now().toString(), message: 'Task deleted', type: 'info' });
    }
  };

  // --- UI Helpers ---
  const getBillStatus = (bill: Bill) => {
    if (bill.isPaid) return { color: 'green', text: 'PAID', border: 'border-green-500/50', badge: 'bg-green-500/20 text-green-300', bg: 'bg-green-500/5 opacity-70', icon: CheckCircle };
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(bill.dueDate);
    due.setHours(0,0,0,0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: 'red', text: `Overdue (${Math.abs(diffDays)}d)`, border: 'border-red-500', badge: 'bg-red-500/20 text-red-300', bg: 'bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]', icon: AlertCircle };
    if (diffDays === 0) return { color: 'orange', text: 'Due Today', border: 'border-orange-500', badge: 'bg-orange-500/20 text-orange-300', bg: 'bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.1)]', icon: AlertTriangle };
    if (diffDays === 1) return { color: 'yellow', text: 'Due Tomorrow', border: 'border-yellow-500', badge: 'bg-yellow-500/20 text-yellow-300', bg: 'bg-yellow-500/5', icon: Clock };
    if (diffDays <= 3) return { color: 'yellow', text: `Due in ${diffDays}d`, border: 'border-yellow-500', badge: 'bg-yellow-500/20 text-yellow-300', bg: 'bg-yellow-500/5', icon: Clock };
    
    return { color: 'indigo', text: '', border: 'border-indigo-500/30', badge: '', bg: 'hover:bg-white/5', icon: null };
  };

  const getCategoryIcon = (category: BillCategory) => {
    const iconProps = { size: 20 };
    switch (category) {
      case 'Credit Card': return <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400"><CreditCard {...iconProps} /></div>;
      case 'Electricity': return <div className="p-2 rounded-xl bg-yellow-500/20 text-yellow-400"><Zap {...iconProps} /></div>;
      case 'Gas': return <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400"><Flame {...iconProps} /></div>;
      case 'Water': return <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400"><Droplets {...iconProps} /></div>;
      case 'Internet': return <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400"><Wifi {...iconProps} /></div>;
      case 'Telephone': return <div className="p-2 rounded-xl bg-green-500/20 text-green-400"><Phone {...iconProps} /></div>;
      case 'Insurance': return <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400"><Shield {...iconProps} /></div>;
      case 'Rent': return <div className="p-2 rounded-xl bg-red-500/20 text-red-400"><HomeIcon {...iconProps} /></div>;
      case 'Subscription': return <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400"><RefreshCw {...iconProps} /></div>;
      case 'Loan': return <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400"><Landmark {...iconProps} /></div>;
      default: return <div className="p-2 rounded-xl bg-gray-500/20 text-gray-400"><Receipt {...iconProps} /></div>;
    }
  };

  // --- Modal Renders ---
  const renderAboutModal = () => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 relative flex flex-col items-center text-center max-h-[80vh] overflow-y-auto">
         <button onClick={() => setShowAbout(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
         
         <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mb-4 shadow-xl shadow-indigo-500/20">P</div>
         <h2 className="text-2xl font-bold text-white mb-1">Paymate</h2>
         <p className="text-indigo-400 text-sm font-medium mb-6">Smart Bill Tracking Manager</p>
  
         <div className="space-y-4 text-sm text-gray-300 text-left w-full bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
           <p><strong className="text-white">Version:</strong> 1.2.0 (PWA Enabled)</p>
           <p className="leading-relaxed">Paymate helps you organize your financial life by tracking bills, managing tasks, and providing intelligent insights to ensure you never miss a payment.</p>
           
           <h4 className="font-bold text-white mt-4 mb-2">Key Features:</h4>
           <ul className="list-disc pl-5 space-y-1 text-gray-400">
             <li>Smart Bill Scanning and upload</li>
             <li>Audio & Email Alerts for Due Dates</li>
             <li>Interactive Financial Reports</li>
             <li>To-Do List with Reminders</li>
             <li>Interactive Dashboard</li>
           </ul>
         </div>
  
         <div className="mt-6 pt-6 border-t border-gray-700 w-full">
           <p className="text-xs text-gray-500">© 2024 Paymate Inc.</p>
           <p className="text-xs text-gray-600 mt-1">Smart bill tracking and Task organizer</p>
         </div>
      </div>
    </div>
  );
  
  const renderHelpModal = () => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
       <div className="glass-panel w-full max-w-lg rounded-2xl p-6 relative max-h-[85vh] overflow-y-auto">
         <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
         <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><HelpCircle size={28} className="text-pink-400" /> Help & Support</h2>
  
         <div className="space-y-1 mb-8">
           <h3 className="font-bold text-white mb-3 text-lg">Frequently Asked Questions</h3>
           <FAQItem question="How do I scan a bill?" answer="Go to the Bills tab and click the '+' button. In the form, tap the 'Scan Bill' box to take a photo or upload a PDF. Our AI will automatically extract the details for you." />
           <FAQItem question="Why are email alerts not working?" answer="We use a secure service to send alerts to your registered email. Check your inbox (and spam folder) for an 'Action Required' or 'Activate FormSubmit' email. You must click 'Activate' once for the first email to start receiving alerts." />
           <FAQItem question="Is my data secure?" answer="Yes! Paymate stores all your financial data locally on your device using LocalStorage. We do not have a backend database, so your private information never leaves your phone unless you enable email alerts." />
           <FAQItem question="How do I install the app?" answer="On Android, tap 'Install' when prompted or use the Chrome menu 'Install App'. On iOS, tap the 'Share' button in Safari and select 'Add to Home Screen'." />
            <FAQItem question="How do recurring bills work?" answer="When adding a bill, check 'Repeat Monthly'. Once you mark that bill as 'Paid', a new bill for the next month is automatically created with the same details." />
         </div>
  
         <div className="bg-gray-800/50 p-5 rounded-xl border border-gray-700/50">
           <h3 className="font-bold text-white mb-2">Need more help?</h3>
           <p className="text-sm text-gray-400 mb-4">If you encounter any bugs or have feature requests, please reach out to our support team.</p>
           <button className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition flex items-center justify-center gap-2 shadow-lg">
             <Mail size={18} /> Contact Support
           </button>
         </div>
       </div>
    </div>
  );

  // --- Render Sections ---
  const renderHome = () => {
    // Basic stats calculation reuse
    const unpaidBills = bills.filter(b => !b.isPaid);
    const totalDue = unpaidBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const overdueCount = unpaidBills.filter(b => new Date(b.dueDate) < new Date(new Date().setHours(0,0,0,0))).length;
    const upcomingCount = unpaidBills.filter(b => new Date(b.dueDate) >= new Date(new Date().setHours(0,0,0,0))).length;

    const today = new Date();
    const currentMonthBills = bills.filter(b => new Date(b.dueDate).getMonth() === today.getMonth() && new Date(b.dueDate).getFullYear() === today.getFullYear());
    const paidThisMonthCount = currentMonthBills.filter(b => b.isPaid).length;
    const paidThisMonthAmount = currentMonthBills.filter(b => b.isPaid).reduce((sum, b) => sum + b.totalAmount, 0);

    const categoriesList: BillCategory[] = ['Credit Card', 'Electricity', 'Gas', 'Telephone', 'Water', 'Internet', 'Insurance', 'Rent', 'Subscription'];
    const getCategoryStats = (cat: BillCategory) => {
        const catBills = unpaidBills.filter(b => b.category === cat);
        return { count: catBills.length, amount: catBills.reduce((s, b) => s + b.totalAmount, 0) };
    };

    return (
     <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="mb-2">
        <h2 className="text-3xl font-bold text-white">Welcome back!</h2>
        <p className="text-gray-400">Here's your summary for this month.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-indigo-500 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2"><BarChart2 size={18} className="text-indigo-400" /><span className="text-gray-400 text-sm font-medium">Total Due</span></div>
          <div className="text-2xl font-bold text-white">₹{totalDue.toLocaleString('en-IN')}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-red-500 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={18} className="text-red-400" /><span className="text-gray-400 text-sm font-medium">Overdue</span></div>
          <div className="text-2xl font-bold text-red-400">{overdueCount}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-blue-500 flex flex-col justify-between">
           <div className="flex items-center gap-2 mb-2"><CalendarIcon size={18} className="text-blue-400" /><span className="text-gray-400 text-sm font-medium">Upcoming</span></div>
          <div className="text-2xl font-bold text-blue-400">{upcomingCount}</div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl">
         <div className="flex items-center gap-2 mb-4"><BarChart2 size={18} className="text-indigo-400" /><span className="font-semibold text-white">This Month</span></div>
         <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 p-4 rounded-xl text-center">
              <div className="flex justify-center mb-2 text-green-400"><CheckCircle size={24} /></div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">Bills Paid</div>
              <div className="text-2xl font-bold text-white mt-1">{paidThisMonthCount}</div>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-xl text-center">
              <div className="flex justify-center mb-2 text-blue-400"><Landmark size={24} /></div>
               <div className="text-xs text-gray-400 uppercase tracking-wider">Amount Paid</div>
              <div className="text-2xl font-bold text-blue-400 mt-1">₹{paidThisMonthAmount.toLocaleString('en-IN')}</div>
            </div>
         </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-xl font-bold text-white">Categories</h3>
          <button onClick={() => setActiveTab('bills')} className="text-sm text-indigo-400 hover:text-indigo-300">View all</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categoriesList.map(cat => {
            const stats = getCategoryStats(cat);
            return (
              <div key={cat} className="glass-panel p-4 rounded-2xl hover:bg-white/5 transition cursor-pointer" onClick={() => setActiveTab('bills')}>
                <div className="flex items-start justify-between mb-3">{getCategoryIcon(cat)}</div>
                <h4 className="text-sm font-medium text-white mb-1">{cat}</h4>
                <p className="text-xs text-gray-400">{stats.count === 0 ? '0 bills' : `${stats.count} bill${stats.count > 1 ? 's' : ''} • ₹${stats.amount.toLocaleString('en-IN')}`}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    );
  };

  const renderBillList = () => {
    const filteredBills = bills.filter(bill => {
      const matchesSearch = bill.name.toLowerCase().includes(searchQuery.toLowerCase()) || bill.category.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesFilter = true;
      if (filterStatus === 'paid') matchesFilter = bill.isPaid;
      else if (filterStatus === 'pending') matchesFilter = !bill.isPaid;
      else if (filterStatus === 'overdue') {
        const today = new Date();
        today.setHours(0,0,0,0);
        matchesFilter = !bill.isPaid && new Date(bill.dueDate) < today;
      }
      return matchesSearch && matchesFilter;
    });

    const FilterChip = ({ label, status, active }: { label: string, status: FilterStatus, active: boolean }) => (
      <button onClick={() => setFilterStatus(status)} className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{label}</button>
    );

    return (
      <div className="space-y-4 animate-in fade-in duration-500 pb-24">
         <div className="flex justify-between items-center mb-2"><h2 className="text-2xl font-bold">Your Bills</h2><div className="text-sm text-gray-400">{filteredBills.length} found</div></div>
         <div className="relative mb-2">
            <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
            <input type="text" placeholder="Search by name or category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-3 pl-10 pr-10 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition" />
            {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute right-3 top-3.5 text-gray-400 hover:text-white"><X size={18} /></button>)}
         </div>
         <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <FilterChip label="All Bills" status="all" active={filterStatus === 'all'} />
            <FilterChip label="Pending" status="pending" active={filterStatus === 'pending'} />
            <FilterChip label="Overdue" status="overdue" active={filterStatus === 'overdue'} />
            <FilterChip label="Paid" status="paid" active={filterStatus === 'paid'} />
         </div>

         {filteredBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center glass-panel rounded-2xl border border-gray-700/50">
                <div className="bg-gray-800/80 p-6 rounded-full mb-4 shadow-lg ring-1 ring-white/10"><Receipt size={48} className="text-indigo-400 opacity-80" /></div>
                {bills.length === 0 ? (
                  <>
                    <h3 className="text-xl font-bold text-white mb-2">No bills found</h3>
                    <p className="text-gray-400 max-w-xs mx-auto mb-6 text-sm leading-relaxed">You haven't added any bills yet.</p>
                    <button onClick={() => { setEditingBill(null); setShowAddForm(true); }} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium transition shadow-lg shadow-indigo-500/25 transform hover:-translate-y-0.5"><Plus size={18} strokeWidth={2.5} /><span>Add First Bill</span></button>
                  </>
                ) : (
                  <><h3 className="text-xl font-bold text-white mb-2">No matching bills</h3><button onClick={() => { setSearchQuery(''); setFilterStatus('all'); }} className="mt-4 text-indigo-400 hover:text-indigo-300 font-medium">Clear Filters</button></>
                )}
              </div>
            ) : (
              filteredBills.map(bill => {
                const status = getBillStatus(bill);
                const StatusIcon = status.icon;
                return (
                  <div key={bill.id} className={`glass-panel p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 border-l-4 ${status.border} ${status.bg} hover:scale-[1.01]`}>
                    <div className="flex-1 w-full sm:w-auto flex items-start gap-4">
                      <div className="mt-1 flex-shrink-0 transform transition-transform group-hover:scale-110">{getCategoryIcon(bill.category)}</div>
                      <div>
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h3 className={`font-bold text-lg ${bill.isPaid ? 'line-through text-gray-400' : 'text-white'}`}>{bill.name}</h3>
                          {status.text && (<span className={`${status.badge} text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex items-center gap-1.5`}>{StatusIcon && <StatusIcon size={12} strokeWidth={2.5} />}{status.text}</span>)}
                          {bill.isRecurring && !bill.isPaid && (<span className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full" title="Recurring Monthly"><Repeat size={10} /></span>)}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-300">
                          <span className="bg-white/5 px-2 py-0.5 rounded text-xs text-gray-400">{bill.category}</span>
                          <span className="font-medium">₹{bill.totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className={`text-xs mt-2 font-medium flex items-center gap-1 ${status.color === 'red' ? 'text-red-400' : status.color === 'orange' ? 'text-orange-400' : status.color === 'yellow' ? 'text-yellow-400' : 'text-indigo-300'}`}><CalendarIcon size={12} /><span>Due: {new Date(bill.dueDate).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <button onClick={() => handleMarkPaid(bill)} title={bill.isPaid ? "Mark as Unpaid" : "Mark as Paid"} className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-110 ${bill.isPaid ? 'bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/40' : 'bg-green-600/20 text-green-500 hover:bg-green-600/40 shadow-lg shadow-green-900/20'}`}>{bill.isPaid ? <RefreshCw size={20} /> : <CheckCircle size={20} />}</button>
                      <button onClick={() => { setEditingBill(bill); setShowAddForm(true); }} className="p-2 rounded-lg bg-blue-600/20 text-blue-500 hover:bg-blue-600/40 transition-all duration-200 transform hover:scale-110"><Pencil size={20} /></button>
                      <button onClick={() => setBillToDelete(bill.id)} className="p-2 rounded-lg bg-red-600/20 text-red-500 hover:bg-red-600/40 transition-all duration-200 transform hover:scale-110"><Trash2 size={20} /></button>
                    </div>
                  </div>
                );
              })
            )}
      </div>
    );
  };

  const renderTasks = () => {
    return (
      <div className="space-y-4 animate-in fade-in duration-500 pb-24">
        <div className="flex justify-between items-center mb-4">
           <div>
            <h2 className="text-2xl font-bold">To-Do List</h2>
            <p className="text-gray-400 text-sm">Manage your day to day activities</p>
           </div>
           <button onClick={() => { setEditingTask(null); setShowTaskForm(true); }} className="bg-pink-600 hover:bg-pink-500 text-white p-2.5 rounded-xl shadow-lg shadow-pink-600/30 transition-transform active:scale-95"><Plus size={20} /></button>
        </div>

        {tasks.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-16 px-6 text-center glass-panel rounded-2xl border border-gray-700/50">
             <div className="bg-gray-800/80 p-6 rounded-full mb-4 shadow-lg ring-1 ring-white/10"><ListTodo size={48} className="text-pink-400 opacity-80" /></div>
             <h3 className="text-xl font-bold text-white mb-2">No tasks yet</h3>
             <p className="text-gray-400 max-w-xs mx-auto mb-6 text-sm">Add tasks to keep track of your daily activities.</p>
           </div>
        ) : (
          tasks.map(task => {
            const isDueSoon = !task.isCompleted && new Date(task.dueDate) <= new Date(Date.now() + 3600000); // 1 hour
            const isOverdue = !task.isCompleted && new Date(task.dueDate) < new Date();
            const hasReminder = !!task.reminderDate && !task.isCompleted;

            return (
              <div key={task.id} className={`glass-panel p-4 rounded-xl flex items-center justify-between gap-4 border-l-4 ${task.isCompleted ? 'border-green-500/30 opacity-60' : isOverdue ? 'border-red-500 bg-red-500/5' : 'border-pink-500'} transition-all hover:bg-white/5`}>
                 <div className="flex items-center gap-4 flex-1">
                    <button onClick={() => handleToggleTask(task)} className={`p-2 rounded-lg transition-colors ${task.isCompleted ? 'text-green-400 bg-green-500/10' : 'text-gray-500 hover:text-pink-400'}`}>
                       {task.isCompleted ? <CheckSquare size={24} /> : <Square size={24} />}
                    </button>
                    <div>
                        <h3 className={`font-medium text-lg ${task.isCompleted ? 'line-through text-gray-500' : 'text-white'}`}>{task.title}</h3>
                        <div className="flex flex-col gap-1 mt-1">
                            <div className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                                <Clock size={12} />
                                {new Date(task.dueDate).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                {isOverdue && !task.isCompleted && " (Overdue)"}
                            </div>
                            {hasReminder && (
                                <div className="text-[10px] flex items-center gap-1 text-indigo-300">
                                    <Bell size={10} />
                                    Alert: {new Date(task.reminderDate!).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                        </div>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => { setEditingTask(task); setShowTaskForm(true); }} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg"><Pencil size={18} /></button>
                    <button onClick={() => setTaskToDelete(task.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={18} /></button>
                 </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderReports = () => {
    // ... reused logic for reports
    if (bills.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6 animate-in fade-in zoom-in duration-300">
                <div className="bg-gray-800/50 p-8 rounded-full mb-6 ring-1 ring-white/5"><BarChart2 size={64} className="text-gray-600" /></div>
                <h3 className="text-xl font-bold text-white mb-2">No Reports Yet</h3>
                <p className="text-gray-400 max-w-sm text-sm">Add bills to see your financial insights and spending trends here.</p>
            </div>
        );
    }
    const totalPaid = bills.filter(b => b.isPaid).reduce((acc, b) => acc + b.totalAmount, 0);
    const totalPending = bills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.totalAmount, 0);
    const grandTotal = totalPaid + totalPending;
    const categoryStats: { category: string; amount: number; percentage: number }[] = [];
    const catMap = new Map<string, number>();
    bills.forEach(b => catMap.set(b.category, (catMap.get(b.category) || 0) + b.totalAmount));
    catMap.forEach((amount, category) => categoryStats.push({ category, amount, percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0 }));
    categoryStats.sort((a, b) => b.amount - a.amount);
    const topCategories = categoryStats.slice(0, 5);
    const monthlyTrends = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthBills = bills.filter(b => { const [yStr, mStr] = b.dueDate.split('-'); return parseInt(mStr) - 1 === d.getMonth() && parseInt(yStr) === d.getFullYear(); });
        monthlyTrends.push({ label: d.toLocaleString('default', { month: 'short' }), amount: monthBills.reduce((sum, b) => sum + b.totalAmount, 0) });
    }
    const maxTrend = Math.max(...monthlyTrends.map(t => t.amount), 100);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-24">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Financial Reports</h2>
                <div className="flex gap-2">
                    <button onClick={() => { /* Reuse handlers */ }} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"><FileDown size={20} /></button>
                    <button onClick={() => { /* Reuse handlers */ }} className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all"><FileSpreadsheet size={20} /></button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-green-500"><p className="text-gray-400 text-xs uppercase tracking-wider font-bold">Total Paid</p><p className="text-2xl font-bold text-green-400 mt-1">₹{totalPaid.toLocaleString('en-IN')}</p></div>
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-orange-500"><p className="text-gray-400 text-xs uppercase tracking-wider font-bold">Pending</p><p className="text-2xl font-bold text-orange-400 mt-1">₹{totalPending.toLocaleString('en-IN')}</p></div>
            </div>
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><BarChart2 size={20} className="text-indigo-400"/> Monthly Spending</h3>
                <div className="flex items-end justify-between h-40 gap-2">
                    {monthlyTrends.map((item, idx) => (
                        <div key={idx} className="flex flex-col items-center flex-1 gap-2 group">
                             <div className="w-full bg-gray-800 rounded-t-lg relative flex items-end justify-center overflow-hidden h-full"><div className="w-full bg-gradient-to-t from-indigo-600 to-purple-500 opacity-80 group-hover:opacity-100 transition-all duration-500 rounded-t-lg absolute bottom-0" style={{ height: `${(item.amount / maxTrend) * 100}%` }}></div></div>
                             <span className="text-[10px] text-gray-400 font-medium uppercase">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
             <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><PieChart size={20} className="text-pink-400"/> Top Expenses</h3>
                <div className="space-y-4">
                    {topCategories.map((cat, idx) => (
                        <div key={idx}><div className="flex justify-between text-sm mb-1"><span className="text-gray-300 font-medium flex items-center gap-2">{getCategoryIcon(cat.category as BillCategory)} {cat.category}</span><span className="text-white font-bold">₹{cat.amount.toLocaleString('en-IN')}</span></div><div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden mt-1"><div className={`h-2.5 rounded-full ${['bg-blue-500', 'bg-pink-500', 'bg-yellow-500', 'bg-green-500', 'bg-purple-500'][idx % 5]}`} style={{ width: `${cat.percentage}%` }}></div></div></div>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <NotificationToast notification={notification} onClose={() => setNotification(null)} />
      
      <header className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-gray-800">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">P</div>
            <h1 className="text-xl font-bold tracking-tight text-white">Paymate</h1>
         </div>
         <div className="flex items-center gap-4 text-gray-400">
            <button className="hover:text-white" onClick={() => setActiveTab('bills')}><Search size={20} /></button>
            <button className="hover:text-white relative"><Bell size={20} />{notification && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
            <button onClick={onLogout} className="hover:text-white"><LogOut size={20} /></button>
         </div>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full z-10">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'bills' && renderBillList()}
        {activeTab === 'tasks' && renderTasks()}
        {activeTab === 'calendar' && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6 animate-in fade-in zoom-in duration-300">
                <div className="bg-gray-800/50 p-8 rounded-full mb-6 ring-1 ring-white/5"><CalendarIcon size={64} className="text-gray-600" /></div>
                <h3 className="text-xl font-bold text-white mb-2">Calendar View</h3>
                <p className="text-gray-400 max-w-sm text-sm">See all your upcoming bills and tasks here. (Coming Soon)</p>
            </div>
        )}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'settings' && (
            <div className="glass-panel p-6 rounded-2xl space-y-4 animate-in fade-in pb-24">
                <h2 className="text-xl font-bold mb-4">Settings</h2>
                
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-2 text-indigo-300 font-semibold mb-2"><Mail size={18} /> Email Alerts</div>
                    <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                        We use a free secure service to send alerts directly to <strong>{user.email}</strong>. 
                        <br/><br/>
                        <span className="text-yellow-400">Important:</span> The first time you trigger a test alert, check your inbox (or spam) for an "Activate FormSubmit" email. You must click Activate once to start receiving future notifications.
                    </p>
                </div>

                <div onClick={toggleEmailNotifications} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl cursor-pointer hover:bg-gray-800 transition">
                    <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${emailNotifications ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-700 text-gray-400'}`}><Mail size={20} /></div><div><span className="block font-medium">Email Alerts</span><span className="text-xs text-gray-400">Get notified for bills & tasks</span></div></div>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${emailNotifications ? 'bg-indigo-600' : 'bg-gray-600'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${emailNotifications ? 'right-1' : 'left-1'}`}></div></div>
                </div>

                <div onClick={requestNotificationPermission} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl cursor-pointer hover:bg-gray-800 transition">
                    <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-pink-500/20 text-pink-400"><Smartphone size={20} /></div><div><span className="block font-medium">Push Notifications</span><span className="text-xs text-gray-400">Enable device alerts</span></div></div>
                     <span className="text-xs text-pink-400 font-bold px-3 py-1 bg-pink-500/10 rounded-full">ENABLE</span>
                </div>
                
                <button 
                    onClick={handleTestAlert} 
                    disabled={isSendingEmail}
                    className="w-full flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                             {isSendingEmail ? <Loader2 size={20} className="animate-spin" /> : <Volume2 size={20} />}
                        </div>
                        <span>{isSendingEmail ? 'Sending...' : 'Send Test Alert / Email'}</span>
                    </div>
                    <span className="text-xs text-indigo-400 font-bold">TEST</span>
                </button>
                
                {/* Email History Section */}
                <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-3 text-white font-medium">
                        <History size={18} className="text-gray-400" /> 
                        Email History <span className="text-xs font-normal text-gray-500">(Stored Locally)</span>
                    </div>
                    {emailHistory.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">No emails sent yet.</p>
                    ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 no-scrollbar">
                            {emailHistory.map(log => (
                                <div key={log.id} className="flex items-center justify-between text-xs p-2 bg-gray-800/50 rounded-lg">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-gray-300 font-medium">{log.subject}</span>
                                        <span className="text-gray-500">{new Date(log.timestamp).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${log.status === 'sent' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {log.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button onClick={resetDailyAlerts} className="w-full flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-orange-500/20 text-orange-400"><RefreshCw size={20} /></div><span>Reset Alert History</span></div><span className="text-xs text-orange-400 font-bold">RESET</span></button>
                
                <button onClick={() => setShowHelp(true)} className="w-full flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400"><HelpCircle size={20} /></div>
                        <span className="font-medium">Help & Support</span>
                    </div>
                    <ChevronRight size={16} className="text-gray-500" />
                </button>

                <button onClick={() => setShowAbout(true)} className="w-full flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400"><Info size={20} /></div>
                        <span className="font-medium">About Paymate</span>
                    </div>
                    <ChevronRight size={16} className="text-gray-500" />
                </button>

                <button onClick={onLogout} className="w-full p-4 bg-red-500/10 text-red-400 rounded-xl mt-4 font-medium hover:bg-red-500/20 transition">Sign Out</button>
             </div>
        )}
      </main>

      {/* Conditional FAB: Only show Bill Add on Home/Bills, Task Add handled in tasks tab header for cleaner UX, or can add generic FAB here */}
      {activeTab === 'bills' && (
        <button onClick={() => { setEditingBill(null); setShowAddForm(true); }} className="fixed bottom-24 right-4 z-40 bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-lg shadow-indigo-600/40 transition-transform hover:scale-105 active:scale-95">
            <Plus size={24} />
        </button>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-gray-900/90 backdrop-blur-xl border-t border-gray-800 pb-safe">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
            <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'home' ? 'text-indigo-400' : 'text-gray-500'}`}><Home size={20} /><span className="text-[10px] font-medium">Home</span></button>
            <button onClick={() => setActiveTab('bills')} className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'bills' ? 'text-indigo-400' : 'text-gray-500'}`}><FileText size={20} /><span className="text-[10px] font-medium">Bills</span></button>
            <button onClick={() => setActiveTab('tasks')} className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'tasks' ? 'text-pink-400' : 'text-gray-500'}`}><ListTodo size={20} /><span className="text-[10px] font-medium">To-Do</span></button>
             <button onClick={() => setActiveTab('reports')} className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'reports' ? 'text-indigo-400' : 'text-gray-500'}`}><BarChart2 size={20} /><span className="text-[10px] font-medium">Reports</span></button>
             <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'settings' ? 'text-indigo-400' : 'text-gray-500'}`}><Settings size={20} /><span className="text-[10px] font-medium">Settings</span></button>
        </div>
      </nav>

      {showAddForm && <BillForm userId={user.id} onClose={() => { setShowAddForm(false); setEditingBill(null); }} onSave={handleSaveBill} initialData={editingBill || undefined} />}
      {showTaskForm && <TaskForm userId={user.id} onClose={() => { setShowTaskForm(false); setEditingTask(null); }} onSave={handleSaveTask} initialData={editingTask || undefined} />}
      
      {showAbout && renderAboutModal()}
      {showHelp && renderHelpModal()}

      {billToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-sm rounded-xl p-6 shadow-2xl border border-red-500/30">
             <div className="flex flex-col items-center text-center">
                <div className="bg-red-500/20 p-3 rounded-full mb-4"><AlertTriangle size={32} className="text-red-500" /></div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Bill?</h3>
                <p className="text-gray-300 mb-6">Are you sure you want to permanently delete this bill?</p>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setBillToDelete(null)} className="flex-1 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition">Cancel</button>
                  <button onClick={confirmDeleteBill} className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition shadow-lg shadow-red-500/20">Delete</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {taskToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-sm rounded-xl p-6 shadow-2xl border border-red-500/30">
             <div className="flex flex-col items-center text-center">
                <div className="bg-red-500/20 p-3 rounded-full mb-4"><AlertTriangle size={32} className="text-red-500" /></div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Task?</h3>
                <p className="text-gray-300 mb-6">Are you sure you want to delete this task?</p>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setTaskToDelete(null)} className="flex-1 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition">Cancel</button>
                  <button onClick={confirmDeleteTask} className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition shadow-lg shadow-red-500/20">Delete</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
