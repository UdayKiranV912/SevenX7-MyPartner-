
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
          setErrorMsg(err.message || 'Invalid credentials');
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        <div className="p-10 pb-6 text-center">
            <SevenX7Logo size="small" />
            <p className="text-slate-400 text-[9px] font-black mt-3 uppercase tracking-[0.2em]">Partner Portal Access</p>
        </div>

        <div className="p-8 pt-0">
            <div className="flex bg-slate-50 p-1 rounded-xl mb-6 border border-slate-100">
                <button onClick={() => setAuthMode('LOGIN')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${authMode === 'LOGIN' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>Sign In</button>
                <button onClick={() => setAuthMode('REGISTER')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${authMode === 'REGISTER' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>Register</button>
            </div>

            {loading ? (
                <div className="py-12 flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{statusMsg}</p>
                </div>
            ) : (
                <form onSubmit={handleStandardLogin} className="space-y-4">
                    <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 rounded-xl p-4 text-sm font-bold text-slate-800 outline-none border border-transparent focus:border-emerald-500" required />
                    <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 rounded-xl p-4 text-sm font-bold text-slate-800 outline-none border border-transparent focus:border-emerald-500" required />
                    {errorMsg && <p className="text-[10px] text-red-500 font-bold text-center bg-red-50 p-3 rounded-xl">{errorMsg}</p>}
                    <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs active:scale-95 transition-all">Start Delivery Session</button>
                </form>
            )}
        </div>
        
        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
            <button type="button" onClick={onPartnerDemoLogin} className="flex items-center justify-center gap-3 bg-white px-6 py-3 rounded-2xl border border-slate-200 text-xs font-black text-slate-600 shadow-sm w-full hover:bg-emerald-50 transition-all">
                <span className="text-xl">🛵</span>
                <span>TRY DEMO MODE</span>
            </button>
        </div>
      </div>
    </div>
  );
};
