
import React, { useEffect, useRef, useState } from 'react';
import { Store, OrderMode } from '../types';
import { watchLocation, clearWatch, getRoute } from '../services/locationService';

interface MapVisualizerProps {
  stores: Store[];
  userLat: number | null;
  userLng: number | null;
  userAccuracy?: number | null;
  selectedStore: Store | null;
  onSelectStore: (store: Store) => void;
  className?: string;
  mode: OrderMode; 
  showRoute?: boolean;
  enableExternalNavigation?: boolean;
  onRequestLocation?: () => void;
  onMapClick?: (lat: number, lng: number) => void;
  isSelectionMode?: boolean; 
  enableLiveTracking?: boolean;
  driverLocation?: { lat: number; lng: number };
  forcedCenter?: { lat: number; lng: number } | null;
  routeSource?: { lat: number; lng: number };
  routeTarget?: { lat: number; lng: number };
}

export const MapVisualizer: React.FC<MapVisualizerProps> = ({ 
  stores, 
  userLat, 
  userLng, 
  userAccuracy,
  selectedStore, 
  onSelectStore, 
  className = "h-48",
  mode,
  isSelectionMode = false,
  enableLiveTracking = true,
  driverLocation,
  forcedCenter,
  routeSource,
  routeTarget,
  showRoute
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const targetMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null); 
  const routeLayerRef = useRef<any>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(!isSelectionMode);
  const [internalUserLoc, setInternalUserLoc] = useState<{lat: number, lng: number, acc: number} | null>(null);

  const finalUserLat = internalUserLoc?.lat ?? userLat;
  const finalUserLng = internalUserLoc?.lng ?? userLng;
  const finalAccuracy = internalUserLoc?.acc ?? userAccuracy ?? 50;

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || mapInstanceRef.current) return;

    const startLat = forcedCenter?.lat ?? selectedStore?.lat ?? finalUserLat ?? 12.9716;
    const startLng = forcedCenter?.lng ?? selectedStore?.lng ?? finalUserLng ?? 77.5946;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 17, 
      zoomControl: false, 
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    map.on('dragstart', () => setIsFollowingUser(false));

    mapInstanceRef.current = map;
    setIsMapReady(true);
    setTimeout(() => map.invalidateSize(), 200);

    return () => { if (mapInstanceRef.current) mapInstanceRef.current.remove(); };
  }, []); 

  useEffect(() => {
    if (!enableLiveTracking || isSelectionMode) return;
    const watchId = watchLocation((loc) => {
        if (loc.accuracy > 60 && internalUserLoc) return;
        setInternalUserLoc({ lat: loc.lat, lng: loc.lng, acc: loc.accuracy });
    }, () => {});
    return () => clearWatch(watchId);
  }, [enableLiveTracking, isSelectionMode, internalUserLoc]);

  // Routing Effect
  useEffect(() => {
    if (!isMapReady || !showRoute || !routeSource || !routeTarget) {
      if (routeLayerRef.current) routeLayerRef.current.clearLayers();
      return;
    }

    const updateRoute = async () => {
      const L = (window as any).L;
      const route = await getRoute(routeSource.lat, routeSource.lng, routeTarget.lat, routeTarget.lng);
      if (route && L && routeLayerRef.current) {
        routeLayerRef.current.clearLayers();
        L.polyline(route.coordinates, {
          color: '#10b981',
          weight: 6,
          opacity: 0.6,
          lineJoin: 'round'
        }).addTo(routeLayerRef.current);
      }
    };
    updateRoute();
  }, [routeSource, routeTarget, showRoute, isMapReady]);

  // Handle User Marker Update
  useEffect(() => {
    const L = (window as any).L;
    if (!isMapReady || !L || !mapInstanceRef.current || !finalUserLat) return;
    const latLng = [finalUserLat, finalUserLng] as [number, number];
    
    if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng(latLng).setRadius(finalAccuracy);
    } else {
        accuracyCircleRef.current = L.circle(latLng, { radius: finalAccuracy, color: 'transparent', fillColor: '#10b981', fillOpacity: 0.1 }).addTo(mapInstanceRef.current);
    }
    
    if (userMarkerRef.current) { 
        userMarkerRef.current.setLatLng(latLng); 
    } else {
        const icon = L.divIcon({
          className: 'bg-transparent border-none',
          html: `
            <div class="flex flex-col items-center" style="transform: translateY(-20px)">
              <div class="bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded-full mb-1 shadow-lg whitespace-nowrap uppercase tracking-tighter border border-white/20">You are here</div>
              <div class="relative w-8 h-8 flex items-center justify-center">
                <div class="absolute inset-0 bg-brand-DEFAULT/40 rounded-full animate-ping"></div>
                <div class="relative bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-xl border-2 border-brand-DEFAULT text-sm">🛵</div>
              </div>
            </div>
          `,
          iconSize: [80, 60], 
          iconAnchor: [40, 48]
        });
        userMarkerRef.current = L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);
    }

    if (!isSelectionMode && isFollowingUser && !driverLocation) {
        mapInstanceRef.current.panTo(latLng, { animate: true, duration: 1.0 });
    }
  }, [finalUserLat, finalUserLng, finalAccuracy, isMapReady, isSelectionMode, isFollowingUser, driverLocation]);

  // Target Point Marker (Store for Pickup, Home for Delivery)
  useEffect(() => {
    const L = (window as any).L;
    if (!isMapReady || !L || !mapInstanceRef.current || !routeTarget || !showRoute) {
      if (targetMarkerRef.current) {
        targetMarkerRef.current.remove();
        targetMarkerRef.current = null;
      }
      return;
    }

    const latLng = [routeTarget.lat, routeTarget.lng] as [number, number];
    const isPickup = mode === 'PICKUP';

    if (targetMarkerRef.current) {
      targetMarkerRef.current.setLatLng(latLng);
    } else {
      const icon = L.divIcon({
        className: 'bg-transparent border-none',
        html: `
          <div class="flex flex-col items-center" style="transform: translateY(-20px)">
            <div class="bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded-full mb-1 shadow-lg whitespace-nowrap uppercase tracking-tighter border border-white/20">${isPickup ? 'Store Location' : 'Your Home'}</div>
            <div class="relative w-8 h-8 flex items-center justify-center">
              <div class="relative bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-xl border-2 border-slate-900 text-sm">${isPickup ? '🏪' : '🏠'}</div>
            </div>
          </div>
        `,
        iconSize: [80, 60],
        iconAnchor: [40, 48]
      });
      targetMarkerRef.current = L.marker(latLng, { icon, zIndexOffset: 900 }).addTo(mapInstanceRef.current);
    }
  }, [routeTarget, showRoute, isMapReady, mode]);

  // Handle Driver Marker Update
  useEffect(() => {
    const L = (window as any).L;
    if (!isMapReady || !L || !mapInstanceRef.current || !driverLocation) {
        if (driverMarkerRef.current) {
            driverMarkerRef.current.remove();
            driverMarkerRef.current = null;
        }
        return;
    }

    const latLng = [driverLocation.lat, driverLocation.lng] as [number, number];
    
    if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng(latLng);
    } else {
        const icon = L.divIcon({
          className: 'bg-transparent border-none',
          html: `
            <div class="flex flex-col items-center" style="transform: translateY(-20px)">
              <div class="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full mb-1 shadow-lg whitespace-nowrap uppercase tracking-tighter border border-white/20">Partner</div>
              <div class="relative w-8 h-8 flex items-center justify-center">
                <div class="absolute inset-0 bg-blue-500/30 rounded-full animate-pulse"></div>
                <div class="relative bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-xl border-2 border-blue-500 text-sm">🚚</div>
              </div>
            </div>
          `,
          iconSize: [80, 60], 
          iconAnchor: [40, 48]
        });
        driverMarkerRef.current = L.marker(latLng, { icon, zIndexOffset: 1100 }).addTo(mapInstanceRef.current);
    }

    if (isFollowingUser) {
      mapInstanceRef.current.panTo(latLng, { animate: true });
    }
  }, [driverLocation, isMapReady, isFollowingUser]);

  useEffect(() => {
    const L = (window as any).L;
    if (!isMapReady || !L) return;
    markersLayerRef.current.clearLayers();
    if (isSelectionMode || showRoute) return;
    stores.forEach(store => {
       if (!store.lat) return;
       const isSelected = selectedStore?.id === store.id;
       let color = '#10b981'; let emoji = '🏪';
       if (store.type === 'produce') { color = '#10b981'; emoji = '🥦'; } 
       else if (store.type === 'dairy') { color = '#3b82f6'; emoji = '🥛'; }
       const size = isSelected ? 48 : 36; 
       const iconHtml = `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center;"><div style="transform: rotate(45deg); font-size: ${size/2}px;">${emoji}</div></div>`;
       const icon = L.divIcon({ className: 'bg-transparent', html: iconHtml, iconSize: [size, size], iconAnchor: [size/2, size] });
       L.marker([store.lat, store.lng], { icon }).on('click', () => onSelectStore(store)).addTo(markersLayerRef.current);
    });
  }, [stores, selectedStore, isMapReady, isSelectionMode, showRoute]);

  return (
    <div className={`w-full bg-slate-50 overflow-hidden relative border border-white isolate ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-100" />
      
      {/* Attribution Overlay */}
      <div className="absolute bottom-1 left-3 z-[400] pointer-events-auto">
        <a 
          href="https://www.openstreetmap.org/copyright" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[7px] font-bold text-slate-400/80 hover:text-slate-600 transition-colors uppercase tracking-[0.1em] drop-shadow-sm"
        >
          © OpenStreetMap
        </a>
      </div>

      {!isSelectionMode && (
          <button onClick={() => setIsFollowingUser(true)} className={`absolute bottom-4 right-4 z-[400] w-9 h-9 bg-white/95 rounded-xl shadow-md flex items-center justify-center border border-slate-100 ${isFollowingUser ? 'text-brand-DEFAULT' : 'text-slate-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2c-4.418 0-8 3.582-8 8 0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282.76.76 0 00.71 0l.07-.04.028-.016a19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827 0-4.418-3.582-8-8-8zm0 11.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" /></svg>
          </button>
      )}

      {showRoute && (
        <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border border-slate-100 shadow-sm flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-brand-DEFAULT animate-ping"></span>
           <span className="text-[9px] font-black uppercase text-slate-900 tracking-wider">Live Radar Link Active</span>
        </div>
      )}
    </div>
  );
};
