
import React, { useState, useEffect } from 'react';
import { UserState, Order, Store } from '../../types';
import SevenX7Logo from '../SevenX7Logo';
import { MapVisualizer } from '../MapVisualizer';
import { getAvailableOrders, acceptOrder, updateDeliveryStatus, broadcastLocation, getPartnerOrderHistory } from '../../services/deliveryService';
import { watchLocation, clearWatch } from '../../services/locationService';
import { updateUserProfile } from '../../services/userService';
import { supabase } from '../../services/supabaseClient';

interface DeliveryAppProps {
  user: UserState;
  onLogout: () => void;
}

export const DeliveryApp: React.FC<DeliveryAppProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'TASKS' | 'EARNINGS' | 'CALC' | 'PROFILE'>('TASKS');
  const [isOnline, setIsOnline] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [dailyEarnings, setDailyEarnings] = useState(0); 

  // Profit Calculator State
  const [calcMode, setCalcMode] = useState<'PETROL' | 'EV'>('PETROL');
  const [calcInputs, setCalcInputs] = useState({
      mileage: 45,
      petrolPrice: 102.5,
      distance: 30,
      evRent: 15,
      hours: 8,
      gross: 0
  });

  // Sync calc inputs with daily earnings
  useEffect(() => { 
      setCalcInputs(prev => ({ ...prev, gross: dailyEarnings })); 
  }, [dailyEarnings]);

  // Initial Vehicle Check
  const [showVehicleSetup, setShowVehicleSetup] = useState(!user.vehicleType);
  const [vehicleData, setVehicleData] = useState({ 
      type: user.vehicleType || 'ev_slow', 
      model: user.vehicleModel || '', 
      license: user.licenseNumber || '' 
  });

  // Location and Available Orders
  useEffect(() => {
    const watchId = watchLocation((loc) => {
        setCurrentLocation({ lat: loc.lat, lng: loc.lng });
        if (isOnline && user.id && !user.id.startsWith('demo-')) {
            broadcastLocation(user.id, loc.lat, loc.lng).catch(e => console.error("Location broadcast failed", e));
        }
    }, (err) => {
        console.warn("Location monitoring issue:", err?.message || String(err));
    });
    return () => clearWatch(watchId);
  }, [isOnline, user.id]);

  useEffect(() => {
    if (!isOnline || activeOrder || showVehicleSetup) return;
    const loadOrders = async () => {
        if (user.id?.startsWith('demo-')) {
            if (!currentLocation) return;
            setAvailableOrders([{
                id: 'demo-task-1',
                date: new Date().toISOString(),
                items: [],
                total: 450,
                status: 'Ready',
                mode: 'DELIVERY',
                storeName: 'Local Fresh Mart',
                storeLocation: { lat: currentLocation.lat + 0.005, lng: currentLocation.lng + 0.005 },
                userLocation: { lat: currentLocation.lat - 0.005, lng: currentLocation.lng - 0.005 },
                deliveryAddress: 'Green Glen Layout, Apt 402',
                customerName: 'Rohit K.',
                splits: { deliveryFee: 35, storeAmount: 450 }
            } as any]);
            return;
        }
        try {
          const orders = await getAvailableOrders();
          setAvailableOrders(orders);
        } catch (err) {
          console.error("Order fetch failed", err);
        }
    };
    loadOrders();
    const interval = setInterval(loadOrders, 8000);
    return () => clearInterval(interval);
  }, [isOnline, activeOrder, currentLocation, showVehicleSetup, user.id]);

  const handleAccept = async (order: Order) => {
      if (user.id?.startsWith('demo-')) {
          setActiveOrder({ ...order, status: 'Accepted' });
          return;
      }
      try {
          await acceptOrder(order.id, user.id!);
          setActiveOrder({ ...order, status: 'Accepted' });
      } catch (e) { alert("Mission already assigned."); }
  };

  const calculateProfit = () => {
      if (calcMode === 'PETROL') {
          const fuelCost = (calcInputs.distance / calcInputs.mileage) * calcInputs.petrolPrice;
          return calcInputs.gross - fuelCost;
      }
      return calcInputs.gross - (calcInputs.hours * calcInputs.evRent);
  };

  if (showVehicleSetup) {
      return (
          <div className="fixed inset-0 z-[200] bg-slate-900 flex items-center justify-center p-6">
              <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl">
                  <h2 className="text-2xl font-black mb-2">Fleet Identity</h2>
                  <p className="text-xs text-slate-400 font-bold mb-8 uppercase tracking-widest">Provide details to receive assignments</p>
                  <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                          <button onClick={() => setVehicleData(v => ({ ...v, type: 'ev_slow' }))} className={`py-3 rounded-lg text-[10px] font-black transition-all ${vehicleData.type === 'ev_slow' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>EV (&lt;20kmph)</button>
                          <button onClick={() => setVehicleData(v => ({ ...v, type: 'petrol' }))} className={`py-3 rounded-lg text-[10px] font-black transition-all ${vehicleData.type === 'petrol' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>PETROL/HI-EV</button>
                      </div>
                      <input 
                        type="text" 
                        placeholder={vehicleData.type === 'ev_slow' ? 'Vehicle Model' : 'License Number'} 
                        className="w-full bg-slate-50 rounded-xl p-4 text-sm font-bold border border-transparent focus:border-emerald-500 outline-none" 
                        value={vehicleData.type === 'ev_slow' ? vehicleData.model : vehicleData.license}
                        onChange={(e) => {
                            const val = e.target.value;
                            setVehicleData(v => ({ ...v, [v.type === 'ev_slow' ? 'model' : 'license']: val }));
                        }} 
                      />
                      <button onClick={() => { if (user.id) updateUserProfile(user.id, { vehicle_type: vehicleData.type } as any).catch(e => console.error(e)); setShowVehicleSetup(false); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Save & Continue</button>
                  </div>
              </div>
          </div>
      );
  }

  // Flatten available orders for MapVisualizer Store requirement (lat/lng at top level)
  const mapStores = activeOrder ? [] : availableOrders.map(o => ({ 
    ...o, 
    lat: o.storeLocation?.lat, 
    lng: o.storeLocation?.lng, 
    type: 'general' 
  } as any));

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col font-sans overflow-hidden">
      <header className="nav-glass px-6 py-4 sticky top-0 z-[100] flex justify-between items-center border-b border-white/20">
          <div className="w-24 flex items-center">
              <SevenX7Logo size="xs" />
          </div>
          
          <div className="flex-1 text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] truncate block max-w-[120px] mx-auto">
                  {user.name || 'Partner'}
              </span>
          </div>

          <div className="w-24 flex justify-end">
              <button onClick={() => setActiveTab('PROFILE')} className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-lg active:scale-95 transition-all">
                  {user.name ? user.name[0] : '👤'}
              </button>
          </div>
      </header>

      <main className="flex-1 relative overflow-y-auto hide-scrollbar flex flex-col pb-24">
          {activeTab === 'TASKS' && (
              <div className="p-5 space-y-5 animate-fade-in">
                  <div className="h-56 rounded-[2.5rem] overflow-hidden shadow-soft-xl border-4 border-white relative isolate">
                      <MapVisualizer 
                          stores={mapStores}
                          userLat={currentLocation?.lat || null}
                          userLng={currentLocation?.lng || null}
                          selectedStore={null}
                          onSelectStore={() => {}}
                          mode="DELIVERY"
                          className="h-full rounded-none"
                      />
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-2xl shadow-lg border border-white">
                          <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                             <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">{isOnline ? 'Active Radar' : 'Offline'}</span>
                          </div>
                      </div>
                  </div>

                  <div className={`bg-white p-4 rounded-[2rem] border border-white shadow-sm flex items-center justify-between transition-all ${isOnline ? 'bg-emerald-50/30' : 'opacity-60 grayscale'}`}>
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duty Status</p>
                          <h4 className="text-sm font-black text-slate-800">{isOnline ? 'Accepting Missions' : 'Resting'}</h4>
                      </div>
                      <button onClick={() => setIsOnline(!isOnline)} className={`w-14 h-8 rounded-full relative transition-all duration-300 ${isOnline ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${isOnline ? 'translate-x-7' : 'translate-x-1'}`}></div>
                      </button>
                  </div>

                  {isOnline ? (
                      activeOrder ? (
                          <div className="space-y-4 animate-slide-up">
                              <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                                  <div className="flex justify-between items-center mb-6">
                                      <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Active Mission</p>
                                      <p className="text-lg font-black">₹{activeOrder.splits?.deliveryFee}</p>
                                  </div>
                                  <div className="space-y-6 relative z-10">
                                      <div className="flex gap-4">
                                          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-lg shadow-lg">🏪</div>
                                          <div className="flex-1 min-w-0">
                                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pickup Address</p>
                                              <p className="font-black text-sm truncate">{activeOrder.storeName || 'Store Location'}</p>
                                          </div>
                                      </div>
                                      <div className="h-4 w-px bg-white/20 ml-5"></div>
                                      <div className="flex gap-4">
                                          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-lg shadow-lg">🏠</div>
                                          <div className="flex-1 min-w-0">
                                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Drop Address</p>
                                              <p className="font-black text-sm truncate">{activeOrder.deliveryAddress || 'Customer Location'}</p>
                                          </div>
                                      </div>
                                  </div>
                                  <button onClick={() => setActiveOrder(null)} className="w-full mt-8 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Complete Trip</button>
                              </div>
                          </div>
                      ) : availableOrders.length === 0 ? (
                          <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-4 animate-fade-in">
                              <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin"></div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Scanning local marts...</p>
                          </div>
                      ) : (
                          <div className="space-y-4 animate-fade-in">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">New Requests</h3>
                              {availableOrders.map(order => (
                                  <div key={order.id} className="bg-white p-6 rounded-[2.5rem] border border-white shadow-card flex flex-col gap-6 animate-slide-up hover:shadow-card-hover transition-all">
                                      <div className="flex justify-between items-start">
                                          <div className="flex gap-4">
                                              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl border border-emerald-100 shadow-inner">📦</div>
                                              <div>
                                                  <h4 className="font-black text-slate-800 text-base leading-tight">{order.storeName || 'Local Mart'}</h4>
                                                  <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Express Assignment</p>
                                              </div>
                                          </div>
                                          <div className="text-right"><p className="text-xl font-black text-slate-900">₹{order.splits?.deliveryFee || 30}</p></div>
                                      </div>
                                      <div className="space-y-3">
                                          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                              <span className="text-sm">🏪</span>
                                              <div className="flex-1 min-w-0">
                                                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Pickup Point</p>
                                                  <p className="text-[10px] font-black text-slate-800 truncate">{order.storeName || 'Store'}</p>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                              <span className="text-sm">🏠</span>
                                              <div className="flex-1 min-w-0">
                                                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Drop Point</p>
                                                  <p className="text-[10px] font-black text-slate-800 truncate">{order.deliveryAddress || 'Customer'}</p>
                                              </div>
                                          </div>
                                      </div>
                                      <button onClick={() => handleAccept(order)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Accept Trip</button>
                                  </div>
                              ))}
                          </div>
                      )
                  ) : (
                      <div className="py-20 text-center bg-white/50 backdrop-blur rounded-[3rem] border border-white flex flex-col items-center gap-6 animate-fade-in">
                          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-4xl grayscale opacity-50">😴</div>
                          <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Duty Status: Offline</h3>
                          <button onClick={() => setIsOnline(true)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Go Online Now</button>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'EARNINGS' && (
              <div className="flex-1 overflow-y-auto p-5 pb-24 hide-scrollbar space-y-6 animate-fade-in">
                  <div className="bg-white p-10 rounded-[3rem] shadow-soft border border-white text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500"></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Earnings Wallet</p>
                      <h2 className="text-6xl font-black text-slate-900 tracking-tighter">₹{dailyEarnings}</h2>
                  </div>
              </div>
          )}

          {activeTab === 'CALC' && (
              <div className="p-5 space-y-6 animate-fade-in">
                  <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16"></div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">Net Estimated Profit</p>
                      <h2 className="text-5xl font-black tracking-tighter text-emerald-400">₹{calculateProfit().toFixed(0)}</h2>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-6 shadow-soft border border-white space-y-6">
                      <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
                          <button onClick={() => setCalcMode('PETROL')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${calcMode === 'PETROL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>PETROL MODE</button>
                          <button onClick={() => setCalcMode('EV')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${calcMode === 'EV' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>EV RENTAL MODE</button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Gross (₹)</label>
                              <input type="number" value={calcInputs.gross} onChange={e => setCalcInputs(prev => ({ ...prev, gross: Number(e.target.value) }))} className="w-full bg-slate-50 rounded-xl p-3 text-sm font-black outline-none border border-transparent focus:border-emerald-500" />
                          </div>
                          {calcMode === 'PETROL' ? (
                              <>
                                  <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Mileage (km/L)</label><input type="number" value={calcInputs.mileage} onChange={e => setCalcInputs(prev => ({ ...prev, mileage: Number(e.target.value) }))} className="w-full bg-slate-50 rounded-xl p-3 text-sm font-black outline-none border border-transparent focus:border-emerald-500" /></div>
                                  <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Dist (km)</label><input type="number" value={calcInputs.distance} onChange={e => setCalcInputs(prev => ({ ...prev, distance: Number(e.target.value) }))} className="w-full bg-slate-50 rounded-xl p-3 text-sm font-black outline-none border border-transparent focus:border-emerald-500" /></div>
                              </>
                          ) : (
                              <>
                                  <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Hours On-Duty</label><input type="number" value={calcInputs.hours} onChange={e => setCalcInputs(prev => ({ ...prev, hours: Number(e.target.value) }))} className="w-full bg-slate-50 rounded-xl p-3 text-sm font-black outline-none border border-transparent focus:border-emerald-500" /></div>
                                  <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Rent/Hr (₹)</label><input type="number" value={calcInputs.evRent} onChange={e => setCalcInputs(prev => ({ ...prev, evRent: Number(e.target.value) }))} className="w-full bg-slate-50 rounded-xl p-3 text-sm font-black outline-none border border-transparent focus:border-emerald-500" /></div>
                              </>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'PROFILE' && (
              <div className="p-5 space-y-6 animate-fade-in">
                  <div className="bg-white p-10 rounded-[3rem] shadow-soft border border-white flex flex-col items-center">
                      <div className="w-28 h-28 bg-slate-900 rounded-full border-[6px] border-slate-50 shadow-xl flex items-center justify-center text-5xl mb-4 relative text-white font-black">{user.name ? user.name[0] : '👤'}</div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{user.name || 'Fleet Operator'}</h3>
                      <div className="mt-2 px-4 py-1.5 bg-slate-100 rounded-full"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{user.phone}</p></div>
                      <button onClick={onLogout} className="mt-8 w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-100 active:scale-95 transition-all">Sign Out</button>
                  </div>
              </div>
          )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 nav-glass border-t border-white/20 px-12 py-5 flex justify-between z-[110] shadow-[0_-20px_50px_rgba(0,0,0,0.08)]">
           {[{ id: 'TASKS', icon: '🛵', label: 'Radar' }, { id: 'EARNINGS', icon: '💰', label: 'Wallet' }, { id: 'CALC', icon: '🧮', label: 'Profit' }].map(item => (
             <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-1.5 transition-all relative ${activeTab === item.id ? 'text-slate-900 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
                 <span className={`text-2xl transition-all duration-500 ${activeTab === item.id ? 'filter drop-shadow-md' : 'grayscale opacity-60'}`}>{item.icon}</span>
                 <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-opacity ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
             </button>
           ))}
      </nav>
    </div>
  );
};
