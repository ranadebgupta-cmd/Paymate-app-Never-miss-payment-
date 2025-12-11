import React, { useState, useRef } from 'react';
import { X, Calendar, Tag, Repeat, Camera, Upload, Loader2, FileText, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Bill, BillCategory } from '../types';
import { extractBillDetails } from '../services/geminiService';

interface Props {
  userId: string;
  onClose: () => void;
  onSave: (bill: Bill) => void;
  initialData?: Bill;
}

const CATEGORIES: BillCategory[] = [
  'Credit Card', 
  'Electricity', 
  'Gas', 
  'Water', 
  'Internet', 
  'Telephone', 
  'Insurance', 
  'Rent', 
  'Subscription', 
  'Loan', 
  'Other'
];

export const BillForm: React.FC<Props> = ({ userId, onClose, onSave, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState<BillCategory>(initialData?.category || 'Credit Card');
  const [totalAmount, setTotalAmount] = useState(initialData?.totalAmount.toString() || '');
  const [minDue, setMinDue] = useState(initialData?.minDueAmount.toString() || '');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [showPastDueConfirm, setShowPastDueConfirm] = useState(false);
  
  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanFeedback(null);

    try {
      // Convert to Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = base64String.split(',')[1];
        
        const extractedData = await extractBillDetails(base64Data, file.type);
        
        if (extractedData) {
          if (extractedData.name) setName(extractedData.name);
          if (extractedData.totalAmount) setTotalAmount(extractedData.totalAmount.toString());
          if (extractedData.minDueAmount) setMinDue(extractedData.minDueAmount.toString());
          if (extractedData.dueDate) setDueDate(extractedData.dueDate);
          
          // Validate category before setting
          if (extractedData.category && CATEGORIES.includes(extractedData.category)) {
            setCategory(extractedData.category);
          }

          setScanFeedback({
            type: 'success',
            message: "Scan complete! Please review and verify the details below before saving."
          });
        } else {
           setScanFeedback({
             type: 'error',
             message: "Could not extract details. Please fill the form manually."
           });
        }
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Scanning failed", error);
      setScanFeedback({
          type: 'error',
          message: "Error processing file. Please try again."
      });
      setIsScanning(false);
    }
    
    // Reset input to allow selecting the same file again if needed
    e.target.value = '';
  };

  const executeSave = () => {
    const newBill: Bill = {
      id: initialData?.id || generateId(),
      userId,
      name,
      category,
      totalAmount: parseFloat(totalAmount),
      minDueAmount: parseFloat(minDue) || 0,
      dueDate,
      isPaid: initialData?.isPaid || false,
      isRecurring
    };
    onSave(newBill);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if due date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (due < today) {
        setShowPastDueConfirm(true);
        return;
    }

    executeSave();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 relative animate-in fade-in zoom-in duration-300 my-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <div className="bg-indigo-500 p-2 rounded-lg"><Tag size={24} /></div>
          {initialData ? 'Edit Bill' : 'Add New Bill'}
        </h2>

        {/* Scan / Upload Section */}
        <div 
          onClick={() => !isScanning && fileInputRef.current?.click()}
          className={`mb-6 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${isScanning ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-600 hover:border-indigo-400 hover:bg-gray-800/50'}`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,application/pdf"
            onChange={handleFileChange}
          />
          
          {isScanning ? (
            <div className="flex flex-col items-center animate-pulse">
              <Loader2 size={32} className="text-indigo-400 animate-spin mb-2" />
              <p className="text-indigo-300 font-medium">Analyzing Bill...</p>
              <p className="text-xs text-indigo-400/70">Extracting details with AI</p>
            </div>
          ) : (
            <>
              <div className="flex gap-4 mb-3">
                <div className="bg-gray-700 p-3 rounded-full"><Camera size={24} className="text-gray-300" /></div>
                <div className="bg-gray-700 p-3 rounded-full"><Upload size={24} className="text-gray-300" /></div>
              </div>
              <p className="text-white font-medium">{initialData ? 'Rescan Bill / Update File' : 'Scan Bill or Upload PDF'}</p>
              <p className="text-gray-400 text-xs mt-1">Supports Images & PDF Documents</p>
            </>
          )}
        </div>

        {/* Scan Feedback Banner */}
        {scanFeedback && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 border animate-in fade-in slide-in-from-top-2 ${scanFeedback.type === 'success' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            {scanFeedback.type === 'success' ? <CheckCircle2 className="text-green-400 shrink-0" size={20} /> : <AlertCircle className="text-red-400 shrink-0" size={20} />}
            <div>
                <h4 className={`font-bold text-sm ${scanFeedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {scanFeedback.type === 'success' ? 'Scan Complete' : 'Scan Failed'}
                </h4>
                <p className="text-gray-300 text-xs mt-1 leading-relaxed">{scanFeedback.message}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value as BillCategory)}
              className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="bg-gray-800 text-white">{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {category === 'Credit Card' ? 'Card Name / Bank' : 'Biller Name / Title'}
            </label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder={category === 'Credit Card' ? "e.g. HDFC Regalia" : "e.g. Home Internet"}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Total Amount (INR)</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">₹</span>
                <input 
                  type="number" 
                  required 
                  min="0"
                  step="0.01"
                  value={totalAmount} 
                  onChange={e => setTotalAmount(e.target.value)} 
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-lg pl-8 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {category === 'Credit Card' || category === 'Loan' ? 'Min Due (INR)' : 'Min Due (Optional)'}
              </label>
               <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">₹</span>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={minDue} 
                  onChange={e => setMinDue(e.target.value)} 
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-lg pl-8 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
            <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400"><Calendar size={18} /></span>
                <input 
                  type="date" 
                  required 
                  value={dueDate} 
                  onChange={e => setDueDate(e.target.value)} 
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none date-input-white"
                />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
            <input 
              type="checkbox" 
              id="recurring"
              checked={isRecurring}
              onChange={e => setIsRecurring(e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 bg-gray-700"
            />
            <label htmlFor="recurring" className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
              <Repeat size={16} className="text-indigo-400" />
              Repeat Monthly
            </label>
          </div>

          <button type="submit" className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transform transition hover:-translate-y-0.5">
            {initialData ? 'Update Bill' : 'Add Bill Reminder'}
          </button>
        </form>

        {/* Confirmation Overlay for Past Due Date */}
        {showPastDueConfirm && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-gray-900/90 backdrop-blur-sm rounded-2xl animate-in fade-in duration-200">
            <div className="p-6 text-center max-w-xs w-full">
              <div className="bg-yellow-500/20 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-yellow-500/50">
                <AlertTriangle size={32} className="text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Past Due Date</h3>
              <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                The due date you selected (<span className="text-white font-mono">{dueDate}</span>) is in the past. Are you sure you want to save this?
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={executeSave} 
                  className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-xl transition shadow-lg shadow-yellow-500/20"
                >
                  Yes, Save Anyway
                </button>
                <button 
                  onClick={() => setShowPastDueConfirm(false)} 
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition border border-gray-700"
                >
                  Cancel & Edit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};