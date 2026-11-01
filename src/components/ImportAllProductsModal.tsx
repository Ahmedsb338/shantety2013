import React, { useState } from 'react';
import { Product } from '../types/ecommerce';
import { StoreDatabase } from '../services/storeDatabase';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  ArrowRight,
  Database,
  Sparkles,
} from 'lucide-react';

interface ImportAllProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (count: number) => void;
  language: 'ar' | 'en';
}

const SAMPLE_JSON_IMPORT: Partial<Product>[] = [
  {
    id: 'prod-luxury-crocodile-clutch',
    slug: 'shantety-luxury-crocodile-clutch',
    name_ar: 'كلتش شنطتي الفاخر بنقشة جلد التمساح وقفل ذهبي',
    name_en: 'Shantety Luxury Croc-Embossed Clutch with Gold Clasp',
    description_ar: 'كلتش سهرة ملكي بخامة بارزة ونقشة تمساح براقة، مزود بسلسلة كتف ذهبية وحزام معصم جلدي للمناسبات الفاخرة.',
    description_en: 'Royal evening clutch featuring high-shine crocodile embossing, convertible gold chain crossbody strap, and secure metallic turn-lock.',
    category_id: 'cat-bags',
    brand_id: 'brand-shanaty',
    base_price: 1150,
    base_sale_price: 980,
    images: ['/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__2__6b416ddc.png'],
    is_featured: true,
    is_new_arrival: true,
    is_best_seller: false,
    materials_ar: 'جلد صناعي بارز نقشة تمساح + إكسسوارات ذهبية مقاومة للصدأ',
    materials_en: 'Embossed croc vegan leather, polished anti-tarnish gold hardware',
    dimensions: '26 سم × 14 سم × 5 سم',
    variants: [
      {
        id: 'var-clutch-blk-fs',
        product_id: 'prod-luxury-crocodile-clutch',
        sku: 'SHN-CLU-CROC-BLK-FS',
        color_id: 'col-black',
        size_id: 'sz-onesize',
        price: 980,
        stock_on_hand: 25,
        stock_reserved: 0,
        is_active: true,
      },
      {
        id: 'var-clutch-bur-fs',
        product_id: 'prod-luxury-crocodile-clutch',
        sku: 'SHN-CLU-CROC-BUR-FS',
        color_id: 'col-burgundy',
        size_id: 'sz-onesize',
        price: 980,
        stock_on_hand: 18,
        stock_reserved: 0,
        is_active: true,
      },
    ],
  },
  {
    id: 'prod-suede-ankle-booties',
    slug: 'shantety-velvet-suede-ankle-booties',
    name_ar: 'هاف بوت شمواه ناعم بكعب عريض مريح',
    name_en: 'Shantety Velvet Suede Block-Heel Ankle Booties',
    description_ar: 'بوت أنيق للجامعة والخروجات اليومية من الشمواه المخملي المقاوم للماء بنعل مريح وسحاب جانبي سلس.',
    description_en: 'Comfortable day-to-night ankle boots crafted from rich velvet suede with a 4cm sturdy block heel and effortless side zip.',
    category_id: 'cat-shoes',
    brand_id: 'brand-shanaty',
    base_price: 1290,
    base_sale_price: 1090,
    images: ['/assets/aistudio/Generated_Image_October_30__2026_-_1_31AM_9b62411e.png'],
    is_featured: false,
    is_new_arrival: true,
    is_best_seller: true,
    materials_ar: 'شمواه مخملي ناعم + نعل مطاطي غير زالق + كعب 4 سم',
    materials_en: 'Velvet suede, non-slip rubber lug sole, 4cm block heel',
    dimensions: 'ارتفاع الكعب: 4 سم',
    variants: [
      {
        id: 'var-boot-tan-38',
        product_id: 'prod-suede-ankle-booties',
        sku: 'SHN-BOT-SUE-TAN-38',
        color_id: 'col-tan',
        size_id: 'sz-38',
        price: 1090,
        stock_on_hand: 14,
        stock_reserved: 0,
        is_active: true,
      },
      {
        id: 'var-boot-tan-39',
        product_id: 'prod-suede-ankle-booties',
        sku: 'SHN-BOT-SUE-TAN-39',
        color_id: 'col-tan',
        size_id: 'sz-39',
        price: 1090,
        stock_on_hand: 20,
        stock_reserved: 0,
        is_active: true,
      },
      {
        id: 'var-boot-tan-40',
        product_id: 'prod-suede-ankle-booties',
        sku: 'SHN-BOT-SUE-TAN-40',
        color_id: 'col-tan',
        size_id: 'sz-40',
        price: 1090,
        stock_on_hand: 12,
        stock_reserved: 0,
        is_active: true,
      },
    ],
  },
];

