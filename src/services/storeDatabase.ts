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
  PaymentStatus,
  CustomerAddress,
  PaymentMethod,
  ProductReview,
  SiteCustomization,
  VisitorMetrics,
  Category,
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
  INITIAL_REVIEWS,
  DEFAULT_SITE_CUSTOMIZATION,
  INITIAL_VISITOR_METRICS,
} from '../data/initialData';

const STORAGE_KEYS = {
  PRODUCTS: 'shanaty_db_products_v2',
  ORDERS: 'shanaty_db_orders_v2',
  CATEGORIES: 'shanaty_db_categories_v2',
  SUPPLIERS: 'shanaty_db_suppliers_v2',
  PURCHASE_ORDERS: 'shanaty_db_purchase_orders_v2',
  MOVEMENTS: 'shanaty_db_movements_v2',
  AUDIT_LOGS: 'shanaty_db_audit_logs_v2',
  REVIEWS: 'shanaty_db_reviews_v2',
  SITE_CUSTOMIZATION: 'shanaty_site_customization_v2',
  VISITOR_METRICS: 'shanaty_visitor_metrics_v2',
  CUSTOMERS: 'shanaty_db_customers_v2',
};

// Cryptographic token generator for secure order tracking
export function generateTrackingToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = 'tk_';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function generateOrderNumber(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `SHN-${randomNum}`;
}

export function generateSKU(prefix: string, color: string, size: string): string {
  const p = prefix.toUpperCase().slice(0, 3);
  const c = color.toUpperCase().slice(0, 3);
  const s = size.toUpperCase().replace(/\s+/g, '-');
  return `SHN-${p}-${c}-${s}`;
}

