import React, { useState, useEffect } from 'react';
import { UserState, Order } from '../../types';
import SevenX7Logo from '../SevenX7Logo';
import { MapVisualizer } from '../MapVisualizer';
import { getAvailableOrders, acceptOrder, broadcastLocation } from '../../services/deliveryService';
import { watchLocation, clearWatch } from '../../services/locationService';
import { updateUserProfile } from '../../services/userService';

interface DeliveryAppProps {
  user: UserState;
  onLogout: () => void;
}

const safeStr = (val: any, fallback: string = ''): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') {
        if (val.message && typeof val.message === 'string') return val.message;
        if (val.name && typeof val.name === 'string') return val.name;
        return fallback;
    }
    return fallback;
};

export const DeliveryApp: React.FC<DeliveryAppProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'TASKS' | 'EARNINGS' | 'CALC' | 'PROFILE'>('TASKS');
  const [isOnline, setIsOnline] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [dailyEarnings, setDailyEarnings] = useState(450); 

  const [calcInputs, setCalcInputs] = useState({ 
    mileage: 45, 
    petrolPrice: 102.5, 
    distance: 30, 
    gross: 450 
  });

  useEffect(() => { 
    setCalcInputs(prev => ({ ...prev, gross: dailyEarnings })); 
  }, [dailyEarnings]);

  const [showVehicleSetup, setShowVehicleSetup] = useState(!user.vehicleType);
  const [vehicleData, setVehicleData] = useState({ 
    type: user.vehicleType || 'ev_slow', 
    model: user.vehicleModel || '', 
    license: user.licenseNumber || '' 
  });

  useEffect(() => {
    const watchId = watchLocation((loc) => {
        if (loc.accuracy > 60 && currentLocation) return;
        
        setCurrentLocation({ lat: loc.lat, lng: loc.lng });
        if (isOnline && user.id && !user.id.startsWith('demo-')) {
            broadcastLocation(user.id, loc.lat, loc.lng).catch(e => console.error(e));
        }
    }, () => {});
    return () => clearWatch(watchId);
  }, [isOnline, user.id, currentLocation]);

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
                storeName: 'Indiranagar Mart', 
                storeLocation: { lat: currentLocation.lat + 0.005, lng: currentLocation.lng + 0.005 }, 
                userLocation: { lat: currentLocation.lat - 0.005, lng: currentLocation.lng - 0.005 }, 
                deliveryAddress: 'Apt 402, Green Glen', 
                splits: { deliveryFee: 45, storeAmount: 450 }
            } as any]);
            return;
        }
        try {
          const orders = await getAvailableOrders();
          setAvailableOrders(orders);
        } catch (err) { console.error(err); }
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
      } catch (e) { 
        alert("Mission assigned elsewhere."); 
      }
  };

  if (showVehicleSetup) {
      return (
          <div className="fixed inset-0 z-[200] bg-slate-900 flex items-center justify-center p-6">
              <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-scale-in">
                  <h2 className="text-2xl font-black mb-4 text-slate-900 text-center tracking-tight">Fleet Setup</h2>
                  <div className="space-y-4">
                      <select 
                        className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none border-0 shadow-inner"
                        value={vehicleData.type}
                        onChange={(e) => setVehicleData(v => ({...v, type: e.target.value as any}))}
                      >
                          <option value="ev_slow">Slow EV (&lt;25kmph)</option>
                          <option value="petrol">Petrol Bike / Fast EV</option>
                      </select>
                      <input type="text" placeholder="Vehicle Number" className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-0 shadow-inner" value={safeStr(vehicleData.model)} onChange={(e) => setVehicleData(v => ({ ...v, model: e.target.value }))} />
                      <input type="text" placeholder="Driving License" className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-0 shadow-inner" value={safeStr(vehicleData.license)} onChange={(e) => setVehicleData(v => ({ ...v, license: e.target.value }))} />
                      <button onClick={() => { if (user.id) updateUserProfile(user.id, { vehicle_type: vehicleData.type, vehicle_model: vehicleData.model, license_number: vehicleData.license } as any).catch(e => console.error(e)); setShowVehicleSetup(false); }} className="w-full bg-slate-900 text-white py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg mt-4">Start Earning</button>
                  </div>
              </div>
          </div>
      );
  }

  const mapStores = activeOrder ? [] : availableOrders.map(o => ({ ...o, lat: o.storeLocation?.lat, lng: o.storeLocation?.lng, type: 'general' } as any));

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col font-sans overflow-hidden">
      <header className="bg-white/90 backdrop-blur-xl px-5 py-4 sticky top-0 z-[100] flex justify-between items-center border-b border-slate-100 shadow-sm">
          <SevenX7Logo size="xs" />
          <button onClick={() => setActiveTab('PROFILE')} className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-slate-200 active:scale-95 transition-all">
             {user.name ? safeStr(user.name[0]) : 'P'}
          </button>
      </header>

      <main className="flex-1 relative overflow-y-auto hide-scrollbar flex flex-col pb-20 bg-[#F8FAFC]">
          {activeTab === 'TASKS' && (
              <div className="p-4 space-y-4 animate-fade-in">
                  <div className="h-64 rounded-[2.5rem] overflow-hidden shadow-md border-4 border-white relative isolate">
                      <MapVisualizer stores={mapStores} userLat={currentLocation?.lat || null} userLng={currentLocation?.lng || null} selectedStore={null} onSelectStore={() => {}} mode="DELIVERY" className="h-full rounded-none" forcedCenter={currentLocation} />
                  </div>

                  <div className={`bg-white p-5 rounded-[2.5rem] border border-white shadow-sm flex items-center justify-between ${isOnline ? 'ring-2 ring-emerald-500/10' : 'opacity-60'}`}>
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">🛵</div>
                          <div><h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{isOnline ? 'Online' : 'Offline'}</h4><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">HQ Payouts Active</p></div>
                      </div>
                      <button onClick={() => setIsOnline(!isOnline)} className={`w-12 h-7 rounded-full relative transition-all duration-300 ${isOnline ? 'bg-emerald-500 shadow-inner' : 'bg-slate-200 shadow-inner'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isOnline ? 'translate-x-6' : 'translate-x-1'}`}></div></button>
                  </div>

                  {isOnline && (
                      activeOrder ? (
                          <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-4">Task Active • Paid by SevenX7 HQ</p>
                              <h3 className="text-2xl font-black mb-4 tracking-tighter">₹{activeOrder.splits?.deliveryFee}</h3>
                              <div className="space-y-3">
                                  <p className="font-bold text-xs truncate opacity-80">{safeStr(activeOrder.storeName)} → {safeStr(activeOrder.deliveryAddress)}</p>
                              </div>
                              <button onClick={() => { setDailyEarnings(d => d + (activeOrder.splits?.deliveryFee || 0)); setActiveOrder(null); }} className="w-full mt-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">End Mission</button>
                          </div>
                      ) : availableOrders.length === 0 ? (
                          <div className="py-20 text-center bg-white rounded-[3rem] border border-slate-100 flex flex-col items-center gap-4">
                              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center relative"><div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full animate-ping"></div><div className="w-8 h-8 border-2 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div></div>
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanning HQ Radar...</h3>
                          </div>
                      ) : (
                          availableOrders.map(order => (
                              <div key={order.id} className="bg-white p-5 rounded-[2.5rem] border border-white shadow-sm flex flex-col gap-4 animate-slide-up">
                                  <div className="flex justify-between items-center">
                                      <div className="flex gap-3 items-center"><div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-xl">📦</div><h4 className="font-black text-slate-800 text-sm">{safeStr(order.storeName)}</h4></div>
                                      <div className="text-right"><p className="text-lg font-black text-slate-900 leading-none">₹{order.splits?.deliveryFee || 30}</p><p className="text-[7px] font-black text-slate-400 uppercase mt-1">Admin Fee</p></div>
                                  </div>
                                  <button onClick={() => handleAccept(order)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Start Assignment</button>
                              </div>
                          ))
                      )
                  )}
              </div>
          )}

          {activeTab === 'EARNINGS' && (
              <div className="p-5 space-y-6 animate-fade-in text-center">
                  <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-white">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">SevenX7 HQ Balance</p>
                      <h2 className="text-6xl font-black text-slate-900 tracking-tighter">₹{dailyEarnings}</h2>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase mt-8 tracking-[0.2em] bg-emerald-50 py-2 rounded-xl">Payouts Guaranteed</p>
                  </div>
              </div>
          )}

          {activeTab === 'CALC' && (
              <div className="p-5 space-y-6 animate-fade-in">
                  <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16"></div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Net Estimated Profit</p>
                      <h2 className="text-5xl font-black tracking-tighter text-emerald-400">₹{(calcInputs.gross - (calcInputs.distance / calcInputs.mileage * calcInputs.petrolPrice)).toFixed(0)}</h2>
                  </div>
                  <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-white space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Daily Gross (₹)</label><input type="number" value={calcInputs.gross} onChange={e => setCalcInputs(prev => ({ ...prev, gross: Number(e.target.value) }))} className="w-full bg-slate-50 rounded-xl p-3.5 text-xs font-black outline-none border border-transparent focus:border-slate-200" /></div>
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Distance (Km)</label><input type="number" value={calcInputs.distance} onChange={e => setCalcInputs(prev => ({ ...prev, distance: Number(e.target.value) }))} className="w-full bg-slate-50 rounded-xl p-3.5 text-xs font-black outline-none border border-transparent focus:border-slate-200" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Mileage (Km/L)</label><input type="number" value={calcInputs.mileage} onChange={e => setCalcInputs(prev => ({ ...prev, mileage: Number(e.target.value) }))} className="w-full bg-slate-50 rounded-xl p-3.5 text-xs font-black outline-none border border-transparent focus:border-slate-200" /></div>
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fuel Price (₹)</label><input type="number" value={calcInputs.petrolPrice} onChange={e => setCalcInputs(prev => ({ ...prev, petrolPrice: Number(e.target.value) }))} className="w-full bg-slate-50 rounded-xl p-3.5 text-xs font-black outline-none border border-transparent focus:border-slate-200" /></div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'PROFILE' && (
              <div className="p-5 space-y-6 animate-fade-in">
                  <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-white flex flex-col items-center">
                      <div className="w-24 h-24 bg-slate-900 rounded-[2rem] mb-6 text-white flex items-center justify-center text-4xl font-black shadow-xl ring-8 ring-slate-50">
                         {user.name ? safeStr(user.name[0]) : 'P'}
                      </div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">{safeStr(user.name, 'Partner')}</h3>
                      
                      <div className="w-full space-y-3">
                          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <span className="text-[10px] font-black text-slate-400 uppercase">Vehicle Type</span>
                             <span className="text-xs font-black text-slate-800">{user.vehicleType === 'ev_slow' ? 'Eco EV' : 'Petrol / Fast EV'}</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <span className="text-[10px] font-black text-slate-400 uppercase">Email</span>
                             <span className="text-xs font-black text-slate-800">{safeStr(user.email, 'Not provided')}</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <span className="text-[10px] font-black text-slate-400 uppercase">Phone</span>
                             <span className="text-xs font-black text-slate-800">{safeStr(user.phone, 'Not linked')}</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <span className="text-[10px] font-black text-slate-400 uppercase">Vehicle #</span>
                             <span className="text-xs font-black text-slate-800">{safeStr(user.vehicleModel || vehicleData.model, 'Pending')}</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <span className="text-[10px] font-black text-slate-400 uppercase">License #</span>
                             <span className="text-xs font-black text-slate-800">{safeStr(user.licenseNumber || vehicleData.license, 'Pending')}</span>
                          </div>
                      </div>

                      <button onClick={onLogout} className="mt-10 w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-100 active:scale-95 transition-all">Go Offline</button>
                  </div>
              </div>
          )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around z-[110] px-6">
           {[
             { id: 'TASKS', icon: '🛵', label: 'Tasks' }, 
             { id: 'EARNINGS', icon: '💰', label: 'Wallet' }, 
             { id: 'CALC', icon: '🧮', label: 'Profit' }
           ].map(item => (
             <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === item.id ? 'text-slate-900' : 'text-slate-400'}`}>
                 <span className={`text-xl transition-all duration-300 ${activeTab === item.id ? 'scale-110' : 'grayscale opacity-60'}`}>{item.icon}</span>
                 <span className={`text-[7px] font-black uppercase tracking-widest ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
             </button>
           ))}
      </nav>
    </div>
  );
};