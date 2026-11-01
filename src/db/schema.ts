import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table authenticated via Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('customer'), // 'customer' | 'admin' | 'staff'
  createdAt: timestamp('created_at').defaultNow(),
});

// Categories
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  descriptionAr: text('description_ar'),
  descriptionEn: text('description_en'),
  image: text('image'),
  itemCount: integer('item_count').default(0),
});

// Brands
export const brands = pgTable('brands', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  logo: text('logo'),
  descriptionAr: text('description_ar'),
  descriptionEn: text('description_en'),
});

// Colors
export const colors = pgTable('colors', {
  id: text('id').primaryKey(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  hex: text('hex').notNull(),
});

// Sizes
export const sizes = pgTable('sizes', {
  id: text('id').primaryKey(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  type: text('type').notNull(),
  value: text('value').notNull(),
});

// Products
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  descriptionAr: text('description_ar').notNull(),
  descriptionEn: text('description_en').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  brandId: text('brand_id').references(() => brands.id),
  basePrice: integer('base_price').notNull(),
  baseSalePrice: integer('base_sale_price'),
  images: jsonb('images').$type<string[]>().notNull(),
  isFeatured: boolean('is_featured').default(false),
  isNewArrival: boolean('is_new_arrival').default(false),
  isBestSeller: boolean('is_best_seller').default(false),
  materialsAr: text('materials_ar'),
  materialsEn: text('materials_en'),
  dimensions: text('dimensions'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Product Variants
export const productVariants = pgTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id).notNull(),
  sku: text('sku').notNull().unique(),
  colorId: text('color_id').references(() => colors.id),
  sizeId: text('size_id').references(() => sizes.id),
  price: integer('price').notNull(),
  salePrice: integer('sale_price'),
  stockOnHand: integer('stock_on_hand').notNull().default(0),
  stockReserved: integer('stock_reserved').notNull().default(0),
  image: text('image'),
  isActive: boolean('is_active').default(true),
});

// Orders
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  trackingToken: text('tracking_token').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email'),
  shippingAddress: jsonb('shipping_address').$type<any>().notNull(),
  items: jsonb('items').$type<any[]>().notNull(),
  subtotal: integer('subtotal').notNull(),
  shippingFee: integer('shipping_fee').notNull(),
  discount: integer('discount').default(0),
  total: integer('total').notNull(),
  currency: text('currency').default('EGP'),
  status: text('status').notNull().default('pending'),
  paymentStatus: text('payment_status').notNull().default('pending'),
  paymentMethod: text('payment_method').notNull().default('cod'),
  shippingProvider: text('shipping_provider').default('Shantety Express'),
  trackingNumber: text('tracking_number'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Inventory Movements
export const inventoryMovements = pgTable('inventory_movements', {
  id: text('id').primaryKey(),
  variantId: text('variant_id').notNull(),
  sku: text('sku').notNull(),
  movementType: text('movement_type').notNull(),
  quantityDelta: integer('quantity_delta').notNull(),
  referenceId: text('reference_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: text('created_by'),
});

// Suppliers
export const suppliers = pgTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone').notNull(),
  email: text('email'),
  city: text('city'),
  leadTimeDays: integer('lead_time_days').default(3),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
});

// Purchase Orders
export const purchaseOrders = pgTable('purchase_orders', {
  id: text('id').primaryKey(),
  poNumber: text('po_number').notNull().unique(),
  supplierId: text('supplier_id').notNull(),
  supplierName: text('supplier_name').notNull(),
  items: jsonb('items').$type<any[]>().notNull(),
  status: text('status').notNull().default('draft'),
  totalCost: integer('total_cost').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  expectedDate: text('expected_date'),
});

// Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow(),
  actor: text('actor').notNull(),
  role: text('role').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  details: text('details'),
});

// Relations
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  color: one(colors, {
    fields: [productVariants.colorId],
    references: [colors.id],
  }),
  size: one(sizes, {
    fields: [productVariants.sizeId],
    references: [sizes.id],
  }),
}));
