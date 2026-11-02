import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { StoreDatabase } from '../services/storeDatabase';
import { EGYPTIAN_GOVERNORATES, OFFICIAL_BRAND } from '../data/initialData';
import { PaymentMethod } from '../types/ecommerce';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const {
    language,
    cart,
    cartSubtotal,
    formatPrice,
    clearCart,
    setCurrentView,
    setActiveOrder,
    showToast,
  } = useStore();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedGov, setSelectedGov] = useState('القاهرة');
  const [city, setCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [buildingFloor, setBuildingFloor] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic shipping calculation
  const govData = EGYPTIAN_GOVERNORATES.find(
    (g) => g.name_ar === selectedGov || g.name_en === selectedGov
  );
  let shippingFee = govData ? govData.fee : 65;
  if (cartSubtotal >= OFFICIAL_BRAND.free_shipping_threshold) {
    shippingFee = 0;
  }
  const grandTotal = cartSubtotal + shippingFee;

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-stone-900 mb-2">
          {language === 'ar' ? 'لا توجد منتجات في حقيبة التسوق' : 'Your cart is empty'}
        </h2>
        <p className="text-xs text-stone-500 mb-6">
          {language === 'ar'
            ? 'يرجى اختيار بعض القطع الفاخرة قبل متابعة الدفع'
            : 'Please add items before proceeding to checkout.'}
        </p>
        <button
          onClick={() => setCurrentView('shop')}
          className="px-6 py-2.5 bg-[#E10600] text-white text-xs font-bold rounded-lg"
        >
          {language === 'ar' ? 'الذهاب للمتجر' : 'Return to Shop'}
        </button>
      </div>
    );
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const rawCartItems = cart.map((item) => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
    }));

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: fullName.trim(),
          customer_phone: phone.trim(),
          customer_email: email.trim() || undefined,
          shipping_address: {
            id: 'addr-' + Date.now(),
            customer_name: fullName.trim(),
            phone: phone.trim(),
            governorate: selectedGov,
            city: city.trim(),
            street_address: streetAddress.trim(),
            building_floor: buildingFloor.trim() || undefined,
            notes: deliveryNotes.trim() || undefined,
            is_default: true,
          },
          payment_method: paymentMethod,
          notes: deliveryNotes.trim() || undefined,
          cartItems: rawCartItems,
        }),
      });

      const result = await response.json();
      setIsSubmitting(false);

      if (!response.ok || !result.success || !result.order) {
        const err = language === 'ar' ? result.error_ar : result.error_en;
        setErrorMessage(err || (language === 'ar' ? 'فشل إتمام الطلب' : 'Failed to place order'));
        showToast(err || 'Order submission error', 'error');
        return;
      }

      // Success: Clear cart, set active order, and navigate to confirmation
      clearCart();
      setActiveOrder(result.order);
      setCurrentView('order-confirmation');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setIsSubmitting(false);
      const networkMsg = language === 'ar'
        ? 'حدث خطأ في الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.'
        : 'Network error communicating with server.';
      setErrorMessage(networkMsg);
      showToast(networkMsg, 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-3xl mx-auto mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
          {language === 'ar' ? 'إتمام الطلب السريع والآمن' : 'Express Secure Checkout'}
        </h1>
        <p className="text-xs text-stone-500 mt-1 flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {language === 'ar'
              ? 'معاينة المنتجات متاحة عند الاستلام · بياناتك مشفرة ومحمية بنسبة 100%'
              : 'Product inspection on delivery · 100% Encrypted & Protected'}
          </span>
        </p>
      </div>

      {errorMessage && (
        <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Customer and Delivery Information (cols-7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Customer Contact Info */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3">
              <span className="w-5 h-5 rounded-full bg-[#E10600] text-white flex items-center justify-center text-[10px] font-black">
                1
              </span>
              <span>{language === 'ar' ? 'بيانات العميل والتواصل' : 'Customer Details'}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'الاسم بالكامل *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: فاطمة إبراهيم' : 'e.g. Fatima Ibrahim'}
                  className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'رقم الهاتف المصري *' : 'Egyptian Mobile Number *'}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] font-mono"
                />
                <span className="text-[10px] text-stone-400">
                  {language === 'ar' ? '11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015' : '11 digits starting with 01x'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">
                {language === 'ar' ? 'البريد الإلكتروني (اختياري لاستلام الفاتورة)' : 'Email Address (Optional)'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600]"
              />
            </div>
          </div>

          {/* Section 2: Egyptian Delivery Address */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3">
              <span className="w-5 h-5 rounded-full bg-[#E10600] text-white flex items-center justify-center text-[10px] font-black">
                2
              </span>
              <span>{language === 'ar' ? 'عنوان التوصيل في مصر' : 'Egyptian Delivery Address'}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'المحافظة *' : 'Governorate *'}
                </label>
                <select
                  value={selectedGov}
                  onChange={(e) => setSelectedGov(e.target.value)}
                  className="w-full text-xs p-3 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#E10600]"
                >
                  {EGYPTIAN_GOVERNORATES.map((gov) => (
                    <option key={gov.name_en} value={gov.name_ar}>
                      {language === 'ar' ? gov.name_ar : gov.name_en} — {gov.fee} EGP ({gov.delivery_days_min}-{gov.delivery_days_max} أيام)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'المدينة / الحي / المنطقة *' : 'City / District *'}
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: المعادي / التجمع الخامس / سموحة' : 'e.g. Maadi, Heliopolis, Smouha'}
                  className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">
                {language === 'ar' ? 'اسم الشارع والتفاصيل *' : 'Street Address *'}
              </label>
              <input
                type="text"
                required
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: شارع النصر، متفرع من اللاسلكي' : 'e.g. El-Nasr St, Near Metro Station'}
                className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'رقم العمارة والدور والشقة' : 'Building, Floor & Apartment'}
                </label>
                <input
                  type="text"
                  value={buildingFloor}
                  onChange={(e) => setBuildingFloor(e.target.value)}
                  placeholder={language === 'ar' ? 'عمارة 15، الدور الثالث، شقة 6' : 'Bldg 15, Floor 3, Apt 6'}
                  className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'ملاحظات لمندوب الشحن' : 'Delivery Notes'}
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'الاتصال قبل المجيء بساعة' : 'Call 1 hour before arrival'}
                  className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Payment Method */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3">
              <span className="w-5 h-5 rounded-full bg-[#E10600] text-white flex items-center justify-center text-[10px] font-black">
                3
              </span>
              <span>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</span>
            </h2>

            <div className="space-y-3">
              {/* Option 1: COD */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-[#E10600] bg-red-50/20'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1 text-[#E10600] focus:ring-[#E10600]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-[#E10600]" />
                    <span className="text-xs font-bold text-stone-900">
                      {language === 'ar'
                        ? 'الدفع عند الاستلام (Cash on Delivery) - مجاناً بدون رسوم إضافية'
                        : 'Cash on Delivery (COD) - Free with no added fees'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    {language === 'ar'
                      ? 'ادفع نقداً لمندوب الشحن بعد استلام ومعاينة طلبك بكل ثقة وراحة.'
                      : 'Pay cash to courier after inspecting your order at your doorstep.'}
                  </p>
                </div>
              </label>

              {/* Option 2: Paymob Online Card */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'card_paymob'
                    ? 'border-[#E10600] bg-red-50/20'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'card_paymob'}
                  onChange={() => setPaymentMethod('card_paymob')}
                  className="mt-1 text-[#E10600] focus:ring-[#E10600]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#E10600]" />
                    <span className="text-xs font-bold text-stone-900">
                      {language === 'ar'
                        ? 'البطاقات البنكية (Visa / MasterCard / ميزة عبر بوابة Paymob)'
                        : 'Credit / Debit Cards (Visa, MasterCard, Meeza via Paymob)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    {language === 'ar'
                      ? 'دفع فوري مشفر بأعلى معايير أمان 3D Secure وبنوك البنك المركزي المصري.'
                      : 'Encrypted checkout supporting local Meeza and international cards.'}
                  </p>
                </div>
              </label>

              {/* Option 3: Smart Wallets / InstaPay */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'instapay_vodafone'
                    ? 'border-[#E10600] bg-red-50/20'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'instapay_vodafone'}
                  onChange={() => setPaymentMethod('instapay_vodafone')}
                  className="mt-1 text-[#E10600] focus:ring-[#E10600]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#E10600]" />
                    <span className="text-xs font-bold text-stone-900">
                      {language === 'ar'
                        ? 'المحافظ الإلكترونية (فودافون كاش / إنستاباي InstaPay / أورنج كاش)'
                        : 'Mobile Wallets & InstaPay (Vodafone Cash, Orange, InstaPay)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    {language === 'ar'
                      ? 'تحويل فوري مباشر وآمن من أي محفظة هاتف ذكي في مصر.'
                      : 'Direct instant payment from any Egyptian mobile wallet.'}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Place Order (cols-5) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center justify-between">
              <span>{language === 'ar' ? 'ملخص مشترياتك' : 'Order Summary'}</span>
              <span className="text-xs font-semibold text-stone-500 tabular-nums">
                ({cart.reduce((s, i) => s + i.quantity, 0)} {language === 'ar' ? 'قطع' : 'items'})
              </span>
            </h2>

            {/* Items mini list */}
            <div className="max-h-60 overflow-y-auto space-y-3 divide-y divide-stone-100 pr-1">
              {cart.map((item) => {
                const itemPrice = item.variant.sale_price || item.variant.price;
                return (
                  <div key={item.variant_id} className="pt-3 first:pt-0 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-stone-50 border border-stone-200 p-1 shrink-0">
                      <img
                        src={item.variant.image || item.product.images[0]}
                        alt={item.product.name_en}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-stone-900 truncate">
                        {language === 'ar' ? item.product.name_ar : item.product.name_en}
                      </h4>
                      <p className="text-[10px] text-stone-500">
                        {language === 'ar' ? 'الكمية:' : 'Qty:'} {item.quantity} ·{' '}
                        <span className="font-mono">{item.variant.sku}</span>
                      </p>
                    </div>
                    <span className="text-xs font-bold text-stone-900 tabular-nums">
                      {formatPrice(itemPrice * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Calculations */}
            <div className="pt-3 border-t border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>{language === 'ar' ? 'مجموع المنتجات' : 'Subtotal'}</span>
                <span className="font-semibold text-stone-900 tabular-nums">
                  {formatPrice(cartSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-stone-400" />
                  <span>
                    {language === 'ar' ? 'الشحن إلى' : 'Shipping to'}{' '}
                    {language === 'ar' ? selectedGov : govData?.name_en}
                  </span>
                </span>
                <span className="font-semibold text-stone-900 tabular-nums">
                  {shippingFee === 0
                    ? language === 'ar'
                      ? 'مجاناً'
                      : 'FREE'
                    : formatPrice(shippingFee)}
                </span>
              </div>
              {shippingFee === 0 && (
                <p className="text-[11px] text-emerald-800 font-medium">
                  {language === 'ar'
                    ? '✓ مؤهل للشحن المجاني (طلب فوق 1,500 ج.م)'
                    : '✓ Free delivery applied'}
                </p>
              )}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-stone-200 flex justify-between items-baseline">
              <div>
                <span className="text-sm font-bold text-stone-900">
                  {language === 'ar' ? 'الإجمالي النهائي المطلوب' : 'Grand Total'}
                </span>
                <p className="text-[10px] text-stone-600">
                  {language === 'ar' ? 'شامل ضريبة القيمة المضافة والتوصيل' : 'Inclusive of all taxes'}
                </p>
              </div>
              <span className="text-2xl font-black text-[#E10600] tabular-nums">
                {formatPrice(grandTotal)}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-[#E10600] hover:bg-[#C50500] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{language === 'ar' ? 'جاري حجز المخزون وتأكيد الطلب...' : 'Reserving stock...'}</span>
              ) : (
                <>
                  <span>
                    {paymentMethod === 'cod'
                      ? language === 'ar'
                        ? 'تأكيد الطلب مع الدفع عند الاستلام'
                        : 'Confirm Order (Pay on Delivery)'
                      : language === 'ar'
                      ? 'متابعة الدفع الإلكتروني الآمن'
                      : 'Pay Securely Online'}
                  </span>
                  {language === 'ar' ? (
                    <ArrowLeft className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </>
              )}
            </button>

            <div className="text-[11px] text-stone-600 text-center space-y-1">
              <p className="flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {language === 'ar'
                    ? 'يتم حجز مخزون القطع تلقائياً عند التأكيد'
                    : 'Stock is reserved atomically upon confirmation'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
