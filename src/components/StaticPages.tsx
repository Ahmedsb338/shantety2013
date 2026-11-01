import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { OFFICIAL_BRAND, businessInfo, getWhatsAppUrl, EGYPTIAN_GOVERNORATES } from '../data/initialData';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Phone,
  Mail,
  MapPin,
  Clock,
  HelpCircle,
  FileText,
  Send,
  CheckCircle2,
  MessageCircle,
  ExternalLink,
  Store,
} from 'lucide-react';

export const StaticPages: React.FC<{ type: 'about' | 'contact' | 'faq' | 'shipping' | 'returns' }> = ({
  type,
}) => {
  const { language, showToast } = useStore();
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const whatsAppUrl = getWhatsAppUrl(language);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    showToast(
      language === 'ar'
        ? 'تم إرسال رسالتكِ لفريق خدمة عملاء شنطتي بنجاح، سنتواصل معكِ خلال ساعات.'
        : 'Your message has been received by Shantety Care team.',
      'success'
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* 1. ABOUT US */}
      {type === 'about' && (
        <div className="space-y-8 sm:space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#E10600] uppercase tracking-wider">
              {language === 'ar' ? 'العلامة التجارية المصرية' : 'The Egyptian Brand'}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-stone-900">
              {language === 'ar' ? 'عن علامة شنطتي (Shantety)' : 'About Shantety Brand'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {language === 'ar'
                ? 'علامة مصرية رائدة في تصنيع وتقديم أرقى حقائب اليد النسائية، الأحذية اللوفرز المريحة وأطقم المناسبات بأعلى معايير الجودة وبخدمة التوصيل لجميع محافظات مصر.'
                : 'A leading Egyptian fashion house creating luxury handbags, ergonomic comfort footwear, and coordinated sets with nationwide delivery.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E10600] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">
                {language === 'ar' ? 'جودة الخامات المعتمدة' : 'Fine Craftsmanship'}
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                {language === 'ar'
                  ? 'نعتمد أجود خامات الكانفاس المونوغرام والجلود المعالجة المقاومة للخدش مع إكسسوارات معدنية ذهبية لا يتغير لونها مع الاستخدام، وكل قطعة تصدر بكارت الهوية والضمان المعتمد لشنطتي.'
                  : 'We select high-density monogram jacquard canvas, scratch-resistant vegan leathers, and rust-proof gold hardware that last for years.'}
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E10600] flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">
                {language === 'ar' ? 'فروعنا في أبو المطامير' : 'Retail Flagship Branches'}
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                {language === 'ar'
                  ? 'نسعد باستقبالكم في فرعينا بأبو المطامير - محافظة البحيرة: فرع شارع مهران (بجوار البوستة الجديدة أمام فرع WE) وفرع شارع الشعراوي (أمام فرع أمان).'
                  : 'Proudly welcoming guests at our two retail branches in Abu El Matamir, Beheira: Mehran St (next to New Post Office) & El Shaarawy St (opp. Aman).'}
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E10600] flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">
                {language === 'ar' ? 'توصيل لجميع المحافظات' : 'Nationwide Egypt Delivery'}
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                {language === 'ar'
                  ? 'أسطول شحن سريع يغطي كافة محافظات مصر، مع حق المعاينة وفتح الطرد قبل الدفع، وخيار الدفع نقداً عند الاستلام أو عبر البطاقات والمحافظ الإلكترونية.'
                  : 'Fast reliable logistics reaching every Egyptian governorate with inspection on delivery and Cash on Delivery.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONTACT US */}
      {type === 'contact' && (
        <div className="space-y-8 sm:space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#E10600] uppercase tracking-wider">
              {language === 'ar' ? 'خدمة العملاء والفروع' : 'Branches & Care'}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-stone-900">
              {language === 'ar' ? 'تواصل مع علامة شنطتي' : 'Contact Shantety'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500">
              {language === 'ar'
                ? 'فريق شنطتي في خدمتكم عبر الهاتف، واتساب، البريد، أو بزيارة فروعنا بأبو المطامير'
                : 'We are here to assist via phone, WhatsApp, email, or at our retail branches'}
            </p>
          </div>

          {/* Quick Action Badges Strip for Mobile & Desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href={`tel:${businessInfo.phone}`}
              className="p-4 bg-white rounded-2xl border border-stone-200 hover:border-[#E10600] transition-colors shadow-2xs flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E10600] group-hover:bg-[#E10600] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-stone-400 block font-medium">
                  {language === 'ar' ? 'اتصال مباشر:' : 'Direct Call:'}
                </span>
                <span className="text-sm font-bold text-stone-900 font-mono tabular-nums block truncate">
                  {businessInfo.phone}
                </span>
              </div>
            </a>

            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-white rounded-2xl border border-stone-200 hover:border-emerald-500 transition-colors shadow-2xs flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-stone-400 block font-medium">
                  {language === 'ar' ? 'واتساب رسمي:' : 'Official WhatsApp:'}
                </span>
                <span className="text-sm font-bold text-emerald-700 font-mono tabular-nums block truncate">
                  {businessInfo.phoneDisplay}
                </span>
              </div>
            </a>

            <a
              href={`mailto:${businessInfo.email}`}
              className="p-4 bg-white rounded-2xl border border-stone-200 hover:border-[#E10600] transition-colors shadow-2xs flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E10600] group-hover:bg-[#E10600] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-stone-400 block font-medium">
                  {language === 'ar' ? 'البريد الإلكتروني:' : 'Official Email:'}
                </span>
                <span className="text-xs sm:text-sm font-bold text-stone-900 block truncate">
                  {businessInfo.email}
                </span>
              </div>
            </a>
          </div>

          {/* Section: Both Official Branches Displayed Distinctly */}
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-black text-stone-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-[#E10600]" />
              <span>{language === 'ar' ? 'فروع شنطتي في جمهورية مصر العربية' : 'Official Retail Branches'}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {businessInfo.branches.map((branch, index) => {
                const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  branch.mapQuery
                )}`;
                return (
                  <div
                    key={branch.id}
                    className="bg-white rounded-2xl border-2 border-stone-200 hover:border-[#E10600] p-5 sm:p-6 shadow-2xs transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#E10600] text-white flex items-center justify-center text-xs font-black shrink-0">
                            {index + 1}
                          </span>
                          <h3 className="text-base font-bold text-stone-900">
                            {language === 'ar' ? branch.name_ar : branch.name_en}
                          </h3>
                        </div>
                        <span className="text-[10px] bg-stone-100 text-stone-600 font-bold px-2 py-0.5 rounded">
                          {language === 'ar' ? 'فرع رئيسي' : 'Active'}
                        </span>
                      </div>

                      <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1.5">
                        <div className="flex items-start gap-2 text-xs">
                          <MapPin className="w-4 h-4 text-[#E10600] mt-0.5 shrink-0" />
                          <p className="text-stone-800 font-medium leading-relaxed">
                            {language === 'ar' ? branch.address_ar : branch.address_en}
                          </p>
                        </div>

                        <div className="text-[11px] text-stone-500 pr-6 rtl:pr-6 rtl:pl-0 pl-6">
                          <span className="font-bold text-stone-700">
                            {language === 'ar' ? 'العلامة المميزة:' : 'Landmark:'}{' '}
                          </span>
                          <span>{language === 'ar' ? branch.landmark_ar : branch.landmark_en}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                      <a
                        href={mapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:flex-1 py-2.5 px-4 bg-stone-900 hover:bg-[#E10600] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'فتح الموقع في خرائط Google' : 'View on Google Maps'}</span>
                      </a>
                      <a
                        href={`tel:${businessInfo.phone}`}
                        className="w-full sm:w-auto py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#E10600]" />
                        <span>{language === 'ar' ? 'اتصال بالفرع' : 'Call'}</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Message Form & Working Hours */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pt-4">
            {/* Working Hours & Support (cols-5) */}
            <div className="md:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-stone-900 pb-2 border-b border-stone-100">
                {language === 'ar' ? 'أوقات العمل واستقبال العملاء' : 'Showroom & Support Hours'}
              </h3>

              <div className="space-y-3 text-xs text-stone-700">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-[#E10600] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold block text-stone-900">
                      {language === 'ar' ? 'السبت إلى الخميس:' : 'Saturday – Thursday:'}
                    </span>
                    <span className="text-stone-600">
                      10:00 {language === 'ar' ? 'صباحاً' : 'AM'} – 10:00 {language === 'ar' ? 'مساءً' : 'PM'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-[#E10600] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold block text-stone-900">
                      {language === 'ar' ? 'يوم الجمعة:' : 'Friday:'}
                    </span>
                    <span className="text-stone-600">
                      1:00 {language === 'ar' ? 'ظهراً' : 'PM'} – 10:30 {language === 'ar' ? 'مساءً' : 'PM'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl text-xs text-stone-800 space-y-1">
                <span className="font-bold text-[#E10600] block">
                  {language === 'ar' ? 'خدمة الشحن والتوصيل المنزلي:' : 'Home Delivery Service:'}
                </span>
                <p className="text-[11px] text-stone-600">
                  {language === 'ar'
                    ? 'الطلبات أونلاين عبر الموقع متاحة 24/7 طوال أيام الأسبوع، ويتم الشحن فوراً عبر مندوبي شركات الشحن المعتمدة.'
                    : 'Online ordering is available 24/7 with immediate dispatch across Egypt.'}
                </p>
              </div>
            </div>

            {/* Quick Contact Form (cols-7) */}
            <div className="md:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-2xs">
              {submitted ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="text-base font-bold text-stone-900">
                    {language === 'ar' ? 'تم استلام استفساركِ بنجاح' : 'Inquiry Received'}
                  </h4>
                  <p className="text-xs text-stone-500">
                    {language === 'ar'
                      ? 'سيتواصل معكِ مسؤول خدمة عملاء شنطتي عبر واتساب أو الهاتف قريباً.'
                      : 'Our representative will reach out via WhatsApp or phone shortly.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <h3 className="text-sm font-bold text-stone-900 pb-2 border-b border-stone-100">
                    {language === 'ar' ? 'إرسال رسالة مباشرة للمتجر' : 'Send Direct Message'}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700">
                        {language === 'ar' ? 'الاسم الكريم *' : 'Your Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder={language === 'ar' ? 'مثال: مريم أحمد' : 'e.g. Mariam Ahmed'}
                        className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700">
                        {language === 'ar' ? 'رقم الهاتف / واتساب *' : 'Mobile / WhatsApp *'}
                      </label>
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="01xxxxxxxxx"
                        className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600] font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700">
                      {language === 'ar' ? 'نص الاستفسار أو كود الموديل *' : 'Message / Model Code *'}
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder={language === 'ar' ? 'اكتبي استفساركِ عن الموديل، المقاس، أو الشحن...' : 'Write your question or request...'}
                      className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      type="submit"
                      className="w-full sm:flex-1 py-3 bg-[#E10600] text-white text-xs font-bold rounded-xl hover:bg-[#C50500] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'إرسال الرسالة الآن' : 'Send Message'}</span>
                    </button>
                    <a
                      href={whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto py-3 px-5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'مراسلة واتساب فورية' : 'Chat on WhatsApp'}</span>
                    </a>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SHIPPING POLICY */}
      {type === 'shipping' && (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
              {language === 'ar' ? 'سياسة الشحن ومواعيد التوصيل' : 'Shipping & Delivery Policy'}
            </h1>
            <p className="text-xs text-stone-500">
              {language === 'ar'
                ? 'أسعار شحن واضحة ومواعيد وصول محددة لكافة محافظات جمهورية مصر العربية'
                : 'Clear shipping fees and delivery timelines across all Egyptian governorates'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right min-w-[500px]">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase">
                  <tr>
                    <th className="p-3.5">{language === 'ar' ? 'المحافظة' : 'Governorate'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'تكلفة الشحن' : 'Fee'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'مدة التوصيل' : 'Estimated Time'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'الشحن المجاني' : 'Free Shipping'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {EGYPTIAN_GOVERNORATES.map((g) => (
                    <tr key={g.name_en} className="hover:bg-stone-50/60">
                      <td className="p-3.5 font-bold text-stone-900">
                        {language === 'ar' ? g.name_ar : g.name_en}
                      </td>
                      <td className="p-3.5 tabular-nums font-mono">{g.fee} EGP</td>
                      <td className="p-3.5">
                        {g.delivery_days_min} - {g.delivery_days_max}{' '}
                        {language === 'ar' ? 'أيام عمل' : 'business days'}
                      </td>
                      <td className="p-3.5 text-emerald-700 font-semibold">
                        {language === 'ar' ? 'للطلبات فوق 1,500 ج.م' : 'Orders > 1,500 EGP'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. RETURNS POLICY */}
      {type === 'returns' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="text-center space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
              {language === 'ar' ? 'سياسة الاستبدال والاسترجاع' : 'Returns & Exchange Policy'}
            </h1>
            <p className="text-xs text-stone-500">
              {language === 'ar'
                ? 'ثقة تامة وأمان كامل عند التسوق من علامة شنطتي'
                : '100% Peace of mind shopping with Shantety'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 text-xs text-stone-700 leading-relaxed shadow-2xs">
            <h3 className="text-sm font-bold text-stone-900">
              {language === 'ar' ? '1. حق المعاينة المباشرة عند الاستلام' : '1. On-the-Spot Inspection'}
            </h3>
            <p>
              {language === 'ar'
                ? 'يحق للعميل فتح الطرد ومعاينة الحقيبة أو الحذاء بحضور مندوب شركة الشحن للتأكد من المقاس واللون والمطابقة التامة قبل سداد قيمة الطلب.'
                : 'Customers have the right to inspect the product in the presence of the courier before completing payment.'}
            </p>

            <h3 className="text-sm font-bold text-stone-900 pt-3 border-t border-stone-100">
              {language === 'ar' ? '2. مهلة الاستبدال (14 يوماً)' : '2. 14-Day Exchange Window'}
            </h3>
            <p>
              {language === 'ar'
                ? 'يمكنكِ طلب استبدال المقاس أو الموديل خلال 14 يوماً من تاريخ الاستلام، بشرط أن تكون القطعة بحالتها غير مستعملة ومعها كارت الصنف والعلبة الأصلية.'
                : 'You may exchange sizes or models within 14 days of receipt, provided items are unworn with original tags attached.'}
            </p>

            <h3 className="text-sm font-bold text-stone-900 pt-3 border-t border-stone-100">
              {language === 'ar' ? '3. التواصل لطلب الاستبدال' : '3. How to Request an Exchange'}
            </h3>
            <p>
              {language === 'ar'
                ? 'تواصلي مباشرة مع خدمة العملاء عبر واتساب على الرقم 01010070812 برقم الطلب، وسيصلك مندوبنا لتسليم البديل خلال 48-72 ساعة.'
                : 'Contact our WhatsApp hotline (+201010070812) with your Order Number, and our courier will facilitate the exchange.'}
            </p>
          </div>
        </div>
      )}

      {/* 5. FAQ */}
      {type === 'faq' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="text-center space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
              {language === 'ar' ? 'الأسئلة الأكثر شيوعاً' : 'Frequently Asked Questions'}
            </h1>
          </div>

          <div className="space-y-3">
            {[
              {
                q_ar: 'أين تقع فروع شنطتي في مصر؟',
                q_en: 'Where are Shantety branches located?',
                a_ar: 'لدينا فرعان في أبو المطامير بمحافظة البحيرة: الفرع الأول بشارع مهران بجوار البوستة الجديدة أمام فرع WE، والفرع الثاني بشارع الشعراوي أمام فرع أمان. كما نوفر خدمة الشحن السريع لجميع محافظات مصر.',
                a_en: 'We have two retail branches in Abu El Matamir, Beheira: Mehran St (next to New Post Office, opp. WE) and El Shaarawy St (opp. Aman). We also deliver nationwide.',
              },
              {
                q_ar: 'كيف أتواصل معكم عبر واتساب أو الهاتف؟',
                q_en: 'How can I contact Shantety via WhatsApp or phone?',
                a_ar: 'يمكنكِ التواصل مباشرة عبر الهاتف أو واتساب على الرقم الرسمي الموحد: +201010070812، أو عبر البريد الإلكتروني shantety2013@gmail.com.',
                a_en: 'You can reach us directly via phone or WhatsApp at +201010070812, or email shantety2013@gmail.com.',
              },
              {
                q_ar: 'هل يمكنني فتح الشحنة ومعاينتها قبل الدفع؟',
                q_en: 'Can I open and inspect the package before paying?',
                a_ar: 'نعم بكل تأكيد! نوفر ميزة المعاينة قبل الاستلام لكافة طلبات الدفع عند الاستلام بجميع المحافظات.',
                a_en: 'Yes, inspection before payment is fully supported on all Cash on Delivery shipments.',
              },
              {
                q_ar: 'ما هي طرق الدفع المتاحة في المتجر؟',
                q_en: 'What payment methods are supported?',
                a_ar: 'نوفر الدفع نقداً عند الاستلام (COD)، والبطاقات البنكية فيزا وماستركارد وميزة، بالإضافة للمحافظ الإلكترونية مثل فودافون كاش وإنستاباي InstaPay.',
                a_en: 'We accept Cash on Delivery, Visa/MasterCard, Meeza, Vodafone Cash, and InstaPay.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs space-y-2">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#E10600] shrink-0" />
                  <span>{language === 'ar' ? faq.q_ar : faq.q_en}</span>
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed pl-6 rtl:pl-0 rtl:pr-6">
                  {language === 'ar' ? faq.a_ar : faq.a_en}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
