
import React, { useState, useEffect } from 'react';
import { UserState, Order, Store } from '../../types';
import SevenX7Logo from '../SevenX7Logo';
import { MapVisualizer } from '../MapVisualizer';
import { MOCK_STORES } from '../../constants';

interface AdminAppProps {
  user: UserState;
  onLogout: () => void;
}

export const AdminApp: React.FC<AdminAppProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STORES' | 'FLEET' | 'ANALYTICS' | 'PROFILE'>('DASHBOARD');
  
  return (
    <div className="fixed inset-0 bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      <header className="h-16 bg-slate-950 border-b border-white/5 px-6 flex items-center justify-between z-[100]">
          <div className="w-24">
              <SevenX7Logo size="xs" />
          </div>
          
          <div className="flex-1 text-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                  Platform Control Center
              </span>
          </div>

          <div className="w-24 flex justify-end">
              <button onClick={() => setActiveTab('PROFILE')} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-emerald-400 shadow-lg">
                  {user.name ? user.name[0] : 'A'}
              </button>
          </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        {activeTab === 'PROFILE' ? (
            <div className="max-w-md mx-auto bg-slate-950 p-10 rounded-[3rem] border border-white/5 text-center animate-fade-in">
                <div className="w-24 h-24 bg-emerald-500 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl font-black shadow-2xl">{user.name ? user.name[0] : 'A'}</div>
                <h3 className="text-2xl font-black">{user.name}</h3>
                <p className="text-slate-500 uppercase tracking-widest text-[10px] font-bold mt-2">Master Administrator</p>
                <button onClick={onLogout} className="mt-10 w-full py-4 bg-red-500 text-white rounded-2xl font-black shadow-xl hover:bg-red-600 transition-all uppercase text-[10px] tracking-[0.2em]">Terminate Admin Session</button>
            </div>
        ) : (
            <div className="animate-fade-in space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[{ label: 'Rev', val: '₹12.5L', icon: '📈' }, { label: 'Orders', val: '42', icon: '📦' }, { label: 'Fleet', val: '18', icon: '🛵' }, { label: 'SLA', val: '98%', icon: '⏱️' }].map((k, i) => (
                        <div key={i} className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-white/5">
                            <span className="text-xl mb-2 block">{k.icon}</span>
                            <h4 className="text-2xl font-black">{k.val}</h4>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{k.label}</p>
                        </div>
                    ))}
                </div>
                <div className="h-[400px] bg-slate-950 rounded-[3rem] border border-white/5 overflow-hidden">
                    <MapVisualizer stores={MOCK_STORES} userLat={12.9716} userLng={77.5946} selectedStore={null} onSelectStore={()=>{}} mode="DELIVERY" className="h-full" />
                </div>
            </div>
        )}
      </main>

      <nav className="md:hidden h-20 bg-slate-950 border-t border-white/5 flex items-center justify-around px-4">
        {[{ id: 'DASHBOARD', icon: '🏠' }, { id: 'STORES', icon: '🏪' }, { id: 'FLEET', icon: '🛵' }, { id: 'ANALYTICS', icon: '📊' }].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${activeTab === item.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500'}`}>
            {item.icon}
          </button>
        ))}
      </nav>
    </div>
  );
};
