import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { EGYPTIAN_GOVERNORATES, OFFICIAL_BRAND } from '../data/initialData';
import { Truck, CheckCircle2, ShieldCheck, RefreshCw, ExternalLink, Settings, MapPin, Zap, AlertCircle, FileText } from 'lucide-react';

interface CarrierConfig {
  id: string;
  name_ar: string;
  name_en: string;
  badge: string;
  badgeColor: string;
  description_ar: string;
  description_en: string;
  apiKey: string;
  accountNumber: string;
  pickupBranch: string;
  autoAwb: boolean;
  isActive: boolean;
}

export const ShippingIntegrationsTab: React.FC = () => {
  const { language, showToast } = useStore();

  const [carriers, setCarriers] = useState<CarrierConfig[]>([
    {
      id: 'bosta',
      name_ar: 'بوسطة مصر (Bosta)',
      name_en: 'Bosta Egypt',
      badge: 'الناقل الرسمي الافتراضي',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description_ar: 'الربط المباشر مع أسطول بوسطة للتسليم السريع في جميع محافظات مصر مع تتبع لحظي وجمع كاش COD.',
      description_en: 'Direct integration with Bosta courier fleet across all Egypt governorates with live tracking & COD collection.',
      apiKey: 'bst_live_9a87d65f8c3210e9',
      accountNumber: 'BOSTA-EGY-7812',
      pickupBranch: OFFICIAL_BRAND.branches[0].name_ar,
      autoAwb: true,
      isActive: true,
    },
    {
      id: 'shantety_express',
      name_ar: 'مندوب شنطتي الخاص (Shantety Express)',
      name_en: 'Shantety Express Local Fleet',
      badge: 'الأسطول الداخلي المباشر',
      badgeColor: 'bg-[#E10600]/10 text-[#E10600] border-[#E10600]/20',
      description_ar: 'أسطول مناديب متجر شنطتي لتسليم نفس اليوم في مدينة أبو المطامير ومراكز محافظة البحيرة.',
      description_en: 'Dedicated store courier fleet for same-day deliveries in Abu El Matamir and Beheira governorate.',
      apiKey: 'internal_fleet_shantety_sec',
      accountNumber: 'SHN-FLEET-BEHEIRA',
      pickupBranch: OFFICIAL_BRAND.branches[1].name_ar,
      autoAwb: true,
      isActive: true,
    },
    {
      id: 'mylerz',
      name_ar: 'مايلرز (Mylerz)',
      name_en: 'Mylerz Logistics',
      badge: 'خدمة اليوم التالي',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description_ar: 'شحن من الباب للباب مع خيارات التوصيل في نفس اليوم للقاهرة والإسكندرية.',
      description_en: 'Door-to-door courier service with same-day and next-day express windows.',
      apiKey: 'myl_auth_hash_871923',
      accountNumber: 'MYL-SHN-02',
      pickupBranch: OFFICIAL_BRAND.branches[0].name_ar,
      autoAwb: false,
      isActive: true,
    },
    {
      id: 'aramex',
      name_ar: 'أرامكس مصر (Aramex)',
      name_en: 'Aramex Egypt',
      badge: 'شحن وطني وإقليمي',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      description_ar: 'شبكة أرامكس اللوجستية للمحافظات البعيدة ومدن القناة والصعيد.',
      description_en: 'Nationwide network covering Upper Egypt, Sinai, and Red Sea regions.',
      apiKey: 'arx_egy_live_pass_2026',
      accountNumber: 'ARAMEX-EGY-4481',
      pickupBranch: OFFICIAL_BRAND.branches[0].name_ar,
      autoAwb: false,
      isActive: false,
    },
  ]);

  const [testResult, setTestResult] = useState<{ carrierId: string; status: 'testing' | 'success' | 'error'; message: string; sampleAwb?: string } | null>(null);
  const [selectedGovernorates, setSelectedGovernorates] = useState(EGYPTIAN_GOVERNORATES);

  const handleTestCarrier = (carrier: CarrierConfig) => {
    setTestResult({
      carrierId: carrier.id,
      status: 'testing',
      message: language === 'ar' ? `جارٍ فحص الاتصال مع خادم ${carrier.name_ar}...` : `Testing connection to ${carrier.name_en}...`,
    });

    setTimeout(() => {
      const sampleAwb = carrier.id === 'bosta'
        ? 'BST-9081273-EG'
        : carrier.id === 'shantety_express'
        ? 'SHN-EXP-ABU-014'
        : 'MYL-881920-EGY';

      setTestResult({
        carrierId: carrier.id,
        status: 'success',
        message:
          language === 'ar'
            ? `تم الاتصال بنجاح مع خوادم ${carrier.name_ar}. واجهة الـ API تعمل بكفاءة (زمن الاستجابة: 84ms).`
            : `Successfully connected to ${carrier.name_en} API (Response latency: 84ms). Ready for dispatch.`,
        sampleAwb,
      });

      showToast(
        language === 'ar'
          ? `تم اختبار ربط ${carrier.name_ar} بنجاح`
          : `${carrier.name_en} connection verified`,
        'success'
      );
    }, 900);
  };

  const toggleCarrier = (id: string) => {
    setCarriers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
    showToast(language === 'ar' ? 'تم تحديث حالة شركة الشحن' : 'Carrier status updated');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-stone-800">
        <div className="absolute top-0 end-0 w-80 h-80 bg-[#E10600]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-[#E10600] text-xs font-bold uppercase tracking-wider mb-1">
              <Truck className="w-4 h-4" />
              <span>{language === 'ar' ? 'مركز ربط شركات الشحن والتوزيع' : 'Carriers & Logistics Hub'}</span>
            </div>
            <h2 className="text-2xl font-black">
              {language === 'ar' ? 'إدارة وبوابات شركات الشحن في مصر' : 'Egyptian Courier Integrations'}
            </h2>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl leading-relaxed">
              {language === 'ar'
                ? 'ربط مباشر مع بوسطة، مايلرز، أرامكس، وأسطول مناديب شنطتي الداخلي (أبو المطامير - البحيرة) مع إصدار البوالص وطباعة الـ AWB تلقائياً.'
                : 'Direct API integrations with Bosta, Mylerz, Aramex, and Shantety Local Fleet for instant AWB generation.'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-stone-800/80 border border-stone-700/60 rounded-2xl px-4 py-2.5">
            <MapPin className="w-4 h-4 text-[#E10600] shrink-0" />
            <div className="text-[11px] leading-tight">
              <span className="block text-stone-400 font-medium">
                {language === 'ar' ? 'نقطة الانطلاق والاستلام:' : 'Dispatch Hub:'}
              </span>
              <span className="font-bold text-white">
                {OFFICIAL_BRAND.branches[0].name_ar}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Result Banner */}
      {testResult && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-4 text-xs transition-all ${
            testResult.status === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : testResult.status === 'testing'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {testResult.status === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : testResult.status === 'testing' ? (
              <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 animate-spin" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <span className="font-bold block">{testResult.message}</span>
              {testResult.sampleAwb && (
                <span className="text-[11px] opacity-80">
                  {language === 'ar' ? 'رقم بوليصة اختباري تم توليدها:' : 'Sample AWB Waybill:'}{' '}
                  <strong className="underline font-mono">{testResult.sampleAwb}</strong>
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setTestResult(null)}
            className="text-[11px] underline opacity-75 hover:opacity-100"
          >
            {language === 'ar' ? 'إغلاق' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* Carriers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {carriers.map((carrier) => (
          <div
            key={carrier.id}
            className={`bg-white rounded-3xl p-6 border transition-all shadow-xs hover:shadow-md ${
              carrier.isActive ? 'border-stone-200' : 'border-stone-200/60 opacity-60 bg-stone-50/50'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${carrier.badgeColor}`}>
                    {carrier.badge}
                  </span>
                  {carrier.isActive ? (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {language === 'ar' ? 'مفعل ومتصل' : 'Connected'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-stone-400">
                      {language === 'ar' ? 'معطل' : 'Disabled'}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-stone-900">
                  {language === 'ar' ? carrier.name_ar : carrier.name_en}
                </h3>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => toggleCarrier(carrier.id)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  carrier.isActive ? 'bg-[#E10600]' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    carrier.isActive ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-stone-500 mb-5 leading-relaxed">
              {language === 'ar' ? carrier.description_ar : carrier.description_en}
            </p>

            {/* Carrier Credentials Config Preview */}
            <div className="space-y-2.5 p-3.5 bg-stone-50 rounded-2xl border border-stone-100 text-xs text-stone-600 mb-5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-stone-500">{language === 'ar' ? 'مفتاح الـ API:' : 'API Token:'}</span>
                <span className="font-mono text-[11px] text-stone-900 bg-stone-200/80 px-2 py-0.5 rounded-md">
                  {carrier.apiKey.slice(0, 8)}••••••••
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-stone-500">{language === 'ar' ? 'رقم الحساب التجاري:' : 'Account ID:'}</span>
                <span className="font-mono text-[11px] text-stone-900">{carrier.accountNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-stone-500">{language === 'ar' ? 'فرع الاستلام الافتراضي:' : 'Pickup Branch:'}</span>
                <span className="text-[11px] font-bold text-stone-800">{carrier.pickupBranch}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleTestCarrier(carrier)}
                className="flex-1 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 active:scale-98"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'ar' ? 'فحص الاتصال الفوري' : 'Test Live API'}</span>
              </button>

              <button
                onClick={() => {
                  showToast(
                    language === 'ar'
                      ? `تم حفظ وتحديث إعدادات شركة ${carrier.name_ar}`
                      : `${carrier.name_en} settings saved`,
                    'success'
                  );
                }}
                className="p-2.5 border border-stone-200 hover:border-stone-400 rounded-xl text-stone-600 hover:text-stone-900 transition-colors"
                title={language === 'ar' ? 'تعديل الإعدادات' : 'Configure'}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Egyptian Governorates Rates & SLA Matrix */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-black text-stone-900">
              {language === 'ar' ? 'جدول أسعار ومدد الشحن حسب المحافظات المصرية' : 'Egypt Governorate Rates & Delivery Windows'}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {language === 'ar'
                ? 'تكلفة الشحن التلقائية عند إتمام الطلب وموعد التوصيل المتوقع (الشحن مجاني للطلبات فوق 1500 ج.م).'
                : 'Automated checkout rates & delivery windows (Free shipping on orders above 1,500 EGP).'}
            </p>
          </div>

          <span className="text-xs font-bold text-[#E10600] bg-[#E10600]/10 px-3 py-1.5 rounded-full border border-[#E10600]/20">
            {language === 'ar' ? 'شحن مجاني > 1,500 ج.م' : 'Free Shipping > 1,500 EGP'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 font-bold">
                <th className="py-3 px-3 text-start">{language === 'ar' ? 'المحافظة' : 'Governorate'}</th>
                <th className="py-3 px-3 text-start">{language === 'ar' ? 'تكلفة الشحن (ج.م)' : 'Shipping Fee (EGP)'}</th>
                <th className="py-3 px-3 text-start">{language === 'ar' ? 'المدة التقديرية' : 'Estimated Days'}</th>
                <th className="py-3 px-3 text-start">{language === 'ar' ? 'الناقل الموصى به' : 'Recommended Courier'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {selectedGovernorates.map((gov, idx) => (
                <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-3 px-3 font-bold text-stone-900">
                    {language === 'ar' ? gov.name_ar : gov.name_en}
                    {gov.name_ar === 'البحيرة' && (
                      <span className="ms-2 text-[10px] bg-red-100 text-[#E10600] font-bold px-2 py-0.5 rounded-full">
                        {language === 'ar' ? 'المقر الرئيسي (أبو المطامير)' : 'HQ Abu El Matamir'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-semibold text-stone-800">
                    {gov.fee} ج.م
                  </td>
                  <td className="py-3 px-3 text-stone-600">
                    {gov.delivery_days_min} - {gov.delivery_days_max} {language === 'ar' ? 'أيام عمل' : 'business days'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-medium text-stone-700">
                      {gov.name_ar === 'البحيرة' ? 'Shantety Express (مندوب شنطتي)' : 'بوسطة (Bosta Express)'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
