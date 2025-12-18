
import React, { useState } from 'react';
import { registerUser, loginUser } from '../services/userService';
import { UserState } from '../types';
import SevenX7Logo from './SevenX7Logo';

interface AuthProps {
  onLoginSuccess: (user: UserState) => void;
  onDemoLogin: () => void;
  onCustomerDemoLogin: () => void;
  onPartnerDemoLogin: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess, onDemoLogin, onCustomerDemoLogin, onPartnerDemoLogin }) => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'VERIFY'>('LOGIN');
  
  const [formData, setFormData] = useState({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      otp: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg('');
      setLoading(true);
      setStatusMsg('Joining the fleet...');

      try {
          // Defaulting registration to delivery_partner role for this context if needed
          // Realistically, the backend handles role assignment or user chooses
          await registerUser(formData.email, formData.password, formData.fullName, formData.phone);
          setLoading(false);
          setAuthMode('VERIFY'); 
      } catch (err: any) {
          setErrorMsg(err.message || 'Registration failed');
          setLoading(false);
      }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setErrorMsg('');

      setTimeout(() => {
          if (formData.otp === '1234' || formData.otp === '0000') {
             loginUser(formData.email, formData.password)
                .then(user => onLoginSuccess(user))
                .catch(err => setErrorMsg(err.message));
          } else {
             setLoading(false);
             setErrorMsg("Invalid OTP.");
          }
      }, 1500);
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg('');
      setLoading(true);
      setStatusMsg('Logging in...');

      try {
          const user = await loginUser(formData.email, formData.password);
          onLoginSuccess(user);
      } catch (err: any) {
          setErrorMsg(err.message || 'Invalid credentials');
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      <div className="z-10 w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative border border-slate-100">
        
        {/* Logo Section */}
        <div className="bg-white p-8 pb-4 text-center">
            <div className="mb-4 flex justify-center">
                <SevenX7Logo size="medium" />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">My Partner</h1>
            <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Global Fleet Management</p>
        </div>

        {/* Auth Forms */}
        <div className="p-8 pt-2">
            {authMode !== 'VERIFY' && (
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    <button 
                        onClick={() => setAuthMode('LOGIN')}
                        className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${authMode === 'LOGIN' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                    >
                        Log In
                    </button>
                    <button 
                        onClick={() => setAuthMode('REGISTER')}
                        className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${authMode === 'REGISTER' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                    >
                        Join Fleet
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center py-10">
                    <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                    <p className="font-bold text-slate-500 text-xs uppercase tracking-widest">{statusMsg || 'Connecting...'}</p>
                </div>
            ) : (
                <div className="animate-fade-in space-y-5">
                    {authMode === 'LOGIN' && (
                        <form onSubmit={handleStandardLogin} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Registered Email</label>
                                <input 
                                    type="email" 
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full bg-slate-50 border-0 rounded-xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Security Password</label>
                                <input 
                                    type="password" 
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    className="w-full bg-slate-50 border-0 rounded-xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    required
                                />
                            </div>
                            {errorMsg && <p className="text-[10px] text-red-500 font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100">{errorMsg}</p>}
                            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-black active:scale-[0.98] transition-all">
                                ACCESS DASHBOARD
                            </button>
                        </form>
                    )}

                    {authMode === 'REGISTER' && (
                        <form onSubmit={handleRegister} className="space-y-3">
                            <input 
                                type="text" 
                                placeholder="Full Legal Name" 
                                value={formData.fullName}
                                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                className="w-full bg-slate-50 border-0 rounded-xl p-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                required
                            />
                            <input 
                                type="tel" 
                                placeholder="WhatsApp Number" 
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                className="w-full bg-slate-50 border-0 rounded-xl p-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                required
                            />
                            <input 
                                type="email" 
                                placeholder="Email ID" 
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="w-full bg-slate-50 border-0 rounded-xl p-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                required
                            />
                            <input 
                                type="password" 
                                placeholder="Create Password" 
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                className="w-full bg-slate-50 border-0 rounded-xl p-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                required
                            />
                            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-black active:scale-[0.98] transition-all mt-2">
                                SUBMIT APPLICATION
                            </button>
                        </form>
                    )}

                    {authMode === 'VERIFY' && (
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
                                🔑
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Verify Identity</h3>
                                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wide">Enter the 4-digit code</p>
                            </div>
                            <form onSubmit={handleVerifyOTP} className="space-y-4 pt-2">
                                <input 
                                    type="text" 
                                    placeholder="----" 
                                    value={formData.otp}
                                    onChange={(e) => setFormData({...formData, otp: e.target.value})}
                                    className="w-full text-center tracking-[0.8em] text-3xl font-black bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    required
                                    maxLength={4}
                                />
                                {errorMsg && <p className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
                                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-black active:scale-[0.98] transition-all">
                                    VERIFY & START
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
        
        {/* Simplified Demo Footer */}
        {authMode !== 'VERIFY' && (
            <div className="bg-slate-50 p-6 text-center border-t border-slate-100 w-full">
                <button 
                    type="button" 
                    onClick={onPartnerDemoLogin}
                    className="flex items-center justify-center gap-3 bg-white px-6 py-3 rounded-2xl border border-slate-200 text-xs font-black text-slate-600 shadow-sm hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95 group w-full"
                >
                    <span className="text-xl group-hover:scale-110 transition-transform">🛵</span>
                    <span>TRY PARTNER DEMO MODE</span>
                </button>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-4">Safe & Secure Logistics</p>
            </div>
        )}
      </div>
    </div>
  );
};
