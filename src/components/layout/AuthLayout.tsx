import React from 'react';
import { OFFICIAL_BRAND } from '../../data/initialData';
import { useStore } from '../../context/StoreContext';

interface AuthLayoutProps {
  children: React.ReactNode;
  subtitleAr?: string;
  subtitleEn?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  subtitleAr = 'حساب العميل الموحد ومتابعة الطلبات المباشرة',
  subtitleEn = 'Customer Account & Real-Time Tracking',
}) => {
  const { language } = useStore();

  return (
    <div className="w-full min-h-[calc(100vh-16rem)] flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 box-border">
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden box-border">
        {/* Brand Header */}
        <div className="bg-[#18181B] text-white p-6 text-center space-y-2 border-b border-stone-800">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-white p-0.5 border border-stone-700 mx-auto">
            <img
              src={OFFICIAL_BRAND.logo_white}
              alt="Shantety"
              className="w-full h-full object-contain rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">
              {language === 'ar' ? 'متجر شنطتي (Shantety)' : 'Shantety Portal'}
            </h1>
            <p className="text-[11px] text-stone-400">
              {language === 'ar' ? subtitleAr : subtitleEn}
            </p>
          </div>
        </div>

        {/* Form Body Container */}
        <div className="p-5 sm:p-6 space-y-5 box-border">
          {children}
        </div>
      </div>
    </div>
  );
};
