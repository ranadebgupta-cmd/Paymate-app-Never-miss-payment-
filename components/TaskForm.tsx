
import React, { useState } from 'react';
import { X, CheckSquare, Clock, Bell, Calendar, Repeat } from 'lucide-react';
import { Task } from '../types';

interface Props {
  userId: string;
  onClose: () => void;
  onSave: (task: Task) => void;
  initialData?: Task;
}

export const TaskForm: React.FC<Props> = ({ userId, onClose, onSave, initialData }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  
  // Calculate initial offset if reminderDate exists
  const getInitialOffset = () => {
    if (!initialData?.reminderDate) return 'none';
    if (!initialData.dueDate) return 'custom'; // Reminder exists but due date missing/changed? Default to custom.

    const due = new Date(initialData.dueDate).getTime();
    const remind = new Date(initialData.reminderDate).getTime();
    const diffMins = Math.round((due - remind) / 60000);
    
    // Map closest offset options
    if (diffMins <= 1 && diffMins >= -1) return '0';
    if (diffMins === 15) return '15';
    if (diffMins === 60) return '60';
    if (diffMins === 1440) return '1440';
    return 'custom';
  };

  const [reminderOffset, setReminderOffset] = useState(getInitialOffset());
  
  const [customReminderDate, setCustomReminderDate] = useState(() => {
    if (initialData?.reminderDate && getInitialOffset() === 'custom') {
        const d = new Date(initialData.reminderDate);
        // Convert UTC ISO to Local datetime-local string format
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${mins}`;
    }
    return '';
  });

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate Reminder Date
    let reminderDate: string | undefined;
    
    if (reminderOffset === 'custom' && customReminderDate) {
        // Convert local input time back to UTC ISO string for storage/logic
        reminderDate = new Date(customReminderDate).toISOString();
    } else if (dueDate && reminderOffset !== 'none') {
        const dueTime = new Date(dueDate).getTime();
        const offsetMins = parseInt(reminderOffset);
        reminderDate = new Date(dueTime - (offsetMins * 60000)).toISOString();
    }

    const newTask: Task = {
      id: initialData?.id || generateId(),
      userId,
      title,
      dueDate,
      reminderDate,
      isCompleted: initialData?.isCompleted || false,
      isRecurring
    };
    onSave(newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-sm rounded-2xl p-6 relative animate-in fade-in zoom-in duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <div className="bg-pink-500 p-2 rounded-lg"><CheckSquare size={24} /></div>
          {initialData ? 'Edit Task' : 'New Task'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Task Description</label>
            <input 
              type="text" 
              required 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-pink-500 outline-none placeholder-gray-500"
              placeholder="e.g. Call Insurance Company"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Due Date & Time</label>
            <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400"><Clock size={18} /></span>
                <input 
                  type="datetime-local" 
                  required 
                  value={dueDate} 
                  onChange={e => setDueDate(e.target.value)} 
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-pink-500 outline-none date-input-white"
                />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-300 mb-1">Set Reminder</label>
             <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400"><Bell size={18} /></span>
                <select 
                   value={reminderOffset} 
                   onChange={e => setReminderOffset(e.target.value)}
                   className="w-full bg-gray-800/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-pink-500 outline-none appearance-none"
                >
                    <option value="none" className="bg-gray-800">No Reminder</option>
                    <option value="0" className="bg-gray-800">At time of due date</option>
                    <option value="15" className="bg-gray-800">15 minutes before</option>
                    <option value="60" className="bg-gray-800">1 hour before</option>
                    <option value="1440" className="bg-gray-800">1 day before</option>
                    <option value="custom" className="bg-gray-800">Custom Date & Time</option>
                </select>
             </div>
             
             {reminderOffset === 'custom' && (
                <div className="relative mt-3 animate-in fade-in slide-in-from-top-1">
                    <span className="absolute left-3 top-3 text-gray-400"><Calendar size={18} /></span>
                    <input 
                        type="datetime-local" 
                        required 
                        value={customReminderDate} 
                        onChange={e => setCustomReminderDate(e.target.value)} 
                        className="w-full bg-gray-800/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-pink-500 outline-none date-input-white text-sm"
                        placeholder="Pick reminder time"
                    />
                </div>
             )}
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
            <input 
              type="checkbox" 
              id="recurring-task"
              checked={isRecurring}
              onChange={e => setIsRecurring(e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 text-pink-500 focus:ring-pink-500 bg-gray-700"
            />
            <label htmlFor="recurring-task" className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
              <Repeat size={16} className="text-pink-400" />
              Repeat Weekly
            </label>
          </div>

          <button type="submit" className="w-full mt-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transform transition hover:-translate-y-0.5">
            {initialData ? 'Update Task' : 'Add Task'}
          </button>
        </form>
      </div>
    </div>
  );
};