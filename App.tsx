
import React, { useState } from 'react';
import { UserState } from './types';
import { Auth } from './components/OTPVerification';
import { StoreApp } from './components/store/StoreApp';
import { CustomerApp } from './components/customer/CustomerApp';
import { DeliveryApp } from './components/delivery/DeliveryApp';

const App: React.FC = () => {
  // Authentication State
  const [user, setUser] = useState<UserState>({
      isAuthenticated: false,
      id: '',
      phone: '',
      location: null, 
      address: '',    
      role: 'customer'
  });

  const handleLoginSuccess = (userData: UserState) => {
    setUser(userData);
  };

  const handleStoreDemoLogin = () => {
    setUser({
      isAuthenticated: true,
      id: 'demo-user',
      name: 'Nandini Store Owner',
      phone: '9999999999',
      location: null,
      address: '',
      role: 'store_owner'
    });
  };

  const handleCustomerDemoLogin = () => {
    setUser({
      isAuthenticated: true,
      id: 'demo-customer',
      name: 'Rahul Customer',
      phone: '9876543210',
      location: null,
      address: '',
      role: 'customer'
    });
  };

  const handlePartnerDemoLogin = () => {
    setUser({
      isAuthenticated: true,
      id: 'demo-partner',
      name: 'Kumar Rider',
      phone: '9888877777',
      location: null,
      address: '',
      role: 'delivery_partner'
    });
  };

  const handleLogout = () => {
    setUser({ isAuthenticated: false, phone: '', location: null });
  };

  if (!user.isAuthenticated) {
    return (
        <Auth 
            onLoginSuccess={handleLoginSuccess} 
            onDemoLogin={handleStoreDemoLogin} 
            onCustomerDemoLogin={handleCustomerDemoLogin}
            onPartnerDemoLogin={handlePartnerDemoLogin}
        />
    );
  }

  // Routing based on Role
  if (user.role === 'store_owner') {
      return <StoreApp user={user} onLogout={handleLogout} />;
  }

  if (user.role === 'delivery_partner') {
      return <DeliveryApp user={user} onLogout={handleLogout} />;
  }

  // Default to Customer App
  return <CustomerApp user={user} onLogout={handleLogout} />;
};

export default App;
