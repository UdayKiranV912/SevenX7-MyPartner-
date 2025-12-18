
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
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STORES' | 'FLEET' | 'ANALYTICS'>('DASHBOARD');
  const [systemStats, setSystemStats] = useState({
      totalRevenue: 1254000,
      activeOrders: 42,
      activeRiders: 18,
      totalStores: MOCK_STORES.length,
      platformUptime: '99.9%'
  });

  const [simulationRiders, setSimulationRiders] = useState<any[]>([]);

  // Simulation for live rider movement on the admin map
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
      {/* Admin Sidebar - Desktop Only for now, simple top bar for mobile */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar */}
        <aside className="w-64 bg-slate-950 border-r border-white/5 flex flex-col p-6 hidden md:flex">
          <div className="mb-10 px-2">
            <SevenX7Logo size="medium" />
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Control Center</p>
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
             <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl mb-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black">A</div>
                <div className="min-w-0">
                    <p className="text-xs font-black truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Root Admin</p>
                </div>
             </div>
             <button onClick={onLogout} className="w-full py-3 text-slate-500 hover:text-red-400 text-xs font-black uppercase transition-colors">Terminate Session</button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="h-16 bg-slate-900 border-b border-white/5 px-8 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <h2 className="text-lg font-black tracking-tight">{activeTab} OVERVIEW</h2>
                <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                   System Live
                </div>
             </div>
             <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 text-slate-500 text-xs font-bold">
                   <span className="text-slate-700">CPU:</span> 14%
                   <span className="mx-2 text-slate-800">|</span>
                   <span className="text-slate-700">NET:</span> 1.2 GB/s
                </div>
                <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">🔔</button>
             </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 hide-scrollbar">
            
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
                   <div className="flex gap-2">
                      <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-500/20">34 Stores</div>
                      <div className="bg-orange-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-orange-500/20">18 Riders</div>
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
                  driverLocation={simulationRiders[0]} // Show first simulation rider as primary for interaction
                  enableLiveTracking={false}
                />
            </div>

            {/* Bottom Grid: Activity & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Real-time Ticker */}
                <div className="lg:col-span-2 bg-slate-950/50 rounded-[3rem] p-8 border border-white/5 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black tracking-tight">System Event Stream</h3>
                        <button className="text-[10px] font-black text-emerald-500 uppercase">View All</button>
                    </div>
                    <div className="space-y-4">
                        {[
                            { time: '2m ago', event: 'Order #4291 Placed', detail: 'Nandini Store • ₹420', icon: '📝' },
                            { time: '5m ago', event: 'Rider Assigned', detail: 'Kumar R. to MK Ahmed', icon: '🛵' },
                            { time: '8m ago', event: 'New Merchant Signup', detail: 'Giri Grocery Mart', icon: '🏪' },
                            { time: '12m ago', event: 'Payment Settled', detail: 'TXN_ID_9921 • ₹1,200', icon: '💸' },
                            { time: '15m ago', event: 'High Traffic Alert', detail: 'Indiranagar Sector 4', icon: '⚠️' }
                        ].map((log, i) => (
                            <div key={i} className="flex items-center gap-6 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                <div className="text-xl bg-slate-900 w-10 h-10 flex items-center justify-center rounded-xl shadow-inner border border-white/5">{log.icon}</div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-black">{log.event}</h4>
                                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">{log.detail}</p>
                                </div>
                                <span className="text-[9px] font-bold text-slate-600 uppercase">{log.time}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Efficiency Stats */}
                <div className="bg-slate-950/50 rounded-[3rem] p-8 border border-white/5 shadow-xl">
                    <h3 className="text-lg font-black tracking-tight mb-8">Service Metrics</h3>
                    <div className="space-y-8">
                        <div>
                           <div className="flex justify-between text-xs font-black uppercase mb-2">
                               <span className="text-slate-400">Order Fulfilment</span>
                               <span className="text-emerald-500">92%</span>
                           </div>
                           <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                               <div className="bg-emerald-500 h-full w-[92%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                           </div>
                        </div>
                        <div>
                           <div className="flex justify-between text-xs font-black uppercase mb-2">
                               <span className="text-slate-400">Rider Utilization</span>
                               <span className="text-orange-500">78%</span>
                           </div>
                           <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                               <div className="bg-orange-500 h-full w-[78%] rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                           </div>
                        </div>
                        <div>
                           <div className="flex justify-between text-xs font-black uppercase mb-2">
                               <span className="text-slate-400">Customer CSAT</span>
                               <span className="text-blue-500">4.8/5</span>
                           </div>
                           <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                               <div className="bg-blue-500 h-full w-[96%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                           </div>
                        </div>
                    </div>

                    <div className="mt-12 bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/20">
                       <p className="text-[10px] font-black text-emerald-500 uppercase mb-2">Admin Note</p>
                       <p className="text-xs text-slate-400 font-medium leading-relaxed italic">
                           "Platform growth is steady. Increasing rider incentives in South Bengaluru for upcoming peak hours."
                       </p>
                    </div>
                </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
