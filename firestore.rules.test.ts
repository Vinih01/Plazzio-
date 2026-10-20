/**
 * Plazzio Firestore Security Rules Verification Harness
 * Evaluates the 12 critical security and access control invariants.
 */

// Simulated rule evaluation engine reflecting firestore.rules logic
interface AuthContext {
  uid: string | null;
  email?: string;
  email_verified?: boolean;
}

interface RequestContext {
  auth: AuthContext | null;
  resource?: { data: Record<string, any> };
  incoming?: { data: Record<string, any> };
}

function evaluateStoreCreateRule(req: RequestContext, storeId: string): boolean {
  const isSignedIn = req.auth !== null && req.auth.uid !== null;
  const isAdmin = isSignedIn && (
    req.auth?.email === 'mapwiser@gmail.com'
  );

  if (isAdmin) return true;

  const incoming = req.incoming?.data;
  if (!incoming) return false;

  const isValidId = typeof storeId === 'string' && storeId.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(storeId);
  const isOwner = isSignedIn && incoming.ownerUid === req.auth?.uid;
  const validStatus = ['draft', 'pending_review'].includes(incoming.status);
  const unpublished = incoming.published === false;

  return Boolean(isSignedIn && isValidId && isOwner && validStatus && unpublished);
}

function evaluateStoreUpdateRule(req: RequestContext): boolean {
  const isSignedIn = req.auth !== null && req.auth.uid !== null;
  const isAdmin = isSignedIn && req.auth?.email === 'mapwiser@gmail.com';
  if (isAdmin) return true;

  const incoming = req.incoming?.data;
  const existing = req.resource?.data;
  if (!incoming || !existing) return false;

  const isOwner = isSignedIn && existing.ownerUid === req.auth?.uid;
  const ownerImmutable = incoming.ownerUid === existing.ownerUid;

  // Check if trying to self-approve or publish without admin
  const attemptingApprovalOrPublish = (incoming.status === 'approved' && existing.status !== 'approved') ||
                                     (incoming.published === true && existing.published !== true);

  return Boolean(isSignedIn && isOwner && ownerImmutable && !attemptingApprovalOrPublish);
}

function evaluateUserUpdateRule(req: RequestContext, targetUserId: string): boolean {
  const isSignedIn = req.auth !== null && req.auth.uid !== null;
  const isAdmin = isSignedIn && req.auth?.email === 'mapwiser@gmail.com';
  if (isAdmin) return true;

  const incoming = req.incoming?.data;
  const existing = req.resource?.data;
  if (!incoming || !existing) return false;

  const isOwner = isSignedIn && req.auth?.uid === targetUserId;
  const uidImmutable = incoming.uid === existing.uid;
  const createdAtImmutable = incoming.createdAt === existing.createdAt;

  // Cannot self-promote to admin
  const roleProtected = incoming.role === existing.role ||
    (existing.role !== 'admin' && ['consumer', 'merchant'].includes(incoming.role));

  return Boolean(isSignedIn && isOwner && uidImmutable && createdAtImmutable && roleProtected);
}

function evaluateOrderAccessRule(req: RequestContext, storeOwnerUid: string): boolean {
  const isSignedIn = req.auth !== null && req.auth.uid !== null;
  const isAdmin = isSignedIn && req.auth?.email === 'mapwiser@gmail.com';
  if (isAdmin) return true;

  const order = req.resource?.data;
  if (!order) return false;

  const isCustomer = isSignedIn && order.customerUid === req.auth?.uid;
  const isStoreOwner = isSignedIn && storeOwnerUid === req.auth?.uid;

  return Boolean(isCustomer || isStoreOwner);
}

function evaluateOrderTerminalLockRule(req: RequestContext): boolean {
  const existing = req.resource?.data;
  const incoming = req.incoming?.data;
  if (!existing || !incoming) return false;

  const terminalStates = ['delivered', 'completed', 'cancelled'];
  if (terminalStates.includes(existing.orderStatus)) {
    return false; // Terminal state locked from standard merchant updates
  }
  return true;
}

// Test Runner
let passedCount = 0;
let failedCount = 0;

function assert(description: string, condition: boolean) {
  if (condition) {
    console.log(`  ✓ [PASS] ${description}`);
    passedCount++;
  } else {
    console.error(`  ✗ [FAIL] ${description}`);
    failedCount++;
  }
}

console.log('--- Executing Plazzio Security Rules Invariants Suite ---');

// Scenario 1: Authenticated user can submit their own store with pending_review and published: false
assert(
  'Scenario 1: Authenticated user can create store with valid pending_review data',
  evaluateStoreCreateRule(
    {
      auth: { uid: 'user_merchant_123', email: 'merchant@example.com' },
      incoming: { data: { ownerUid: 'user_merchant_123', status: 'pending_review', published: false } }
    },
    'store_valid_123'
  ) === true
);

// Scenario 2: Unauthenticated user cannot create store
assert(
  'Scenario 2: Unauthenticated user cannot create store',
  evaluateStoreCreateRule(
    {
      auth: null,
      incoming: { data: { ownerUid: 'owner_random', status: 'pending_review', published: false } }
    },
    'store_unauth_123'
  ) === false
);

// Scenario 3: User cannot create store with forged ownerUid
assert(
  'Scenario 3: Reject ownerUid forgery (victim UID)',
  evaluateStoreCreateRule(
    {
      auth: { uid: 'attacker_uid', email: 'attacker@example.com' },
      incoming: { data: { ownerUid: 'victim_uid', status: 'pending_review', published: false } }
    },
    'store_forged_123'
  ) === false
);

