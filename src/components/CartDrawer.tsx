import React from 'react';
import { useStore } from '../context/StoreContext';
import { OFFICIAL_BRAND } from '../data/initialData';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Truck,
  ShieldCheck,
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    language,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    cart,
    removeFromCart,
    updateCartQuantity,
    cartSubtotal,
    formatPrice,
    setCurrentView,
  } = useStore();

  if (!isCartDrawerOpen) return null;

  const freeShippingThreshold = OFFICIAL_BRAND.free_shipping_threshold;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal);
  const progressPercent = Math.min(100, Math.round((cartSubtotal / freeShippingThreshold) * 100));

  const handleCheckout = () => {
    setIsCartDrawerOpen(false);
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContinueShopping = () => {
    setIsCartDrawerOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartDrawerOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 rtl:right-auto rtl:left-0 max-w-full flex pl-3 sm:pl-10 rtl:pl-0 rtl:pr-3 sm:rtl:pr-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#E10600]" />
              <h2 className="text-base sm:text-lg font-bold text-stone-900">
                {language === 'ar' ? 'حقيبة التسوق' : 'Shopping Bag'}
              </h2>
              <span className="text-xs font-semibold text-stone-500 tabular-nums">
                ({cart.reduce((sum, i) => sum + i.quantity, 0)}{' '}
                {language === 'ar' ? 'قطع' : 'items'})
              </span>
            </div>

            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Meter */}
          <div className="bg-stone-100/90 p-4 border-b border-stone-200">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-800 mb-2">
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#E10600]" />
                {remainingForFreeShipping === 0
                  ? language === 'ar'
                    ? 'مبروك! طلبك مؤهل للشحن المجاني 🎉'
                    : 'Congratulations! You qualified for Free Delivery 🎉'
                  : language === 'ar'
                  ? `أضف ${formatPrice(remainingForFreeShipping)} إضافية للشحن المجاني`
                  : `Add ${formatPrice(remainingForFreeShipping)} more for Free Shipping`}
              </span>
              <span className="tabular-nums font-bold text-stone-600">{progressPercent}%</span>
            </div>
            <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#E10600] h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-base font-bold text-stone-800">
                    {language === 'ar' ? 'حقيبة التسوق فارغة حالياً' : 'Your bag is empty'}
                  </p>
                  <p className="text-xs text-stone-500 mt-1 max-w-xs">
                    {language === 'ar'
                      ? 'استكشفي أحدث تشكيلة من الحقائب والأحذية الراقية وأضيفي ما يعجبكِ'
                      : 'Explore our latest collection of handbags and shoes to find your favorite.'}
                  </p>
                </div>
                <button
                  onClick={handleContinueShopping}
                  className="px-6 py-2.5 bg-[#E10600] hover:bg-[#C50500] text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  {language === 'ar' ? 'تصفح التشكيلة الآن' : 'Browse Catalog'}
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const itemPrice = item.variant.sale_price || item.variant.price;
                const available = item.variant.stock_on_hand - item.variant.stock_reserved;

                return (
                  <div
                    key={item.variant_id}
                    className="flex gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200/70"
                  >
                    {/* Item Thumbnail */}
                    <div className="w-20 h-20 rounded-lg bg-white overflow-hidden shrink-0 border border-stone-200 p-1">
                      <img
                        src={item.variant.image || item.product.images[0]}
                        alt={language === 'ar' ? item.product.name_ar : item.product.name_en}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-stone-900 line-clamp-1">
                            {language === 'ar' ? item.product.name_ar : item.product.name_en}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-0.5">
                            <span className="font-mono text-[10px] text-stone-400">
                              {item.variant.sku}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.variant_id)}
                          className="text-stone-400 hover:text-[#E10600] p-1 transition-colors"
                          title={language === 'ar' ? 'حذف العنصر' : 'Remove item'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-200/50">
                        {/* Quantity Stepper */}
                        <div className="flex items-center border border-stone-300 rounded-md bg-white">
                          <button
                            onClick={() => updateCartQuantity(item.variant_id, -1)}
                            className="p-1 text-stone-600 hover:text-black hover:bg-stone-100 rounded-s transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 text-xs font-bold text-stone-800 tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.variant_id, 1)}
                            disabled={item.quantity >= available}
                            className="p-1 text-stone-600 hover:text-black hover:bg-stone-100 rounded-e disabled:opacity-30 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Line Price */}
                        <div className="text-right rtl:text-left">
                          <span className="text-xs sm:text-sm font-bold text-stone-900 tabular-nums">
                            {formatPrice(itemPrice * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Subtotal & Checkout CTA */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-stone-200 bg-stone-50 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>{language === 'ar' ? 'المجموع الفرعي للقطع' : 'Items Subtotal'}</span>
                  <span className="font-semibold text-stone-900 tabular-nums">
                    {formatPrice(cartSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>{language === 'ar' ? 'مصاريف الشحن التقديرية' : 'Estimated Shipping'}</span>
                  <span className="font-semibold text-stone-900">
                    {remainingForFreeShipping === 0
                      ? language === 'ar'
                        ? 'مجاناً'
                        : 'Free'
                      : language === 'ar'
                      ? 'تحسب في الخطوة التالية'
                      : 'Calculated at checkout'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-stone-900">
                  {language === 'ar' ? 'الإجمالي التقديري' : 'Estimated Total'}
                </span>
                <span className="text-xl font-extrabold text-[#E10600] tabular-nums">
                  {formatPrice(cartSubtotal)}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full py-3 px-4 bg-[#E10600] hover:bg-[#C50500] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{language === 'ar' ? 'متابعة إتمام الطلب' : 'Proceed to Checkout'}</span>
                {language === 'ar' ? (
                  <ArrowLeft className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {language === 'ar'
                    ? 'دفع آمن · معاينة المنتج عند الاستلام متاحة'
                    : '100% Secure Checkout · Inspection on Delivery'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
