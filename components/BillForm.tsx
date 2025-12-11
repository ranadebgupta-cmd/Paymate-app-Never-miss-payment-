
import React, { useState, useRef } from 'react';
import { X, Calendar, Tag, Repeat, Camera, Upload, Loader2, FileText, AlertTriangle, CheckCircle2, AlertCircle, CheckSquare, Smartphone, Link as LinkIcon, Hash, Lock, Unlock } from 'lucide-react';
import { Bill, BillCategory } from '../types';
import { extractBillDetails, processPdfFile } from '../services/geminiService';

interface Props {
  userId: string;
  onClose: () => void;
  onSave: (bill: Bill, addToCalendar: boolean) => void;
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
  const [upiId, setUpiId] = useState(initialData?.upiId || '');
  const [paymentUrl, setPaymentUrl] = useState(initialData?.paymentUrl || '');
  const [consumerNumber, setConsumerNumber] = useState(initialData?.consumerNumber || '');
  const [billerId, setBillerId] = useState(initialData?.billerId || '');
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [showPastDueConfirm, setShowPastDueConfirm] = useState(false);
  const [addToCalendar, setAddToCalendar] = useState(!initialData); // Default true for new bills
  
  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF Password Handling
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pdfPassword, setPdfPassword] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const processFile = async (file: File, password?: string) => {
    setIsScanning(true);
    setScanFeedback(null);
    setShowPasswordPrompt(false);

    try {
        let extractedData = null;

        if (file.type === 'application/pdf') {
            // Handle PDF (Text Extraction or Render to Image)
            try {
                const result = await processPdfFile(file, password);
                if (result) {
                    // result.data is either text string or base64 image string
                    extractedData = await extractBillDetails(result.data, result.type === 'text' ? 'text' : 'base64_image');
                }
            } catch (err: any) {
                if (err.message === 'PASSWORD_REQUIRED') {
                    setPendingFile(file);
                    setShowPasswordPrompt(true);
                    setIsScanning(false);
                    return;
                }
                throw err;
            }
        } else {
            // Handle Images (JPG, PNG)
            const reader = new FileReader();
            await new Promise<void>((resolve, reject) => {
                reader.onloadend = async () => {
                    const base64String = reader.result as string;
                    const base64Data = base64String.split(',')[1];
                    extractedData = await extractBillDetails(base64Data, 'base64_image');
                    resolve();
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        if (extractedData) {
          if (extractedData.name) setName(extractedData.name);
          if (extractedData.totalAmount) setTotalAmount(extractedData.totalAmount.toString());
          if (extractedData.minDueAmount) setMinDue(extractedData.minDueAmount.toString());
          if (extractedData.dueDate) setDueDate(extractedData.dueDate);
          if (extractedData.paymentUrl) setPaymentUrl(extractedData.paymentUrl);
          
          if (extractedData.category && CATEGORIES.includes(extractedData.category)) {
            setCategory(extractedData.category);
          }

          setScanFeedback({
            type: 'success',
            message: "Scan complete! Details extracted successfully."
          });
          // Clear sensitive data
          setPdfPassword('');
          setPendingFile(null);
        } else {
           setScanFeedback({
             type: 'error',
             message: "Could not extract details. Please fill manually."
           });
        }
    } catch (error) {
      console.error("Processing failed", error);
      setScanFeedback({
          type: 'error',
          message: "Error processing file. Try a clear image or unlocked PDF."
      });
    } finally {
        setIsScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = ''; // Reset input
  };

  const handlePasswordSubmit = () => {
     if (pendingFile && pdfPassword) {
         processFile(pendingFile, pdfPassword);
     }
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
      isRecurring,
      upiId: upiId.trim(),
      paymentUrl: paymentUrl.trim(),
      consumerNumber: consumerNumber.trim(),
      billerId: billerId.trim()
    };
    onSave(newBill, addToCalendar);
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
          onClick={() => !isScanning && !showPasswordPrompt && fileInputRef.current?.click()}
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
              <p className="text-indigo-300 font-medium">Processing Document...</p>
              <p className="text-xs text-indigo-400/70">Decrypting & Analyzing</p>
            </div>
          ) : (
            <>
              <div className="flex gap-4 mb-3">
                <div className="bg-gray-700 p-3 rounded-full"><Camera size={24} className="text-gray-300" /></div>
                <div className="bg-gray-700 p-3 rounded-full"><Upload size={24} className="text-gray-300" /></div>
              </div>
              <p className="text-white font-medium">{initialData ? 'Rescan Bill / Update File' : 'Scan Bill or Upload PDF'}</p>
              <p className="text-gray-400 text-xs mt-1">Supports Images & Protected PDFs</p>
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
          
          {/* BBPS Data Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Consumer / Account No</label>
                <div className="relative">
                   <span className="absolute left-3 top-3 text-gray-400"><Hash size={18} /></span>
                   <input 
                     type="text" 
                     value={consumerNumber} 
                     onChange={e => setConsumerNumber(e.target.value)} 
                     className="w-full bg-gray-800/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-500"
                     placeholder="e.g. 5500123456"
                   />
                </div>
             </div>
             
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
                 <label className="block text-sm font-medium text-gray-300 mb-1">Biller UPI ID (Optional)</label>
                 <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400"><Smartphone size={18} /></span>
                    <input 
                      type="text" 
                      value={upiId} 
                      onChange={e => setUpiId(e.target.value)} 
                      className="w-full bg-gray-800/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-500"
                      placeholder="e.g. electric@sbi"
                    />
                 </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                 <label className="block text-sm font-medium text-gray-300 mb-1">Payment Website / Link</label>
                 <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400"><LinkIcon size={18} /></span>
                    <input 
                      type="url" 
                      value={paymentUrl} 
                      onChange={e => setPaymentUrl(e.target.value)} 
                      className="w-full bg-gray-800/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-500"
                      placeholder="e.g. https://billpay.com"
                    />
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
          </div>

          <div className="flex flex-col gap-3">
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

            <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
              <input 
                type="checkbox" 
                id="calendar"
                checked={addToCalendar}
                onChange={e => setAddToCalendar(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 bg-gray-700"
              />
              <label htmlFor="calendar" className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                <CheckSquare size={16} className="text-green-400" />
                Add to Google Calendar (Daily Reminder)
              </label>
            </div>
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

        {/* Password Prompt Modal */}
        {showPasswordPrompt && (
            <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md rounded-2xl animate-in fade-in duration-200">
                <div className="p-6 text-center max-w-xs w-full">
                    <div className="bg-indigo-500/20 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-indigo-500/50">
                        <Lock size={32} className="text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Encrypted PDF</h3>
                    <p className="text-gray-400 text-sm mb-4">This file is password protected. Enter password to unlock.</p>
                    
                    <input 
                        type="password" 
                        value={pdfPassword}
                        onChange={(e) => setPdfPassword(e.target.value)}
                        placeholder="File Password"
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white mb-4 focus:ring-2 focus:ring-indigo-500 outline-none text-center tracking-widest"
                        autoFocus
                    />

                    <div className="flex gap-3">
                        <button 
                            onClick={() => { setShowPasswordPrompt(false); setPendingFile(null); setPdfPassword(''); }} 
                            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm font-medium transition"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handlePasswordSubmit}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm font-bold transition flex items-center justify-center gap-2"
                        >
                            <Unlock size={14} /> Unlock
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
