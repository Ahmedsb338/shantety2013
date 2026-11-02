import React, { useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { CartDrawer } from '../CartDrawer';
import { CompareFloatingBar } from '../CompareFloatingBar';
import { ProductComparisonModal } from '../ProductComparisonModal';
import { MessageCircle, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { getWhatsAppUrl, businessInfo } from '../../data/initialData';

interface AppShellProps {
  children: React.ReactNode;
}

const FloatingWhatsAppButton: React.FC = () => {
  const { language } = useStore();
  return (
    <aside aria-label="WhatsApp Support">
      <a
        href={getWhatsAppUrl(language)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={language === 'ar' ? 'تواصل معنا عبر واتساب' : 'Chat with Shantety on WhatsApp'}
        className="fixed bottom-6 start-6 z-40 flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white p-3 sm:px-4 sm:py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 group focus:outline-hidden focus:ring-4 focus:ring-emerald-300"
      >
        <MessageCircle className="w-5 h-5 fill-current shrink-0" />
        <div className="flex flex-col text-start hidden sm:flex leading-tight">
          <span className="text-[11px] font-bold">
            {language === 'ar' ? 'خدمة عملاء شنطتي' : 'Shantety Support'}
          </span>
          <span className="text-[9px] text-emerald-100 font-medium">
            {businessInfo.phoneDisplay}
          </span>
        </div>
      </a>
    </aside>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 end-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none w-auto">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl text-xs font-semibold shadow-lg transition-all border ${
            toast.type === 'error'
              ? 'bg-rose-900 text-white border-rose-800'
              : toast.type === 'info'
              ? 'bg-stone-900 text-white border-stone-800'
              : 'bg-stone-900 text-white border-stone-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#E10600] shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 hover:opacity-75 transition-opacity"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { language } = useStore();

  useEffect(() => {
    // Synchronize HTML attributes with store language
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900 w-full overflow-x-hidden box-border antialiased selection:bg-[#E10600]/15 selection:text-[#E10600]">
      <Header />
      <main className="flex-1 w-full box-border">
        {children}
      </main>
      <Footer />
      <CartDrawer />
      <CompareFloatingBar />
      <ProductComparisonModal />
      <FloatingWhatsAppButton />
      <ToastContainer />
    </div>
  );
};
