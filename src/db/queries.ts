import { db } from './index.ts';
import {
  categories,
  brands,
  colors,
  sizes,
  products,
  productVariants,
  orders,
  inventoryMovements,
  suppliers,
  purchaseOrders,
  auditLogs,
  users,
} from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import {
  INITIAL_CATEGORIES,
  INITIAL_BRANDS,
  INITIAL_COLORS,
  INITIAL_SIZES,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_SUPPLIERS,
  INITIAL_AUDIT_LOGS,
} from '../data/initialData.ts';
import { Product, Order, Supplier, PurchaseOrder, AuditLog, InventoryMovement } from '../types/ecommerce.ts';

// Auto-seed database if empty
export async function seedDatabaseIfNeeded() {
  try {
    const existingProducts = await db.select({ id: products.id }).from(products).limit(1);
    if (existingProducts.length > 0) {
      return;
    }

    console.log('Seeding Shantety database with initial catalog...');

    // 1. Categories
    for (const cat of INITIAL_CATEGORIES) {
      await db.insert(categories).values({
        id: cat.id,
        slug: cat.slug,
        nameAr: cat.name_ar,
        nameEn: cat.name_en,
        descriptionAr: cat.description_ar,
        descriptionEn: cat.description_en,
        image: cat.image,
        itemCount: cat.item_count,
      }).onConflictDoNothing();
    }

    // 2. Brands
    for (const b of INITIAL_BRANDS) {
      await db.insert(brands).values({
        id: b.id,
        slug: b.slug,
        name: b.name,
        logo: b.logo || null,
        descriptionAr: b.description_ar,
        descriptionEn: b.description_en,
      }).onConflictDoNothing();
    }

    // 3. Colors
    for (const c of INITIAL_COLORS) {
      await db.insert(colors).values({
        id: c.id,
        nameAr: c.name_ar,
        nameEn: c.name_en,
        hex: c.hex,
      }).onConflictDoNothing();
    }

    // 4. Sizes
    for (const s of INITIAL_SIZES) {
      await db.insert(sizes).values({
        id: s.id,
        nameAr: s.name_ar,
        nameEn: s.name_en,
        type: s.type,
        value: s.value,
      }).onConflictDoNothing();
    }

    // 5. Products & Variants
    for (const p of INITIAL_PRODUCTS) {
      await db.insert(products).values({
        id: p.id,
        slug: p.slug,
        nameAr: p.name_ar,
        nameEn: p.name_en,
        descriptionAr: p.description_ar,
        descriptionEn: p.description_en,
        categoryId: p.category_id,
        brandId: p.brand_id,
        basePrice: p.base_price,
        baseSalePrice: p.base_sale_price || null,
        images: p.images,
        isFeatured: p.is_featured,
        isNewArrival: p.is_new_arrival,
        isBestSeller: p.is_best_seller,
        materialsAr: p.materials_ar,
        materialsEn: p.materials_en,
        dimensions: p.dimensions || null,
      }).onConflictDoNothing();

      if (p.variants && p.variants.length > 0) {
        for (const v of p.variants) {
          await db.insert(productVariants).values({
            id: v.id,
            productId: p.id,
            sku: v.sku,
            colorId: v.color_id,
            sizeId: v.size_id,
            price: v.price,
            salePrice: v.sale_price || null,
            stockOnHand: v.stock_on_hand,
            stockReserved: v.stock_reserved,
            image: v.image || null,
            isActive: v.is_active,
          }).onConflictDoNothing();
        }
      }
    }

    // 6. Suppliers
    for (const sup of INITIAL_SUPPLIERS) {
      await db.insert(suppliers).values({
        id: sup.id,
        name: sup.name,
        contactPerson: sup.contact_person,
        phone: sup.phone,
        email: sup.email || null,
        city: sup.city,
        leadTimeDays: sup.lead_time_days,
        notes: sup.notes,
        isActive: sup.is_active,
      }).onConflictDoNothing();
    }

    // 7. Initial Orders
    for (const ord of INITIAL_ORDERS) {
      await db.insert(orders).values({
        id: ord.id,
        orderNumber: ord.order_number,
        trackingToken: ord.tracking_token,
        customerName: ord.customer_name,
        customerPhone: ord.customer_phone,
        customerEmail: ord.customer_email || null,
        shippingAddress: ord.shipping_address,
        items: ord.items,
        subtotal: ord.subtotal,
        shippingFee: ord.shipping_fee,
        discount: ord.discount || 0,
        total: ord.total,
        currency: ord.currency,
        status: ord.status,
        paymentStatus: ord.payment_status,
        paymentMethod: ord.payment_method,
        shippingProvider: ord.shipping_provider,
        trackingNumber: ord.tracking_number || null,
        notes: ord.notes || null,
      }).onConflictDoNothing();
    }

    // 8. Audit Logs
    for (const log of INITIAL_AUDIT_LOGS) {
      await db.insert(auditLogs).values({
        id: log.id,
        actor: log.actor,
        role: log.role,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        details: log.details,
      }).onConflictDoNothing();
    }

    console.log('Shantety database seeding completed successfully.');
  } catch (error) {
    console.error('Database seeding failed:', error);
    throw new Error('Database seeding failed.', { cause: error });
  }
}

