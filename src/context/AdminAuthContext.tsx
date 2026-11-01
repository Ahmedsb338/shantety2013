import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

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

// Authorized administrator email whitelist
const AUTHORIZED_ADMINS: Record<string, { role: AdminRole; roleTitleAr: string; roleTitleEn: string; isOwner: boolean }> = {
  'as0246135@gmail.com': {
    role: 'super_admin',
    roleTitleAr: 'مالك المتجر والمشرف العام',
    roleTitleEn: 'Store Owner & Super Admin',
    isOwner: true,
  },
  'shantety2013@gmail.com': {
    role: 'super_admin',
    roleTitleAr: 'إدارة علامة شنطتي الرسمية',
    roleTitleEn: 'Official Shantety Administration',
    isOwner: true,
  },
  'admin@shantety.com': {
    role: 'super_admin',
    roleTitleAr: 'مدير النظام التنفيذي',
    roleTitleEn: 'System Executive Admin',
    isOwner: false,
  },
  'manager@shantety.com': {
    role: 'store_manager',
    roleTitleAr: 'مدير الفروع والمخزون (أبو المطامير)',
    roleTitleEn: 'Store & Inventory Manager (Abu El Matamir)',
    isOwner: false,
  },
  'staff@shantety.com': {
    role: 'order_staff',
    roleTitleAr: 'مسؤول العمليات والشحن',
    roleTitleEn: 'Operations & Fulfillment Staff',
    isOwner: false,
  },
};

const MASTER_PASSKEYS = ['01010070812', 'shantety2026', 'admin2026'];

interface AdminAuthContextType {
  currentUser: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, passkey: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithPasskey: (passkey: string, name?: string) => { success: boolean; error?: string };
  logout: () => Promise<void>;
  checkPermission: (action: 'manage_products' | 'manage_shipping' | 'view_ai' | 'run_tests' | 'manage_roles') => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('shantety_admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser && firebaseUser.email) {
        const emailLower = firebaseUser.email.toLowerCase();
        const adminProfile = AUTHORIZED_ADMINS[emailLower];

        if (adminProfile) {
          const userObj: AdminUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Shantety Admin',
            role: adminProfile.role,
            roleTitleAr: adminProfile.roleTitleAr,
            roleTitleEn: adminProfile.roleTitleEn,
            avatar: firebaseUser.photoURL || undefined,
            isOwner: adminProfile.isOwner,
          };
          setCurrentUser(userObj);
          sessionStorage.setItem('shantety_admin_session', JSON.stringify(userObj));
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, googleAuthProvider);
      const email = result.user.email?.toLowerCase();

      if (!email || !AUTHORIZED_ADMINS[email]) {
        await signOut(auth);
        setCurrentUser(null);
        sessionStorage.removeItem('shantety_admin_session');
        setIsLoading(false);
        return {
          success: false,
          error: `الحساب (${email || 'غير معروف'}) غير مسجل ضمن قائمة المسؤولين المصرح لهم بإدارة شنطتي.`,
        };
      }

      const adminProfile = AUTHORIZED_ADMINS[email];
      const userObj: AdminUser = {
        uid: result.user.uid,
        email: result.user.email || email,
        displayName: result.user.displayName || 'Shantety Admin',
        role: adminProfile.role,
        roleTitleAr: adminProfile.roleTitleAr,
        roleTitleEn: adminProfile.roleTitleEn,
        avatar: result.user.photoURL || undefined,
        isOwner: adminProfile.isOwner,
      };

      setCurrentUser(userObj);
      sessionStorage.setItem('shantety_admin_session', JSON.stringify(userObj));
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      console.error('Google Sign-In Error:', err);
      return {
        success: false,
        error: err.message || 'حدث خطأ أثناء تسجيل الدخول عبر Google',
      };
    }
  };

  const loginWithPasskey = (passkey: string, name = 'مالك المتجر (Shantety Owner)'): { success: boolean; error?: string } => {
    const cleanKey = passkey.trim();
    if (MASTER_PASSKEYS.includes(cleanKey)) {
      const userObj: AdminUser = {
        uid: 'admin-passkey-' + Date.now(),
        email: 'as0246135@gmail.com',
        displayName: name,
        role: 'super_admin',
        roleTitleAr: 'مالك المتجر والمشرف العام (مصادقة بالرمز)',
        roleTitleEn: 'Store Owner & Super Admin (Passkey Verified)',
        isOwner: true,
      };
      setCurrentUser(userObj);
      sessionStorage.setItem('shantety_admin_session', JSON.stringify(userObj));
      return { success: true };
    }

    return {
      success: false,
      error: 'رمز المرور غير صحيح. يرجى إدخال رمز الإدارة المعتمد (رقم هاتف المتجر الرسمي).',
    };
  };

  const login = async (email: string, passkey: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanKey = passkey.trim();

    if (MASTER_PASSKEYS.includes(cleanKey)) {
      const adminProfile = AUTHORIZED_ADMINS[cleanEmail] || {
        role: 'super_admin',
        roleTitleAr: 'مالك المتجر والمشرف العام',
        roleTitleEn: 'Store Owner & Super Admin',
        isOwner: true,
      };

      const userObj: AdminUser = {
        uid: 'admin-' + Date.now(),
        email: cleanEmail.includes('@') ? cleanEmail : 'admin@shantety.com',
        displayName: cleanEmail.includes('@') ? cleanEmail.split('@')[0] : 'مالك المتجر (Shantety Owner)',
        role: adminProfile.role,
        roleTitleAr: adminProfile.roleTitleAr,
        roleTitleEn: adminProfile.roleTitleEn,
        isOwner: adminProfile.isOwner,
      };

      setCurrentUser(userObj);
      sessionStorage.setItem('shantety_admin_session', JSON.stringify(userObj));
      return true;
    }

    return false;
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut warning:', e);
    }
    setCurrentUser(null);
    sessionStorage.removeItem('shantety_admin_session');
  };

  const checkPermission = (action: 'manage_products' | 'manage_shipping' | 'view_ai' | 'run_tests' | 'manage_roles'): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
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
        loginWithGoogle,
        loginWithPasskey,
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
