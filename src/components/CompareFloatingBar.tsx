import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ArrowLeftRight, X, ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';

export const CompareFloatingBar: React.FC = () => {
  const {
    language,
    compareList,
    removeFromCompare,
    clearCompare,
    setIsCompareOpen,
    formatPrice,
    setCurrentView,
  } = useStore();

  const [isMinimized, setIsMinimized] = useState(false);

  if (compareList.length === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 pointer-events-none">
      <div className="max-w-4xl mx-auto pointer-events-auto">
        <div className="bg-stone-900/95 backdrop-blur-md text-white rounded-2xl border border-stone-800 shadow-2xl overflow-hidden transition-all duration-300">
          {/* Header Bar */}
          <div className="px-4 py-2.5 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E10600] animate-pulse" />
              <div className="flex items-center gap-1.5 font-bold">
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#E10600]" />
                <span>
                  {language === 'ar' ? 'مقارنة المنتجات' : 'Product Comparison'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#E10600] text-white">
                  {compareList.length} / 3
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={clearCompare}
                className="text-stone-400 hover:text-red-400 flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
                title={language === 'ar' ? 'إفراغ المقارنة' : 'Clear all'}
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {language === 'ar' ? 'إفراغ' : 'Clear'}
                </span>
              </button>

              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-stone-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                aria-label={isMinimized ? 'Expand comparison bar' : 'Minimize comparison bar'}
              >
                {isMinimized ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Body Content (Collapsible) */}
          {!isMinimized && (
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 animate-fadeIn">
              {/* Product Slot Thumbnails */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full sm:w-auto flex-1">
                {[0, 1, 2].map((index) => {
                  const product = compareList[index];
                  if (product) {
                    const price = product.base_sale_price || product.base_price;
                    return (
                      <div
                        key={product.id}
                        className="relative flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-stone-800/90 border border-stone-700/80 group"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-stone-700/60 overflow-hidden shrink-0 flex items-center justify-center p-1">
                          <img
                            src={product.images[0]}
                            alt={language === 'ar' ? product.name_ar : product.name_en}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-stone-200 truncate leading-snug">
                            {language === 'ar' ? product.name_ar : product.name_en}
                          </p>
                          <p className="text-[10px] font-bold text-[#E10600] tabular-nums mt-0.5">
                            {formatPrice(price)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCompare(product.id)}
                          className="absolute -top-1.5 -right-1.5 rtl:-right-auto rtl:-left-1.5 w-5 h-5 rounded-full bg-stone-700 hover:bg-red-600 text-stone-200 hover:text-white flex items-center justify-center text-[10px] shadow-md transition-colors cursor-pointer"
                          title={language === 'ar' ? 'حذف من المقارنة' : 'Remove'}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`empty-${index}`}
                      onClick={() => {
                        setCurrentView('shop');
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className="border border-dashed border-stone-700 hover:border-stone-500 rounded-xl p-2 flex items-center justify-center text-center text-stone-500 hover:text-stone-300 transition-colors cursor-pointer min-h-[46px] sm:min-h-[56px]"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold">
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {language === 'ar'
                            ? `إضافة منتج ${index + 1}`
                            : `Add slot ${index + 1}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Compare Action CTA */}
              <div className="w-full sm:w-auto shrink-0 flex items-center gap-2">
                <button
                  onClick={() => setIsCompareOpen(true)}
                  disabled={compareList.length < 1}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#E10600] hover:bg-[#C50500] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>
                    {language === 'ar'
                      ? `عرض المقارنة (${compareList.length})`
                      : `Compare (${compareList.length})`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
