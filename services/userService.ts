
import { supabase } from './supabaseClient';
import { UserState, SavedCard } from '../types';

export const fetchAuthData = async (jsonUrl: string): Promise<any> => {
  try {
    const response = await fetch(jsonUrl);
    if (!response.ok) throw new Error('Failed to fetch auth data');
    return await response.json();
  } catch (error) {
    console.error("Auth Data Fetch Error:", error);
    return null;
  }
};

// Mock saved cards for demo purposes
const MOCK_CARDS: SavedCard[] = [
    { id: 'c1', type: 'VISA', last4: '4242', label: 'Personal Card' },
    { id: 'u1', type: 'UPI', upiId: 'user@okaxis', label: 'Primary UPI' }
];

// Handle widget-based passwordless entry (Phone/Email)
export const syncUserWithSupabase = async (
  identifier: string, 
  type: 'PHONE' | 'EMAIL'
): Promise<UserState> => {
  try {
    const column = type === 'PHONE' ? 'phone_number' : 'email';
    
    // 1. Check if user exists in the 'profiles' table
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq(column, identifier)
      .single();

    if (existingUser) {
        return {
            isAuthenticated: true,
            id: existingUser.id,
            phone: existingUser.phone_number || '',
            email: existingUser.email || '',
            name: existingUser.full_name || '',
            address: existingUser.address || '',
            role: existingUser.role || 'delivery_partner',
            vehicleType: existingUser.vehicle_type,
            vehicleModel: existingUser.vehicle_model,
            licenseNumber: existingUser.license_number,
            upiId: existingUser.upi_id,
            savedCards: MOCK_CARDS,
            location: null
        };
    }

    return {
      isAuthenticated: true,
      id: 'temp-' + Date.now(),
      phone: type === 'PHONE' ? identifier : '',
      email: type === 'EMAIL' ? identifier : '',
      name: '',
      address: '',
      role: 'delivery_partner',
      savedCards: [],
      location: null
    };

  } catch (error) {
    console.error("Supabase Sync Error:", error);
    return {
      isAuthenticated: true,
      id: 'temp-' + Date.now(),
      phone: type === 'PHONE' ? identifier : '',
      email: type === 'EMAIL' ? identifier : '',
      name: '',
      address: '',
      role: 'delivery_partner',
      savedCards: [],
      location: null
    };
  }
};

// Standard Email/Password Registration
export const registerUser = async (email: string, password: string, fullName: string, phone: string, upiId: string): Promise<UserState> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                phone: phone,
                role: 'delivery_partner',
                upi_id: upiId
            }
        }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Registration failed. Please try again.");

    const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: authData.user.id,
            email: email,
            full_name: fullName,
            phone_number: phone,
            upi_id: upiId,
            address: '',
            role: 'delivery_partner' 
        });

    if (profileError) {
        console.error("Profile Creation Failed:", profileError);
        // If profile creation fails due to trigger (invalid UPI), we might want to alert the user
        if (profileError.message.includes('valid UPI ID')) {
            throw new Error("Invalid UPI ID format. Please check and try again.");
        }
    }

    return {
        isAuthenticated: true,
        id: authData.user.id,
        phone: phone,
        email: email,
        name: fullName,
        upiId: upiId,
        address: '',
        role: 'delivery_partner',
        savedCards: [],
        location: null
    };
};

// Standard Email/Password Login
export const loginUser = async (email: string, password: string): Promise<UserState> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Login failed");

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (!profileData || profileError) {
        const metadata = authData.user.user_metadata;
        const newProfile = {
            id: authData.user.id,
            email: authData.user.email,
            full_name: metadata?.full_name || 'User',
            phone_number: metadata?.phone || '',
            upi_id: metadata?.upi_id || '',
            address: '',
            role: 'delivery_partner'
        };

        const { data: healedProfile } = await supabase
            .from('profiles')
            .upsert(newProfile)
            .select()
            .single();

        if (healedProfile) {
            return {
                isAuthenticated: true,
                id: healedProfile.id,
                phone: healedProfile.phone_number || '',
                email: healedProfile.email || '',
                name: healedProfile.full_name || '',
                address: healedProfile.address || '',
                role: healedProfile.role || 'delivery_partner',
                vehicleType: healedProfile.vehicle_type,
                vehicleModel: healedProfile.vehicle_model,
                licenseNumber: healedProfile.license_number,
                upiId: healedProfile.upi_id,
                savedCards: MOCK_CARDS,
                location: null
            };
        }
    }

    return {
        isAuthenticated: true,
        id: profileData?.id || authData.user.id,
        phone: profileData?.phone_number || authData.user.user_metadata?.phone || '',
        email: profileData?.email || authData.user.email || '',
        name: profileData?.full_name || authData.user.user_metadata?.full_name || '',
        address: profileData?.address || '',
        role: profileData?.role || 'delivery_partner',
        vehicleType: profileData?.vehicle_type,
        vehicleModel: profileData?.vehicle_model,
        licenseNumber: profileData?.license_number,
        upiId: profileData?.upi_id,
        savedCards: MOCK_CARDS,
        location: null
    };
};

export const updateUserProfile = async (id: string, updates: { 
    full_name?: string; 
    address?: string; 
    email?: string; 
    phone_number?: string; 
    role?: string;
    vehicle_type?: string;
    vehicle_model?: string;
    license_number?: string;
    upi_id?: string;
}) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};
