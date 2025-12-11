
import React, { useEffect } from 'react';
import { X, Bell, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { NotificationItem } from '../types';

interface Props {
  notification: NotificationItem | null;
  onClose: () => void;
}

export const NotificationToast: React.FC<Props> = ({ notification, onClose }) => {
  
  // Auto-close effect
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'warning': return <AlertTriangle size={24} className="text-red-400" />;
      case 'success': return <CheckCircle size={24} className="text-green-400" />;
      default: return <Info size={24} className="text-indigo-400" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'warning': return 'border-red-500/50 bg-gray-900/95 shadow-red-900/20';
      case 'success': return 'border-green-500/50 bg-gray-900/95 shadow-green-900/20';
      default: return 'border-indigo-500/50 bg-gray-900/95 shadow-indigo-900/20';
    }
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-in slide-in-from-top-4 fade-in duration-300`}>
      <div className={`glass-panel p-4 rounded-xl shadow-2xl border flex items-start gap-4 ${getBorderColor()} backdrop-blur-xl`}>
        <div className="shrink-0 pt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-white text-sm uppercase tracking-wide mb-0.5">
            {notification.type === 'warning' ? 'Alert' : notification.type === 'success' ? 'Success' : 'Notification'}
          </h4>
          <p className="text-gray-300 text-sm leading-relaxed">{notification.message}</p>
        </div>
        <button 
          onClick={onClose}
          className="shrink-0 text-gray-400 hover:text-white transition-colors p-1"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
