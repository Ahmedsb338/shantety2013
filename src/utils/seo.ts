import { Language, Product, Category, StoreView, SiteCustomization } from '../types/ecommerce';
import { OFFICIAL_BRAND } from '../data/initialData';

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'product';
  ogImage: string;
  robots: 'index, follow' | 'noindex, nofollow';
  schemaJsonLd?: Record<string, any>;
}

export interface SeoParams {
  currentView: StoreView;
  selectedProduct?: Product | null;
  selectedCategory?: string | null;
  categories?: Category[];
  searchQuery?: string;
  language?: Language;
  siteCustomization?: Partial<SiteCustomization>;
  siteUrl?: string;
}

const DEFAULT_BASE_URL = 'https://shantety.shop';
const DEFAULT_FALLBACK_IMAGE = 'https://shantety.shop/assets/aistudio/IMG_20261030_022557_bb43babb.jpg';

/**
 * Normalizes an image path to an absolute URL suitable for OpenGraph / Twitter cards.
 */
export function normalizeImageUrl(imgUrl?: string, baseUrl: string = DEFAULT_BASE_URL): string {
  if (!imgUrl) return DEFAULT_FALLBACK_IMAGE;
  if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
    return imgUrl;
  }
  const cleanPath = imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Trims and ensures descriptions fall within 120 - 160 characters for optimal SERP snippets.
 */
export function formatMetaDescription(text: string, fallbackSuffix?: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length >= 120 && clean.length <= 160) {
    return clean;
  }
  if (clean.length > 160) {
    // Trim at word boundary near 157 chars
    const truncated = clean.slice(0, 157);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 120 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }

  // If shorter than 120 characters, append supplementary contextual branding if available
  if (fallbackSuffix) {
    const combined = `${clean} ${fallbackSuffix}`.trim();
    if (combined.length <= 160) {
      return combined;
    }
    const truncated = combined.slice(0, 157);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 120 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }

  return clean;
}

/**
 * Constructs a clean canonical URL based on the store view and active parameters.
 */
export function buildCanonicalUrl(
  view: StoreView,
  productSlug?: string,
  categorySlug?: string,
  baseUrl: string = DEFAULT_BASE_URL
): string {
  switch (view) {
    case 'home':
      return `${baseUrl}/`;
    case 'shop':
      if (categorySlug) {
        return `${baseUrl}/shop?category=${encodeURIComponent(categorySlug)}`;
      }
      return `${baseUrl}/shop`;
    case 'product-detail':
      if (productSlug) {
        return `${baseUrl}/products/${encodeURIComponent(productSlug)}`;
      }
      return `${baseUrl}/shop`;
    case 'order-tracking':
      return `${baseUrl}/track`;
    case 'about':
      return `${baseUrl}/about`;
    case 'contact':
      return `${baseUrl}/contact`;
    case 'faq':
      return `${baseUrl}/faq`;
    case 'shipping-policy':
      return `${baseUrl}/shipping-policy`;
    case 'returns-policy':
      return `${baseUrl}/returns-policy`;
    case 'checkout':
      return `${baseUrl}/checkout`;
    case 'order-confirmation':
      return `${baseUrl}/order-confirmation`;
    case 'account':
      return `${baseUrl}/account`;
    case 'wishlist':
      return `${baseUrl}/wishlist`;
    case 'admin':
      return `${baseUrl}/admin`;
    default:
      return `${baseUrl}/`;
  }
}

/**
 * Pure generator that computes comprehensive, SEO-optimized metadata
 * for titles, meta descriptions, social cards, robots directives, and Schema.org JSON-LD.
 */
