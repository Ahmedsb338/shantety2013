import React, { useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { OFFICIAL_BRAND, businessInfo } from '../data/initialData';

export const SeoHead: React.FC = () => {
  const { currentView, selectedProduct, language, siteCustomization } = useStore();

  useEffect(() => {
    // 1. Dynamic Page Titles & Descriptions
    let pageTitle = language === 'ar'
      ? 'شنطتي (Shantety) — المتجر الرسمي للحقائب والأحذية النسائية في مصر'
      : 'Shantety — Official E-Commerce Store for Handbags & Shoes';
    let pageDesc = language === 'ar'
      ? 'متجر شنطتي الرسمي للحقائب والأحذية النسائية الفاخرة والأطقم المنسوجة في مصر. شحن لجميع المحافظات مع الدفع عند الاستلام وحق المعاينة.'
      : 'Official Shantety platform for women’s bags, shoes, and luxury accessories in Egypt. Nationwide delivery with cash on delivery and inspection.';

    switch (currentView) {
      case 'home':
        pageTitle = language === 'ar'
          ? 'شنطتي (Shantety) — المتجر الرسمي للحقائب والأحذية النسائية في مصر'
          : 'Shantety — Official E-Commerce Store for Handbags & Shoes';
        break;
      case 'shop':
        pageTitle = language === 'ar'
          ? 'كتالوج المنتجات الفاخرة | شنطتي (Shantety)'
          : 'Product Catalog | Shantety Store';
        pageDesc = language === 'ar'
          ? 'تصفحي جميع حقائب اليد النسائية، اللوفرز المريحة، وأطقم المناسبات الراقية من علامة شنطتي.'
          : 'Browse all Shantety women’s handbags, comfortable loafers, and luxury matching ensembles.';
        break;
      case 'product-detail':
        if (selectedProduct) {
          pageTitle = language === 'ar'
            ? `${selectedProduct.name_ar} | شنطتي`
            : `${selectedProduct.name_en} | Shantety`;
          pageDesc = language === 'ar'
            ? selectedProduct.description_ar.slice(0, 160)
            : selectedProduct.description_en.slice(0, 160);
        }
        break;
      case 'order-tracking':
        pageTitle = language === 'ar'
          ? 'تتبع شحنتك المباشرة | شنطتي (Shantety)'
          : 'Live Order Tracking | Shantety';
        pageDesc = language === 'ar'
          ? 'تابعي حالة شحنتك المباشرة وخط سير التوصيل مع مندوب شنطتي وبوسطة.'
          : 'Track your Shantety delivery status live with real-time carrier updates.';
        break;
      case 'checkout':
        pageTitle = language === 'ar'
          ? 'إتمام الطلب والدفع الآمن | شنطتي'
          : 'Secure Checkout | Shantety';
        break;
      case 'order-confirmation':
        pageTitle = language === 'ar'
          ? 'تم تأكيد طلبك بنجاح | شنطتي'
          : 'Order Confirmed | Shantety';
        break;
      case 'account':
        pageTitle = language === 'ar'
          ? 'حساب العميل وتفاصيل التوصيل | شنطتي'
          : 'Customer Account | Shantety';
        break;
      case 'wishlist':
        pageTitle = language === 'ar'
          ? 'قائمة الرغبات المحفوظة | شنطتي'
          : 'Saved Wishlist | Shantety';
        break;
      case 'about':
        pageTitle = language === 'ar'
          ? 'عن علامة شنطتي وقصة الحرفية المصرية | شنطتي'
          : 'About Shantety & Egyptian Craftsmanship';
        break;
      case 'contact':
        pageTitle = language === 'ar'
          ? 'فروع شنطتي في أبو المطامير والتواصل | شنطتي'
          : 'Shantety Branches & Direct Support';
        break;
      case 'shipping-policy':
        pageTitle = language === 'ar'
          ? 'سياسة وأسعار الشحن لجميع المحافظات | شنطتي'
          : 'Shipping Policy & Rates | Shantety';
        break;
      case 'returns-policy':
        pageTitle = language === 'ar'
          ? 'سياسة الاستبدال والاسترجاع (14 يوم) | شنطتي'
          : '14-Day Returns & Exchanges | Shantety';
        break;
      case 'faq':
        pageTitle = language === 'ar'
          ? 'الأسئلة الشائعة وإرشادات الشراء | شنطتي'
          : 'Frequently Asked Questions | Shantety';
        break;
      case 'admin':
        pageTitle = 'لوحة إدارة متجر شنطتي | Shantety Admin';
        pageDesc = 'Administrative system for Shantety store management.';
        break;
    }

    document.title = pageTitle;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', pageDesc);
    }

    // Update OG metadata
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', pageDesc);

    // Robots directive for admin view
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (currentView === 'admin') {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', 'noindex, nofollow');
    } else if (robotsMeta) {
      robotsMeta.setAttribute('content', 'index, follow');
    }

    // 2. Structured Data (JSON-LD) for Products
    const existingProductLd = document.getElementById('jsonld-product');
    if (existingProductLd) {
      existingProductLd.remove();
    }

    if (currentView === 'product-detail' && selectedProduct) {
      const script = document.createElement('script');
      script.id = 'jsonld-product';
      script.type = 'application/ld+json';
      const prodJsonLd = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: language === 'ar' ? selectedProduct.name_ar : selectedProduct.name_en,
        image: selectedProduct.images.map((img) =>
          img.startsWith('http') ? img : `https://shantety.shop${img}`
        ),
        description:
          language === 'ar' ? selectedProduct.description_ar : selectedProduct.description_en,
        brand: {
          '@type': 'Brand',
          name: 'شنطتي - Shantety',
        },
        offers: {
          '@type': 'Offer',
          url: `https://shantety.shop/`,
          priceCurrency: 'EGP',
          price: selectedProduct.base_sale_price || selectedProduct.base_price,
          itemCondition: 'https://schema.org/NewCondition',
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: 'شنطتي (Shantety)',
          },
        },
      };
      script.text = JSON.stringify(prodJsonLd);
      document.head.appendChild(script);
    }
  }, [currentView, selectedProduct, language, siteCustomization]);

  return null;
};
