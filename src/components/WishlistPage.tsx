import React from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { Heart, ShoppingBag } from 'lucide-react';

export const WishlistPage: React.FC = () => {
  const { language, wishlist, products, setCurrentView } = useStore();

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8 border-b border-stone-200 pb-5">
        <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E10600] flex items-center justify-center">
          <Heart className="w-5 h-5 fill-[#E10600]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-stone-900">
            {language === 'ar' ? 'قائمة الرغبات والمفضلات' : 'Saved Wishlist'}
          </h1>
          <p className="text-xs text-stone-500">
            {language === 'ar'
              ? `لديكِ ${wishlistProducts.length} قطعة محفوظة في قائمتكِ الخاصة`
              : `${wishlistProducts.length} items saved in your personal wishlist`}
          </p>
        </div>
      </div>

      {wishlistProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-stone-900">
            {language === 'ar' ? 'قائمة الرغبات فارغة' : 'Your Wishlist is Empty'}
          </h3>
          <p className="text-xs text-stone-500">
            {language === 'ar'
              ? 'احفظي القطع المفضلة لديكِ للرجوع إليها وشرائها في أي وقت.'
              : 'Save items you love to revisit and order them anytime.'}
          </p>
          <button
            onClick={() => setCurrentView('shop')}
            className="px-6 py-2.5 bg-[#E10600] text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            {language === 'ar' ? 'استعراض المنتجات' : 'Browse Products'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
