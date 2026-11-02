import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type AdminRole = 'super_admin' | 'store_manager' | 'order_staff';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  roleTitleAr: string;
  roleTitleEn: string;
  avatar?: string;
  isOwner: boolean;
}

interface AdminAuthContextType {
  currentUser: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkPermission: (action: 'manage_products' | 'manage_shipping' | 'view_ai' | 'run_tests' | 'manage_roles') => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

function getRoleTitles(role: AdminRole, isOwner: boolean) {
  if (isOwner) {
    return {
      ar: 'مالك المتجر والمشرف العام (Shantety Owner)',
      en: 'Store Owner & Super Admin',
    };
  }
  switch (role) {
    case 'super_admin':
      return {
        ar: 'مدير النظام التنفيذي',
        en: 'System Executive Admin',
      };
    case 'store_manager':
      return {
        ar: 'مدير الفروع والمخزون (أبو المطامير)',
        en: 'Store & Inventory Manager',
      };
    case 'order_staff':
      return {
        ar: 'مسؤول العمليات والشحن',
        en: 'Operations & Fulfillment Staff',
      };
  }
}

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('shantety_admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();

      // Call server authoritative login endpoint
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: pass }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setIsLoading(false);
        return {
          success: false,
          error: data.error || 'فشل التحقق من بيانات الدخول أو أن الحساب غير مصرح له بالإدارة',
        };
      }

      // If Supabase is configured, authenticate session with Supabase Auth as well
      if (isSupabaseConfigured) {
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        }).catch(() => {
          // Fallback to server-verified session
        });
      }

      const titles = getRoleTitles(data.user.role, data.user.isOwner);

      const userObj: AdminUser = {
        uid: data.user.id || 'admin-' + Date.now(),
        email: cleanEmail,
        displayName: data.user.displayName || cleanEmail.split('@')[0],
        role: data.user.role,
        roleTitleAr: titles.ar,
        roleTitleEn: titles.en,
        isOwner: data.user.isOwner,
      };

      setCurrentUser(userObj);
      sessionStorage.setItem('shantety_admin_session', JSON.stringify(userObj));
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        error: err.message || 'خطأ في الاتصال بالخادم',
      };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
    setCurrentUser(null);
    sessionStorage.removeItem('shantety_admin_session');
  };

  const checkPermission = (
    action: 'manage_products' | 'manage_shipping' | 'view_ai' | 'run_tests' | 'manage_roles'
  ): boolean => {
    if (!currentUser) return false;
    if (currentUser.isOwner || currentUser.role === 'super_admin') return true;
    if (currentUser.role === 'store_manager') {
      return action !== 'manage_roles';
    }
    if (currentUser.role === 'order_staff') {
      return action === 'manage_shipping';
    }
    return false;
  };

  return (
    <AdminAuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        logout,
        checkPermission,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
