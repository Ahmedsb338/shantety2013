import React, { lazy, Suspense, useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { AppShell } from './components/layout/AppShell';
import { MainContainer } from './components/layout/MainContainer';
import { SeoHead } from './components/SeoHead';
import { HeroBanner } from './components/HeroBanner';
import { FeaturedCategories } from './components/FeaturedCategories';
import { ProductCard } from './components/ProductCard';
import { verifySupabaseConnection } from './lib/supabaseDiagnostics';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

// Route-level code splitting & lazy loading
const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const ShopPage = lazy(() =>
  import('./components/ShopPage').then((m) => ({ default: m.ShopPage }))
);
const ProductDetailPage = lazy(() =>
  import('./components/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const CheckoutPage = lazy(() =>
  import('./components/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
);
const OrderConfirmationPage = lazy(() =>
  import('./components/OrderConfirmationPage').then((m) => ({ default: m.OrderConfirmationPage }))
);
const OrderTrackingPage = lazy(() =>
  import('./components/OrderTrackingPage').then((m) => ({ default: m.OrderTrackingPage }))
);
const WishlistPage = lazy(() =>
  import('./components/WishlistPage').then((m) => ({ default: m.WishlistPage }))
);
const StaticPages = lazy(() =>
  import('./components/StaticPages').then((m) => ({ default: m.StaticPages }))
);
const AuthPage = lazy(() =>
  import('./components/AuthPage').then((m) => ({ default: m.AuthPage }))
);

const ViewLoaderFallback: React.FC = () => (
  <div className="w-full min-h-[40vh] flex flex-col items-center justify-center py-16 px-4">
    <div className="w-10 h-10 rounded-full border-3 border-stone-200 border-t-[#E10600] animate-spin" />
    <span className="text-xs font-semibold text-stone-500 mt-4">
      جاري تحميل المحتوى...
    </span>
  </div>
);

const MainStoreContent: React.FC = () => {
  const { currentView, setCurrentView, selectedProduct, products, language } = useStore();

  useEffect(() => {
    // Run safe browser Supabase diagnostics and log connection status
    verifySupabaseConnection().catch((err) => {
      console.warn('Initial Supabase verification check:', err);
    });
  }, []);

  // If Admin view is selected, render isolated Admin Dashboard with its own shell
  if (currentView === 'admin') {
    return (
      <Suspense fallback={<ViewLoaderFallback />}>
        <SeoHead />
        <AdminDashboard />
      </Suspense>
    );
  }

  return (
    <AppShell>
      <SeoHead />
      <Suspense fallback={<ViewLoaderFallback />}>
        {currentView === 'home' && (
          <div className="w-full">
            <HeroBanner />
            <FeaturedCategories />

            {/* Featured Best Sellers Section */}
            <section className="py-14">
              <MainContainer>
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
              </MainContainer>
            </section>

            {/* Craftsmanship Spotlight Strip */}
            <section className="py-12 bg-white border-y border-stone-200">
              <MainContainer>
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
                        className="py-2.5 px-4 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-[#E10600] transition-colors cursor-pointer"
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
              </MainContainer>
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
      </Suspense>
    </AppShell>
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