// Scenario 4: User cannot self-approve store during onboarding
assert(
  'Scenario 4: Reject initial store creation with approved status',
  evaluateStoreCreateRule(
    {
      auth: { uid: 'user_merchant_123', email: 'merchant@example.com' },
      incoming: { data: { ownerUid: 'user_merchant_123', status: 'approved', published: false } }
    },
    'store_approved_bypass'
  ) === false
);

// Scenario 5: User cannot set published: true during onboarding
assert(
  'Scenario 5: Reject initial store creation with published: true',
  evaluateStoreCreateRule(
    {
      auth: { uid: 'user_merchant_123', email: 'merchant@example.com' },
      incoming: { data: { ownerUid: 'user_merchant_123', status: 'pending_review', published: true } }
    },
    'store_published_bypass'
  ) === false
);

// Scenario 6: User cannot promote themselves to admin in users collection
assert(
  'Scenario 6: Reject user promoting themselves to role: admin',
  evaluateUserUpdateRule(
    {
      auth: { uid: 'user_456', email: 'consumer@example.com' },
      resource: { data: { uid: 'user_456', role: 'consumer', createdAt: '2026-01-01' } },
      incoming: { data: { uid: 'user_456', role: 'admin', createdAt: '2026-01-01' } }
    },
    'user_456'
  ) === false
);

// Scenario 6b: User CAN update role from consumer to merchant
assert(
  'Scenario 6b: User can transition role from consumer to merchant',
  evaluateUserUpdateRule(
    {
      auth: { uid: 'user_456', email: 'consumer@example.com' },
      resource: { data: { uid: 'user_456', role: 'consumer', createdAt: '2026-01-01' } },
      incoming: { data: { uid: 'user_456', role: 'merchant', createdAt: '2026-01-01' } }
    },
    'user_456'
  ) === true
);

// Scenario 7: Merchant cannot alter ownerUid of an existing store
assert(
  'Scenario 7: Merchant cannot transfer ownership or change ownerUid',
  evaluateStoreUpdateRule({
    auth: { uid: 'owner_original' },
    resource: { data: { ownerUid: 'owner_original', status: 'approved', published: true } },
    incoming: { data: { ownerUid: 'owner_transferred', status: 'approved', published: true } }
  }) === false
);

// Scenario 8: Merchant cannot access orders from another store
assert(
  'Scenario 8: Reject cross-tenant merchant access to other store orders',
  evaluateOrderAccessRule(
    {
      auth: { uid: 'merchant_A' },
      resource: { data: { customerUid: 'customer_1', storeId: 'store_B' } }
    },
    'merchant_B' // store B belongs to merchant B
  ) === false
);

// Scenario 9: Customer cannot read another customer orders
assert(
  'Scenario 9: Customer cannot read another customer order',
  evaluateOrderAccessRule(
    {
      auth: { uid: 'customer_intruder' },
      resource: { data: { customerUid: 'customer_victim', storeId: 'store_1' } }
    },
    'merchant_owner_1'
  ) === false
);

// Scenario 10: Authorized administrator can approve store
assert(
  'Scenario 10: Platform administrator can approve stores',
  evaluateStoreCreateRule(
    {
      auth: { uid: 'admin_uid', email: 'mapwiser@gmail.com' },
      incoming: { data: { ownerUid: 'any_owner', status: 'approved', published: true } }
    },
    'store_admin_approved'
  ) === true
);

// Scenario 11: Rejection of invalid storeId with injection characters
assert(
  'Scenario 11: Reject invalid document ID path injection',
  evaluateStoreCreateRule(
    {
      auth: { uid: 'user_1' },
      incoming: { data: { ownerUid: 'user_1', status: 'pending_review', published: false } }
    },
    'store/../../injection_attack'
  ) === false
);

// Scenario 12: Terminal state order lock prevents status tampering
assert(
  'Scenario 12: Delivered/Cancelled order is locked from standard state changes',
  evaluateOrderTerminalLockRule({
    auth: { uid: 'merchant_123' },
    resource: { data: { orderStatus: 'delivered' } },
    incoming: { data: { orderStatus: 'preparing' } }
  }) === false
);

// Scenario 13: Non-admin user cannot approve stores or act as admin
assert(
  'Scenario 13: Non-admin user (e.g. impostor@gmail.com) cannot approve stores as admin',
  evaluateStoreCreateRule(
    {
      auth: { uid: 'impostor_uid', email: 'impostor@gmail.com' },
      incoming: { data: { ownerUid: 'other_owner', status: 'approved', published: true } }
    },
    'store_impostor_bypass'
  ) === false
);

// Scenario 14: Authorized admin mapwiser@gmail.com can approve stores
assert(
  'Scenario 14: Authorized mapwiser@gmail.com can approve stores as admin',
  evaluateStoreCreateRule(
    {
      auth: { uid: 'admin_real_uid', email: 'mapwiser@gmail.com' },
      incoming: { data: { ownerUid: 'any_owner', status: 'approved', published: true } }
    },
    'store_mapwiser_approved'
  ) === true
);

console.log(`\nResults: ${passedCount} passed, ${failedCount} failed.`);
if (failedCount > 0) {
  process.exit(1);
}
