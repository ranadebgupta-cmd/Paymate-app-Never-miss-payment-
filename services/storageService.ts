
import { User, Bill, Task } from '../types';

const USERS_KEY = 'paymate_users';
const BILLS_KEY = 'paymate_bills';
const TASKS_KEY = 'paymate_tasks';
const SESSION_KEY = 'paymate_session';

export const storageService = {
  getUsers: (): User[] => {
    try {
      const data = localStorage.getItem(USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to parse users from storage", e);
      return [];
    }
  },

  saveUser: (user: User): void => {
    const users = storageService.getUsers();
    // Check for duplicates just in case
    if (!users.find(u => u.id === user.id)) {
        users.push(user);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  },

  updateUserPassword: (email: string, newPasswordHash: string): boolean => {
    const users = storageService.getUsers();
    const index = users.findIndex(u => u.email === email);
    if (index !== -1) {
      users[index].passwordHash = newPasswordHash;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return true;
    }
    return false;
  },

  login: (email: string, passwordHash: string): User | null => {
    const users = storageService.getUsers();
    const user = users.find(u => u.email === email && u.passwordHash === passwordHash);
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return user;
    }
    return null;
  },

  logout: (): void => {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): User | null => {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  getBills: (userId: string): Bill[] => {
    try {
      const data = localStorage.getItem(BILLS_KEY);
      const rawBills = data ? JSON.parse(data) : [];
      
      // Map old structure to new structure safely if keys changed
      const allBills: Bill[] = rawBills.map((b: any) => ({
        id: b.id,
        userId: b.userId,
        name: b.name || b.cardName || 'Unnamed Bill', 
        category: b.category || 'Credit Card', 
        totalAmount: b.totalAmount,
        minDueAmount: b.minDueAmount,
        dueDate: b.dueDate,
        isPaid: b.isPaid,
        isRecurring: b.isRecurring ?? false
      }));

      return allBills.filter(b => b.userId === userId).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    } catch (e) {
      return [];
    }
  },

  saveBill: (bill: Bill): void => {
    try {
      const data = localStorage.getItem(BILLS_KEY);
      const allBills: Bill[] = data ? JSON.parse(data) : [];
      allBills.push(bill);
      localStorage.setItem(BILLS_KEY, JSON.stringify(allBills));
    } catch (e) {
      // If bills are corrupt, reset and save new
      localStorage.setItem(BILLS_KEY, JSON.stringify([bill]));
    }
  },

  updateBill: (updatedBill: Bill): void => {
    try {
      const data = localStorage.getItem(BILLS_KEY);
      let allBills: Bill[] = data ? JSON.parse(data) : [];
      allBills = allBills.map(b => b.id === updatedBill.id ? updatedBill : b);
      localStorage.setItem(BILLS_KEY, JSON.stringify(allBills));
    } catch (e) {
      console.error("Error updating bill", e);
    }
  },

  deleteBill: (billId: string): void => {
    try {
      const data = localStorage.getItem(BILLS_KEY);
      let allBills: Bill[] = data ? JSON.parse(data) : [];
      allBills = allBills.filter(b => b.id !== billId);
      localStorage.setItem(BILLS_KEY, JSON.stringify(allBills));
    } catch (e) {
       console.error("Error deleting bill", e);
    }
  },

  // --- Task Methods ---

  getTasks: (userId: string): Task[] => {
    try {
      const data = localStorage.getItem(TASKS_KEY);
      const rawTasks = data ? JSON.parse(data) : [];
      const allTasks: Task[] = rawTasks.map((t: any) => ({
        id: t.id,
        userId: t.userId,
        title: t.title,
        dueDate: t.dueDate,
        reminderDate: t.reminderDate || undefined, // Ensure field exists
        isCompleted: t.isCompleted
      }));
      return allTasks.filter(t => t.userId === userId).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    } catch (e) {
      return [];
    }
  },

  saveTask: (task: Task): void => {
    try {
      const data = localStorage.getItem(TASKS_KEY);
      const allTasks: Task[] = data ? JSON.parse(data) : [];
      allTasks.push(task);
      localStorage.setItem(TASKS_KEY, JSON.stringify(allTasks));
    } catch (e) {
      localStorage.setItem(TASKS_KEY, JSON.stringify([task]));
    }
  },

  updateTask: (updatedTask: Task): void => {
    try {
      const data = localStorage.getItem(TASKS_KEY);
      let allTasks: Task[] = data ? JSON.parse(data) : [];
      allTasks = allTasks.map(t => t.id === updatedTask.id ? updatedTask : t);
      localStorage.setItem(TASKS_KEY, JSON.stringify(allTasks));
    } catch (e) {
      console.error("Error updating task", e);
    }
  },

  deleteTask: (taskId: string): void => {
    try {
      const data = localStorage.getItem(TASKS_KEY);
      let allTasks: Task[] = data ? JSON.parse(data) : [];
      allTasks = allTasks.filter(t => t.id !== taskId);
      localStorage.setItem(TASKS_KEY, JSON.stringify(allTasks));
    } catch (e) {
      console.error("Error deleting task", e);
    }
  }
};
