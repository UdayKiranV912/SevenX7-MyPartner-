
import React, { useEffect, useState } from 'react';
import { Order, Store, OrderMode } from '../types';
import { MapVisualizer } from './MapVisualizer';
import { getUserOrders, subscribeToUserOrders, subscribeToDriverLocation } from '../services/orderService';

interface MyOrdersProps {
  userLocation: { lat: number; lng: number } | null;
  onPayNow?: (order: Order) => void;
  userId?: string;
}

/**
 * Enhanced robust helper to strictly prevent [object Object] rendering.
 */
const safeStr = (val: any, fallback: string = ''): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return isNaN(val) ? fallback : String(val);
    if (typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
        if (Array.isArray(val)) return fallback;
        try {
            if (val.message && typeof val.message === 'string') return val.message;
            if (val.name && typeof val.name === 'string') return val.name;
            if (val.full_name && typeof val.full_name === 'string') return val.full_name;
            if (val.display_name && typeof val.display_name === 'string') return val.display_name;
        } catch(e) {}
        return fallback;
    }
    return fallback;
};

export const MyOrders: React.FC<MyOrdersProps> = ({ userLocation, onPayNow, userId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const [liveDriverLocations, setLiveDriverLocations] = useState<Record<string, {lat: number, lng: number}>>({});

  useEffect(() => {
      const interval = setInterval(() => setTick(t => t + 1), 1000);
      return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        if (userId === 'demo-customer') {
          const savedOrders = localStorage.getItem('grocesphere_orders');
          setOrders(savedOrders ? JSON.parse(savedOrders) : []);
        } else if (userId) {
          const dbOrders = await getUserOrders(userId);
          setOrders(dbOrders);
        }
      } catch (error) { console.error("Failed to load orders:", error); } 
      finally { setLoading(false); }
    };
    fetchOrders();

    let statusSub: any = null;
    if (userId && userId !== 'demo-customer') {
        statusSub = subscribeToUserOrders(userId, (updatedOrderDb) => {
            setOrders(prev => prev.map(o => {
                if (o.id === updatedOrderDb.id) {
                    let appStatus: Order['status'] = 'Pending';
                    if (updatedOrderDb.status === 'accepted') appStatus = 'Accepted';
                    if (updatedOrderDb.status === 'packing') appStatus = 'Preparing';
                    if (updatedOrderDb.status === 'ready') appStatus = 'Ready';
                    if (updatedOrderDb.status === 'on_way') appStatus = 'On the way';
                    if (updatedOrderDb.status === 'delivered') appStatus = 'Delivered';
                    if (updatedOrderDb.status === 'picked_up') appStatus = 'Picked Up';
                    if (updatedOrderDb.status === 'cancelled') appStatus = 'Cancelled';
                    return { ...o, status: appStatus, delivery_partner_id: updatedOrderDb.delivery_partner_id };
                }
                return o;
            }));
        });
    }
    return () => statusSub?.unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (userId === 'demo-customer') return;
    const activeDrivers = orders
        .filter(o => (o.status === 'On the way' || o.status === 'Accepted') && (o as any).delivery_partner_id)
        .map(o => (o as any).delivery_partner_id);
    const subs: any[] = [];
    activeDrivers.forEach(driverId => {
        const sub = subscribeToDriverLocation(driverId, (loc) => {
            setLiveDriverLocations(prev => ({ ...prev, [driverId]: loc }));
        });
        subs.push(sub);
    });
    return () => subs.forEach(s => s.unsubscribe());
  }, [orders, userId]);

  useEffect(() => {
    if (userId !== 'demo-customer') return;
    const interval = setInterval(() => {
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map((o): Order => {
            if (o.status === 'Cancelled' || o.status === 'Delivered' || o.status === 'Picked Up') return o;
            if (o.status === 'Pending') return { ...o, status: 'Preparing' };
            if (o.status === 'Preparing') return { ...o, status: o.mode === 'DELIVERY' ? 'On the way' : 'Ready' };
            if (o.status === 'On the way') return { ...o, status: 'Delivered' };
            if (o.status === 'Ready') return { ...o, status: 'Picked Up' };
            return o;
        });
        localStorage.setItem('grocesphere_orders', JSON.stringify(updatedOrders));
        return updatedOrders;
      });
    }, 15000); 
    return () => clearInterval(interval);
  }, [userId]);

  const getDriverPos = (order: Order) => {
      const partnerId = (order as any).delivery_partner_id;
      if (partnerId && liveDriverLocations[partnerId]) return liveDriverLocations[partnerId];
      if (!order.storeLocation || !order.userLocation) return undefined;
      const loopDuration = 60; 
      const offset = order.id.length; 
      const t = (tick + offset) % loopDuration;
      const progress = t / loopDuration;
      return { 
          lat: order.storeLocation.lat + (order.userLocation.lat - order.storeLocation.lat) * progress, 
          lng: order.storeLocation.lng + (order.userLocation.lng - order.storeLocation.lng) * progress 
      };
  };

  const getStatusInfo = (status: string, mode: OrderMode) => {
      const steps = mode === 'DELIVERY' ? ['Pending', 'Preparing', 'On the way', 'Delivered'] : ['Pending', 'Preparing', 'Ready', 'Picked Up'];
      const currentIndex = steps.indexOf(status);
      const progress = ((currentIndex) / (steps.length - 1)) * 100;
      const getLabel = (s: string) => s === 'Pending' ? 'Placed' : s === 'Preparing' ? 'Packing' : s;
      const getIcon = (s: string) => s === 'Pending' ? '📝' : s === 'Preparing' ? '🥡' : s === 'On the way' ? '🛵' : s === 'Ready' ? '🛍️' : '🏠';
      return { steps, currentIndex, progress, getLabel, getIcon };
  };

  return (
    <div className="pb-32 px-5 space-y-6 pt-4">
      <div className="flex items-center justify-between"><h2 className="font-black text-slate-800 text-2xl tracking-tight">Activity</h2></div>
      {orders.map((order, idx) => {
        const isExpanded = expandedOrderId === order.id;
        const isCompleted = order.status === 'Delivered' || order.status === 'Picked Up';
        const isCancelled = order.status === 'Cancelled';
        const isPickup = order.mode === 'PICKUP';
        const { steps, currentIndex, progress, getLabel, getIcon } = getStatusInfo(order.status, order.mode);
        const mapStore: Store = { id: `s-${order.id}`, name: safeStr(order.storeName), lat: order.storeLocation?.lat || 0, lng: order.storeLocation?.lng || 0, address: '', rating: 0, distance: '', isOpen: true, type: 'general', availableProductIds: [] };
        const driverPos = getDriverPos(order);
        const routeTargetPoint = { lat: order.userLocation?.lat || 0, lng: order.userLocation?.lng || 0 };

        return (
          <div key={order.id} className={`bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 transition-all cursor-pointer ${isExpanded ? 'ring-2 ring-slate-100 bg-slate-50/20' : ''}`} style={{ animationDelay: `${idx * 100}ms` }} onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}>
            <div className="flex justify-between items-start mb-6"><div className="flex-1 min-w-0 pr-4"><h3 className="font-black text-slate-900 text-lg truncate">{safeStr(order.storeName)}</h3><div className="flex items-center gap-2 mt-1.5"><span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(order.date).toLocaleDateString()}</span><span className="text-[10px] font-black text-slate-800 tracking-wide">₹{order.total}</span></div></div><div className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest ${isCompleted ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{safeStr(order.status)}</div></div>
            {!isCancelled && (
                 <div className="mb-8 px-4 relative">
                    <div className="absolute top-[14px] left-10 right-10 h-0.5 bg-slate-100 rounded-full -z-0"></div>
                    <div className="absolute top-[14px] left-10 h-0.5 bg-brand-DEFAULT rounded-full transition-all duration-1000" style={{ width: `calc(${progress}% - 0px)` }}></div>
                    <div className="flex justify-between relative z-10 w-full">{steps.map((step, i) => (
                        <div key={step} className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border-[3px] ${i <= currentIndex ? 'bg-brand-DEFAULT border-brand-DEFAULT text-white' : 'bg-white border-slate-100 text-slate-300'}`}>{i < currentIndex ? '✓' : getIcon(step)}</div>
                            <div className={`text-[8px] font-black uppercase mt-3 tracking-widest ${i === currentIndex ? 'text-brand-dark' : 'text-slate-300'}`}>{getLabel(step)}</div>
                        </div>
                    ))}</div>
                 </div>
            )}
            {isExpanded && (
                <div className="mt-6 pt-6 border-t border-slate-100 animate-fade-in">
                    {!isCancelled && !isCompleted && (
                        <div className="h-48 rounded-[2rem] overflow-hidden mb-6 border border-slate-100 shadow-inner relative isolate" onClick={(e) => e.stopPropagation()}>
                            <MapVisualizer
                                stores={[mapStore]}
                                selectedStore={null}
                                userLat={userLocation?.lat || 0}
                                userLng={userLocation?.lng || 0}
                                mode={order.mode}
                                onSelectStore={() => {}}
                                showRoute={order.status === 'On the way'}
                                enableExternalNavigation={false}
                                className="h-full"
                                driverLocation={driverPos}
                                routeSource={driverPos}
                                routeTarget={routeTargetPoint}
                            />
                        </div>
                    )}
                    <div className="space-y-3">{order.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100"><div className="flex items-center gap-4"><div className="text-2xl bg-white w-12 h-12 flex items-center justify-center rounded-xl shadow-sm border border-slate-100">{item.emoji}</div><div><div className="font-bold text-slate-800 text-sm">{safeStr(item.name)}</div><div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{item.quantity} × ₹{item.price}</div></div></div><div className="font-black text-slate-900 text-sm">₹{item.price * item.quantity}</div></div>
                    ))}</div>
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
