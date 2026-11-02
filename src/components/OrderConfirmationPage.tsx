import React from 'react';
import { useStore } from '../context/StoreContext';
import {
  CheckCircle2,
  PackageCheck,
  ShieldCheck,
  Copy,
  Printer,
  ArrowRight,
  ArrowLeft,
  Truck,
  MapPin,
  Phone,
} from 'lucide-react';

export const OrderConfirmationPage: React.FC = () => {
  const { language, activeOrder, formatPrice, setCurrentView, showToast } = useStore();

  if (!activeOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-stone-900 mb-2">
          {language === 'ar' ? 'لم يتم العثور على طلب نشط' : 'No Active Order Found'}
        </h2>
        <button
          onClick={() => setCurrentView('home')}
          className="px-6 py-2.5 bg-[#E10600] text-white text-xs font-bold rounded-lg mt-4 cursor-pointer"
        >
          {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
        </button>
      </div>
    );
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(
      language === 'ar'
        ? `تم نسخ ${label} إلى الحافظة`
        : `Copied ${label} to clipboard`,
      'info'
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Success Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-10 shadow-xs text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <span className="text-xs font-bold text-[#E10600] uppercase tracking-wider">
            {language === 'ar' ? 'تم استلام وتأكيد طلبك بنجاح' : 'Order Placed Successfully'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">
            {language === 'ar' ? 'شكراً لثقتكِ بشنطتي' : 'Thank You for Choosing Shantety'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-2 max-w-lg mx-auto">
            {language === 'ar'
              ? `تم حجز مخزون القطع بنجاح وتجهيز الشحنة لدى مركز التوزيع، وسيتواصل معك مندوب شركة ${activeOrder.shipping_provider} للتسليم.`
              : `Stock is atomically reserved and your shipment is queued with ${activeOrder.shipping_provider}.`}
          </p>
        </div>

        {/* Security Credentials Banner */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 text-left rtl:text-right space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
            <div>
              <span className="text-[11px] font-bold text-stone-500 block">
                {language === 'ar' ? 'رقم الطلب الرسمي:' : 'Official Order Number:'}
              </span>
              <span className="text-lg font-mono font-black text-stone-900">
                {activeOrder.order_number}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(activeOrder.order_number, language === 'ar' ? 'رقم الطلب' : 'Order Number')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-[#E10600] px-3 py-1.5 rounded-lg border border-stone-300 bg-white cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'نسخ رقم الطلب' : 'Copy Order #'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-stone-500 block">
                {language === 'ar' ? 'رمز التتبع السري المشفر (Tracking Token):' : 'Secret Security Tracking Token:'}
              </span>
              <span className="text-xs font-mono font-bold text-[#E10600] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                {activeOrder.tracking_token}
              </span>
              <p className="text-[10px] text-stone-400 mt-1">
                {language === 'ar'
                  ? '🔒 تنبيه أمان: يتطلب نظام شنطتي رمز التتبع السري مع رقم الطلب للوصول لتفاصيل الشحنة حمايةً لخصوصيتك.'
                  : '🔒 Security rule: Order number alone never exposes private customer details.'}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(activeOrder.tracking_token || '', language === 'ar' ? 'رمز التتبع' : 'Tracking Token')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-[#E10600] px-3 py-1.5 rounded-lg border border-stone-300 bg-white cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'نسخ رمز الأمان' : 'Copy Token'}</span>
            </button>
          </div>
        </div>

        {/* Receipt Line Items */}
        <div className="text-left rtl:text-right border border-stone-200 rounded-xl overflow-hidden">
          <div className="bg-stone-100/75 px-5 py-3 border-b border-stone-200 text-xs font-bold text-stone-800">
            {language === 'ar' ? 'محتويات الشحنة المحجوزة' : 'Reserved Shipment Items'}
          </div>
          <div className="p-4 space-y-3 divide-y divide-stone-100">
            {activeOrder.items.map((item) => (
              <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-stone-50 border border-stone-200 p-1">
                    <img
                      src={item.image}
                      alt={item.product_name_en}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">
                      {language === 'ar' ? item.product_name_ar : item.product_name_en}
                    </h4>
                    <p className="text-[10px] text-stone-500 font-mono">
                      {item.sku} · {language === 'ar' ? item.color_name_ar : item.color_name_en} ·{' '}
                      {language === 'ar' ? item.size_name_ar : item.size_name_en}
                    </p>
                  </div>
                </div>

                <div className="text-right rtl:text-left">
                  <span className="text-xs font-bold text-stone-900 tabular-nums">
                    {formatPrice(item.total_price)}
                  </span>
                  <span className="text-[10px] text-stone-400 block tabular-nums">
                    ({item.quantity} × {formatPrice(item.unit_price)})
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-stone-50 p-4 border-t border-stone-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>{language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
              <span className="font-semibold text-stone-900 tabular-nums">
                {formatPrice(activeOrder.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>{language === 'ar' ? 'مصاريف التوصيل:' : 'Shipping Fee:'}</span>
              <span className="font-semibold text-stone-900 tabular-nums">
                {activeOrder.shipping_fee === 0
                  ? language === 'ar'
                    ? 'مجاناً'
                    : 'Free'
                  : formatPrice(activeOrder.shipping_fee)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-stone-900 border-t border-stone-200 pt-2">
              <span>{language === 'ar' ? 'المبلغ المستحق للدفع:' : 'Total Payable:'}</span>
              <span className="text-[#E10600] tabular-nums">{formatPrice(activeOrder.total)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Details Snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-left rtl:text-right">
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1">
            <span className="font-bold text-stone-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#E10600]" />
              {language === 'ar' ? 'عنوان التوصيل:' : 'Delivery Address:'}
            </span>
            <p className="text-stone-900 font-semibold">{activeOrder.customer_name}</p>
            <p className="text-stone-600">
              {activeOrder.shipping_address.street_address}
              {activeOrder.shipping_address.building_floor
                ? `، ${activeOrder.shipping_address.building_floor}`
                : ''}
            </p>
            <p className="text-stone-600">
              {activeOrder.shipping_address.city}، {activeOrder.shipping_address.governorate}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1">
            <span className="font-bold text-stone-700 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#E10600]" />
              {language === 'ar' ? 'تفاصيل الشحن والدفع:' : 'Shipping & Payment:'}
            </span>
            <p className="text-stone-900 font-semibold">
              {language === 'ar' ? 'شركة الشحن: ' : 'Carrier: '}
              {activeOrder.shipping_provider} ({activeOrder.tracking_number})
            </p>
            <p className="text-stone-600">
              {language === 'ar' ? 'طريقة الدفع: ' : 'Payment Method: '}
              {activeOrder.payment_method === 'cod'
                ? language === 'ar'
                  ? 'الدفع نقداً عند الاستلام'
                  : 'Cash on Delivery'
                : language === 'ar'
                ? 'بطاقة إلكترونية / محفظة'
                : 'Online Card / Wallet'}
            </p>
            <p className="text-stone-600 font-mono flex items-center gap-1">
              <Phone className="w-3 h-3 text-stone-400" />
              {activeOrder.customer_phone}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-stone-200">
          <button
            onClick={() => setCurrentView('order-tracking')}
            className="flex-1 py-3 px-4 bg-[#E10600] hover:bg-[#C50500] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <PackageCheck className="w-4 h-4" />
            <span>{language === 'ar' ? 'الانتقال لصفحة تتبع الشحنة' : 'Track Shipment Status'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="py-3 px-4 border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'ar' ? 'طباعة إيصال الطلب' : 'Print Receipt'}</span>
          </button>

          <button
            onClick={() => setCurrentView('shop')}
            className="py-3 px-4 border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{language === 'ar' ? 'مواصلة التسوق' : 'Continue Shopping'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
