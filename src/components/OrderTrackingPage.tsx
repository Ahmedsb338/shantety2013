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

  const handleTrack = async (e?: React.FormEvent, directNumber?: string, directToken?: string) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const queryNum = (directNumber || orderNumber).trim();
    const tokenVal = (directToken !== undefined ? directToken : trackingToken).trim();

    if (!queryNum) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال رقم الطلب بشكل صحيح (مثال: SHN-2601)' : 'Please enter your order number (e.g. SHN-2601)');
      return;
    }

    if (!tokenVal) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال رمز الأمان السري للطلب (tk_...)' : 'Please enter the secret tracking token (tk_...)');
      return;
    }

    try {
      const response = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: queryNum,
          tracking_token: tokenVal,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        setErrorMsg(
          language === 'ar'
            ? result.error_ar || 'لم يتم العثور على شحنة مطابقة للبيانات المدخلة. يرجى التأكد من رقم الطلب ورمز الأمان.'
            : result.error_en || 'Order not found or invalid security credentials. Please verify your order number and token.'
        );
        setSearchedOrder(null);
        return;
      }

      // Convert tracking response to format expected by UI
      const trackData = result.data;
      setSearchedOrder({
        id: trackData.order_number,
        order_number: trackData.order_number,
        tracking_token: trackingToken.trim(),
        customer_name: 'عميل شنطتي الموقر',
        customer_phone: '',
        shipping_address: {
          id: 'addr-track',
          customer_name: 'عميل شنطتي',
          phone: '',
          governorate: trackData.destination_governorate,
          city: trackData.destination_city,
          street_address: trackData.destination_city,
          is_default: true,
        },
        items: trackData.items.map((it: any, idx: number) => ({
          id: `item-${idx}`,
          order_id: trackData.order_number,
          product_id: '',
          variant_id: '',
          sku: '',
          product_name_ar: it.product_name_ar,
          product_name_en: it.product_name_en,
          color_name_ar: it.color_name_ar,
          color_name_en: it.color_name_en,
          size_name_ar: it.size_name_ar,
          size_name_en: it.size_name_en,
          unit_price: it.unit_price || 0,
          quantity: it.quantity,
          total_price: (it.unit_price || 0) * it.quantity,
          image: it.image,
        })),
        subtotal: 0,
        shipping_fee: 0,
        discount: 0,
        total: 0,
        currency: 'EGP',
        status: trackData.status,
        payment_status: 'paid',
        payment_method: 'cod',
        shipping_provider: trackData.shipping_provider,
        tracking_number: trackData.tracking_number,
        created_at: trackData.created_at,
        updated_at: trackData.created_at,
      });
    } catch (err: any) {
      setErrorMsg(language === 'ar' ? 'فشل الاتصال بخادم التتبع' : 'Failed to reach tracking server');
    }
  };

  const loadSampleOrder = (num: string, token: string) => {
    setOrderNumber(num);
    setTrackingToken(token);
    handleTrack(undefined, num, token);
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

  // Calculate estimated arrival date (e.g. 2-3 business days after creation)
  const getEstimatedArrival = (order: Order) => {
    const created = new Date(order.created_at);
    const estDate = new Date(created.getTime() + 3 * 24 * 60 * 60 * 1000);
    return estDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="text-center max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#E10600] flex items-center justify-center mx-auto mb-3">
          <PackageCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
          {language === 'ar' ? 'تتبع حالة شحنتك المباشرة (Track My Order)' : 'Track Your Shipment'}
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          {language === 'ar'
            ? 'تتبع فوري ومباشر لشحنات بوسطة ومايلرز ومندوب شنطتي بجميع محافظات مصر'
            : 'Real-time tracking for Bosta, Mylerz, and Shantety Express deliveries across Egypt'}
        </p>

        {/* Demo Fast Track Chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[11px] font-bold text-stone-400">
            {language === 'ar' ? 'أرقام شحنات تجريبية للمعاينة:' : 'Sample active shipments:'}
          </span>
          <button
            type="button"
            onClick={() => loadSampleOrder('SHN-2601', 'tk_bosta_2601_verified')}
            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono text-[11px] rounded-lg border border-stone-300 font-bold cursor-pointer transition-colors"
          >
            SHN-2601 (بوسطة - جاري الشحن)
          </button>
          <button
            type="button"
            onClick={() => loadSampleOrder('SHN-2602', 'tk_mylerz_2602_secure')}
            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono text-[11px] rounded-lg border border-stone-300 font-bold cursor-pointer transition-colors"
          >
            SHN-2602 (مايلرز - تم التسليم)
          </button>
        </div>
      </div>

      {/* Authenticated Tracking Form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        <form onSubmit={(e) => handleTrack(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">
                {language === 'ar' ? 'رقم الطلب أو الهاتف أو بوليصة الشحن *' : 'Order ID or Phone Number *'}
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="مثال: SHN-2601 أو 01026042168"
                className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600] font-mono uppercase"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'رمز الأمان السري (اختياري)' : 'Security Token (Optional)'}
                </label>
                <span className="text-[10px] text-stone-400 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#E10600]" />
                  <span>{language === 'ar' ? 'حماية البيانات' : 'Encrypted'}</span>
                </span>
              </div>
              <input
                type="text"
                value={trackingToken}
                onChange={(e) => setTrackingToken(e.target.value)}
                placeholder="tk_xxxxxxxxxxxx (اختياري)"
                className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600] font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-stone-500">
              {language === 'ar'
                ? 'يمكنك التتبع برقم الطلب (مثل SHN-2601) أو برقم هاتفك المسجل أثناء الطلب.'
                : 'Track using your order number (e.g. SHN-2601) or registered phone number.'}
            </p>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-[#E10600] hover:bg-[#C50500] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'استعلام وتتبع الشحنة' : 'Track Order'}</span>
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

          {/* Estimated Arrival Date & Carrier Hub Banner */}
          <div className="bg-gradient-to-r from-red-50 to-stone-50 border border-red-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-red-200 text-[#E10600] flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-stone-500 block">
                  {language === 'ar' ? 'تاريخ الوصول المتوقع (Estimated Delivery Date):' : 'Estimated Delivery Date:'}
                </span>
                <span className="text-sm font-black text-stone-900">
                  {searchedOrder.status === 'delivered'
                    ? (language === 'ar' ? '✓ تم تسليم الشحنة بنجاح للعميل' : 'Delivered Successfully')
                    : getEstimatedArrival(searchedOrder)}
                </span>
                <p className="text-[10px] text-stone-500">
                  {language === 'ar'
                    ? `إلى: ${searchedOrder.shipping_address.city}، ${searchedOrder.shipping_address.governorate} — توصيل سريع لباب المنزل`
                    : `Destination: ${searchedOrder.shipping_address.city}, ${searchedOrder.shipping_address.governorate}`}
                </p>
              </div>
            </div>

            {searchedOrder.shipping_provider && searchedOrder.tracking_number && (
              <a
                href={
                  searchedOrder.shipping_provider.toLowerCase().includes('bosta')
                    ? `https://bosta.co/tracking-shipment/?track=${searchedOrder.tracking_number}`
                    : searchedOrder.shipping_provider.toLowerCase().includes('mylerz')
                    ? `https://www.mylerz.com/tracking?track=${searchedOrder.tracking_number}`
                    : `https://wa.me/201026042168?text=${encodeURIComponent(`مرحباً، أستعلم عن شحنتي رقم ${searchedOrder.order_number} مع شركة ${searchedOrder.shipping_provider}`)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3.5 bg-stone-900 hover:bg-[#E10600] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <span>{language === 'ar' ? `تتبع عبر موقع ${searchedOrder.shipping_provider}` : `Track on ${searchedOrder.shipping_provider}`}</span>
              </a>
            )}
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