// ---------------- PRODUCTS ----------------

export async function getDbProducts(): Promise<Product[]> {
  try {
    await seedDatabaseIfNeeded();

    const prods = await db.select().from(products);
    const variants = await db.select().from(productVariants);

    return prods.map((p) => {
      const prodVariants = variants.filter((v) => v.productId === p.id).map((v) => ({
        id: v.id,
        product_id: v.productId,
        sku: v.sku,
        color_id: v.colorId || '',
        size_id: v.sizeId || '',
        price: v.price,
        sale_price: v.salePrice ?? undefined,
        stock_on_hand: v.stockOnHand,
        stock_reserved: v.stockReserved,
        image: v.image ?? undefined,
        is_active: v.isActive ?? true,
      }));

      return {
        id: p.id,
        slug: p.slug,
        name_ar: p.nameAr,
        name_en: p.nameEn,
        description_ar: p.descriptionAr,
        description_en: p.descriptionEn,
        category_id: p.categoryId || '',
        brand_id: p.brandId || '',
        base_price: p.basePrice,
        base_sale_price: p.baseSalePrice ?? undefined,
        images: p.images || [],
        is_featured: p.isFeatured ?? false,
        is_new_arrival: p.isNewArrival ?? false,
        is_best_seller: p.isBestSeller ?? false,
        materials_ar: p.materialsAr || '',
        materials_en: p.materialsEn || '',
        dimensions: p.dimensions ?? undefined,
        created_at: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
        updated_at: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
        variants: prodVariants,
      };
    });
  } catch (error) {
    console.error('Failed to get products:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getDbProductById(id: string): Promise<Product | null> {
  try {
    const list = await getDbProducts();
    return list.find((p) => p.id === id) || null;
  } catch (error) {
    console.error('Failed to get product by id:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function upsertDbProduct(product: Product): Promise<void> {
  try {
    await db.insert(products).values({
      id: product.id,
      slug: product.slug,
      nameAr: product.name_ar,
      nameEn: product.name_en,
      descriptionAr: product.description_ar,
      descriptionEn: product.description_en,
      categoryId: product.category_id,
      brandId: product.brand_id,
      basePrice: product.base_price,
      baseSalePrice: product.base_sale_price || null,
      images: product.images,
      isFeatured: product.is_featured,
      isNewArrival: product.is_new_arrival,
      isBestSeller: product.is_best_seller,
      materialsAr: product.materials_ar,
      materialsEn: product.materials_en,
      dimensions: product.dimensions || null,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: products.id,
      set: {
        slug: product.slug,
        nameAr: product.name_ar,
        nameEn: product.name_en,
        descriptionAr: product.description_ar,
        descriptionEn: product.description_en,
        categoryId: product.category_id,
        brandId: product.brand_id,
        basePrice: product.base_price,
        baseSalePrice: product.base_sale_price || null,
        images: product.images,
        isFeatured: product.is_featured,
        isNewArrival: product.is_new_arrival,
        isBestSeller: product.is_best_seller,
        materialsAr: product.materials_ar,
        materialsEn: product.materials_en,
        dimensions: product.dimensions || null,
        updatedAt: new Date(),
      },
    });

    if (product.variants && product.variants.length > 0) {
      for (const v of product.variants) {
        await db.insert(productVariants).values({
          id: v.id,
          productId: product.id,
          sku: v.sku,
          colorId: v.color_id,
          sizeId: v.size_id,
          price: v.price,
          salePrice: v.sale_price || null,
          stockOnHand: v.stock_on_hand,
          stockReserved: v.stock_reserved,
          image: v.image || null,
          isActive: v.is_active,
        }).onConflictDoUpdate({
          target: productVariants.id,
          set: {
            sku: v.sku,
            colorId: v.color_id,
            sizeId: v.size_id,
            price: v.price,
            salePrice: v.sale_price || null,
            stockOnHand: v.stock_on_hand,
            stockReserved: v.stock_reserved,
            image: v.image || null,
            isActive: v.is_active,
          },
        });
      }
    }
  } catch (error) {
    console.error('Failed to upsert product:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ---------------- ORDERS ----------------

export async function getDbOrders(): Promise<Order[]> {
  try {
    await seedDatabaseIfNeeded();
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));

    return rows.map((r) => ({
      id: r.id,
      order_number: r.orderNumber,
      tracking_token: r.trackingToken,
      customer_name: r.customerName,
      customer_phone: r.customerPhone,
      customer_email: r.customerEmail ?? undefined,
      shipping_address: r.shippingAddress as any,
      items: r.items as any[],
      subtotal: r.subtotal,
      shipping_fee: r.shippingFee,
      discount: r.discount ?? 0,
      total: r.total,
      currency: r.currency || 'EGP',
      status: r.status as any,
      payment_status: r.paymentStatus as any,
      payment_method: r.paymentMethod as any,
      shipping_provider: r.shippingProvider || 'Shantety Express',
      tracking_number: r.trackingNumber ?? undefined,
      notes: r.notes ?? undefined,
      created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      updated_at: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to get orders:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createDbOrder(order: Order): Promise<Order> {
  try {
    await db.insert(orders).values({
      id: order.id,
      orderNumber: order.order_number,
      trackingToken: order.tracking_token,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email || null,
      shippingAddress: order.shipping_address,
      items: order.items,
      subtotal: order.subtotal,
      shippingFee: order.shipping_fee,
      discount: order.discount || 0,
      total: order.total,
      currency: order.currency || 'EGP',
      status: order.status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      shippingProvider: order.shipping_provider || 'Shantety Express',
      trackingNumber: order.tracking_number || null,
      notes: order.notes || null,
    });

    return order;
  } catch (error) {
    console.error('Failed to create order:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateDbOrderStatus(
  orderId: string,
  status: Order['status'],
  trackingNumber?: string
): Promise<void> {
  try {
    const updateValues: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };
    if (trackingNumber !== undefined) {
      updateValues.trackingNumber = trackingNumber;
    }

    await db.update(orders).set(updateValues).where(eq(orders.id, orderId));
  } catch (error) {
    console.error('Failed to update order status:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ---------------- AUDIT LOGS ----------------

export async function getDbAuditLogs(): Promise<AuditLog[]> {
  try {
    await seedDatabaseIfNeeded();
    const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp ? r.timestamp.toISOString() : new Date().toISOString(),
      actor: r.actor,
      role: r.role,
      action: r.action,
      resource_type: r.resourceType,
      resource_id: r.resourceId,
      details: r.details || '',
    }));
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function logDbAudit(log: AuditLog): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: log.id,
      actor: log.actor,
      role: log.role,
      action: log.action,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      details: log.details,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
