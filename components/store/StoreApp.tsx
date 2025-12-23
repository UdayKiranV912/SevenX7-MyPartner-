
import React, { useEffect, useState, useRef } from 'react';
import { UserState, Store, Order, InventoryItem, Product, BrandInventoryInfo } from '../../types';
import { getMyStore, getStoreInventory, updateInventoryItem, deleteInventoryItem, getIncomingOrders, updateStoreOrderStatus, updateStoreProfile, createCustomProduct } from '../../services/storeAdminService';
import { supabase } from '../../services/supabaseClient';
import SevenX7Logo from '../SevenX7Logo';
import { MapVisualizer } from '../MapVisualizer';
import { INITIAL_PRODUCTS } from '../../constants';
import { reverseGeocode } from '../../services/locationService';
import { AddressAutocomplete } from '../AddressAutocomplete';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StoreAppProps {
  user: UserState;
  onLogout: () => void;
}

/**
 * Hardened safeStr helper to strictly prevent [object Object] rendering.
 */
const safeStr = (val: any, fallback: string = ''): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return isNaN(val) ? fallback : String(val);
    if (typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
        if (val.message && typeof val.message === 'string') return val.message;
        if (val.name && typeof val.name === 'string') return val.name;
        return fallback;
    }
    return fallback;
};

