import React from 'react';
import { Product } from '../types/ecommerce';
import { useStore } from '../context/StoreContext';
import { INITIAL_CATEGORIES, INITIAL_COLORS } from '../data/initialData';
import { Heart, ShoppingBag, Eye, Star, ArrowLeftRight } from 'lucide-react';
import { StoreDatabase } from '../services/storeDatabase';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    language,
    formatPrice,
    setSelectedProduct,
    setCurrentView,
    addToCart,
    toggleWishlist,
    isInWishlist,
    addToCompare,
    isComparing,
  } = useStore();

  const category = INITIAL_CATEGORIES.find((c) => c.id === product.category_id);
  const primaryVariant = product.variants?.[0];
  const hasVariants = (product.variants?.length || 0) > 1;

  // Calculate pricing & discount
  const originalPrice = product.base_price;
  const currentPrice = product.base_sale_price || product.base_price;
  const hasDiscount = Boolean(product.base_sale_price && product.base_sale_price < product.base_price);
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  // Available stock calculation
  const totalAvailableStock = (product.variants || []).reduce(
    (sum, v) => sum + Math.max(0, v.stock_on_hand - v.stock_reserved),
    0
  );
  const isOutOfStock = totalAvailableStock <= 0;

  // Collect unique colors
  const colorIds = Array.from(new Set(product.variants?.map((v) => v.color_id) || []));
  const availableColors = INITIAL_COLORS.filter((c) => colorIds.includes(c.id));

  const handleOpenDetail = () => {
    setSelectedProduct(product);
    setCurrentView('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasVariants) {
      handleOpenDetail();
    } else if (primaryVariant) {
      addToCart(product, primaryVariant, 1);
    }
  };

  return (
    <div
      onClick={handleOpenDetail}
      className="group relative flex flex-col bg-white rounded-xl border border-stone-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer"
    >
      {/* Visual Slot: 70% Card Height */}
      <div className="relative aspect-square w-full bg-[#F5F4F0] overflow-hidden">
        <img
          src={product.images[0]}
          alt={language === 'ar' ? product.name_ar : product.name_en}
          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* Quiet Discount Badge / Stock Badge */}
        <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 flex flex-col gap-1 z-10">
          {hasDiscount && (
            <span className="bg-[#E10600] text-white text-[11px] font-bold px-2 py-0.5 rounded tracking-tight shadow-xs">
              {language === 'ar' ? `خصم ${discountPercent}%` : `-${discountPercent}%`}
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-stone-900 text-white text-[11px] font-medium px-2 py-0.5 rounded">
              {language === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}
            </span>
          )}
        </div>

        {/* Action Stack (Wishlist & Compare) */}
        <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3 flex flex-col gap-1.5 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            className="p-2 rounded-full bg-white/90 hover:bg-white text-stone-700 hover:text-[#E10600] transition-colors shadow-xs cursor-pointer"
            title={language === 'ar' ? 'أضف لقائمة الرغبات' : 'Add to Wishlist'}
          >
            <Heart
              className={`w-4 h-4 ${
                isInWishlist(product.id) ? 'fill-[#E10600] text-[#E10600]' : ''
              }`}
            />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCompare(product);
            }}
            className={`p-2 rounded-full transition-all shadow-xs cursor-pointer ${
              isComparing(product.id)
                ? 'bg-[#E10600] text-white hover:bg-[#C50500]'
                : 'bg-white/90 hover:bg-white text-stone-700 hover:text-[#E10600]'
            }`}
            title={
              isComparing(product.id)
                ? language === 'ar' ? 'مضاف للمقارنة (حذف)' : 'In comparison (Remove)'
                : language === 'ar' ? 'مقارنة هذا المنتج (حتى 3 قطع)' : 'Compare product'
            }
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* Hover Action Bar */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
          <button
            onClick={handleQuickAdd}
            disabled={isOutOfStock}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-colors ${
              isOutOfStock
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                : 'bg-[#18181B] hover:bg-[#E10600] text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>
              {isOutOfStock
                ? language === 'ar'
                  ? 'غير متوفر'
                  : 'Sold Out'
                : hasVariants
                ? language === 'ar'
                  ? 'اختيار الخيارات'
                  : 'Select Options'
                : language === 'ar'
                ? 'إضافة سريعة'
                : 'Quick Add'}
            </span>
          </button>
          <button
            onClick={handleOpenDetail}
            className="p-2 rounded-lg bg-white/90 hover:bg-white text-stone-800 shadow-md transition-colors"
            title={language === 'ar' ? 'معاينة التفاصيل' : 'View Details'}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Content Block */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Unboxed Metadata & Rating */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 uppercase tracking-wider mb-1">
            <span>{category ? (language === 'ar' ? category.name_ar : category.name_en) : 'Shantety'}</span>
            {(() => {
              const summary = StoreDatabase.calculateRatingSummary(product.id);
              if (summary.totalReviews === 0) return null;
              return (
                <div className="flex items-center gap-1 font-bold text-stone-800">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{summary.averageRating}</span>
                  <span className="text-stone-400 font-normal">({summary.totalReviews})</span>
                </div>
              );
            })()}
          </div>

          {/* Product Name */}
          <h3 className="text-sm sm:text-base font-bold text-stone-900 group-hover:text-[#E10600] transition-colors line-clamp-2 leading-snug">
            {language === 'ar' ? product.name_ar : product.name_en}
          </h3>
        </div>

        {/* Color preview swatches */}
        {availableColors.length > 0 && (
          <div className="flex items-center gap-1.5">
            {availableColors.map((color) => (
              <span
                key={color.id}
                title={language === 'ar' ? color.name_ar : color.name_en}
                className="w-3.5 h-3.5 rounded-full border border-stone-300/80 shadow-2xs"
                style={{ backgroundColor: color.hex }}
              />
            ))}
            {availableColors.length > 1 && (
              <span className="text-[11px] text-stone-600 font-medium ml-1 rtl:mr-1">
                {availableColors.length} {language === 'ar' ? 'ألوان' : 'tones'}
              </span>
            )}
          </div>
        )}

        {/* Pricing Baseline with Tabular Figures */}
        <div className="pt-2 border-t border-stone-100 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-extrabold text-stone-900 tabular-nums">
              {formatPrice(currentPrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-stone-600 line-through tabular-nums">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>

          <span className="text-[11px] text-stone-600 font-medium">
            {totalAvailableStock > 5
              ? language === 'ar'
                ? 'متوفر بالمخزن'
                : 'In Stock'
              : totalAvailableStock > 0
              ? language === 'ar'
                ? `متبقي ${totalAvailableStock} فقط`
                : `Only ${totalAvailableStock} left`
              : language === 'ar'
              ? 'نفذ'
              : 'Sold out'}
          </span>
        </div>
      </div>
    </div>
  );
};
