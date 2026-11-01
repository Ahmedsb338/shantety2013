import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { StoreDatabase } from '../services/storeDatabase';
import { Category } from '../types/ecommerce';
import {
  FolderTree,
  Plus,
  Edit3,
  Trash2,
  Image,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Layers,
  Sparkles,
} from 'lucide-react';

const PRESET_CATEGORY_IMAGES = [
  { label: 'حقائب اليد النسائية', url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__2__6b416ddc.png' },
  { label: 'أحذية ولوفرز طبية', url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_31AM_9b62411e.png' },
  { label: 'أطقم وسيتات ملكية متناسقة', url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_22AM_4da4df52.png' },
  { label: 'أحذية موكاسان مونوغرام', url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_31AM__1__be443320.png' },
  { label: 'حقائب توت عاجية', url: '/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__1__7a9eb38c.png' },
];

export const CategoriesManagerTab: React.FC = () => {
  const { language, categories, refreshCategories, showToast } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form State
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [descAr, setDescAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [image, setImage] = useState('');
  const [itemCount, setItemCount] = useState('0');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingCategory(null);
    setNameAr('');
    setNameEn('');
    setSlug('');
    setDescAr('');
    setDescEn('');
    setImage(PRESET_CATEGORY_IMAGES[0].url);
    setItemCount('0');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setNameAr(cat.name_ar);
    setNameEn(cat.name_en);
    setSlug(cat.slug);
    setDescAr(cat.description_ar);
    setDescEn(cat.description_en);
    setImage(cat.image || PRESET_CATEGORY_IMAGES[0].url);
    setItemCount(cat.item_count ? cat.item_count.toString() : '0');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Upload handler for category image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setErrorMsg(null);

    if (!nameAr.trim() || !nameEn.trim()) {
      setErrorMsg(language === 'ar' ? 'اسم الفئة مطلوب بالعربية والإنجليزية' : 'Category name is required in AR and EN');
      return;
    }

    const generatedSlug = (slug || nameEn || nameAr)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') || `cat-${Date.now()}`;

    const catData: Category = {
      id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
      slug: generatedSlug,
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      description_ar: descAr.trim() || nameAr.trim(),
      description_en: descEn.trim() || nameEn.trim(),
      image: image || PRESET_CATEGORY_IMAGES[0].url,
      item_count: parseInt(itemCount, 10) || 0,
    };

    if (editingCategory) {
      StoreDatabase.updateCategory(catData, 'admin@shantety.com');
      showToast(
        language === 'ar' ? `تم تحديث الفئة (${catData.name_ar}) بنجاح` : `Updated category ${catData.name_en}`,
        'success'
      );
    } else {
      StoreDatabase.addCategory(catData, 'admin@shantety.com');
      showToast(
        language === 'ar' ? `تم إضافة الفئة الجديدة (${catData.name_ar}) بنجاح` : `Added category ${catData.name_en}`,
        'success'
      );
    }

    refreshCategories();
    setIsModalOpen(false);
  };

  const handleDelete = (categoryId: string, categoryName: string) => {
    if (categories.length <= 1) {
      showToast(language === 'ar' ? 'لا يمكن حذف جميع الفئات من المتجر' : 'Cannot delete all categories', 'error');
      return;
    }

    const confirmed = window.confirm(
      language === 'ar'
        ? `هل أنت متأكد من حذف الفئة "${categoryName}"؟`
        : `Are you sure you want to delete category "${categoryName}"?`
    );

    if (confirmed) {
      StoreDatabase.deleteCategory(categoryId, 'admin@shantety.com');
      refreshCategories();
      showToast(
        language === 'ar' ? `تم حذف الفئة (${categoryName}) بنجاح` : `Deleted category`,
        'success'
      );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-xs">
      {/* Top Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-stone-900">
              {language === 'ar' ? 'إدارة أقسام وفئات المتجر (Categories Manager)' : 'Store Categories Manager'}
            </h2>
            <span className="bg-red-50 text-[#E10600] font-bold text-[10px] px-2 py-0.5 rounded">
              {categories.length} {language === 'ar' ? 'فئات نشطة' : 'Categories'}
            </span>
          </div>
          <p className="text-stone-500 text-xs mt-0.5">
            {language === 'ar'
              ? 'إضافة فئات جديدة، تعديل الأسماء بالعربي والإنجليزي، تغيير صور الأقسام والروابط الدائمة'
              : 'Add new categories, edit names, update images and slug URLs across the storefront'}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="py-2.5 px-4 bg-[#E10600] hover:bg-[#c20500] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-98 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إضافة كاتيجوري جديدة +' : 'Add New Category +'}</span>
        </button>
      </div>

      {/* Categories Cards / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-xl bg-stone-50 border border-stone-200 p-1 shrink-0 overflow-hidden">
                <img
                  src={cat.image}
                  alt={cat.name_en}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="font-bold text-stone-900 text-sm truncate">
                    {language === 'ar' ? cat.name_ar : cat.name_en}
                  </h3>
                  <span className="bg-stone-100 text-stone-600 font-mono text-[10px] px-2 py-0.5 rounded shrink-0">
                    {cat.item_count} قطع
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                  {language === 'ar' ? cat.description_ar : cat.description_en}
                </p>
                <div className="mt-1 font-mono text-[10px] text-stone-400">
                  Slug: <span className="text-[#E10600] font-semibold">/{cat.slug}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => openEditModal(cat)}
                className="flex-1 py-1.5 px-3 bg-stone-900 hover:bg-[#E10600] text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'تعديل الفئة' : 'Edit'}</span>
              </button>

              <button
                onClick={() => handleDelete(cat.id, cat.name_ar)}
                className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title={language === 'ar' ? 'حذف الفئة' : 'Delete'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add or Edit Category */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#18181B] text-white p-4 sm:p-5 flex items-center justify-between border-b border-stone-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E10600] flex items-center justify-center text-white font-bold">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {editingCategory
                      ? (language === 'ar' ? 'تعديل بيانات الفئة' : 'Edit Category')
                      : (language === 'ar' ? 'إضافة فئة جديدة للكتالوج' : 'Add New Category')}
                  </h3>
                  <p className="text-xs text-stone-400">
                    {language === 'ar'
                      ? 'ستظهر الفئة فوراً في القائمة العلوية وفي تصفيات المتجر'
                      : 'Syncs instantly with storefront navigation and filters'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'اسم الفئة بالعربية *' : 'Category Name (AR) *'}
                  </label>
                  <input
                    type="text"
                    value={nameAr}
                    onChange={(e) => {
                      setNameAr(e.target.value);
                      if (!slug) {
                        setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                      }
                    }}
                    placeholder="مثال: الحقائب الكروس"
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'اسم الفئة بالإنجليزية *' : 'Category Name (EN) *'}
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => {
                      setNameEn(e.target.value);
                      if (!slug) {
                        setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                      }
                    }}
                    placeholder="e.g. Crossbody Bags"
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                    required
                  />
                </div>
              </div>

              {/* Slug & Item Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'الرابط الدائم (Slug)' : 'URL Slug'}
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="crossbody-bags"
                    className="w-full p-2.5 rounded-lg border border-stone-300 font-mono text-[11px] focus:outline-none focus:border-[#E10600]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'عدد القطع التقديري' : 'Initial Item Count'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemCount}
                    onChange={(e) => setItemCount(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-stone-300 font-bold focus:outline-none focus:border-[#E10600]"
                  />
                </div>
              </div>

              {/* Image Selection & Upload */}
              <div className="space-y-3 pt-1">
                <label className="font-bold text-stone-800 block">
                  {language === 'ar' ? 'صورة الفئة أو القسم:' : 'Category Image:'}
                </label>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-stone-50 border border-stone-300 p-1 shrink-0">
                    <img src={image} alt="Preview" className="w-full h-full object-contain" />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="رابط الصورة https://..."
                      className="w-full p-2 rounded-lg border border-stone-300 font-mono text-[11px] focus:outline-none focus:border-[#E10600]"
                    />
                    <label className="py-1 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg cursor-pointer inline-flex items-center gap-1.5 text-[11px]">
                      <Upload className="w-3 h-3 text-[#E10600]" />
                      <span>{language === 'ar' ? 'رفع صورة من جهازك' : 'Upload from device'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Preset Images */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-stone-500 font-bold block">
                    {language === 'ar' ? 'أو اختر صورة جاهزة من منتجات شنطتي:' : 'Or select from presets:'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {PRESET_CATEGORY_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImage(preset.url)}
                        className={`p-1.5 rounded-lg border text-start flex items-center gap-2 cursor-pointer transition-colors ${
                          image === preset.url ? 'border-[#E10600] bg-red-50/50' : 'border-stone-200 bg-white'
                        }`}
                      >
                        <img src={preset.url} alt="" className="w-8 h-8 object-contain rounded bg-stone-50" />
                        <span className="text-[10px] font-medium text-stone-700 truncate">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'الوصف بالعربية' : 'Description (AR)'}
                  </label>
                  <textarea
                    rows={2}
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                    placeholder="وصف مختصر لمحتويات القسم..."
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'الوصف بالإنجليزية' : 'Description (EN)'}
                  </label>
                  <textarea
                    rows={2}
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                    placeholder="Short description..."
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                  />
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-stone-50 border-t border-stone-200 p-4 sm:p-5 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="py-2 px-4 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold rounded-xl cursor-pointer transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="py-2 px-6 bg-[#E10600] hover:bg-[#c20500] text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-98"
              >
                <Save className="w-4 h-4" />
                <span>
                  {editingCategory
                    ? (language === 'ar' ? 'حفظ تعديلات الفئة' : 'Save Changes')
                    : (language === 'ar' ? 'إضافة الفئة للمتجر' : 'Add Category')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
