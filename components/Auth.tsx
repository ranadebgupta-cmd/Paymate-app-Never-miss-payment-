import React, { useState } from 'react';
import { ViewState } from '../types';
import { storageService } from '../services/storageService';
import { User } from '../types';
import { ShieldCheck, UserPlus, LogIn, KeyRound } from 'lucide-react';

interface AuthProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onLoginSuccess: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ currentView, onViewChange, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }

    const user = storageService.login(normalizedEmail, password); 
    if (user) {
      onLoginSuccess(user);
    } else {
      setError('Invalid email or password.');
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (!validateEmail(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    const users = storageService.getUsers();
    if (users.find(u => u.email === normalizedEmail)) {
      setError('User already exists. Please login.');
      return;
    }
    
    const newUser: User = {
      id: generateId(),
      email: normalizedEmail,
      passwordHash: password, // In real app: hash this!
      name: name.trim()
    };
    storageService.saveUser(newUser);
    
    // Verify save was successful
    const savedUser = storageService.getUsers().find(u => u.id === newUser.id);
    if (!savedUser) {
        setError("Error saving user data. Please try again or check browser storage settings.");
        return;
    }
    
    setSuccessMsg('Registration successful! Redirecting to login...');
    setTimeout(() => {
        onViewChange('LOGIN');
        setSuccessMsg('');
    }, 2000);
  };

  const handleForgotPass = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!validateEmail(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    const success = storageService.updateUserPassword(normalizedEmail, password);
    if (success) {
      setSuccessMsg('Password updated successfully. Please login.');
      setTimeout(() => onViewChange('LOGIN'), 2000);
    } else {
      setError('Email not found.');
    }
  };

  const formClass = "glass-panel p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 transition-all duration-500 ease-in-out transform";
  const inputClass = "w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";
  const btnClass = "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2";

  const AppLogo = () => (
    <div className="mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-700">
      <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-500 tracking-tight filter drop-shadow-2xl">
        Paymate
      </h1>
      <p className="text-gray-300 mt-2 font-light text-lg tracking-wider">Never miss bill payment</p>
    </div>
  );

  if (currentView === 'LOGIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen relative z-10 p-4">
        <AppLogo />
        <div className={formClass}>
          <div className="flex justify-center mb-6">
            <div className="bg-indigo-500 p-3 rounded-full">
              <ShieldCheck size={32} className="text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center mb-2">Welcome Back</h2>
          <p className="text-gray-400 text-center mb-8">Login to your account</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input 
                type="email" 
                required 
                className={inputClass} 
                value={email} 
                onChange={e => { setEmail(e.target.value); setError(''); }} 
                placeholder="you@example.com" 
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input 
                type="password" 
                required 
                className={inputClass} 
                value={password} 
                onChange={e => { setPassword(e.target.value); setError(''); }} 
                placeholder="••••••••" 
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            
            <button type="submit" className={btnClass}>
              <LogIn size={20} /> Login
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <button onClick={() => onViewChange('FORGOT_PASSWORD')} className="text-indigo-300 hover:text-indigo-200 block w-full mb-2">Forgot Password?</button>
            <p className="text-gray-400">Don't have an account? <button onClick={() => onViewChange('SIGNUP')} className="text-indigo-400 hover:text-indigo-300 font-semibold">Sign Up</button></p>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'SIGNUP') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen relative z-10 p-4">
        <AppLogo />
        <div className={formClass}>
           <div className="flex justify-center mb-6">
            <div className="bg-pink-500 p-3 rounded-full">
              <UserPlus size={32} className="text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center mb-2">Create Account</h2>
          <p className="text-gray-400 text-center mb-8">Start tracking your bills</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
              <input 
                type="text" 
                required 
                className={inputClass} 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="John Doe" 
                autoComplete="name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input 
                type="email" 
                required 
                className={inputClass} 
                value={email} 
                onChange={e => { setEmail(e.target.value); setError(''); }} 
                placeholder="you@example.com" 
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input 
                type="password" 
                required 
                className={inputClass} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            {successMsg && <p className="text-green-400 text-sm text-center">{successMsg}</p>}

            <button type="submit" className={btnClass.replace('bg-indigo-600', 'bg-pink-600').replace('hover:bg-indigo-700', 'hover:bg-pink-700')}>
              <UserPlus size={20} /> Sign Up
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
             <p className="text-gray-400">Already have an account? <button onClick={() => onViewChange('LOGIN')} className="text-pink-400 hover:text-pink-300 font-semibold">Login</button></p>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'FORGOT_PASSWORD') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen relative z-10 p-4">
        <AppLogo />
        <div className={formClass}>
          <div className="flex justify-center mb-6">
            <div className="bg-orange-500 p-3 rounded-full">
              <KeyRound size={32} className="text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Reset Password</h2>
          <p className="text-gray-400 text-center mb-8">Enter email and new password</p>

          <form onSubmit={handleForgotPass} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input 
                type="email" 
                required 
                className={inputClass} 
                value={email} 
                onChange={e => { setEmail(e.target.value); setError(''); }} 
                placeholder="you@example.com" 
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
              <input 
                type="password" 
                required 
                className={inputClass} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="New strong password" 
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            {successMsg && <p className="text-green-400 text-sm text-center">{successMsg}</p>}

            <button type="submit" className={btnClass.replace('bg-indigo-600', 'bg-orange-600').replace('hover:bg-indigo-700', 'hover:bg-orange-700')}>
              Update Password
            </button>
          </form>
           <div className="mt-6 text-center text-sm">
             <button onClick={() => onViewChange('LOGIN')} className="text-gray-400 hover:text-white">Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};