
import React, { useState, useEffect } from 'react';
import { UserState, Store, Product, CartItem, Order } from '../../types';
import { MapVisualizer } from '../MapVisualizer';
import { StickerProduct } from '../StickerProduct';
import { CartDetails } from '../CartSheet';
import { ProductDetailsModal } from '../ProductDetailsModal';
import { MyOrders } from '../MyOrders';
import { UserProfile } from '../UserProfile';
import { PaymentGateway } from '../PaymentGateway';
import { fetchLiveStores, fetchStoreProducts, subscribeToStoreInventory } from '../../services/storeService';
import { saveOrder } from '../../services/orderService';
import { findNearbyStores } from '../../services/geminiService';
import SevenX7Logo from '../SevenX7Logo';
import { MOCK_STORES } from '../../constants';
import { watchLocation, clearWatch, getBrowserLocation, reverseGeocode } from '../../services/locationService';

interface CustomerAppProps {
  user: UserState;
  onLogout: () => void;
}

export const CustomerApp: React.FC<CustomerAppProps> = ({ user, onLogout }) => {
  const [activeView, setActiveView] = useState<'HOME' | 'STORE' | 'ORDERS' | 'PROFILE' | 'CART'>('HOME');
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | Store['type']>('ALL');
  const [currentAddress, setCurrentAddress] = useState<string>(user.address || 'Locating...');
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(user.location);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingOrderDetails, setPendingOrderDetails] = useState<any>(null);

  useEffect(() => {
    const initLocation = async () => {
      try {
        const loc = await getBrowserLocation();
        setCurrentLocation({ lat: loc.lat, lng: loc.lng });
        const address = await reverseGeocode(loc.lat, loc.lng);
        if (address) setCurrentAddress(address);
      } catch (e) {
        if (!user.location) { setCurrentLocation({ lat: 12.9716, lng: 77.5946 }); setCurrentAddress("Bengaluru, India"); }
      }
    };
    initLocation();
    const watchId = watchLocation((loc) => {
        // High Accuracy Guard: Filter updates with > 60m error
        if (loc.accuracy < 60) setCurrentLocation({ lat: loc.lat, lng: loc.lng });
    }, (err) => {});
    return () => { if (watchId !== -1) clearWatch(watchId); };
  }, []);

  useEffect(() => {
    const lat = currentLocation?.lat || 12.9716;
    const lng = currentLocation?.lng || 77.5946;
    const loadStores = async () => {
      setIsLoading(true);
      try {
        let liveStores = await fetchLiveStores(lat, lng);
        if (liveStores.length === 0) liveStores = await findNearbyStores(lat, lng);
        if (liveStores.length === 0) liveStores = MOCK_STORES;
        setStores(liveStores);
      } catch (e) { setStores(MOCK_STORES); } finally { setIsLoading(false); }
    };
    loadStores();
  }, [currentLocation]);

  useEffect(() => {
    if (!selectedStore) return;
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const products = await fetchStoreProducts(selectedStore.id);
        setStoreProducts(products);
        subscribeToStoreInventory(selectedStore.id, () => fetchStoreProducts(selectedStore.id).then(setStoreProducts));
      } catch (e) {} finally { setIsLoading(false); }
    };
    loadProducts();
  }, [selectedStore]);

  const processedStores = React.useMemo(() => {
    let filtered = stores;
    if (filterType !== 'ALL') filtered = stores.filter(s => s.type === filterType);
    return [...filtered].sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  }, [stores, filterType]);

  const addToCart = (product: Product, quantity: number = 1, brandName: string = 'Generic', price?: number) => {
    if (!selectedStore) return;
    const finalPrice = price || product.price;
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.originalProductId === product.id && item.selectedBrand === brandName);
      if (existingIdx > -1) { const newCart = [...prev]; newCart[existingIdx].quantity += quantity; return newCart; }
      return [...prev, {
        ...product, id: `${product.id}-${brandName}-${Date.now()}`, originalProductId: product.id, price: finalPrice, quantity, selectedBrand: brandName, storeId: selectedStore.id, storeName: selectedStore.name, storeType: selectedStore.type
      }];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
  };

  const handlePlaceOrder = (details: any) => { setPendingOrderDetails(details); setShowPayment(true); };

  const handlePaymentSuccess = async () => {
    if (!pendingOrderDetails) return;
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newOrder: Order = {
      id: `ord-${Date.now()}`, date: new Date().toISOString(), items: cart, total: totalAmount, status: 'Pending', paymentStatus: 'PAID', mode: 'DELIVERY', deliveryType: pendingOrderDetails.deliveryType, scheduledTime: pendingOrderDetails.scheduledTime, deliveryAddress: currentAddress, storeName: cart[0].storeName, storeLocation: selectedStore ? { lat: selectedStore.lat, lng: selectedStore.lng } : undefined, userLocation: currentLocation || undefined, splits: pendingOrderDetails.splits, customerName: user.name, customerPhone: user.phone
    };
    if (user.id && !user.id.includes('demo')) await saveOrder(user.id, newOrder);
    setCart([]); setShowPayment(false); setActiveView('ORDERS');
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-hidden font-sans">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-5 py-3 flex items-center justify-between z-[60] shrink-0">
        <SevenX7Logo size="xs" />
        <div className="flex items-center gap-2">
          <div className="bg-slate-50 border border-slate-100 rounded-full px-3 py-1 flex items-center gap-2 max-w-[100px] cursor-pointer" onClick={() => setActiveView('PROFILE')}>
            <span className="text-emerald-500 text-[6px] animate-pulse">●</span>
            <span className="text-[7px] font-black text-slate-700 truncate uppercase tracking-tighter">{currentAddress}</span>
          </div>
          <button onClick={() => setActiveView('CART')} className="relative w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-md">
            <span className="text-xs">🛒</span>
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white shadow-sm">{cart.length}</span>}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar bg-slate-50/30">
        {activeView === 'HOME' && (
          <div className="animate-fade-in p-4 space-y-4">
            <div className="h-80 rounded-[2.5rem] overflow-hidden shadow-md relative border-2 border-white">
              <MapVisualizer stores={processedStores} userLat={currentLocation?.lat || null} userLng={currentLocation?.lng || null} selectedStore={null} onSelectStore={(s) => { setSelectedStore(s); setActiveView('STORE'); }} mode="DELIVERY" enableLiveTracking={false} />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {['ALL', 'general', 'produce', 'dairy'].map((type) => (
                <button key={type} onClick={() => setFilterType(type as any)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border shrink-0 ${filterType === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>
                  {type === 'ALL' ? 'All' : type === 'general' ? 'Marts' : type === 'produce' ? 'Veg' : 'Dairy'}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {processedStores.map(store => (
                <div key={store.id} onClick={() => { setSelectedStore(store); setActiveView('STORE'); }} className="bg-white p-4 rounded-[2rem] shadow-sm border border-white flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${store.type === 'produce' ? 'bg-emerald-50 text-emerald-600' : store.type === 'dairy' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                    {store.type === 'produce' ? '🥦' : store.type === 'dairy' ? '🥛' : '🏪'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 text-sm truncate">{store.name}</h3>
                    <p className="text-[9px] font-bold text-slate-400">{store.distance} • ⭐ {store.rating?.toFixed(1) || '4.5'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'STORE' && selectedStore && (
          <div className="animate-slide-up min-h-full">
            <div className="bg-white p-6 pb-4 rounded-b-[2.5rem] shadow-sm mb-4">
                <button onClick={() => setActiveView('HOME')} className="mb-2 text-emerald-500 font-black text-[8px] uppercase tracking-widest">← Back</button>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{selectedStore.name}</h1>
            </div>
            <div className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-2 pb-16">
                {storeProducts.map(product => (
                  <StickerProduct key={product.id} product={product} count={cart.filter(c => c.originalProductId === product.id).reduce((sum, c) => sum + c.quantity, 0)} onAdd={(p) => addToCart(p, 1, 'Generic', p.price)} onUpdateQuantity={(pid, delta) => { const item = cart.find(c => c.originalProductId === pid); if(item) updateQuantity(item.id, delta); }} onClick={(p) => setSelectedProduct(p)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'ORDERS' && <MyOrders userLocation={currentLocation} userId={user.id} />}
        {activeView === 'PROFILE' && <UserProfile user={{...user, location: currentLocation, address: currentAddress}} onUpdateUser={() => {}} onLogout={onLogout} />}
        {activeView === 'CART' && (
          <div className="absolute inset-0 z-[100] bg-white overflow-y-auto">
            <CartDetails cart={cart} onProceedToPay={handlePlaceOrder} onUpdateQuantity={updateQuantity} onAddProduct={(p) => addToCart(p, 1, 'Generic', p.price)} mode="DELIVERY" onModeChange={() => {}} deliveryAddress={currentAddress} onAddressChange={setCurrentAddress} activeStore={selectedStore} stores={stores} userLocation={currentLocation} isPage={true} onClose={() => setActiveView('HOME')} />
          </div>
        )}
      </main>

      {activeView !== 'CART' && (
        <nav className="fixed bottom-0 left-0 right-0 h-12 bg-white/95 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around z-[110] px-10">
          {[
            { id: 'HOME', icon: '🏪', label: 'Shop' },
            { id: 'ORDERS', icon: '🧾', label: 'Activity' },
            { id: 'PROFILE', icon: '👤', label: 'Me' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id as any)} className={`flex flex-col items-center gap-0 transition-all flex-1 ${activeView === item.id ? 'text-slate-900' : 'text-slate-400'}`}>
              <span className={`text-lg ${activeView === item.id ? 'opacity-100' : 'opacity-60 grayscale'}`}>{item.icon}</span>
              <span className={`text-[6px] font-black uppercase tracking-widest ${activeView === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {selectedProduct && <ProductDetailsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={(p, qty, brand, price) => addToCart(p, qty, brand, price)} />}
      {showPayment && pendingOrderDetails && <PaymentGateway amount={pendingOrderDetails.splits.storeAmount} onSuccess={handlePaymentSuccess} onCancel={() => setShowPayment(false)} isDemo={user.id?.includes('demo')} splits={pendingOrderDetails.splits} />}
    </div>
  );
};
