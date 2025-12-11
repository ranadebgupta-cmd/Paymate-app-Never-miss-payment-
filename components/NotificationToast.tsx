import React, { useEffect, useRef, useState } from 'react';
import { Bell, X, Mail, Volume2, VolumeX } from 'lucide-react';
import { NotificationItem } from '../types';

interface Props {
  notification: NotificationItem | null;
  onClose: () => void;
}

export const NotificationToast: React.FC<Props> = ({ notification, onClose }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  
  // Persist mute state so user doesn't have to toggle it every time
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('paymate_sound_muted') === 'true';
  });

  const toggleMute = () => {
    const newVal = !isMuted;
    setIsMuted(newVal);
    localStorage.setItem('paymate_sound_muted', String(newVal));
  };

  const stopCurrentSound = () => {
    if (oscillatorsRef.current.length > 0) {
      oscillatorsRef.current.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {
          // Ignore errors if already stopped
        }
      });
      oscillatorsRef.current = [];
    }
  };

  const playSound = async (type: 'warning' | 'info' | 'success') => {
    // 1. Check mute state first
    if (isMuted) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // 2. Stop any existing sound to prevent stacking
      stopCurrentSound();
      
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(0.15, ctx.currentTime);

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(masterGain);

      const now = ctx.currentTime;

      if (type === 'warning') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(880, now); // A5
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + 0.05);
        gainNode.gain.setValueAtTime(1, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        // Second beep
        gainNode.gain.setValueAtTime(0, now + 0.25);
        gainNode.gain.linearRampToValueAtTime(1, now + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        
        oscillator.start(now);
        oscillator.stop(now + 0.7);

      } else {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, now); // C5
        if (type === 'success') {
           oscillator.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1); // Slide up
        }
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        oscillator.start(now);
        oscillator.stop(now + 0.6);
      }

      oscillatorsRef.current.push(oscillator);
      oscillator.onended = () => {
         const index = oscillatorsRef.current.indexOf(oscillator);
         if (index > -1) oscillatorsRef.current.splice(index, 1);
      };

    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  // Effect to play sound when notification arrives
  useEffect(() => {
    if (notification) {
      playSound(notification.type);
      
      const timer = setTimeout(() => {
        onClose();
      }, 6000);
      return () => {
        clearTimeout(timer);
        stopCurrentSound();
      };
    } else {
        stopCurrentSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification, onClose]); // Deliberately exclude isMuted/playSound to avoid replay on toggle

  // Effect to stop sound immediately if user hits mute while playing
  useEffect(() => {
    if (isMuted) {
      stopCurrentSound();
    }
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCurrentSound();
  }, []);

  if (!notification) return null;

  const isEmailAlert = notification.message.toLowerCase().includes('email');

  return (
    <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
      <div className={`glass-panel border-l-4 ${notification.type === 'warning' ? 'border-red-500' : 'border-blue-500'} p-4 rounded shadow-2xl flex items-center gap-4 max-w-sm`}>
        <div className={`p-2 rounded-full ${notification.type === 'warning' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>
          {isEmailAlert ? <Mail size={24} /> : <Bell size={24} />}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-white text-sm uppercase tracking-wide">{notification.type === 'warning' ? 'Alert' : 'Info'}</h4>
          <p className="text-gray-300 text-sm mt-1">{notification.message}</p>
        </div>
        
        {/* Mute Toggle */}
        <button 
          onClick={toggleMute} 
          className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          title={isMuted ? "Unmute Sound" : "Mute Sound"}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};