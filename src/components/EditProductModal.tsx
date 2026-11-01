import React, { useState } from 'react';
import { Product, ProductVariant } from '../types/ecommerce';
import { INITIAL_CATEGORIES, INITIAL_BRANDS, INITIAL_COLORS, INITIAL_SIZES } from '../data/initialData';
import { StoreDatabase } from '../services/storeDatabase';
import {
  X,
  Save,
  Image,
  Upload,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface EditProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedProduct: Product) => void;
  language: 'ar' | 'en';
}

const PRESET_PRODUCT_IMAGES = [
  { label: 'حقيبة كلاسيكية مونوغرام بفيونكة', url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__2__6b416ddc.png' },
  { label: 'طقم ملكي نبيتي مجدول', url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_22AM_4da4df52.png' },
  { label: 'حذاء لوفر محبوك كونياك', url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_31AM_9b62411e.png' },
  { label: 'حذاء موكاسان مونوغرام هافان', url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_31AM__1__be443320.png' },
  { label: 'حقيبة توت عاجية منسوجة', url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__1__7a9eb38c.png' },
  { label: 'سليبر جلد طبيعي هافان', url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM_788c6b20.png' },
];

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onSaved,
  language,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'general' | 'variants' | 'images'>('general');

  // Form state initialized from existing product
  const [nameAr, setNameAr] = useState(product.name_ar);
  const [nameEn, setNameEn] = useState(product.name_en);
  const [slug, setSlug] = useState(product.slug);
  const [categoryId, setCategoryId] = useState(product.category_id);
  const [brandId, setBrandId] = useState(product.brand_id);
  const [basePrice, setBasePrice] = useState(product.base_price.toString());
  const [baseSalePrice, setBaseSalePrice] = useState(product.base_sale_price ? product.base_sale_price.toString() : '');
  const [descriptionAr, setDescriptionAr] = useState(product.description_ar);
  const [descriptionEn, setDescriptionEn] = useState(product.description_en);
  const [materialsAr, setMaterialsAr] = useState(product.materials_ar || '');
  const [materialsEn, setMaterialsEn] = useState(product.materials_en || '');
  const [dimensions, setDimensions] = useState(product.dimensions || '');
  const [isFeatured, setIsFeatured] = useState(!!product.is_featured);
  const [isNewArrival, setIsNewArrival] = useState(!!product.is_new_arrival);
  const [isBestSeller, setIsBestSeller] = useState(!!product.is_best_seller);

  // Images state
  const [images, setImages] = useState<string[]>(product.images && product.images.length > 0 ? [...product.images] : ['/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__2__6b416ddc.png']);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Variants state
  const [variants, setVariants] = useState<ProductVariant[]>(
    product.variants ? JSON.parse(JSON.stringify(product.variants)) : []
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg(language === 'ar' ? 'يرجى اختيار ملف صورة صالح' : 'Please upload a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setImages((prev) => [dataUrl, ...prev]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setImages((prev) => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    if (images.length <= 1) {
      setErrorMsg(language === 'ar' ? 'يجب الإبقاء على صورة واحدة على الأقل للمنتج' : 'At least one image is required');
      return;
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetMainImage = (index: number) => {
    const selected = images[index];
    const rest = images.filter((_, i) => i !== index);
    setImages([selected, ...rest]);
  };

  // Variant editing
  const handleVariantChange = (
    variantId: string,
    field: 'price' | 'sale_price' | 'stock_on_hand' | 'sku',
    value: string | number
  ) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id === variantId) {
          return {
            ...v,
            [field]:
              field === 'sku'
                ? String(value)
                : field === 'sale_price'
                ? value === '' || Number(value) <= 0
                  ? undefined
                  : Number(value)
                : Number(value),
          };
        }
        return v;
      })
    );
  };

  const handleAddVariant = () => {
    const defaultColor = INITIAL_COLORS[0];
    const defaultSize = INITIAL_SIZES[0];
    const newSku = `${product.slug.toUpperCase().slice(0, 7)}-${defaultColor.id.slice(4, 7).toUpperCase()}-${Date.now().toString().slice(-3)}`;
    const newVar: ProductVariant = {
      id: `var-custom-${Date.now()}`,
      product_id: product.id,
      sku: newSku,
      color_id: defaultColor.id,
      size_id: defaultSize.id,
      price: Number(basePrice) || 0,
      sale_price: baseSalePrice ? Number(baseSalePrice) : undefined,
      stock_on_hand: 10,
      stock_reserved: 0,
      image: images[0] || product.images[0],
      is_active: true,
    };
    setVariants((prev) => [...prev, newVar]);
  };

  const handleRemoveVariant = (variantId: string) => {
    if (variants.length <= 1) {
      setErrorMsg(language === 'ar' ? 'يجب أن يحتوي المنتج على متغير واحد على الأقل' : 'Product must have at least one variant');
      return;
    }
    setVariants((prev) => prev.filter((v) => v.id !== variantId));
  };

  // Submit
  const handleSave = () => {
    setErrorMsg(null);

    if (!nameAr.trim() || !nameEn.trim()) {
      setErrorMsg(language === 'ar' ? 'اسم المنتج مطلوب بالعربية والإنجليزية' : 'Product name is required in both AR and EN');
      return;
    }

    const parsedPrice = parseFloat(basePrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال سعر بيع صحيح' : 'Please enter a valid price');
      return;
    }

    const parsedSalePrice = baseSalePrice ? parseFloat(baseSalePrice) : undefined;
    if (parsedSalePrice !== undefined && (isNaN(parsedSalePrice) || parsedSalePrice >= parsedPrice)) {
      setErrorMsg(language === 'ar' ? 'سعر الخصم يجب أن يكون أقل من السعر الأساسي' : 'Sale price must be lower than base price');
      return;
    }

    setIsSaving(true);

    const updatedProduct: Product = {
      ...product,
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      slug: slug.trim(),
      category_id: categoryId,
      brand_id: brandId,
      base_price: parsedPrice,
      base_sale_price: parsedSalePrice,
      description_ar: descriptionAr.trim(),
      description_en: descriptionEn.trim(),
      materials_ar: materialsAr.trim(),
      materials_en: materialsEn.trim(),
      dimensions: dimensions.trim(),
      is_featured: isFeatured,
      is_new_arrival: isNewArrival,
      is_best_seller: isBestSeller,
      images: images.length > 0 ? images : product.images,
      variants: variants.length > 0 ? variants : product.variants,
      updated_at: new Date().toISOString(),
    };

    try {
      StoreDatabase.updateProduct(updatedProduct, 'admin@shantety.com');
      onSaved(updatedProduct);
      setIsSaving(false);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error updating product');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#18181B] text-white p-4 sm:p-5 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E10600] flex items-center justify-center text-white font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">
                  {language === 'ar' ? 'تعديل المنتج والأسعار' : 'Edit Product & Pricing'}
                </h3>
                <span className="bg-stone-800 text-[#E10600] font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                  WooCommerce Style
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {product.name_ar} · <span className="font-mono text-[10px] text-stone-500">{product.id}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="bg-stone-50 border-b border-stone-200 px-4 sm:px-6 flex gap-2 pt-2 shrink-0 overflow-x-auto">
          {[
            { id: 'general', labelAr: 'البيانات الأساسية والأسعار', labelEn: 'General & Prices', icon: DollarSign },
            { id: 'variants', labelAr: 'المتغيرات والـ SKUs والمخزون', labelEn: 'Variants & Stock', icon: Layers },
            { id: 'images', labelAr: 'صور المنتج والبانر', labelEn: 'Images & Media', icon: Image },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-[#E10600] text-[#E10600] bg-white rounded-t-lg'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: GENERAL & PRICING */}
          {activeTab === 'general' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Product Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'اسم المنتج بالعربية *' : 'Product Name (AR) *'}
                  </label>
                  <input
                    type="text"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600] text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'اسم المنتج بالإنجليزية *' : 'Product Name (EN) *'}
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600] text-xs"
                    required
                  />
                </div>
              </div>

              {/* Slug & Category & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'الرابط الدائم (Slug)' : 'Product Slug'}
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-stone-300 font-mono text-[11px] focus:outline-none focus:border-[#E10600]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'الفئة (Category)' : 'Category'}
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#E10600]"
                  >
                    {INITIAL_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {language === 'ar' ? c.name_ar : c.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'العلامة التجارية (Brand)' : 'Brand'}
                  </label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#E10600]"
                  >
                    {INITIAL_BRANDS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PRICING SECTION - WOOCOMMERCE STYLE */}
              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-bold">
                  <DollarSign className="w-4 h-4 text-[#E10600]" />
                  <span>{language === 'ar' ? 'تسعير المنتج (ج.م EGP)' : 'Product Pricing (EGP)'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700">
                      {language === 'ar' ? 'السعر الأساسي (Regular Price) *' : 'Regular Price (EGP) *'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="10"
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-stone-300 bg-white font-bold text-stone-900 focus:outline-none focus:border-[#E10600]"
                        required
                      />
                      <span className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-stone-400 font-bold pointer-events-none">
                        ج.م
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-stone-700">
                      {language === 'ar' ? 'سعر الخصم / التخفيض (Sale Price)' : 'Sale Price (EGP)'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={baseSalePrice}
                        onChange={(e) => setBaseSalePrice(e.target.value)}
                        placeholder={language === 'ar' ? 'اتركه فارغاً إن لم يكن هناك خصم' : 'Leave empty if regular price'}
                        className="w-full p-2.5 rounded-lg border border-stone-300 bg-white font-bold text-red-600 focus:outline-none focus:border-[#E10600]"
                      />
                      <span className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-stone-400 font-bold pointer-events-none">
                        ج.م
                      </span>
                    </div>
                  </div>
                </div>

                {baseSalePrice && Number(baseSalePrice) > 0 && Number(basePrice) > Number(baseSalePrice) && (
                  <p className="text-[11px] text-emerald-700 font-bold">
                    ✓ {language === 'ar' ? `نسبة الخصم المعروضة: ${Math.round(((Number(basePrice) - Number(baseSalePrice)) / Number(basePrice)) * 100)}% وفر ${Number(basePrice) - Number(baseSalePrice)} ج.م` : `Sale discount: ${Math.round(((Number(basePrice) - Number(baseSalePrice)) / Number(basePrice)) * 100)}% OFF`}
                  </p>
                )}
              </div>

              {/* Materials & Dimensions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'الخامات بالعربية' : 'Materials (AR)'}
                  </label>
                  <input
                    type="text"
                    value={materialsAr}
                    onChange={(e) => setMaterialsAr(e.target.value)}
                    placeholder="مثال: جلد طبيعي + بطانة حريرية"
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'الخامات بالإنجليزية' : 'Materials (EN)'}
                  </label>
                  <input
                    type="text"
                    value={materialsEn}
                    onChange={(e) => setMaterialsEn(e.target.value)}
                    placeholder="e.g. Italian Leather"
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'الأبعاد والمقاس' : 'Dimensions'}
                  </label>
                  <input
                    type="text"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="مثال: 28 سم × 18 سم × 8 سم"
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'الوصف بالعربية' : 'Description (AR)'}
                  </label>
                  <textarea
                    rows={3}
                    value={descriptionAr}
                    onChange={(e) => setDescriptionAr(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'الوصف بالإنجليزية' : 'Description (EN)'}
                  </label>
                  <textarea
                    rows={3}
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                  />
                </div>
              </div>

              {/* Badges & Flags */}
              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded text-[#E10600] focus:ring-[#E10600]"
                  />
                  <span className="font-bold text-stone-800">
                    {language === 'ar' ? 'منتج مميز (Featured)' : 'Featured Product'}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                  <input
                    type="checkbox"
                    checked={isNewArrival}
                    onChange={(e) => setIsNewArrival(e.target.checked)}
                    className="rounded text-[#E10600] focus:ring-[#E10600]"
                  />
                  <span className="font-bold text-stone-800">
                    {language === 'ar' ? 'وصل حديثاً (New Arrival)' : 'New Arrival'}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                  <input
                    type="checkbox"
                    checked={isBestSeller}
                    onChange={(e) => setIsBestSeller(e.target.checked)}
                    className="rounded text-[#E10600] focus:ring-[#E10600]"
                  />
                  <span className="font-bold text-stone-800">
                    {language === 'ar' ? 'الأكثر مبيعاً (Best Seller)' : 'Best Seller'}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: VARIANTS & STOCK */}
          {activeTab === 'variants' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">
                    {language === 'ar' ? 'إدارة المتغيرات والمخزون الميداني' : 'Variants & Physical Stock'}
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    {language === 'ar'
                      ? 'يمكنك تعديل رمز SKU، السعر الفردي، وسعة المخزون لكل لون ومقاس'
                      : 'Edit individual SKU, price and on-hand stock per variant'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="py-1.5 px-3 bg-[#E10600] hover:bg-[#c20500] text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'إضافة متغير +' : 'Add Variant +'}</span>
                </button>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left rtl:text-right min-w-[550px]">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">{language === 'ar' ? 'رمز SKU' : 'SKU'}</th>
                      <th className="p-2.5">{language === 'ar' ? 'اللون / المقاس' : 'Color / Size'}</th>
                      <th className="p-2.5">{language === 'ar' ? 'السعر (ج.م)' : 'Price (EGP)'}</th>
                      <th className="p-2.5">{language === 'ar' ? 'سعر الخصم' : 'Sale Price'}</th>
                      <th className="p-2.5">{language === 'ar' ? 'المخزون الفعلي' : 'On Hand'}</th>
                      <th className="p-2.5 text-center">{language === 'ar' ? 'حذف' : 'Del'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {variants.map((v) => {
                      const color = INITIAL_COLORS.find((c) => c.id === v.color_id);
                      const size = INITIAL_SIZES.find((s) => s.id === v.size_id);
                      return (
                        <tr key={v.id} className="hover:bg-stone-50/60">
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) => handleVariantChange(v.id, 'sku', e.target.value)}
                              className="font-mono text-[11px] p-1.5 border border-stone-300 rounded w-32 focus:border-[#E10600]"
                            />
                          </td>
                          <td className="p-2.5 font-medium text-stone-700">
                            {color ? (language === 'ar' ? color.name_ar : color.name_en) : 'افتراضي'} /{' '}
                            {size ? (language === 'ar' ? size.name_ar : size.name_en) : 'موحد'}
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              min="0"
                              value={v.price}
                              onChange={(e) => handleVariantChange(v.id, 'price', e.target.value)}
                              className="font-bold text-stone-900 p-1.5 border border-stone-300 rounded w-20 focus:border-[#E10600]"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              min="0"
                              value={v.sale_price || ''}
                              placeholder="—"
                              onChange={(e) => handleVariantChange(v.id, 'sale_price', e.target.value)}
                              className="font-bold text-red-600 p-1.5 border border-stone-300 rounded w-20 focus:border-[#E10600]"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              min="0"
                              value={v.stock_on_hand}
                              onChange={(e) => handleVariantChange(v.id, 'stock_on_hand', e.target.value)}
                              className="font-bold p-1.5 border border-stone-300 rounded w-16 focus:border-[#E10600]"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(v.id)}
                              className="text-stone-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: IMAGES & MEDIA */}
          {activeTab === 'images' && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">
                  {language === 'ar' ? 'معرض صور المنتج (Container Media)' : 'Product Gallery'}
                </h4>
                <p className="text-[11px] text-stone-500">
                  {language === 'ar'
                    ? 'يمكنك رفع صورة جديدة من جهازك، إضافة رابط، أو الاختيار من مكتبة صور شنطتي'
                    : 'Upload from your device, add URL, or pick from official Shanaty presets'}
                </p>
              </div>

              {/* Upload image from device */}
              <div className="border-2 border-dashed border-stone-300 hover:border-[#E10600] rounded-xl p-5 text-center bg-stone-50/50 transition-colors">
                <input
                  type="file"
                  id="product-image-upload"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="product-image-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-10 h-10 rounded-full bg-red-50 text-[#E10600] flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-stone-800">
                    {language === 'ar' ? 'انقر هنا لرفع صورة للمنتج من جهازك' : 'Click to upload product image from computer'}
                  </span>
                  <span className="text-[10px] text-stone-400">PNG, JPG, WEBP حتى 5MB</span>
                </label>
              </div>

              {/* Add by URL */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder={language === 'ar' ? 'أو الصق رابط صورة خارجية مباشرة...' : 'Or paste image URL...'}
                  className="flex-1 p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-lg cursor-pointer transition-colors"
                >
                  {language === 'ar' ? 'إضافة رابط' : 'Add URL'}
                </button>
              </div>

              {/* Current Images List */}
              <div className="space-y-2">
                <label className="font-bold text-stone-800 block">
                  {language === 'ar' ? 'الصور الحالية (انقر لتعيينها كصورة رئيسية):' : 'Current Images (Click to set as Main):'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className={`relative group rounded-xl overflow-hidden border-2 bg-stone-50 p-1.5 transition-all ${
                        idx === 0 ? 'border-[#E10600] shadow-sm' : 'border-stone-200'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt=""
                        className="w-full h-24 object-contain rounded bg-white"
                        referrerPolicy="no-referrer"
                      />
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 rtl:left-auto rtl:right-2 bg-[#E10600] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          {language === 'ar' ? 'الرئيسية' : 'Main'}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetMainImage(idx)}
                            className="bg-white text-stone-900 text-[10px] font-bold px-2 py-1 rounded hover:bg-stone-100 cursor-pointer"
                          >
                            {language === 'ar' ? 'رئيسية' : 'Main'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="bg-red-600 text-white p-1 rounded hover:bg-red-700 cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preset catalog gallery */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <label className="font-bold text-stone-700 block">
                  {language === 'ar' ? 'أو اختر من مكتبة صور شنطتي المجهزة مسبقاً:' : 'Or pick from Shanaty Brand Preset Images:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_PRODUCT_IMAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setImages((prev) => [preset.url, ...prev.filter((u) => u !== preset.url)])}
                      className="p-2 border border-stone-200 hover:border-[#E10600] rounded-xl flex items-center gap-2 text-start bg-white cursor-pointer transition-colors"
                    >
                      <img src={preset.url} alt="" className="w-10 h-10 object-contain rounded bg-stone-50" />
                      <span className="text-[10px] font-medium text-stone-700 leading-tight">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-stone-50 border-t border-stone-200 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold rounded-xl cursor-pointer transition-colors"
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="py-2.5 px-6 bg-[#E10600] hover:bg-[#c20500] text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-98 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>
              {isSaving
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ التعديلات في المتجر والسيرفر' : 'Save Changes to Store & Server')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
