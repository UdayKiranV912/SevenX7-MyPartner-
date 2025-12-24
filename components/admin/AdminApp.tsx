
import React, { useState, useEffect } from 'react';
import { UserState, Store } from '../../types';
import SevenX7Logo from '../SevenX7Logo';
import { MapVisualizer } from '../MapVisualizer';
import { MOCK_STORES } from '../../constants';
import { supabase } from '../../services/supabaseClient';

interface AdminAppProps {
  user: UserState;
  onLogout: () => void;
}

/**
 * Ultra-robust helper to strictly prevent [object Object] rendering.
 * Extracts nested name/message fields or returns a fallback.
 * Guaranteed to never return an object to the JSX engine.
 */
const safeStr = (val: any, fallback: string = ''): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return isNaN(val) ? fallback : String(val);
    if (typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
        if (Array.isArray(val)) return fallback;
        try {
            // Check common nested structures from database profiles
            if (val.full_name && typeof val.full_name === 'string') return val.full_name;
            if (val.name && typeof val.name === 'string') return val.name;
            if (val.message && typeof val.message === 'string') return val.message;
            if (val.display_name && typeof val.display_name === 'string') return val.display_name;
        } catch(e) {}
        return fallback; 
    }
    return fallback;
};

export const AdminApp: React.FC<AdminAppProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STORES' | 'TASKS' | 'APPROV' | 'FINANCE' | 'PROFILE'>('DASHBOARD');
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState([
      { id: 'p1', name: 'Kumar R.', taskCount: 12, balance: 450, upi: 'kumar@upi' },
      { id: 'p2', name: 'Anish K.', taskCount: 8, balance: 280, upi: 'anish@upi' },
  ]);

  useEffect(() => {
      if (activeTab === 'APPROV') {
          fetchPendingUsers();
      }
  }, [activeTab]);

  const fetchPendingUsers = async () => {
      setLoading(true);
      try {
          const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('verification_status', 'pending');
          if (data) setPendingUsers(data);
      } catch (e) { console.error("Fetch Pending error:", e); }
      finally { setLoading(false); }
  };

  const handleApprove = async (id: string) => {
      try {
          const { error } = await supabase
              .from('profiles')
              .update({ verification_status: 'verified' })
              .eq('id', id);
          if (!error) setPendingUsers(prev => prev.filter(u => u.id !== id));
      } catch (e) { alert("Approval failed."); }
  };

  const totalLiability = partners.reduce((sum, p) => sum + p.balance, 0);

  return (
    <div className="fixed inset-0 bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      <header className="h-12 bg-slate-950 border-b border-white/5 px-5 flex items-center justify-between z-[100] shadow-xl relative">
          <SevenX7Logo size="xs" hideBrandName={true} />
          
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-10 pointer-events-none">
              <span className="text-[10px] font-black text-white uppercase tracking-[0.15em] truncate max-w-[140px]">
                {safeStr(user?.name, 'Admin')}
              </span>
          </div>

          <div className="flex items-center gap-3">
            {pendingUsers.length > 0 && (
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
            )}
            <button onClick={() => setActiveTab('PROFILE')} className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center text-[10px] font-black shadow-lg z-20">
                {safeStr(user?.name, 'A').charAt(0)}
            </button>
          </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-16 md:pb-4 space-y-6 hide-scrollbar">
        {activeTab === 'DASHBOARD' && (
            <div className="animate-fade-in space-y-6 flex flex-col items-center">
                <div className="w-full text-center py-6 animate-fade-in">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-2 opacity-80">HQ Command Center</p>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase mb-1 drop-shadow-sm truncate px-4">
                        {safeStr(user?.name, 'Operator')}
                    </h2>
                    <div className="h-1 w-12 bg-emerald-500 mx-auto rounded-full mt-4"></div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                    {[
                      { label: 'Platform Rev', val: '₹42,850', color: 'text-white' }, 
                      { label: 'Liability', val: `₹${totalLiability.toLocaleString()}`, color: 'text-orange-400' }, 
                      { label: 'Pending Approvals', val: String(pendingUsers.length), color: 'text-blue-400' }, 
                      { label: 'HQ Sync', val: 'OK', color: 'text-emerald-400' }
                    ].map((k, i) => (
                        <div key={i} onClick={() => i === 2 && setActiveTab('APPROV')} className={`bg-slate-950/50 p-4 rounded-[2rem] border border-white/5 shadow-lg ${i === 2 ? 'cursor-pointer hover:bg-slate-900' : ''}`}>
                            <h4 className={`text-lg font-black ${k.color}`}>{safeStr(k.val)}</h4>
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-1">{safeStr(k.label)}</p>
                        </div>
                    ))}
                </div>

                <div className="h-64 bg-slate-950 rounded-[2.5rem] border border-white/5 overflow-hidden relative w-full">
                    <MapVisualizer stores={MOCK_STORES} userLat={12.9716} userLng={77.5946} selectedStore={null} onSelectStore={()=>{}} mode="DELIVERY" className="h-full opacity-60" enableLiveTracking={false} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Live Command Feed</p>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'APPROV' && (
            <div className="animate-fade-in space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h2 className="text-xl font-black uppercase tracking-tight">Security Clearing</h2>
                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
                        {pendingUsers.length} Operators Pending
                    </span>
                </div>

                {loading ? (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                         <div className="w-10 h-10 border-2 border-white/5 border-t-emerald-500 rounded-full animate-spin"></div>
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Scanning Auth Database...</p>
                    </div>
                ) : pendingUsers.length === 0 ? (
                    <div className="py-20 text-center bg-slate-950/30 rounded-[3rem] border border-white/5">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">All operators cleared.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingUsers.map(u => (
                            <div key={safeStr(u.id, Math.random().toString())} className="bg-slate-950/80 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col gap-4 animate-slide-up group">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl">👤</div>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-sm truncate">{safeStr(u.full_name, 'Unknown Partner')}</h4>
                                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{safeStr(u.phone_number, 'No Phone')}</p>
                                        </div>
                                    </div>
                                    {u.admin_verification_code && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                                            <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Code</p>
                                            <p className="text-[10px] font-mono font-black text-emerald-400">{safeStr(u.admin_verification_code)}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleApprove(u.id)} className="flex-1 bg-emerald-500 text-slate-950 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">Authorize</button>
                                    <button className="flex-1 bg-white/5 text-red-500 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">Reject</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'TASKS' && (
            <div className="animate-fade-in space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h2 className="text-xl font-black uppercase tracking-tight">Active Command Radar</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { id: '101', store: 'Nandini Parlour', dest: 'HSR Sec 2', status: 'En-route', time: '4m' },
                        { id: '102', store: 'MK Ahmed', dest: 'Indiranagar', status: 'Packing', time: '8m' },
                    ].map(task => (
                        <div key={safeStr(task.id)} className="bg-slate-950/50 p-5 rounded-[2.5rem] border border-white/5 flex items-center justify-between group">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-lg">🛵</div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black truncate">{safeStr(task.store)} → {safeStr(task.dest)}</p>
                                    <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Order #{safeStr(task.id)}</p>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <span className="text-[7px] font-black px-2 py-1 rounded-full uppercase tracking-widest border text-emerald-400 border-emerald-400/20 bg-emerald-400/5">
                                    {safeStr(task.status)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'FINANCE' && (
            <div className="animate-fade-in space-y-4">
                <div className="bg-emerald-500 rounded-[2.5rem] p-8 text-slate-900 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Total Unsettled Liability</p>
                    <h2 className="text-4xl font-black">₹{safeStr(totalLiability.toLocaleString(), '0')}</h2>
                    <button onClick={() => setPartners(prev => prev.map(p => ({...p, balance: 0})))} className="mt-6 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">Settle All</button>
                </div>
            </div>
        )}

        {activeTab === 'STORES' && (
            <div className="space-y-4 animate-fade-in">
                <h2 className="text-lg font-black px-2 uppercase tracking-tight">Partner Marts</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MOCK_STORES.slice(0, 8).map(s => (
                        <div key={safeStr(s.id)} className="bg-slate-950/50 p-5 rounded-[2.5rem] border border-white/5 flex items-center justify-between group">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-xl shrink-0">🏪</div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black truncate">{safeStr(s.name)}</p>
                                    <p className="text-[8px] text-slate-500 truncate">{safeStr(s.address)}</p>
                                </div>
                            </div>
                            <span className="text-[7px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full uppercase tracking-widest">Active</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'PROFILE' && (
            <div className="max-w-xs mx-auto text-center mt-10 animate-fade-in">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-black text-slate-900 shadow-xl">
                    {safeStr(user?.name, 'A').charAt(0)}
                </div>
                <h3 className="text-lg font-black truncate">{safeStr(user?.name, 'Admin')}</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase mt-1 tracking-[0.2em]">Superuser</p>
                <div className="mt-10 space-y-3">
                    <button onClick={onLogout} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase text-[9px] tracking-widest border border-red-500/20 active:scale-95 transition-all">Terminate Admin Session</button>
                </div>
            </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-slate-950/95 backdrop-blur-xl border-t border-white/5 flex items-center justify-around z-[110] md:hidden">
        {[
          { id: 'DASHBOARD', icon: '🏠', label: 'HQ' }, 
          { id: 'APPROV', icon: '🛡️', label: 'Auth' }, 
          { id: 'TASKS', icon: '📋', label: 'Radar' }, 
          { id: 'FINANCE', icon: '🏦', label: 'Bank' }
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-0.5 transition-all flex-1 ${activeTab === item.id ? 'text-emerald-400' : 'text-slate-600'}`}>
            <span className={`text-lg ${activeTab === item.id ? 'scale-110' : 'grayscale opacity-50'}`}>{item.icon}</span>
            <span className={`text-[6px] font-black uppercase tracking-widest ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
