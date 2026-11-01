import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { INITIAL_CATEGORIES, INITIAL_BRANDS, INITIAL_COLORS } from '../data/initialData';
import { SlidersHorizontal, X, Search, RotateCcw } from 'lucide-react';

export const ShopPage: React.FC = () => {
  const {
    language,
    products,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
  } = useStore();

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName =
            p.name_ar.toLowerCase().includes(q) || p.name_en.toLowerCase().includes(q);
          const matchDesc =
            p.description_ar.toLowerCase().includes(q) || p.description_en.toLowerCase().includes(q);
          const matchSku = p.variants?.some((v) => v.sku.toLowerCase().includes(q));
          if (!matchName && !matchDesc && !matchSku) return false;
        }

        // Category filter
        if (selectedCategory && p.category_id !== selectedCategory) {
          return false;
        }

        // Brand filter
        if (selectedBrand && p.brand_id !== selectedBrand) {
          return false;
        }

        // Color filter
        if (selectedColor && !p.variants?.some((v) => v.color_id === selectedColor)) {
          return false;
        }

        // In Stock filter
        if (inStockOnly) {
          const totalStock = (p.variants || []).reduce(
            (sum, v) => sum + Math.max(0, v.stock_on_hand - v.stock_reserved),
            0
          );
          if (totalStock <= 0) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = a.base_sale_price || a.base_price;
        const priceB = b.base_sale_price || b.base_price;

        if (sortBy === 'price-asc') return priceA - priceB;
        if (sortBy === 'price-desc') return priceB - priceA;
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        // Featured
        return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      });
  }, [products, searchQuery, selectedCategory, selectedBrand, selectedColor, inStockOnly, sortBy]);

  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSelectedColor(null);
    setInStockOnly(false);
    setSearchQuery('');
    setSortBy('featured');
  };

  const hasActiveFilters = Boolean(
    selectedCategory || selectedBrand || selectedColor || inStockOnly || searchQuery
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
            {language === 'ar' ? 'كتالوج شنطتي الشامل' : 'Shantety Product Catalog'}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            {language === 'ar'
              ? `عرض ${filteredProducts.length} من أصل ${products.length} قطعة متوفرة في المخزن`
              : `Showing ${filteredProducts.length} of ${products.length} available pieces`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Filter Trigger */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="md:hidden py-2 px-3 border border-stone-300 rounded-lg text-xs font-bold text-stone-700 flex items-center gap-1.5 cursor-pointer bg-white"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#E10600]" />
            <span>{language === 'ar' ? 'الفلاتر والفرز' : 'Filters'}</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#E10600]" />
            )}
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
            <span className="hidden sm:inline text-stone-500">
              {language === 'ar' ? 'ترتيب حسب:' : 'Sort by:'}
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-2 px-3 border border-stone-300 rounded-lg text-xs font-bold bg-white focus:outline-none focus:border-[#E10600]"
            >
              <option value="featured">
                {language === 'ar' ? 'المميز والموصى به' : 'Featured & Bestsellers'}
              </option>
              <option value="newest">
                {language === 'ar' ? 'أحدث الموديلات' : 'Newest Arrivals'}
              </option>
              <option value="price-asc">
                {language === 'ar' ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}
              </option>
              <option value="price-desc">
                {language === 'ar' ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid with Desktop Sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Desktop Sidebar (cols-3) */}
        <aside className="hidden md:block md:col-span-3 space-y-6 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs sticky top-24">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#E10600]" />
              <span>{language === 'ar' ? 'تصفية النتائج' : 'Filter Products'}</span>
            </h3>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-[11px] text-[#E10600] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{language === 'ar' ? 'إعادة ضبط' : 'Reset'}</span>
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              {language === 'ar' ? 'الفئات' : 'Categories'}
            </h4>
            <div className="space-y-1 text-xs">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-start py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                  selectedCategory === null
                    ? 'bg-red-50 text-[#E10600] font-bold'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                {language === 'ar' ? 'جميع الفئات' : 'All Categories'}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-start py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                    selectedCategory === cat.id
                      ? 'bg-red-50 text-[#E10600] font-bold'
                      : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span>{language === 'ar' ? cat.name_ar : cat.name_en}</span>
                  <span className="text-[10px] text-stone-400 tabular-nums">
                    ({cat.item_count})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Filter */}
          <div className="space-y-2 pt-3 border-t border-stone-100">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              {language === 'ar' ? 'اللون' : 'Color'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {INITIAL_COLORS.map((col) => {
                const isSelected = selectedColor === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => setSelectedColor(isSelected ? null : col.id)}
                    className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#E10600] scale-115 ring-2 ring-red-100'
                        : 'border-stone-300 hover:border-stone-600'
                    }`}
                    style={{ backgroundColor: col.hex }}
                    title={language === 'ar' ? col.name_ar : col.name_en}
                  />
                );
              })}
            </div>
          </div>

          {/* In Stock Toggle */}
          <div className="pt-3 border-t border-stone-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded text-[#E10600] focus:ring-[#E10600]"
              />
              <span>
                {language === 'ar' ? 'المتوفر في المخزن فقط' : 'In-Stock Items Only'}
              </span>
            </label>
          </div>
        </aside>

        {/* Product Grid (cols-9) */}
        <main className="col-span-1 md:col-span-9">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-stone-900">
                {language === 'ar' ? 'لم نتمكن من إيجاد منتجات مطابقة' : 'No Matching Products Found'}
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {language === 'ar'
                  ? 'جرّبي تغيير كلمات البحث أو إزالة بعض الفلاتر لعرض المزيد من الموديلات.'
                  : 'Try adjusting your search criteria or resetting filters to see more items.'}
              </p>
              <button
                onClick={resetFilters}
                className="px-5 py-2.5 bg-[#E10600] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                {language === 'ar' ? 'عرض كافة منتجات شنطتي' : 'Reset All Filters'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            onClick={() => setMobileFilterOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />
          <div className="relative ml-auto rtl:ml-0 rtl:mr-auto w-72 sm:w-80 max-w-[88vw] bg-white h-full p-5 sm:p-6 shadow-xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <h3 className="text-base font-bold text-stone-900">
                  {language === 'ar' ? 'الفلاتر والخيارات' : 'Filters'}
                </h3>
                <button onClick={() => setMobileFilterOpen(false)}>
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'الفئات' : 'Categories'}
                </h4>
                <div className="space-y-1 text-xs">
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setMobileFilterOpen(false);
                    }}
                    className="w-full text-start py-2 px-3 rounded-lg hover:bg-stone-100"
                  >
                    {language === 'ar' ? 'كافة الفئات' : 'All Categories'}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setMobileFilterOpen(false);
                      }}
                      className={`w-full text-start py-2 px-3 rounded-lg ${
                        selectedCategory === cat.id ? 'bg-red-50 text-[#E10600] font-bold' : ''
                      }`}
                    >
                      {language === 'ar' ? cat.name_ar : cat.name_en}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setMobileFilterOpen(false)}
              className="w-full py-3 bg-[#E10600] text-white text-xs font-bold rounded-xl mt-6 cursor-pointer"
            >
              {language === 'ar' ? 'تطبيق الفلاتر' : 'Apply Filters'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
