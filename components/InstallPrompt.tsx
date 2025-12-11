import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check for iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    setIsIOS(isIosDevice && !isStandalone);

    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const closePrompt = () => setShow(false);

  // iOS Instructions (since iOS doesn't support automatic prompt)
  if (isIOS) {
     return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-700">
         <div className="glass-panel p-4 rounded-xl shadow-2xl border border-gray-600 bg-gray-900/95 backdrop-blur-xl relative">
            <button onClick={() => setIsIOS(false)} className="absolute top-2 right-2 text-gray-400 hover:text-white">
                <X size={16} />
            </button>
            <div className="flex gap-4">
               <div className="bg-gray-700 p-3 rounded-xl h-fit">
                 <Smartphone size={24} className="text-white" />
               </div>
               <div>
                  <h4 className="font-bold text-white text-sm mb-1">Install Paymate</h4>
                  <p className="text-gray-300 text-xs mb-2">Install this app on your iPhone for the best experience.</p>
                  <p className="text-indigo-300 text-xs flex items-center gap-1">
                    Tap <span className="inline-block px-1 bg-gray-700 rounded text-[10px]">Share</span> then "Add to Home Screen"
                  </p>
               </div>
            </div>
         </div>
       </div>
     )
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="glass-panel p-4 rounded-xl flex items-center justify-between shadow-2xl border border-indigo-500/50 bg-gray-900/95 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/30">
            <Download size={20} className="text-white" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Install Paymate</h4>
            <p className="text-indigo-200 text-xs">Add to home screen for offline access</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
              onClick={handleInstall}
              className="bg-white text-indigo-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition shadow-lg"
            >
              Install
            </button>
            <button onClick={closePrompt} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition">
                <X size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};