
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

const MOCK_CARDS: SavedCard[] = [
    { id: 'c1', type: 'VISA', last4: '4242', label: 'Personal Card' },
    { id: 'u1', type: 'UPI', upiId: 'user@okaxis', label: 'Primary UPI' }
];

export const syncUserWithSupabase = async (
  identifier: string, 
  type: 'PHONE' | 'EMAIL'
): Promise<UserState> => {
  try {
    const column = type === 'PHONE' ? 'phone_number' : 'email';
    const { data: existingUser } = await supabase
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
            verificationStatus: existingUser.verification_status || 'pending',
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
      verificationStatus: 'pending',
      savedCards: [],
      location: null
    };

  } catch (error) {
    return {
      isAuthenticated: true,
      id: 'temp-' + Date.now(),
      phone: type === 'PHONE' ? identifier : '',
      email: type === 'EMAIL' ? identifier : '',
      name: '',
      address: '',
      role: 'delivery_partner',
      verificationStatus: 'pending',
      savedCards: [],
      location: null
    };
  }
};

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
    if (!authData.user) throw new Error("Registration failed.");

    const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: authData.user.id,
            email: email,
            full_name: fullName,
            phone_number: phone,
            upi_id: upiId,
            address: '',
            role: 'delivery_partner',
            verification_status: 'pending' // Initial state
        });

    if (profileError && profileError.message.includes('valid UPI ID')) {
        throw new Error("Invalid UPI ID format.");
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
        verificationStatus: 'pending',
        savedCards: [],
        location: null
    };
};

export const loginUser = async (email: string, password: string): Promise<UserState> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Login failed");

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    const status = profileData?.verification_status || 'pending';

    // GATEKEEPER: Only verified users can log in fully
    if (status === 'pending' || status === 'rejected') {
        throw new Error(`ACCOUNT_PENDING:${status}`);
    }

    return {
        isAuthenticated: true,
        id: profileData?.id || authData.user.id,
        phone: profileData?.phone_number || '',
        email: profileData?.email || '',
        name: profileData?.full_name || '',
        address: profileData?.address || '',
        role: profileData?.role || 'delivery_partner',
        verificationStatus: status as any,
        vehicleType: profileData?.vehicle_type,
        vehicleModel: profileData?.vehicle_model,
        licenseNumber: profileData?.license_number,
        upiId: profileData?.upi_id,
        savedCards: MOCK_CARDS,
        location: null
    };
};

export const submitVerificationCode = async (userId: string, code: string) => {
    // This simulates submitting a code to the admin. 
    // In a real app, this might match a column in the DB.
    const { error } = await supabase
        .from('profiles')
        .update({ admin_verification_code: code })
        .eq('id', userId);
    if (error) throw error;
};

export const updateUserProfile = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};
