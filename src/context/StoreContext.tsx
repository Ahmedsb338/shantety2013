import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Language,
  Product,
  ProductVariant,
  Order,
} from '../types/ecommerce';
import { StoreDatabase } from '../services/storeDatabase';
import { OFFICIAL_BRAND } from '../data/initialData';

export interface CartItem {
  variant_id: string;
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export type StoreView =
  | 'home'
  | 'shop'
  | 'categories'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'order-confirmation'
  | 'order-tracking'
  | 'account'
  | 'wishlist'
  | 'about'
  | 'contact'
  | 'faq'
  | 'shipping-policy'
  | 'returns-policy'
  | 'admin';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface StoreContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  currentView: StoreView;
  setCurrentView: (view: StoreView) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  activeOrder: Order | null;
  setActiveOrder: (order: Order | null) => void;
  cart: CartItem[];
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  addToCart: (product: Product, variant: ProductVariant, quantity?: number) => boolean;
  removeFromCart: (variant_id: string) => void;
  updateCartQuantity: (variant_id: string, delta: number) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartCount: number;
  wishlist: string[]; // product IDs
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (catId: string | null) => void;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  formatPrice: (amount: number) => string;
  products: Product[];
  refreshProducts: () => void;
  compareList: Product[];
  addToCompare: (product: Product) => boolean;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  isComparing: (productId: string) => boolean;
  isCompareOpen: boolean;
  setIsCompareOpen: (open: boolean) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('shanaty_lang') as Language) || 'ar';
  });
  const [currentView, setCurrentView] = useState<StoreView>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('shanaty_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('shanaty_wishlist');
      return saved ? JSON.parse(saved) : ['prod-monogram-bow-bag'];
    } catch {
      return ['prod-monogram-bow-bag'];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [products, setProducts] = useState<Product[]>(() => StoreDatabase.getProducts());
  const [compareList, setCompareList] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('shanaty_compare');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('shanaty_compare', JSON.stringify(compareList));
    } catch {}
  }, [compareList]);

  const refreshProducts = () => {
    setProducts(StoreDatabase.getProducts());
  };

  useEffect(() => {
    localStorage.setItem('shanaty_lang', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // Sync catalog and orders with Cloud SQL / PostgreSQL backend on mount
  useEffect(() => {
    StoreDatabase.syncFromServer().then(() => {
      setProducts(StoreDatabase.getProducts());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('shanaty_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('shanaty_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 4);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToCart = (product: Product, variant: ProductVariant, quantity = 1): boolean => {
    const available = variant.stock_on_hand - variant.stock_reserved;
    const existingIndex = cart.findIndex((item) => item.variant_id === variant.id);
    const existingQty = existingIndex >= 0 ? cart[existingIndex].quantity : 0;

    if (existingQty + quantity > available) {
      showToast(
        language === 'ar'
          ? `عذراً، أقصى كمية متاحة لهذا المقاس/اللون هي ${available} قطع`
          : `Sorry, maximum available stock for this variant is ${available}`,
        'error'
      );
      return false;
    }

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += quantity;
      setCart(updated);
    } else {
      setCart([...cart, { variant_id: variant.id, product, variant, quantity }]);
    }

    showToast(
      language === 'ar'
        ? `تمت إضافة "${product.name_ar}" إلى حقيبة التسوق بنجاح`
        : `Added "${product.name_en}" to your shopping bag`,
      'success'
    );
    return true;
  };

  const removeFromCart = (variant_id: string) => {
    setCart((prev) => prev.filter((item) => item.variant_id !== variant_id));
  };

  const updateCartQuantity = (variant_id: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.variant_id === variant_id) {
            const newQty = item.quantity + delta;
            const available = item.variant.stock_on_hand - item.variant.stock_reserved;
            if (newQty > available) {
              showToast(
                language === 'ar'
                  ? `الكمية المتاحة ${available} فقط`
                  : `Only ${available} available in stock`,
                'error'
              );
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartSubtotal = cart.reduce((sum, item) => {
    const price = item.variant.sale_price || item.variant.price;
    return sum + price * item.quantity;
  }, 0);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      const updated = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      showToast(
        exists
          ? language === 'ar'
            ? 'تمت الإزالة من قائمة الرغبات'
            : 'Removed from wishlist'
          : language === 'ar'
          ? 'تمت الإضافة إلى قائمة الرغبات'
          : 'Added to wishlist',
        'info'
      );
      return updated;
    });
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  const addToCompare = (product: Product): boolean => {
    if (compareList.some((p) => p.id === product.id)) {
      removeFromCompare(product.id);
      return false;
    }
    if (compareList.length >= 3) {
      showToast(
        language === 'ar'
          ? 'الحد الأقصى للمقارنة هو 3 منتجات. يرجى حذف منتج لإضافة غيره.'
          : 'You can compare up to 3 products at a time. Remove an item to add another.',
        'info'
      );
      return false;
    }
    setCompareList((prev) => [...prev, product]);
    showToast(
      language === 'ar'
        ? `تمت إضافة "${product.name_ar}" إلى المقارنة (${compareList.length + 1} من 3)`
        : `Added "${product.name_en}" to comparison (${compareList.length + 1} of 3)`,
      'success'
    );
    return true;
  };

  const removeFromCompare = (productId: string) => {
    setCompareList((prev) => {
      const filtered = prev.filter((p) => p.id !== productId);
      return filtered;
    });
    showToast(
      language === 'ar' ? 'تمت إزالة المنتج من المقارنة' : 'Removed from comparison',
      'info'
    );
  };

  const clearCompare = () => {
    setCompareList([]);
    setIsCompareOpen(false);
    showToast(
      language === 'ar' ? 'تم إفراغ قائمة المقارنة' : 'Comparison list cleared',
      'info'
    );
  };

  const isComparing = (productId: string) => compareList.some((p) => p.id === productId);

  const formatPrice = (amount: number) => {
    const formatted = new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-EG', {
      maximumFractionDigits: 0,
    }).format(amount);
    return language === 'ar'
      ? `${formatted} ${OFFICIAL_BRAND.currency_ar}`
      : `${formatted} ${OFFICIAL_BRAND.currency}`;
  };

  return (
    <StoreContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        currentView,
        setCurrentView,
        selectedProduct,
        setSelectedProduct,
        activeOrder,
        setActiveOrder,
        cart,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartSubtotal,
        cartCount,
        wishlist,
        toggleWishlist,
        isInWishlist,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        toasts,
        showToast,
        removeToast,
        formatPrice,
        products,
        refreshProducts,
        compareList,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isComparing,
        isCompareOpen,
        setIsCompareOpen,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
