import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  getBackendReadiness,
  getSupabaseAdminClient,
  BackendEnv,
  BackendConfigurationError,
} from './supabaseBackend';
import {
  Product,
  ProductVariant,
  Order,
  OrderItem,
  Supplier,
  PurchaseOrder,
  AuditLog,
  InventoryMovement,
  OrderStatus,
  PaymentMethod,
  CustomerAddress,
  ProductReview,
  SiteCustomization,
  CmsSectionItem,
} from '../types/ecommerce';
import {
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_SUPPLIERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CATEGORIES,
  INITIAL_BRANDS,
  INITIAL_COLORS,
  INITIAL_SIZES,
  EGYPTIAN_GOVERNORATES,
  OFFICIAL_BRAND,
  INITIAL_REVIEWS,
  DEFAULT_SITE_CUSTOMIZATION,
} from '../data/initialData';

// Rate limiting cache for guest order tracking
const trackingRateLimiter = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ipOrKey: string, maxAttempts = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = trackingRateLimiter.get(ipOrKey);
  if (!entry || entry.expiresAt < now) {
    trackingRateLimiter.set(ipOrKey, { count: 1, expiresAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) {
    return false;
  }
  entry.count++;
  return true;
}

// In-memory persistent transactional store (authoritative state when DB is in development or standalone mode)
interface StoreState {
  products: Product[];
  orders: Order[];
  movements: InventoryMovement[];
  auditLogs: AuditLog[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  reviews: ProductReview[];
  siteCustomization: SiteCustomization;
  cmsSections: Array<{
    id: string;
    key: string;
    title_ar: string;
    title_en: string;
    content: Record<string, any>;
    is_published: boolean;
    updated_at: string;
    updated_by?: string;
  }>;
  adminMemberships: Array<{
    userId: string; // primary key in live Supabase table
    user_id: string; // alias matching column
    id?: string;
    email: string;
    role: 'super_admin' | 'store_manager' | 'order_staff';
    isActive: boolean;
    is_active: boolean;
    isOwner: boolean;
    is_owner: boolean;
    createdBy?: string;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
  }>;
}

// Hash tracking token using SHA-256 (supports raw byte buffer, hex string, and PostgreSQL \x bytea format)
export function hashTrackingToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export function hashTrackingTokenBytes(token: string): Buffer {
  return crypto.createHash('sha256').update(token.trim()).digest();
}

export function hashTrackingTokenBytea(token: string): string {
  return '\\x' + hashTrackingToken(token);
}

export function matchesTokenHash(token: string, storedHash: any): boolean {
  if (!token || !storedHash) return false;
  const hex = hashTrackingToken(token).toLowerCase();
  const byteaHex = ('\\x' + hex).toLowerCase();

  if (typeof storedHash === 'string') {
    const cleanStored = storedHash.trim().toLowerCase();
    return cleanStored === hex || cleanStored === byteaHex;
  }

  if (Buffer.isBuffer(storedHash) || storedHash instanceof Uint8Array) {
    const storedHex = Buffer.from(storedHash).toString('hex').toLowerCase();
    return storedHex === hex;
  }

  return false;
}

// Generate cryptographically secure tracking token (e.g. tk_48f9...)
export function generateSecureTrackingToken(): string {
  return 'tk_' + crypto.randomBytes(16).toString('hex');
}

// Generate random order number SHN-XXXX
export function generateOrderNumber(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `SHN-${num}`;
}

class AuthoritativeStore {
  private state: StoreState;
  private runtimeEnv?: BackendEnv;

  public setRuntimeEnv(env?: BackendEnv) {
    this.runtimeEnv = env;
  }

  public getRuntimeEnv(): BackendEnv | undefined {
    return this.runtimeEnv;
  }

  constructor() {
    this.state = {
      products: JSON.parse(JSON.stringify(INITIAL_PRODUCTS)),
      orders: JSON.parse(JSON.stringify(INITIAL_ORDERS)).map((o: any) => ({
        ...o,
        tracking_token_hash: hashTrackingToken(o.tracking_token || 'tk_initial_sample'),
      })),
      movements: [
        {
          id: 'mov-1',
          variant_id: 'var-bow-beige-free',
          sku: 'SHN-BAG-BOW-BEI-FS',
          movement_type: 'receipt',
          quantity_delta: 50,
          reference_id: 'PO-EG-2026-01',
          notes: 'Initial production batch arrival',
          created_at: '2026-10-18T10:00:00Z',
          created_by: 'Warehouse Supervisor',
        },
      ],
      auditLogs: JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)),
      suppliers: JSON.parse(JSON.stringify(INITIAL_SUPPLIERS)),
      purchaseOrders: [
        {
          id: 'po-201',
          po_number: 'PO-EG-2026-01',
          supplier_id: 'sup-cairo-guild',
          supplier_name: 'ورشة الأهرام للجلود الطبيعية',
          status: 'received',
          total_cost: 45000,
          created_at: '2026-10-10T10:00:00Z',
          expected_date: '2026-10-17T10:00:00Z',
          items: [
            {
              id: 'poi-1',
              product_id: 'prod-monogram-bow-bag',
              variant_id: 'var-bow-beige-free',
              sku: 'SHN-BAG-BOW-BEI-FS',
              quantity_ordered: 50,
              quantity_received: 50,
              unit_cost: 550,
            },
          ],
        },
      ],
      reviews: JSON.parse(JSON.stringify(INITIAL_REVIEWS)),
      siteCustomization: JSON.parse(JSON.stringify(DEFAULT_SITE_CUSTOMIZATION)),
      cmsSections: [
        {
          id: 'cms-hero',
          key: 'hero_banner',
          title_ar: 'حاوية البانر الرئيسي',
          title_en: 'Homepage Hero Banner',
          is_published: true,
          updated_at: '2026-11-01T12:00:00Z',
          updated_by: 'Owner',
          content: {
            headline_ar: DEFAULT_SITE_CUSTOMIZATION.heroHeadlineAr,
            headline_en: DEFAULT_SITE_CUSTOMIZATION.heroHeadlineEn,
            subtitle_ar: DEFAULT_SITE_CUSTOMIZATION.heroSubtitleAr,
            subtitle_en: DEFAULT_SITE_CUSTOMIZATION.heroSubtitleEn,
            badge_ar: DEFAULT_SITE_CUSTOMIZATION.heroBadgeAr,
            badge_en: DEFAULT_SITE_CUSTOMIZATION.heroBadgeEn,
            image_url: DEFAULT_SITE_CUSTOMIZATION.heroImage,
            button_text_ar: DEFAULT_SITE_CUSTOMIZATION.heroButtonTextAr,
            button_text_en: DEFAULT_SITE_CUSTOMIZATION.heroButtonTextEn,
          },
        },
        {
          id: 'cms-announcement',
          key: 'announcement',
          title_ar: 'شريط الإعلانات العلوي',
          title_en: 'Top Announcement Bar',
          is_published: true,
          updated_at: '2026-11-01T12:00:00Z',
          updated_by: 'Owner',
          content: {
            text_ar: DEFAULT_SITE_CUSTOMIZATION.topAnnouncementAr,
            text_en: DEFAULT_SITE_CUSTOMIZATION.topAnnouncementEn,
            is_enabled: DEFAULT_SITE_CUSTOMIZATION.isAnnouncementEnabled,
          },
        },
        {
          id: 'cms-branches',
          key: 'branches_contact',
          title_ar: 'معلومات الفروع والتواصل',
          title_en: 'Branches & Direct Contact Info',
          is_published: true,
          updated_at: '2026-11-01T12:00:00Z',
          updated_by: 'Owner',
          content: {
            phone: DEFAULT_SITE_CUSTOMIZATION.phone,
            phone_display: DEFAULT_SITE_CUSTOMIZATION.phoneDisplay,
            whatsapp: DEFAULT_SITE_CUSTOMIZATION.whatsapp,
            email: DEFAULT_SITE_CUSTOMIZATION.email,
            branch1_ar: DEFAULT_SITE_CUSTOMIZATION.branch1AddressAr,
            branch1_en: DEFAULT_SITE_CUSTOMIZATION.branch1AddressEn,
            branch2_ar: DEFAULT_SITE_CUSTOMIZATION.branch2AddressAr,
            branch2_en: DEFAULT_SITE_CUSTOMIZATION.branch2AddressEn,
            copyright_ar: DEFAULT_SITE_CUSTOMIZATION.footerCopyrightAr,
            copyright_en: DEFAULT_SITE_CUSTOMIZATION.footerCopyrightEn,
          },
        },
        {
          id: 'cms-story',
          key: 'about_story',
          title_ar: 'قصة علامة شنطتي',
          title_en: 'About Shantety Story',
          is_published: true,
          updated_at: '2026-11-01T12:00:00Z',
          updated_by: 'Owner',
          content: {
            title_ar: 'عن علامة شنطتي (Shantety)',
            title_en: 'About Shantety Brand',
            description_ar: 'علامة مصرية رائدة في تصنيع وتقديم أرقى حقائب اليد النسائية، الأحذية اللوفرز المريحة وأطقم المناسبات بأعلى معايير الجودة وبخدمة التوصيل لجميع محافظات مصر.',
            description_en: 'A leading Egyptian fashion house creating luxury handbags, ergonomic comfort footwear, and coordinated sets with nationwide delivery.',
          },
        },
      ],
      adminMemberships: [
        {
          user_id: 'owner-uuid-1',
          userId: 'owner-uuid-1',
          id: 'adm-1',
          email: 'shantety2013@gmail.com',
          role: 'super_admin',
          is_active: true,
          isActive: true,
          is_owner: true,
          isOwner: true,
          createdBy: 'system',
          created_by: 'system',
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-01T00:00:00Z',
        },
        {
          user_id: 'admin-uuid-3',
          userId: 'admin-uuid-3',
          id: 'adm-3',
          email: 'admin@shantety.com',
          role: 'store_manager',
          is_active: true,
          isActive: true,
          is_owner: false,
          isOwner: false,
          created_by: 'owner-uuid-2',
          created_at: '2026-10-05T00:00:00Z',
          updated_at: '2026-10-05T00:00:00Z',
        },
        {
          user_id: 'manager-uuid-4',
          userId: 'manager-uuid-4',
          id: 'adm-4',
          email: 'manager@shantety.com',
          role: 'store_manager',
          is_active: true,
          isActive: true,
          is_owner: false,
          isOwner: false,
          created_by: 'owner-uuid-2',
          created_at: '2026-10-10T00:00:00Z',
          updated_at: '2026-10-10T00:00:00Z',
        },
        {
          user_id: 'staff-uuid-5',
          userId: 'staff-uuid-5',
          id: 'adm-5',
          email: 'staff@shantety.com',
          role: 'order_staff',
          is_active: true,
          isActive: true,
          is_owner: false,
          isOwner: false,
          created_by: 'owner-uuid-2',
          created_at: '2026-10-15T00:00:00Z',
          updated_at: '2026-10-15T00:00:00Z',
        },
      ],
    };
  }

  // --------------------------------------------------------------------------
  // PRODUCTS & STOREFRONT
  // --------------------------------------------------------------------------
  getPublicProducts(): any[] {
    return this.state.products.map((p) => {
      return {
        ...p,
        variants: p.variants?.map((v) => ({
          id: v.id,
          product_id: v.product_id,
          sku: v.sku,
          color_id: v.color_id,
          size_id: v.size_id,
          price: v.price,
          sale_price: v.sale_price,
          image: v.image,
          is_active: v.is_active,
          in_stock: (v.stock_on_hand - v.stock_reserved) > 0,
          // Note: raw stock_on_hand and stock_reserved are strictly omitted from public response!
        })),
      };
    });
  }

  getAdminProducts(): Product[] {
    return this.state.products;
  }

  getProductById(id: string): Product | undefined {
    return this.state.products.find((p) => p.id === id);
  }

  upsertProduct(prod: Product, actor = 'admin'): Product {
    const idx = this.state.products.findIndex((p) => p.id === prod.id);
    const updated = {
      ...prod,
      updated_at: new Date().toISOString(),
      created_at: prod.created_at || new Date().toISOString(),
    };
    if (idx >= 0) {
      this.state.products[idx] = updated;
    } else {
      this.state.products.unshift(updated);
    }
    this.recordAudit(actor, 'admin', 'UPSERT_PRODUCT', 'Product', prod.id, `Saved product ${prod.name_en}`);
    return updated;
  }

  deleteProduct(id: string, actor = 'admin'): boolean {
    const before = this.state.products.length;
    this.state.products = this.state.products.filter((p) => p.id !== id);
    if (this.state.products.length < before) {
      this.recordAudit(actor, 'admin', 'DELETE_PRODUCT', 'Product', id, `Deleted product ${id}`);
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // TRUSTED SERVER-AUTHORITATIVE CHECKOUT
  // --------------------------------------------------------------------------
  processCheckout(
    params: {
      customer_name: string;
      customer_phone: string;
      customer_email?: string;
      customer_id?: string;
      shipping_address: CustomerAddress;
      payment_method: PaymentMethod;
      notes?: string;
      cartItems: { variant_id: string; quantity: number }[];
    },
    explicitEnv?: BackendEnv
  ): { success: boolean; order?: Order; error_ar?: string; error_en?: string; tracking_token?: string } {
    // 0. Production Environment Readiness Check (Prohibit silent mock in production)
    const env = explicitEnv || this.runtimeEnv;
    const readiness = getBackendReadiness(env);
    if (readiness.isProduction && !readiness.isConfigured) {
      return {
        success: false,
        error_ar: 'الخدمة غير متوفرة حالياً: تعذر الاتصال بقاعدة البيانات الإنتاجية المعتمدة.',
        error_en: `Production database is not configured. Missing required Supabase credentials: ${readiness.missingRequiredKeys.join(', ')}`,
      };
    }

    // 1. Validation
    const cleanName = (params.customer_name || '').trim();
    if (cleanName.length < 3) {
      return {
        success: false,
        error_ar: 'يرجى إدخال اسم العميل بالكامل (3 أحرف على الأقل)',
        error_en: 'Customer name must be at least 3 characters',
      };
    }

    const cleanPhone = (params.customer_phone || '').replace(/\D/g, '');
    if (!cleanPhone.startsWith('01') || cleanPhone.length !== 11) {
      return {
        success: false,
        error_ar: 'يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01 ويتكون من 11 رقماً',
        error_en: 'Please enter a valid 11-digit Egyptian mobile number starting with 01',
      };
    }

    if (!params.cartItems || params.cartItems.length === 0) {
      return {
        success: false,
        error_ar: 'حقيبة التسوق فارغة',
        error_en: 'Cart is empty',
      };
    }

    // 2. Atomic Inventory Verification with Duplicate Variant Aggregation & Deterministic Sorting
    // Aggregate duplicate variant IDs from cart items to avoid split checkouts
    const aggregatedCart = new Map<string, number>();
    for (const item of params.cartItems) {
      if (!item || !item.variant_id || item.quantity <= 0 || !Number.isInteger(item.quantity) || item.quantity > 50) {
        return {
          success: false,
          error_ar: 'كمية المنتج غير صالحة (يجب أن تكون عدداً صحيحاً بين 1 و 50)',
          error_en: 'Invalid item quantity (must be an integer between 1 and 50)',
        };
      }
      aggregatedCart.set(item.variant_id, (aggregatedCart.get(item.variant_id) || 0) + item.quantity);
    }

    // Sort variant IDs deterministically (ORDER BY variant_id ASC) to prevent concurrency deadlocks
    const sortedVariantIds = Array.from(aggregatedCart.keys()).sort();

    const matchedVariants: Array<{
      product: Product;
      variant: ProductVariant;
      quantity: number;
    }> = [];

    for (const variantId of sortedVariantIds) {
      const quantity = aggregatedCart.get(variantId)!;
      let foundProduct: Product | undefined;
      let foundVariant: ProductVariant | undefined;

      for (const p of this.state.products) {
        const v = p.variants?.find((vx) => vx.id === variantId);
        if (v) {
          foundProduct = p;
          foundVariant = v;
          break;
        }
      }

      if (!foundProduct || !foundVariant) {
        return {
          success: false,
          error_ar: `المنتج المطلوب (${variantId}) غير متوفر في النظام`,
          error_en: `Product variant ${variantId} not found in catalog`,
        };
      }

      const available = foundVariant.stock_on_hand - foundVariant.stock_reserved;
      if (available < quantity) {
        return {
          success: false,
          error_ar: `عذراً، الكمية المتاحة من القطعة (${foundVariant.sku}) هي ${Math.max(0, available)} فقط`,
          error_en: `Insufficient stock for SKU ${foundVariant.sku}. Available: ${Math.max(0, available)}`,
        };
      }

      matchedVariants.push({
        product: foundProduct,
        variant: foundVariant,
        quantity,
      });
    }

    // 3. Authoritative Pricing Calculation (Never trust client prices)
    let subtotal = 0;
    const orderNumber = generateOrderNumber();
    const orderId = 'ord-' + Date.now();
    const resolvedOrderItems: OrderItem[] = [];

    for (const { product, variant, quantity } of matchedVariants) {
      const color = INITIAL_COLORS.find((c) => c.id === variant.color_id);
      const size = INITIAL_SIZES.find((s) => s.id === variant.size_id);
      const unitPrice = variant.sale_price !== undefined && variant.sale_price !== null ? variant.sale_price : variant.price;
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      resolvedOrderItems.push({
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        order_id: orderId,
        product_id: product.id,
        variant_id: variant.id,
        sku: variant.sku,
        product_name_ar: product.name_ar,
        product_name_en: product.name_en,
        color_name_ar: color?.name_ar || 'افتراضي',
        color_name_en: color?.name_en || 'Standard',
        size_name_ar: size?.name_ar || 'مقاس موحد',
        size_name_en: size?.name_en || 'One Size',
        unit_price: unitPrice,
        quantity,
        total_price: lineTotal,
        image: variant.image || product.images[0] || '/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__2__6b416ddc.png',
        selected_options: {
          color_id: variant.color_id,
          color_name_ar: color?.name_ar,
          color_name_en: color?.name_en,
          size_id: variant.size_id,
          size_name_ar: size?.name_ar,
          size_name_en: size?.name_en,
        },
      });
    }

    // Shipping Fee calculation
    const govData = EGYPTIAN_GOVERNORATES.find(
      (g) => g.name_ar === params.shipping_address.governorate || g.name_en === params.shipping_address.governorate
    );
    let shippingFee = govData ? govData.fee : 65;
    if (subtotal >= OFFICIAL_BRAND.free_shipping_threshold) {
      shippingFee = 0;
    }

    const total = subtotal + shippingFee;

    // 4. Cryptographic Tracking Token Generation and Hashing
    const plaintextToken = generateSecureTrackingToken();
    const tokenHash = hashTrackingToken(plaintextToken);

    // 5. Atomic Stock Reservation Execution
    for (const { variant, quantity } of matchedVariants) {
      variant.stock_reserved += quantity;

      this.state.movements.unshift({
        id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        variant_id: variant.id,
        sku: variant.sku,
        movement_type: 'order_reservation',
        quantity_delta: -quantity,
        reference_id: orderNumber,
        notes: `Atomic reservation for Order ${orderNumber}`,
        created_at: new Date().toISOString(),
        created_by: 'System Checkout',
      });
    }

    // 6. Record Order - Payment integrity: never mark paid based only on method selected!
    const initialPaymentStatus: 'pending' | 'awaiting_payment' =
      params.payment_method === 'cod' ? 'pending' : 'awaiting_payment';

    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      tracking_token: plaintextToken, // Returned in response for customer
      user_id: params.customer_id, // Foreign key to auth.users in live Supabase table
      customer_id: params.customer_id,
      customer_name: cleanName,
      customer_phone: cleanPhone,
      customer_email: params.customer_email?.trim() || undefined,
      shipping_address: params.shipping_address,
      items: resolvedOrderItems,
      subtotal,
      shipping_fee: shippingFee,
      discount: 0,
      total,
      currency: 'EGP',
      status: 'pending',
      payment_status: initialPaymentStatus,
      payment_method: params.payment_method,
      shipping_provider: 'Shantety Express',
      tracking_number: 'BST-' + Math.floor(1000000 + Math.random() * 9000000),
      notes: params.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store in internal state with hashed token
    const storedOrder = {
      ...newOrder,
      tracking_token_hash: tokenHash,
    };
    this.state.orders.unshift(storedOrder);

    this.recordAudit(
      cleanName,
      'Customer',
      'CHECKOUT_ORDER_CREATED',
      'Order',
      orderNumber,
      `Created order ${orderNumber} for ${total} EGP (${params.payment_method}, payment_status=${initialPaymentStatus}). Reserved stock for ${matchedVariants.length} items.`
    );

    return {
      success: true,
      order: newOrder,
      tracking_token: plaintextToken,
    };
  }

  // --------------------------------------------------------------------------
  // SECURE GUEST ORDER TRACKING (ZERO PII EXPOSURE)
  // --------------------------------------------------------------------------
  trackOrder(
    orderNumber: string,
    tokenOrPlaintext: string,
    clientIp = 'unknown',
    explicitEnv?: BackendEnv
  ): { success: boolean; data?: any; error_ar?: string; error_en?: string } {
    if (!checkRateLimit(clientIp)) {
      return {
        success: false,
        error_ar: 'تجاوزت الحد المسموح من محاولات الاستعلام. يرجى الانتظار دقيقة والمحاولة مجدداً.',
        error_en: 'Rate limit exceeded. Please wait a moment before trying again.',
      };
    }

    const env = explicitEnv || this.runtimeEnv;
    const readiness = getBackendReadiness(env);
    if (readiness.isProduction && !readiness.isConfigured) {
      return {
        success: false,
        error_ar: 'الخدمة غير متوفرة: تعذر الاتصال بقاعدة البيانات الإنتاجية.',
        error_en: `Production database is not configured. Missing required Supabase credentials: ${readiness.missingRequiredKeys.join(', ')}`,
      };
    }

    const cleanNum = (orderNumber || '').trim().toUpperCase();
    const token = (tokenOrPlaintext || '').trim();

    if (!cleanNum) {
      return {
        success: false,
        error_ar: 'يرجى إدخال رقم الطلب بشكل صحيح',
        error_en: 'Please provide an order number',
      };
    }

    const order = this.state.orders.find((o) => o.order_number.toUpperCase() === cleanNum);

    // Require valid token match using constant-time hash comparison (prevents order enumeration)
    const storedHash = order ? ((order as any).tracking_token_hash || order.tracking_token) : null;
    const isTokenMatch = Boolean(order && token && matchesTokenHash(token, storedHash));

    if (!order || !isTokenMatch) {
      return {
        success: false,
        error_ar: 'لم يتم العثور على شحنة مطابقة للبيانات المدخلة أو رمز الأمان غير صحيح',
        error_en: 'Order not found or invalid security tracking credentials',
      };
    }

    // Calculate estimated delivery
    const created = new Date(order.created_at);
    const estDate = new Date(created.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Sanitized payload: NO phone, NO full street, NO customer email, NO internal notes!
    const sanitizedTrackingData = {
      order_number: order.order_number,
      status: order.status,
      shipping_provider: order.shipping_provider,
      tracking_number: order.tracking_number,
      destination_governorate: order.shipping_address?.governorate || 'مصر',
      destination_city: order.shipping_address?.city || 'المدينة',
      created_at: order.created_at,
      estimated_delivery: estDate.toISOString(),
      items: order.items.map((item) => ({
        product_name_ar: item.product_name_ar,
        product_name_en: item.product_name_en,
        color_name_ar: item.color_name_ar,
        color_name_en: item.color_name_en,
        size_name_ar: item.size_name_ar,
        size_name_en: item.size_name_en,
        quantity: item.quantity,
        unit_price: item.unit_price,
        image: item.image,
      })),
      history: [
        { status: 'pending', timestamp: order.created_at },
        ...(order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered'
          ? [{ status: 'processing', timestamp: new Date(created.getTime() + 3600000).toISOString() }]
          : []),
        ...(order.status === 'shipped' || order.status === 'delivered'
          ? [{ status: 'shipped', timestamp: new Date(created.getTime() + 7200000).toISOString() }]
          : []),
        ...(order.status === 'delivered'
          ? [{ status: 'delivered', timestamp: order.updated_at }]
          : []),
      ],
    };

    return {
      success: true,
      data: sanitizedTrackingData,
    };
  }

  // --------------------------------------------------------------------------
  // CRYPTOGRAPHIC GUEST ORDER CLAIMING
  // --------------------------------------------------------------------------
  claimGuestOrder(
    orderNumber: string,
    trackingToken: string,
    customerId: string,
    customerEmail = 'customer@shantety.com',
    explicitEnv?: BackendEnv
  ): { success: boolean; order_number?: string; error_ar?: string; error_en?: string } {
    const cleanNum = (orderNumber || '').trim().toUpperCase();
    const token = (trackingToken || '').trim();

    if (!cleanNum || !token) {
      return {
        success: false,
        error_ar: 'يرجى إدخال رقم الطلب ورمز التتبع السري',
        error_en: 'Order number and tracking token required',
      };
    }

    const order = this.state.orders.find((o) => o.order_number.toUpperCase() === cleanNum);
    if (!order) {
      return {
        success: false,
        error_ar: 'لم يتم العثور على الطلب المطلوب',
        error_en: 'Order not found',
      };
    }

    const storedHash = (order as any).tracking_token_hash || order.tracking_token;
    if (!matchesTokenHash(token, storedHash)) {
      return {
        success: false,
        error_ar: 'رمز التحقق من ملكية الطلب غير صحيح',
        error_en: 'Invalid order ownership credentials',
      };
    }

    if (order.customer_id && order.customer_id !== customerId) {
      return {
        success: false,
        error_ar: 'هذا الطلب مرتبط بالفعل بحساب عميل آخر',
        error_en: 'Order is already linked to another customer account',
      };
    }

    order.customer_id = customerId;
    order.user_id = customerId;
    order.updated_at = new Date().toISOString();

    this.recordAudit(
      customerEmail,
      'Customer',
      'CLAIM_GUEST_ORDER',
      'Order',
      order.order_number,
      `Claimed guest order ${order.order_number} to customer account ${customerId}`
    );

    return {
      success: true,
      order_number: order.order_number,
    };
  }

  // --------------------------------------------------------------------------
  // ORDER STATUS LIFECYCLE & INVENTORY FULFILLMENT
  // --------------------------------------------------------------------------
  updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    carrier?: string,
    trackingNumber?: string,
    actor = 'admin@shantety.com',
    explicitEnv?: BackendEnv
  ): { success: boolean; order?: Order; error?: string } {
    const env = explicitEnv || this.runtimeEnv;
    const readiness = getBackendReadiness(env);
    if (readiness.isProduction && !readiness.isConfigured) {
      return {
        success: false,
        error: `Production database is not configured. Missing required Supabase credentials: ${readiness.missingRequiredKeys.join(', ')}`,
      };
    }

    const order = this.state.orders.find((o) => o.id === orderId || o.order_number === orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const oldStatus = order.status;
    if (oldStatus === newStatus) {
      return { success: true, order };
    }

    // Validate valid status machine
    const validTransitions: Record<string, string[]> = {
      pending: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: ['refunded'],
      cancelled: [],
      refunded: [],
    };

    if (!validTransitions[oldStatus]?.includes(newStatus)) {
      return {
        success: false,
        error: `Cannot transition order status from ${oldStatus} to ${newStatus}`,
      };
    }

    order.status = newStatus;
    order.updated_at = new Date().toISOString();
    if (carrier) order.shipping_provider = carrier;
    if (trackingNumber) order.tracking_number = trackingNumber;

    // Idempotent stock actions
    if (newStatus === 'delivered' && oldStatus !== 'delivered') {
      order.payment_status = 'paid';
      // Deduct physical on-hand stock and clear reserved
      for (const item of order.items) {
        for (const p of this.state.products) {
          const v = p.variants?.find((vx) => vx.id === item.variant_id);
          if (v) {
            v.stock_on_hand = Math.max(0, v.stock_on_hand - item.quantity);
            v.stock_reserved = Math.max(0, v.stock_reserved - item.quantity);

            this.state.movements.unshift({
              id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              variant_id: v.id,
              sku: v.sku,
              movement_type: 'order_fulfillment',
              quantity_delta: -item.quantity,
              reference_id: order.order_number,
              notes: `Deducted physical stock on delivery of Order ${order.order_number}`,
              created_at: new Date().toISOString(),
              created_by: actor,
            });
            break;
          }
        }
      }
    } else if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
      // Release reserved stock back to available
      for (const item of order.items) {
        for (const p of this.state.products) {
          const v = p.variants?.find((vx) => vx.id === item.variant_id);
          if (v) {
            v.stock_reserved = Math.max(0, v.stock_reserved - item.quantity);

            this.state.movements.unshift({
              id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              variant_id: v.id,
              sku: v.sku,
              movement_type: 'order_cancellation',
              quantity_delta: item.quantity,
              reference_id: order.order_number,
              notes: `Released reserved stock for cancelled Order ${order.order_number}`,
              created_at: new Date().toISOString(),
              created_by: actor,
            });
            break;
          }
        }
      }
    }

    this.recordAudit(
      actor,
      'Admin',
      'ORDER_STATUS_CHANGED',
      'Order',
      order.order_number,
      `Changed status from ${oldStatus} to ${newStatus}`
    );

    return { success: true, order };
  }

  // --------------------------------------------------------------------------
  // ADMIN MEMBERSHIPS & RBAC
  // --------------------------------------------------------------------------
  getAdminMemberships() {
    return this.state.adminMemberships;
  }

  verifyAdminRole(emailOrUserId: string): { isAuthorized: boolean; role?: string; isOwner?: boolean } {
    const clean = (emailOrUserId || '').toLowerCase().trim();
    const isOwner =
      clean === 'shantety2013@gmail.com' ||
      clean === 'owner-uuid-1';

    const member = this.state.adminMemberships.find(
      (m) =>
        m.email?.toLowerCase() === clean ||
        m.userId === clean ||
        m.user_id === clean
    );

    if (member && (member.isActive || member.is_active)) {
      return {
        isAuthorized: true,
        role: member.role,
        isOwner: isOwner || Boolean(member.isOwner || member.is_owner),
      };
    }

    if (isOwner) {
      return { isAuthorized: true, role: 'super_admin', isOwner: true };
    }

    return { isAuthorized: false };
  }

  manageAdminMembership(
    callingUserEmail: string,
    targetUserId: string,
    newRole: 'store_manager' | 'order_staff',
    isActive: boolean,
    explicitEnv?: BackendEnv
  ): { success: boolean; error?: string } {
    // 0. Production Readiness Check
    const env = explicitEnv || this.runtimeEnv;
    const readiness = getBackendReadiness(env);
    if (readiness.isProduction && !readiness.isConfigured) {
      return {
        success: false,
        error: `Production database is not configured. Missing required Supabase credentials: ${readiness.missingRequiredKeys.join(', ')}`,
      };
    }

    // 1. Caller must be owner
    const caller = this.verifyAdminRole(callingUserEmail);
    if (!caller.isAuthorized || !caller.isOwner) {
      return { success: false, error: 'Forbidden: Only the store owner can manage administrative memberships' };
    }

    // 2. Target cannot be owner
    const cleanTarget = (targetUserId || '').toLowerCase().trim();
    const targetIsOwner =
      cleanTarget === 'shantety2013@gmail.com' ||
      cleanTarget === 'owner-uuid-1';

    const target = this.state.adminMemberships.find(
      (m) => m.userId === targetUserId || m.user_id === targetUserId || m.email?.toLowerCase() === cleanTarget
    );

    if (targetIsOwner || (target && (target.isOwner || target.is_owner))) {
      return { success: false, error: 'Protected: The store owner membership cannot be modified or demoted' };
    }

    if (newRole !== 'store_manager' && newRole !== 'order_staff') {
      return { success: false, error: 'Invalid role assignment' };
    }

    if (target) {
      target.role = newRole;
      target.isActive = isActive;
      target.is_active = isActive;
      target.updated_at = new Date().toISOString();
    } else {
      this.state.adminMemberships.push({
        id: 'adm-' + Date.now(),
        userId: targetUserId,
        user_id: targetUserId,
        email: targetUserId.includes('@') ? targetUserId : `${targetUserId}@shantety.com`,
        role: newRole,
        isActive,
        is_active: isActive,
        isOwner: false,
        is_owner: false,
        createdBy: callingUserEmail,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    this.recordAudit(
      callingUserEmail,
      'Owner',
      'MANAGE_ADMIN_MEMBERSHIP',
      'admin_memberships',
      targetUserId,
      `Set role=${newRole}, active=${isActive}`
    );

    return { success: true };
  }

  // --------------------------------------------------------------------------
  // AUDIT LOGS (All active administrator roles can read audit logs)
  // --------------------------------------------------------------------------
  getAuditLogs(callingRole?: string): AuditLog[] {
    // super_admin, store_manager, and order_staff are all verified active admins
    return this.state.auditLogs;
  }

  // --------------------------------------------------------------------------
  // CONTENT MANAGEMENT SYSTEM (CMS)
  // --------------------------------------------------------------------------
  getCmsSections(): any[] {
    return this.state.cmsSections;
  }

  getCmsSection(key: string): any | undefined {
    return this.state.cmsSections.find((s) => s.key === key || s.id === key);
  }

  updateCmsSection(
    key: string,
    data: { title_ar?: string; title_en?: string; content?: Record<string, any>; is_published?: boolean },
    actor = 'admin',
    explicitEnv?: BackendEnv
  ): { success: boolean; section?: any; error?: string } {
    const env = explicitEnv || this.runtimeEnv;
    const readiness = getBackendReadiness(env);
    if (readiness.isProduction) {
      return {
        success: false,
        error: 'CMS database tables (cms_sections, site_customization) do not exist in the authoritative database schema. Migration 004 is required to persist CMS content in production.',
      };
    }

    let section = this.state.cmsSections.find((s) => s.key === key || s.id === key);
    if (!section) {
      section = {
        id: `cms-${Date.now()}`,
        key,
        title_ar: data.title_ar || key,
        title_en: data.title_en || key,
        content: data.content || {},
        is_published: data.is_published !== undefined ? data.is_published : true,
        updated_at: new Date().toISOString(),
        updated_by: actor,
      };
      this.state.cmsSections.push(section);
    } else {
      if (data.title_ar !== undefined) section.title_ar = data.title_ar;
      if (data.title_en !== undefined) section.title_en = data.title_en;
      if (data.content !== undefined) section.content = { ...section.content, ...data.content };
      if (data.is_published !== undefined) section.is_published = data.is_published;
      section.updated_at = new Date().toISOString();
      section.updated_by = actor;
    }

    // Sync back to siteCustomization if hero or announcement or branches was updated
    if (key === 'hero_banner' && section.content) {
      this.state.siteCustomization = {
        ...this.state.siteCustomization,
        heroHeadlineAr: section.content.headline_ar || this.state.siteCustomization.heroHeadlineAr,
        heroHeadlineEn: section.content.headline_en || this.state.siteCustomization.heroHeadlineEn,
        heroSubtitleAr: section.content.subtitle_ar || this.state.siteCustomization.heroSubtitleAr,
        heroSubtitleEn: section.content.subtitle_en || this.state.siteCustomization.heroSubtitleEn,
        heroBadgeAr: section.content.badge_ar || this.state.siteCustomization.heroBadgeAr,
        heroBadgeEn: section.content.badge_en || this.state.siteCustomization.heroBadgeEn,
        heroImage: section.content.image_url || this.state.siteCustomization.heroImage,
        heroButtonTextAr: section.content.button_text_ar || this.state.siteCustomization.heroButtonTextAr,
        heroButtonTextEn: section.content.button_text_en || this.state.siteCustomization.heroButtonTextEn,
      };
    } else if (key === 'announcement' && section.content) {
      this.state.siteCustomization = {
        ...this.state.siteCustomization,
        topAnnouncementAr: section.content.text_ar || this.state.siteCustomization.topAnnouncementAr,
        topAnnouncementEn: section.content.text_en || this.state.siteCustomization.topAnnouncementEn,
        isAnnouncementEnabled: section.content.is_enabled !== undefined ? section.content.is_enabled : true,
      };
    } else if (key === 'branches_contact' && section.content) {
      this.state.siteCustomization = {
        ...this.state.siteCustomization,
        phone: section.content.phone || this.state.siteCustomization.phone,
        phoneDisplay: section.content.phone_display || this.state.siteCustomization.phoneDisplay,
        whatsapp: section.content.whatsapp || this.state.siteCustomization.whatsapp,
        email: section.content.email || this.state.siteCustomization.email,
        branch1AddressAr: section.content.branch1_ar || this.state.siteCustomization.branch1AddressAr,
        branch1AddressEn: section.content.branch1_en || this.state.siteCustomization.branch1AddressEn,
        branch2AddressAr: section.content.branch2_ar || this.state.siteCustomization.branch2AddressAr,
        branch2AddressEn: section.content.branch2_en || this.state.siteCustomization.branch2AddressEn,
        footerCopyrightAr: section.content.copyright_ar || this.state.siteCustomization.footerCopyrightAr,
        footerCopyrightEn: section.content.copyright_en || this.state.siteCustomization.footerCopyrightEn,
      };
    }

    this.recordAudit(
      actor,
      'Admin',
      'UPDATE_CMS_SECTION',
      'cms_sections',
      key,
      `Updated CMS section ${key} (published: ${section.is_published})`
    );

    return { success: true, section };
  }

  getSiteCustomization(): SiteCustomization {
    return this.state.siteCustomization;
  }

  updateSiteCustomization(
    updates: Partial<SiteCustomization>,
    actor = 'admin',
    explicitEnv?: BackendEnv
  ): SiteCustomization {
    const env = explicitEnv || this.runtimeEnv;
    const readiness = getBackendReadiness(env);
    if (readiness.isProduction) {
      throw new BackendConfigurationError(
        'Site customization database table does not exist in the authoritative database schema. Migration 004 is required to persist customization in production.'
      );
    }

    this.state.siteCustomization = {
      ...this.state.siteCustomization,
      ...updates,
    };
    this.recordAudit(
      actor,
      'Admin',
      'UPDATE_SITE_CUSTOMIZATION',
      'SiteCustomization',
      'site-settings',
      'Updated homepage banners, numbers and branch content'
    );
    return this.state.siteCustomization;
  }

  recordAudit(actor: string, role: string, action: string, resourceType: string, resourceId: string, details: string) {
    this.state.auditLogs.unshift({
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      actor,
      role,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
    });
    if (this.state.auditLogs.length > 200) {
      this.state.auditLogs.pop();
    }
  }

  // --------------------------------------------------------------------------
  // REVIEWS
  // --------------------------------------------------------------------------
  getReviews(productId?: string): ProductReview[] {
    if (!productId) return this.state.reviews;
    return this.state.reviews.filter((r) => r.product_id === productId);
  }

  addReview(review: Omit<ProductReview, 'id' | 'date' | 'helpful_count'>): ProductReview {
    const newRev: ProductReview = {
      ...review,
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString(),
      helpful_count: 0,
    };
    this.state.reviews.unshift(newRev);
    this.recordAudit(review.user_name, 'Customer', 'ADD_REVIEW', 'ProductReview', newRev.id, `Rating ${review.rating} for ${review.product_id}`);
    return newRev;
  }

  voteHelpful(id: string): number {
    const rev = this.state.reviews.find((r) => r.id === id);
    if (rev) {
      rev.helpful_count++;
      return rev.helpful_count;
    }
    return 0;
  }

  // --------------------------------------------------------------------------
  // NEWSLETTER SUBSCRIPTION
  // --------------------------------------------------------------------------
  async subscribeNewsletter(
    email: string,
    source = 'homepage_footer',
    explicitEnv?: BackendEnv
  ): Promise<{ success: boolean; isNew: boolean; messageAr: string; messageEn: string }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      throw new Error('Invalid email address format');
    }

    const env = explicitEnv || this.runtimeEnv;
    const adminClient = getSupabaseAdminClient(env);

    if (adminClient) {
      const { data, error } = await adminClient
        .from('newsletter_subscribers')
        .insert([{ email: cleanEmail, source, status: 'active' }])
        .select()
        .single();

      if (error) {
        if (
          error.code === '23505' ||
          error.message?.includes('duplicate') ||
          error.message?.includes('unique')
        ) {
          return {
            success: true,
            isNew: false,
            messageAr: 'أنتِ مشتركة بالفعل في نشرة شنطتي البريدية! يسعدنا تواصلكِ معنا دائماً.',
            messageEn: 'You are already subscribed to the Shantety newsletter! We appreciate your loyalty.',
          };
        }
        throw new Error(error.message);
      }

      this.recordAudit(
        cleanEmail,
        'Guest',
        'NEWSLETTER_SUBSCRIBE',
        'NewsletterSubscriber',
        cleanEmail,
        `Subscribed to newsletter from ${source}`
      );

      return {
        success: true,
        isNew: true,
        messageAr: 'تم اشتراككِ بنجاح في نشرة شنطتي! ستصلكِ أحدث العروض والخصومات الحصرية.',
        messageEn: 'Successfully subscribed to Shantety newsletter! You will receive our latest offers soon.',
      };
    }

    // In-memory development tracking
    this.recordAudit(
      cleanEmail,
      'Guest',
      'NEWSLETTER_SUBSCRIBE_DEV',
      'NewsletterSubscriber',
      cleanEmail,
      `Subscribed to newsletter in dev mode from ${source}`
    );

    return {
      success: true,
      isNew: true,
      messageAr: 'تم اشتراككِ بنجاح في نشرة شنطتي! ستصلكِ أحدث العروض والخصومات الحصرية.',
      messageEn: 'Successfully subscribed to Shantety newsletter! You will receive our latest offers soon.',
    };
  }
}

export const authoritativeStore = new AuthoritativeStore();
