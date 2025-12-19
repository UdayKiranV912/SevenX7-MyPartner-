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
  const [systemStats, setSystemStats] = useState({
      totalRevenue: 1254000,
      activeOrders: 42,
      activeRiders: 18,
      totalStores: MOCK_STORES.length,
      platformUptime: '99.9%'
  });

  const [simulationRiders, setSimulationRiders] = useState<any[]>([]);

  useEffect(() => {
    const riders = Array.from({ length: 8 }).map((_, i) => ({
      id: `rider-${i}`,
      lat: 12.9716 + (Math.random() - 0.5) * 0.1,
      lng: 77.5946 + (Math.random() - 0.5) * 0.1,
      name: `Rider ${i + 1}`,
      status: 'BUSY'
    }));
    setSimulationRiders(riders);

    const interval = setInterval(() => {
      setSimulationRiders(prev => prev.map(r => ({
        ...r,
        lat: r.lat + (Math.random() - 0.5) * 0.001,
        lng: r.lng + (Math.random() - 0.5) * 0.001
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const kpis = [
    { label: 'GMV (Monthly)', value: `₹${(systemStats.totalRevenue/100000).toFixed(1)}L`, icon: '📈', color: 'text-emerald-500' },
    { label: 'Active Orders', value: systemStats.activeOrders, icon: '📦', color: 'text-blue-500' },
    { label: 'Fleet Active', value: systemStats.activeRiders, icon: '🛵', color: 'text-orange-500' },
    { label: 'SLA Health', value: '94%', icon: '⏱️', color: 'text-purple-500' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar */}
        <aside className="w-64 bg-slate-950 border-r border-white/5 flex flex-col p-6 hidden md:flex">
          <div className="mb-10 px-2 transform scale-110 origin-left">
            <SevenX7Logo size="medium" />
          </div>

          <nav className="flex-1 space-y-2">
            {[
              { id: 'DASHBOARD', label: 'Platform Hub', icon: '🏠' },
              { id: 'STORES', label: 'Merchant Network', icon: '🏪' },
              { id: 'FLEET', label: 'Logistics Fleet', icon: '🛵' },
              { id: 'ANALYTICS', label: 'Revenue & Growth', icon: '📊' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                    activeTab === item.id 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/5">
             <button onClick={onLogout} className="w-full py-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-black uppercase transition-colors hover:bg-red-500/20">Terminate Session</button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar with Profile on Right */}
          <header className="h-20 bg-slate-900 border-b border-white/5 px-8 flex items-center justify-between z-50">
             <div className="flex items-center gap-4">
                <div className="md:hidden">
                    <SevenX7Logo size="xs" />
                </div>
                <h2 className="hidden md:block text-lg font-black tracking-tight">{activeTab} OVERVIEW</h2>
             </div>
             
             {/* Center Logo for mobile/compact feel */}
             <div className="md:hidden absolute left-1/2 -translate-x-1/2">
                <SevenX7Logo size="small" />
             </div>

             <div className="flex items-center gap-4">
                <button onClick={() => setActiveTab('PROFILE')} className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-emerald-400 hover:bg-white/10 active:scale-95 transition-all shadow-lg">
                    {user.name ? user.name[0] : 'A'}
                </button>
             </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 hide-scrollbar">
            {activeTab === 'PROFILE' ? (
                <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                    <div className="bg-slate-950 p-12 rounded-[3rem] border border-white/5 text-center">
                        <div className="w-32 h-32 bg-emerald-500 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl font-black shadow-2xl border-4 border-slate-900">{user.name ? user.name[0] : 'A'}</div>
                        <h3 className="text-3xl font-black">{user.name}</h3>
                        <p className="text-slate-500 uppercase tracking-widest font-bold mt-2">Platform Administrator</p>
                        <div className="mt-8 flex gap-4 justify-center">
                            <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Status</p>
                                <p className="text-emerald-400 font-black">Active Root</p>
                            </div>
                            <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Access</p>
                                <p className="text-blue-400 font-black">Tier 1</p>
                            </div>
                        </div>
                        <button onClick={onLogout} className="mt-12 w-full max-w-xs py-4 bg-red-500 text-white rounded-2xl font-black shadow-xl hover:bg-red-600 active:scale-95 transition-all">TERMINATE SESSION</button>
                    </div>
                </div>
            ) : (
                <>
                {/* KPI Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {kpis.map((kpi, idx) => (
                        <div key={idx} className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-white/5 shadow-xl hover:border-emerald-500/30 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{kpi.icon}</span>
                                <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-black">+12.4%</span>
                            </div>
                            <h4 className="text-3xl font-black mb-1">{kpi.value}</h4>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{kpi.label}</p>
                        </div>
                    ))}
                </div>

                {/* Global Map View */}
                <div className="bg-slate-950 rounded-[3rem] p-4 border border-white/5 h-[500px] relative overflow-hidden shadow-2xl">
                    <div className="absolute top-8 left-8 z-10 space-y-2 pointer-events-none">
                    <div className="bg-slate-900/90 backdrop-blur px-4 py-3 rounded-2xl border border-white/10 shadow-2xl">
                        <h3 className="text-sm font-black mb-1">CITY SURVEILLANCE</h3>
                        <p className="text-[10px] text-slate-500 font-bold">Bengaluru Metro Region</p>
                    </div>
                    </div>

                    <MapVisualizer 
                    stores={MOCK_STORES}
                    userLat={12.9716}
                    userLng={77.5946}
                    selectedStore={null}
                    onSelectStore={() => {}}
                    mode="DELIVERY"
                    className="h-full rounded-[2.5rem] border-0"
                    driverLocation={simulationRiders[0]} 
                    enableLiveTracking={false}
                    />
                </div>
                </>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Navigation - No Profile Here */}
      <nav className="md:hidden h-20 bg-slate-950 border-t border-white/5 flex items-center justify-around px-4 z-50">
        {[
          { id: 'DASHBOARD', icon: '🏠' },
          { id: 'STORES', icon: '🏪' },
          { id: 'FLEET', icon: '🛵' },
          { id: 'ANALYTICS', icon: '📊' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${activeTab === item.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500'}`}
          >
            {item.icon}
          </button>
        ))}
      </nav>
    </div>
  );
};