import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { InstallPrompt } from './components/InstallPrompt';
import { ViewState, User } from './types';
import { storageService } from './services/storageService';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('LOGIN');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Check if user is logged in persistently
    const user = storageService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setCurrentView('DASHBOARD');
    }

    // Mouse movement handler for parallax effect
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position from -1 to 1
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentView('DASHBOARD');
  };

  const handleLogout = () => {
    storageService.logout();
    setCurrentUser(null);
    setCurrentView('LOGIN');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden font-sans">
      
      {/* Interactive Background Container */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        
        {/* Deep base gradient */}
        <div className="absolute inset-0 bg-gray-950"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-[#050a14] to-black"></div>

        {/* Animated Moving Blobs with Parallax & Hue Shift */}
        <div 
           className="absolute inset-0 transition-transform duration-100 ease-out will-change-transform"
           style={{ 
             transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)`,
             filter: `hue-rotate(${mousePos.x * 20}deg)` 
           }}
        >
          {/* Blob 1: Vibrant Purple/Pink (Top Left) */}
          <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] bg-purple-600/40 rounded-full mix-blend-screen filter blur-[100px] animate-blob opacity-60"></div>
          
          {/* Blob 2: Cyan/Teal (Top Right) */}
          <div className="absolute -top-[10%] -right-[10%] w-[50vw] h-[50vw] bg-cyan-500/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000 opacity-60"></div>
          
          {/* Blob 3: Rose/Red (Bottom Left) */}
          <div className="absolute -bottom-[20%] -left-[10%] w-[50vw] h-[50vw] bg-rose-500/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000 opacity-60"></div>

          {/* Blob 4: Indigo/Blue (Bottom Right) */}
          <div className="absolute -bottom-[10%] -right-[10%] w-[60vw] h-[60vw] bg-indigo-600/40 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000 opacity-60"></div>

          {/* Blob 5: Interactive Cursor Follower (Bright Accent) */}
          <div 
             className="absolute top-1/2 left-1/2 w-[30vw] h-[30vw] bg-blue-400/20 rounded-full mix-blend-screen filter blur-[80px] transition-transform duration-75 ease-out"
             style={{ 
               transform: `translate(calc(-50% + ${mousePos.x * 40}px), calc(-50% + ${mousePos.y * 40}px))` 
             }}
          ></div>
        </div>

        {/* Noise Overlay for Texture */}
        <div className="absolute inset-0 opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none mix-blend-overlay"></div>
      </div>

      {/* Main Content Wrapper */}
      <div className="relative z-10">
        {currentView === 'DASHBOARD' && currentUser ? (
          <Dashboard user={currentUser} onLogout={handleLogout} />
        ) : (
          <Auth 
            currentView={currentView} 
            onViewChange={setCurrentView} 
            onLoginSuccess={handleLoginSuccess} 
          />
        )}
      </div>
      
      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
}

export default App;