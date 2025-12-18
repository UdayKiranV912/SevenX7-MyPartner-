
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
  const [sortBy, setSortBy] = useState<'DISTANCE' | 'RATING'>('DISTANCE');
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
        if (!user.location) {
          setCurrentLocation({ lat: 12.9716, lng: 77.5946 }); 
          setCurrentAddress("Bangalore, India");
        }
      }
    };
    initLocation();
    const watchId = watchLocation((loc) => setCurrentLocation({ lat: loc.lat, lng: loc.lng }), (err) => {});
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
      } catch (e) {
        setStores(MOCK_STORES);
      } finally {
        setIsLoading(false);
      }
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
    return [...filtered].sort((a, b) => sortBy === 'RATING' ? b.rating - a.rating : parseFloat(a.distance) - parseFloat(b.distance));
  }, [stores, filterType, sortBy]);

  const addToCart = (product: Product, quantity: number = 1, brandName: string = 'Generic', price?: number) => {
    if (!selectedStore) return;
    const finalPrice = price || product.price;
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.originalProductId === product.id && item.selectedBrand === brandName);
      if (existingIdx > -1) {
        const newCart = [...prev];
        newCart[existingIdx].quantity += quantity;
        return newCart;
      }
      return [...prev, {
        ...product,
        id: `${product.id}-${brandName}-${Date.now()}`,
        originalProductId: product.id,
        price: finalPrice, 
        quantity,
        selectedBrand: brandName,
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        storeType: selectedStore.type
      }];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
  };

  const handlePlaceOrder = (details: any) => {
    setPendingOrderDetails(details);
    setShowPayment(true);
  };

  const handlePaymentSuccess = async () => {
    if (!pendingOrderDetails) return;
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      date: new Date().toISOString(),
      items: cart,
      total: totalAmount,
      status: 'Pending',
      paymentStatus: 'PAID',
      mode: 'DELIVERY',
      deliveryType: pendingOrderDetails.deliveryType,
      scheduledTime: pendingOrderDetails.scheduledTime,
      deliveryAddress: currentAddress,
      storeName: cart[0].storeName,
      storeLocation: selectedStore ? { lat: selectedStore.lat, lng: selectedStore.lng } : undefined,
      userLocation: currentLocation || undefined,
      splits: pendingOrderDetails.splits,
      customerName: user.name,
      customerPhone: user.phone
    };
    if (user.id && user.id !== 'demo-customer') await saveOrder(user.id, newOrder);
    setCart([]);
    setShowPayment(false);
    setActiveView('ORDERS');
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-hidden font-sans">
      {/* PREMIUM GLASS HEADER */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-5 flex items-center justify-between z-[60] shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('HOME')}>
          <SevenX7Logo size="xs" />
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-100 rounded-full px-4 py-2 flex items-center gap-2 max-w-[160px] shadow-sm cursor-pointer" onClick={() => setActiveView('PROFILE')}>
            <span className="text-emerald-500 text-[10px] animate-pulse">●</span>
            <span className="text-[10px] font-black text-slate-700 truncate uppercase tracking-tighter">{currentAddress}</span>
          </div>
          <button onClick={() => setActiveView('CART')} className="relative w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all">
            <span className="text-lg">🛒</span>
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-scale-in">{cart.length}</span>}
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 overflow-y-auto hide-scrollbar bg-slate-50/30">
        {activeView === 'HOME' && (
          <div className="animate-fade-in p-5 space-y-6">
            <div className="h-80 rounded-[3rem] overflow-hidden shadow-soft-xl relative border-4 border-white group">
              <MapVisualizer 
                stores={processedStores}
                userLat={currentLocation?.lat || null}
                userLng={currentLocation?.lng || null}
                selectedStore={null}
                onSelectStore={(s) => { setSelectedStore(s); setActiveView('STORE'); }}
                mode="DELIVERY"
                enableLiveTracking={false}
              />
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-2xl shadow-xl text-[10px] font-black text-slate-800 uppercase tracking-widest border border-white">
                {processedStores.length} Marts Nearby
              </div>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar px-1">
              <button onClick={() => setSortBy(prev => prev === 'DISTANCE' ? 'RATING' : 'DISTANCE')} className="bg-white border border-slate-100 px-4 py-3 rounded-2xl text-[10px] font-black shadow-sm text-slate-800 hover:bg-slate-50 shrink-0 uppercase tracking-widest flex items-center gap-2">
                <span>{sortBy === 'DISTANCE' ? '📍 Nearest' : '⭐ Top Rated'}</span>
              </button>
              <div className="h-6 w-px bg-slate-200 shrink-0"></div>
              {['ALL', 'general', 'produce', 'dairy'].map((type) => (
                <button key={type} onClick={() => setFilterType(type as any)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${filterType === type ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>
                  {type === 'ALL' ? 'Everything' : type === 'general' ? 'Marts' : type === 'produce' ? 'Veg' : 'Dairy'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <h2 className="font-black text-slate-900 text-xl tracking-tight px-1">Local Selections</h2>
              {processedStores.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200"><p className="text-slate-400 font-bold text-sm">No marts found in this category.</p></div>
              ) : (
                processedStores.map(store => (
                  <div key={store.id} onClick={() => { setSelectedStore(store); setActiveView('STORE'); }} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-white flex items-center gap-5 cursor-pointer hover:shadow-card-hover hover:border-emerald-100 transition-all active:scale-[0.98] group">
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-inner border border-white/50 shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3 ${store.type === 'produce' ? 'bg-emerald-50 text-emerald-600' : store.type === 'dairy' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                      {store.type === 'produce' ? '🥦' : store.type === 'dairy' ? '🥛' : '🏪'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-black text-slate-800 text-lg leading-tight truncate">{store.name}</h3>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${store.isOpen ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{store.isOpen ? 'OPEN' : 'CLOSED'}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-400">{store.distance} • ⭐ {store.rating?.toFixed(1) || '4.5'} • Fast Delivery</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeView === 'STORE' && selectedStore && (
          <div className="animate-slide-up bg-slate-50 min-h-full">
            <div className="bg-white p-8 pb-6 rounded-b-[3.5rem] shadow-sm mb-6 border-b border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
              <div className="flex justify-between items-start relative z-10">
                <div className="flex-1">
                  <button onClick={() => setActiveView('HOME')} className="mb-4 text-emerald-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">← Back to Radar</button>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{selectedStore.name}</h1>
                  <p className="text-sm font-bold text-slate-400 mt-2 max-w-[200px] leading-snug">{selectedStore.address}</p>
                </div>
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-4xl shadow-xl border-4 border-white ${selectedStore.type === 'produce' ? 'bg-emerald-500' : selectedStore.type === 'dairy' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                  {selectedStore.type === 'produce' ? '🥦' : selectedStore.type === 'dairy' ? '🥛' : '🏪'}
                </div>
              </div>
            </div>

            <div className="p-5 pt-0">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center opacity-40"><div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div><p className="text-[10px] font-black uppercase tracking-widest">Scanning Shelves...</p></div>
              ) : (
                <div className="grid grid-cols-2 gap-4 pb-32">
                  {storeProducts.map(product => (
                    <StickerProduct 
                      key={product.id}
                      product={product}
                      count={cart.filter(c => c.originalProductId === product.id).reduce((sum, c) => sum + c.quantity, 0)}
                      onAdd={(p) => addToCart(p, 1, 'Generic', p.price)}
                      onUpdateQuantity={(pid, delta) => {
                        const item = cart.find(c => c.originalProductId === pid);
                        if(item) updateQuantity(item.id, delta);
                      }}
                      onClick={(p) => setSelectedProduct(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'ORDERS' && <MyOrders userLocation={currentLocation} userId={user.id} />}
        {activeView === 'PROFILE' && <UserProfile user={{...user, location: currentLocation, address: currentAddress}} onUpdateUser={() => {}} onLogout={onLogout} />}
        {activeView === 'CART' && (
          <div className="absolute inset-0 z-[100] bg-white overflow-y-auto">
            <CartDetails 
              cart={cart}
              onProceedToPay={handlePlaceOrder}
              onUpdateQuantity={updateQuantity}
              onAddProduct={(p) => addToCart(p, 1, 'Generic', p.price)}
              mode="DELIVERY"
              onModeChange={() => {}}
              deliveryAddress={currentAddress}
              onAddressChange={setCurrentAddress}
              activeStore={selectedStore}
              stores={stores}
              userLocation={currentLocation}
              isPage={true}
              onClose={() => setActiveView('HOME')}
            />
          </div>
        )}
      </main>

      {/* GLASSY NAVIGATION BAR */}
      {activeView !== 'CART' && (
        <nav className="fixed bottom-0 left-0 right-0 nav-glass border-t border-white/20 px-10 py-5 flex justify-between z-[70] shadow-[0_-20px_50px_rgba(0,0,0,0.08)]">
          {[
            { id: 'HOME', icon: '🏪', label: 'Shop' },
            { id: 'ORDERS', icon: '🧾', label: 'Activity' },
            { id: 'PROFILE', icon: '👤', label: 'Account' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id as any)} className={`flex flex-col items-center gap-1.5 transition-all relative ${activeView === item.id ? 'text-slate-900 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
              <span className={`text-2xl transition-all duration-500 ${activeView === item.id ? 'filter drop-shadow-md' : 'opacity-60 grayscale'}`}>{item.icon}</span>
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-opacity ${activeView === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* MODALS */}
      {selectedProduct && <ProductDetailsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={(p, qty, brand, price) => addToCart(p, qty, brand, price)} />}
      {showPayment && pendingOrderDetails && (
        <PaymentGateway 
          amount={pendingOrderDetails.splits.storeAmount}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPayment(false)}
          isDemo={user.id?.includes('demo')}
          splits={pendingOrderDetails.splits}
        />
      )}
    </div>
  );
};