export function generateSeoMetadata(params: SeoParams): SeoMetadata {
  const lang = params.language || 'ar';
  const isAr = lang === 'ar';
  const baseUrl = params.siteUrl || DEFAULT_BASE_URL;
  const view = params.currentView;

  // Find category object if a category ID or slug is selected
  const activeCategory = params.selectedCategory && params.categories
    ? params.categories.find(
        (c) => c.id === params.selectedCategory || c.slug === params.selectedCategory
      )
    : undefined;

  let title = '';
  let rawDesc = '';
  let ogType: 'website' | 'product' = 'website';
  let ogImage = DEFAULT_FALLBACK_IMAGE;
  let robots: 'index, follow' | 'noindex, nofollow' = 'index, follow';
  let schemaJsonLd: Record<string, any> | undefined = undefined;

  switch (view) {
    case 'home': {
      title = isAr
        ? 'شنطتي (Shantety) | المتجر الرسمي للحقائب والأحذية النسائية'
        : 'Shantety | Official Luxury Handbags & Comfort Footwear';
      rawDesc = isAr
        ? 'تسوقي أرقى حقائب اليد النسائية والأحذية المريحة وأطقم المونوغرام الفاخرة من شنطتي. شحن لكافة المحافظات مع الدفع عند الاستلام وحق المعاينة قبل الاستلام.'
        : 'Shop premier handcrafted women’s handbags, comfort loafers, and matching monogram sets from Shantety. Cash on delivery with inspection before payment across Egypt.';
      ogImage = normalizeImageUrl(params.siteCustomization?.heroImage, baseUrl);
      schemaJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: isAr ? 'شنطتي - Shantety' : 'Shantety Official Store',
        url: `${baseUrl}/`,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${baseUrl}/shop?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      };
      break;
    }

    case 'shop': {
      if (params.searchQuery && params.searchQuery.trim().length > 0) {
        const query = params.searchQuery.trim();
        title = isAr
          ? `نتائج البحث عن "${query}" | شنطتي Shantety`
          : `Search results for "${query}" | Shantety`;
        rawDesc = isAr
          ? `استكشفي المنتجات المتوافقة مع "${query}" ضمن تشكيلة شنطتي الفاخرة للحقائب والأحذية في مصر. جودة عالية وضمان معاينة عند الاستلام وتوصيل سريع.`
          : `Browse luxury results matching "${query}" in Shantety Egypt catalog. Premium women's leather bags and footwear with cash on delivery and inspection.`;
      } else if (activeCategory) {
        const catName = isAr ? activeCategory.name_ar : activeCategory.name_en;
        title = isAr
          ? `${catName} فاخرة | كولكشن شـنـطـتـي مصر`
          : `${catName} Collection | Shantety Egypt`;
        const catDesc = isAr ? activeCategory.description_ar : activeCategory.description_en;
        rawDesc = isAr
          ? `${catDesc}. تسوقي أرقى تصاميم شنطتي الأصلية مع خدمة التوصيل السريع لجميع محافظات مصر والدفع عند الاستلام مع المعاينة.`
          : `${catDesc}. Shop authentic Shantety designer pieces with fast nationwide shipping across Egypt and cash on delivery inspection.`;
        if (activeCategory.image) {
          ogImage = normalizeImageUrl(activeCategory.image, baseUrl);
        }
      } else {
        title = isAr
          ? 'كتالوج الحقائب والأحذية الفاخرة | شنطتي Shantety'
          : 'Luxury Handbags & Footwear Catalog | Shantety';
        rawDesc = isAr
          ? 'تصفحي كتالوج شنطتي الكامل للحقائب النسائية الراقية، اللوفرز المريحة، وأطقم الهدايا الأنيقة. شحن سريع لكافة محافظات مصر وضمان المعاينة.'
          : 'Explore full Shantety collection of women’s handcrafted leather bags, ergonomic loafers, and matching statement sets with nationwide Egypt delivery.';
      }

      schemaJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description: rawDesc,
        url: buildCanonicalUrl(view, undefined, activeCategory?.slug, baseUrl),
      };
      break;
    }

    case 'product-detail': {
      const prod = params.selectedProduct;
      if (prod) {
        const prodName = isAr ? prod.name_ar : prod.name_en;
        const prodDesc = isAr ? prod.description_ar : prod.description_en;
        const price = prod.base_sale_price || prod.base_price;

        title = isAr
          ? `${prodName} — ${price} ج.م | شنطتي Shantety`
          : `${prodName} — ${price} EGP | Shantety Egypt`;
        rawDesc = isAr
          ? `${prodName}: ${prodDesc}. احصلي عليها الآن من متجر شنطتي مع ميزة المعاينة قبل الاستلام وشحن سريع لجميع المحافظات.`
          : `${prodName}: ${prodDesc}. Order now from Shantety Egypt with cash on delivery and pre-acceptance inspection guarantee.`;

        ogType = 'product';
        if (prod.images && prod.images.length > 0) {
          ogImage = normalizeImageUrl(prod.images[0], baseUrl);
        }

        schemaJsonLd = {
          '@context': 'https://schema.org/',
          '@type': 'Product',
          name: prodName,
          image: (prod.images || []).map((img) => normalizeImageUrl(img, baseUrl)),
          description: prodDesc,
          sku: prod.slug || prod.id,
          brand: {
            '@type': 'Brand',
            name: 'شنطتي - Shantety',
          },
          offers: {
            '@type': 'Offer',
            url: buildCanonicalUrl('product-detail', prod.slug, undefined, baseUrl),
            priceCurrency: 'EGP',
            price: price,
            itemCondition: 'https://schema.org/NewCondition',
            availability: 'https://schema.org/InStock',
            seller: {
              '@type': 'Organization',
              name: 'شنطتي (Shantety)',
              url: baseUrl,
            },
          },
        };
      } else {
        title = isAr ? 'تفاصيل المنتج | شنطتي Shantety' : 'Product Details | Shantety';
        rawDesc = isAr
          ? 'استكشفي تفاصيل ومواصفات منتجات شنطتي الحصرية للحقائب والأحذية النسائية الفاخرة مع صور عالية الدقة ومعاينة مباشرة عند الاستلام.'
          : 'Discover luxury women’s handbag and footwear specifications with high-resolution details and cash on delivery at Shantety Egypt.';
      }
      break;
    }

    case 'order-tracking': {
      title = isAr
        ? 'تتبع شحنتك المباشرة لحظة بلحظة | شنطتي'
        : 'Live Delivery Order Tracking | Shantety Egypt';
      rawDesc = isAr
        ? 'تابعي حالة شحنتك ومسار تسليم الطلب مع مندوب شنطتي أو شركة الشحن بكل شفافية عبر رقم هاتفك أو كود التتبع المخصص لطلبك.'
        : 'Track your live order status and parcel delivery with Shantety courier updates using your phone number or unique tracking hash.';
      robots = 'noindex, nofollow';
      break;
    }

    case 'checkout': {
      title = isAr
        ? 'إتمام الطلب والدفع الآمن | شنطتي Shantety'
        : 'Secure Checkout & Payment | Shantety Egypt';
      rawDesc = isAr
        ? 'صفحة الدفع الآمن لمتجر شنطتي. اختاري وسيلة الدفع المفضلة مع الدفع عند الاستلام والمعاينة الكاملة للمنتج قبل التسليم في مصر.'
        : 'Secure checkout portal for Shantety. Choose your preferred delivery address and cash on delivery with complete piece inspection.';
      robots = 'noindex, nofollow';
      break;
    }

    case 'order-confirmation': {
      title = isAr
        ? 'تم تأكيد طلبك بنجاح | شنطتي Shantety'
        : 'Order Confirmed Successfully | Shantety';
      rawDesc = isAr
        ? 'شكراً لتسوقك من علامة شنطتي. تم استلام طلبك وجارٍ تجهيز القطع المختارة للشحن الفوري مع إمكانية المعاينة عند الاستلام.'
        : 'Thank you for shopping at Shantety. Your order has been placed and is being prepared for swift courier dispatch with inspection.';
      robots = 'noindex, nofollow';
      break;
    }

    case 'account': {
      title = isAr
        ? 'حساب العميل وسجل الطلبات | شنطتي Shantety'
        : 'Customer Account & Order History | Shantety';
      rawDesc = isAr
        ? 'إدارة حساب العميل، عناوين الشحن المحفوظة، وسجل الطلبات السابقة في متجر شنطتي الرسمي للحقائب والأحذية النسائية.'
        : 'Manage your customer profile, saved delivery addresses, and prior order histories on official Shantety online store.';
      robots = 'noindex, nofollow';
      break;
    }

    case 'wishlist': {
      title = isAr
        ? 'قائمة الرغبات والمفضلات | شنطتي Shantety'
        : 'Saved Wishlist & Favorites | Shantety';
      rawDesc = isAr
        ? 'قائمتك المفضلة للحقائب والأحذية المنسوجة من علامة شنطتي. احفظي قطعك المفضلة وتابعي العروض والخصومات لتسوقها لاحقاً.'
        : 'Your saved favorite bags and footwear from Shantety. Keep track of desired pieces, price updates, and nationwide availability.';
      robots = 'noindex, nofollow';
      break;
    }

    case 'about': {
      title = isAr
        ? 'عن علامة شنطتي وقصة الحرفية المصرية | شنطتي'
        : 'About Shantety & Egyptian Craftsmanship Heritage';
      rawDesc = isAr
        ? 'تعرفي على قصة علامة شنطتي منذ انطلاقها عام 2013 في البحيرة ومصر، والالتزام بتقديم تصاميم مونوغرام راقية وجلود عالية الجودة.'
        : 'Learn about Shantety heritage since 2013 in Beheira and Egypt, dedicated to timeless monogram craftsmanship and comfort.';
      break;
    }

    case 'contact': {
      title = isAr
        ? 'فروع شنطتي في أبو المطامير والتواصل | شنطتي'
        : 'Shantety Branches & Direct Customer Service';
      rawDesc = isAr
        ? 'تواصلي مع فريق خدمة عملاء شنطتي مباشرة عبر الواتساب أو زوري فروعنا في أبو المطامير بالبحيرة (شارع مهران وشارع الشعراوي).'
        : 'Reach Shantety support directly via WhatsApp or visit our official retail branches in Abu El Matamir, Beheira, Egypt.';
      break;
    }

    case 'faq': {
      title = isAr
        ? 'الأسئلة الشائعة وإرشادات الشراء | شنطتي'
        : 'Frequently Asked Questions & Buying Guide | Shantety';
      rawDesc = isAr
        ? 'إجابات شاملة لجميع استفسارات الشراء، سياسة المعاينة قبل الاستلام، طرق الدفع المتاحة، ومواعيد الشحن لجميع المحافظات.'
        : 'Comprehensive answers regarding ordering, cash on delivery inspection, payment methods, and shipping timelines across Egypt.';
      break;
    }

    case 'shipping-policy': {
      title = isAr
        ? 'سياسة وأسعار الشحن لجميع المحافظات | شنطتي'
        : 'Nationwide Shipping Policy & Rates | Shantety';
      rawDesc = isAr
        ? 'تعرفي على تفاصيل الشحن السريع لجميع محافظات مصر مع شنطتي، الشحن المجاني للطلبات فوق 1,500 ج.م، وحق المعاينة قبل الاستلام.'
        : 'Explore Shantety nationwide shipping terms in Egypt, free delivery thresholds over 1,500 EGP, and parcel inspection guarantees.';
      break;
    }

    case 'returns-policy': {
      title = isAr
        ? 'سياسة الاستبدال والاسترجاع (14 يوماً) | شنطتي'
        : '14-Day Returns & Exchanges Policy | Shantety';
      rawDesc = isAr
        ? 'سياسة استبدال واسترجاع مرنة خلال 14 يوماً من شنطتي لضمان رضاكِ التام عن كل حقيبة وحذاء، مع سهولة استرجاع أو استبدال المقاس.'
        : 'Hassle-free 14-day return and exchange policy from Shantety ensuring absolute satisfaction with every purchase in Egypt.';
      break;
    }

    case 'admin': {
      title = 'لوحة إدارة متجر شنطتي | Shantety Admin Operations';
      rawDesc = 'Secure administrative console for Shantety store catalog, orders, and inventory management. Unauthorized access strictly prohibited.';
      robots = 'noindex, nofollow';
      break;
    }

    default: {
      title = isAr
        ? 'شنطتي (Shantety) | المتجر الرسمي للحقائب والأحذية النسائية'
        : 'Shantety | Official Luxury Handbags & Footwear in Egypt';
      rawDesc = isAr
        ? 'متجر شنطتي الرسمي للحقائب والأحذية النسائية الفاخرة في مصر. شحن لجميع المحافظات مع الدفع عند الاستلام وحق المعاينة قبل الاستلام.'
        : 'Official Shantety platform for women’s bags, shoes, and luxury accessories in Egypt with cash on delivery and full inspection.';
      break;
    }
  }

  const description = formatMetaDescription(rawDesc);
  const canonicalUrl = buildCanonicalUrl(
    view,
    params.selectedProduct?.slug,
    activeCategory?.slug,
    baseUrl
  );

  return {
    title,
    description,
    canonicalUrl,
    ogType,
    ogImage,
    robots,
    schemaJsonLd,
  };
}

