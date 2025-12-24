
import React, { useState } from 'react';
import { registerUser, loginUser, submitVerificationCode } from '../services/userService';
import { UserState } from '../types';
import SevenX7Logo from './SevenX7Logo';

const safeStr = (val: any, fallback: string = ''): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return isNaN(val) ? fallback : String(val);
    if (typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
        try {
            if (val.full_name && typeof val.full_name === 'string') return val.full_name;
            if (val.name && typeof val.name === 'string') return val.name;
            if (val.message && typeof val.message === 'string') return val.message;
        } catch(e) {}
        return fallback;
    }
    return fallback;
};

interface AuthProps {
  onLoginSuccess: (user: UserState) => void;
  onDemoLogin: () => void;
  onCustomerDemoLogin: () => void;
  onPartnerDemoLogin: () => void;
  onAdminDemoLogin?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ 
  onLoginSuccess, 
  onDemoLogin, 
  onCustomerDemoLogin, 
  onPartnerDemoLogin,
  onAdminDemoLogin 
}) => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'VERIFY_PENDING'>('LOGIN');
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', upiId: '', password: '', adminCode: '' });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredUser, setRegisteredUser] = useState<UserState | null>(null);

  const handleStandardLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg('');
      setLoading(true);
      setStatusMsg('Authenticating...');
      try {
          const user = await loginUser(formData.email, formData.password);
          onLoginSuccess(user);
      } catch (err: any) {
          if (err.message?.includes('ACCOUNT_PENDING')) {
              setErrorMsg('Access Denied: Account is awaiting Super Admin approval.');
              setAuthMode('VERIFY_PENDING');
          } else {
              setErrorMsg(err?.message || 'Invalid credentials');
          }
          setLoading(false);
      }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg('');
      setLoading(true);
      setStatusMsg('Creating Profile...');
      try {
          const user = await registerUser(formData.email, formData.password, formData.fullName, formData.phone, formData.upiId);
          setRegisteredUser(user);
          setAuthMode('VERIFY_PENDING');
          setLoading(false);
      } catch (err: any) {
          setErrorMsg(err?.message || 'Registration failed');
          setLoading(false);
      }
  };

  const handleSubmitAdminCode = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setStatusMsg('Submitting to HQ...');
      try {
          // In a real flow, this would save the code for admin review
          if (registeredUser?.id) {
              await submitVerificationCode(registeredUser.id, formData.adminCode);
          }
          setStatusMsg('Code Received. Please wait for Super Admin approval.');
          setTimeout(() => setLoading(false), 2000);
      } catch (e) {
          setErrorMsg('Failed to transmit code.');
          setLoading(false);
      }
  };

  if (authMode === 'VERIFY_PENDING') {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="w-full max-w-sm bg-white rounded-[3rem] shadow-2xl p-10 overflow-hidden animate-scale-in text-slate-900">
                <SevenX7Logo size="medium" hideBrandName={true} />
                <div className="mt-8 mb-6 flex flex-col items-center">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center relative mb-4">
                        <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full animate-ping"></div>
                        <span className="text-3xl animate-pulse">🛰️</span>
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Security Gated</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 text-center leading-relaxed">
                        Your credentials have been logged.<br/>HQ must authorize this terminal.
                    </p>
                </div>

                {loading ? (
                    <div className="py-6 text-center">
                        <div className="w-8 h-8 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{safeStr(statusMsg)}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmitAdminCode} className="space-y-4">
                        <div className="space-y-1 text-left">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Authorization Code</label>
                            <input 
                                type="text" 
                                placeholder="Enter code from HQ" 
                                value={formData.adminCode} 
                                onChange={(e) => setFormData({...formData, adminCode: e.target.value})} 
                                className="w-full bg-slate-50 rounded-2xl p-4 text-center text-lg font-black text-slate-800 outline-none border-0 shadow-inner" 
                                required 
                            />
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg uppercase tracking-widest text-[10px] active:scale-95 transition-all">
                            Submit for Verification
                        </button>
                    </form>
                )}

                <button onClick={() => setAuthMode('LOGIN')} className="mt-6 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-transparent hover:border-slate-300">
                    Cancel & Return to Login
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col items-center animate-scale-in">
        <div className="p-10 pb-6 text-center flex flex-col items-center w-full">
            <SevenX7Logo size="large" />
            <p className="text-slate-400 text-[10px] font-black mt-8 uppercase tracking-[0.3em]">Operator Session Node</p>
        </div>

        <div className="p-8 pt-0 w-full">
            <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-8 border border-slate-100 shadow-inner">
                <button onClick={() => setAuthMode('LOGIN')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${authMode === 'LOGIN' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>Sign In</button>
                <button onClick={() => setAuthMode('REGISTER')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${authMode === 'REGISTER' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>Register</button>
            </div>

            {loading ? (
                <div className="py-12 flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{safeStr(statusMsg)}</p>
                </div>
            ) : (
                <form onSubmit={authMode === 'LOGIN' ? handleStandardLogin : handleRegister} className="space-y-4">
                    {authMode === 'REGISTER' && (
                      <>
                        <input type="text" placeholder="Full Name" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none border border-transparent focus:border-emerald-500 shadow-inner" required />
                        <input type="tel" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none border border-transparent focus:border-emerald-500 shadow-inner" required />
                        <input type="text" placeholder="UPI ID (for receiving payouts)" value={formData.upiId} onChange={(e) => setFormData({...formData, upiId: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none border border-transparent focus:border-emerald-500 shadow-inner" required />
                      </>
                    )}
                    <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none border border-transparent focus:border-emerald-500 shadow-inner" required />
                    <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none border border-transparent focus:border-emerald-500 shadow-inner" required />
                    
                    {errorMsg && <p className="text-[10px] text-red-500 font-bold text-center bg-red-50 p-4 rounded-2xl border border-red-100">{safeStr(errorMsg)}</p>}
                    
                    <button type="submit" className="w-full bg-slate-900 text-white py-4.5 rounded-[1.5rem] font-black shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all mt-4">
                      {authMode === 'LOGIN' ? 'Login for Validation' : 'Register Operator'}
                    </button>
                </form>
            )}
        </div>
        
        <div className="bg-slate-50 p-8 text-center border-t border-slate-100 w-full">
            <button type="button" onClick={onPartnerDemoLogin} className="flex items-center justify-center gap-3 bg-white px-6 py-4 rounded-2xl border border-slate-200 text-xs font-black text-slate-600 shadow-sm w-full hover:bg-emerald-50 transition-all active:scale-95">
                <span className="text-xl">🛵</span>
                <span>TRY DEMO MODE</span>
            </button>
        </div>
      </div>
    </div>
  );
};
