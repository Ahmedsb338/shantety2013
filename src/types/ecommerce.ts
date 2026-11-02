export type Language = 'ar' | 'en';

export interface Category {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  image: string;
  item_count: number;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  logo?: string;
  description_ar: string;
  description_en: string;
}

export interface Color {
  id: string;
  name_ar: string;
  name_en: string;
  hex: string;
}

export interface Size {
  id: string;
  name_ar: string;
  name_en: string;
  type: 'free_size' | 'shoe_size' | 'clothing_size';
  value: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  color_id: string;
  size_id: string;
  price: number;
  sale_price?: number;
  stock_on_hand: number;
  stock_reserved: number;
  image?: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  category_id: string;
  brand_id: string;
  base_price: number;
  base_sale_price?: number;
  images: string[];
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  materials_ar: string;
  materials_en: string;
  dimensions?: string;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
}

export interface InventoryBalance {
  id: string;
  variant_id: string;
  warehouse_id: string;
  on_hand: number;
  reserved: number;
  available: number; // on_hand - reserved
  updated_at: string;
}

export type MovementType = 'receipt' | 'order_reservation' | 'order_cancellation' | 'order_fulfillment' | 'adjustment' | 'return';

export interface InventoryMovement {
  id: string;
  variant_id: string;
  sku: string;
  movement_type: MovementType;
  quantity_delta: number;
  reference_id: string; // Order ID or PO ID
  notes: string;
  created_at: string;
  created_by: string;
}

export interface CustomerAddress {
  id: string;
  customer_name: string;
  phone: string;
  governorate: string;
  city: string;
  street_address: string;
  building_floor?: string;
  notes?: string;
  is_default: boolean;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'cod' | 'card_paymob' | 'instapay_vodafone';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  sku: string;
  product_name_ar: string;
  product_name_en: string;
  color_name_ar: string;
  color_name_en: string;
  size_name_ar: string;
  size_name_en: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  image: string;
  selected_options?: Record<string, any>;
}

export interface Order {
  id: string;
  order_number: string;
  tracking_token?: string; // Secure plaintext token (returned only at creation time)
  tracking_token_hash?: string; // Stored SHA-256 hash or BYTEA in Supabase
  user_id?: string; // Foreign key to auth.users(id) - live Supabase DB column
  customer_id?: string; // Backward compatibility alias
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  shipping_address: CustomerAddress;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  shipping_provider: string; // 'Bosta' | 'Mylerz' | 'Aramex' | 'Shantety Express'
  tracking_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email?: string;
  city: string;
  lead_time_days: number;
  notes: string;
  is_active: boolean;
}

export interface PurchaseOrderItem {
  id: string;
  product_id: string;
  variant_id: string;
  sku: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  items: PurchaseOrderItem[];
  status: 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
  total_cost: number;
  created_at: string;
  expected_date: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
}

export interface GovernorateShipping {
  name_ar: string;
  name_en: string;
  fee: number;
  delivery_days_min: number;
  delivery_days_max: number;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_name: string;
  user_email?: string;
  user_phone?: string;
  order_number?: string;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  is_verified_purchase: boolean;
  date: string;
  helpful_count: number;
  user_city?: string;
  attributes_feedback?: {
    quality?: 'excellent' | 'good' | 'average' | 'poor';
    true_to_size?: 'true' | 'runs_small' | 'runs_large';
    matches_photo?: boolean;
  };
}

export interface SiteCustomization {
  heroHeadlineAr: string;
  heroHeadlineEn: string;
  heroSubtitleAr: string;
  heroSubtitleEn: string;
  heroBadgeAr: string;
  heroBadgeEn: string;
  heroImage: string;
  heroButtonTextAr: string;
  heroButtonTextEn: string;
  topAnnouncementAr: string;
  topAnnouncementEn: string;
  isAnnouncementEnabled: boolean;
  phone: string;
  phoneDisplay: string;
  whatsapp: string;
  email: string;
  branch1AddressAr: string;
  branch1AddressEn: string;
  branch2AddressAr: string;
  branch2AddressEn: string;
  footerCopyrightAr?: string;
  footerCopyrightEn?: string;
  aboutStoryAr?: string;
  aboutStoryEn?: string;
  faqList?: Array<{ questionAr: string; questionEn: string; answerAr: string; answerEn: string }>;
}

export type AdminRole = 'super_admin' | 'store_manager' | 'order_staff';

export interface AdminMembership {
  user_id: string; // Primary key in live Supabase table (references auth.users.id)
  role: AdminRole;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Optional convenience fields for display
  id?: string;
  email?: string;
  is_owner?: boolean;
}

export interface CmsSectionItem {
  id: string;
  key: string;
  title_ar: string;
  title_en: string;
  content: Record<string, any>;
  is_published: boolean;
  updated_at: string;
  updated_by?: string;
}

export interface VisitorMetrics {
  activeVisitorsNow: number;
  todayVisitors: number;
  weeklyVisitors: number;
  todayPageviews: number;
  avgSessionDuration: string;
  bounceRate: number;
  conversionRate: number;
  deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  trafficSources: { nameAr: string; nameEn: string; percentage: number; visits: number }[];
  funnel: { stepAr: string; stepEn: string; count: number; percentage: number }[];
  topViewedProducts: { productId: string; nameAr: string; nameEn: string; views: number; addToCartRate: number }[];
}