export const StoreApp: React.FC<StoreAppProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'INVENTORY' | 'ORDERS'>('DASHBOARD');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [myStore, setMyStore] = useState<Store | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<Store>>({});
  const [isLocating, setIsLocating] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [mapForcedCenter, setMapForcedCenter] = useState<{lat: number; lng: number} | null>(null);
  const latestLocationRef = useRef<{lat: number; lng: number} | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All'); 
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [draftMrps, setDraftMrps] = useState<Record<string, string>>({});
  const [draftStocks, setDraftStocks] = useState<Record<string, string>>({});
  const [customProduct, setCustomProduct] = useState({
      name: '', brandName: '', category: 'Staples', price: '', mrp: '', stock: '', description: ''
  });

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter(o => ['Placed', 'Accepted', 'Preparing', 'Ready', 'On the way'].includes(o.status)).length;
  const activeInventory = inventory.filter(i => i.isActive && i.inStock);
  const inventoryValue = activeInventory.reduce((sum, item) => sum + (item.stock * item.storePrice), 0);
  const lowStockCount = activeInventory.filter(i => i.stock < 10).length;

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition((pos) => {
      const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(newLoc);
      latestLocationRef.current = newLoc;
    }, () => {}, { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const loadStore = async () => {
      if (!user.id) return;
      try {
        setLoading(true);
        let store = await getMyStore(user.id);
        if (!store && user.id === 'demo-user') {
            store = { id: 'demo-store-1', name: 'Nandini Milk Parlour', address: 'CMH Road, Indiranagar', rating: 4.8, distance: '0 km', lat: 12.9784, lng: 77.6408, isOpen: true, type: 'dairy', availableProductIds: [], upiId: 'nandini@upi', ownerId: 'demo-user' };
        }
        setMyStore(store);
      } catch (e) {} finally { setLoading(false); }
    };
    loadStore();
  }, [user.id]);

  useEffect(() => {
    if (!myStore || user.id?.includes('demo')) {
      if (myStore && user.id === 'demo-user') {
          setInventory(INITIAL_PRODUCTS.map(p => ({ ...p, inStock: true, stock: 20, storePrice: p.price, isActive: true, brandDetails: {} })));
          setOrders([{ id: 'demo-ord-1', date: new Date().toISOString(), items: [], total: 120, status: 'Placed', paymentStatus: 'PAID', mode: 'DELIVERY', deliveryType: 'INSTANT', storeName: myStore.name, customerName: 'Rahul Dravid' } as any]);
      }
      return;
    }
    const fetchData = async () => {
        const [inv, ords] = await Promise.all([getStoreInventory(myStore.id), getIncomingOrders(myStore.id)]);
        setInventory(inv);
        setOrders(ords);
    };
    fetchData();
    const invSub = supabase.channel('store-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory', filter: `store_id=eq.${myStore.id}` }, () => getStoreInventory(myStore.id).then(setInventory)).subscribe();
    return () => { supabase.removeChannel(invSub); };
  }, [myStore, user.id]);

  const handleInventoryUpdate = async (product: InventoryItem, newPrice: number, newStockStatus: boolean, newStockQty: number, newMrp?: number) => {
    if (!myStore) return;
    const finalPrice = newPrice || product.storePrice;
    const finalStock = newStockQty || 0;
    const updated = inventory.map(item => item.id === product.id ? { ...item, storePrice: finalPrice, inStock: newStockStatus, stock: finalStock, isActive: true } : item);
    setInventory(updated);
    if (user.id !== 'demo-user') await updateInventoryItem(myStore.id, product.id, finalPrice, newStockStatus, finalStock);
  };

  const handleOrderStatus = async (orderId: string, status: string) => {
    if (user.id === 'demo-user') {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as any } : o));
        return;
    }
    await updateStoreOrderStatus(orderId, status);
    if (myStore) getIncomingOrders(myStore.id).then(setOrders);
  };

  return (
    <div className="fixed inset-0 bg-slate-50 font-sans flex flex-col overflow-hidden">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-5 flex justify-between items-center z-[60] shrink-0">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="bg-slate-900 text-white w-7 h-7 rounded-lg flex items-center justify-center text-[10px]">🏪</span>
            {safeStr(myStore?.name, 'My Store')}
          </h1>
        </div>
        <button onClick={() => setShowProfileModal(true)} className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg active:scale-95 transition-all shadow-sm">👤</button>
      </header>

      <main className="flex-1 overflow-y-auto p-5 pb-24 hide-scrollbar">
        {activeTab === 'DASHBOARD' && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full -mr-24 -mt-24"></div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2">Today's Payout</p>
              <h2 className="text-5xl font-black tracking-tighter">₹{totalRevenue.toLocaleString()}</h2>
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-xl font-black">{pendingOrders}</p>
                  <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">Pending</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-xl font-black">{lowStockCount}</p>
                  <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">Refill</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-xl font-black">4.9</p>
                  <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">SLA</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-6 shadow-soft border border-white">
              <h3 className="font-black text-slate-800 text-lg mb-6">Top Stock Performance</h3>
              <div className="space-y-5">
                {activeInventory.slice(0, 4).map(item => (
                  <div key={item.id} className="flex items-center gap-4 group">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 group-hover:rotate-3 transition-transform">{item.emoji}</div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-black text-slate-800">{safeStr(item.name)}</span>
                        <span className="text-xs font-black text-emerald-500">{Math.round((item.stock/50)*100)}% Stock</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min((item.stock/50)*100, 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => {}} className="bg-white p-6 rounded-[2.5rem] border border-white shadow-soft flex flex-col items-center gap-3 active:scale-95 transition-all">
                <span className="text-3xl">📥</span>
                <span className="text-[10px] font-black uppercase text-slate-400">Reports</span>
              </button>
              <button onClick={() => setActiveTab('INVENTORY')} className="bg-white p-6 rounded-[2.5rem] border border-white shadow-soft flex flex-col items-center gap-3 active:scale-95 transition-all">
                <span className="text-3xl">📦</span>
                <span className="text-[10px] font-black uppercase text-slate-400">Restock</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'ORDERS' && (
          <div className="animate-fade-in space-y-4">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight px-2">Incoming Feed</h2>
            {orders.length === 0 ? (
              <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200"><p className="text-slate-400 font-bold uppercase tracking-widest">Waiting for orders...</p></div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-white space-y-5 animate-slide-up hover:shadow-card-hover transition-all">
                   <div className="flex justify-between items-start">
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order #{safeStr(order.id.slice(-4))}</p>
                       <h3 className="text-lg font-black text-slate-800">{safeStr(order.customerName)}</h3>
                     </div>
                     <span className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest ${order.status === 'Placed' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>{safeStr(order.status)}</span>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
                     {order.items.map((it, idx) => <div key={idx} className="flex justify-between text-xs font-bold"><span className="text-slate-500">{it.quantity}x {safeStr(it.name)}</span><span className="text-slate-800">₹{it.price * it.quantity}</span></div>)}
                     <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-slate-900"><span>Total</span><span>₹{order.total}</span></div>
                   </div>
                   {order.status === 'Placed' ? (
                     <button onClick={() => handleOrderStatus(order.id, 'accepted')} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all">Accept Mission</button>
                   ) : order.status === 'Accepted' ? (
                     <button onClick={() => handleOrderStatus(order.id, 'packing')} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl animate-pulse-glow">Start Packing</button>
                   ) : (
                     <button className="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] cursor-not-allowed">Processing...</button>
                   )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'INVENTORY' && (
          <div className="animate-fade-in space-y-4">
             <div className="flex justify-between items-center px-2 mb-2">
               <h2 className="text-2xl font-black text-slate-900 tracking-tight">Shelves</h2>
               <button onClick={() => setShowAddProduct(true)} className="bg-emerald-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-200 active:scale-95 transition-all">+</button>
             </div>
             <div className="space-y-4 pb-20">
               {inventory.filter(i => i.isActive).map(item => (
                 <div key={item.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-white flex items-center gap-5 transition-all hover:shadow-md">
                   <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-3xl border border-slate-100 shrink-0">{item.emoji}</div>
                   <div className="flex-1 min-w-0">
                     <h4 className="font-black text-slate-800 text-base truncate">{safeStr(item.name)}</h4>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">₹{item.storePrice} • {item.stock} left</p>
                   </div>
                   <button onClick={() => handleInventoryUpdate(item, item.storePrice, !item.inStock, item.stock)} className={`w-14 h-8 rounded-full relative transition-all duration-300 ${item.inStock ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${item.inStock ? 'translate-x-7' : 'translate-x-1'}`}></div>
                   </button>
                 </div>
               ))}
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-8 py-5 flex justify-between z-[70] shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        {[
          { id: 'DASHBOARD', icon: '📊', label: 'Summary' },
          { id: 'ORDERS', icon: '🔔', label: 'Orders' },
          { id: 'INVENTORY', icon: '📦', label: 'Shelf' },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-1.5 transition-all relative ${activeTab === item.id ? 'text-slate-900 scale-110' : 'text-slate-300'}`}>
            <span className={`text-2xl transition-all duration-500 ${activeTab === item.id ? 'opacity-100' : 'opacity-60 grayscale'}`}>{item.icon}</span>
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-opacity ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
