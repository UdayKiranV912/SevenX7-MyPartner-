
import React, { useEffect, useRef, useState } from 'react';
import { Store, OrderMode } from '../types';
import { watchLocation, clearWatch } from '../services/locationService';

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
  forcedCenter,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null); 

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
    map.on('dragstart', () => setIsFollowingUser(false));

    mapInstanceRef.current = map;
    setIsMapReady(true);
    setTimeout(() => map.invalidateSize(), 200);

    return () => { if (mapInstanceRef.current) mapInstanceRef.current.remove(); };
  }, []); 

  useEffect(() => {
    if (!enableLiveTracking || isSelectionMode) return;
    const watchId = watchLocation((loc) => {
        // ACCURACY GUARD: Filter out jittery/high-error coordinates (> 60 meters)
        if (loc.accuracy > 60 && internalUserLoc) return;
        setInternalUserLoc({ lat: loc.lat, lng: loc.lng, acc: loc.accuracy });
    }, () => {});
    return () => clearWatch(watchId);
  }, [enableLiveTracking, isSelectionMode, internalUserLoc]);

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
          html: '<div class="relative w-full h-full flex items-center justify-center"><div class="absolute inset-0 bg-brand-DEFAULT/30 rounded-full animate-ping"></div><div class="absolute inset-0 m-auto w-4 h-4 bg-brand-DEFAULT rounded-full border-[2px] border-white shadow-md z-10"></div></div>',
          iconSize: [24, 24], iconAnchor: [12, 12]
        });
        userMarkerRef.current = L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);
    }

    if (!isSelectionMode && isFollowingUser) {
        mapInstanceRef.current.panTo(latLng, { animate: true, duration: 1.0 });
    }
  }, [finalUserLat, finalUserLng, finalAccuracy, isMapReady, isSelectionMode, isFollowingUser]);

  useEffect(() => {
    const L = (window as any).L;
    if (!isMapReady || !L) return;
    markersLayerRef.current.clearLayers();
    if (isSelectionMode) return;
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
  }, [stores, selectedStore, isMapReady, isSelectionMode]);

  return (
    <div className={`w-full bg-slate-50 overflow-hidden relative border border-white isolate ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-100" />
      {!isSelectionMode && (
          <button onClick={() => setIsFollowingUser(true)} className={`absolute bottom-4 right-4 z-[400] w-9 h-9 bg-white/95 rounded-xl shadow-md flex items-center justify-center border border-slate-100 ${isFollowingUser ? 'text-brand-DEFAULT' : 'text-slate-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2c-4.418 0-8 3.582-8 8 0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282.76.76 0 00.71 0l.07-.04.028-.016a19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827 0-4.418-3.582-8-8-8zm0 11.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" /></svg>
          </button>
      )}
    </div>
  );
};
