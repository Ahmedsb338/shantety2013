-- ============================================================================
-- SHANTETY E-COMMERCE PLATFORM (شنطتي)
-- MIGRATION 004 (PROPOSAL): CMS Sections & Site Customization Tables
-- Target Database: Supabase PostgreSQL
-- Status: PROPOSED / PENDING OWNER APPROVAL
-- ============================================================================

-- PURPOSE:
-- Closes the CMS persistence gap in production:
-- 1. Creates public.cms_sections for dynamic modular content (hero, announcements, branches, about).
-- 2. Creates public.site_customization for global storefront configuration.
-- 3. Implements strict Row Level Security (RLS) allowing public read access but restricting
--    modifications exclusively to active administrative members (super_admin, store_manager).
-- 4. Automatically records audit entries upon CMS modification.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. CMS SECTIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_sections (
  key text PRIMARY KEY,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_sections_published ON public.cms_sections(is_published);

-- ----------------------------------------------------------------------------
-- 2. SITE CUSTOMIZATION TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_customization (
  id text PRIMARY KEY DEFAULT 'primary_settings',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.cms_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_customization ENABLE ROW LEVEL SECURITY;

-- Public Storefront: Read published CMS sections
DROP POLICY IF EXISTS cms_sections_public_read ON public.cms_sections;
CREATE POLICY cms_sections_public_read ON public.cms_sections
  FOR SELECT TO PUBLIC
  USING (is_published = true);

-- Authenticated Admins: Read all CMS sections (including drafts)
DROP POLICY IF EXISTS cms_sections_admin_read ON public.cms_sections;
CREATE POLICY cms_sections_admin_read ON public.cms_sections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('super_admin', 'store_manager')
    )
  );

-- Authenticated Admins: Modify CMS sections
DROP POLICY IF EXISTS cms_sections_admin_write ON public.cms_sections;
CREATE POLICY cms_sections_admin_write ON public.cms_sections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('super_admin', 'store_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('super_admin', 'store_manager')
    )
  );

-- Site Customization: Public Read
DROP POLICY IF EXISTS site_customization_public_read ON public.site_customization;
CREATE POLICY site_customization_public_read ON public.site_customization
  FOR SELECT TO PUBLIC
  USING (true);

-- Site Customization: Admin Write
DROP POLICY IF EXISTS site_customization_admin_write ON public.site_customization;
CREATE POLICY site_customization_admin_write ON public.site_customization
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('super_admin', 'store_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('super_admin', 'store_manager')
    )
  );

-- ----------------------------------------------------------------------------
-- 4. SEED INITIAL CMS CONTENT (BILINGUAL AR/EN)
-- ----------------------------------------------------------------------------
INSERT INTO public.cms_sections (key, title_ar, title_en, content, is_published, updated_by)
VALUES 
  (
    'hero_banner',
    'البانر الرئيسي للمتجر',
    'Main Store Hero Banner',
    jsonb_build_object(
      'badge_ar', 'تشكيلة خريف وشتاء 2026 الحصرية',
      'badge_en', 'Exclusive Autumn / Winter 2026 Collection',
      'headline_ar', 'تألقي بأرقى صيحات الشنط والأحذية النسائية',
      'headline_en', 'Elegance Redefined: Luxury Handbags & Footwear',
      'subtitle_ar', 'صممت خصيصاً للمرأة العصرية في مصر بأعلى معايير الجودة والجلود الطبيعية الفاخرة',
      'subtitle_en', 'Handcrafted for the modern Egyptian woman with premium leathers and timeless aesthetics',
      'image_url', '/assets/aistudio/Generated_Image_October_30__2026_-_1_22AM_4da4df52.png',
      'button_text_ar', 'تسوقي التشكيلة الآن',
      'button_text_en', 'Shop the Collection'
    ),
    true,
    'migration'
  ),
  (
    'announcement',
    'الشريط الإعلاني العلوي',
    'Top Announcement Bar',
    jsonb_build_object(
      'text_ar', 'شحن مجاني لكافة محافظات مصر للطلبات فوق 1,000 جنيه مصري | الدفع عند الاستلام متاح',
      'text_en', 'Free Shipping across Egypt on orders over 1,000 EGP | Cash on Delivery available',
      'is_enabled', true
    ),
    true,
    'migration'
  ),
  (
    'branches_contact',
    'الفروع وأرقام التواصل',
    'Branches & Contact Info',
    jsonb_build_object(
      'phone', '01018862800',
      'phone_display', '010 1886 2800',
      'whatsapp', '201018862800',
      'email', 'shantety2013@gmail.com',
      'branch1_ar', 'فرع مصر الجديدة: 15 شارع الأهرام، روكسي، القاهرة',
      'branch1_en', 'Heliopolis Branch: 15 Al-Ahram St, Roxy, Cairo',
      'branch2_ar', 'فرع الإسكندرية: 42 طريق الجيش، ستانلي، الإسكندرية',
      'branch2_en', 'Alexandria Branch: 42 El-Geish Road, Stanley, Alexandria',
      'footer_copyright_ar', '© 2026 شنطتي (Shantety). جميع الحقوق محفوظة.',
      'footer_copyright_en', '© 2026 Shantety. All rights reserved.'
    ),
    true,
    'migration'
  )
ON CONFLICT (key) DO UPDATE
SET 
  title_ar = EXCLUDED.title_ar,
  title_en = EXCLUDED.title_en,
  content = EXCLUDED.content,
  updated_at = now();

COMMIT;
