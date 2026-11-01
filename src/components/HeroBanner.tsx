import React from 'react';
import { useStore } from '../context/StoreContext';
import { OFFICIAL_BRAND } from '../data/initialData';
import { ArrowLeft, ArrowRight, ShieldCheck, Truck, Sparkles, Award } from 'lucide-react';

export const HeroBanner: React.FC = () => {
  const { language, setCurrentView, setSelectedCategory, siteCustomization } = useStore();

  const handleShopNow = () => {
    setSelectedCategory(null);
    setCurrentView('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBags = () => {
    setSelectedCategory('cat-bags');
    setCurrentView('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF5F5] via-white to-[#FAF9F6] border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Text Column (cols-7) */}
          <div className="lg:col-span-7 space-y-6 text-start">
            {/* Editorial brand kicker */}
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E10600] tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#E10600]" />
              <span>
                {language === 'ar'
                  ? siteCustomization.heroBadgeAr || `${OFFICIAL_BRAND.name_ar} · 2026`
                  : siteCustomization.heroBadgeEn || `${OFFICIAL_BRAND.name_en} · Official 2026`}
              </span>
            </div>

            {/* Display Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black text-stone-900 leading-[1.15] tracking-tight">
              {language === 'ar' ? (
                <span>{siteCustomization.heroHeadlineAr}</span>
              ) : (
                <span>{siteCustomization.heroHeadlineEn}</span>
              )}
            </h1>

            {/* Subtext */}
            <p className="text-sm sm:text-base text-stone-600 max-w-xl leading-relaxed">
              {language === 'ar'
                ? siteCustomization.heroSubtitleAr
                : siteCustomization.heroSubtitleEn}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                onClick={handleShopNow}
                className="py-3.5 px-6 rounded-xl bg-[#E10600] hover:bg-[#C50500] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {language === 'ar'
                    ? siteCustomization.heroButtonTextAr || 'تصفحي المجموعة الكاملة'
                    : siteCustomization.heroButtonTextEn || 'Explore All Pieces'}
                </span>
                {language === 'ar' ? (
                  <ArrowLeft className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={handleBags}
                className="py-3.5 px-6 rounded-xl bg-white border border-stone-300 hover:border-stone-900 text-stone-900 text-xs sm:text-sm font-bold transition-all shadow-2xs hover:bg-stone-50 flex items-center justify-center cursor-pointer"
              >
                <span>{language === 'ar' ? 'حقائب اليد الفاخرة' : 'Handbag Collection'}</span>
              </button>
            </div>

            {/* Trust Markers Bar */}
            <div className="pt-6 border-t border-stone-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 text-xs font-semibold text-stone-700">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#E10600] shrink-0" />
                <span>
                  {language === 'ar'
                    ? 'شحن مجاني فوق 1,500 ج.م'
                    : 'Free Delivery > 1,500 EGP'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#E10600] shrink-0" />
                <span>
                  {language === 'ar' ? 'معاينة ودفع عند الاستلام' : 'Inspect on Delivery'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#E10600] shrink-0" />
                <span>
                  {language === 'ar' ? 'منتجات شنطتي المعتمدة' : '100% Genuine Shantety'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Visual Showcase (cols-5) */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-4/3 sm:aspect-square rounded-3xl bg-white p-4 shadow-xl border border-stone-200/90 overflow-hidden group">
              {/* Primary Featured Product Hero Image: Custom Hero Image / Container */}
              <img
                src={siteCustomization.heroImage || '/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__2__6b416ddc.png'}
                alt="Shantety Signature Handbag"
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 ease-out"
                referrerPolicy="no-referrer"
              />

              {/* Floating Quality Callout */}
              <div className="absolute bottom-5 inset-x-5 bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-stone-200/80 shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-stone-500 uppercase">
                    {language === 'ar' ? 'الأكثر طلباً هذا الأسبوع' : 'Featured Bestseller'}
                  </span>
                  <h4 className="text-xs font-black text-stone-900 line-clamp-1">
                    {language === 'ar'
                      ? 'حقيبة شنطتي مونوغرام بربطة الفيونكة'
                      : 'Shantety Monogram Canvas Bow Tote'}
                  </h4>
                </div>
                <span className="text-sm font-extrabold text-[#E10600] tabular-nums whitespace-nowrap">
                  990 {OFFICIAL_BRAND.currency_ar}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
