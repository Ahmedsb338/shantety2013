import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { StoreDatabase } from '../services/storeDatabase';
import { SiteCustomization } from '../types/ecommerce';
import {
  Sparkles,
  Save,
  Image,
  Upload,
  Phone,
  MapPin,
  Megaphone,
  Globe,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';

const PRESET_BANNER_IMAGES = [
  {
    label: 'طقم شنطتي الملكي (الافتراضي الرسمي)',
    url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__2__6b416ddc.png',
  },
  {
    label: 'تشكيلة الشتاء الفاخرة باللون النبيتي',
    url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_22AM_4da4df52.png',
  },
  {
    label: 'أحذية وموكاسان مونوغرام هافان',
    url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_31AM__1__be443320.png',
  },
  {
    label: 'حقيبة توت عاجية منسوجة كلاسيكية',
    url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__1__7a9eb38c.png',
  },
];

export const CmsContentTab: React.FC = () => {
  const { language, siteCustomization, updateSiteCustomization, showToast, setCurrentView } = useStore();

  const [formData, setFormData] = useState<SiteCustomization>(() => ({
    ...siteCustomization,
  }));

  const [isSaving, setIsSaving] = useState(false);

  // File upload for hero container image
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast(language === 'ar' ? 'يرجى اختيار ملف صورة صالح' : 'Please upload a valid image file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData((prev) => ({ ...prev, heroImage: dataUrl }));
        showToast(language === 'ar' ? 'تم تجهيز الصورة بنجاح' : 'Banner image loaded', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setIsSaving(true);
    updateSiteCustomization(formData);
    setIsSaving(false);
    showToast(
      language === 'ar'
        ? 'تم حفظ وتحديث محتوى الموقع والبانر بنجاح'
        : 'Site content & banner customization saved successfully',
      'success'
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn text-xs">
      {/* Title & Actions */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-stone-900">
              {language === 'ar' ? 'تخصيص وإدارة محتوى الموقع (CMS Editor)' : 'Site Content & CMS Editor'}
            </h2>
            <span className="bg-red-50 text-[#E10600] font-bold text-[10px] px-2 py-0.5 rounded">
              مباشر في الواجهة
            </span>
          </div>
          <p className="text-stone-500 text-xs mt-0.5">
            {language === 'ar'
              ? 'تعديل نصوص وعناوين المتجر، صورة وحاوية البانر الرئيسي، أرقام التواصل، وعناوين الفروع'
              : 'Customize homepage hero container, uploaded banners, phone numbers, branches and footer text'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentView('home')}
            className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'معاينة الواجهة' : 'Preview Live'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="py-2.5 px-5 bg-[#E10600] hover:bg-[#c20500] text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>{language === 'ar' ? 'حفظ ونشر التعديلات' : 'Publish Changes'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: HOMEPAGE HERO CONTAINER & IMAGE */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2 text-stone-900 font-black text-sm">
            <Sparkles className="w-4 h-4 text-[#E10600]" />
            <span>{language === 'ar' ? '1. حاوية البانر الرئيسي (Hero Container)' : '1. Hero Container & Banner'}</span>
          </div>
          <span className="text-[11px] text-stone-400">
            {language === 'ar' ? 'يظهر في أعلى الصفحة الرئيسية' : 'Homepage Hero Section'}
          </span>
        </div>

        {/* Live Container Preview Card */}
        <div className="bg-stone-950 text-white rounded-2xl p-5 border border-stone-800 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-stone-400">
            <span>{language === 'ar' ? 'معاينة مصغرة للكونتينر:' : 'Container Live Preview:'}</span>
            <span className="font-mono text-[#E10600] font-bold">SHANTETY HERO CONTAINER</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-8 space-y-2">
              <span className="inline-block bg-[#E10600]/20 text-[#E10600] font-bold text-[10px] px-2 py-0.5 rounded-full border border-[#E10600]/30">
                {formData.heroBadgeAr}
              </span>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                {formData.heroHeadlineAr}
              </h3>
              <p className="text-stone-300 text-xs line-clamp-2">
                {formData.heroSubtitleAr}
              </p>
              <div className="pt-1">
                <span className="inline-block bg-[#E10600] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm">
                  {formData.heroButtonTextAr}
                </span>
              </div>
            </div>

            <div className="md:col-span-4 flex justify-center">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-stone-900 border border-stone-700 overflow-hidden p-1 shadow-lg">
                <img
                  src={formData.heroImage}
                  alt="Hero Preview"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Hero Image Selector & Uploader */}
        <div className="space-y-4 pt-2">
          <label className="font-bold text-stone-800 block text-xs">
            {language === 'ar' ? 'صورة الكونتينر / البانر الرئيسي:' : 'Hero Banner Image:'}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Upload from PC */}
            <div className="border-2 border-dashed border-stone-300 hover:border-[#E10600] rounded-xl p-4 text-center bg-stone-50/50 transition-colors">
              <input
                type="file"
                id="banner-file-input"
                accept="image/*"
                onChange={handleBannerUpload}
                className="hidden"
              />
              <label
                htmlFor="banner-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-9 h-9 rounded-full bg-red-50 text-[#E10600] flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="font-bold text-stone-800 text-xs">
                  {language === 'ar' ? 'رفع صورة بانر جديدة من جهازك' : 'Upload Banner Image from Computer'}
                </span>
                <span className="text-[10px] text-stone-400">يدعم PNG, JPG, WEBP</span>
              </label>
            </div>

            {/* Custom URL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-700 block">
                {language === 'ar' ? 'أو أدخل رابط مباشر للصورة:' : 'Or Direct Image URL:'}
              </label>
              <input
                type="text"
                value={formData.heroImage}
                onChange={(e) => setFormData((prev) => ({ ...prev, heroImage: e.target.value }))}
                placeholder="https://..."
                className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600] font-mono text-[11px]"
              />
              <p className="text-[10px] text-stone-400">
                {language === 'ar' ? 'سيتم تطبيق الصورة فوراً على خلفية أو حاوية الصفحة الرئيسية' : 'Applied to homepage container'}
              </p>
            </div>
          </div>

          {/* Preset Images */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-stone-600 block">
              {language === 'ar' ? 'أو اختر صورة جاهزة من ألبومات شنطتي:' : 'Or choose from Shanaty Presets:'}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_BANNER_IMAGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, heroImage: preset.url }))}
                  className={`p-2 rounded-xl border text-start flex items-center gap-2 transition-all cursor-pointer ${
                    formData.heroImage === preset.url
                      ? 'border-[#E10600] bg-red-50/40 ring-1 ring-[#E10600]'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <img src={preset.url} alt="" className="w-10 h-10 object-contain rounded bg-stone-50 shrink-0" />
                  <span className="text-[10px] font-medium text-stone-700 leading-tight">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Text Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <label className="font-bold text-stone-800">
              {language === 'ar' ? 'العنوان الرئيسي (عربي) *' : 'Headline (AR) *'}
            </label>
            <input
              type="text"
              value={formData.heroHeadlineAr}
              onChange={(e) => setFormData((prev) => ({ ...prev, heroHeadlineAr: e.target.value }))}
              className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-stone-800">
              {language === 'ar' ? 'العنوان الرئيسي (إنجليزي) *' : 'Headline (EN) *'}
            </label>
            <input
              type="text"
              value={formData.heroHeadlineEn}
              onChange={(e) => setFormData((prev) => ({ ...prev, heroHeadlineEn: e.target.value }))}
              className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="font-bold text-stone-800">
              {language === 'ar' ? 'الوصف الفرعي (عربي)' : 'Subtitle / Description (AR)'}
            </label>
            <textarea
              rows={2}
              value={formData.heroSubtitleAr}
              onChange={(e) => setFormData((prev) => ({ ...prev, heroSubtitleAr: e.target.value }))}
              className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="font-bold text-stone-800">
              {language === 'ar' ? 'الوصف الفرعي (إنجليزي)' : 'Subtitle / Description (EN)'}
            </label>
            <textarea
              rows={2}
              value={formData.heroSubtitleEn}
              onChange={(e) => setFormData((prev) => ({ ...prev, heroSubtitleEn: e.target.value }))}
              className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-stone-800">
              {language === 'ar' ? 'نص البادج العلوي (عربي)' : 'Badge Label (AR)'}
            </label>
            <input
              type="text"
              value={formData.heroBadgeAr}
              onChange={(e) => setFormData((prev) => ({ ...prev, heroBadgeAr: e.target.value }))}
              className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-stone-800">
              {language === 'ar' ? 'نص زر الشراء (عربي)' : 'Button Label (AR)'}
            </label>
            <input
              type="text"
              value={formData.heroButtonTextAr}
              onChange={(e) => setFormData((prev) => ({ ...prev, heroButtonTextAr: e.target.value }))}
              className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: OFFICIAL CONTACT NUMBERS & ADDRESSES */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2 text-stone-900 font-black text-sm">
            <Phone className="w-4 h-4 text-[#E10600]" />
            <span>{language === 'ar' ? '2. أرقام الاتصال الرسمية وعناوين الفروع' : '2. Contact & Branch Addresses'}</span>
          </div>
          <span className="text-[11px] text-stone-400">
            {language === 'ar' ? 'تظهر في الفوتر، الهيدر، وصفحات التواصل' : 'Footer, Header & Contact info'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="font-bold text-stone-800">
              {language === 'ar' ? 'رقم الهاتف الرسمي (Hotline)' : 'Phone Number'}
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full p-2.5 rounded-lg border border-stone-300 font-mono focus:outline-none focus:border-[#E10600]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-stone-800">
              {language === 'ar' ? 'رقم الواتساب للمبيعات' : 'WhatsApp Number'}
            </label>
            <input
              type="text"
              value={formData.whatsapp}
              onChange={(e) => setFormData((prev) => ({ ...prev, whatsapp: e.target.value }))}
              className="w-full p-2.5 rounded-lg border border-stone-300 font-mono focus:outline-none focus:border-[#E10600]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-stone-800">
              {language === 'ar' ? 'البريد الإلكتروني الرسمي' : 'Support Email'}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full p-2.5 rounded-lg border border-stone-300 font-mono focus:outline-none focus:border-[#E10600]"
            />
          </div>
        </div>

        {/* Branches addresses */}
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="font-bold text-stone-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#E10600]" />
              <span>{language === 'ar' ? 'عنوان فرع شارع مهران (أبو المطامير)' : 'Branch 1: Mehran St Address'}</span>
            </label>
            <input
              type="text"
              value={formData.branch1AddressAr}
              onChange={(e) => setFormData((prev) => ({ ...prev, branch1AddressAr: e.target.value }))}
              className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-stone-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#E10600]" />
              <span>{language === 'ar' ? 'عنوان فرع شارع الشعراوي (أبو المطامير)' : 'Branch 2: El Shaarawy St Address'}</span>
            </label>
            <input
              type="text"
              value={formData.branch2AddressAr}
              onChange={(e) => setFormData((prev) => ({ ...prev, branch2AddressAr: e.target.value }))}
              className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: FOOTER COPYRIGHT & STATEMENT */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2 text-stone-900 font-black text-sm">
            <Globe className="w-4 h-4 text-[#E10600]" />
            <span>{language === 'ar' ? '3. نص الفوتر والحقوق (Footer Statement)' : '3. Footer Statement & Copyright'}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">
            {language === 'ar' ? '✓ تم إزالة كلمة Created القديمة بالكامل' : 'Clean Brand Statement'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-bold text-stone-800">
              {language === 'ar' ? 'نص الفوتر بالعربية' : 'Footer Copyright (AR)'}
            </label>
            <input
              type="text"
              value={formData.footerCopyrightAr || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, footerCopyrightAr: e.target.value }))}
              placeholder="تأسست علامة شنطتي في عام 2013 • جميع الحقوق محفوظة..."
              className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-stone-800">
              {language === 'ar' ? 'نص الفوتر بالإنجليزية' : 'Footer Copyright (EN)'}
            </label>
            <input
              type="text"
              value={formData.footerCopyrightEn || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, footerCopyrightEn: e.target.value }))}
              placeholder="Established 2013 • All Rights Reserved..."
              className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
            />
          </div>
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="sticky bottom-4 z-20 bg-stone-900 text-white rounded-2xl p-4 shadow-xl border border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">
            {language === 'ar' ? 'جميع التعديلات يتم حفظها ومزامنتها مباشرة مع المتجر' : 'Changes sync directly to storefront'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="py-2 px-6 bg-[#E10600] hover:bg-[#c20500] text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-98"
        >
          <Save className="w-4 h-4" />
          <span>{language === 'ar' ? 'حفظ ونشر التعديلات' : 'Publish Changes'}</span>
        </button>
      </div>
    </div>
  );
};
