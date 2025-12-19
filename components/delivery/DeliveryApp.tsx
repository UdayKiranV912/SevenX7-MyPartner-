
import React, { useState, useEffect, useRef } from 'react';
import { UserState, Order, Store } from '../../types';
import SevenX7Logo from '../SevenX7Logo';
import { MapVisualizer } from '../MapVisualizer';
import { getAvailableOrders, acceptOrder, updateDeliveryStatus, broadcastLocation, getPartnerOrderHistory } from '../../services/deliveryService';
import { watchLocation, clearWatch } from '../../services/locationService';
import { updateUserProfile, loginUser } from '../../services/userService';
import { supabase } from '../../services/supabaseClient';

interface DeliveryAppProps {
  user: UserState;
  onLogout: () => void;
}

export const DeliveryApp: React.FC<DeliveryAppProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'TASKS' | 'EARNINGS' | 'PROFILE'>('TASKS');
  const [isOnline, setIsOnline] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [partnerRating, setPartnerRating] = useState<number>(4.95);
  const [isLoading, setIsLoading] = useState(false);
  const [dailyEarnings, setDailyEarnings] = useState(0); 
  const [completedCount, setCompletedCount] = useState(0);

  // Vehicle Setup State
  const [showVehicleSetup, setShowVehicleSetup] = useState(!user.vehicleType);
  const [vehicleData, setVehicleData] = useState({
    type: user.vehicleType || 'ev_slow',
    model: user.vehicleModel || '',
    license: user.licenseNumber || ''
  });

  const simulationStartPos = useRef<{lat: number, lng: number} | null>(null);

  // Sync Rating & Profile Info
  useEffect(() => {
    if (user.id?.startsWith('demo-')) return;
    const fetchProfile = async () => {
        const { data } = await supabase.from('profiles').select('rating').eq('id', user.id).single();
        if (data?.rating) setPartnerRating(data.rating);
    };
    fetchProfile();
  }, [user.id, activeTab]);

  // Load Real-time History & Payouts
  useEffect(() => {
    if (user.id?.startsWith('demo-')) return;
    const loadHistory = async () => {
        const history = await getPartnerOrderHistory(user.id!);
        setHistoryOrders(history);
        setCompletedCount(history.length);
        // Calculate dynamic earnings (Sum of delivery fees)
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
          console.warn("GPS Issue:", err?.message || err);
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
        setIsLoading(true);
        try {
            const orders = await getAvailableOrders();
            setAvailableOrders(orders);
        } catch (e) { console.error("Task fetch failed"); } finally { setIsLoading(false); }
    };
    loadOrders();
    const interval = setInterval(loadOrders, 8000); 
    return () => clearInterval(interval);
  }, [isOnline, activeOrder, user.id, currentLocation, showVehicleSetup]);

  const handleSaveVehicle = async () => {
    if (!user.id) return;
    try {
      await updateUserProfile(user.id, {
        vehicleType: vehicleData.type,
        vehicleModel: vehicleData.type === 'ev_slow' ? vehicleData.model : '',
        licenseNumber: vehicleData.type === 'petrol' ? vehicleData.license : ''
      } as any);
      setShowVehicleSetup(false);
    } catch (e) { 
        console.error("Profile update failed");
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
      } catch (e) { alert("Task already assigned or unavailable."); }
  };

  const handleStartTrip = async () => {
      if (!activeOrder) return;
      if (user.id?.startsWith('demo-')) {
          setActiveOrder({ ...activeOrder, status: 'On the way' });
          return;
      }
      try {
          await updateDeliveryStatus(activeOrder.id, 'on_way');
          setActiveOrder({ ...activeOrder, status: 'On the way' });
      } catch (e) { alert("Action failed"); }
  };

  const handleStatusUpdate = async (newStatus: 'picked_up' | 'delivered') => {
      if (!activeOrder) return;
      if (user.id?.startsWith('demo-')) {
          if (newStatus === 'delivered') {
              setDailyEarnings(prev => prev + (activeOrder.splits?.deliveryFee || 30));
              setCompletedCount(prev => prev + 1);
              setActiveOrder(null);
          } else {
              setActiveOrder({ ...activeOrder, status: 'Picked Up' });
          }
          return;
      }
      try {
          await updateDeliveryStatus(activeOrder.id, newStatus);
          if (newStatus === 'delivered') { 
              setActiveOrder(null); 
              // Refresh history
              const history = await getPartnerOrderHistory(user.id!);
              setHistoryOrders(history);
          }
          else { setActiveOrder({ ...activeOrder, status: 'Picked Up' }); }
      } catch (e) { alert("Action failed"); }
  };

  if (showVehicleSetup) {
    return (
        <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col p-6 items-center justify-center animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-[3rem] p-8 shadow-2xl flex flex-col items-center">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner animate-bounce-soft">🛵</div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Fleet Onboarding</h2>
                <p className="text-center text-slate-500 text-sm mb-8 font-medium">Specify your vehicle details to begin receiving live delivery missions.</p>
                
                <div className="w-full space-y-5">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Vehicle Class</label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-2xl">
                            <button 
                                onClick={() => setVehicleData({...vehicleData, type: 'ev_slow'})}
                                className={`py-3 rounded-xl text-xs font-black transition-all ${vehicleData.type === 'ev_slow' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400'}`}
                            >
                                EV (&lt;20kmph)
                            </button>
                            <button 
                                onClick={() => setVehicleData({...vehicleData, type: 'petrol'})}
                                className={`py-3 rounded-xl text-xs font-black transition-all ${vehicleData.type === 'petrol' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400'}`}
                            >
                                Petrol/High EV
                            </button>
                        </div>
                    </div>

                    {vehicleData.type === 'ev_slow' ? (
                        <div className="animate-scale-in">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">EV Model Name</label>
                            <input 
                                type="text"
                                placeholder="e.g. Hero Eddy, Ampere"
                                value={vehicleData.model}
                                onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
                                className="w-full bg-slate-50 border-0 rounded-xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    ) : (
                        <div className="animate-scale-in">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Driving License ID</label>
                            <input 
                                type="text"
                                placeholder="KA 03 XXXXXXXX"
                                value={vehicleData.license}
                                onChange={(e) => setVehicleData({...vehicleData, license: e.target.value})}
                                className="w-full bg-slate-50 border-0 rounded-xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    )}

                    <button 
                        onClick={handleSaveVehicle}
                        disabled={vehicleData.type === 'ev_slow' ? !vehicleData.model : !vehicleData.license}
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-black active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                    >
                        START MISSIONS
                    </button>
                </div>
            </div>
        </div>
    );
  }

  const isPickedUp = activeOrder?.status === 'Picked Up';
  const targetPoint = activeOrder ? (isPickedUp ? activeOrder.userLocation : activeOrder.storeLocation) : null;
  const currentTargetStore: Store | null = (activeOrder && targetPoint) ? { 
    id: isPickedUp ? 'target-cust' : 'target-store', 
    name: isPickedUp ? 'Customer' : activeOrder.storeName, 
    lat: targetPoint.lat, 
    lng: targetPoint.lng, 
    address: isPickedUp ? activeOrder.deliveryAddress || '' : '', 
    rating: 0, distance: '', isOpen: true, 
    type: isPickedUp ? 'customer' as any : 'general', 
    availableProductIds: [] 
  } : null;

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Real-time Status Header */}
      <header className="nav-glass px-6 py-4 sticky top-0 z-[60] flex justify-between items-center border-b border-white/20">
          <div className="flex items-center gap-3">
              <SevenX7Logo size="xs" />
              <div className="bg-slate-100 px-2 py-0.5 rounded text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  {user.id?.startsWith('demo-') ? 'Demo' : 'Real-time Fleet'}
              </div>
          </div>
          <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {isOnline ? 'Duty Active' : 'Off Duty'}
                  </span>
              </div>
              <button onClick={() => setIsOnline(!isOnline)} className={`w-12 h-6 rounded-full transition-all relative ${isOnline ? 'bg-emerald-500 shadow-pulse-glow' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-500 ${isOnline ? 'translate-x-7' : 'translate-x-1'}`}></div>
              </button>
          </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col">
          {activeTab === 'TASKS' && (
              <div className="absolute inset-0 flex flex-col">
                  {activeOrder ? (
                      <div className="flex-1 flex flex-col relative">
                          <div className="absolute inset-0 z-0">
                              <MapVisualizer 
                                  stores={[
                                      { ...activeOrder, id: 'store-m', name: activeOrder.storeName, lat: activeOrder.storeLocation?.lat || 0, lng: activeOrder.storeLocation?.lng || 0, type: 'general' } as any,
                                      { ...activeOrder, id: 'cust-m', name: 'Customer Drop', lat: activeOrder.userLocation?.lat || 0, lng: activeOrder.userLocation?.lng || 0, type: 'customer' as any } as any
                                  ]}
                                  userLat={currentLocation?.lat || null}
                                  userLng={currentLocation?.lng || null}
                                  selectedStore={currentTargetStore}
                                  onSelectStore={() => {}}
                                  mode="DELIVERY"
                                  showRoute={true}
                                  driverLocation={currentLocation || undefined}
                                  className="h-full rounded-none shadow-none border-0"
                                  routeSource={currentLocation || undefined}
                                  routeTarget={targetPoint || undefined}
                              />
                          </div>

                          <div className="relative z-10 p-4 pt-6">
                               <div className="bg-slate-900/95 backdrop-blur-xl text-white p-5 rounded-[2.5rem] shadow-2xl border border-white/10 animate-fade-in">
                                   <div className="flex justify-between items-center">
                                       <div>
                                           <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Live Mission</p>
                                           <h2 className="text-xl font-black">
                                               {activeOrder.status === 'Accepted' ? 'Travel to Merchant' : isPickedUp ? 'Deliver to Client' : 'Await Order Packing'}
                                           </h2>
                                       </div>
                                       <div className="text-right">
                                           <p className="text-xl font-black text-white">₹{activeOrder.splits?.deliveryFee || 30}</p>
                                           <p className="text-[9px] font-bold text-white/40 uppercase">Earning</p>
                                       </div>
                                   </div>
                               </div>
                          </div>

                          <div className="mt-auto relative z-10 p-4">
                               <div className="bg-white rounded-[3rem] p-6 shadow-2xl border border-slate-100 animate-slide-up">
                                   <div className="space-y-4 mb-6">
                                       <div className={`flex items-start gap-4 p-4 rounded-2xl transition-all ${!isPickedUp ? 'bg-emerald-50 border border-emerald-100' : 'opacity-40 grayscale'}`}>
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm border border-emerald-100">🏪</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-black uppercase text-emerald-600">Pickup</span>
                                                    {isPickedUp && <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-100 px-1 rounded">Confirmed</span>}
                                                </div>
                                                <h4 className="font-black text-slate-800 text-sm leading-tight truncate">{activeOrder.storeName}</h4>
                                            </div>
                                       </div>
                                       <div className={`flex items-start gap-4 p-4 rounded-2xl transition-all ${isPickedUp ? 'bg-blue-50 border border-blue-100' : 'opacity-40 grayscale'}`}>
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm border border-blue-100">🏠</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2"><span className="text-[8px] font-black uppercase text-blue-600">Drop</span></div>
                                                <h4 className="font-black text-slate-800 text-sm leading-tight truncate">{activeOrder.deliveryAddress}</h4>
                                            </div>
                                       </div>
                                   </div>
                                   {activeOrder.status === 'Accepted' ? (
                                       <button onClick={handleStartTrip} className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 tracking-widest text-xs uppercase group">INITIATE PICKUP TRIP <span className="bg-white/10 p-1 rounded-lg group-hover:translate-x-1 transition-transform">➔</span></button>
                                   ) : (
                                       <button onClick={() => handleStatusUpdate(isPickedUp ? 'delivered' : 'picked_up')} className={`w-full py-4.5 text-white rounded-2xl font-black shadow-xl animate-pulse-glow flex items-center justify-center gap-3 tracking-widest text-xs uppercase group ${isPickedUp ? 'bg-emerald-500' : 'bg-slate-900'}`}>{isPickedUp ? 'COMPLETE DELIVERY' : 'CONFIRM ORDER PICKED'} <span className="bg-white/20 p-1 rounded-lg group-hover:translate-x-1 transition-transform">➔</span></button>
                                   )}
                               </div>
                          </div>
                      </div>
                  ) : (
                      <div className="flex-1 flex flex-col relative">
                          {/* Fixed: Map now visible behind Radar feed for real users */}
                          <div className="absolute inset-0 z-0 opacity-60 grayscale-[0.4]">
                               <MapVisualizer 
                                  stores={availableOrders.map(o => ({ 
                                      id: o.id, name: o.storeName, 
                                      lat: o.storeLocation?.lat || 0, lng: o.storeLocation?.lng || 0, 
                                      type: 'general' 
                                  } as any))}
                                  userLat={currentLocation?.lat || null}
                                  userLng={currentLocation?.lng || null}
                                  selectedStore={null}
                                  onSelectStore={(s) => {
                                      const order = availableOrders.find(o => o.id === s.id);
                                      if (order) handleAccept(order);
                                  }}
                                  mode="DELIVERY"
                                  className="h-full rounded-none shadow-none"
                               />
                          </div>
                          
                          <div className="relative z-10 flex-1 overflow-y-auto p-4 pb-24 hide-scrollbar space-y-5">
                              <div className="px-4 py-3 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl w-fit border border-white flex items-center gap-3 animate-fade-in">
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                  <div>
                                      <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">Radar Active</h2>
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Live Feed • Near Indiranagar</p>
                                  </div>
                              </div>

                              {!isOnline ? (
                                  <div className="py-20 text-center bg-white/95 backdrop-blur-md rounded-[3rem] shadow-soft border border-white animate-fade-in"><div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl grayscale opacity-50">😴</div><h3 className="text-xl font-black text-slate-800 tracking-tight">Mission Board Paused</h3><p className="text-xs text-slate-400 font-bold mb-8 uppercase tracking-widest">Toggle duty to see available tasks</p><button onClick={() => setIsOnline(true)} className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black text-xs tracking-widest shadow-xl active:scale-95 transition-all uppercase">Resume Duty</button></div>
                              ) : availableOrders.length === 0 ? (
                                  <div className="py-24 text-center bg-white/95 backdrop-blur-md rounded-[3rem] shadow-soft border border-white overflow-hidden relative animate-fade-in"><div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500/10"><div className="h-full bg-emerald-500 animate-[width_3s_linear_infinite] w-1/3"></div></div><div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-100"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div></div><h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Scanning Grid...</h3><p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Connecting to Merchant Network</p></div>
                              ) : (
                                  availableOrders.map(order => (
                                      <div key={order.id} className="bg-white/95 backdrop-blur-sm p-6 rounded-[2.5rem] shadow-card border border-white flex flex-col gap-5 animate-slide-up hover:shadow-card-hover transition-all group">
                                          <div className="flex justify-between items-start"><div className="flex items-center gap-4"><div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl group-hover:rotate-6 transition-transform duration-500 border border-emerald-100 shadow-inner">🏪</div><div><h4 className="font-black text-slate-800 text-base leading-tight">{order.storeName}</h4><p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1 bg-emerald-50 w-fit px-2 py-0.5 rounded">Task Open</p></div></div><div className="text-right"><p className="text-2xl font-black text-slate-900 leading-none">₹{order.splits?.deliveryFee || 30}</p><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Reward</p></div></div>
                                          <div className="bg-slate-50/70 p-4 rounded-2xl flex items-center gap-4 border border-slate-100"><div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm border border-slate-100">🏠</div><div className="flex-1 min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Destination</p><p className="text-xs font-bold text-slate-700 truncate">{order.deliveryAddress}</p></div></div>
                                          <button onClick={() => handleAccept(order)} className="w-full bg-slate-900 text-white py-4.5 rounded-2xl font-black text-xs tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2 uppercase group">Claim Assignment <span className="bg-white/10 p-1 rounded-lg group-hover:translate-x-1 transition-transform">➔</span></button>
                                      </div>
                                  ))
                              )}
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
                      <div className="mt-10 grid grid-cols-2 gap-4 border-t border-slate-50 pt-8">
                          <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100 shadow-inner">
                              <p className="text-2xl font-black text-slate-800">{completedCount}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Delivered</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100 shadow-inner">
                              {/* Dynamic real-time rating */}
                              <p className="text-2xl font-black text-emerald-600">⭐ {partnerRating}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Rating</p>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div className="px-2 flex justify-between items-end"><h3 className="font-black text-slate-800 text-lg">Mission Log</h3><span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Real-time History</span></div>
                      {historyOrders.length === 0 ? (
                          <div className="bg-white p-12 rounded-[2.5rem] text-center border border-slate-100 flex flex-col items-center gap-4 opacity-60">
                              <div className="text-4xl grayscale">📜</div>
                              <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No history recorded yet</p>
                          </div>
                      ) : (
                          historyOrders.map(order => (
                              <div key={order.id} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-md transition-all">
                                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-emerald-100 group-hover:rotate-3 transition-transform">✅</div>
                                  <div className="flex-1 min-w-0">
                                      <h4 className="font-black text-slate-800 text-sm truncate">{order.storeName}</h4>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-tighter">
                                          {new Date(order.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                      </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                      <p className="font-black text-slate-900">₹{order.splits?.deliveryFee || 30}</p>
                                      <p className="text-[8px] font-black text-emerald-500 uppercase">Settled</p>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          )}

          {activeTab === 'PROFILE' && (
              <div className="flex-1 overflow-y-auto p-5 pb-24 hide-scrollbar space-y-6 animate-fade-in">
                   <div className="bg-white p-10 rounded-[3rem] shadow-soft border border-white flex flex-col items-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Partner Verified
                        </div>
                        <div className="w-32 h-32 bg-slate-900 rounded-full border-[8px] border-slate-50 shadow-2xl flex items-center justify-center text-5xl mb-6 relative text-white font-black ring-1 ring-slate-100 uppercase">
                            {user.name ? user.name[0] : '👤'}
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{user.name || 'Fleet Operator'}</h3>
                        <div className="flex items-center gap-2 mt-2 px-4 py-1.5 bg-slate-100 rounded-full">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{user.phone}</p>
                        </div>
                   </div>
                   
                   <div className="bg-white rounded-[2.5rem] p-6 shadow-soft border border-white space-y-4">
                      <h3 className="font-black text-slate-800 text-base flex items-center gap-2 px-2"><span>🛠️</span> Fleet Compliance</h3>
                      <div className="flex items-center gap-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                         <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl border border-slate-100">
                             {vehicleData.type === 'ev_slow' ? '⚡' : '⛽'}
                         </div>
                         <div className="flex-1 overflow-hidden">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                {vehicleData.type === 'ev_slow' ? 'Low-Speed EV (<20kmph)' : 'Standard Internal Combustion'}
                            </p>
                            <p className="font-black text-slate-800 text-sm truncate">
                                {vehicleData.type === 'ev_slow' ? (vehicleData.model || 'Model Info Needed') : (vehicleData.license || 'License Needed')}
                            </p>
                         </div>
                         <button onClick={() => setShowVehicleSetup(true)} className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg uppercase tracking-wider shadow-sm hover:bg-emerald-100 transition-colors">Modify</button>
                      </div>
                      <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-4 px-5">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg border border-blue-100 shadow-sm">🔒</div>
                          <div className="flex-1"><p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Asset Registry</p><p className="text-xs font-black text-blue-700">Digital KYC Valid ✓</p></div>
                      </div>
                   </div>
                   
                   <button onClick={onLogout} className="w-full bg-red-50 p-6 rounded-[2rem] border border-red-100 text-red-500 font-black text-xs tracking-widest text-center mt-6 active:bg-red-100 transition-all uppercase flex items-center justify-center gap-3 shadow-sm">
                       <span>🚪</span> Sign Out from Session
                   </button>
              </div>
          )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 nav-glass border-t border-white/20 px-10 py-5 flex justify-between z-[70] shadow-[0_-20px_50px_rgba(0,0,0,0.08)]">
           {[{ id: 'TASKS', icon: '🛵', label: 'Radar' }, { id: 'EARNINGS', icon: '💰', label: 'Wallet' }, { id: 'PROFILE', icon: '👤', label: 'Account' }].map(item => (
             <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-1.5 transition-all relative ${activeTab === item.id ? 'text-slate-900 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
                 <span className={`text-2xl transition-all duration-500 ${activeTab === item.id ? 'filter drop-shadow-md' : 'grayscale opacity-60'}`}>{item.icon}</span>
                 <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-opacity ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
             </button>
           ))}
      </nav>
    </div>
  );
};
