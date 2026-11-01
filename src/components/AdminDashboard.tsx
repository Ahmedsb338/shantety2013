import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { StoreDatabase } from '../services/storeDatabase';
import {
  Product,
  Order,
  Supplier,
  PurchaseOrder,
  OrderStatus,
  InventoryMovement,
  AuditLog,
} from '../types/ecommerce';
import {
  INITIAL_CATEGORIES,
  INITIAL_BRANDS,
  INITIAL_COLORS,
  INITIAL_SIZES,
  OFFICIAL_BRAND,
} from '../data/initialData';
import {
  BarChart3,
  Package,
  Layers,
  ShoppingCart,
  Users,
  FileSpreadsheet,
  History,
  Settings,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Truck,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  X,
  ShieldAlert,
  Boxes,
  TrendingUp,
  Sparkles,
  FileCheck,
  LogOut,
  ShieldCheck,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminGate } from './AdminGate';
import { AddProductModal } from './AddProductModal';
import { ShippingIntegrationsTab } from './ShippingIntegrationsTab';
import { AiAnalyticsTab } from './AiAnalyticsTab';
import { SystemTestTab } from './SystemTestTab';

type AdminTab =
  | 'overview'
  | 'products'
  | 'shipping'
  | 'ai-analytics'
  | 'system-tests'
  | 'inventory'
  | 'orders'
  | 'suppliers'
  | 'csv'
  | 'audit'
  | 'settings';

