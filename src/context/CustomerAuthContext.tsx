import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CustomerAddress } from '../types/ecommerce';

export interface CustomerProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  governorate?: string;
  createdAt?: string;
}

interface CustomerAuthContextType {
  customer: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  savedAddresses: CustomerAddress[];
  defaultAddress: CustomerAddress | null;
  register: (params: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    governorate: string;
  }) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updatePhone: (phone: string) => Promise<boolean>;
  addAddress: (addr: Omit<CustomerAddress, 'id'>) => Promise<boolean>;
  deleteAddress: (id: string) => Promise<boolean>;
  setDefaultAddress: (id: string) => Promise<boolean>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(() => {
    try {
      const saved = localStorage.getItem('shantety_customer_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>(() => {
    try {
      const saved = localStorage.getItem('shantety_saved_addresses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and listen to Supabase auth state if configured
  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const profile: CustomerProfile = {
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Customer',
            phone: session.user.user_metadata?.phone || '',
            governorate: session.user.user_metadata?.governorate || 'القاهرة',
            createdAt: session.user.created_at,
          };
          setCustomer(profile);
          localStorage.setItem('shantety_customer_session', JSON.stringify(profile));
        }
        setIsLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const profile: CustomerProfile = {
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Customer',
            phone: session.user.user_metadata?.phone || '',
            governorate: session.user.user_metadata?.governorate || 'القاهرة',
            createdAt: session.user.created_at,
          };
          setCustomer(profile);
          localStorage.setItem('shantety_customer_session', JSON.stringify(profile));
        } else {
          setCustomer(null);
          localStorage.removeItem('shantety_customer_session');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('shantety_saved_addresses', JSON.stringify(savedAddresses));
    } catch {}
  }, [savedAddresses]);

  const register = async (params: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    governorate: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email: params.email.trim(),
          password: params.password,
          options: {
            data: {
              full_name: params.fullName.trim(),
              phone: params.phone.trim(),
              governorate: params.governorate,
            },
          },
        });

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }

        const profile: CustomerProfile = {
          id: data.user?.id || 'cust-' + Date.now(),
          email: params.email.trim(),
          fullName: params.fullName.trim(),
          phone: params.phone.trim(),
          governorate: params.governorate,
        };
        setCustomer(profile);
        localStorage.setItem('shantety_customer_session', JSON.stringify(profile));
        setIsLoading(false);
        return { success: true };
      }

      // Standalone mode registration
      const profile: CustomerProfile = {
        id: 'cust-' + Date.now(),
        email: params.email.trim(),
        fullName: params.fullName.trim(),
        phone: params.phone.trim(),
        governorate: params.governorate,
        createdAt: new Date().toISOString(),
      };
      setCustomer(profile);
      localStorage.setItem('shantety_customer_session', JSON.stringify(profile));
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }

        const profile: CustomerProfile = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          fullName: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
          phone: data.user.user_metadata?.phone || '',
          governorate: data.user.user_metadata?.governorate || 'القاهرة',
        };
        setCustomer(profile);
        localStorage.setItem('shantety_customer_session', JSON.stringify(profile));
        setIsLoading(false);
        return { success: true };
      }

      // Standalone auth
      const profile: CustomerProfile = {
        id: 'cust-' + Date.now(),
        email: cleanEmail,
        fullName: cleanEmail.split('@')[0],
        phone: '01012345678',
        governorate: 'القاهرة',
      };
      setCustomer(profile);
      localStorage.setItem('shantety_customer_session', JSON.stringify(profile));
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
    setCustomer(null);
    localStorage.removeItem('shantety_customer_session');
  };

  const updatePhone = async (phone: string): Promise<boolean> => {
    if (!customer) return false;
    const updated = { ...customer, phone };
    setCustomer(updated);
    localStorage.setItem('shantety_customer_session', JSON.stringify(updated));

    if (isSupabaseConfigured) {
      await supabase.auth.updateUser({
        data: { phone },
      }).catch(() => {});
    }
    return true;
  };

  const addAddress = async (addr: Omit<CustomerAddress, 'id'>): Promise<boolean> => {
    const newAddr: CustomerAddress = {
      ...addr,
      id: 'addr-' + Date.now(),
      is_default: savedAddresses.length === 0 ? true : addr.is_default,
    };

    setSavedAddresses((prev) => {
      if (newAddr.is_default) {
        return [...prev.map((a) => ({ ...a, is_default: false })), newAddr];
      }
      return [...prev, newAddr];
    });
    return true;
  };

  const deleteAddress = async (id: string): Promise<boolean> => {
    setSavedAddresses((prev) => prev.filter((a) => a.id !== id));
    return true;
  };

  const setDefaultAddress = async (id: string): Promise<boolean> => {
    setSavedAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        is_default: a.id === id,
      }))
    );
    return true;
  };

  const defaultAddress = savedAddresses.find((a) => a.is_default) || savedAddresses[0] || null;

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        isAuthenticated: !!customer,
        isLoading,
        savedAddresses,
        defaultAddress,
        register,
        login,
        logout,
        updatePhone,
        addAddress,
        deleteAddress,
        setDefaultAddress,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
