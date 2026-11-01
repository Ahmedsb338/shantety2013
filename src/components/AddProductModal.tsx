import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { StoreDatabase } from '../services/storeDatabase';
import { Product, ProductVariant } from '../types/ecommerce';
import {
  INITIAL_CATEGORIES,
  INITIAL_BRANDS,
  INITIAL_COLORS,
  INITIAL_SIZES,
} from '../data/initialData';
import { X, Plus, Sparkles, Layers, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: (product: Product) => void;
}

const SHANTETY_PHOTO_PRESETS = [
  {
    name_ar: 'حقيبة مونوغرام مع فيونكة',
    name_en: 'Monogram Bow Bag',
    url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__2__6b416ddc.png',
  },
  {
    name_ar: 'شنطة جلدية منسوجة عاجي ومحفظة',
    name_en: 'Quilted Ivory Bag & Pouch',
    url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_31AM__2__8c1fab3e.png',
  },
  {
    name_ar: 'حذاء لوفرز هافان مجدول',
    name_en: 'Woven Tan Loafers',
    url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_31AM_9b62411e.png',
  },
  {
    name_ar: 'طقم ملكي نبيتي شنطة وحذاء',
    name_en: 'Royal Burgundy Ensemble',
    url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_22AM_4da4df52.png',
  },
  {
    name_ar: 'حذاء فلات مونوغرام US Club',
    name_en: 'Monogram Classic Loafers',
    url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_31AM__1__be443320.png',
  },
  {
    name_ar: 'شنطة كتف عاجية زاوية جانبية',
    name_en: 'Ivory Bag Angle View',
    url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__1__8dcdee3e.png',
  },
];

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onProductAdded }) => {
  const { language, showToast } = useStore();

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [categoryId, setCategoryId] = useState('cat-bags');
  const [brandId, setBrandId] = useState('brand-shanaty');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [basePrice, setBasePrice] = useState<number>(750);
  const [baseSalePrice, setBaseSalePrice] = useState<string>('');
  const [materialsAr, setMaterialsAr] = useState('');
  const [materialsEn, setMaterialsEn] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [selectedImage, setSelectedImage] = useState(SHANTETY_PHOTO_PRESETS[0].url);
  const [customImageUrl, setCustomImageUrl] = useState('');

  // Selected colors & sizes to generate variants
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>(['col-beige', 'col-ivory']);
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>(['sz-free']);
  const [initialStockPerVariant, setInitialStockPerVariant] = useState<number>(10);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [isFeatured, setIsFeatured] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleColor = (cId: string) => {
    setSelectedColorIds((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
    );
  };

  const toggleSize = (sId: string) => {
    setSelectedSizeIds((prev) =>
      prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nameAr.trim() || !nameEn.trim()) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال اسم المنتج بالعربية والإنجليزية' : 'Please provide product name in both Arabic and English');
      return;
    }

    if (basePrice <= 0) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال سعر صحيح للمنتج' : 'Please provide a valid price');
      return;
    }

    if (selectedColorIds.length === 0 || selectedSizeIds.length === 0) {
      setErrorMsg(language === 'ar' ? 'يرجى اختيار لون واحد ومقاس واحد على الأقل للمتغيرات' : 'Please select at least one color and one size');
      return;
    }

    setSubmitting(true);

    try {
      const finalImage = customImageUrl.trim() || selectedImage;
      const productId = 'prod-' + Date.now();
      const slug = nameEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).substring(2, 5);

      // Generate variants
      const variants: ProductVariant[] = [];
      const prefix = nameEn.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'SHN';

      for (const colorId of selectedColorIds) {
        for (const sizeId of selectedSizeIds) {
          const colorObj = INITIAL_COLORS.find((c) => c.id === colorId);
          const sizeObj = INITIAL_SIZES.find((s) => s.id === sizeId);

          const cCode = (colorObj?.name_en || 'CLR').slice(0, 3).toUpperCase();
          const sCode = (sizeObj?.value || 'FS').toUpperCase().replace(/\s+/g, '-');
          const sku = `SHN-${prefix}-${cCode}-${sCode}`;
          const saleVal = baseSalePrice ? parseFloat(baseSalePrice) : undefined;

          variants.push({
            id: `var-${productId}-${cCode}-${sCode}`.toLowerCase(),
            product_id: productId,
            sku,
            color_id: colorId,
            size_id: sizeId,
            price: basePrice,
            sale_price: saleVal && saleVal < basePrice ? saleVal : undefined,
            stock_on_hand: initialStockPerVariant,
            stock_reserved: 0,
            image: finalImage,
            is_active: true,
          });
        }
      }

      const newProduct: Product = {
        id: productId,
        slug,
        name_ar: nameAr.trim(),
        name_en: nameEn.trim(),
        description_ar: descriptionAr.trim() || nameAr.trim(),
        description_en: descriptionEn.trim() || nameEn.trim(),
        category_id: categoryId,
        brand_id: brandId,
        base_price: basePrice,
        base_sale_price: baseSalePrice ? parseFloat(baseSalePrice) : undefined,
        images: [finalImage],
        is_featured: isFeatured,
        is_new_arrival: isNewArrival,
        is_best_seller: isBestSeller,
        materials_ar: materialsAr.trim() || 'خامات فاخرة عالية التحمل مع تشطيبات متقنة',
        materials_en: materialsEn.trim() || 'Premium durable materials with artisan craftsmanship',
        dimensions: dimensions.trim() || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        variants,
      };

      // 1. Save to StoreDatabase
      StoreDatabase.updateProduct(newProduct, 'Store Manager (Web UI)');

      // 2. Notify parent & context
      onProductAdded(newProduct);
      showToast(
        language === 'ar'
          ? `تم إضافة المنتج "${newProduct.name_ar}" وحفظه في قاعدة البيانات بنجاح`
          : `Product "${newProduct.name_en}" saved to database successfully`,
        'success'
      );

      setSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to create product:', err);
      setErrorMsg(err.message || 'فشل حفظ المنتج');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E10600]/10 text-[#E10600] flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900">
                {language === 'ar' ? 'إضافة منتج جديد للمتجر' : 'Add New Product to Catalog'}
              </h2>
              <p className="text-xs text-stone-500">
                {language === 'ar'
                  ? 'إدخال مواصفات المنتج وتوليد المتغيرات والمخزون وحفظها في قاعدة بيانات PostgreSQL'
                  : 'Specify details, auto-generate variants, and save directly to PostgreSQL'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {language === 'ar' ? 'اسم المنتج (بالعربية) *' : 'Product Name (Arabic) *'}
              </label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: حقيبة كروس بودي أنيقة جلد أسود"
                className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {language === 'ar' ? 'اسم المنتج (بالإنجليزية) *' : 'Product Name (English) *'}
              </label>
              <input
                type="text"
                required
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Shantety Crossbody Leather Bag"
                className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {language === 'ar' ? 'القسم / التصنيف *' : 'Category *'}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] bg-white"
              >
                {INITIAL_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {language === 'ar' ? cat.name_ar : cat.name_en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {language === 'ar' ? 'العلامة التجارية *' : 'Brand Label *'}
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] bg-white"
              >
                {INITIAL_BRANDS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {language === 'ar' ? 'السعر الأساسي (ج.م) *' : 'Base Price (EGP) *'}
              </label>
              <input
                type="number"
                min="1"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {language === 'ar' ? 'سعر الخصم / العرض (اختياري)' : 'Sale Price (Optional)'}
              </label>
              <input
                type="number"
                min="0"
                value={baseSalePrice}
                onChange={(e) => setBaseSalePrice(e.target.value)}
                placeholder={language === 'ar' ? 'اتركه فارغاً إذا لا يوجد خصم' : 'Leave empty if no discount'}
                className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {language === 'ar' ? 'الكمية المبدئية لكل متغير *' : 'Initial Stock / Variant *'}
              </label>
              <input
                type="number"
                min="0"
                value={initialStockPerVariant}
                onChange={(e) => setInitialStockPerVariant(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] bg-white"
              />
            </div>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
              </label>
              <textarea
                rows={3}
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                placeholder="تفاصيل الحقيبة أو الحذاء والخامات والمزايا..."
                className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
              </label>
              <textarea
                rows={3}
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                placeholder="Product details, styling, and craftsmanship notes..."
                className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600]"
              />
            </div>
          </div>

          {/* Materials & Dimensions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {language === 'ar' ? 'الخامات (عربي)' : 'Materials (Arabic)'}
              </label>
              <input
                type="text"
                value={materialsAr}
                onChange={(e) => setMaterialsAr(e.target.value)}
                placeholder="مثال: جلد طبيعي منقوش، إكسسوار ذهبي"
                className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {language === 'ar' ? 'الخامات (إنجليزي)' : 'Materials (English)'}
              </label>
              <input
                type="text"
                value={materialsEn}
                onChange={(e) => setMaterialsEn(e.target.value)}
                placeholder="e.g. Vegan textured leather, gold hardware"
                className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {language === 'ar' ? 'الأبعاد والقياسات' : 'Dimensions'}
              </label>
              <input
                type="text"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="مثال: 30cm x 22cm x 12cm"
                className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600]"
              />
            </div>
          </div>

          {/* Product Image Presets */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2 flex items-center justify-between">
              <span>{language === 'ar' ? 'صورة المنتج الرسمية من الكتالوج' : 'Product Photo Selection'}</span>
              <span className="text-[11px] text-stone-400">
                {language === 'ar' ? 'اختر من صور شنطتي المعتمدة' : 'Select from approved assets'}
              </span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {SHANTETY_PHOTO_PRESETS.map((preset, idx) => {
                const isSelected = selectedImage === preset.url && !customImageUrl;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedImage(preset.url);
                      setCustomImageUrl('');
                    }}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all p-0.5 ${
                      isSelected
                        ? 'border-[#E10600] ring-2 ring-[#E10600]/30 scale-102 shadow-md'
                        : 'border-stone-200 hover:border-stone-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name_ar} className="w-full h-full object-cover rounded-lg" />
                    {isSelected && (
                      <div className="absolute top-1 end-1 bg-[#E10600] text-white rounded-full p-0.5 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              <input
                type="url"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder={
                  language === 'ar'
                    ? 'أو أدخل رابط صورة مخصص (URL)...'
                    : 'Or enter custom image URL...'
                }
                className="w-full text-xs p-2.5 border border-stone-200 rounded-xl focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600]"
              />
            </div>
          </div>

          {/* Variants Generator: Colors & Sizes */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#E10600]" />
                  <span>{language === 'ar' ? 'توليد المتغيرات تلقائياً (Variants Builder)' : 'Auto-Generate Variants'}</span>
                </h4>
                <p className="text-[11px] text-stone-500">
                  {language === 'ar'
                    ? `سيتم إنشاء ${selectedColorIds.length * selectedSizeIds.length} متغير برقم SKU ومخزون منفصل.`
                    : `Will generate ${selectedColorIds.length * selectedSizeIds.length} distinct SKUs with independent stock.`}
                </p>
              </div>
            </div>

            {/* Colors */}
            <div>
              <span className="block text-[11px] font-bold text-stone-600 mb-1.5">
                {language === 'ar' ? 'الألوان المتاحة:' : 'Available Colors:'}
              </span>
              <div className="flex flex-wrap gap-2">
                {INITIAL_COLORS.map((c) => {
                  const active = selectedColorIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleColor(c.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        active
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: c.hex }} />
                      <span>{language === 'ar' ? c.name_ar : c.name_en}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sizes */}
            <div>
              <span className="block text-[11px] font-bold text-stone-600 mb-1.5">
                {language === 'ar' ? 'المقاسات المتاحة:' : 'Available Sizes:'}
              </span>
              <div className="flex flex-wrap gap-2">
                {INITIAL_SIZES.map((s) => {
                  const active = selectedSizeIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSize(s.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        active
                          ? 'bg-[#E10600] text-white border-[#E10600] shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      {language === 'ar' ? s.name_ar : s.name_en}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Badges / Visibility */}
          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 text-[#E10600] rounded-sm focus:ring-[#E10600]"
              />
              <span>{language === 'ar' ? 'عرض في الواجهة (مميز)' : 'Featured Product'}</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isNewArrival}
                onChange={(e) => setIsNewArrival(e.target.checked)}
                className="w-4 h-4 text-[#E10600] rounded-sm focus:ring-[#E10600]"
              />
              <span>{language === 'ar' ? 'وصل حديثاً' : 'New Arrival'}</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isBestSeller}
                onChange={(e) => setIsBestSeller(e.target.checked)}
                className="w-4 h-4 text-[#E10600] rounded-sm focus:ring-[#E10600]"
              />
              <span>{language === 'ar' ? 'الأكثر مبيعاً' : 'Bestseller'}</span>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#E10600] hover:bg-[#c20500] text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md transition-all active:scale-98 flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting
                  ? (language === 'ar' ? 'جارٍ الحفظ في قاعدة البيانات...' : 'Saving to Database...')
                  : (language === 'ar' ? 'حفظ وإضافة للمتجر' : 'Save & Publish Product')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