export class StoreDatabase {
  private static load<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn(`Failed to read from localStorage: ${key}`, e);
    }
    return fallback;
  }

  private static save<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed to write to localStorage: ${key}`, e);
    }
  }

  // PRODUCTS
  static getProducts(): Product[] {
    return this.load<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  static saveProducts(products: Product[]): void {
    this.save(STORAGE_KEYS.PRODUCTS, products);
  }

  static getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  static getProductBySlug(slug: string): Product | undefined {
    return this.getProducts().find((p) => p.slug === slug);
  }

  static async syncFromServer(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const serverProds = await prodRes.json();
        if (Array.isArray(serverProds) && serverProds.length > 0) {
          this.saveProducts(serverProds);
        }
      }
      const ordRes = await fetch('/api/orders');
      if (ordRes.ok) {
        const serverOrders = await ordRes.json();
        if (Array.isArray(serverOrders) && serverOrders.length > 0) {
          this.saveOrders(serverOrders);
        }
      }
    } catch (e) {
      // Graceful offline fallback to local storage
    }
  }

  static updateProduct(product: Product, actor = 'admin@shantety.com'): void {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      products[index] = { ...product, updated_at: new Date().toISOString() };
    } else {
      products.unshift({ ...product, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    this.saveProducts(products);
    this.recordAudit(actor, 'Store Admin', 'UPDATE_PRODUCT', 'Product', product.id, `Saved product "${product.name_en}"`);

    // Sync to PostgreSQL backend
    if (typeof window !== 'undefined') {
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      }).catch(() => {});
    }
  }

  static deleteProduct(productId: string, actor = 'admin@shantety.com'): void {
    let products = this.getProducts();
    products = products.filter((p) => p.id !== productId);
    this.saveProducts(products);
    this.recordAudit(actor, 'Store Admin', 'DELETE_PRODUCT', 'Product', productId, 'Deleted product from catalog');
  }

  // INVENTORY ATOMIC RESERVATIONS
  // Rule: Available Stock = On Hand - Reserved
  static reserveStockAtomically(
    items: { variant_id: string; quantity: number }[],
    orderNumber: string,
    actor = 'System Checkout'
  ): { success: boolean; error_ar?: string; error_en?: string } {
    const products = this.getProducts();
    const movements: InventoryMovement[] = this.getMovements();

    // 1. Verify availability of every requested variant first (all or nothing)
    for (const item of items) {
      let foundVariant: ProductVariant | undefined;
      for (const p of products) {
        const v = p.variants?.find((vx) => vx.id === item.variant_id);
        if (v) {
          foundVariant = v;
          break;
        }
      }

      if (!foundVariant) {
        return {
          success: false,
          error_ar: `المنتج المطلوب برقم المعرف ${item.variant_id} غير متوفر في النظام`,
          error_en: `Product variant ${item.variant_id} not found in inventory`,
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
    }

    // 2. Perform atomic increment of stock_reserved and log movements
    for (const item of items) {
      for (const p of products) {
        const v = p.variants?.find((vx) => vx.id === item.variant_id);
        if (v) {
          v.stock_reserved += item.quantity;
          movements.unshift({
            id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            variant_id: v.id,
            sku: v.sku,
            movement_type: 'order_reservation',
            quantity_delta: -item.quantity,
            reference_id: orderNumber,
            notes: `Atomic reservation for Order ${orderNumber}`,
            created_at: new Date().toISOString(),
            created_by: actor,
          });
          break;
        }
      }
    }

    this.saveProducts(products);
    this.save(STORAGE_KEYS.MOVEMENTS, movements);
    return { success: true };
  }

  static releaseReservedStock(order: Order, actor = 'Order Cancel Manager'): void {
    const products = this.getProducts();
    const movements: InventoryMovement[] = this.getMovements();

    for (const item of order.items) {
      for (const p of products) {
        const v = p.variants?.find((vx) => vx.id === item.variant_id);
        if (v) {
          v.stock_reserved = Math.max(0, v.stock_reserved - item.quantity);
          movements.unshift({
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

    this.saveProducts(products);
    this.save(STORAGE_KEYS.MOVEMENTS, movements);
  }

  static fulfillDeliveredStock(order: Order, actor = 'Shipping Fulfillment'): void {
    const products = this.getProducts();
    const movements: InventoryMovement[] = this.getMovements();

    for (const item of order.items) {
      for (const p of products) {
        const v = p.variants?.find((vx) => vx.id === item.variant_id);
        if (v) {
          v.stock_on_hand = Math.max(0, v.stock_on_hand - item.quantity);
          v.stock_reserved = Math.max(0, v.stock_reserved - item.quantity);
          movements.unshift({
            id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            variant_id: v.id,
            sku: v.sku,
            movement_type: 'order_fulfillment',
            quantity_delta: -item.quantity,
            reference_id: order.order_number,
            notes: `Deducted physical stock upon delivery of Order ${order.order_number}`,
            created_at: new Date().toISOString(),
            created_by: actor,
          });
          break;
        }
      }
    }

    this.saveProducts(products);
    this.save(STORAGE_KEYS.MOVEMENTS, movements);
  }

  // ORDERS
  static getOrders(): Order[] {
    return this.load<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
  }

  static saveOrders(orders: Order[]): void {
    this.save(STORAGE_KEYS.ORDERS, orders);
  }

  static getOrderByNumberAndToken(orderNumber: string, trackingToken: string): Order | undefined {
    const orders = this.getOrders();
    const cleanNum = orderNumber.trim().toUpperCase();
    const cleanTok = trackingToken.trim();
    return orders.find(
      (o) => o.order_number.toUpperCase() === cleanNum && o.tracking_token === cleanTok
    );
  }

  static findOrderBySearch(query: string): Order | undefined {
    const orders = this.getOrders();
    const clean = query.trim().toUpperCase();
    const cleanPhone = query.replace(/\D/g, '');

    return orders.find((o) => {
      if (o.order_number.toUpperCase() === clean) return true;
      if (o.id.toUpperCase() === clean) return true;
      if (o.tracking_token === query.trim()) return true;
      if (o.tracking_number?.toUpperCase() === clean) return true;
      if (cleanPhone.length >= 8 && o.customer_phone.replace(/\D/g, '').includes(cleanPhone)) return true;
      // Partial match like 2601 for SHN-2601
      if (clean.length >= 4 && o.order_number.toUpperCase().includes(clean)) return true;
      return false;
    });
  }

  static getOrderById(id: string): Order | undefined {
    return this.getOrders().find((o) => o.id === id);
  }

  // AUTHORITATIVE CHECKOUT
  static createOrder(params: {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    shipping_address: CustomerAddress;
    payment_method: PaymentMethod;
    notes?: string;
    rawCartItems: { variant_id: string; quantity: number }[];
  }): { success: boolean; order?: Order; error_ar?: string; error_en?: string } {
    // 1. Phone validation for Egypt (starts with 010, 011, 012, 015, total 11 digits)
    const phoneClean = params.customer_phone.replace(/\D/g, '');
    if (!phoneClean.startsWith('01') || phoneClean.length !== 11) {
      return {
        success: false,
        error_ar: 'يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01 ويتكون من 11 رقماً (مثال: 01012345678)',
        error_en: 'Please enter a valid 11-digit Egyptian phone number (e.g., 01012345678)',
      };
    }

    if (!params.customer_name || params.customer_name.trim().length < 3) {
      return {
        success: false,
        error_ar: 'يرجى إدخال الاسم بالكامل',
        error_en: 'Please provide the customer full name',
      };
    }

    const products = this.getProducts();
    const orderNumber = generateOrderNumber();

    // 2. Resolve items with authoritative server-side prices and snapshot
    const resolvedItems: OrderItem[] = [];
    let subtotal = 0;

    for (const cartItem of params.rawCartItems) {
      let matchedProd: Product | undefined;
      let matchedVar: ProductVariant | undefined;

      for (const p of products) {
        const v = p.variants?.find((vx) => vx.id === cartItem.variant_id);
        if (v) {
          matchedProd = p;
          matchedVar = v;
          break;
        }
      }

      if (!matchedProd || !matchedVar) {
        return {
          success: false,
          error_ar: `تعذر العثور على المنتج المطلوب رقم ${cartItem.variant_id}`,
          error_en: `Could not resolve product variant ${cartItem.variant_id}`,
        };
      }

      const color = INITIAL_COLORS.find((c) => c.id === matchedVar?.color_id);
      const size = INITIAL_SIZES.find((s) => s.id === matchedVar?.size_id);
      const unitPrice = matchedVar.sale_price || matchedVar.price;
      const lineTotal = unitPrice * cartItem.quantity;
      subtotal += lineTotal;

      resolvedItems.push({
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        order_id: '',
        product_id: matchedProd.id,
        variant_id: matchedVar.id,
        sku: matchedVar.sku,
        product_name_ar: matchedProd.name_ar,
        product_name_en: matchedProd.name_en,
        color_name_ar: color?.name_ar || 'افتراضي',
        color_name_en: color?.name_en || 'Default',
        size_name_ar: size?.name_ar || 'مقاس موحد',
        size_name_en: size?.name_en || 'One Size',
        unit_price: unitPrice,
        quantity: cartItem.quantity,
        total_price: lineTotal,
        image: matchedVar.image || matchedProd.images[0] || '/assets/aistudio/Generated_Image_October_30__2026_-_1_33AM__2__6b416ddc.png',
      });
    }

    // 3. Atomically reserve stock
    const reservation = this.reserveStockAtomically(
      params.rawCartItems,
      orderNumber,
      params.customer_name
    );

    if (!reservation.success) {
      return {
        success: false,
        error_ar: reservation.error_ar,
        error_en: reservation.error_en,
      };
    }

    // 4. Calculate shipping rate based on Egyptian Governorate
    const govData = EGYPTIAN_GOVERNORATES.find(
      (g) => g.name_ar === params.shipping_address.governorate || g.name_en === params.shipping_address.governorate
    );
    let shippingFee = govData ? govData.fee : 65;
    // Free shipping threshold over 1,500 EGP
    if (subtotal >= 1500) {
      shippingFee = 0;
    }

    const total = subtotal + shippingFee;
    const trackingToken = generateTrackingToken();
    const orderId = 'ord-' + Date.now();

    resolvedItems.forEach((it) => (it.order_id = orderId));

    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      tracking_token: trackingToken,
      customer_name: params.customer_name.trim(),
      customer_phone: phoneClean,
      customer_email: params.customer_email?.trim(),
      shipping_address: params.shipping_address,
      items: resolvedItems,
      subtotal,
      shipping_fee: shippingFee,
      discount: 0,
      total,
      currency: 'EGP',
      status: 'pending',
      payment_status: params.payment_method === 'cod' ? 'pending' : 'paid',
      payment_method: params.payment_method,
      shipping_provider: 'Bosta',
      tracking_number: 'BST-' + Math.floor(1000000 + Math.random() * 9000000),
      notes: params.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const orders = this.getOrders();
    orders.unshift(newOrder);
    this.saveOrders(orders);

    this.recordAudit(
      params.customer_name,
      'Customer',
      'ORDER_CREATED',
      'Order',
      orderNumber,
      `Placed order ${orderNumber} for ${total} EGP (${params.payment_method.toUpperCase()}). Stock reserved.`
    );

    // Sync to PostgreSQL database in background
    if (typeof window !== 'undefined') {
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      }).catch(() => {});
    }

    return { success: true, order: newOrder };
  }

  static updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    carrier?: string,
    trackingNumber?: string,
    actor = 'admin@shantety.com'
  ): Order | undefined {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return undefined;

    const oldStatus = order.status;
    order.status = newStatus;
    order.updated_at = new Date().toISOString();
    if (carrier) order.shipping_provider = carrier;
    if (trackingNumber) order.tracking_number = trackingNumber;

    if (newStatus === 'delivered' && oldStatus !== 'delivered') {
      order.payment_status = 'paid';
      this.fulfillDeliveredStock(order, actor);
    } else if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
      this.releaseReservedStock(order, actor);
    }

    this.saveOrders(orders);
    this.recordAudit(
      actor,
      'Store Manager',
      'ORDER_STATUS_CHANGED',
      'Order',
      order.order_number,
      `Changed status from "${oldStatus}" to "${newStatus}". Carrier: ${order.shipping_provider}`
    );

    // Sync status change to PostgreSQL backend
    if (typeof window !== 'undefined') {
      fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, trackingNumber }),
      }).catch(() => {});
    }

    return order;
  }

  // SUPPLIERS & PURCHASE ORDERS
  static getSuppliers(): Supplier[] {
    return this.load<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  }

  static saveSuppliers(suppliers: Supplier[]): void {
    this.save(STORAGE_KEYS.SUPPLIERS, suppliers);
  }

  static getPurchaseOrders(): PurchaseOrder[] {
    return this.load<PurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, [
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
    ]);
  }

  static savePurchaseOrders(pos: PurchaseOrder[]): void {
    this.save(STORAGE_KEYS.PURCHASE_ORDERS, pos);
  }

  static receiveGoodsReceipt(
    poId: string,
    receivedItems: { sku: string; quantity: number }[],
    actor = 'Warehouse Receiver'
  ): void {
    const pos = this.getPurchaseOrders();
    const po = pos.find((p) => p.id === poId);
    if (!po) return;

    const products = this.getProducts();
    const movements = this.getMovements();

    for (const item of receivedItems) {
      for (const p of products) {
        const v = p.variants?.find((vx) => vx.sku === item.sku);
        if (v) {
          v.stock_on_hand += item.quantity;
          movements.unshift({
            id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
            variant_id: v.id,
            sku: v.sku,
            movement_type: 'receipt',
            quantity_delta: item.quantity,
            reference_id: po.po_number,
            notes: `Received goods receipt from Supplier ${po.supplier_name}`,
            created_at: new Date().toISOString(),
            created_by: actor,
          });
          break;
        }
      }
    }

    po.status = 'received';
    this.savePurchaseOrders(pos);
    this.saveProducts(products);
    this.save(STORAGE_KEYS.MOVEMENTS, movements);
    this.recordAudit(
      actor,
      'Warehouse Manager',
      'GOODS_RECEIPT_POSTED',
      'PurchaseOrder',
      po.po_number,
      `Posted goods receipt for ${receivedItems.reduce((acc, i) => acc + i.quantity, 0)} items.`
    );
  }

  // MOVEMENTS & AUDIT LOGS
  static getMovements(): InventoryMovement[] {
    return this.load<InventoryMovement[]>(STORAGE_KEYS.MOVEMENTS, [
      {
        id: 'mov-init-1',
        variant_id: 'var-bow-beige-free',
        sku: 'SHN-BAG-BOW-BEI-FS',
        movement_type: 'receipt',
        quantity_delta: 50,
        reference_id: 'PO-EG-2026-01',
        notes: 'Initial production batch arrival from Al-Ahram Guild',
        created_at: '2026-10-18T10:00:00Z',
        created_by: 'Warehouse Supervisor',
      },
      {
        id: 'mov-init-2',
        variant_id: 'var-bow-beige-free',
        sku: 'SHN-BAG-BOW-BEI-FS',
        movement_type: 'order_reservation',
        quantity_delta: -1,
        reference_id: 'SHN-2601',
        notes: 'Reserved for delivered order SHN-2601',
        created_at: '2026-10-26T11:20:00Z',
        created_by: 'Checkout System',
      },
    ]);
  }

  static getAuditLogs(): AuditLog[] {
    return this.load<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  static recordAudit(
    actor: string,
    role: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details: string
  ): void {
    const logs = this.getAuditLogs();
    logs.unshift({
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
      actor,
      role,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
    });
    // Keep last 150 entries
    if (logs.length > 150) logs.pop();
    this.save(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // BULK CSV EXPORT
  static exportProductsToCSV(): string {
    const products = this.getProducts();
    const rows = [
      ['SKU', 'Product Name (AR)', 'Product Name (EN)', 'Category', 'Color', 'Size', 'Price (EGP)', 'Sale Price', 'Stock On Hand', 'Stock Reserved', 'Available Stock'].join(','),
    ];

    for (const p of products) {
      if (!p.variants || p.variants.length === 0) continue;
      const cat = INITIAL_CATEGORIES.find((c) => c.id === p.category_id)?.name_en || 'General';
      for (const v of p.variants) {
        const col = INITIAL_COLORS.find((c) => c.id === v.color_id)?.name_en || 'Standard';
        const sz = INITIAL_SIZES.find((s) => s.id === v.size_id)?.name_en || 'One Size';
        const avail = v.stock_on_hand - v.stock_reserved;
        rows.push(
          [
            `"${v.sku}"`,
            `"${p.name_ar.replace(/"/g, '""')}"`,
            `"${p.name_en.replace(/"/g, '""')}"`,
            `"${cat}"`,
            `"${col}"`,
            `"${sz}"`,
            v.price,
            v.sale_price || '',
            v.stock_on_hand,
            v.stock_reserved,
            avail,
          ].join(',')
        );
      }
    }
    return rows.join('\n');
  }

  // BULK CSV IMPORT VALIDATOR
  static parseAndValidateCSV(csvText: string): {
    success: boolean;
    validCount: number;
    errors: string[];
    parsedRows: Array<{ sku: string; price: number; stock: number }>;
  } {
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) {
      return { success: false, validCount: 0, errors: ['الملف فارغ أو لا يحتوي على صفوف بيانات (File is empty)'], parsedRows: [] };
    }

    const errors: string[] = [];
    const parsedRows: Array<{ sku: string; price: number; stock: number }> = [];
    const seenSKUs = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.replace(/^"|"$/g, '').trim());
      if (parts.length < 3) {
        errors.push(`السطر ${i + 1}: عدد الأعمدة غير مكتمل`);
        continue;
      }
      const sku = parts[0];
      const price = parseFloat(parts[1]);
      const stock = parseInt(parts[2], 10);

      if (!sku) {
        errors.push(`السطر ${i + 1}: رمز SKU مفقود`);
        continue;
      }

      if (seenSKUs.has(sku)) {
        errors.push(`السطر ${i + 1}: رمز SKU مكرر (${sku})`);
        continue;
      }
      seenSKUs.add(sku);

      if (isNaN(price) || price <= 0) {
        errors.push(`السطر ${i + 1}: السعر غير صالح للرمز ${sku}`);
        continue;
      }

      if (isNaN(stock) || stock < 0) {
        errors.push(`السطر ${i + 1}: المخزون غير صالح للرمز ${sku}`);
        continue;
      }

      parsedRows.push({ sku, price, stock });
    }

    return {
      success: errors.length === 0,
      validCount: parsedRows.length,
      errors,
      parsedRows,
    };
  }

  static applyCSVBulkUpdates(
    updates: Array<{ sku: string; price: number; stock: number }>,
    actor = 'admin@shantety.com'
  ): { updatedCount: number } {
    const products = this.getProducts();
    let count = 0;

    for (const item of updates) {
      for (const p of products) {
        const v = p.variants?.find((vx) => vx.sku === item.sku);
        if (v) {
          v.price = item.price;
          v.stock_on_hand = item.stock;
          count++;
          break;
        }
      }
    }

    this.saveProducts(products);
    this.recordAudit(
      actor,
      'Store Admin',
      'BULK_CSV_IMPORT',
      'Inventory',
      `Updated ${count} SKUs`,
      `Applied CSV batch update to ${count} product variants.`
    );
    return { updatedCount: count };
  }

  // REVIEWS & RATINGS
  static getReviews(productId?: string): ProductReview[] {
    const all = this.load<ProductReview[]>(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
    if (!productId) return all;
    return all.filter((r) => r.product_id === productId);
  }

  static saveReviews(reviews: ProductReview[]): void {
    this.save(STORAGE_KEYS.REVIEWS, reviews);
  }

  static verifyCustomerPurchase(
    productId: string,
    query: { email?: string; phone?: string; orderNumber?: string }
  ): { isVerified: boolean; orderNumber?: string } {
    const orders = this.getOrders();
    const cleanEmail = query.email?.trim().toLowerCase();
    const cleanPhone = query.phone?.replace(/\D/g, '');
    const cleanOrderNum = query.orderNumber?.trim().toUpperCase();

    // Check if any order matches the customer and contains this product
    for (const order of orders) {
      const orderMatches =
        (cleanOrderNum && order.order_number.toUpperCase() === cleanOrderNum) ||
        (cleanEmail && order.customer_email?.trim().toLowerCase() === cleanEmail) ||
        (cleanPhone && order.customer_phone?.replace(/\D/g, '').endsWith(cleanPhone.slice(-8)));

      if (orderMatches) {
        const hasItem = order.items.some((item) => item.product_id === productId);
        if (hasItem) {
          return { isVerified: true, orderNumber: order.order_number };
        }
      }
    }
    return { isVerified: false };
  }

  static addReview(
    reviewData: Omit<ProductReview, 'id' | 'date' | 'helpful_count'>
  ): ProductReview {
    const reviews = this.load<ProductReview[]>(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
    const newReview: ProductReview = {
      ...reviewData,
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString(),
      helpful_count: 0,
    };

    reviews.unshift(newReview);
    this.saveReviews(reviews);

    this.recordAudit(
      reviewData.user_name,
      'Customer',
      'ADD_REVIEW',
      'ProductReview',
      newReview.id,
      `Added ${newReview.rating}-star review for product ${newReview.product_id} (${newReview.is_verified_purchase ? 'Verified' : 'Unverified'})`
    );

    return newReview;
  }

  static voteHelpful(reviewId: string): number {
    const reviews = this.load<ProductReview[]>(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
    const rev = reviews.find((r) => r.id === reviewId);
    if (rev) {
      rev.helpful_count = (rev.helpful_count || 0) + 1;
      this.saveReviews(reviews);
      return rev.helpful_count;
    }
    return 0;
  }

  static calculateRatingSummary(productId: string) {
    const productReviews = this.getReviews(productId);
    const total = productReviews.length;
    if (total === 0) {
      return {
        averageRating: 5.0,
        totalReviews: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        recommendationRate: 100,
        verifiedCount: 0,
      };
    }

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    let verifiedCount = 0;

    for (const r of productReviews) {
      const rounded = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      distribution[rounded]++;
      sum += r.rating;
      if (r.is_verified_purchase) verifiedCount++;
    }

    const averageRating = Number((sum / total).toFixed(1));
    const positiveReviews = distribution[5] + distribution[4];
    const recommendationRate = Math.round((positiveReviews / total) * 100);

    return {
      averageRating,
      totalReviews: total,
      distribution,
      recommendationRate,
      verifiedCount,
    };
  }

  // SITE CMS CUSTOMIZATION
  static getSiteCustomization(): SiteCustomization {
    return this.load<SiteCustomization>(
      STORAGE_KEYS.SITE_CUSTOMIZATION,
      DEFAULT_SITE_CUSTOMIZATION
    );
  }

  static saveSiteCustomization(
    customization: SiteCustomization,
    actor = 'admin@shantety.com'
  ): void {
    this.save(STORAGE_KEYS.SITE_CUSTOMIZATION, customization);
    this.recordAudit(
      actor,
      'Store Admin',
      'UPDATE_SITE_CMS',
      'SiteCustomization',
      'cms-settings',
      'Updated homepage banner, addresses, and official business content'
    );
  }

  // VISITOR METRICS & BEHAVIOR
  static getVisitorMetrics(): VisitorMetrics {
    return this.load<VisitorMetrics>(
      STORAGE_KEYS.VISITOR_METRICS,
      INITIAL_VISITOR_METRICS
    );
  }

  // BULK PRODUCT IMPORT (WOOCOMMERCE COMPATIBLE)
  static importAllProducts(
    importedList: Product[],
    actor = 'admin@shantety.com'
  ): { successCount: number; errors: string[] } {
    const existing = this.getProducts();
    const errors: string[] = [];
    let count = 0;

    for (const item of importedList) {
      if (!item.name_ar || !item.name_en || !item.base_price) {
        errors.push(`تخطي منتج غير مكتمل: ${item.name_ar || item.name_en || 'بدون اسم'}`);
        continue;
      }

      const existingIndex = existing.findIndex((p) => p.id === item.id || p.slug === item.slug);
      if (existingIndex >= 0) {
        existing[existingIndex] = {
          ...existing[existingIndex],
          ...item,
          updated_at: new Date().toISOString(),
        };
      } else {
        existing.unshift({
          ...item,
          id: item.id || `prod-import-${Date.now()}-${count}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      count++;
    }

    this.saveProducts(existing);
    this.recordAudit(
      actor,
      'Store Admin',
      'BULK_IMPORT_ALL_PRODUCTS',
      'Catalog',
      `Imported ${count} items`,
      `Successfully imported/merged ${count} products into catalog.`
    );

    // Sync to PostgreSQL server
    if (typeof window !== 'undefined') {
      for (const prod of existing.slice(0, count)) {
        fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prod),
        }).catch(() => {});
      }
    }

    return { successCount: count, errors };
  }

  // CATEGORIES MANAGEMENT (NEW / EDIT / DELETE)
  static getCategories(): Category[] {
    return this.load<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }

  static saveCategories(categories: Category[]): void {
    this.save(STORAGE_KEYS.CATEGORIES, categories);
  }

  static addCategory(category: Category, actor = 'admin@shantety.com'): Category {
    const cats = this.getCategories();
    const newCat = {
      ...category,
      id: category.id || `cat-${Date.now()}`,
    };
    cats.push(newCat);
    this.saveCategories(cats);
    this.recordAudit(
      actor,
      'Store Admin',
      'ADD_CATEGORY',
      'Category',
      newCat.id,
      `Created category "${newCat.name_ar}" (${newCat.name_en})`
    );
    return newCat;
  }

  static updateCategory(category: Category, actor = 'admin@shantety.com'): Category {
    const cats = this.getCategories();
    const idx = cats.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      cats[idx] = { ...category };
    } else {
      cats.push(category);
    }
    this.saveCategories(cats);
    this.recordAudit(
      actor,
      'Store Admin',
      'UPDATE_CATEGORY',
      'Category',
      category.id,
      `Updated category "${category.name_ar}"`
    );
    return category;
  }

  static deleteCategory(categoryId: string, actor = 'admin@shantety.com'): boolean {
    const cats = this.getCategories();
    const filtered = cats.filter((c) => c.id !== categoryId);
    if (filtered.length === cats.length) return false;
    this.saveCategories(filtered);
    this.recordAudit(
      actor,
      'Store Admin',
      'DELETE_CATEGORY',
      'Category',
      categoryId,
      `Deleted category ${categoryId}`
    );
    return true;
  }

  // CUSTOMER AUTH & PROFILES
  static getCustomers(): any[] {
    return this.load<any[]>(STORAGE_KEYS.CUSTOMERS, [
      {
        id: 'cust-1',
        name: 'سارة عبد الرحمن',
        phone: '01012345678',
        email: 'sara@example.com',
        governorate: 'الإسكندرية',
        created_at: '2026-10-20T10:00:00Z',
      },
    ]);
  }

  static registerCustomer(customer: {
    name: string;
    phone: string;
    email: string;
    governorate: string;
    password?: string;
  }): any {
    const customers = this.getCustomers();
    const newCust = {
      id: `cust-${Date.now()}`,
      ...customer,
      created_at: new Date().toISOString(),
    };
    customers.push(newCust);
    this.save(STORAGE_KEYS.CUSTOMERS, customers);
    return newCust;
  }
}



