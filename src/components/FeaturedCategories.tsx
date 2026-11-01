import React from 'react';
import { useStore } from '../context/StoreContext';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export const FeaturedCategories: React.FC = () => {
  const { language, setCurrentView, setSelectedCategory, categories } = useStore();

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentView('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="py-12 border-b border-stone-200/80 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-[#E10600] uppercase tracking-wider">
              {language === 'ar' ? 'تصنيفات شنطتي' : 'Curated Categories'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">
              {language === 'ar' ? 'تصفحي حسب الفئة' : 'Explore by Category'}
            </h2>
          </div>

          <button
            onClick={() => {
              setSelectedCategory(null);
              setCurrentView('shop');
            }}
            className="text-xs font-bold text-[#E10600] hover:text-[#C50500] flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span>{language === 'ar' ? 'عرض الكتالوج بالكامل' : 'View Full Catalog'}</span>
            {language === 'ar' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => handleSelectCategory(category.id)}
              className="group relative rounded-2xl bg-[#F8F7F4] border border-stone-200/70 p-4 flex flex-col justify-between overflow-hidden cursor-pointer hover:border-[#E10600] transition-all hover:shadow-md"
            >
              <div className="aspect-square rounded-xl bg-white p-2 mb-3 overflow-hidden flex items-center justify-center">
                <img
                  src={category.image}
                  alt={language === 'ar' ? category.name_ar : category.name_en}
                  className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div>
                <h3 className="text-sm font-bold text-stone-900 group-hover:text-[#E10600] transition-colors line-clamp-1">
                  {language === 'ar' ? category.name_ar : category.name_en}
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                  {category.item_count} {language === 'ar' ? 'موديل متوفر' : 'Models available'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
