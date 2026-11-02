import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { FeaturedCategories } from './components/FeaturedCategories';
import { ProductCard } from './components/ProductCard';
import { ProductDetailPage } from './components/ProductDetailPage';
import { ShopPage } from './components/ShopPage';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutPage } from './components/CheckoutPage';
import { OrderConfirmationPage } from './components/OrderConfirmationPage';
import { OrderTrackingPage } from './components/OrderTrackingPage';
import { WishlistPage } from './components/WishlistPage';
import { StaticPages } from './components/StaticPages';
import { AuthPage } from './components/AuthPage';
import { AdminDashboard } from './components/AdminDashboard';
import { Footer } from './components/Footer';
import { CompareFloatingBar } from './components/CompareFloatingBar';
import { ProductComparisonModal } from './components/ProductComparisonModal';
import { ArrowLeft, ArrowRight, ShieldCheck, Truck, Sparkles, CheckCircle2, AlertCircle, Info, X, MessageCircle } from 'lucide-react';
import { getWhatsAppUrl, businessInfo } from './data/initialData';

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
    <div className="fixed bottom-5 right-5 rtl:right-auto rtl:left-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
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
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

const MainStoreContent: React.FC = () => {
  const { currentView, setCurrentView, selectedProduct, products, language } = useStore();

  // If Admin tab is selected, render Admin Commerce Manager
  if (currentView === 'admin') {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      <Header />

      <main className="flex-1">
        {currentView === 'home' && (
          <div>
            <HeroBanner />
            <FeaturedCategories />

            {/* Featured Best Sellers Section */}
            <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div>
                  <span className="text-xs font-bold text-[#E10600] uppercase tracking-wider">
                    {language === 'ar' ? 'الأكثر طلباً' : 'Bestsellers'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">
                    {language === 'ar'
                      ? 'مختارات شنطتي الأيقونية الأكثر تميزاً'
                      : 'Iconic Shantety Bestsellers'}
                  </h2>
                </div>

                <button
                  onClick={() => {
                    setCurrentView('shop');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-xs font-bold text-[#E10600] hover:text-[#C50500] flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <span>{language === 'ar' ? 'عرض الكتالوج بالكامل' : 'View Full Collection'}</span>
                  {language === 'ar' ? (
                    <ArrowLeft className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products
                  .filter((p) => p.is_best_seller || p.is_featured)
                  .slice(0, 3)
                  .map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
              </div>
            </section>

            {/* Craftsmanship Spotlight Strip */}
            <section className="py-12 bg-white border-y border-stone-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-6 space-y-4">
                    <span className="text-xs font-bold text-[#E10600] uppercase tracking-wider">
                      {language === 'ar' ? 'حرفية مصرية معتمدة' : 'Egyptian Craftsmanship'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-stone-900 leading-snug">
                      {language === 'ar'
                        ? 'تفاصيل تصنع الفارق: خامات كانفاس متينة وجلود محبوكة بعناية فائقة'
                        : 'Uncompromising Quality: Reinforced Monogram Jacquard & Handwoven Details'}
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                      {language === 'ar'
                        ? 'في شنطتي، لا نبتكر مجرد حقيبة أو حذاء، بل نعتني بكل غرزة، وقوة حزام، ونوعية السوستة والسلاسل المعدنية المعالجة ضد الصدأ لتدوم معكِ لسنوات.'
                        : 'Every Shantety piece undergoes rigorous quality control to ensure structural durability, pristine stitch alignment, and lasting comfort.'}
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setCurrentView('about');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="py-2.5 px-4 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-[#E10600] transition-colors"
                      >
                        {language === 'ar' ? 'تعرفي على قصة شنطتي' : 'Read Our Story'}
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl overflow-hidden bg-stone-100 p-3 border border-stone-200">
                      <img
                        src="/assets/aistudio/Generated_Image_October_30__2026_-_1_31AM__2__8c1fab3e.png"
                        alt="Ivory Tote Texture"
                        className="w-full h-44 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[11px] font-bold text-stone-900 block mt-2 text-center">
                        {language === 'ar' ? 'جلد محبب عالي الكثافة' : 'Textured Grain Finish'}
                      </span>
                    </div>

                    <div className="rounded-2xl overflow-hidden bg-stone-100 p-3 border border-stone-200">
                      <img
                        src="/assets/aistudio/Generated_Image_October_30__2026_-_1_31AM_9b62411e.png"
                        alt="Woven Loafers Sole"
                        className="w-full h-44 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[11px] font-bold text-stone-900 block mt-2 text-center">
                        {language === 'ar' ? 'نعل طبي ممتص للصدمات' : 'Ergonomic Cushion Sole'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {currentView === 'shop' && <ShopPage />}
        {currentView === 'product-detail' && selectedProduct && (
          <ProductDetailPage product={selectedProduct} />
        )}
        {currentView === 'checkout' && <CheckoutPage />}
        {currentView === 'order-confirmation' && <OrderConfirmationPage />}
        {currentView === 'order-tracking' && <OrderTrackingPage />}
        {currentView === 'account' && <AuthPage />}
        {currentView === 'wishlist' && <WishlistPage />}
        {currentView === 'about' && <StaticPages type="about" />}
        {currentView === 'contact' && <StaticPages type="contact" />}
        {currentView === 'shipping-policy' && <StaticPages type="shipping" />}
        {currentView === 'returns-policy' && <StaticPages type="returns" />}
        {currentView === 'faq' && <StaticPages type="faq" />}
      </main>

      <CartDrawer />
      <CompareFloatingBar />
      <ProductComparisonModal />
      <FloatingWhatsAppButton />
      <ToastContainer />
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AdminAuthProvider>
      <CustomerAuthProvider>
        <StoreProvider>
          <MainStoreContent />
        </StoreProvider>
      </CustomerAuthProvider>
    </AdminAuthProvider>
  );
}