export const ImportAllProductsModal: React.FC<ImportAllProductsModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  language,
}) => {
  if (!isOpen) return null;

  const [inputFormat, setInputFormat] = useState<'json' | 'csv'>('json');
  const [rawText, setRawText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Product[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load sample data
  const handleLoadSample = () => {
    setRawText(JSON.stringify(SAMPLE_JSON_IMPORT, null, 2));
    setInputFormat('json');
    handleValidate(JSON.stringify(SAMPLE_JSON_IMPORT, null, 2), 'json');
  };

  // File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawText(text);
        const format = file.name.endsWith('.csv') ? 'csv' : 'json';
        setInputFormat(format);
        handleValidate(text, format);
      }
    };
    reader.readAsText(file);
  };

  // Validate input
  const handleValidate = (textToValidate = rawText, format = inputFormat) => {
    setErrors([]);
    setParsedPreview(null);

    if (!textToValidate.trim()) {
      setErrors([language === 'ar' ? 'الرجاء إدخال أو رفع محتوى المنتجات' : 'Please input product data']);
      return;
    }

    try {
      if (format === 'json') {
        const parsed = JSON.parse(textToValidate);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const validList: Product[] = [];
        const errList: string[] = [];

        list.forEach((item, idx) => {
          if (!item.name_ar && !item.name_en) {
            errList.push(language === 'ar' ? `العنصر #${idx + 1}: اسم المنتج غير موجود` : `Item #${idx + 1}: Name is missing`);
            return;
          }
          if (!item.base_price || isNaN(Number(item.base_price))) {
            errList.push(language === 'ar' ? `العنصر #${idx + 1}: السعر غير صالح` : `Item #${idx + 1}: Invalid base price`);
            return;
          }

          validList.push({
            id: item.id || `prod-import-${Date.now()}-${idx}`,
            slug: item.slug || `shantety-product-${Date.now()}-${idx}`,
            name_ar: item.name_ar || item.name_en,
            name_en: item.name_en || item.name_ar,
            description_ar: item.description_ar || item.name_ar,
            description_en: item.description_en || item.name_en,
            category_id: item.category_id || 'cat-bags',
            brand_id: item.brand_id || 'brand-shanaty',
            base_price: Number(item.base_price),
            base_sale_price: item.base_sale_price ? Number(item.base_sale_price) : undefined,
            images: Array.isArray(item.images) && item.images.length > 0 ? item.images : ['/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__2__6b416ddc.png'],
            is_featured: !!item.is_featured,
            is_new_arrival: !!item.is_new_arrival,
            is_best_seller: !!item.is_best_seller,
            materials_ar: item.materials_ar || 'جلد عالي الجودة',
            materials_en: item.materials_en || 'High Quality Materials',
            dimensions: item.dimensions || 'مقاس قياسي',
            created_at: item.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            variants: Array.isArray(item.variants) && item.variants.length > 0 ? item.variants : [
              {
                id: `var-${Date.now()}-${idx}`,
                product_id: item.id || `prod-import-${Date.now()}-${idx}`,
                sku: `SHN-IMP-${Date.now().toString().slice(-4)}-${idx}`,
                color_id: 'col-black',
                size_id: 'sz-onesize',
                price: Number(item.base_price),
                stock_on_hand: 20,
                stock_reserved: 0,
                is_active: true,
              }
            ],
          });
        });

        setErrors(errList);
        setParsedPreview(validList);
      } else {
        // CSV format parser:
        // Format: name_ar,name_en,price,sale_price,sku,stock,category_id
        const lines = textToValidate.trim().split('\n');
        const validList: Product[] = [];
        const errList: string[] = [];

        const startIndex = lines[0].toLowerCase().includes('name') || lines[0].includes('اسم') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

          if (cols.length < 3) {
            errList.push(language === 'ar' ? `السطر ${i + 1}: الأعمدة غير مكتملة` : `Line ${i + 1}: Incomplete columns`);
            continue;
          }

          const [name_ar, name_en, priceStr, salePriceStr, sku, stockStr, category_id] = cols;
          const price = parseFloat(priceStr);
          if (isNaN(price) || price <= 0) {
            errList.push(language === 'ar' ? `السطر ${i + 1}: السعر غير صالح` : `Line ${i + 1}: Invalid price`);
            continue;
          }

          const prodId = `prod-csv-${Date.now()}-${i}`;
          validList.push({
            id: prodId,
            slug: (name_en || name_ar).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `prod-${Date.now()}-${i}`,
            name_ar: name_ar || name_en,
            name_en: name_en || name_ar,
            description_ar: name_ar,
            description_en: name_en,
            category_id: category_id || 'cat-bags',
            brand_id: 'brand-shanaty',
            base_price: price,
            base_sale_price: salePriceStr && !isNaN(parseFloat(salePriceStr)) ? parseFloat(salePriceStr) : undefined,
            images: ['/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__2__6b416ddc.png'],
            is_featured: false,
            is_new_arrival: true,
            is_best_seller: false,
            materials_ar: 'جلد أصلي فاخر',
            materials_en: 'Premium Leather',
            dimensions: 'قياسي',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            variants: [
              {
                id: `var-csv-${Date.now()}-${i}`,
                product_id: prodId,
                sku: sku || `SHN-CSV-${i}-${Math.floor(100 + Math.random() * 900)}`,
                color_id: 'col-black',
                size_id: 'sz-onesize',
                price: price,
                sale_price: salePriceStr ? parseFloat(salePriceStr) : undefined,
                stock_on_hand: stockStr && !isNaN(parseInt(stockStr, 10)) ? parseInt(stockStr, 10) : 15,
                stock_reserved: 0,
                is_active: true,
              },
            ],
          });
        }

        setErrors(errList);
        setParsedPreview(validList);
      }
    } catch (e: any) {
      setErrors([language === 'ar' ? `خطأ في تحليل البيانات: ${e?.message || 'تأكد من صحة التنسيق'}` : `Parse error: ${e?.message}`]);
    }
  };

  // Commit Import
  const handleCommitImport = () => {
    if (!parsedPreview || parsedPreview.length === 0) return;

    setIsProcessing(true);
    const result = StoreDatabase.importAllProducts(parsedPreview, 'admin@shantety.com');
    setIsProcessing(false);
    onImportComplete(result.successCount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#18181B] text-white p-4 sm:p-5 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E10600] flex items-center justify-center text-white font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">
                  {language === 'ar' ? 'استيراد جميع المنتجات (Import All Products)' : 'Bulk Import All Products'}
                </h3>
                <span className="bg-emerald-500/20 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                  WooCommerce Sync
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {language === 'ar'
                  ? 'رفع وتحديث كامل كتالوج المتجر بضغطة زر واحدة مع الحفاظ على التزامن السحابي'
                  : 'Bulk upload or merge catalog items with live database synchronization'}
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Action Row: Sample and Upload */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-700">
                {language === 'ar' ? 'تنسيق الإدخال:' : 'Format:'}
              </span>
              <button
                type="button"
                onClick={() => setInputFormat('json')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                  inputFormat === 'json' ? 'bg-[#E10600] text-white' : 'bg-white border border-stone-300 text-stone-700'
                }`}
              >
                JSON (مفصل)
              </button>
              <button
                type="button"
                onClick={() => setInputFormat('csv')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                  inputFormat === 'csv' ? 'bg-[#E10600] text-white' : 'bg-white border border-stone-300 text-stone-700'
                }`}
              >
                CSV / Excel
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="py-1.5 px-3 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-[#E10600]" />
                <span>{language === 'ar' ? 'رفع ملف (JSON/CSV)' : 'Upload File'}</span>
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleLoadSample}
                className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-[#E10600] font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'تحميل بيانات تجريبية جاهزة' : 'Load Sample Data'}</span>
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-800">
                {language === 'ar'
                  ? inputFormat === 'json'
                    ? 'الصق مصفوفة كائنات المنتجات (JSON Array):'
                    : 'الصق أسطر الـ CSV (name_ar, name_en, price, sale_price, sku, stock):'
                  : 'Paste Products Data:'}
              </label>
              <button
                type="button"
                onClick={() => handleValidate()}
                className="text-[#E10600] hover:underline font-bold text-[11px] cursor-pointer"
              >
                {language === 'ar' ? 'فحص وتدقيق البيانات' : 'Validate Data'}
              </button>
            </div>

            <textarea
              rows={7}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setParsedPreview(null);
              }}
              placeholder={
                inputFormat === 'json'
                  ? '[\n  {\n    "name_ar": "حقيبة يد كلاسيكية",\n    "name_en": "Classic Handbag",\n    "base_price": 850,\n    "base_sale_price": 750\n  }\n]'
                  : 'name_ar,name_en,price,sale_price,sku,stock\nحقيبة كتف هافان,Tan Shoulder Bag,850,750,SHN-BAG-01,15'
              }
              className="w-full p-3 rounded-xl border border-stone-300 font-mono text-[11px] bg-stone-50/50 focus:bg-white focus:outline-none focus:border-[#E10600]"
            />
          </div>

          {/* Errors list */}
          {errors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-red-700 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{language === 'ar' ? 'تنبيهات وأخطاء التحقق:' : 'Validation Notices:'}</span>
              </div>
              <ul className="list-disc list-inside text-red-600 text-[11px] space-y-0.5 ps-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedPreview && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {language === 'ar'
                      ? `تم التحقق بنجاح من ${parsedPreview.length} منتج جاهز للاستيراد`
                      : `Successfully validated ${parsedPreview.length} products ready to import`}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 font-medium">
                  {language === 'ar' ? 'المنتجات متوافقة مع متجر شنطتي' : 'Ready for database commit'}
                </span>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left rtl:text-right">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold text-[10px]">
                    <tr>
                      <th className="p-2.5">{language === 'ar' ? 'اسم المنتج' : 'Name'}</th>
                      <th className="p-2.5">{language === 'ar' ? 'السعر' : 'Price'}</th>
                      <th className="p-2.5">{language === 'ar' ? 'سعر الخصم' : 'Sale'}</th>
                      <th className="p-2.5">{language === 'ar' ? 'عدد المتغيرات' : 'Variants'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-[11px]">
                    {parsedPreview.map((p, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50">
                        <td className="p-2.5 font-bold text-stone-800">
                          {language === 'ar' ? p.name_ar : p.name_en}
                        </td>
                        <td className="p-2.5 font-bold text-stone-900">{p.base_price} ج.م</td>
                        <td className="p-2.5 text-red-600 font-bold">
                          {p.base_sale_price ? `${p.base_sale_price} ج.م` : '—'}
                        </td>
                        <td className="p-2.5 font-mono text-stone-600">
                          {p.variants?.length || 1} SKUs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 border-t border-stone-200 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold rounded-xl cursor-pointer transition-colors"
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>

          {!parsedPreview ? (
            <button
              type="button"
              onClick={() => handleValidate()}
              className="py-2.5 px-5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>{language === 'ar' ? 'فحص ومعاينة المنتجات' : 'Validate & Preview'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCommitImport}
              disabled={isProcessing}
              className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-98 disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              <span>
                {isProcessing
                  ? (language === 'ar' ? 'جاري الاستيراد والمزامنة...' : 'Importing...')
                  : (language === 'ar'
                      ? `استيراد ودمج ${parsedPreview.length} منتج في المتجر`
                      : `Import & Merge ${parsedPreview.length} Products`)}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
