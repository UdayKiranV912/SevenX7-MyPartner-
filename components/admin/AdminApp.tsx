import React, { useState } from 'react';
import { UserState, Store } from '../../types';
import SevenX7Logo from '../SevenX7Logo';
import { MapVisualizer } from '../MapVisualizer';
import { MOCK_STORES } from '../../constants';

interface AdminAppProps {
  user: UserState;
  onLogout: () => void;
}

/**
 * Enhanced safeStr to strictly prevent [object Object] rendering
 */
const safeStr = (val: any, fallback: string = ''): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return isNaN(val) ? fallback : String(val);
    if (typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
        if (val.message && typeof val.message === 'string') return val.message;
        if (val.name && typeof val.name === 'string') return val.name;
        return fallback;
    }
    return fallback;
};

// Mock Transaction log for HQ
const HQ_TRANSACTIONS = [
    { id: 't1', user: 'Kumar R.', type: 'PAYOUT', amount: -450, status: 'Completed', date: '2023-10-24' },
    { id: 't2', user: 'MK Ahmed', type: 'COLLECTION', amount: 4200, status: 'Pending', date: '2023-10-24' },
    { id: 't3', user: 'Anish K.', type: 'PAYOUT', amount: -280, status: 'Processing', date: '2023-10-24' },
];

