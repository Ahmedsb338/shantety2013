import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { StoreDatabase } from '../services/storeDatabase';
import { VisitorMetrics } from '../types/ecommerce';
import {
  Users,
  Eye,
  TrendingUp,
  Clock,
  Smartphone,
  Compass,
  ArrowUpRight,
  ShoppingCart,
  CheckCircle2,
  Share2,
  RefreshCw,
  Activity,
  Flame,
} from 'lucide-react';

export const VisitorAnalyticsTab: React.FC = () => {
  const { language, formatPrice } = useStore();
  const [metrics, setMetrics] = useState<VisitorMetrics>(() => StoreDatabase.getVisitorMetrics());
  const [livePulse, setLivePulse] = useState(metrics.activeVisitorsNow);

  // Simulate real-time subtle visitor fluctuations (e.g. 26 to 31 online)
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePulse((prev) => {
        const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
        return Math.max(18, Math.min(38, prev + delta));
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn text-xs">
      {/* Top Banner: Real-Time Active Pulse */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-[#18181B] text-white rounded-2xl p-5 sm:p-6 shadow-md border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-4 h-4 rounded-full bg-emerald-400 animate-ping opacity-75"></span>
            <span className="relative w-3.5 h-3.5 rounded-full bg-emerald-500"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tabular-nums">
                {livePulse}
              </span>
              <span className="text-sm font-bold text-white">
                {language === 'ar' ? 'عميل نشط يتصفح متجر شنطتي الآن' : 'Active Shoppers Browsing Right Now'}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {language === 'ar'
                ? 'مراقبة حركة الزوار المباشرة، سلات التسوق، ومعدلات التحويل في جميع المحافظات'
                : 'Real-time telemetry of active sessions, cart activities, and conversion metrics'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-stone-800 text-stone-300 font-mono px-2.5 py-1 rounded-full border border-stone-700">
            {language === 'ar' ? 'تحديث تلقائي حي' : 'Live Auto-Stream'}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold">
              {language === 'ar' ? 'زوار اليوم' : 'Today Visitors'}
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-stone-900 tabular-nums">
            {metrics.todayVisitors.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
            <ArrowUpRight className="w-3 h-3" />
            <span>+18.4% {language === 'ar' ? 'مقارنة بالأمس' : 'vs yesterday'}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold">
              {language === 'ar' ? 'مشاهدات الصفحات اليوم' : 'Today Pageviews'}
            </span>
            <Eye className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-stone-900 tabular-nums">
            {metrics.todayPageviews.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-stone-500 font-medium">
            <span>3.31 {language === 'ar' ? 'صفحة لكل زائر' : 'pages / session'}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold">
              {language === 'ar' ? 'متوسط مدة الجلسة' : 'Avg Session Time'}
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-stone-900 tabular-nums font-mono">
            {metrics.avgSessionDuration}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
            <span>{language === 'ar' ? 'معدل ارتداد منخفض: 26.4%' : 'Low bounce: 26.4%'}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold">
              {language === 'ar' ? 'معدل التحويل للشراء' : 'Conversion Rate'}
            </span>
            <TrendingUp className="w-4 h-4 text-[#E10600]" />
          </div>
          <div className="text-xl font-black text-[#E10600] tabular-nums font-mono">
            {metrics.conversionRate}%
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
            <ArrowUpRight className="w-3 h-3" />
            <span>{language === 'ar' ? 'أعلى من المتوسط المصري (2.8%)' : 'Above industry avg'}</span>
          </div>
        </div>
      </div>

      {/* Customer Conversion Funnel (سلوك الزوار) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#E10600]" />
            <h3 className="font-black text-stone-900 text-sm">
              {language === 'ar' ? 'قمع تحويل وسلوك الزوار (E-Commerce Behavior Funnel)' : 'Shopper Journey & Behavior Funnel'}
            </h3>
          </div>
          <span className="text-[11px] text-stone-400">
            {language === 'ar' ? 'من الدخول وحتى إتمام الأوردر' : 'From Landing to Order'}
          </span>
        </div>

        <div className="space-y-3">
          {metrics.funnel.map((step, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-700 font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-stone-800">
                    {language === 'ar' ? step.stepAr : step.stepEn}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-stone-500 text-[11px]">{step.count.toLocaleString()} زائر</span>
                  <span className="font-mono font-bold text-stone-900 w-12 text-end">{step.percentage}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    idx === 0
                      ? 'bg-stone-800'
                      : idx === 1
                      ? 'bg-blue-600'
                      : idx === 2
                      ? 'bg-purple-600'
                      : idx === 3
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${step.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Traffic Sources & Device Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#E10600]" />
              <h3 className="font-bold text-stone-900">
                {language === 'ar' ? 'مصادر الزيارات (Traffic Acquisition)' : 'Traffic Acquisition Sources'}
              </h3>
            </div>
            <span className="text-[10px] text-stone-400">آخر 24 ساعة</span>
          </div>

          <div className="space-y-3">
            {metrics.trafficSources.map((source, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-700">
                    {language === 'ar' ? source.nameAr : source.nameEn}
                  </span>
                  <span className="font-mono font-bold text-stone-900">
                    {source.percentage}% ({source.visits.toLocaleString()})
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E10600] rounded-full"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-stone-900">
                {language === 'ar' ? 'الأجهزة المستخدمة (Device Breakdown)' : 'Device Distribution'}
              </h3>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">
              {language === 'ar' ? '84% هواتف ذكية' : 'Mobile First'}
            </span>
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-stone-700" />
                <div>
                  <div className="font-bold text-stone-900">
                    {language === 'ar' ? 'الهواتف الذكية (Mobile)' : 'Smartphones'}
                  </div>
                  <span className="text-[10px] text-stone-500">Android & iOS</span>
                </div>
              </div>
              <span className="text-lg font-black font-mono text-stone-900">
                {metrics.deviceBreakdown.mobile}%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-stone-700" />
                <div>
                  <div className="font-bold text-stone-900">
                    {language === 'ar' ? 'أجهزة الكمبيوتر (Desktop)' : 'Desktop'}
                  </div>
                  <span className="text-[10px] text-stone-500">Windows & Mac</span>
                </div>
              </div>
              <span className="text-lg font-black font-mono text-stone-900">
                {metrics.deviceBreakdown.desktop}%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
              <div className="flex items-center gap-2.5">
                <Compass className="w-5 h-5 text-stone-700" />
                <div>
                  <div className="font-bold text-stone-900">
                    {language === 'ar' ? 'الأجهزة اللوحية (Tablet)' : 'Tablets'}
                  </div>
                  <span className="text-[10px] text-stone-500">iPad & Galaxy Tab</span>
                </div>
              </div>
              <span className="text-lg font-black font-mono text-stone-900">
                {metrics.deviceBreakdown.tablet}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Viewed Products & Cart Engagement */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-stone-900">
              {language === 'ar' ? 'المنتجات الأكثر مشاهدة وتفاعلاً اليوم' : 'Top Viewed Products & Engagement'}
            </h3>
          </div>
          <span className="text-[10px] text-stone-400">سلوك الزوار لكل قطعة</span>
        </div>

        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-left rtl:text-right">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold text-[10px]">
              <tr>
                <th className="p-3">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                <th className="p-3">{language === 'ar' ? 'المشاهدات' : 'Views'}</th>
                <th className="p-3">{language === 'ar' ? 'نسبة الإضافة للسلة' : 'Add to Cart Rate'}</th>
                <th className="p-3">{language === 'ar' ? 'حالة التفاعل' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-[11px]">
              {metrics.topViewedProducts.map((p, idx) => (
                <tr key={idx} className="hover:bg-stone-50/60">
                  <td className="p-3 font-bold text-stone-800">
                    {language === 'ar' ? p.nameAr : p.nameEn}
                  </td>
                  <td className="p-3 font-mono font-bold text-stone-900">{p.views.toLocaleString()}</td>
                  <td className="p-3 font-mono text-emerald-600 font-bold">{p.addToCartRate}%</td>
                  <td className="p-3">
                    <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                      {p.addToCartRate >= 20 ? '🔥 طلب عالي جداً' : 'طلب نشط'}
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
