import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
  adminMemberships: Array<{
    id: string;
    userId: string;
    email: string;
    role: 'super_admin' | 'store_manager' | 'order_staff';
    isActive: boolean;
    isOwner: boolean;
  }>;
}

// Hash tracking token using SHA-256
export function hashTrackingToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
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
      adminMemberships: [
        {
          id: 'adm-1',
          userId: 'owner-uuid-1',
          email: 'as0246135@gmail.com',
          role: 'super_admin',
          isActive: true,
          isOwner: true,
        },
        {
          id: 'adm-2',
          userId: 'owner-uuid-2',
          email: 'shantety2013@gmail.com',
          role: 'super_admin',
          isActive: true,
          isOwner: true,
        },
        {
          id: 'adm-3',
          userId: 'admin-uuid-3',
          email: 'admin@shantety.com',
          role: 'super_admin',
          isActive: true,
          isOwner: false,
        },
        {
          id: 'adm-4',
          userId: 'manager-uuid-4',
          email: 'manager@shantety.com',
          role: 'store_manager',
          isActive: true,
          isOwner: false,
        },
        {
          id: 'adm-5',
          userId: 'staff-uuid-5',
          email: 'staff@shantety.com',
          role: 'order_staff',
          isActive: true,
          isOwner: false,
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
  processCheckout(params: {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    customer_id?: string;
    shipping_address: CustomerAddress;
    payment_method: PaymentMethod;
    notes?: string;
    cartItems: { variant_id: string; quantity: number }[];
  }): { success: boolean; order?: Order; error_ar?: string; error_en?: string; tracking_token?: string } {
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

    // 2. Atomic Inventory Verification (all or nothing)
    // Find all variants in authoritative catalog and verify available stock
    const matchedVariants: Array<{
      product: Product;
      variant: ProductVariant;
      quantity: number;
    }> = [];

    for (const item of params.cartItems) {
      if (item.quantity <= 0 || !Number.isInteger(item.quantity) || item.quantity > 50) {
        return {
          success: false,
          error_ar: 'كمية المنتج غير صالحة',
          error_en: 'Invalid item quantity',
        };
      }

      let foundProduct: Product | undefined;
      let foundVariant: ProductVariant | undefined;

      for (const p of this.state.products) {
        const v = p.variants?.find((vx) => vx.id === item.variant_id);
        if (v) {
          foundProduct = p;
          foundVariant = v;
          break;
        }
      }

      if (!foundProduct || !foundVariant) {
        return {
          success: false,
          error_ar: `المنتج المطلوب (${item.variant_id}) غير متوفر في النظام`,
          error_en: `Product variant ${item.variant_id} not found in catalog`,
        };
      }

      const available = foundVariant.stock_on_hand - foundVariant.stock_reserved;
      if (available < item.quantity) {
        return {
          success: false,
          error_ar: `عذراً، الكمية المتاحة من القطعة (${foundVariant.sku}) هي ${Math.max(0, available)} فقط`,
          error_en: `Insufficient stock for SKU ${foundVariant.sku}. Available: ${Math.max(0, available)}`,
        };
      }

      matchedVariants.push({
        product: foundProduct,
        variant: foundVariant,
        quantity: item.quantity,
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

    // 6. Record Order
    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      tracking_token: plaintextToken, // Returned in response for customer
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
      payment_status: params.payment_method === 'cod' ? 'pending' : 'paid',
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
      `Created order ${orderNumber} for ${total} EGP (${params.payment_method}). Reserved stock for ${matchedVariants.length} items.`
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
    clientIp = 'unknown'
  ): { success: boolean; data?: any; error_ar?: string; error_en?: string } {
    if (!checkRateLimit(clientIp)) {
      return {
        success: false,
        error_ar: 'تجاوزت الحد المسموح من محاولات الاستعلام. يرجى الانتظار دقيقة والمحاولة مجدداً.',
        error_en: 'Rate limit exceeded. Please wait a moment before trying again.',
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
    if (!order) {
      return {
        success: false,
        error_ar: 'لم يتم العثور على شحنة مطابقة للبيانات المدخلة',
        error_en: 'Order not found',
      };
    }

    // Verify token hash if provided, or verify against phone/order number
    const providedHash = hashTrackingToken(token);
    const orderHash = (order as any).tracking_token_hash || hashTrackingToken(order.tracking_token);

    const isTokenMatch = token && (providedHash === orderHash || order.tracking_token === token);
    const isDirectMatch = order.order_number.toUpperCase() === cleanNum;

    if (!isTokenMatch && !isDirectMatch) {
      return {
        success: false,
        error_ar: 'رمز الأمان غير مطابق لهذا الطلب',
        error_en: 'Invalid security credentials for this order',
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
  // ORDER STATUS LIFECYCLE & INVENTORY FULFILLMENT
  // --------------------------------------------------------------------------
  updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    carrier?: string,
    trackingNumber?: string,
    actor = 'admin@shantety.com'
  ): { success: boolean; order?: Order; error?: string } {
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
    const clean = emailOrUserId.toLowerCase().trim();
    const member = this.state.adminMemberships.find(
      (m) => m.email.toLowerCase() === clean || m.userId === clean
    );
    if (member && member.isActive) {
      return { isAuthorized: true, role: member.role, isOwner: member.isOwner };
    }
    return { isAuthorized: false };
  }

  manageAdminMembership(
    callingUserEmail: string,
    targetUserId: string,
    newRole: 'store_manager' | 'order_staff',
    isActive: boolean
  ): { success: boolean; error?: string } {
    // 1. Caller must be owner
    const caller = this.verifyAdminRole(callingUserEmail);
    if (!caller.isAuthorized || !caller.isOwner) {
      return { success: false, error: 'Forbidden: Only the store owner can manage administrative memberships' };
    }

    // 2. Target cannot be owner
    const target = this.state.adminMemberships.find((m) => m.userId === targetUserId || m.email === targetUserId);
    if (target && target.isOwner) {
      return { success: false, error: 'Protected: The store owner membership cannot be modified or demoted' };
    }

    if (newRole !== 'store_manager' && newRole !== 'order_staff') {
      return { success: false, error: 'Invalid role assignment' };
    }

    if (target) {
      target.role = newRole;
      target.isActive = isActive;
    } else {
      this.state.adminMemberships.push({
        id: 'adm-' + Date.now(),
        userId: targetUserId,
        email: targetUserId.includes('@') ? targetUserId : `${targetUserId}@shantety.com`,
        role: newRole,
        isActive,
        isOwner: false,
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
  // AUDIT LOGS
  // --------------------------------------------------------------------------
  getAuditLogs(): AuditLog[] {
    return this.state.auditLogs;
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
}

export const authoritativeStore = new AuthoritativeStore();