export const AdminApp: React.FC<AdminAppProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STORES' | 'TASKS' | 'FINANCE' | 'PROFILE'>('DASHBOARD');
  const [partners, setPartners] = useState([
      { id: 'p1', name: 'Kumar R.', taskCount: 12, balance: 450, upi: 'kumar@upi' },
      { id: 'p2', name: 'Anish K.', taskCount: 8, balance: 280, upi: 'anish@upi' },
      { id: 'p3', name: 'Suresh M.', taskCount: 15, balance: 620, upi: 'suresh@upi' },
  ]);

  const totalLiability = partners.reduce((sum, p) => sum + p.balance, 0);

  return (
    <div className="fixed inset-0 bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      <header className="h-16 bg-slate-950 border-b border-white/5 px-5 flex items-center justify-between z-[100] shadow-xl">
          <SevenX7Logo size="xs" />
          <button onClick={() => setActiveTab('PROFILE')} className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-900 flex items-center justify-center text-[10px] font-black shadow-lg">
              {safeStr(user.name, 'A').charAt(0)}
          </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-16 md:pb-4 space-y-6 hide-scrollbar">
        {activeTab === 'DASHBOARD' && (
            <div className="animate-fade-in space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: 'Platform Rev', val: '₹42,850', color: 'text-white' }, 
                      { label: 'Liability', val: `₹${totalLiability}`, color: 'text-orange-400' }, 
                      { label: 'Active Tasks', val: '14', color: 'text-blue-400' }, 
                      { label: 'HQ Sync', val: 'OK', color: 'text-emerald-400' }
                    ].map((k, i) => (
                        <div key={i} className="bg-slate-950/50 p-4 rounded-[2rem] border border-white/5 shadow-lg">
                            <h4 className={`text-lg font-black ${k.color}`}>{safeStr(k.val)}</h4>
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-1">{safeStr(k.label)}</p>
                        </div>
                    ))}
                </div>
                <div className="h-64 bg-slate-950 rounded-[2.5rem] border border-white/5 overflow-hidden relative">
                    <MapVisualizer stores={MOCK_STORES} userLat={12.9716} userLng={77.5946} selectedStore={null} onSelectStore={()=>{}} mode="DELIVERY" className="h-full opacity-60" enableLiveTracking={false} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-4 left-4"><p className="text-[9px] font-black uppercase text-emerald-400">Live Traffic Control</p></div>
                </div>
            </div>
        )}

        {activeTab === 'FINANCE' && (
            <div className="animate-fade-in space-y-4">
                <div className="bg-emerald-500 rounded-[2.5rem] p-8 text-slate-900 shadow-xl">
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Total Unsettled Fees</p>
                    <h2 className="text-4xl font-black">₹{safeStr(totalLiability.toLocaleString(), '0')}</h2>
                    <button onClick={() => setPartners(prev => prev.map(p => ({...p, balance: 0})))} className="mt-6 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">Settle All Payouts</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950/50 rounded-[2.5rem] border border-white/5 overflow-hidden p-6">
                        <h3 className="text-xs font-black uppercase text-slate-500 mb-6 tracking-widest">Partner Balances</h3>
                        <div className="space-y-4">
                            {partners.map(p => (
                                <div key={p.id} className="flex justify-between items-center border-b border-white/5 pb-4 last:border-none">
                                    <div className="min-w-0 flex-1 pr-4">
                                        <p className="text-xs font-black truncate">{safeStr(p.name)}</p>
                                        <p className="text-[8px] text-slate-500 font-mono truncate">{safeStr(p.upi)}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-xs font-black ${p.balance > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>₹{safeStr(p.balance)}</p>
                                        <button onClick={() => setPartners(prev => prev.map(pa => pa.id === p.id ? {...pa, balance: 0} : pa))} disabled={p.balance === 0} className={`text-[7px] font-black uppercase tracking-widest ${p.balance === 0 ? 'text-slate-700' : 'text-white underline'}`}>Settle</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-950/50 rounded-[2.5rem] border border-white/5 overflow-hidden p-6">
                        <h3 className="text-xs font-black uppercase text-slate-500 mb-6 tracking-widest">Audit Log</h3>
                        <div className="space-y-4">
                            {HQ_TRANSACTIONS.map(tx => (
                                <div key={tx.id} className="flex justify-between items-center pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full ${tx.type === 'PAYOUT' ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
                                        <div>
                                            <p className="text-[10px] font-black">{safeStr(tx.user)}</p>
                                            <p className="text-[7px] text-slate-500 uppercase">{safeStr(tx.type)}</p>
                                        </div>
                                    </div>
                                    <p className={`text-[10px] font-black ${tx.amount < 0 ? 'text-orange-400' : 'text-emerald-400'}`}>{tx.amount < 0 ? '-' : '+'}₹{safeStr(Math.abs(tx.amount))}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'STORES' && (
            <div className="space-y-4">
                <h2 className="text-lg font-black px-2">Partner Marts</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MOCK_STORES.slice(0, 12).map(s => (
                        <div key={s.id} className="bg-slate-950/50 p-5 rounded-[2.5rem] border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-xl shrink-0">🏪</div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black truncate">{safeStr(s.name)}</p>
                                    <p className="text-[8px] text-slate-500 truncate max-w-[120px]">{safeStr(s.address)}</p>
                                </div>
                            </div>
                            <span className="text-[7px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full uppercase shrink-0">Active</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'PROFILE' && (
            <div className="max-w-xs mx-auto text-center mt-10">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-black text-slate-900 shadow-xl ring-4 ring-white/5">
                    {safeStr(user.name, 'A').charAt(0)}
                </div>
                <h3 className="text-lg font-black truncate">{safeStr(user.name, 'Admin')}</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase mt-1">Superuser • HQ Command</p>
                <button onClick={onLogout} className="mt-8 w-full py-4 bg-red-500/10 text-red-500 rounded-[1.5rem] font-black uppercase text-[9px] tracking-widest border border-red-500/20 active:scale-95 transition-all">Sign Out Platform</button>
            </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-slate-950/95 backdrop-blur-xl border-t border-white/5 flex items-center justify-around z-[110] md:hidden">
        {[
          { id: 'DASHBOARD', icon: '🏠', label: 'HQ' }, 
          { id: 'STORES', icon: '🏪', label: 'Marts' }, 
          { id: 'TASKS', icon: '📋', label: 'Tasks' }, 
          { id: 'FINANCE', icon: '🏦', label: 'Payout' }
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