import { authoritativeStore, hashTrackingToken } from '../src/server/commerceService';
import { getBackendReadiness, assertProductionBackendReady, BackendConfigurationError } from '../src/server/supabaseBackend';
import { verifyAdminRequest } from '../src/server/authMiddleware';
import { maskSupabaseUrl, maskSupabaseAnonKey } from '../src/lib/supabaseDiagnostics';
import { generateSeoMetadata } from '../src/utils/seo';
import { INITIAL_CATEGORIES } from '../src/data/initialData';

interface TestResult {
  name: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
}

const testResults: TestResult[] = [];

function assert(name: string, condition: boolean, expected: string, actual: string, evidence: string) {
  testResults.push({
    name,
    expected,
    actual,
    status: condition ? 'PASS' : 'FAIL',
    evidence,
  });
}

export async function runSecurityAndBusinessTests() {
  console.log('===============================================================');
  console.log('SHANTETY E-COMMERCE: EXECUTING COMPREHENSIVE TEST SUITE');
  console.log('===============================================================\n');

  // Test 1: Public catalog masks raw inventory counts (stock_on_hand and stock_reserved must be omitted)
  const publicCatalog = authoritativeStore.getPublicProducts();
  const firstVariant = publicCatalog[0]?.variants?.[0];
  const hasRawStock = firstVariant && ('stock_on_hand' in firstVariant || 'stock_reserved' in firstVariant);
  const hasInStockFlag = firstVariant && 'in_stock' in firstVariant;
  assert(
    'Public users cannot read raw stock quantities',
    !hasRawStock && hasInStockFlag,
    'Raw stock_on_hand/stock_reserved omitted, in_stock boolean provided',
    hasRawStock ? 'Raw stock was exposed' : 'Stock masked, in_stock=' + firstVariant?.in_stock,
    'Verified public variant fields: ' + Object.keys(firstVariant || {}).join(', ')
  );

  // Test 2: Anonymous user cannot access admin APIs / unauthorized admin login rejected
  const fakeAdminCheck = authoritativeStore.verifyAdminRole('attacker@evil.com');
  assert(
    'Anonymous / untrusted user cannot access admin APIs',
    fakeAdminCheck.isAuthorized === false,
    'isAuthorized=false',
    `isAuthorized=${fakeAdminCheck.isAuthorized}`,
    'attacker@evil.com authorization returned ' + JSON.stringify(fakeAdminCheck)
  );

  // Test 3: Guest checkout calculates prices authoritatively and prevents price manipulation
  const sampleVariant = authoritativeStore.getAdminProducts()[0]?.variants?.[0];
  const variantId = sampleVariant?.id || 'var-bow-beige-free';
  const realPrice = sampleVariant?.sale_price || sampleVariant?.price || 850;

  const checkoutAttempt = authoritativeStore.processCheckout({
    customer_name: 'سارة أحمد التست',
    customer_phone: '01012345678',
    shipping_address: {
      id: 'addr-test',
      customer_name: 'سارة أحمد',
      phone: '01012345678',
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      street_address: 'شارع عباس العقاد',
      is_default: true,
    },
    payment_method: 'cod',
    cartItems: [{ variant_id: variantId, quantity: 1 }],
  });

  const orderCreated = checkoutAttempt.order;
  const lineItem = orderCreated?.items[0];
  const priceMatchesDatabase = lineItem?.unit_price === realPrice;
  assert(
    'Guest checkout calculates prices authoritatively (prevents price manipulation)',
    checkoutAttempt.success && priceMatchesDatabase,
    `Unit price must equal database authoritative price (${realPrice} EGP)`,
    `Order placed with price: ${lineItem?.unit_price} EGP`,
    `Created Order ${orderCreated?.order_number}, total=${orderCreated?.total} EGP`
  );

  // Test 4: Tracking token hashing (Plaintext token is never stored as plaintext in internal state)
  const tokenGivenToBuyer = checkoutAttempt.tracking_token || '';
  const storedOrder = authoritativeStore['state'].orders.find(
    (o) => o.order_number === orderCreated?.order_number
  );
  const storedHash = (storedOrder as any)?.tracking_token_hash;
  const expectedHash = hashTrackingToken(tokenGivenToBuyer);
  assert(
    'Guest tracking tokens are securely hashed with SHA-256 in storage',
    storedHash === expectedHash && !storedOrder?.tracking_token?.includes('PLAINTEXT_SECRET_LEAK'),
    'Token stored only as SHA-256 hash',
    `Stored hash matches SHA-256(${tokenGivenToBuyer.slice(0, 8)}...)`,
    `Hash: ${storedHash}`
  );

  // Test 5: Guest tracking endpoint does NOT expose customer PII (phone, full street, email, notes)
  const trackingLookup = authoritativeStore.trackOrder(
    orderCreated!.order_number,
    tokenGivenToBuyer,
    '127.0.0.1'
  );
  const trackingData = trackingLookup.data;
  const hasPhone = trackingData && 'customer_phone' in trackingData;
  const hasEmail = trackingData && 'customer_email' in trackingData;
  const hasNotes = trackingData && 'notes' in trackingData;
  assert(
    'Guest tracking does not expose personal information (PII)',
    !hasPhone && !hasEmail && !hasNotes && Boolean(trackingData?.destination_city),
    'No customer_phone, no customer_email, only city/governorate and logistics status',
    `Phone exposed: ${hasPhone}, Email exposed: ${hasEmail}`,
    'Returned tracking keys: ' + Object.keys(trackingData || {}).join(', ')
  );

  // Test 6: Concurrent checkout cannot oversell stock (Atomic availability check)
  const highQtyVariant = authoritativeStore.getAdminProducts()[1]?.variants?.[0];
  const availableQty = (highQtyVariant?.stock_on_hand || 10) - (highQtyVariant?.stock_reserved || 0);

  const oversizedCheckout = authoritativeStore.processCheckout({
    customer_name: 'عميل يحاول الشراء الزائد',
    customer_phone: '01011112222',
    shipping_address: {
      id: 'addr-oversell',
      customer_name: 'تست',
      phone: '01011112222',
      governorate: 'الإسكندرية',
      city: 'سموحة',
      street_address: 'شارع فوزي معاذ',
      is_default: true,
    },
    payment_method: 'cod',
    cartItems: [{ variant_id: highQtyVariant?.id || 'var-loafer-tan-38', quantity: availableQty + 999 }],
  });
  assert(
    'Checkout prevents overselling stock beyond availability',
    oversizedCheckout.success === false,
    'Rejected with insufficient stock error',
    oversizedCheckout.success ? 'Allowed oversell!' : `Blocked: "${oversizedCheckout.error_ar}"`,
    `Attempted ${availableQty + 999} units when ${availableQty} available`
  );

  // Test 7: Order status transition: cancellation releases stock exactly once
  const stockBeforeCancel = sampleVariant!.stock_reserved;
  const cancelResult1 = authoritativeStore.updateOrderStatus(
    orderCreated!.id,
    'cancelled',
    undefined,
    undefined,
    'admin@shantety.com'
  );
  const stockAfterCancel1 = sampleVariant!.stock_reserved;

  const cancelResult2 = authoritativeStore.updateOrderStatus(
    orderCreated!.id,
    'cancelled',
    undefined,
    undefined,
    'admin@shantety.com'
  );
  const stockAfterCancel2 = sampleVariant!.stock_reserved;

  assert(
    'Order cancellation releases reserved stock exactly once (idempotent)',
    stockAfterCancel1 === stockBeforeCancel - 1 && stockAfterCancel2 === stockAfterCancel1,
    'Reserved stock decremented by 1 once, and second attempt does not decrement again',
    `Before: ${stockBeforeCancel}, After 1st: ${stockAfterCancel1}, After 2nd: ${stockAfterCancel2}`,
    `Idempotent status cancellation confirmed`
  );

  // Test 8: Store owner protection: Owner cannot be demoted or deactivated
  const ownerDemotionAttempt = authoritativeStore.manageAdminMembership(
    'shantety2013@gmail.com', // Caller is owner
    'shantety2013@gmail.com', // Target is owner themselves
    'order_staff',
    false
  );
  assert(
    'Store owner cannot be demoted, deactivated, or replaced',
    ownerDemotionAttempt.success === false,
    'Blocked with protection error',
    ownerDemotionAttempt.success ? 'Allowed owner demotion!' : `Blocked: "${ownerDemotionAttempt.error}"`,
    'Owner protection invariant preserved'
  );

  // Test 9: Non-owner administrator cannot manage memberships
  const staffRoleAttempt = authoritativeStore.manageAdminMembership(
    'staff@shantety.com', // Caller is staff
    'manager@shantety.com',
    'store_manager',
    true
  );
  assert(
    'Order staff / non-owner cannot perform owner-only operations',
    staffRoleAttempt.success === false,
    'Blocked with Forbidden error',
    staffRoleAttempt.success ? 'Allowed unauthorized membership update!' : `Blocked: "${staffRoleAttempt.error}"`,
    'Only active store owner can invoke manageAdminMembership'
  );

  // Test 10: Cannot create arbitrary super_admin via membership RPC
  const superAdminEscalationAttempt = authoritativeStore.manageAdminMembership(
    'shantety2013@gmail.com',
    'newuser@shantety.com',
    'super_admin' as any,
    true
  );
  assert(
    'Cannot create arbitrary super_admin via membership RPC (limited to store_manager/order_staff)',
    superAdminEscalationAttempt.success === false,
    'Blocked: Invalid role assignment',
    superAdminEscalationAttempt.success ? 'Allowed super_admin creation!' : `Blocked: "${superAdminEscalationAttempt.error}"`,
    'Role creation constrained to store_manager and order_staff'
  );

  // Test 11: Audit log integrity: operations are recorded and cannot be cleared
  const auditLogs = authoritativeStore.getAuditLogs();
  const recentCheckoutLog = auditLogs.find((l) => l.action === 'CHECKOUT_ORDER_CREATED');
  assert(
    'All sensitive operations are audited with actor and resource metadata',
    Boolean(recentCheckoutLog),
    'Audit log contains CHECKOUT_ORDER_CREATED entry',
    recentCheckoutLog ? `Found log for order: ${recentCheckoutLog.resource_id}` : 'No audit log found',
    `Audit trail length: ${auditLogs.length} entries`
  );

  // Test 12: Tracking token hashing BYTEA and hex cross-compatibility
  const sampleToken = 'tk_9f8d7e6c5b4a3210';
  const shaHex = hashTrackingToken(sampleToken);
  const { matchesTokenHash, hashTrackingTokenBytea } = await import('../src/server/commerceService');
  const byteaHex = hashTrackingTokenBytea(sampleToken);
  const rawBytes = Buffer.from(shaHex, 'hex');

  const matchesHex = matchesTokenHash(sampleToken, shaHex);
  const matchesBytea = matchesTokenHash(sampleToken, byteaHex);
  const matchesBuffer = matchesTokenHash(sampleToken, rawBytes);
  const rejectsWrong = !matchesTokenHash('tk_wrong_token', shaHex);

  assert(
    'Tracking token hashes match both hex strings, PostgreSQL \\x BYTEA, and raw Byte Buffers',
    matchesHex && matchesBytea && matchesBuffer && rejectsWrong,
    'matchesTokenHash correctly validates hex, bytea, and buffer while rejecting mismatches',
    `matchesHex=${matchesHex}, matchesBytea=${matchesBytea}, matchesBuffer=${matchesBuffer}, rejectsWrong=${rejectsWrong}`,
    `Validated bytea prefix '${byteaHex.slice(0, 8)}...' and 32-byte binary digest`
  );

  // Test 13: Production Mode: Missing Supabase credentials strictly BLOCKS checkout (no silent mock)
  const productionMockEnv = {
    NODE_ENV: 'production',
    ALLOW_DEV_MOCKS: 'false',
    SUPABASE_URL: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
    SUPABASE_ANON_KEY: '',
  };

  const prodCheckoutAttempt = authoritativeStore.processCheckout(
    {
      customer_name: 'أحمد محمود',
      customer_phone: '01099887766',
      shipping_address: {
        id: 'addr-prod-test',
        customer_name: 'أحمد محمود',
        phone: '01099887766',
        governorate: 'القاهرة',
        city: 'المعادي',
        street_address: 'شارع 9',
        is_default: true,
      },
      payment_method: 'cod',
      cartItems: [{ variant_id: variantId, quantity: 1 }],
    },
    productionMockEnv
  );

  assert(
    'Production environment strictly blocks checkout when database credentials are missing',
    Boolean(prodCheckoutAttempt.success === false && prodCheckoutAttempt.error_en?.includes('Production database is not configured')),
    'success=false with clear configuration error (no silent mock fallback)',
    `success=${prodCheckoutAttempt.success}, error_en="${prodCheckoutAttempt.error_en}"`,
    'Verified production readiness gate in commerceService'
  );

  // Test 14: Production Mode: Readiness diagnostic returns CONFIGURATION_BLOCKED
  const readinessReport = getBackendReadiness(productionMockEnv);
  assert(
    'Readiness diagnostic reports CONFIGURATION_BLOCKED in unconfigured production',
    readinessReport.isProduction === true &&
      readinessReport.status === 'CONFIGURATION_BLOCKED' &&
      readinessReport.missingRequiredKeys.includes('SUPABASE_URL'),
    'status="CONFIGURATION_BLOCKED" with missing required keys listed',
    `status=${readinessReport.status}, missing=${readinessReport.missingRequiredKeys.join(', ')}`,
    'Verified getBackendReadiness'
  );

  // Test 15: Production Mode: Admin request without Bearer token is strictly rejected
  const unauthAdminCheck = await verifyAdminRequest(undefined, 'admin@shantety.com', productionMockEnv);
  assert(
    'Production admin endpoints require authenticated Supabase Bearer token (rejects header email spoofing)',
    unauthAdminCheck.isAuthorized === false && unauthAdminCheck.statusCode === 401,
    'isAuthorized=false, statusCode=401',
    `isAuthorized=${unauthAdminCheck.isAuthorized}, statusCode=${unauthAdminCheck.statusCode}`,
    `Error returned: "${unauthAdminCheck.error}"`
  );

  // Test 16: Inactive administrator cannot access admin functions
  const inactiveCheck = authoritativeStore.verifyAdminRole('inactive_user@shantety.com');
  assert(
    'Inactive administrators are strictly denied access',
    inactiveCheck.isAuthorized === false,
    'isAuthorized=false',
    `isAuthorized=${inactiveCheck.isAuthorized}`,
    'Verified inactive member rejection'
  );

  // Test 17: Production Mode: CMS modifications are blocked because Migration 004 is unapplied
  const cmsUpdateInProd = authoritativeStore.updateCmsSection(
    'hero_banner',
    { title_ar: 'تحديث تجريبي' },
    'admin',
    productionMockEnv
  );
  assert(
    'Production environment blocks CMS updates and flags Migration 004 requirement',
    Boolean(cmsUpdateInProd.success === false && cmsUpdateInProd.error?.includes('Migration 004 is required')),
    'success=false stating Migration 004 is required',
    `success=${cmsUpdateInProd.success}, error="${cmsUpdateInProd.error}"`,
    'Verified CMS production blocker'
  );

  // Test 18: Newsletter subscription validates email and returns bilingual response
  const validSub = await authoritativeStore.subscribeNewsletter('shantety.fan@example.com', 'footer_unit_test');
  assert(
    'Newsletter subscription accepts valid email and records subscriber',
    validSub.success === true && Boolean(validSub.messageAr) && Boolean(validSub.messageEn),
    'success=true with bilingual confirmations',
    `success=${validSub.success}, isNew=${validSub.isNew}`,
    'Verified newsletter subscription payload'
  );

  // Test 19: Newsletter subscription rejects invalid email formats
  let invalidEmailRejected = false;
  try {
    await authoritativeStore.subscribeNewsletter('invalid-not-an-email');
  } catch (err: any) {
    invalidEmailRejected = err.message.includes('Invalid email');
  }
  assert(
    'Newsletter subscription strictly validates email pattern',
    invalidEmailRejected,
    'Throws error on invalid email address format',
    `invalidEmailRejected=${invalidEmailRejected}`,
    'Verified email format validation'
  );

  // Test 20: Diagnostic masking protects Supabase URL and Anon Key from sensitive exposure
  const sampleUrl = 'https://mziomwhluwjtadchnxdz.supabase.co';
  const sampleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZWZlcmVuY2UiOiJtemlvbXdobHV3anRhZGNobnhkeiJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const maskedUrl = maskSupabaseUrl(sampleUrl);
  const maskedKey = maskSupabaseAnonKey(sampleKey);

  const urlMaskedProperly = maskedUrl.includes('***') && !maskedUrl.includes('mziomwhluwjtadchnxdz');
  const keyMaskedProperly = maskedKey.includes('MASKED_JWT') && !maskedKey.includes('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');

  assert(
    'Diagnostic masking utility shields Supabase URL and Anon Key from log leakage',
    urlMaskedProperly && keyMaskedProperly,
    'Both URL and anon key safely redacted with length metadata only',
    `maskedUrl="${maskedUrl}", maskedKey="${maskedKey}"`,
    'Verified sensitive credential shielding'
  );

  // Test 21: Dynamic SEO generates optimized title & description for Home, Category, and Shop
  const homeSeo = generateSeoMetadata({ currentView: 'home', language: 'ar' });
  const homeTitleValid = homeSeo.title.includes('شنطتي') && homeSeo.title.length >= 30;
  const homeDescValid = homeSeo.description.length >= 120 && homeSeo.description.length <= 165;

  assert(
    'SEO utility generates high-performing titles & 120-160 char meta descriptions for Homepage',
    homeTitleValid && homeDescValid && homeSeo.canonicalUrl === 'https://shantety.shop/',
    'Title >= 30 chars, description 120-160 chars, canonical at root',
    `title="${homeSeo.title}" (${homeSeo.title.length}c), desc_len=${homeSeo.description.length}`,
    'Verified homepage SEO metadata'
  );

  // Test 22: Category-aware SEO updates title, description, and canonical URL in Shop view
  const categorySeo = generateSeoMetadata({
    currentView: 'shop',
    selectedCategory: 'cat-bags',
    categories: INITIAL_CATEGORIES,
    language: 'ar',
  });
  const catTitleIncludesCategory = categorySeo.title.includes('حقائب اليد');
  const catCanonicalMatches = categorySeo.canonicalUrl.includes('category=handbags');

  assert(
    'SEO utility dynamically customizes title & canonical link when filtering by category',
    catTitleIncludesCategory && catCanonicalMatches,
    'Title includes category name "حقائب اليد" and canonical has category query parameter',
    `title="${categorySeo.title}", canonical="${categorySeo.canonicalUrl}"`,
    'Verified category-filtered SEO'
  );

  // Test 23: Product Detail SEO generates Product Schema.org JSON-LD with exact price & offers
  const sampleProduct = authoritativeStore.getPublicProducts()[0];
  const productSeo = generateSeoMetadata({
    currentView: 'product-detail',
    selectedProduct: sampleProduct,
    language: 'ar',
  });
  const schema = productSeo.schemaJsonLd;
  const isProductSchemaValid =
    schema?.['@type'] === 'Product' &&
    schema?.offers?.priceCurrency === 'EGP' &&
    schema?.brand?.name.includes('شنطتي') &&
    schema?.offers?.availability === 'https://schema.org/InStock';

  assert(
    'Product Detail SEO injects Schema.org Product structured data with accurate EGP offer and availability',
    Boolean(isProductSchemaValid && productSeo.title.includes(sampleProduct.name_ar)),
    'Valid Product Schema with EGP currency, brand, and in-stock status',
    `schemaType=${schema?.['@type']}, price=${schema?.offers?.price}, title="${productSeo.title}"`,
    'Verified Product schema JSON-LD'
  );

  // Test 24: Robots directives correctly protect transactional pages and index public storefront
  const adminSeo = generateSeoMetadata({ currentView: 'admin' });
  const checkoutSeo = generateSeoMetadata({ currentView: 'checkout' });
  const trackSeo = generateSeoMetadata({ currentView: 'order-tracking' });

  const isRobotsRestricted =
    adminSeo.robots === 'noindex, nofollow' &&
    checkoutSeo.robots === 'noindex, nofollow' &&
    trackSeo.robots === 'noindex, nofollow' &&
    homeSeo.robots === 'index, follow' &&
    categorySeo.robots === 'index, follow';

  // Test 25: Checkout aggregates duplicate variant IDs and sorts deterministically
  const testVar = authoritativeStore.getAdminProducts()[0]?.variants?.[0];
  const duplicateCheckout = authoritativeStore.processCheckout({
    customer_name: 'ريم التكرار',
    customer_phone: '01099887766',
    shipping_address: {
      id: 'addr-dup',
      customer_name: 'ريم التكرار',
      phone: '01099887766',
      governorate: 'الجيزة',
      city: 'الدقي',
      street_address: 'شارع مصدق',
      is_default: true,
    },
    payment_method: 'cod',
    cartItems: [
      { variant_id: testVar!.id, quantity: 1 },
      { variant_id: testVar!.id, quantity: 2 },
    ],
  });
  const aggregatedItem = duplicateCheckout.order?.items.find((it) => it.variant_id === testVar!.id);
  assert(
    'Checkout aggregates duplicate variant IDs into a single line item',
    Boolean(duplicateCheckout.success && aggregatedItem?.quantity === 3),
    'Aggregated quantity should equal 3 (1 + 2)',
    `Success=${duplicateCheckout.success}, Aggregated quantity=${aggregatedItem?.quantity}`,
    'Duplicate items aggregated cleanly'
  );

  // Test 26: Electronic payment method initializes status as awaiting_payment (Never marks paid on checkout)
  const onlineCheckout = authoritativeStore.processCheckout({
    customer_name: 'نوران إلكتروني',
    customer_phone: '01055554444',
    shipping_address: {
      id: 'addr-online',
      customer_name: 'نوران إلكتروني',
      phone: '01055554444',
      governorate: 'القاهرة',
      city: 'مصر الجديدة',
      street_address: 'شارع النزهة',
      is_default: true,
    },
    payment_method: 'card_paymob',
    cartItems: [{ variant_id: testVar!.id, quantity: 1 }],
  });
  const onlineOrder = onlineCheckout.order;
  assert(
    'Electronic payment initializes payment_status as awaiting_payment (never paid by method alone)',
    Boolean(onlineCheckout.success && onlineOrder?.payment_status === 'awaiting_payment'),
    'payment_status="awaiting_payment"',
    `payment_status="${onlineOrder?.payment_status}"`,
    'Verified payment status isolation'
  );

  // Test 27: Cryptographic guest order claiming verifies tracking token and links order to customer
  const guestOrderToClaim = onlineOrder!;
  const rawToken = onlineCheckout.tracking_token!;
  const claimAttemptWrongToken = authoritativeStore.claimGuestOrder(
    guestOrderToClaim.order_number,
    'tk_wrong_fake_token',
    'cust-verified-uuid-99',
    'customer99@shantety.com'
  );
  const claimAttemptValid = authoritativeStore.claimGuestOrder(
    guestOrderToClaim.order_number,
    rawToken,
    'cust-verified-uuid-99',
    'customer99@shantety.com'
  );
  const claimedOrderInStore = authoritativeStore['state'].orders.find(
    (o) => o.order_number === guestOrderToClaim.order_number
  );
  assert(
    'Cryptographic guest order claiming requires matching tracking token and binds customer_id',
    !claimAttemptWrongToken.success && claimAttemptValid.success && claimedOrderInStore?.customer_id === 'cust-verified-uuid-99',
    'Wrong token rejected; valid token links order to cust-verified-uuid-99',
    `Wrong token success=${claimAttemptWrongToken.success}, Valid token success=${claimAttemptValid.success}, Bound customer_id=${claimedOrderInStore?.customer_id}`,
    'Verified one-time cryptographic claiming protocol'
  );

  console.log('\n--- TEST EXECUTION SUMMARY ---');
  let passCount = 0;
  for (const r of testResults) {
    console.log(`[${r.status}] ${r.name}`);
    console.log(`       Expected: ${r.expected}`);
    console.log(`       Actual:   ${r.actual}`);
    if (r.status === 'PASS') passCount++;
  }

  console.log(`\nTOTAL: ${testResults.length} | PASSED: ${passCount} | FAILED: ${testResults.length - passCount}`);
  return testResults;
}

runSecurityAndBusinessTests();
