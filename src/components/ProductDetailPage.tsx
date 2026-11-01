import React, { useState, useEffect } from 'react';
import { Product, ProductVariant } from '../types/ecommerce';
import { useStore } from '../context/StoreContext';
import { INITIAL_COLORS, INITIAL_SIZES, INITIAL_CATEGORIES } from '../data/initialData';
import {
  ShoppingBag,
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  Check,
  Minus,
  Plus,
  ArrowRight,
  ArrowLeft,
  Share2,
  Star,
  CheckCircle2,
  ArrowLeftRight,
} from 'lucide-react';
import { CustomerReviews } from './CustomerReviews';
import { StoreDatabase } from '../services/storeDatabase';

interface ProductDetailPageProps {
  product: Product;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ product }) => {
  const {
    language,
    formatPrice,
    addToCart,
    toggleWishlist,
    isInWishlist,
    setCurrentView,
    showToast,
    addToCompare,
    isComparing,
    setIsCompareOpen,
  } = useStore();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColorId, setSelectedColorId] = useState<string>(() => {
    return product.variants?.[0]?.color_id || 'col-beige';
  });
  const [selectedSizeId, setSelectedSizeId] = useState<string>(() => {
    return product.variants?.[0]?.size_id || 'sz-free';
  });
  const [quantity, setQuantity] = useState(1);

  // Available colors and sizes from this product's actual variants
  const availableColorIds = Array.from(new Set(product.variants?.map((v) => v.color_id) || []));
  const availableColors = INITIAL_COLORS.filter((c) => availableColorIds.includes(c.id));

  // Variants matching current color
  const variantsForCurrentColor = product.variants?.filter((v) => v.color_id === selectedColorId) || [];
  const availableSizeIds = Array.from(new Set(variantsForCurrentColor.map((v) => v.size_id)));
  const availableSizes = INITIAL_SIZES.filter((s) => availableSizeIds.includes(s.id));

  // Current active variant
  const activeVariant: ProductVariant | undefined = product.variants?.find(
    (v) => v.color_id === selectedColorId && v.size_id === selectedSizeId
  ) || variantsForCurrentColor[0] || product.variants?.[0];

  useEffect(() => {
    // If the currently selected size is not valid for this newly selected color, reset to first available size
    if (activeVariant && activeVariant.size_id !== selectedSizeId) {
      setSelectedSizeId(activeVariant.size_id);
    }
  }, [selectedColorId]);

  const category = INITIAL_CATEGORIES.find((c) => c.id === product.category_id);
  const availableStock = activeVariant
    ? Math.max(0, activeVariant.stock_on_hand - activeVariant.stock_reserved)
    : 0;
  const isOutOfStock = availableStock <= 0;

  const currentPrice = activeVariant?.sale_price || activeVariant?.price || product.base_sale_price || product.base_price;
  const originalPrice = product.base_price;
  const hasDiscount = Boolean(product.base_sale_price && product.base_sale_price < product.base_price);

  const handleAddToCart = () => {
    if (!activeVariant || isOutOfStock) return;
    addToCart(product, activeVariant, quantity);
  };

  const handleBuyNow = () => {
    if (!activeVariant || isOutOfStock) return;
    addToCart(product, activeVariant, quantity);
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: language === 'ar' ? product.name_ar : product.name_en,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast(
        language === 'ar' ? 'تم نسخ رابط المنتج بنجاح' : 'Product link copied to clipboard',
        'info'
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-medium text-stone-500 mb-6">
        <button
          onClick={() => setCurrentView('home')}
          className="hover:text-stone-900 transition-colors"
        >
          {language === 'ar' ? 'الرئيسية' : 'Home'}
        </button>
        <span>/</span>
        <button
          onClick={() => setCurrentView('shop')}
          className="hover:text-stone-900 transition-colors"
        >
          {language === 'ar' ? 'المتجر' : 'Shop'}
        </button>
        <span>/</span>
        <span className="text-stone-900 font-bold truncate max-w-xs">
          {language === 'ar' ? product.name_ar : product.name_en}
        </span>
      </nav>

      {/* Contiguous Purchase Module: Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
        {/* Gallery Zone (Sticky only on Large Desktop) */}
        <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-3 sm:gap-4 lg:sticky lg:top-24">
          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex md:flex-col gap-2 sm:gap-3 shrink-0 overflow-x-auto md:overflow-y-auto max-h-[500px] py-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 bg-white p-1 transition-all shrink-0 cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-[#E10600] ring-2 ring-[#E10600]/20'
                      : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main Visual Frame */}
          <div className="relative flex-1 aspect-square rounded-2xl bg-[#F5F4F0] border border-stone-200/90 overflow-hidden p-4 sm:p-6 flex items-center justify-center">
            <img
              src={product.images[activeImageIndex] || product.images[0]}
              alt={language === 'ar' ? product.name_ar : product.name_en}
              className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
              referrerPolicy="no-referrer"
            />

            {/* Badges */}
            <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4 flex flex-col gap-1.5">
              {hasDiscount && (
                <span className="bg-[#E10600] text-white text-xs font-black px-2.5 py-1 rounded shadow-sm">
                  {language === 'ar' ? 'خصم حصري' : 'Sale'}
                </span>
              )}
            </div>

            {/* Action buttons (Share, Compare, Wishlist) */}
            <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 sm:p-2.5 rounded-full bg-white/90 hover:bg-white text-stone-700 shadow-2xs transition-colors cursor-pointer"
                title={language === 'ar' ? 'مشاركة المنتج' : 'Share'}
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => addToCompare(product)}
                className={`p-2 sm:p-2.5 rounded-full shadow-2xs transition-all cursor-pointer ${
                  isComparing(product.id)
                    ? 'bg-[#E10600] text-white'
                    : 'bg-white/90 hover:bg-white text-stone-700 hover:text-[#E10600]'
                }`}
                title={
                  isComparing(product.id)
                    ? language === 'ar' ? 'في قائمة المقارنة (إزالة)' : 'In comparison'
                    : language === 'ar' ? 'إضافة للمقارنة (حتى 3 قطع)' : 'Compare'
                }
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => toggleWishlist(product.id)}
                className="p-2 sm:p-2.5 rounded-full bg-white/90 hover:bg-white text-stone-700 hover:text-[#E10600] shadow-2xs transition-colors cursor-pointer"
                title={language === 'ar' ? 'أضف لقائمة الرغبات' : 'Wishlist'}
              >
                <Heart
                  className={`w-4 h-4 ${
                    isInWishlist(product.id) ? 'fill-[#E10600] text-[#E10600]' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Purchase Module Zone (Right, cols-5) */}
        <div className="lg:col-span-5 flex flex-col space-y-5 sm:space-y-6">
          {/* Header & Category */}
          <div className="border-b border-stone-200 pb-4 sm:pb-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              <span>{category ? (language === 'ar' ? category.name_ar : category.name_en) : 'Shantety'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-stone-400">
                {activeVariant?.sku || 'SHN-CAT-01'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-stone-900 leading-tight">
              {language === 'ar' ? product.name_ar : product.name_en}
            </h1>

            {/* Customer Rating Summary Badge (Click to scroll) */}
            {(() => {
              const summary = StoreDatabase.calculateRatingSummary(product.id);
              return (
                <div
                  onClick={() => {
                    const el = document.getElementById('customer-reviews-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="mt-2.5 inline-flex flex-wrap items-center gap-2 cursor-pointer group"
                >
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= Math.round(summary.averageRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-stone-200 text-stone-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-stone-800 group-hover:text-[#E10600] transition-colors">
                    {summary.averageRating}
                  </span>
                  <span className="text-xs text-stone-400 group-hover:underline">
                    ({summary.totalReviews} {language === 'ar' ? 'تقييم' : 'reviews'})
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{language === 'ar' ? 'شراء مؤكد' : 'Verified'}</span>
                  </span>
                </div>
              );
            })()}

            {/* Price block */}
            <div className="mt-3 sm:mt-4 flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#E10600] tabular-nums">
                {formatPrice(currentPrice)}
              </span>
              {hasDiscount && (
                <span className="text-sm sm:text-base text-stone-400 line-through tabular-nums">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Color Selector */}
          {availableColors.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-stone-800">
                  {language === 'ar' ? 'اختر اللون:' : 'Select Color:'}
                </span>
                <span className="text-stone-500 font-medium">
                  {language === 'ar'
                    ? INITIAL_COLORS.find((c) => c.id === selectedColorId)?.name_ar
                    : INITIAL_COLORS.find((c) => c.id === selectedColorId)?.name_en}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {availableColors.map((color) => {
                  const isSelected = selectedColorId === color.id;
                  return (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColorId(color.id)}
                      className={`relative w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'border-[#E10600] scale-110 shadow-xs ring-2 ring-red-100'
                          : 'border-stone-300 hover:border-stone-500'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={language === 'ar' ? color.name_ar : color.name_en}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow-md stroke-[3]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {availableSizes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-stone-800">
                  {language === 'ar' ? 'المقاس المتاح:' : 'Available Size:'}
                </span>
                <span className="text-stone-500 font-medium">
                  {language === 'ar' ? 'مقاس قياسي مريح' : 'Standard Fit'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => {
                  const isSelected = selectedSizeId === size.id;
                  return (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSizeId(size.id)}
                      className={`min-h-[40px] px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#18181B] text-white border-[#18181B] shadow-xs'
                          : 'bg-white text-stone-700 border-stone-300 hover:border-stone-800'
                      }`}
                    >
                      {language === 'ar' ? size.name_ar : size.name_en}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & Stock Status */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center border border-stone-300 rounded-lg bg-white p-1">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 text-stone-600 hover:text-black hover:bg-stone-100 rounded transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 sm:px-4 text-xs sm:text-sm font-bold text-stone-900 tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                  disabled={quantity >= availableStock}
                  className="p-2 text-stone-600 hover:text-black hover:bg-stone-100 rounded disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-xs text-end">
                {isOutOfStock ? (
                  <span className="font-bold text-[#E10600]">
                    {language === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}
                  </span>
                ) : availableStock <= 5 ? (
                  <span className="text-amber-800 font-semibold">
                    {language === 'ar'
                      ? `متبقي ${availableStock} قطع بالمخزن`
                      : `Only ${availableStock} left in stock`}
                  </span>
                ) : (
                  <span className="text-emerald-800 font-semibold flex items-center gap-1 justify-end">
                    <Check className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'متوفر بالمخزن وجاهز للشحن' : 'In Stock'}</span>
                  </span>
                )}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="w-full sm:flex-1 py-3.5 px-5 rounded-xl font-bold text-xs sm:text-sm bg-white border-2 border-stone-900 hover:bg-stone-900 hover:text-white text-stone-900 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {language === 'ar' ? 'إضافة إلى حقيبة التسوق' : 'Add to Shopping Bag'}
                </span>
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="w-full sm:flex-1 py-3.5 px-5 rounded-xl font-bold text-xs sm:text-sm bg-[#E10600] hover:bg-[#C50500] text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                <span>{language === 'ar' ? 'شراء الآن (إتمام فوري)' : 'Instant Buy Now'}</span>
                {language === 'ar' ? (
                  <ArrowLeft className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Compare Bar Trigger */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => addToCompare(product)}
                className={`inline-flex items-center gap-2 py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                  isComparing(product.id)
                    ? 'bg-[#E10600]/10 text-[#E10600] border border-[#E10600]/30'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-transparent'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>
                  {isComparing(product.id)
                    ? language === 'ar'
                      ? '✓ مضاف للمقارنة (اضغط للإزالة)'
                      : '✓ Added to Compare (Click to remove)'
                    : language === 'ar'
                    ? 'مقارنة هذه القطعة بموديلات أخرى'
                    : 'Compare with other models'}
                </span>
              </button>

              {isComparing(product.id) && (
                <button
                  type="button"
                  onClick={() => setIsCompareOpen(true)}
                  className="font-bold text-[#E10600] hover:underline cursor-pointer"
                >
                  {language === 'ar' ? 'فتح جدول المقارنة ➔' : 'Open Comparison Table ➔'}
                </button>
              )}
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="pt-4 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#E10600] shrink-0" />
              <span>
                {language === 'ar' ? 'توصيل سريع لكافة المحافظات' : 'Fast Delivery in Egypt'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#E10600] shrink-0" />
              <span>
                {language === 'ar' ? 'معاينة واستبدال خلال 14 يوماً' : '14-Day Free Exchange'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#E10600] shrink-0" />
              <span>
                {language === 'ar' ? 'دفع عند الاستلام بعد المعاينة' : 'Cash on Delivery Available'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#E10600] shrink-0" />
              <span>
                {language === 'ar' ? 'جودة وتصنيع شنطتي المعتمد' : '100% Genuine Shantety'}
              </span>
            </div>
          </div>

          {/* Description & Specifications */}
          <div className="pt-4 border-t border-stone-200 space-y-3">
            <h3 className="text-sm font-bold text-stone-900">
              {language === 'ar' ? 'وصف وتفاصيل القطعة' : 'Product Details & Specs'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {language === 'ar' ? product.description_ar : product.description_en}
            </p>

            <div className="bg-stone-50 rounded-xl p-3.5 space-y-2 text-xs border border-stone-200/80">
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">
                  {language === 'ar' ? 'الخامات والمصنعية:' : 'Materials:'}
                </span>
                <span className="text-stone-800 font-semibold text-right rtl:text-left max-w-[60%]">
                  {language === 'ar' ? product.materials_ar : product.materials_en}
                </span>
              </div>
              {product.dimensions && (
                <div className="flex justify-between border-t border-stone-200/60 pt-2">
                  <span className="text-stone-500 font-medium">
                    {language === 'ar' ? 'المقاسات والأبعاد:' : 'Dimensions:'}
                  </span>
                  <span className="text-stone-800 font-semibold">{product.dimensions}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews & Ratings Section */}
      <CustomerReviews product={product} />
    </div>
  );
};

