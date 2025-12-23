
import React, { useState, useEffect } from 'react';
import { UserState, Order } from '../../types';
import SevenX7Logo from '../SevenX7Logo';
import { MapVisualizer } from '../MapVisualizer';
import { getAvailableOrders, acceptOrder, broadcastLocation, getPartnerOrderHistory, getSettlements } from '../../services/deliveryService';
import { watchLocation, clearWatch, getBrowserLocation } from '../../services/locationService';
import { updateUserProfile } from '../../services/userService';

interface DeliveryAppProps {
  user: UserState;
  onLogout: () => void;
}

/**
 * Hardened safeStr helper to strictly prevent [object Object] rendering
 */
const safeStr = (val: any, fallback: string = ''): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return isNaN(val) ? fallback : String(val);
    if (typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
        // Return fallback instead of stringifying complex objects to UI
        if (val.message && typeof val.message === 'string') return val.message;
        if (val.name && typeof val.name === 'string') return val.name;
        return fallback;
    }
    return fallback;
};

// Mock Data for Demo Mode only
const MOCK_HISTORY = [
    { id: 'h1', storeName: 'Nandini Milk Parlour', date: '2023-10-24T10:30:00Z', fee: 45 },
    { id: 'h2', storeName: 'MK Ahmed Bazaar', date: '2023-10-24T09:15:00Z', fee: 30 },
];

const MOCK_SETTLEMENTS = [
    { id: 's1', delivery_fee: 1250, admin_upi: 'sevenx7.admin@upi', tx_id: 'TXN8829104421', created_at: '2023-10-23T18:00:00Z' },
    { id: 's2', delivery_fee: 840, admin_upi: 'sevenx7.admin@upi', tx_id: 'TXN7731209930', created_at: '2023-10-20T17:30:00Z' },
];

