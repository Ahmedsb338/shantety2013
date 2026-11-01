import React, { useState, useMemo } from 'react';
import { Product } from '../types/ecommerce';
import { useStore } from '../context/StoreContext';
import { StoreDatabase } from '../services/storeDatabase';
import { INITIAL_CATEGORIES, INITIAL_BRANDS, INITIAL_COLORS, INITIAL_SIZES } from '../data/initialData';
import {
  X,
  ArrowLeftRight,
  Star,
  CheckCircle2,
  ShoppingBag,
  Truck,
  RotateCcw,
  ShieldCheck,
  Plus,
  Trash2,
  Eye,
  Check,
} from 'lucide-react';

export const ProductComparisonModal: React.FC = () => {
  const {
    language,
    compareList,
    removeFromCompare,
    clearCompare,
    isCompareOpen,
    setIsCompareOpen,
    formatPrice,
    addToCart,
    setSelectedProduct,
    setCurrentView,
    products,
    showToast,
    addToCompare,
  } = useStore();

  const [highlightDifferences, setHighlightDifferences] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  if (!isCompareOpen) return null;

  // Available products in catalog that are not currently in the comparison
  const availableToAdd = products.filter(
    (p) => !compareList.some((cp) => cp.id === p.id)
  );

  // Grouped comparison helper
  const getCategoryName = (catId: string) => {
    const c = INITIAL_CATEGORIES.find((cat) => cat.id === catId);
    return c ? (language === 'ar' ? c.name_ar : c.name_en) : 'Shantety';
  };

  const getBrandName = (brandId: string) => {
    const b = INITIAL_BRANDS.find((brand) => brand.id === brandId);
    return b ? b.name : 'Shantety Official';
  };

  const checkDifferent = (values: (string | number | boolean)[]) => {
    if (values.length <= 1) return false;
    const first = values[0];
    return values.some((v) => v !== first);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCompareOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog Card */}
      <div className="relative bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-stone-200 flex flex-wrap items-center justify-between gap-4 bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E10600]/10 flex items-center justify-center text-[#E10600]">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-stone-900">
                  {language === 'ar' ? 'مقارنة المنتجات جنباً إلى جنب' : 'Side-by-Side Product Comparison'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E10600] text-white">
                  {compareList.length} / 3
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {language === 'ar'
                  ? 'قارني حتى 3 قطع بمواصفاتها الدقيقة، خاماتها، وأسعارها لاتخاذ القرار الأنسب'
                  : 'Compare up to 3 products side-by-side by specs, materials, and pricing'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Highlight Differences Toggle */}
            <button
              onClick={() => setHighlightDifferences(!highlightDifferences)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                highlightDifferences
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${highlightDifferences ? 'bg-amber-600' : 'bg-stone-300'}`} />
              <span>{language === 'ar' ? 'تمييز الفروق' : 'Highlight Differences'}</span>
            </button>

            {/* Clear All */}
            {compareList.length > 0 && (
              <button
                onClick={clearCompare}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1 cursor-pointer"
                title={language === 'ar' ? 'مسح الكل' : 'Clear all'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'ar' ? 'مسح الكل' : 'Clear'}</span>
              </button>
            )}

            {/* Close */}
            <button
              onClick={() => setIsCompareOpen(false)}
              className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Container (Scrollable) */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6">
          {compareList.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ArrowLeftRight className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="text-base font-bold text-stone-800">
                {language === 'ar' ? 'قائمة المقارنة فارغة حالياً' : 'Your comparison list is empty'}
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {language === 'ar'
                  ? 'اضغطي على أيقونة المقارنة في بطاقة أي منتج لإضافته ومقارنته بالموديلات الأخرى'
                  : 'Click the compare icon on any product card to add items to compare'}
              </p>
              <button
                onClick={() => {
                  setIsCompareOpen(false);
                  setCurrentView('shop');
                }}
                className="py-2.5 px-5 rounded-xl bg-[#E10600] text-white text-xs font-bold cursor-pointer hover:bg-[#C50500] transition-colors"
              >
                {language === 'ar' ? 'تصفح منتجات الكتالوج' : 'Browse Catalog'}
              </button>
            </div>
          ) : (
            <div className="min-w-[680px]">
              {/* Product Cards Row (Top Fixed) */}
              <div className="grid grid-cols-4 gap-4 pb-6 border-b border-stone-200 sticky top-0 bg-white z-20">
                {/* Column 0: Label Header */}
                <div className="flex flex-col justify-end p-2 text-xs font-bold text-stone-500">
                  <span>{language === 'ar' ? 'المنتجات المختارة:' : 'Selected Products:'}</span>
                </div>

                {/* Columns 1, 2, 3: Products */}
                {[0, 1, 2].map((slotIndex) => {
                  const product = compareList[slotIndex];
                  if (product) {
                    const price = product.base_sale_price || product.base_price;
                    const primaryVariant = product.variants?.[0];
                    const hasVariants = (product.variants?.length || 0) > 1;

                    return (
                      <div
                        key={product.id}
                        className="relative bg-stone-50/80 rounded-2xl border border-stone-200 p-3 sm:p-4 flex flex-col justify-between group"
                      >
                        {/* Remove Button */}
                        <button
                          onClick={() => removeFromCompare(product.id)}
                          className="absolute top-2.5 right-2.5 rtl:right-auto rtl:left-2.5 w-6 h-6 rounded-full bg-white hover:bg-red-500 hover:text-white text-stone-400 border border-stone-200 flex items-center justify-center text-xs shadow-xs transition-colors cursor-pointer"
                          title={language === 'ar' ? 'حذف من المقارنة' : 'Remove item'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        {/* Image */}
                        <div
                          onClick={() => {
                            setSelectedProduct(product);
                            setCurrentView('product-detail');
                            setIsCompareOpen(false);
                          }}
                          className="w-full aspect-square bg-white rounded-xl overflow-hidden border border-stone-200/60 p-2 cursor-pointer group-hover:shadow-xs transition-shadow"
                        >
                          <img
                            src={product.images[0]}
                            alt={language === 'ar' ? product.name_ar : product.name_en}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        {/* Title & Price */}
                        <div className="mt-3 space-y-1">
                          <h4
                            onClick={() => {
                              setSelectedProduct(product);
                              setCurrentView('product-detail');
                              setIsCompareOpen(false);
                            }}
                            className="text-xs sm:text-sm font-bold text-stone-900 line-clamp-2 cursor-pointer hover:text-[#E10600] transition-colors leading-snug"
                          >
                            {language === 'ar' ? product.name_ar : product.name_en}
                          </h4>

                          <div className="flex items-baseline gap-2 pt-0.5">
                            <span className="text-sm sm:text-base font-extrabold text-[#E10600] tabular-nums">
                              {formatPrice(price)}
                            </span>
                            {product.base_sale_price && product.base_sale_price < product.base_price && (
                              <span className="text-[11px] text-stone-400 line-through tabular-nums">
                                {formatPrice(product.base_price)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action CTA */}
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => {
                              if (hasVariants) {
                                setSelectedProduct(product);
                                setCurrentView('product-detail');
                                setIsCompareOpen(false);
                              } else if (primaryVariant) {
                                addToCart(product, primaryVariant, 1);
                              }
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#E10600] hover:bg-[#C50500] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>
                              {hasVariants
                                ? language === 'ar' ? 'تحديد الخيارات' : 'Select Options'
                                : language === 'ar' ? 'شراء' : 'Add to Cart'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Empty Slot
                  return (
                    <div
                      key={`empty-col-${slotIndex}`}
                      className="border-2 border-dashed border-stone-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 bg-stone-50/40"
                    >
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                        <Plus className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-stone-700">
                        {language === 'ar' ? `خانة مقارنة فارغة (${slotIndex + 1})` : `Empty Slot (${slotIndex + 1})`}
                      </p>
                      <p className="text-[11px] text-stone-400 max-w-[140px]">
                        {language === 'ar'
                          ? 'أضيفي قطعة أخرى لمقارنة أدق'
                          : 'Add another item for richer comparison'}
                      </p>
                      <button
                        onClick={() => setIsPickerOpen(true)}
                        className="py-1.5 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        {language === 'ar' ? '+ اختيار منتج' : '+ Pick Item'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Specification Table Comparison Matrix */}
              <div className="divide-y divide-stone-100 text-xs">
                {/* 1. Category & Brand */}
                <div
                  className={`grid grid-cols-4 py-3.5 px-2 transition-colors ${
                    highlightDifferences &&
                    checkDifferent(compareList.map((p) => p.category_id))
                      ? 'bg-amber-50/60 font-semibold'
                      : 'hover:bg-stone-50/50'
                  }`}
                >
                  <div className="font-bold text-stone-500">
                    {language === 'ar' ? 'التصنيف والفئة' : 'Category'}
                  </div>
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="text-stone-800 font-medium">
                      {compareList[idx] ? getCategoryName(compareList[idx].category_id) : '—'}
                    </div>
                  ))}
                </div>

                <div
                  className={`grid grid-cols-4 py-3.5 px-2 transition-colors ${
                    highlightDifferences &&
                    checkDifferent(compareList.map((p) => p.brand_id))
                      ? 'bg-amber-50/60 font-semibold'
                      : 'hover:bg-stone-50/50'
                  }`}
                >
                  <div className="font-bold text-stone-500">
                    {language === 'ar' ? 'العلامة التجارية' : 'Brand Label'}
                  </div>
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="text-stone-800 font-medium">
                      {compareList[idx] ? getBrandName(compareList[idx].brand_id) : '—'}
                    </div>
                  ))}
                </div>

                {/* 2. Rating & Reviews */}
                <div
                  className={`grid grid-cols-4 py-3.5 px-2 transition-colors ${
                    highlightDifferences &&
                    checkDifferent(
                      compareList.map(
                        (p) => StoreDatabase.calculateRatingSummary(p.id).averageRating
                      )
                    )
                      ? 'bg-amber-50/60 font-semibold'
                      : 'hover:bg-stone-50/50'
                  }`}
                >
                  <div className="font-bold text-stone-500">
                    {language === 'ar' ? 'التقييم العام والمراجعات' : 'Customer Rating'}
                  </div>
                  {[0, 1, 2].map((idx) => {
                    const p = compareList[idx];
                    if (!p) return <div key={idx}>—</div>;
                    const summary = StoreDatabase.calculateRatingSummary(p.id);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-1 font-bold text-stone-900">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{summary.averageRating} / 5</span>
                          <span className="text-[11px] text-stone-400 font-normal">
                            ({summary.totalReviews})
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>
                            {language === 'ar'
                              ? `${summary.recommendationRate}% يوصون به`
                              : `${summary.recommendationRate}% recommend`}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 3. Materials & Craftsmanship */}
                <div
                  className={`grid grid-cols-4 py-3.5 px-2 transition-colors ${
                    highlightDifferences &&
                    checkDifferent(compareList.map((p) => p.materials_ar))
                      ? 'bg-amber-50/60 font-semibold'
                      : 'hover:bg-stone-50/50'
                  }`}
                >
                  <div className="font-bold text-stone-500">
                    {language === 'ar' ? 'الخامات والمصنعية' : 'Materials & Craft'}
                  </div>
                  {[0, 1, 2].map((idx) => {
                    const p = compareList[idx];
                    if (!p) return <div key={idx}>—</div>;
                    return (
                      <div key={idx} className="text-stone-700 leading-relaxed text-[11px] pr-2 rtl:pr-0 rtl:pl-2">
                        {language === 'ar' ? p.materials_ar : p.materials_en}
                      </div>
                    );
                  })}
                </div>

                {/* 4. Dimensions & Sizes */}
                <div
                  className={`grid grid-cols-4 py-3.5 px-2 transition-colors ${
                    highlightDifferences &&
                    checkDifferent(compareList.map((p) => p.dimensions || 'Standard'))
                      ? 'bg-amber-50/60 font-semibold'
                      : 'hover:bg-stone-50/50'
                  }`}
                >
                  <div className="font-bold text-stone-500">
                    {language === 'ar' ? 'المقاسات والأبعاد' : 'Dimensions & Fit'}
                  </div>
                  {[0, 1, 2].map((idx) => {
                    const p = compareList[idx];
                    if (!p) return <div key={idx}>—</div>;
                    const sizeIds = Array.from(new Set(p.variants?.map((v) => v.size_id) || []));
                    const sizes = INITIAL_SIZES.filter((s) => sizeIds.includes(s.id));
                    return (
                      <div key={idx} className="space-y-1.5">
                        {p.dimensions && (
                          <p className="font-mono text-stone-800 text-[11px] font-semibold">
                            {p.dimensions}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {sizes.map((s) => (
                            <span
                              key={s.id}
                              className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-bold"
                            >
                              {language === 'ar' ? s.name_ar : s.name_en}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 5. Available Colors */}
                <div className="grid grid-cols-4 py-3.5 px-2 hover:bg-stone-50/50 transition-colors">
                  <div className="font-bold text-stone-500">
                    {language === 'ar' ? 'خيارات الألوان' : 'Color Options'}
                  </div>
                  {[0, 1, 2].map((idx) => {
                    const p = compareList[idx];
                    if (!p) return <div key={idx}>—</div>;
                    const colorIds = Array.from(new Set(p.variants?.map((v) => v.color_id) || []));
                    const colors = INITIAL_COLORS.filter((c) => colorIds.includes(c.id));
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {colors.map((c) => (
                            <span
                              key={c.id}
                              title={language === 'ar' ? c.name_ar : c.name_en}
                              className="w-4 h-4 rounded-full border border-stone-300 shadow-2xs"
                              style={{ backgroundColor: c.hex }}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] text-stone-500 font-medium">
                          {colors.map((c) => (language === 'ar' ? c.name_ar : c.name_en)).join('، ')}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* 6. Stock Availability */}
                <div
                  className={`grid grid-cols-4 py-3.5 px-2 transition-colors ${
                    highlightDifferences &&
                    checkDifferent(
                      compareList.map((p) => {
                        const totalStock = (p.variants || []).reduce(
                          (sum, v) => sum + Math.max(0, v.stock_on_hand - v.stock_reserved),
                          0
                        );
                        return totalStock > 0;
                      })
                    )
                      ? 'bg-amber-50/60 font-semibold'
                      : 'hover:bg-stone-50/50'
                  }`}
                >
                  <div className="font-bold text-stone-500">
                    {language === 'ar' ? 'المخزون والتوفر' : 'Stock Status'}
                  </div>
                  {[0, 1, 2].map((idx) => {
                    const p = compareList[idx];
                    if (!p) return <div key={idx}>—</div>;
                    const totalStock = (p.variants || []).reduce(
                      (sum, v) => sum + Math.max(0, v.stock_on_hand - v.stock_reserved),
                      0
                    );
                    const isAvailable = totalStock > 0;

                    return (
                      <div key={idx}>
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>
                              {language === 'ar' ? 'متوفر للتسليم الفوري' : 'In Stock'}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-500 border border-stone-200">
                            <span>{language === 'ar' ? 'نفد من المخزن' : 'Out of Stock'}</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 7. Shipping & Guarantees */}
                <div className="grid grid-cols-4 py-3.5 px-2 hover:bg-stone-50/50 transition-colors">
                  <div className="font-bold text-stone-500">
                    {language === 'ar' ? 'الضمان والشحن' : 'Delivery & Warranty'}
                  </div>
                  {[0, 1, 2].map((idx) => {
                    const p = compareList[idx];
                    if (!p) return <div key={idx}>—</div>;
                    return (
                      <div key={idx} className="space-y-1 text-[11px] text-stone-600">
                        <div className="flex items-center gap-1 text-emerald-700 font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'معاينة قبل الدفع' : 'Inspect before paying'}</span>
                        </div>
                        <p>{language === 'ar' ? 'استبدال خلال 14 يوماً' : '14-Day Free Exchange'}</p>
                        <p>{language === 'ar' ? 'شحن لجميع المحافظات' : 'All Governorates Delivery'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Add Product Picker (Modal inside Modal) */}
        {isPickerOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div
              onClick={() => setIsPickerOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-2xs"
            />
            <div className="relative bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="text-sm font-bold text-stone-900">
                  {language === 'ar' ? 'اختيار منتج لإضافته للمقارنة' : 'Select Product to Compare'}
                </h3>
                <button onClick={() => setIsPickerOpen(false)}>
                  <X className="w-4 h-4 text-stone-400" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {availableToAdd.length === 0 ? (
                  <p className="text-xs text-stone-500 text-center py-6">
                    {language === 'ar' ? 'جميع المنتجات مضافة بالفعل' : 'All items are already in comparison'}
                  </p>
                ) : (
                  availableToAdd.map((p) => {
                    const price = p.base_sale_price || p.base_price;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          addToCompare(p);
                          setIsPickerOpen(false);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 hover:border-[#E10600] hover:bg-red-50/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0 p-1">
                            <img
                              src={p.images[0]}
                              alt={language === 'ar' ? p.name_ar : p.name_en}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-stone-900 group-hover:text-[#E10600] transition-colors line-clamp-1">
                              {language === 'ar' ? p.name_ar : p.name_en}
                            </h4>
                            <span className="text-[11px] font-bold text-[#E10600] tabular-nums">
                              {formatPrice(price)}
                            </span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-lg bg-stone-100 group-hover:bg-[#E10600] group-hover:text-white text-[11px] font-bold text-stone-700 transition-colors">
                          + {language === 'ar' ? 'إضافة' : 'Add'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
