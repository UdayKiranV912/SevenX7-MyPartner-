
import { supabase } from './supabaseClient';
import { Order } from '../types';

/**
 * Fetch orders that are 'ready' or 'packing' but don't have a delivery partner assigned yet.
 */
export const getAvailableOrders = async (): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, stores(name, address, lat, lng, type)')
      .in('status', ['accepted', 'packing', 'ready'])
      .is('delivery_partner_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
        id: row.id,
        date: row.created_at,
        items: row.items,
        total: row.total_amount,
        status: row.status,
        mode: row.type || 'DELIVERY',
        deliveryType: 'INSTANT',
        storeName: row.stores?.name || 'Local Mart',
        storeLocation: { lat: row.stores?.lat, lng: row.stores?.lng },
        userLocation: { lat: row.delivery_lat, lng: row.delivery_lng },
        deliveryAddress: row.delivery_address,
        customerName: 'Customer',
        splits: {
            deliveryFee: 30,
            storeAmount: row.total_amount
        }
    })) as any;
  } catch (e) {
    console.error("getAvailableOrders error", e);
    return [];
  }
};

/**
 * Assign a delivery partner to an order.
 */
export const acceptOrder = async (orderId: string, partnerId: string) => {
    const { error } = await supabase
        .from('orders')
        .update({ 
            delivery_partner_id: partnerId,
            status: 'accepted'
        })
        .eq('id', orderId);
    
    if (error) throw error;
};

/**
 * Update order status specifically for delivery flow.
 */
export const updateDeliveryStatus = async (orderId: string, status: 'picked_up' | 'delivered' | 'on_way') => {
    const { error } = await supabase
        .from('orders')
        .update({ status: status })
        .eq('id', orderId);
    
    if (error) throw error;
};

/**
 * Broadcast current GPS location for customer tracking.
 */
export const broadcastLocation = async (partnerId: string, lat: number, lng: number) => {
    await supabase
        .from('profiles')
        .update({ 
            current_lat: lat, 
            current_lng: lng
        })
        .eq('id', partnerId);
};