export const DeliveryApp: React.FC<DeliveryAppProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'TASKS' | 'EARNINGS' | 'SETTLEMENTS' | 'CALC' | 'PROFILE'>('TASKS');
  const [isOnline, setIsOnline] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [dailyEarnings, setDailyEarnings] = useState(450); 
  const [earningHistory, setEarningHistory] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
      email: safeStr(user.email),
      phone: safeStr(user.phone),
      vehicleModel: safeStr(user.vehicleModel)
  });

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

  // Location logic
  useEffect(() => {
    const refreshLoc = () => {
        getBrowserLocation()
            .then(loc => {
                const newLoc = { lat: loc.lat, lng: loc.lng };
                setCurrentLocation(newLoc);
                if (isOnline && user.id && !user.id.startsWith('demo-')) {
                    broadcastLocation(user.id, loc.lat, loc.lng).catch(e => console.error(e));
                }
            })
            .catch(() => {
                if (user.id?.startsWith('demo-') && !currentLocation) {
                    setCurrentLocation({ lat: 12.9716, lng: 77.5946 });
                }
            });
    };
    refreshLoc();
    const locInterval = setInterval(refreshLoc, 15000); 
    return () => clearInterval(locInterval);
  }, [isOnline, user.id]);

  // Load Data
  useEffect(() => {
    if (!isOnline || activeOrder || showVehicleSetup) return;
    
    const loadData = async () => {
        if (user.id?.startsWith('demo-')) {
            if (currentLocation) {
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
            }
            if (earningHistory.length === 0) setEarningHistory(MOCK_HISTORY);
            if (settlements.length === 0) setSettlements(MOCK_SETTLEMENTS);
            return;
        }

        try {
          const [orders, history, settledData] = await Promise.all([
              getAvailableOrders(),
              getPartnerOrderHistory(user.id!),
              getSettlements(user.id!)
          ]);
          setAvailableOrders(orders);
          setEarningHistory(history.map(h => ({
              id: h.id,
              storeName: h.storeName,
              date: h.date,
              fee: h.splits?.deliveryFee || 30
          })));
          setSettlements(settledData);
        } catch (err) { console.error(err); }
    };

    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [isOnline, activeOrder, currentLocation, showVehicleSetup, user.id, earningHistory.length, settlements.length]);

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

  const handleCompleteOrder = () => {
      const fee = activeOrder?.splits?.deliveryFee || 30;
      setDailyEarnings(d => d + fee);
      setEarningHistory(prev => [{
          id: activeOrder?.id || Date.now().toString(),
          storeName: activeOrder?.storeName || 'Store',
          date: new Date().toISOString(),
          fee: fee
      }, ...prev]);
      setActiveOrder(null);
  };

  const saveProfileChanges = async () => {
      if (user.id && !user.id.startsWith('demo-')) {
          try {
              await updateUserProfile(user.id, {
                  email: profileForm.email,
                  phone_number: profileForm.phone,
                  vehicle_model: profileForm.vehicleModel
              } as any);
          } catch (e) {
              alert("Failed to save profile changes.");
              return;
          }
      }
      setIsEditingProfile(false);
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

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col font-sans overflow-hidden">
      <header className="bg-white/90 backdrop-blur-xl px-5 py-4 sticky top-0 z-[100] flex justify-between items-center border-b border-slate-100 shadow-sm">
          <SevenX7Logo size="xs" />
          <button onClick={() => setActiveTab('PROFILE')} className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-slate-200 active:scale-95 transition-all overflow-hidden">
             {safeStr(user.name, 'P').charAt(0)}
          </button>
      </header>

      <main className="flex-1 relative overflow-y-auto hide-scrollbar flex flex-col pb-20 bg-[#F8FAFC]">
          {activeTab === 'TASKS' && (
              <div className="p-4 space-y-4 animate-fade-in">
                  <div className="h-64 rounded-[2.5rem] overflow-hidden shadow-md border-4 border-white relative isolate bg-slate-200">
                      <MapVisualizer stores={availableOrders.map(o => ({ ...o, lat: o.storeLocation?.lat, lng: o.storeLocation?.lng, type: 'general' } as any))} userLat={currentLocation?.lat || null} userLng={currentLocation?.lng || null} selectedStore={null} onSelectStore={() => {}} mode="DELIVERY" className="h-full rounded-none" forcedCenter={currentLocation} />
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
                              <h3 className="text-2xl font-black mb-4 tracking-tighter">₹{safeStr(activeOrder.splits?.deliveryFee, '30')}</h3>
                              <div className="space-y-3">
                                  <p className="font-bold text-xs truncate opacity-80">{safeStr(activeOrder.storeName)} → {safeStr(activeOrder.deliveryAddress)}</p>
                              </div>
                              <button onClick={handleCompleteOrder} className="w-full mt-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">End Mission</button>
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
                                      <div className="flex gap-3 items-center"><div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-xl">📦</div><h4 className="font-black text-slate-800 text-sm truncate max-w-[120px]">{safeStr(order.storeName)}</h4></div>
                                      <div className="text-right"><p className="text-lg font-black text-slate-900 leading-none">₹{safeStr(order.splits?.deliveryFee, '30')}</p><p className="text-[7px] font-black text-slate-400 uppercase mt-1">Admin Fee</p></div>
                                  </div>
                                  <button onClick={() => handleAccept(order)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Start Assignment</button>
                              </div>
                          ))
                      )
                  )}
              </div>
          )}

          {activeTab === 'EARNINGS' && (
              <div className="p-5 space-y-6 animate-fade-in">
                  <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-white text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">SevenX7 HQ Balance</p>
                      <h2 className="text-6xl font-black text-slate-900 tracking-tighter">₹{safeStr(dailyEarnings, '0')}</h2>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase mt-8 tracking-[0.2em] bg-emerald-50 py-2 rounded-xl">Payouts Guaranteed</p>
                  </div>

                  <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Mission History</h3>
                      <div className="space-y-3">
                          {earningHistory.map((item) => (
                              <div key={item.id} className="bg-white p-4 rounded-[1.5rem] border border-white shadow-sm flex items-center justify-between animate-slide-up">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg">🏁</div>
                                      <div className="min-w-0 flex-1">
                                          <p className="text-[11px] font-black text-slate-800 truncate">{safeStr(item.storeName)}</p>
                                          <p className="text-[9px] font-bold text-slate-400">{new Date(item.date).toLocaleDateString()}</p>
                                      </div>
                                  </div>
                                  <span className="text-xs font-black text-emerald-500 shrink-0">+₹{safeStr(item.fee)}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'SETTLEMENTS' && (
              <div className="p-5 space-y-6 animate-fade-in">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight px-2">HQ Transfers</h2>
                  <div className="space-y-4">
                      {settlements.map((s) => (
                          <div key={s.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-white relative overflow-hidden group hover:ring-2 hover:ring-emerald-500/20 transition-all animate-slide-up">
                              <div className="flex justify-between items-start mb-4">
                                  <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Verified Settlement</div>
                                  <p className="text-[9px] font-bold text-slate-400">{new Date(s.created_at).toLocaleDateString()}</p>
                              </div>
                              <div className="flex justify-between items-end">
                                  <div>
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Source Admin UPI</p>
                                      <p className="text-xs font-black text-slate-800">{safeStr(s.admin_upi)}</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount Recvd</p>
                                      <p className="text-3xl font-black text-emerald-500 tracking-tighter">₹{safeStr(s.delivery_fee)}</p>
                                  </div>
                              </div>
                              <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                                  <div>
                                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Transaction ID</p>
                                      <p className="text-[10px] font-mono text-slate-500 font-bold">{safeStr(s.tx_id)}</p>
                                  </div>
                              </div>
                          </div>
                      ))}
                      {settlements.length === 0 && (
                          <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest bg-white rounded-[3rem] border border-slate-100">
                             No settled payouts found
                          </div>
                      )}
                  </div>
              </div>
          )}

          {activeTab === 'CALC' && (
              <div className="p-5 space-y-6 animate-fade-in">
                  <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16"></div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Net Estimated Profit</p>
                      <h2 className="text-5xl font-black tracking-tighter text-emerald-400">₹{safeStr((calcInputs.gross - (calcInputs.distance / calcInputs.mileage * calcInputs.petrolPrice)).toFixed(0), '0')}</h2>
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
                         {safeStr(user.name, 'P').charAt(0)}
                      </div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8 truncate w-full text-center">{safeStr(user.name, 'Partner')}</h3>
                      
                      <div className="w-full space-y-3 text-left">
                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Email</label>
                              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                 {isEditingProfile ? (
                                     <input className="bg-transparent text-xs font-black text-slate-800 outline-none w-full border-b border-emerald-500" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
                                 ) : (
                                     <span className="text-xs font-black text-slate-800 truncate">{safeStr(user.email, 'Not provided')}</span>
                                 )}
                              </div>
                          </div>

                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Phone</label>
                              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                 {isEditingProfile ? (
                                     <input className="bg-transparent text-xs font-black text-slate-800 outline-none w-full border-b border-emerald-500" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
                                 ) : (
                                     <span className="text-xs font-black text-slate-800">{safeStr(user.phone, 'Not linked')}</span>
                                 )}
                              </div>
                          </div>

                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Vehicle #</label>
                              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                 {isEditingProfile ? (
                                     <input className="bg-transparent text-xs font-black text-slate-800 outline-none w-full border-b border-emerald-500" value={profileForm.vehicleModel} onChange={e => setProfileForm({...profileForm, vehicleModel: e.target.value})} />
                                 ) : (
                                     <span className="text-xs font-black text-slate-800">{safeStr(user.vehicleModel || vehicleData.model, 'Pending')}</span>
                                 )}
                              </div>
                          </div>

                          <div className="space-y-1 opacity-70">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">License # (Locked)</label>
                              <div className="flex justify-between items-center bg-slate-100 p-4 rounded-2xl border border-slate-200">
                                 <span className="text-xs font-black text-slate-500">{safeStr(user.licenseNumber || vehicleData.license, 'Pending')}</span>
                                 <span className="text-[8px] font-black text-slate-400 uppercase">Verified</span>
                              </div>
                          </div>
                      </div>

                      <div className="w-full flex flex-col gap-3 mt-10">
                        {isEditingProfile ? (
                            <button onClick={saveProfileChanges} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 active:scale-95 transition-all">Save Changes</button>
                        ) : (
                            <button onClick={() => {
                                setProfileForm({
                                    email: safeStr(user.email),
                                    phone: safeStr(user.phone),
                                    vehicleModel: safeStr(user.vehicleModel || vehicleData.model)
                                });
                                setIsEditingProfile(true);
                            }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Edit Details</button>
                        )}
                        <button onClick={onLogout} className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-100 active:scale-95 transition-all">Go Offline</button>
                      </div>
                  </div>
              </div>
          )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around z-[110] px-4">
           {[
             { id: 'TASKS', icon: '🛵', label: 'Tasks' }, 
             { id: 'EARNINGS', icon: '💰', label: 'Wallet' }, 
             { id: 'SETTLEMENTS', icon: '📥', label: 'Settled' },
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
