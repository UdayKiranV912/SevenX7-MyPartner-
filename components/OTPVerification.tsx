import React, { useState } from 'react';
import { registerUser, loginUser } from '../services/userService';
import { UserState } from '../types';
import SevenX7Logo from './SevenX7Logo';

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
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'VERIFY'>('LOGIN');
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', password: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleStandardLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg('');
      setLoading(true);
      setStatusMsg('Authenticating...');
      try {
          const user = await loginUser(formData.email, formData.password);
          onLoginSuccess(user);
      } catch (err: any) {
          const msg = err?.message || (typeof err === 'string' ? err : 'Invalid credentials');
          setErrorMsg(typeof msg === 'string' ? msg : 'Error');
          setLoading(false);
      }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg('');
      setLoading(true);
      setStatusMsg('Creating Profile...');
      try {
          const user = await registerUser(formData.email, formData.password, formData.fullName, formData.phone);
          onLoginSuccess(user);
      } catch (err: any) {
          const msg = err?.message || (typeof err === 'string' ? err : 'Registration failed');
          setErrorMsg(typeof msg === 'string' ? msg : 'Error');
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col items-center animate-scale-in">
        <div className="p-10 pb-6 text-center flex flex-col items-center w-full">
            <SevenX7Logo size="large" />
            <p className="text-slate-400 text-[10px] font-black mt-8 uppercase tracking-[0.3em]">Partner Portal Access</p>
        </div>

        <div className="p-8 pt-0 w-full">
            <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-8 border border-slate-100 shadow-inner">
                <button onClick={() => setAuthMode('LOGIN')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${authMode === 'LOGIN' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>Sign In</button>
                <button onClick={() => setAuthMode('REGISTER')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${authMode === 'REGISTER' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>Register</button>
            </div>

            {loading ? (
                <div className="py-12 flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{statusMsg}</p>
                </div>
            ) : (
                <form onSubmit={authMode === 'LOGIN' ? handleStandardLogin : handleRegister} className="space-y-4">
                    {authMode === 'REGISTER' && (
                      <>
                        <input type="text" placeholder="Full Name" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none border border-transparent focus:border-emerald-500 shadow-inner" required />
                        <input type="tel" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none border border-transparent focus:border-emerald-500 shadow-inner" required />
                      </>
                    )}
                    <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none border border-transparent focus:border-emerald-500 shadow-inner" required />
                    <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none border border-transparent focus:border-emerald-500 shadow-inner" required />
                    
                    {errorMsg && <p className="text-[10px] text-red-500 font-bold text-center bg-red-50 p-4 rounded-2xl border border-red-100">{errorMsg}</p>}
                    
                    <button type="submit" className="w-full bg-slate-900 text-white py-4.5 rounded-[1.5rem] font-black shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all mt-4">
                      {authMode === 'LOGIN' ? 'Start Delivery Session' : 'Create Operator Profile'}
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