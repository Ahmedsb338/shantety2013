import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { StoreDatabase } from '../services/storeDatabase';
import { Order } from '../types/ecommerce';
import {
  PackageCheck,
  Search,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  Lock,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export const OrderTrackingPage: React.FC = () => {
  const { language, formatPrice, activeOrder } = useStore();

  const [orderNumber, setOrderNumber] = useState(activeOrder ? activeOrder.order_number : '');
  const [trackingToken, setTrackingToken] = useState(activeOrder ? activeOrder.tracking_token : '');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(activeOrder || null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!orderNumber.trim()) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال رقم الطلب' : 'Please enter the order number');
      return;
    }

    if (!trackingToken.trim()) {
      setErrorMsg(
        language === 'ar'
          ? 'يرجى إدخال رمز الأمان والتتبع السري (Tracking Token) الممنوح عند إتمام الطلب'
          : 'Please enter the secret tracking token provided upon order completion'
      );
      return;
    }

    const order = StoreDatabase.getOrderByNumberAndToken(orderNumber, trackingToken);
    if (!order) {
      setErrorMsg(
        language === 'ar'
          ? 'لم يتم العثور على طلب مطابق لرقم الطلب ورمز الأمان المدخلين. تأكد من صحة الرمز السري.'
          : 'No order matched this order number and security token combination. Verify your credentials.'
      );
      setSearchedOrder(null);
      return;
    }

    setSearchedOrder(order);
  };

  const getStepStatus = (step: 'pending' | 'processing' | 'shipped' | 'delivered', current: string) => {
    const orderRanks: Record<string, number> = {
      pending: 1,
      processing: 2,
      shipped: 3,
      delivered: 4,
      cancelled: 0,
      refunded: 0,
    };
    const currentRank = orderRanks[current] || 1;
    const stepRank = orderRanks[step];

    if (current === 'cancelled' || current === 'refunded') return 'cancelled';
    if (currentRank > stepRank) return 'completed';
    if (currentRank === stepRank) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="text-center max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#E10600] flex items-center justify-center mx-auto mb-3">
          <PackageCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
          {language === 'ar' ? 'تتبع حالة شحنتك المباشرة' : 'Track Your Shipment'}
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          {language === 'ar'
            ? 'نظام تتبع مؤمن لحماية خصوصية بيانات عملائنا في جمهورية مصر العربية'
            : 'Secure authenticated tracking for customer privacy protection'}
        </p>
      </div>

      {/* Authenticated Tracking Form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleTrack} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">
                {language === 'ar' ? 'رقم الطلب (Order #) *' : 'Order Number *'}
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="SHN-xxxx (مثال: SHN-2601)"
                className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600] font-mono uppercase"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'رمز الأمان السري (Tracking Token) *' : 'Security Token *'}
                </label>
                <span className="text-[10px] text-stone-400 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#E10600]" />
                  <span>{language === 'ar' ? 'حماية مشددة' : 'Encrypted'}</span>
                </span>
              </div>
              <input
                type="text"
                required
                value={trackingToken}
                onChange={(e) => setTrackingToken(e.target.value)}
                placeholder="tk_xxxxxxxxxxxx (مثال: tk_98a7f41c2d)"
                className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600] font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-stone-500">
              {language === 'ar'
                ? 'تجد رمز التتبع في رسالة التأكيد أو الفاتورة الممنوحة عند الطلب.'
                : 'Found in your confirmation receipt upon order checkout.'}
            </p>

            <button
              type="submit"
              className="px-6 py-2.5 bg-[#E10600] hover:bg-[#C50500] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'استعلام وتتبع' : 'Verify & Track'}</span>
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Tracking Results View */}
      {searchedOrder && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-8 animate-fadeIn">
          {/* Top Status Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-6">
            <div>
              <span className="text-xs font-semibold text-stone-500">
                {language === 'ar' ? 'حالة الطلب الحالية:' : 'Current Status:'}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-sm font-black px-3 py-1 rounded-full ${
                    searchedOrder.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : searchedOrder.status === 'shipped'
                      ? 'bg-blue-100 text-blue-800'
                      : searchedOrder.status === 'cancelled'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {searchedOrder.status === 'pending' &&
                    (language === 'ar' ? 'قيد المراجعة وتأكيد المخزون' : 'Pending Confirmation')}
                  {searchedOrder.status === 'processing' &&
                    (language === 'ar' ? 'جاري تجهيز الطرد وتغليفه' : 'Packaging & Quality Check')}
                  {searchedOrder.status === 'shipped' &&
                    (language === 'ar' ? 'خرج للتوصيل مع مندوب الشحن' : 'Out for Delivery')}
                  {searchedOrder.status === 'delivered' &&
                    (language === 'ar' ? 'تم التسليم بنجاح للعميل' : 'Delivered')}
                  {searchedOrder.status === 'cancelled' &&
                    (language === 'ar' ? 'تم إلغاء الطلب وتحرير المخزون' : 'Cancelled')}
                </span>
              </div>
            </div>

            <div className="text-left rtl:text-right">
              <span className="text-xs font-semibold text-stone-500 block">
                {language === 'ar' ? 'شركة الشحن ورقم البوليصة:' : 'Courier & Tracking #:'}
              </span>
              <span className="text-sm font-bold text-stone-900 font-mono">
                {searchedOrder.shipping_provider} · {searchedOrder.tracking_number}
              </span>
            </div>
          </div>

          {/* Progress Timeline */}
          {searchedOrder.status !== 'cancelled' ? (
            <div className="relative">
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
                {/* Step 1 */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                      getStepStatus('pending', searchedOrder.status) === 'completed' ||
                      getStepStatus('pending', searchedOrder.status) === 'current'
                        ? 'bg-[#E10600] text-white ring-2 sm:ring-4 ring-red-100'
                        : 'bg-stone-200 text-stone-500'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-stone-800 mt-1 sm:mt-2 leading-tight">
                    {language === 'ar' ? 'تم الاستلام' : 'Received'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-stone-400">
                    {new Date(searchedOrder.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                      getStepStatus('processing', searchedOrder.status) === 'completed' ||
                      getStepStatus('processing', searchedOrder.status) === 'current'
                        ? 'bg-[#E10600] text-white ring-2 sm:ring-4 ring-red-100'
                        : 'bg-stone-200 text-stone-500'
                    }`}
                  >
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-stone-800 mt-1 sm:mt-2 leading-tight">
                    {language === 'ar' ? 'تجهيز الشحنة' : 'Processing'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-stone-400">
                    {language === 'ar' ? 'مخزن شنطتي' : 'Central Hub'}
                  </span>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                      getStepStatus('shipped', searchedOrder.status) === 'completed' ||
                      getStepStatus('shipped', searchedOrder.status) === 'current'
                        ? 'bg-[#E10600] text-white ring-2 sm:ring-4 ring-red-100'
                        : 'bg-stone-200 text-stone-500'
                    }`}
                  >
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-stone-800 mt-1 sm:mt-2 leading-tight">
                    {language === 'ar' ? 'في الطريق' : 'In Transit'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-stone-400 truncate max-w-[70px]">
                    {searchedOrder.shipping_provider}
                  </span>
                </div>

                {/* Step 4 */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                      getStepStatus('delivered', searchedOrder.status) === 'current' ||
                      searchedOrder.status === 'delivered'
                        ? 'bg-emerald-600 text-white ring-2 sm:ring-4 ring-emerald-100'
                        : 'bg-stone-200 text-stone-500'
                    }`}
                  >
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-stone-800 mt-1 sm:mt-2 leading-tight">
                    {language === 'ar' ? 'تم التسليم' : 'Delivered'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-stone-400 truncate max-w-[70px]">
                    {searchedOrder.shipping_address.governorate}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              <span>
                {language === 'ar'
                  ? 'تم إلغاء هذا الطلب وإعادة القطع المحجوزة للمخزن.'
                  : 'This order was cancelled and inventory was returned to stock.'}
              </span>
            </div>
          )}

          {/* Ordered Products Snapshot */}
          <div className="space-y-3 pt-4 border-t border-stone-100">
            <h4 className="text-xs font-bold text-stone-900">
              {language === 'ar' ? 'تفاصيل المنتجات داخل الشحنة' : 'Package Contents'}
            </h4>
            <div className="space-y-2">
              {searchedOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-stone-50 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.product_name_en}
                      className="w-10 h-10 object-contain bg-white rounded border border-stone-200 p-0.5"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="font-bold text-stone-900 block">
                        {language === 'ar' ? item.product_name_ar : item.product_name_en}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        {item.sku} · {language === 'ar' ? item.color_name_ar : item.color_name_en} ·{' '}
                        {language === 'ar' ? item.size_name_ar : item.size_name_en}
                      </span>
                    </div>
                  </div>

                  <span className="font-bold text-stone-900 tabular-nums">
                    {item.quantity} × {formatPrice(item.unit_price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
