
import { supabase } from './supabaseClient';
import { Order } from '../types';

/**
 * Saves a single order to the database with relational items and splits.
 */
export const saveOrder = async (userId: string, order: Order) => {
  try {
    const isRealStore = order.storeLocation && order.items[0].storeId.length > 20;

    if (!isRealStore) {
        console.warn("Mock Store Order - Not saving to DB");
        return; 
    }

    // 1. Insert Parent Order
    const { data: orderData, error } = await supabase
      .from('orders')
      .insert({
        customer_id: userId,
        store_id: order.items[0].storeId, 
        status: 'placed',
        items: order.items, // Snapshot
        total_amount: order.total,
        delivery_address: order.deliveryAddress,
        delivery_lat: order.userLocation?.lat,
        delivery_lng: order.userLocation?.lng
      })
      .select()
      .single();

    if (error) throw error;
    if (!orderData) throw new Error("Order creation failed");

    // 2. Insert Order Items
    const orderItemsPayload = order.items.map(item => ({
        order_id: orderData.id,
        product_id: item.originalProductId, 
        store_id: item.storeId,             
        unit_price: item.price,
        quantity: item.quantity
    }));

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload);

    if (itemsError) console.error("Error saving order items:", itemsError);

    // 3. Insert Payment Splits
    if (order.splits) {
        const { error: splitError } = await supabase
            .from('payment_splits')
            .insert({
                order_id: orderData.id,
                store_amount: order.splits.storeAmount,
                store_upi: order.splits.storeUpi,
                handling_fee: 0,
                admin_upi: order.splits.adminUpi,
                delivery_fee: order.splits.deliveryFee,
                driver_upi: order.splits.driverUpi,
                total_paid_by_customer: order.splits.storeAmount, 
                is_settled: true 
            });
        
        if (splitError) console.error("Error saving splits:", splitError);
    }

  } catch (err) {
    console.error('Supabase save failed:', err);
    throw err;
  }
};

export const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((row: any) => ({
        id: row.id,
        date: row.created_at,
        items: row.items, 
        total: row.total_amount,
        status: mapDbStatusToAppStatus(row.status),
        paymentStatus: 'PAID',
        mode: 'DELIVERY',
        deliveryType: 'INSTANT',
        storeName: 'Grocesphere Store', 
        storeLocation: { lat: 0, lng: 0 }, 
        userLocation: { lat: row.delivery_lat, lng: row.delivery_lng },
        // Include partner ID for tracking
        delivery_partner_id: row.delivery_partner_id 
    })) as any[];
  } catch (err) {
    console.error('Supabase fetch failed:', err);
    return [];
  }
};

/**
 * Subscribe to driver location updates
 */
export const subscribeToDriverLocation = (driverId: string, onUpdate: (loc: {lat: number, lng: number}) => void) => {
    return supabase
        .channel(`driver-loc-${driverId}`)
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles', 
            filter: `id=eq.${driverId}` 
        }, (payload) => {
            if (payload.new.last_lat && payload.new.last_lng) {
                onUpdate({ lat: payload.new.last_lat, lng: payload.new.last_lng });
            }
        })
        .subscribe();
};

export const subscribeToUserOrders = (userId: string, onUpdate: (payload: any) => void) => {
    return supabase
        .channel(`user-orders-${userId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${userId}` }, (payload) => onUpdate(payload.new))
        .subscribe();
};

const mapDbStatusToAppStatus = (dbStatus: string): Order['status'] => {
    switch (dbStatus) {
        case 'placed': return 'Pending';
        case 'accepted': return 'Accepted';
        case 'packing': return 'Preparing';
        case 'ready': return 'Ready';
        case 'on_way': return 'On the way';
        case 'delivered': return 'Delivered';
        case 'picked_up': return 'Picked Up';
        case 'cancelled': return 'Cancelled';
        default: return 'Pending';
    }
};
