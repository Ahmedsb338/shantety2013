import React from 'react';
import { useStore, StoreView } from '../context/StoreContext';
import { OFFICIAL_BRAND, businessInfo, getWhatsAppUrl } from '../data/initialData';
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Truck,
  RotateCcw,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { language, setCurrentView } = useStore();

  const handleNav = (view: StoreView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const whatsAppUrl = getWhatsAppUrl(language);

  return (
    <footer className="bg-[#18181B] text-stone-300 pt-12 pb-8 border-t border-stone-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Main Grid: 4 Columns with Responsive Stacking */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-10 border-b border-stone-800">
          {/* Col 1: Brand & Official Contact (cols-4) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white p-0.5 border border-stone-700 shrink-0">
                <img
                  src={OFFICIAL_BRAND.logo_white}
                  alt="Shantety Official Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-2xl font-black text-white tracking-tight leading-none block">
                  {language === 'ar' ? 'شـنـطـتـي' : 'SHANTETY'}
                </span>
                <span className="text-[10px] text-stone-400 font-semibold tracking-wider uppercase">
                  {language === 'ar' ? 'العلامة المصرية الرائدة' : 'Egyptian Fashion House'}
                </span>
              </div>
            </div>

            <p className="text-stone-400 leading-relaxed text-xs">
              {language === 'ar'
                ? 'علامة شنطتي متخصصة في صناعة وتقديم أرقى حقائب اليد النسائية، الأحذية اللوفرز المريحة وأطقم المناسبات بأعلى معايير الجودة وبخدمة التوصيل لجميع محافظات مصر.'
                : 'Dedicated to offering fine women’s handbags, ergonomic footwear, and matching luxury accessories with guaranteed nationwide delivery.'}
            </p>

            {/* Direct Clickable Contact Links */}
            <div className="space-y-2 text-stone-300 pt-2 border-t border-stone-800/80">
              <a
                href={`tel:${businessInfo.phone}`}
                className="flex items-center gap-2 hover:text-white transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-stone-800 group-hover:bg-[#E10600] flex items-center justify-center transition-colors shrink-0">
                  <Phone className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">
                    {language === 'ar' ? 'الهاتف المباشر:' : 'Direct Phone:'}
                  </span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {businessInfo.phone}
                  </span>
                </div>
              </a>

              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600/20 group-hover:bg-emerald-600 flex items-center justify-center transition-colors shrink-0">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white" />
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">
                    {language === 'ar' ? 'محادثة واتساب الرسمية:' : 'Official WhatsApp:'}
                  </span>
                  <span className="font-bold text-emerald-400 group-hover:text-white">
                    {businessInfo.phoneDisplay}
                  </span>
                </div>
              </a>

              <a
                href={`mailto:${businessInfo.email}`}
                className="flex items-center gap-2 hover:text-white transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-stone-800 group-hover:bg-[#E10600] flex items-center justify-center transition-colors shrink-0">
                  <Mail className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-stone-400 block">
                    {language === 'ar' ? 'البريد الإلكتروني الرسمي:' : 'Official Email:'}
                  </span>
                  <span className="text-stone-300 group-hover:text-white truncate">
                    {businessInfo.email}
                  </span>
                </div>
              </a>
            </div>
          </div>

          {/* Col 2: Official Branches Cards (cols-4) */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-white font-bold text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#E10600]" />
              <span>{language === 'ar' ? 'فروع شنطتي الرسمية (أبو المطامير)' : 'Official Branches'}</span>
            </h4>
            <p className="text-[11px] text-stone-400">
              {language === 'ar'
                ? 'تفضلوا بزيارة فروعنا في أبو المطامير - البحيرة - مصر، أو اطلبوا أونلاين للتوصيل لباب المنزل.'
                : 'Visit our retail branches in Abu El Matamir, Beheira, or shop online for nationwide doorstep delivery.'}
            </p>

            <div className="space-y-3 pt-1">
              {businessInfo.branches.map((branch) => {
                const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  branch.mapQuery
                )}`;
                return (
                  <div
                    key={branch.id}
                    className="p-3 bg-stone-900/90 rounded-xl border border-stone-800 hover:border-stone-700 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">
                        {language === 'ar' ? branch.name_ar : branch.name_en}
                      </span>
                      <a
                        href={mapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-[#E10600] hover:text-white font-semibold flex items-center gap-1"
                        title={language === 'ar' ? 'عرض على الخريطة' : 'View on Google Maps'}
                      >
                        <span>{language === 'ar' ? 'الموقع' : 'Map'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      {language === 'ar' ? branch.address_ar : branch.address_en}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Col 3: Quick Navigation Links (cols-2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-white font-bold text-sm">
              {language === 'ar' ? 'روابط المتجر' : 'Quick Links'}
            </h4>
            <ul className="space-y-2 text-stone-400">
              <li>
                <button
                  onClick={() => handleNav('shop')}
                  className="hover:text-white transition-colors cursor-pointer text-start"
                >
                  {language === 'ar' ? 'كتالوج المنتجات' : 'All Catalog'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('shop')}
                  className="hover:text-white transition-colors cursor-pointer text-start"
                >
                  {language === 'ar' ? 'حقائب اليد والكانفاس' : 'Handbags'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('shop')}
                  className="hover:text-white transition-colors cursor-pointer text-start"
                >
                  {language === 'ar' ? 'الأحذية اللوفرز الطبية' : 'Loafers'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('shop')}
                  className="hover:text-white transition-colors cursor-pointer text-start"
                >
                  {language === 'ar' ? 'أطقم المناسبات' : 'Matching Sets'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('wishlist')}
                  className="hover:text-white transition-colors cursor-pointer text-start"
                >
                  {language === 'ar' ? 'قائمة الرغبات' : 'Wishlist'}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Customer Care & Policies (cols-2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-white font-bold text-sm">
              {language === 'ar' ? 'خدمة العملاء' : 'Customer Care'}
            </h4>
            <ul className="space-y-2 text-stone-400">
              <li>
                <button
                  onClick={() => handleNav('order-tracking')}
                  className="hover:text-white transition-colors cursor-pointer text-[#E10600] font-bold text-start"
                >
                  {language === 'ar' ? 'تتبع شحنتك المباشرة' : 'Track Order'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('contact')}
                  className="hover:text-white transition-colors cursor-pointer text-start"
                >
                  {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('shipping-policy')}
                  className="hover:text-white transition-colors cursor-pointer text-start"
                >
                  {language === 'ar' ? 'أسعار ومواعيد الشحن' : 'Shipping Rates'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('returns-policy')}
                  className="hover:text-white transition-colors cursor-pointer text-start"
                >
                  {language === 'ar' ? 'سياسة الاستبدال (14 يوم)' : '14-Day Returns'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('about')}
                  className="hover:text-white transition-colors cursor-pointer text-start"
                >
                  {language === 'ar' ? 'عن علامة شنطتي' : 'About Us'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('faq')}
                  className="hover:text-white transition-colors cursor-pointer text-start"
                >
                  {language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Payments & Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-stone-500">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="font-semibold text-stone-400">
              {language === 'ar' ? 'طرق الدفع المعتمدة:' : 'Accepted Payments:'}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-mono">الدفع عند الاستلام (COD)</span>
              <span className="bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-mono">ميزة (Meeza)</span>
              <span className="bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-mono">Visa / Mastercard</span>
              <span className="bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-mono">فودافون كاش</span>
              <span className="bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-mono">إنستاباي (InstaPay)</span>
            </div>
          </div>

          <div className="text-center sm:text-end shrink-0">
            <span>© 2026 {language === 'ar' ? 'شنطتي (Shantety) — جميع الحقوق محفوظة.' : 'Shantety Egypt. All rights reserved.'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