export const AdminDashboard: React.FC = () => {
  const { language, formatPrice, setCurrentView, showToast, refreshProducts } = useStore();
  const { currentUser, isAuthenticated, logout } = useAdminAuth();

  // Access Control Guard: Only authenticated administrators can view this dashboard
  if (!isAuthenticated) {
    return <AdminGate />;
  }

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [products, setProducts] = useState<Product[]>(() => StoreDatabase.getProducts());
  const [orders, setOrders] = useState<Order[]>(() => StoreDatabase.getOrders());
  const [movements, setMovements] = useState<InventoryMovement[]>(() => StoreDatabase.getMovements());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => StoreDatabase.getAuditLogs());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => StoreDatabase.getSuppliers());
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => StoreDatabase.getPurchaseOrders());

  // Search & filter in tables
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  // Selected Order for status management modal
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('processing');
  const [newCarrier, setNewCarrier] = useState('Bosta');
  const [newTrackingCode, setNewTrackingCode] = useState('');

  // CSV Bulk states
  const [csvInput, setCsvInput] = useState('');
  const [csvPreview, setCsvPreview] = useState<{
    validCount: number;
    errors: string[];
    parsedRows: Array<{ sku: string; price: number; stock: number }>;
  } | null>(null);

  // New Product Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // Reload state
  const refreshAll = () => {
    setProducts(StoreDatabase.getProducts());
    setOrders(StoreDatabase.getOrders());
    setMovements(StoreDatabase.getMovements());
    setAuditLogs(StoreDatabase.getAuditLogs());
    setSuppliers(StoreDatabase.getSuppliers());
    setPurchaseOrders(StoreDatabase.getPurchaseOrders());
  };

  // Business Analytics Calculations
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === 'delivered').length;
    const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'processing').length;
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;

    const totalSales = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0);

    const averageOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

    // Inventory valuation: sum of (price * on_hand)
    let inventoryValuation = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      p.variants?.forEach((v) => {
        const available = v.stock_on_hand - v.stock_reserved;
        inventoryValuation += v.price * v.stock_on_hand;
        if (available <= 5) lowStockCount++;
      });
    });

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      totalSales,
      averageOrderValue,
      inventoryValuation,
      lowStockCount,
    };
  }, [orders, products]);

  // Handle Order Status Update
  const handleUpdateOrderStatus = () => {
    if (!selectedOrderForStatus) return;
    const updated = StoreDatabase.updateOrderStatus(
      selectedOrderForStatus.id,
      newStatus,
      newCarrier,
      newTrackingCode || undefined,
      'admin@shantety.com'
    );
    if (updated) {
      showToast(
        language === 'ar'
          ? `تم تحديث حالة الطلب ${updated.order_number} بنجاح إلى (${newStatus})`
          : `Updated Order ${updated.order_number} to ${newStatus}`,
        'success'
      );
      setSelectedOrderForStatus(null);
      refreshAll();
    }
  };

  // Handle CSV Export
  const handleDownloadCSV = () => {
    const csvContent = StoreDatabase.exportProductsToCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `shantety_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(
      language === 'ar' ? 'تم تنزيل ملف CSV بنجاح' : 'Exported inventory CSV successfully',
      'success'
    );
  };

  // Handle CSV Preview
  const handlePreviewCSV = () => {
    if (!csvInput.trim()) {
      showToast(language === 'ar' ? 'الرجاء لصق محتوى CSV' : 'Please paste CSV content', 'error');
      return;
    }
    const result = StoreDatabase.parseAndValidateCSV(csvInput);
    setCsvPreview(result);
  };

  // Handle CSV Commit
  const handleApplyCSV = () => {
    if (!csvPreview || csvPreview.parsedRows.length === 0) return;
    const res = StoreDatabase.applyCSVBulkUpdates(csvPreview.parsedRows, 'admin@shantety.com');
    showToast(
      language === 'ar'
        ? `تم تحديث ${res.updatedCount} صنف في المخزن بنجاح`
        : `Successfully updated ${res.updatedCount} items`,
      'success'
    );
    setCsvInput('');
    setCsvPreview(null);
    refreshAll();
  };

  // Handle Goods Receipt for Purchase Order
  const handleReceivePO = (po: PurchaseOrder) => {
    const receivedItems = po.items.map((i) => ({
      sku: i.sku,
      quantity: i.quantity_ordered,
    }));
    StoreDatabase.receiveGoodsReceipt(po.id, receivedItems, 'admin@shantety.com');
    showToast(
      language === 'ar'
        ? `تم استلام البضائع وإيداعها في المخزن الفعلي لأمر الشراء ${po.po_number}`
        : `Goods receipt posted for ${po.po_number}`,
      'success'
    );
    refreshAll();
  };

  return (
    <div className="min-h-screen bg-stone-100/60 pb-16">
      {/* Top Admin Header */}
      <div className="bg-[#18181B] text-white border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E10600] flex items-center justify-center p-1 font-black text-white">
              MSB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight">
                  {language === 'ar' ? 'نظام إدارة متجر شنطتي' : 'Shantety Commerce Manager'}
                </span>
                <span className="bg-stone-800 text-stone-300 text-[10px] font-mono px-2 py-0.5 rounded">
                  v2.4 Production
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {language === 'ar'
                  ? 'إدارة المنتجات، المخزون، الطلبات، الموردين وسجلات التدقيق'
                  : 'Products, Atomic Stock, Orders, Carriers & Audits'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsProductModalOpen(true)}
              className="py-2 px-3.5 bg-[#E10600] hover:bg-[#c20500] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ar' ? 'إضافة منتج +' : 'Add Product +'}</span>
            </button>

            {currentUser && (
              <div className="hidden md:flex items-center gap-2.5 bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs">
                <div className="w-6 h-6 rounded-full bg-stone-800 border border-stone-700 text-stone-200 flex items-center justify-center font-bold text-[10px]">
                  {currentUser.displayName.charAt(0)}
                </div>
                <div className="flex flex-col text-start">
                  <span className="font-bold text-white leading-tight">{currentUser.displayName}</span>
                  <span className="text-[10px] text-amber-400 font-medium">
                    {language === 'ar' ? currentUser.roleTitleAr : currentUser.roleTitleEn}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={logout}
              className="py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title={language === 'ar' ? 'تسجيل الخروج من لوحة الإدارة' : 'Logout Admin'}
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">{language === 'ar' ? 'خروج' : 'Logout'}</span>
            </button>

            <button
              onClick={() => setCurrentView('home')}
              className="py-2 px-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>{language === 'ar' ? 'معاينة المتجر' : 'Storefront'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto space-x-1 rtl:space-x-reverse py-2">
          {[
            { id: 'overview', label_ar: 'نظرة عامة ومؤشرات', label_en: 'Overview', icon: BarChart3 },
            { id: 'products', label_ar: 'المنتجات والـ SKUs', label_en: 'Products & SKUs', icon: Package },
            { id: 'shipping', label_ar: 'شركات الشحن واللوجستيات', label_en: 'Shipping Hub', icon: Truck },
            { id: 'ai-analytics', label_ar: 'تحليلات الذكاء الاصطناعي', label_en: 'AI Analytics', icon: Sparkles },
            { id: 'system-tests', label_ar: 'فحص العمليات الشامل', label_en: 'System Tests', icon: FileCheck },
            { id: 'inventory', label_ar: 'المخزون المركزي', label_en: 'Atomic Inventory', icon: Boxes },
            { id: 'orders', label_ar: 'الطلبات والشحن', label_en: 'Orders & Shipments', icon: ShoppingCart },
            { id: 'suppliers', label_ar: 'الموردين وأوامر الشراء', label_en: 'Suppliers & POs', icon: Users },
            { id: 'csv', label_ar: 'استيراد/تصدير CSV', label_en: 'CSV Operations', icon: FileSpreadsheet },
            { id: 'audit', label_ar: 'سجل التدقيق (Audit)', label_en: 'Audit Logs', icon: History },
            { id: 'settings', label_ar: 'الدومين والربط السحابي (DNS)', label_en: 'Domain & Cloudflare', icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 py-2 px-3.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#E10600] text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{language === 'ar' ? tab.label_ar : tab.label_en}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: OVERVIEW METRICS */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            {/* KPI Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                <span className="text-xs font-bold text-stone-500">
                  {language === 'ar' ? 'إجمالي المبيعات المؤكدة' : 'Net Confirmed Sales'}
                </span>
                <div className="text-2xl font-black text-stone-900 tabular-nums">
                  {formatPrice(metrics.totalSales)}
                </div>
                <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'تشمل الطلبات المستلمة' : 'Delivered & in-transit'}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                <span className="text-xs font-bold text-stone-500">
                  {language === 'ar' ? 'إجمالي عدد الطلبات' : 'Total Orders'}
                </span>
                <div className="text-2xl font-black text-stone-900 tabular-nums">
                  {metrics.totalOrders}
                </div>
                <div className="text-[11px] text-stone-500">
                  {metrics.completedOrders} {language === 'ar' ? 'مكتمل' : 'Delivered'} ·{' '}
                  {metrics.pendingOrders} {language === 'ar' ? 'قيد التجهيز' : 'Pending'}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                <span className="text-xs font-bold text-stone-500">
                  {language === 'ar' ? 'متوسط قيمة الطلب (AOV)' : 'Avg Order Value'}
                </span>
                <div className="text-2xl font-black text-stone-900 tabular-nums">
                  {formatPrice(metrics.averageOrderValue)}
                </div>
                <div className="text-[11px] text-stone-500">
                  {language === 'ar' ? 'لكل عملية شراء' : 'Per transaction'}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                <span className="text-xs font-bold text-stone-500">
                  {language === 'ar' ? 'قيمة المخزون الحالي' : 'Inventory Asset Valuation'}
                </span>
                <div className="text-2xl font-black text-[#E10600] tabular-nums">
                  {formatPrice(metrics.inventoryValuation)}
                </div>
                <div className="text-[11px] text-amber-800 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {metrics.lowStockCount}{' '}
                    {language === 'ar' ? 'أصناف قاربت على النفاد' : 'Low stock SKUs'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Orders Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Recent Orders List (cols-7) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-stone-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900">
                    {language === 'ar' ? 'أحدث الطلبات الواردة' : 'Recent Inbound Orders'}
                  </h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-[#E10600] hover:underline"
                  >
                    {language === 'ar' ? 'عرض الكل' : 'View all'}
                  </button>
                </div>
                <div className="divide-y divide-stone-100">
                  {orders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrderForStatus(order);
                        setNewStatus(order.status);
                      }}
                      className="p-4 hover:bg-stone-50/80 transition-colors cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-900">
                            {order.order_number}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              order.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'shipped'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-stone-500">
                          {order.customer_name} · {order.shipping_address.governorate}
                        </p>
                      </div>

                      <div className="text-right rtl:text-left">
                        <span className="font-bold text-stone-900 tabular-nums block">
                          {formatPrice(order.total)}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Low Stock Warning Box (cols-5) */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    {language === 'ar' ? 'تنبيهات المخزون الحرج' : 'Low Stock Watchlist'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {products.flatMap((p) =>
                    (p.variants || [])
                      .filter((v) => v.stock_on_hand - v.stock_reserved <= 5)
                      .map((v) => (
                        <div
                          key={v.id}
                          className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono font-bold text-stone-900 block">
                              {v.sku}
                            </span>
                            <span className="text-[11px] text-stone-600 line-clamp-1">
                              {language === 'ar' ? p.name_ar : p.name_en}
                            </span>
                          </div>
                          <span className="font-bold text-amber-800 text-xs">
                            {v.stock_on_hand - v.stock_reserved}{' '}
                            {language === 'ar' ? 'متاح' : 'avail'}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS & VARIANTS */}
        {activeTab === 'products' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 rtl:left-auto rtl:right-3 top-3" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث بالاسم أو رمز SKU...' : 'Search product or SKU...'}
                  className="w-full text-xs p-2.5 pl-9 rtl:pl-3 rtl:pr-9 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#E10600]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsProductModalOpen(true)}
                  className="py-2.5 px-4 bg-[#E10600] hover:bg-[#c20500] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إضافة منتج جديد' : 'Add New Product'}</span>
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="py-2.5 px-3.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-stone-500" />
                  <span>{language === 'ar' ? 'تصدير للـ Excel' : 'Export Catalog'}</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto min-w-full">
                <table className="w-full min-w-[650px] text-xs text-left rtl:text-right">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase">
                  <tr>
                    <th className="p-3.5">{language === 'ar' ? 'الصورة' : 'Image'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'اسم المنتج' : 'Product Name'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'الفئة' : 'Category'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'السعر' : 'Price'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'المتغيرات والـ SKUs' : 'Variants & SKUs'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'المخزون الكلي' : 'Total Available'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {products
                    .filter((p) => {
                      if (!productSearch) return true;
                      const q = productSearch.toLowerCase();
                      return (
                        p.name_ar.toLowerCase().includes(q) ||
                        p.name_en.toLowerCase().includes(q) ||
                        p.variants?.some((v) => v.sku.toLowerCase().includes(q))
                      );
                    })
                    .map((product) => {
                      const totalAvail = (product.variants || []).reduce(
                        (sum, v) => sum + Math.max(0, v.stock_on_hand - v.stock_reserved),
                        0
                      );
                      const cat = INITIAL_CATEGORIES.find((c) => c.id === product.category_id);

                      return (
                        <tr key={product.id} className="hover:bg-stone-50/70">
                          <td className="p-3.5 w-14">
                            <img
                              src={product.images[0]}
                              alt=""
                              className="w-12 h-12 object-contain bg-stone-50 rounded border border-stone-200 p-1"
                              referrerPolicy="no-referrer"
                            />
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-stone-900">
                              {language === 'ar' ? product.name_ar : product.name_en}
                            </div>
                            <span className="text-[10px] text-stone-400 font-mono">
                              ID: {product.id}
                            </span>
                          </td>
                          <td className="p-3.5 font-medium text-stone-600">
                            {cat ? (language === 'ar' ? cat.name_ar : cat.name_en) : '—'}
                          </td>
                          <td className="p-3.5 font-bold text-stone-900 tabular-nums">
                            {formatPrice(product.base_sale_price || product.base_price)}
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {product.variants?.map((v) => (
                                <span
                                  key={v.id}
                                  className="text-[10px] font-mono bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded text-stone-700"
                                >
                                  {v.sku} ({v.stock_on_hand - v.stock_reserved})
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3.5 font-black tabular-nums">
                            <span
                              className={`px-2 py-0.5 rounded ${
                                totalAvail > 5
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : totalAvail > 0
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {totalAvail} {language === 'ar' ? 'قطعة' : 'units'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

        {/* TAB 3: CENTRALIZED ATOMIC INVENTORY */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 space-y-1">
              <span className="font-bold block">
                {language === 'ar'
                  ? '🔒 معادلة حجز المخزون المركزي الصارمة:'
                  : '🔒 Authoritative Stock Formula:'}
              </span>
              <p className="font-mono font-bold">
                Available Stock = On Hand Stock (الفعلية) - Reserved Stock (المحجوزة للطلبات)
              </p>
              <p className="text-[11px] text-amber-800">
                {language === 'ar'
                  ? 'لا يمكن بيع أو حجز أي قطعة إلا إذا كان المخزون المتاح أكبر من الصفر. تتم حركات الخصم الفعلي عند التسليم للعميل.'
                  : 'Prevents race conditions, overselling, and negative stock balances.'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-stone-200 bg-stone-50 font-bold text-xs text-stone-800">
                {language === 'ar' ? 'أرصدة الأصناف (SKU Balances)' : 'SKU Level Balances'}
              </div>
              <div className="overflow-x-auto min-w-full">
                <table className="w-full min-w-[550px] text-xs text-left rtl:text-right">
                <thead className="bg-stone-50/50 border-b border-stone-200 text-stone-600 font-bold">
                  <tr>
                    <th className="p-3.5">SKU</th>
                    <th className="p-3.5">{language === 'ar' ? 'اسم المنتج' : 'Product'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'المخزون الفعلي (On Hand)' : 'On Hand'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'المحجوز (Reserved)' : 'Reserved'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'المتاح للبيع (Available)' : 'Available'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono">
                  {products.flatMap((p) =>
                    (p.variants || []).map((v) => {
                      const avail = v.stock_on_hand - v.stock_reserved;
                      return (
                        <tr key={v.id} className="hover:bg-stone-50">
                          <td className="p-3.5 font-bold text-stone-900">{v.sku}</td>
                          <td className="p-3.5 font-sans">
                            {language === 'ar' ? p.name_ar : p.name_en}
                          </td>
                          <td className="p-3.5 text-stone-700 tabular-nums">{v.stock_on_hand}</td>
                          <td className="p-3.5 text-amber-800 tabular-nums">{v.stock_reserved}</td>
                          <td className="p-3.5 font-black text-stone-900 tabular-nums">
                            <span
                              className={`px-2 py-0.5 rounded font-sans ${
                                avail > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {avail}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

            {/* Inventory Movements Log */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-stone-200 bg-stone-50 font-bold text-xs text-stone-800">
                {language === 'ar' ? 'سجل حركات المخزون الأحدث' : 'Recent Stock Movements'}
              </div>
              <div className="divide-y divide-stone-100 text-xs">
                {movements.slice(0, 8).map((m) => (
                  <div key={m.id} className="p-3.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900">{m.sku}</span>
                        <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded text-[10px]">
                          {m.movement_type}
                        </span>
                        <span className="text-stone-400 text-[10px]">ref: {m.reference_id}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">{m.notes}</p>
                    </div>

                    <div className="text-right rtl:text-left">
                      <span
                        className={`font-black font-mono tabular-nums ${
                          m.quantity_delta > 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                      </span>
                      <span className="text-[10px] text-stone-400 block">
                        {new Date(m.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ORDERS & STATUS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 rtl:left-auto rtl:right-3 top-3" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث برقم الطلب، العميل، الهاتف...' : 'Search order, customer...'}
                  className="w-full text-xs p-2.5 pl-9 rtl:pl-3 rtl:pr-9 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#E10600]"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto min-w-full">
                <table className="w-full min-w-[750px] text-xs text-left rtl:text-right">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase">
                  <tr>
                    <th className="p-3.5">{language === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'العميل والهاتف' : 'Customer'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'المحافظة' : 'Governorate'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'طريقة الدفع' : 'Payment'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'حالة الطلب' : 'Order Status'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'شركة الشحن' : 'Carrier'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders
                    .filter((o) => {
                      if (!orderSearch) return true;
                      const q = orderSearch.toLowerCase();
                      return (
                        o.order_number.toLowerCase().includes(q) ||
                        o.customer_name.toLowerCase().includes(q) ||
                        o.customer_phone.includes(q)
                      );
                    })
                    .map((order) => (
                      <tr key={order.id} className="hover:bg-stone-50">
                        <td className="p-3.5 font-mono font-bold text-stone-900">
                          {order.order_number}
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-stone-900 block">{order.customer_name}</span>
                          <span className="text-[10px] text-stone-500 font-mono">
                            {order.customer_phone}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-stone-700">
                          {order.shipping_address.governorate}
                        </td>
                        <td className="p-3.5 font-bold text-stone-900 tabular-nums">
                          {formatPrice(order.total)}
                        </td>
                        <td className="p-3.5">
                          <span className="text-[11px] font-semibold text-stone-700">
                            {order.payment_method === 'cod' ? 'الدفع عند الاستلام' : 'دفع إلكتروني'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              order.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'shipped'
                                ? 'bg-blue-100 text-blue-800'
                                : order.status === 'cancelled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-stone-600 font-medium">
                          {order.shipping_provider} ({order.tracking_number})
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => {
                              setSelectedOrderForStatus(order);
                              setNewStatus(order.status);
                              setNewCarrier(order.shipping_provider);
                              setNewTrackingCode(order.tracking_number || '');
                            }}
                            className="py-1 px-2.5 bg-stone-900 hover:bg-[#E10600] text-white text-[11px] font-bold rounded cursor-pointer transition-colors"
                          >
                            {language === 'ar' ? 'تعديل الحالة' : 'Manage'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

        {/* TAB 5: SUPPLIERS & PURCHASE ORDERS */}
        {activeTab === 'suppliers' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-stone-900 pb-2 border-b border-stone-100">
                {language === 'ar' ? 'قائمة الموردين المعتمدين' : 'Approved Leather Guild Suppliers'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suppliers.map((sup) => (
                  <div key={sup.id} className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs">{sup.name}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        {language === 'ar' ? 'مورد نشط' : 'Active'}
                      </span>
                    </div>
                    <p className="text-stone-500 text-[11px]">
                      {sup.contact_person} · {sup.phone} · {sup.city}
                    </p>
                    <p className="text-stone-600 text-[11px]">{sup.notes}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Purchase orders */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-stone-900 pb-2 border-b border-stone-100">
                {language === 'ar' ? 'أوامر الشراء واستلام البضائع' : 'Purchase Orders & Inbound Goods Receipts'}
              </h3>
              <div className="space-y-3">
                {purchaseOrders.map((po) => (
                  <div
                    key={po.id}
                    className="p-4 border border-stone-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900">{po.po_number}</span>
                        <span className="text-xs text-stone-600 font-semibold">{po.supplier_name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            po.status === 'received'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {po.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">
                        {po.items.map((i) => `${i.sku} (${i.quantity_ordered} pcs)`).join(', ')} ·{' '}
                        {formatPrice(po.total_cost)}
                      </p>
                    </div>

                    <div>
                      {po.status !== 'received' ? (
                        <button
                          onClick={() => handleReceivePO(po)}
                          className="py-2 px-3 bg-[#E10600] text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          {language === 'ar' ? 'تسجيل استلام البضائع بالمخزن' : 'Post Goods Receipt'}
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{language === 'ar' ? 'تم الإيداع الفعلي بالمخزن' : 'Stock Credited'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CSV OPERATIONS */}
        {activeTab === 'csv' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                {language === 'ar' ? 'التحديث المجمع للمخزن والأسعار (CSV Bulk Operations)' : 'Bulk CSV Management'}
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                {language === 'ar'
                  ? 'يمكنكِ تحديث أسعار وكميات آلاف الـ SKUs دفعة واحدة مع التحقق التلقائي من عدم وجود أخطاء أو تكرار.'
                  : 'Import/Export SKUs in bulk with automated validation and duplicate checks.'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDownloadCSV}
                className="py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>{language === 'ar' ? 'تحميل ملف المخزن الحالي (CSV Export)' : 'Export Full CSV'}</span>
              </button>
            </div>

            <div className="space-y-3 pt-4 border-t border-stone-200">
              <label className="text-xs font-bold text-stone-700 block">
                {language === 'ar'
                  ? 'لصق بيانات CSV لتحديث الأسعار والكميات (الصيغة: SKU,Price,Stock):'
                  : 'Paste CSV to update Price and Stock (Format: SKU,Price,Stock):'}
              </label>
              <textarea
                rows={6}
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder={`SKU,Price,Stock\nSHN-BAG-BOW-BEI-FS,990,45\nSHN-BAG-TTE-IVR-FS,1150,32\nSHN-SHO-WVN-COG-38,740,25`}
                className="w-full text-xs font-mono p-3 border border-stone-300 rounded-lg focus:outline-none focus:border-[#E10600]"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePreviewCSV}
                  className="py-2 px-4 bg-stone-800 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  {language === 'ar' ? 'فحص ومعاينة البيانات (Validate)' : 'Preview & Validate'}
                </button>
                {csvPreview && csvPreview.validCount > 0 && (
                  <button
                    onClick={handleApplyCSV}
                    className="py-2 px-4 bg-[#E10600] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {language === 'ar'
                      ? `اعتماد التحديث لـ (${csvPreview.validCount}) صنف`
                      : `Apply Update to ${csvPreview.validCount} items`}
                  </button>
                )}
              </div>

              {csvPreview && (
                <div className="mt-4 p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2 text-xs">
                  <span className="font-bold text-stone-800">
                    {language === 'ar' ? 'نتيجة الفحص:' : 'Validation Result:'}
                  </span>
                  {csvPreview.errors.length > 0 ? (
                    <div className="space-y-1 text-red-600 font-semibold">
                      {csvPreview.errors.map((err, idx) => (
                        <p key={idx}>⚠️ {err}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-emerald-700 font-bold">
                      ✓ جميع الأصناف الـ ({csvPreview.validCount}) صالحة ولا توجد تكرارات. جاهزة للاعتماد.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs animate-fadeIn">
            <div className="p-4 border-b border-stone-200 bg-stone-50 font-bold text-xs text-stone-800 flex items-center justify-between">
              <span>{language === 'ar' ? 'سجل التدقيق الأمني (Immutable Audit Logs)' : 'Security Audit Trail'}</span>
              <span className="text-[10px] text-stone-400 font-mono">Total {auditLogs.length} events</span>
            </div>
            <div className="divide-y divide-stone-100 text-xs font-mono">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 space-y-1 hover:bg-stone-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#E10600]">{log.action}</span>
                      <span className="text-stone-600 font-sans">
                        [{log.resource_type}: {log.resource_id}]
                      </span>
                    </div>
                    <span className="text-stone-400 text-[10px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-stone-700 font-sans text-[11px]">{log.details}</p>
                  <span className="text-[10px] text-stone-400 font-sans">
                    Actor: {log.actor} ({log.role})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: SHIPPING INTEGRATIONS */}
        {activeTab === 'shipping' && <ShippingIntegrationsTab />}

        {/* TAB: AI ANALYTICS */}
        {activeTab === 'ai-analytics' && (
          <AiAnalyticsTab products={products} orders={orders} />
        )}

        {/* TAB: SYSTEM TESTS */}
        {activeTab === 'system-tests' && <SystemTestTab />}

        {/* TAB: DOMAIN & CLOUDFLARE SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header / Intro Card */}
            <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#E10600]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E10600]/20 text-[#E10600] text-xs font-bold border border-[#E10600]/30">
                    <Globe className="w-3.5 h-3.5" />
                    <span>إعدادات الدومين المخصص • Custom Domain & DNS</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black">
                    ربط دومين المتجر الرسمي (shantety.shop)
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                    إجابة السؤال: <strong className="text-white">هل الربط يتم من خلال Cloudflare أم من خلالنا؟</strong> الربط هو عملية مشتركة:
                    إدارة الـ DNS وشبكة التوزيع تتم من خلال <strong className="text-[#E10600]">حسابك في Cloudflare</strong> (لأنك تملك النطاق)،
                    بينما تم تجهيز وبرمجة المنصة هنا لاستقبال الزيارات، وتفعيل شهادة الـ SSL وروابط الـ SEO المعتمدة.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="https://dash.cloudflare.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#E10600] hover:bg-[#C50500] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <span>فتح لوحة تحكم Cloudflare</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Step-by-Step DNS Records */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    سجلات الـ DNS المطلوبة في Cloudflare (DNS Records)
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    قم بالدخول إلى لوحة Cloudflare لنطاق <code className="text-[#E10600] font-mono font-bold">shantety.shop</code> وأضف السجلين التاليين:
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  جاهز للربط الآن
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right rtl:text-right">
                  <thead>
                    <tr className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                      <th className="p-3">النوع (Type)</th>
                      <th className="p-3">الاسم (Name)</th>
                      <th className="p-3">الهدف الموجه إليه (Target / Content)</th>
                      <th className="p-3">حالة البروكسي (Proxy Status)</th>
                      <th className="p-3">نسخ القيمة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono">
                    <tr className="hover:bg-stone-50/50">
                      <td className="p-3 font-bold text-[#E10600]">CNAME</td>
                      <td className="p-3 font-bold text-stone-900">@ <span className="font-sans text-[11px] text-stone-400">(Root: shantety.shop)</span></td>
                      <td className="p-3 text-stone-700 select-all font-mono text-[11px]">
                        ais-pre-ub5klt4rrwh5uq6pnt3vlk-171758075248.europe-west1.run.app
                      </td>
                      <td className="p-3 font-sans">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          Proxied (السحابة البرتقالية)
                        </span>
                      </td>
                      <td className="p-3 font-sans">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText('ais-pre-ub5klt4rrwh5uq6pnt3vlk-171758075248.europe-west1.run.app');
                            showToast(language === 'ar' ? 'تم نسخ الرابط السحابي' : 'Copied Target Host', 'success');
                          }}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          <span>نسخ</span>
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-stone-50/50">
                      <td className="p-3 font-bold text-[#E10600]">CNAME</td>
                      <td className="p-3 font-bold text-stone-900">www <span className="font-sans text-[11px] text-stone-400">(www.shantety.shop)</span></td>
                      <td className="p-3 text-stone-700 select-all font-mono text-[11px]">
                        ais-pre-ub5klt4rrwh5uq6pnt3vlk-171758075248.europe-west1.run.app
                      </td>
                      <td className="p-3 font-sans">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          Proxied (السحابة البرتقالية)
                        </span>
                      </td>
                      <td className="p-3 font-sans">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText('ais-pre-ub5klt4rrwh5uq6pnt3vlk-171758075248.europe-west1.run.app');
                            showToast(language === 'ar' ? 'تم نسخ الرابط السحابي' : 'Copied Target Host', 'success');
                          }}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          <span>نسخ</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4-Step Action Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#E10600]/10 flex items-center justify-center text-[#E10600] font-black text-sm">
                    1
                  </div>
                  <h4 className="text-sm font-bold text-stone-900">
                    خطواتك في Cloudflare (4 خطوات بسيطة)
                  </h4>
                </div>

                <ol className="space-y-3 text-xs text-stone-700 leading-relaxed list-decimal list-inside pr-1">
                  <li>
                    <strong>إضافة النطاق:</strong> ادخل على Cloudflare واضغط <em>Add a Site</em> واكتب <code className="font-mono text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded">shantety.shop</code>.
                  </li>
                  <li>
                    <strong>تغيير الـ Nameservers:</strong> انسخ الـ Nameservers التي يقدمها لك Cloudflare وضعها في لوحة المسجل الذي اشتريت منه الدومين.
                  </li>
                  <li>
                    <strong>إضافة سجلات الـ DNS:</strong> من تبويب <em>DNS &gt; Records</em> أضف سجلي الـ CNAME الموضحين في الجدول أعلاه مع تفعيل السحابة البرتقالية (Proxied).
                  </li>
                  <li>
                    <strong>ضبط شهادة الأمان (SSL/TLS):</strong> من تبويب <em>SSL/TLS</em> اختر وضع التشفير <strong className="text-emerald-700">Full</strong> ثم فعّل خيار <em>Always Use HTTPS</em>.
                  </li>
                </ol>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-sm">
                    2
                  </div>
                  <h4 className="text-sm font-bold text-stone-900">
                    ما قمنا بتجهيزه لك داخل الكود والمنصة
                  </h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-stone-900">تحديث الروابط المعيارية (SEO Canonical)</p>
                      <p className="text-[11px] text-stone-500">تم ضبط <code className="text-[#E10600]">https://shantety.shop/</code> في وسم الرأس لرفع تصنيف المتجر في محركات البحث وجوجل.</p>
                    </div>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-stone-900">كروت المشاركة وSchema JSON-LD</p>
                      <p className="text-[11px] text-stone-500">تم ربط كروت OpenGraph وبطاقات التواصل الاجتماعي والبيانات المهيكلة بالنطاق الرسمي مباشرة.</p>
                    </div>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-stone-900">قاعدة بيانات Cloud SQL (PostgreSQL)</p>
                      <p className="text-[11px] text-stone-500">سيرفر Express المتصل بقاعدة بيانات PostgreSQL في <code className="text-stone-700">europe-west2</code> جاهز لمعالجة واستقبال الطلبات فور توجيه الـ DNS.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Status Modal */}
      {selectedOrderForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedOrderForStatus(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />
          <div className="relative bg-white rounded-2xl border border-stone-200 p-6 w-full max-w-md shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  {language === 'ar' ? 'إدارة وتحديث حالة الطلب' : 'Manage Order Status'}
                </h3>
                <span className="text-xs font-mono text-stone-500 font-bold">
                  {selectedOrderForStatus.order_number}
                </span>
              </div>
              <button onClick={() => setSelectedOrderForStatus(null)}>
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">
                  {language === 'ar' ? 'الحالة الجديدة للطلب:' : 'New Order Status:'}
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg bg-white font-bold"
                >
                  <option value="pending">قيد التأكيد (Pending)</option>
                  <option value="processing">جاري التجهيز والتغليف (Processing)</option>
                  <option value="shipped">تم التسليم للشحن (Shipped)</option>
                  <option value="delivered">تم التسليم للعميل (Delivered - Deduct physical)</option>
                  <option value="cancelled">إلغاء الطلب وتحرير المخزون (Cancelled - Release)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">
                  {language === 'ar' ? 'شركة الشحن المعتمدة:' : 'Shipping Carrier:'}
                </label>
                <select
                  value={newCarrier}
                  onChange={(e) => setNewCarrier(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="Bosta">Bosta (بوسطة)</option>
                  <option value="Mylerz">Mylerz (مايلرز)</option>
                  <option value="Aramex">Aramex (أرامكس)</option>
                  <option value="Shantety Express">Shantety Express (مندوب شنطتي الخاص)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">
                  {language === 'ar' ? 'رقم بوليصة الشحن (Airway Bill #):' : 'Tracking Code #:'}
                </label>
                <input
                  type="text"
                  value={newTrackingCode}
                  onChange={(e) => setNewTrackingCode(e.target.value)}
                  placeholder="BST-EG-xxxxxx"
                  className="w-full p-2.5 border border-stone-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleUpdateOrderStatus}
                className="flex-1 py-2.5 bg-[#E10600] hover:bg-[#C50500] text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                {language === 'ar' ? 'حفظ وتطبيق التغييرات' : 'Save Changes'}
              </button>
              <button
                onClick={() => setSelectedOrderForStatus(null)}
                className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onProductAdded={(_newProd) => {
          setProducts(StoreDatabase.getProducts());
          refreshProducts();
          refreshAll();
        }}
      />
    </div>
  );
};
