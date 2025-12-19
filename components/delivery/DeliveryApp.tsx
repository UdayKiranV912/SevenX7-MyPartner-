import React, { useState, useEffect, useRef } from 'react';
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
  const [partnerRating, setPartnerRating] = useState<number>(4.9);
  const [dailyEarnings, setDailyEarnings] = useState(0); 
  const [completedCount, setCompletedCount] = useState(0);

  // Profit Calculator State
  const [calcMode, setCalcMode] = useState<'PETROL' | 'EV'>('PETROL');
  const [calcInputs, setCalcInputs] = useState({
      grossEarnings: 0,
      petrolPrice: 102.5,
      mileage: 45,
      distanceTravelled: 30,
      evRentPerHour: 15,
      hoursWorked: 8
  });

  // Vehicle Setup State
  const [showVehicleSetup, setShowVehicleSetup] = useState(!user.vehicleType);
  const [vehicleData, setVehicleData] = useState({
    type: user.vehicleType || 'ev_slow',
    model: user.vehicleModel || '',
    license: user.licenseNumber || ''
  });

  // Sync inputs with daily earnings when earnings update
  useEffect(() => {
    setCalcInputs(prev => ({ ...prev, grossEarnings: dailyEarnings }));
  }, [dailyEarnings]);

  // Load Real-time Rating & Profile
  useEffect(() => {
    if (!user.id || user.id.startsWith('demo-')) return;
    const fetchProfile = async () => {
        const { data } = await supabase.from('profiles').select('rating').eq('id', user.id).single();
        if (data?.rating) setPartnerRating(data.rating);
    };
    fetchProfile();
  }, [user.id]);

  // Load Real-time History & Payouts
  useEffect(() => {
    if (user.id?.startsWith('demo-')) return;
    const loadHistory = async () => {
        const history = await getPartnerOrderHistory(user.id!);
        setHistoryOrders(history);
        setCompletedCount(history.length);
        const total = history.reduce((sum, o) => sum + (o.splits?.deliveryFee || 30), 0);
        setDailyEarnings(total);
    };
    loadHistory();
    const interval = setInterval(loadHistory, 30000); 
    return () => clearInterval(interval);
  }, [user.id, activeOrder]);

  // Real-time Location Tracking & Broadcasting
  useEffect(() => {
    const watchId = watchLocation(
      (loc) => {
        const newLoc = { lat: loc.lat, lng: loc.lng };
        setCurrentLocation(newLoc);
        if (!user.id?.startsWith('demo-') && isOnline) {
             broadcastLocation(user.id!, loc.lat, loc.lng);
        }
      },
      (err) => {
          console.warn("GPS Signal Issue:", err?.message || err);
      }
    );
    return () => clearWatch(watchId);
  }, [isOnline, user.id]);

  // Available Tasks Polling
  useEffect(() => {
    if (!isOnline || activeOrder || showVehicleSetup) return;
    const loadOrders = async () => {
        if (user.id === 'demo-partner') {
            if (!currentLocation) return;
            setAvailableOrders([{
                id: 'demo-task-live',
                date: new Date().toISOString(),
                items: [],
                total: 850,
                status: 'Ready',
                mode: 'DELIVERY',
                deliveryType: 'INSTANT',
                storeName: 'Local Mart (Demo Pickup)',
                storeLocation: { lat: currentLocation.lat + 0.008, lng: currentLocation.lng + 0.008 }, 
                userLocation: { lat: currentLocation.lat - 0.008, lng: currentLocation.lng - 0.008 },  
                deliveryAddress: 'Home Sweet Home (Demo Drop)',
                customerName: 'Aman S.',
                splits: { deliveryFee: 45, storeAmount: 850 }
            } as any]);
            return;
        }
        try {
            const orders = await getAvailableOrders();
            setAvailableOrders(orders);
        } catch (e) { console.error("Task fetch failed"); }
    };
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [isOnline, activeOrder, user.id, currentLocation, showVehicleSetup]);

  const handleSaveVehicle = async () => {
    if (!user.id) return;
    try {
      await updateUserProfile(user.id, {
        vehicle_type: vehicleData.type,
        vehicle_model: vehicleData.type === 'ev_slow' ? vehicleData.model : '',
        license_number: vehicleData.type === 'petrol' ? vehicleData.license : ''
      } as any);
      setShowVehicleSetup(false);
    } catch (e) { 
        console.error("Profile sync failed");
        setShowVehicleSetup(false);
    }
  };

  const handleAccept = async (order: Order) => {
      if (user.id?.startsWith('demo-')) {
          setActiveOrder({ ...order, status: 'Accepted' });
          return;
      }
      try {
          await acceptOrder(order.id, user.id!);
          setActiveOrder({ ...order, status: 'Accepted' });
      } catch (e) { alert("Mission unavailable."); }
  };

  const calculateProfit = () => {
      if (calcMode === 'PETROL') {
          const fuelCost = (calcInputs.distanceTravelled / calcInputs.mileage) * calcInputs.petrolPrice;
          return calcInputs.grossEarnings - fuelCost;
      } else {
          const rentalCost = calcInputs.hoursWorked * calcInputs.evRentPerHour;
          return calcInputs.grossEarnings - rentalCost;
      }
  };

  if (showVehicleSetup) {
    return (
        <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col p-6 items-center justify-center animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-[3rem] p-8 shadow-2xl flex flex-col items-center">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner animate-bounce-soft">🛵</div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Fleet Setup</h2>
                <p className="text-center text-slate-500 text-sm mb-8 font-medium">Please provide your vehicle details to start accepting orders.</p>
                <div className="w-full space-y-5">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Vehicle Category</label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-2xl">
                            <button onClick={() => setVehicleData({...vehicleData, type: 'ev_slow'})} className={`py-3 rounded-xl text-xs font-black transition-all ${vehicleData.type === 'ev_slow' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400'}`}>EV (&lt;20kmph)</button>
                            <button onClick={() => setVehicleData({...vehicleData, type: 'petrol'})} className={`py-3 rounded-xl text-xs font-black transition-all ${vehicleData.type === 'petrol' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400'}`}>Petrol/High EV</button>
                        </div>
                    </div>
                    {vehicleData.type === 'ev_slow' ? (
                        <div className="animate-scale-in">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Vehicle Model</label>
                            <input type="text" placeholder="e.g. Hero Eddy, Ampere" value={vehicleData.model} onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})} className="w-full bg-slate-50 border-0 rounded-xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"/>
                        </div>
                    ) : (
                        <div className="animate-scale-in">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Driving License Number</label>
                            <input type="text" placeholder="KA 03 XXXXXXXX" value={vehicleData.license} onChange={(e) => setVehicleData({...vehicleData, license: e.target.value})} className="w-full bg-slate-50 border-0 rounded-xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"/>
                        </div>
                    )}
                    <button onClick={handleSaveVehicle} disabled={vehicleData.type === 'ev_slow' ? !vehicleData.model : !vehicleData.license} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-black active:scale-95 transition-all">COMPLETE PROFILE</button>
                </div>
            </div>
        </div>
    );
  }

  const isPickedUp = activeOrder?.status === 'Picked Up';
  const targetPoint = activeOrder ? (isPickedUp ? activeOrder.userLocation : activeOrder.storeLocation) : null;
  const currentTargetStore: Store | null = (activeOrder && targetPoint) ? { id: isPickedUp ? 'target-cust' : 'target-store', name: isPickedUp ? 'Customer' : activeOrder.storeName, lat: targetPoint.lat, lng: targetPoint.lng, address: isPickedUp ? activeOrder.deliveryAddress || '' : '', rating: 0, distance: '', isOpen: true, type: isPickedUp ? 'customer' as any : 'general', availableProductIds: [] } : null;

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* HEADER: Profile moved to top-right, Logo center, Status Left */}
      <header className="nav-glass px-6 py-4 sticky top-0 z-[60] flex justify-between items-center border-b border-white/20">
          <div className="flex items-center gap-3 w-24">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
              <button onClick={() => setIsOnline(!isOnline)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isOnline ? 'Online' : 'Offline'}</button>
          </div>
          
          <div className="transform scale-110">
              <SevenX7Logo size="small" />
          </div>

          <button onClick={() => setActiveTab('PROFILE')} className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-black shadow-lg border border-white/20 active:scale-95 transition-all w-24 ml-auto max-w-[40px]">
              {user.name ? user.name[0] : '👤'}
          </button>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col">
          {activeTab === 'TASKS' && (
              <div className="absolute inset-0 flex flex-col">
                  <div className="absolute inset-0 z-0">
                      <MapVisualizer 
                          stores={activeOrder 
                             ? [
                                { ...activeOrder, id: 'store-m', name: activeOrder.storeName, lat: activeOrder.storeLocation?.lat || 0, lng: activeOrder.storeLocation?.lng || 0, type: 'general' } as any,
                                { ...activeOrder, id: 'cust-m', name: 'Customer Drop', lat: activeOrder.userLocation?.lat || 0, lng: activeOrder.userLocation?.lng || 0, type: 'customer' as any } as any
                               ]
                             : availableOrders.map(o => ({ id: o.id, name: o.storeName, lat: o.storeLocation?.lat || 0, lng: o.storeLocation?.lng || 0, type: 'general' } as any))
                          }
                          userLat={currentLocation?.lat || null}
                          userLng={currentLocation?.lng || null}
                          selectedStore={currentTargetStore}
                          onSelectStore={(s) => {
                              if (!activeOrder) {
                                  const order = availableOrders.find(o => o.id === s.id);
                                  if (order) handleAccept(order);
                              }
                          }}
                          mode="DELIVERY"
                          showRoute={!!activeOrder}
                          driverLocation={currentLocation || undefined}
                          className="h-full rounded-none shadow-none border-0"
                          routeSource={currentLocation || undefined}
                          routeTarget={targetPoint || undefined}
                      />
                  </div>

                  {activeOrder && (
                      <div className="absolute inset-0 flex flex-col pointer-events-none">
                          <div className="mt-auto relative z-10 p-4 pb-24 pointer-events-auto">
                               <div className="bg-white rounded-[3rem] p-6 shadow-2xl border border-slate-100 animate-slide-up">
                                   <div className="space-y-4 mb-6">
                                       <div className={`flex items-start gap-4 p-3 rounded-2xl transition-all ${!isPickedUp ? 'bg-emerald-50 border border-emerald-100' : 'opacity-40 grayscale'}`}>
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">🏪</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2"><span className="text-[8px] font-black uppercase text-emerald-600">Pickup</span>{isPickedUp && <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-100 px-1 rounded">Done</span>}</div>
                                                <h4 className="font-black text-slate-800 text-sm leading-tight truncate">{activeOrder.storeName}</h4>
                                            </div>
                                       </div>
                                       <div className={`flex items-start gap-4 p-3 rounded-2xl transition-all ${isPickedUp ? 'bg-blue-50 border border-blue-100' : 'opacity-40 grayscale'}`}>
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">🏠</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2"><span className="text-[8px] font-black uppercase text-blue-600">Drop</span></div>
                                                <h4 className="font-black text-slate-800 text-sm leading-tight truncate">{activeOrder.deliveryAddress}</h4>
                                            </div>
                                       </div>
                                   </div>
                                   {activeOrder.status === 'Accepted' ? (
                                       <button onClick={() => updateDeliveryStatus(activeOrder.id, 'on_way').then(() => setActiveOrder({...activeOrder, status: 'On the way'}))} className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 tracking-widest text-xs uppercase group">INITIATE PICKUP TRIP <span className="bg-white/10 p-1 rounded-lg group-hover:translate-x-1 transition-transform">➔</span></button>
                                   ) : (
                                       <button onClick={() => updateDeliveryStatus(activeOrder.id, isPickedUp ? 'delivered' : 'picked_up').then(() => isPickedUp ? setActiveOrder(null) : setActiveOrder({...activeOrder, status: 'Picked Up'}))} className={`w-full py-4.5 text-white rounded-2xl font-black shadow-xl animate-pulse-glow flex items-center justify-center gap-3 tracking-widest text-xs uppercase group ${isPickedUp ? 'bg-emerald-500' : 'bg-slate-900'}`}>{isPickedUp ? 'COMPLETE DELIVERY' : 'CONFIRM ORDER PICKUP'} <span className="bg-white/20 p-1 rounded-lg group-hover:translate-x-1 transition-transform">➔</span></button>
                                   )}
                               </div>
                          </div>
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
                      <div className="mt-10 grid grid-cols-2 gap-4 border-t border-slate-50 pt-8"><div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100 shadow-inner"><p className="text-2xl font-black text-slate-800">{completedCount}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Jobs Done</p></div><div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100 shadow-inner"><p className="text-2xl font-black text-emerald-600">⭐ {partnerRating}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Rating</p></div></div>
                  </div>
                  <div className="space-y-4">
                      <h3 className="font-black text-slate-800 text-lg px-2">History</h3>
                      {historyOrders.length === 0 ? (
                          <div className="bg-white p-12 rounded-[2.5rem] text-center border border-slate-100 opacity-60"><p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No history recorded yet</p></div>
                      ) : (
                          historyOrders.map(order => (
                              <div key={order.id} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
                                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl border border-emerald-100">✅</div>
                                  <div className="flex-1 min-w-0"><h4 className="font-black text-slate-800 text-sm truncate">{order.storeName}</h4><p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{new Date(order.date).toLocaleDateString()}</p></div>
                                  <div className="text-right"><p className="font-black text-slate-900">₹{order.splits?.deliveryFee || 30}</p></div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          )}

          {activeTab === 'CALC' && (
              <div className="flex-1 overflow-y-auto p-5 pb-24 hide-scrollbar space-y-6 animate-fade-in">
                  <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16"></div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">Net Profit Estimation</p>
                      <h2 className="text-5xl font-black tracking-tighter text-emerald-400">₹{calculateProfit().toFixed(0)}</h2>
                      <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase">Based on current session inputs</p>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-6 shadow-soft border border-white space-y-6">
                      <div className="flex p-1 bg-slate-100 rounded-2xl">
                          <button onClick={() => setCalcMode('PETROL')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${calcMode === 'PETROL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>PETROL MODE</button>
                          <button onClick={() => setCalcMode('EV')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${calcMode === 'EV' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>EV RENTAL MODE</button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Gross Earnings (₹)</label>
                              <input type="number" value={calcInputs.grossEarnings} onChange={e => setCalcInputs({...calcInputs, grossEarnings: Number(e.target.value)})} className="w-full bg-slate-50 border-0 rounded-xl p-3 text-sm font-black text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                          </div>
                          {calcMode === 'PETROL' ? (
                              <>
                                  <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Distance (km)</label>
                                      <input type="number" value={calcInputs.distanceTravelled} onChange={e => setCalcInputs({...calcInputs, distanceTravelled: Number(e.target.value)})} className="w-full bg-slate-50 border-0 rounded-xl p-3 text-sm font-black text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mileage (km/L)</label>
                                      <input type="number" value={calcInputs.mileage} onChange={e => setCalcInputs({...calcInputs, mileage: Number(e.target.value)})} className="w-full bg-slate-50 border-0 rounded-xl p-3 text-sm font-black text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fuel Price (₹/L)</label>
                                      <input type="number" value={calcInputs.petrolPrice} onChange={e => setCalcInputs({...calcInputs, petrolPrice: Number(e.target.value)})} className="w-full bg-slate-50 border-0 rounded-xl p-3 text-sm font-black text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                  </div>
                              </>
                          ) : (
                              <>
                                  <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hours On-Duty</label>
                                      <input type="number" value={calcInputs.hoursWorked} onChange={e => setCalcInputs({...calcInputs, hoursWorked: Number(e.target.value)})} className="w-full bg-slate-50 border-0 rounded-xl p-3 text-sm font-black text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Rent per Hr (₹)</label>
                                      <input type="number" value={calcInputs.evRentPerHour} onChange={e => setCalcInputs({...calcInputs, evRentPerHour: Number(e.target.value)})} className="w-full bg-slate-50 border-0 rounded-xl p-3 text-sm font-black text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                  </div>
                              </>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'PROFILE' && (
              <div className="flex-1 overflow-y-auto p-5 pb-24 hide-scrollbar space-y-6 animate-fade-in">
                   <div className="bg-white p-10 rounded-[3rem] shadow-soft border border-white flex flex-col items-center relative overflow-hidden">
                        <div className="w-32 h-32 bg-slate-900 rounded-full border-[8px] border-slate-50 shadow-2xl flex items-center justify-center text-5xl mb-6 relative text-white font-black uppercase">{user.name ? user.name[0] : '👤'}</div>
                        <h3 className="text-2xl font-black text-slate-900">{user.name || 'Fleet Operator'}</h3>
                        <div className="flex items-center gap-2 mt-2 px-4 py-1.5 bg-slate-100 rounded-full"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{user.phone}</p></div>
                   </div>
                   <div className="bg-white rounded-[2.5rem] p-6 shadow-soft border border-white space-y-4">
                      <h3 className="font-black text-slate-800 text-base">Fleet Compliance</h3>
                      <div className="flex items-center gap-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                         <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl border border-slate-100">{vehicleData.type === 'ev_slow' ? '⚡' : '⛽'}</div>
                         <div className="flex-1 overflow-hidden">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{vehicleData.type === 'ev_slow' ? 'EV' : 'Petrol'}</p>
                            <p className="font-black text-slate-800 text-sm truncate">{vehicleData.type === 'ev_slow' ? (vehicleData.model || 'Model Info') : (vehicleData.license || 'License Info')}</p>
                         </div>
                         <button onClick={() => setShowVehicleSetup(true)} className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg uppercase tracking-wider">Modify</button>
                      </div>
                   </div>
                   <button onClick={onLogout} className="w-full bg-red-50 p-6 rounded-[2rem] border border-red-100 text-red-500 font-black text-xs tracking-widest text-center mt-6 active:bg-red-100 transition-all uppercase flex items-center justify-center gap-3"><span>🚪</span> Terminate Session</button>
              </div>
          )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 nav-glass border-t border-white/20 px-10 py-5 flex justify-between z-[70] shadow-[0_-20px_50px_rgba(0,0,0,0.08)]">
           {[{ id: 'TASKS', icon: '🛵', label: 'Radar' }, { id: 'EARNINGS', icon: '💰', label: 'Wallet' }, { id: 'CALC', icon: '🧮', label: 'Calc' }].map(item => (
             <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-1.5 transition-all relative ${activeTab === item.id ? 'text-slate-900 scale-110' : 'text-slate-300'}`}>
                 <span className={`text-2xl transition-all duration-500 ${activeTab === item.id ? 'filter drop-shadow-md' : 'grayscale opacity-60'}`}>{item.icon}</span>
                 <span className={`text-[9px] font-black uppercase tracking-widest transition-opacity ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
             </button>
           ))}
      </nav>
    </div>
  );
};