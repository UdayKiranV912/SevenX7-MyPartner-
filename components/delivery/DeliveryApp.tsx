
import React, { useState, useEffect, useRef } from 'react';
import { UserState, Order, Store } from '../../types';
import SevenX7Logo from '../SevenX7Logo';
import { MapVisualizer } from '../MapVisualizer';
import { getAvailableOrders, acceptOrder, updateDeliveryStatus, broadcastLocation } from '../../services/deliveryService';
import { watchLocation, clearWatch, reverseGeocode } from '../../services/locationService';
import { updateUserProfile } from '../../services/userService';

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
  const [isLoading, setIsLoading] = useState(false);
  const [dailyEarnings, setDailyEarnings] = useState(450); 
  const [completedCount, setCompletedCount] = useState(12);

  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [vehicleData, setVehicleData] = useState({
    type: user.vehicleType || 'ev_slow',
    model: user.vehicleModel || '',
    license: user.licenseNumber || ''
  });

  // Reference to track the original start position for simulation
  const simulationStartPos = useRef<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    const watchId = watchLocation(
      (loc) => {
        // Only update from real GPS if NOT in an active demo simulation
        if (user.id !== 'demo-partner' || !activeOrder || activeOrder.status === 'Ready' || activeOrder.status === 'Accepted') {
           const newLoc = { lat: loc.lat, lng: loc.lng };
           setCurrentLocation(newLoc);
           if (user.id !== 'demo-partner' && isOnline) {
             broadcastLocation(user.id!, loc.lat, loc.lng);
           }
        }
      },
      (err) => console.error("GPS Signal Error", err)
    );
    return () => clearWatch(watchId);
  }, [isOnline, user.id, activeOrder?.status]);

  // Demo Movement Simulation Logic
  useEffect(() => {
    if (user.id !== 'demo-partner' || !activeOrder || !currentLocation) return;

    // We simulate movement if the rider is "On the way" (to store) or "Picked Up" (to customer)
    const isMoving = activeOrder.status === 'On the way' || activeOrder.status === 'Picked Up';
    if (!isMoving) return;

    const target = activeOrder.status === 'On the way' 
      ? activeOrder.storeLocation 
      : activeOrder.userLocation;

    if (!target) return;

    // Store the start position when we begin a leg
    if (!simulationStartPos.current) {
        simulationStartPos.current = { ...currentLocation };
    }

    const start = simulationStartPos.current;
    let progress = 0;
    const duration = 20000; // 20 seconds for the demo leg
    const intervalTime = 1000; // Update every second

    const moveInterval = setInterval(() => {
        progress += intervalTime / duration;
        
        if (progress >= 1) {
            setCurrentLocation({ lat: target.lat, lng: target.lng });
            clearInterval(moveInterval);
            return;
        }

        // Linear interpolation for simplicity in demo
        const nextLat = start.lat + (target.lat - start.lat) * progress;
        const nextLng = start.lng + (target.lng - start.lng) * progress;
        
        setCurrentLocation({ lat: nextLat, lng: nextLng });
    }, intervalTime);

    return () => {
        clearInterval(moveInterval);
    };
  }, [activeOrder?.status, user.id]);

  useEffect(() => {
    if (!isOnline || activeOrder) return;
    const loadOrders = async () => {
        if (user.id === 'demo-partner') {
            if (!currentLocation) return;
            // Generate local demo task around current driver location with clear separation
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
        } catch (e) { console.error("Fetch failed"); } finally { setIsLoading(false); }
    };
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [isOnline, activeOrder, user.id, currentLocation]);

  const handleSaveVehicle = async () => {
    if (!user.id) return;
    try {
      await updateUserProfile(user.id, {
        vehicle_type: vehicleData.type,
        vehicle_model: vehicleData.type === 'ev_slow' ? vehicleData.model : '',
        license_number: vehicleData.type === 'petrol' ? vehicleData.license : ''
      } as any);
      setIsEditingVehicle(false);
    } catch (e) { alert("Failed to update vehicle details."); }
  };

  const handleAccept = async (order: Order) => {
      if (user.id === 'demo-partner') {
          setActiveOrder({ ...order, status: 'Accepted' as any });
          return;
      }
      try {
          await acceptOrder(order.id, user.id!);
          setActiveOrder({ ...order, status: 'Accepted' as any });
      } catch (e) { alert("Task already taken."); }
  };

  const handleStartTrip = async () => {
      if (!activeOrder) return;
      simulationStartPos.current = null; // Reset simulation start point
      if (user.id === 'demo-partner') {
          setActiveOrder({ ...activeOrder, status: 'On the way' as any });
          return;
      }
      try {
          await updateDeliveryStatus(activeOrder.id, 'on_way' as any);
          setActiveOrder({ ...activeOrder, status: 'On the way' as any });
      } catch (e) { alert("Failed to start trip"); }
  };

  const handleStatusUpdate = async (newStatus: 'picked_up' | 'delivered') => {
      if (!activeOrder) return;
      simulationStartPos.current = null; // Reset simulation start point
      if (user.id === 'demo-partner') {
          if (newStatus === 'delivered') {
              setDailyEarnings(prev => prev + (activeOrder.splits?.deliveryFee || 30));
              setCompletedCount(prev => prev + 1);
              setActiveOrder(null);
          } else {
              setActiveOrder({ ...activeOrder, status: 'Picked Up' as any });
          }
          return;
      }
      try {
          await updateDeliveryStatus(activeOrder.id, newStatus);
          if (newStatus === 'delivered') { setActiveOrder(null); }
          else { setActiveOrder({ ...activeOrder, status: 'Picked Up' as any }); }
      } catch (e) { alert("Status update failed"); }
  };

  const isPickedUp = activeOrder?.status === 'Picked Up';
  const targetPoint = activeOrder ? (isPickedUp ? activeOrder.userLocation : activeOrder.storeLocation) : null;
  
  const currentTargetStore: Store | null = (activeOrder && targetPoint) ? {
      id: isPickedUp ? 'target-cust' : 'target-store',
      name: isPickedUp ? 'Customer Drop' : activeOrder.storeName,
      lat: targetPoint.lat,
      lng: targetPoint.lng,
      address: isPickedUp ? activeOrder.deliveryAddress || '' : '',
      rating: 0, distance: '', isOpen: true, type: isPickedUp ? 'customer' as any : 'general', availableProductIds: []
  } : null;

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col font-sans overflow-hidden">
      <header className="nav-glass px-6 py-4 sticky top-0 z-[60] flex justify-between items-center border-b border-white/20">
          <div className="flex items-center gap-3">
              <SevenX7Logo size="xs" />
              <div className="bg-slate-100 px-2 py-0.5 rounded text-[8px] font-black text-slate-400 uppercase tracking-widest">{user.id === 'demo-partner' ? 'Demo Fleet' : 'Fleet Alpha'}</div>
          </div>
          <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              <button onClick={() => setIsOnline(!isOnline)} className={`w-12 h-6 rounded-full transition-all relative ${isOnline ? 'bg-emerald-500 shadow-pulse-glow' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-500 ${isOnline ? 'translate-x-7' : 'translate-x-1'}`}></div></button>
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
                               <div className="bg-slate-900/90 backdrop-blur-lg text-white p-5 rounded-[2.5rem] shadow-2xl border border-white/10 animate-fade-in">
                                   <div className="flex justify-between items-center">
                                       <div>
                                           <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Current Leg</p>
                                           <h2 className="text-xl font-black">{activeOrder.status === 'Accepted' ? 'Navigate to Store' : isPickedUp ? 'Navigate to Customer' : 'Wait at Store'}</h2>
                                       </div>
                                       <div className="text-right"><p className="text-xl font-black text-white">₹{activeOrder.splits?.deliveryFee}</p><p className="text-[9px] font-bold text-white/40 uppercase">Earning</p></div>
                                   </div>
                               </div>
                          </div>

                          <div className="mt-auto relative z-10 p-4">
                               <div className="bg-white rounded-[3rem] p-6 shadow-2xl border border-slate-100 animate-slide-up">
                                   <div className="space-y-4 mb-6">
                                       <div className={`flex items-start gap-4 p-3 rounded-2xl transition-all ${!isPickedUp ? 'bg-emerald-50 border border-emerald-100' : 'opacity-40'}`}>
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">🏪</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2"><span className="text-[8px] font-black uppercase text-emerald-600">Pickup</span>{isPickedUp && <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-100 px-1 rounded">Done</span>}</div>
                                                <h4 className="font-black text-slate-800 text-sm leading-tight truncate">{activeOrder.storeName}</h4>
                                            </div>
                                            {!isPickedUp && <button className="bg-white text-emerald-600 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">🧭</button>}
                                       </div>
                                       <div className={`flex items-start gap-4 p-3 rounded-2xl transition-all ${isPickedUp ? 'bg-blue-50 border border-blue-100' : 'opacity-40'}`}>
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">🏠</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2"><span className="text-[8px] font-black uppercase text-blue-600">Drop</span></div>
                                                <h4 className="font-black text-slate-800 text-sm leading-tight truncate">{activeOrder.deliveryAddress}</h4>
                                            </div>
                                            {isPickedUp && <button className="bg-white text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">🧭</button>}
                                       </div>
                                   </div>
                                   {activeOrder.status === 'Accepted' ? (
                                       <button onClick={handleStartTrip} className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 tracking-widest text-xs uppercase group">START TRIP TO STORE <span className="bg-white/10 p-1 rounded-lg group-hover:translate-x-1 transition-transform">➔</span></button>
                                   ) : (
                                       <button onClick={() => handleStatusUpdate(isPickedUp ? 'delivered' : 'picked_up')} className={`w-full py-4.5 text-white rounded-2xl font-black shadow-xl animate-pulse-glow flex items-center justify-center gap-3 tracking-widest text-xs uppercase group ${isPickedUp ? 'bg-emerald-500' : 'bg-slate-900'}`}>{isPickedUp ? 'CONFIRM DELIVERY' : 'CONFIRM PICKUP'} <span className="bg-white/20 p-1 rounded-lg group-hover:translate-x-1 transition-transform">➔</span></button>
                                   )}
                               </div>
                          </div>
                      </div>
                  ) : (
                      <div className="flex-1 overflow-y-auto p-4 pb-24 hide-scrollbar space-y-5">
                          <div className="px-2"><h2 className="text-2xl font-black text-slate-800 tracking-tight">Radar</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Nearby Opportunities</p></div>
                          {!isOnline ? (
                              <div className="py-20 text-center bg-white rounded-[3rem] shadow-soft border border-white"><div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl grayscale opacity-50">😴</div><h3 className="text-xl font-black text-slate-800">You're Offline</h3><button onClick={() => setIsOnline(true)} className="mt-8 bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs tracking-widest shadow-xl active:scale-95 transition-all">GO ONLINE</button></div>
                          ) : availableOrders.length === 0 ? (
                              <div className="py-24 text-center bg-white rounded-[3rem] shadow-soft border border-white overflow-hidden relative"><div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500/20"><div className="h-full bg-emerald-500 animate-[width_3s_linear_infinite] w-1/3"></div></div><div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-100"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div></div><h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Scanning...</h3></div>
                          ) : (
                              availableOrders.map(order => (
                                  <div key={order.id} className="bg-white p-6 rounded-[2.5rem] shadow-card border border-white flex flex-col gap-5 animate-slide-up hover:shadow-card-hover transition-all group">
                                      <div className="flex justify-between items-start"><div className="flex items-center gap-4"><div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl group-hover:rotate-6 transition-transform duration-500 border border-emerald-100">🏪</div><div><h4 className="font-black text-slate-800 text-base leading-tight">{order.storeName}</h4><p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1 bg-emerald-50 w-fit px-2 py-0.5 rounded">Order Ready</p></div></div><div className="text-right"><p className="text-2xl font-black text-slate-900 leading-none">₹{order.splits?.deliveryFee || 30}</p><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Net Pay</p></div></div>
                                      <div className="bg-slate-50/50 p-4 rounded-2xl flex items-center gap-4 border border-slate-100"><div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm border border-slate-100">📍</div><div className="flex-1 min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Customer At</p><p className="text-xs font-bold text-slate-700 truncate">{order.deliveryAddress}</p></div></div>
                                      <button onClick={() => handleAccept(order)} className="w-full bg-slate-900 text-white py-4.5 rounded-2xl font-black text-xs tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2 group">ACCEPT TASK <span className="bg-white/10 p-1 rounded-lg group-hover:translate-x-1 transition-transform">➔</span></button>
                                  </div>
                              ))
                          )}
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'EARNINGS' && (
              <div className="flex-1 overflow-y-auto p-5 pb-24 hide-scrollbar space-y-6 animate-fade-in">
                  <div className="bg-white p-10 rounded-[3rem] shadow-soft border border-white text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500"></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Payout Wallet</p>
                      <h2 className="text-6xl font-black text-slate-900 tracking-tighter">₹{dailyEarnings}</h2>
                      <div className="mt-10 grid grid-cols-2 gap-4 border-t border-slate-50 pt-8"><div className="bg-slate-50 p-4 rounded-[1.5rem]"><p className="text-2xl font-black text-slate-800">{completedCount}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Completed</p></div><div className="bg-slate-50 p-4 rounded-[1.5rem]"><p className="text-2xl font-black text-slate-800">4.98</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Rating</p></div></div>
                  </div>
              </div>
          )}

          {activeTab === 'PROFILE' && (
              <div className="flex-1 overflow-y-auto p-5 pb-24 hide-scrollbar space-y-6 animate-fade-in">
                   <div className="bg-white p-10 rounded-[3rem] shadow-soft border border-white flex flex-col items-center relative overflow-hidden">
                        <div className="w-32 h-32 bg-slate-900 rounded-full border-[8px] border-slate-50 shadow-2xl flex items-center justify-center text-5xl mb-6 relative">👤</div>
                        <h3 className="text-2xl font-black text-slate-900">{user.name || 'Fleet Pilot'}</h3>
                   </div>
                   <div className="bg-white rounded-[2.5rem] p-6 shadow-soft border border-white space-y-4">
                      <h3 className="font-black text-slate-800 text-base">Vehicle & Compliance</h3>
                      <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                         <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl">{vehicleData.type === 'ev_slow' ? '⚡' : '⛽'}</div>
                         <div className="flex-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{vehicleData.type === 'ev_slow' ? 'Low Speed EV' : 'Standard Petrol'}</p><p className="font-black text-slate-800 text-sm">{vehicleData.type === 'ev_slow' ? (vehicleData.model || 'Unspecified') : (vehicleData.license || 'License Not Provided')}</p></div>
                      </div>
                   </div>
                   <button onClick={onLogout} className="w-full bg-red-50 p-6 rounded-[2rem] border border-red-100 text-red-500 font-black text-xs tracking-widest text-center mt-6 active:bg-red-100 transition-all uppercase">Logout Session</button>
              </div>
          )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 nav-glass border-t border-white/20 px-8 py-5 flex justify-between z-[70] shadow-[0_-20px_50px_rgba(0,0,0,0.08)]">
           {[{ id: 'TASKS', icon: '🛵', label: 'Radar' }, { id: 'EARNINGS', icon: '💰', label: 'Wallet' }, { id: 'PROFILE', icon: '👤', label: 'Account' }].map(item => (
             <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-1.5 transition-all relative ${activeTab === item.id ? 'text-slate-900 scale-110' : 'text-slate-300'}`}><span className={`text-2xl transition-all duration-500 ${activeTab === item.id ? 'filter drop-shadow-md' : 'grayscale opacity-60'}`}>{item.icon}</span><span className={`text-[9px] font-black uppercase tracking-widest transition-opacity ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span></button>
           ))}
      </nav>
    </div>
  );
};
