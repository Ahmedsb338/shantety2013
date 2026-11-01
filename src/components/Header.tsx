import React, { useState } from 'react';
import { useStore, StoreView } from '../context/StoreContext';
import { OFFICIAL_BRAND, businessInfo, getWhatsAppUrl } from '../data/initialData';
import {
  ShoppingBag,
  Heart,
  Search,
  Globe,
  SlidersHorizontal,
  Menu,
  X,
  PackageCheck,
  ShieldCheck,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Lock,
  ArrowLeftRight,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export const Header: React.FC = () => {
  const {
    language,
    toggleLanguage,
    currentView,
    setCurrentView,
    cartCount,
    setIsCartDrawerOpen,
    wishlist,
    searchQuery,
    setSearchQuery,
    setSelectedCategory,
    compareList,
    setIsCompareOpen,
  } = useStore();
  const { currentUser, isAuthenticated } = useAdminAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const navigateTo = (view: StoreView, categoryId: string | null = null) => {
    setCurrentView(view);
    if (categoryId !== null) {
      setSelectedCategory(categoryId);
    }
    setMobileMenuOpen(false);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const whatsAppUrl = getWhatsAppUrl(language);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs">
      {/* Top Announcement & Direct Contact Bar */}
      <div className="bg-[#18181B] text-stone-200 text-[11px] sm:text-xs py-1.5 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Announcement text */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E10600] shrink-0" />
            <span className="font-medium truncate">
              {language === 'ar'
                ? 'شحن لجميع محافظات مصر · شحن مجاني للطلبات فوق 1,500 ج.م'
                : 'Nationwide Egypt Delivery · Free Shipping > 1,500 EGP'}
            </span>
          </div>

          {/* Quick Contact & Tracking Actions (Hidden on very small screens, visible from sm) */}
          <div className="hidden sm:flex items-center gap-3 shrink-0 text-[11px] text-stone-300">
            <button
              onClick={() => navigateTo('order-tracking')}
              className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <PackageCheck className="w-3.5 h-3.5 text-stone-400" />
              <span>{language === 'ar' ? 'تتبع شحنتك' : 'Track Order'}</span>
            </button>
            <span className="text-stone-600">·</span>
            <a
              href={`tel:${businessInfo.phone}`}
              className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer font-mono tabular-nums text-stone-200"
              title={language === 'ar' ? 'اتصل بخدمة العملاء' : 'Call Customer Service'}
            >
              <Phone className="w-3 h-3 text-[#E10600]" />
              <span>{businessInfo.phoneDisplay}</span>
            </a>
            <span className="text-stone-600">·</span>
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer text-emerald-400 font-semibold"
              title="WhatsApp"
            >
              <MessageCircle className="w-3 h-3" />
              <span>{language === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-6 h-16 sm:h-20">
          {/* Zone 1: Brand Wordmark & Official Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-1 text-stone-700 hover:text-black hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>

            <button
              onClick={() => navigateTo('home')}
              className="flex items-center gap-2 sm:gap-3 text-left rtl:text-right group cursor-pointer min-w-0"
            >
              <div className="relative w-9 h-9 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white border border-stone-200/80 p-0.5 shadow-2xs group-hover:border-[#E10600] transition-colors shrink-0">
                <img
                  src={OFFICIAL_BRAND.logo_white}
                  alt="Shantety Official Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-lg sm:text-2xl font-black tracking-tight text-stone-900 group-hover:text-[#E10600] transition-colors leading-none truncate">
                  {language === 'ar' ? 'شـنـطـتـي' : 'SHANTETY'}
                </span>
                <span className="text-[9px] sm:text-[10px] tracking-wider uppercase text-stone-500 font-semibold mt-0.5 sm:mt-1 truncate hidden min-[360px]:inline-block">
                  {language === 'ar' ? 'الحقائب والأحذية' : 'Bags & Shoes'}
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Desktop 4-5 Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-semibold text-stone-700">
            <button
              onClick={() => navigateTo('home')}
              className={`hover:text-[#E10600] transition-colors whitespace-nowrap cursor-pointer py-1 ${
                currentView === 'home' ? 'text-[#E10600] border-b-2 border-[#E10600]' : ''
              }`}
            >
              {language === 'ar' ? 'الرئيسية' : 'Home'}
            </button>

            <button
              onClick={() => navigateTo('shop')}
              className={`hover:text-[#E10600] transition-colors whitespace-nowrap cursor-pointer py-1 ${
                currentView === 'shop' && !searchQuery ? 'text-[#E10600] border-b-2 border-[#E10600]' : ''
              }`}
            >
              {language === 'ar' ? 'كل المنتجات' : 'All Catalog'}
            </button>

            <button
              onClick={() => navigateTo('shop', 'cat-bags')}
              className="hover:text-[#E10600] transition-colors whitespace-nowrap cursor-pointer py-1"
            >
              {language === 'ar' ? 'حقائب اليد' : 'Handbags'}
            </button>

            <button
              onClick={() => navigateTo('shop', 'cat-shoes')}
              className="hover:text-[#E10600] transition-colors whitespace-nowrap cursor-pointer py-1"
            >
              {language === 'ar' ? 'الأحذية النسائية' : 'Shoes'}
            </button>

            <button
              onClick={() => navigateTo('shop', 'cat-sets')}
              className="hover:text-[#E10600] transition-colors whitespace-nowrap cursor-pointer py-1"
            >
              {language === 'ar' ? 'أطقم المناسبات' : 'Matching Sets'}
            </button>

            <button
              onClick={() => navigateTo('order-tracking')}
              className={`hover:text-[#E10600] transition-colors whitespace-nowrap cursor-pointer py-1 ${
                currentView === 'order-tracking' ? 'text-[#E10600] border-b-2 border-[#E10600]' : ''
              }`}
            >
              {language === 'ar' ? 'تتبع الطلب' : 'Track Order'}
            </button>
          </nav>

          {/* Zone 3: Actions & Shopping Bag Drawer Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Desktop Search Toggle / Bar */}
            <div className="relative hidden md:block">
              {searchOpen ? (
                <div className="flex items-center bg-stone-100 rounded-lg px-2.5 py-1.5 border border-stone-300">
                  <Search className="w-4 h-4 text-stone-500 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigateTo('shop');
                    }}
                    placeholder={language === 'ar' ? 'ابحث عن شنطة، حذاء...' : 'Search bag, loafers...'}
                    className="w-36 lg:w-48 bg-transparent border-none text-xs focus:outline-none px-2 text-stone-800"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="text-stone-400 hover:text-stone-600 text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 text-stone-700 hover:text-[#E10600] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  title={language === 'ar' ? 'بحث' : 'Search'}
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>

            {/* Mobile Search Button */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="md:hidden p-2 text-stone-700 hover:text-[#E10600] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              title={language === 'ar' ? 'بحث' : 'Search'}
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold text-stone-700 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
              title={language === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
            >
              <Globe className="w-3.5 h-3.5 text-[#E10600]" />
              <span className="hidden min-[380px]:inline">{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            {/* Compare Button */}
            <button
              onClick={() => setIsCompareOpen(true)}
              className="relative p-2 text-stone-700 hover:text-[#E10600] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              title={language === 'ar' ? 'مقارنة المنتجات' : 'Compare Products'}
            >
              <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5" />
              {compareList.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#E10600] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center tabular-nums">
                  {compareList.length}
                </span>
              )}
            </button>

            {/* Wishlist Button (hidden on narrow mobile, in drawer) */}
            <button
              onClick={() => navigateTo('wishlist')}
              className="hidden sm:flex relative p-2 text-stone-700 hover:text-[#E10600] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              title={language === 'ar' ? 'قائمة الرغبات' : 'Wishlist'}
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#18181B] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center tabular-nums">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart Drawer Trigger */}
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative flex items-center gap-1.5 sm:gap-2 bg-[#E10600] hover:bg-[#C50500] text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg font-semibold text-xs transition-colors shadow-2xs cursor-pointer shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden md:inline">
                {language === 'ar' ? 'السلة' : 'Bag'}
              </span>
              <span className="bg-white text-[#E10600] px-1.5 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums">
                {cartCount}
              </span>
            </button>

            {/* Admin Management Toggle */}
            <button
              onClick={() => navigateTo(currentView === 'admin' ? 'home' : 'admin')}
              className={`hidden sm:flex py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer items-center gap-1.5 ${
                currentView === 'admin'
                  ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                  : isAuthenticated
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
              title={
                isAuthenticated
                  ? (language === 'ar' ? `لوحة الإدارة (${currentUser?.roleTitleAr})` : `Manager (${currentUser?.roleTitleEn})`)
                  : (language === 'ar' ? 'بوابة إدارة المتجر المشفرة' : 'Admin Portal (Restricted)')
              }
            >
              {isAuthenticated ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#E10600]" />
                  <span className="hidden xl:inline">
                    {language === 'ar' ? 'الإدارة' : 'Manager'}
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-stone-500" />
                  <span className="hidden xl:inline">
                    {language === 'ar' ? 'دخول الإدارة' : 'Admin Login'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Expandable Bar */}
        {searchOpen && (
          <div className="md:hidden pb-3 pt-1 border-t border-stone-100 animate-fadeIn">
            <div className="flex items-center bg-stone-100 rounded-lg px-3 py-2 border border-stone-300">
              <Search className="w-4 h-4 text-stone-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigateTo('shop');
                }}
                placeholder={language === 'ar' ? 'ابحث عن شنطة، حذاء، طقم...' : 'Search bags, loafers, sets...'}
                className="w-full bg-transparent border-none text-xs focus:outline-none px-2 text-stone-900"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
                className="text-stone-400 hover:text-stone-700 text-xs px-1 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white shadow-xl animate-fadeIn max-h-[85vh] overflow-y-auto">
          {/* Direct Contact Bar on Mobile Menu */}
          <div className="bg-stone-50 p-3.5 border-b border-stone-200 grid grid-cols-2 gap-2 text-xs">
            <a
              href={`tel:${businessInfo.phone}`}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-stone-200 rounded-lg text-stone-800 font-bold hover:border-[#E10600] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#E10600]" />
              <span className="font-mono tabular-nums">{businessInfo.phoneDisplay}</span>
            </a>
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'واتساب مباشر' : 'WhatsApp'}</span>
            </a>
          </div>

          <div className="px-4 py-4 space-y-1 text-sm font-bold text-stone-800">
            <button
              onClick={() => navigateTo('home')}
              className={`w-full text-start py-2.5 px-3 rounded-lg flex items-center justify-between ${
                currentView === 'home' ? 'bg-red-50 text-[#E10600]' : 'hover:bg-stone-50'
              }`}
            >
              <span>{language === 'ar' ? 'الرئيسية' : 'Home'}</span>
              {language === 'ar' ? <ChevronLeft className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
            </button>

            <button
              onClick={() => navigateTo('shop')}
              className={`w-full text-start py-2.5 px-3 rounded-lg flex items-center justify-between ${
                currentView === 'shop' && !searchQuery ? 'bg-red-50 text-[#E10600]' : 'hover:bg-stone-50'
              }`}
            >
              <span>{language === 'ar' ? 'جميع المنتجات (الكتالوج)' : 'All Catalog'}</span>
              {language === 'ar' ? <ChevronLeft className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
            </button>

            <button
              onClick={() => navigateTo('shop', 'cat-bags')}
              className="w-full text-start py-2.5 px-3 rounded-lg hover:bg-stone-50 flex items-center justify-between"
            >
              <span>{language === 'ar' ? 'حقائب اليد (Handbags)' : 'Handbags'}</span>
              {language === 'ar' ? <ChevronLeft className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
            </button>

            <button
              onClick={() => navigateTo('shop', 'cat-shoes')}
              className="w-full text-start py-2.5 px-3 rounded-lg hover:bg-stone-50 flex items-center justify-between"
            >
              <span>{language === 'ar' ? 'الأحذية النسائية (Shoes)' : 'Shoes'}</span>
              {language === 'ar' ? <ChevronLeft className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
            </button>

            <button
              onClick={() => navigateTo('shop', 'cat-sets')}
              className="w-full text-start py-2.5 px-3 rounded-lg hover:bg-stone-50 flex items-center justify-between"
            >
              <span>{language === 'ar' ? 'أطقم الشنطة والحذاء (Sets)' : 'Matching Sets'}</span>
              {language === 'ar' ? <ChevronLeft className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
            </button>

            <button
              onClick={() => navigateTo('wishlist')}
              className="w-full text-start py-2.5 px-3 rounded-lg hover:bg-stone-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#E10600]" />
                <span>{language === 'ar' ? 'قائمة الرغبات المحفوظة' : 'Wishlist'}</span>
              </div>
              <span className="bg-stone-100 text-stone-800 text-xs px-2 py-0.5 rounded-full font-mono">
                {wishlist.length}
              </span>
            </button>

            <button
              onClick={() => navigateTo('order-tracking')}
              className="w-full text-start py-2.5 px-3 rounded-lg hover:bg-stone-50 flex items-center justify-between text-[#E10600]"
            >
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4" />
                <span>{language === 'ar' ? 'تتبع شحنتك المباشرة' : 'Track Order'}</span>
              </div>
              {language === 'ar' ? <ChevronLeft className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
            </button>

            <button
              onClick={() => navigateTo('contact')}
              className="w-full text-start py-2.5 px-3 rounded-lg hover:bg-stone-50 flex items-center justify-between"
            >
              <span>{language === 'ar' ? 'عناوين الفروع والتواصل' : 'Branches & Contact'}</span>
              {language === 'ar' ? <ChevronLeft className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
            </button>

            <button
              onClick={() => navigateTo('about')}
              className="w-full text-start py-2.5 px-3 rounded-lg hover:bg-stone-50 flex items-center justify-between"
            >
              <span>{language === 'ar' ? 'عن علامة شنطتي' : 'About Shantety'}</span>
              {language === 'ar' ? <ChevronLeft className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
            </button>

            <button
              onClick={() => navigateTo('admin')}
              className={`w-full text-start py-2.5 px-3 rounded-xl font-bold flex items-center justify-between mt-2 border ${
                isAuthenticated
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                  : 'bg-stone-100 text-stone-900 border-stone-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Lock className="w-4 h-4 text-stone-500" />
                )}
                <div className="flex flex-col">
                  <span>{language === 'ar' ? 'لوحة تحكم الإدارة' : 'Commerce Manager'}</span>
                  {isAuthenticated && currentUser && (
                    <span className="text-[10px] text-emerald-700 font-normal">
                      {language === 'ar' ? currentUser.roleTitleAr : currentUser.roleTitleEn}
                    </span>
                  )}
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                isAuthenticated ? 'bg-emerald-600 text-white' : 'bg-stone-900 text-white'
              }`}>
                {isAuthenticated ? 'Active' : 'Locked'}
              </span>
            </button>
          </div>

          {/* Branch Preview in Mobile Menu */}
          <div className="p-4 bg-stone-50 border-t border-stone-200 text-xs text-stone-600 space-y-2">
            <div className="font-bold text-stone-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#E10600]" />
              <span>{language === 'ar' ? 'فروع شنطتي في أبو المطامير:' : 'Shantety Branches (Abu El Matamir):'}</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              • {language === 'ar' ? businessInfo.branches[0].address_ar : businessInfo.branches[0].address_en}
            </p>
            <p className="text-[11px] leading-relaxed">
              • {language === 'ar' ? businessInfo.branches[1].address_ar : businessInfo.branches[1].address_en}
            </p>
          </div>
        </div>
      )}
    </header>
  );
};