/**
 * Updates DOM document head elements dynamically:
 * - document.title
 * - meta[name="description"]
 * - meta[property^="og:"]
 * - meta[name^="twitter:"]
 * - link[rel="canonical"]
 * - meta[name="robots"]
 * - script#shantety-dynamic-jsonld
 *
 * Safe for execution in both browser and headless/test environments with mock DOM.
 */
export function updateDocumentHead(meta: SeoMetadata): void {
  if (typeof document === 'undefined') return;

  // 1. Update Document Title
  document.title = meta.title;

  // Helper to get or create meta tags
  const setMetaTag = (attributeName: 'name' | 'property', attributeValue: string, content: string) => {
    let el = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attributeName, attributeValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // 2. Primary Meta Description
  setMetaTag('name', 'description', meta.description);

  // 3. OpenGraph Tags
  setMetaTag('property', 'og:title', meta.title);
  setMetaTag('property', 'og:description', meta.description);
  setMetaTag('property', 'og:url', meta.canonicalUrl);
  setMetaTag('property', 'og:type', meta.ogType);
  setMetaTag('property', 'og:site_name', 'Shantety (شنطتي)');
  setMetaTag('property', 'og:image', meta.ogImage);

  // 4. Twitter Card Tags
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', meta.title);
  setMetaTag('name', 'twitter:description', meta.description);
  setMetaTag('name', 'twitter:image', meta.ogImage);

  // 5. Robots Meta Tag
  setMetaTag('name', 'robots', meta.robots);

  // 6. Canonical Link
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', meta.canonicalUrl);

  // 7. Schema.org JSON-LD structured data
  const SCRIPT_ID = 'shantety-dynamic-jsonld';
  const existingScript = document.getElementById(SCRIPT_ID);
  if (existingScript) {
    existingScript.remove();
  }

  if (meta.schemaJsonLd) {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(meta.schemaJsonLd);
    document.head.appendChild(script);
  }
}
