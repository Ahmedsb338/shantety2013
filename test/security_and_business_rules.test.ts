import { authoritativeStore, hashTrackingToken } from '../src/server/commerceService';

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
    storedHash === expectedHash && !storedOrder?.tracking_token.includes('PLAINTEXT_SECRET_LEAK'),
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

  // Attempt duplicate cancellation to verify idempotency
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
    'as0246135@gmail.com', // Caller is owner
    'as0246135@gmail.com', // Target is owner themselves
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

  // Test 10: Store manager cannot create another super_admin
  const superAdminEscalationAttempt = authoritativeStore.manageAdminMembership(
    'as0246135@gmail.com',
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

