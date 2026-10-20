import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { after } from 'node:test';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-plazzio-rules';
const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: { rules },
});

after(async () => {
  await testEnv.cleanup();
});

test('executa as regras reais do Firestore para avaliações, lojas, catálogo, templates e pedidos', async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async context => {
    const firestore = context.firestore();
    await Promise.all([
      setDoc(doc(firestore, 'stores/live-store'), {
        id: 'live-store',
        ownerUid: 'merchant-live',
        name: 'Loja publicada',
        slug: 'loja-publicada',
        status: 'approved',
        published: true,
        isDemo: false,
      }),
      setDoc(doc(firestore, 'stores/pending-store'), {
        id: 'pending-store',
        ownerUid: 'merchant-pending',
        name: 'Loja pendente',
        slug: 'loja-pendente',
        status: 'pending_review',
        published: false,
        isDemo: false,
      }),
      setDoc(doc(firestore, 'products/live-product'), {
        id: 'live-product',
        storeId: 'live-store',
        name: 'Produto público',
        basePrice: 10,
        available: true,
      }),
      setDoc(doc(firestore, 'products/pending-product'), {
        id: 'pending-product',
        storeId: 'pending-store',
        name: 'Produto privado',
        basePrice: 10,
        available: true,
      }),
      setDoc(doc(firestore, 'orders/order-customer-one'), {
        id: 'order-customer-one',
        customerUid: 'customer-one',
        storeId: 'live-store',
        orderStatus: 'pending_confirmation',
      }),
      setDoc(doc(firestore, 'orders/order-customer-two'), {
        id: 'order-customer-two',
        customerUid: 'customer-two',
        storeId: 'live-store',
        orderStatus: 'pending_confirmation',
      }),
      setDoc(doc(firestore, 'reviews/review-pending'), {
        id: 'review-pending',
        storeId: 'live-store',
        customerUid: 'customer-one',
        customerName: 'Cliente Um',
        rating: 5,
        comment: 'Avaliação pendente',
        status: 'pending',
        createdAt: '2026-10-20T12:00:00.000Z',
        updatedAt: '2026-10-20T12:00:00.000Z',
      }),
      setDoc(doc(firestore, 'reviews/review-approved'), {
        id: 'review-approved',
        storeId: 'live-store',
        customerUid: 'customer-two',
        customerName: 'Cliente Dois',
        rating: 4,
        comment: 'Avaliação publicada',
        status: 'approved',
        createdAt: '2026-10-20T12:00:00.000Z',
        updatedAt: '2026-10-20T12:00:00.000Z',
      }),
    ]);
  });

  const anonymousDb = testEnv.unauthenticatedContext().firestore();
  const customerOneDb = testEnv.authenticatedContext('customer-one', {
    email: 'customer-one@example.com',
    email_verified: true,
  }).firestore();
  const customerTwoDb = testEnv.authenticatedContext('customer-two', {
    email: 'customer-two@example.com',
    email_verified: true,
  }).firestore();
  const merchantDb = testEnv.authenticatedContext('merchant-live', {
    email: 'merchant@example.com',
    email_verified: true,
  }).firestore();
  const adminDb = testEnv.authenticatedContext('admin-mapwiser', {
    email: 'mapwiser@gmail.com',
    email_verified: true,
    firebase: { sign_in_provider: 'google.com' },
  }).firestore();
  const impostorAdminDb = testEnv.authenticatedContext('impostor-mapwiser', {
    email: 'mapwiser@gmail.com',
    email_verified: true,
    firebase: { sign_in_provider: 'password' },
  }).firestore();

  // Public catalog must be limited to stores that are approved and explicitly published.
  await assertSucceeds(getDoc(doc(anonymousDb, 'stores/live-store')));
  await assertFails(getDoc(doc(anonymousDb, 'stores/pending-store')));
  await assertSucceeds(getDoc(doc(anonymousDb, 'products/live-product')));
  await assertFails(getDoc(doc(anonymousDb, 'products/pending-product')));

  // Store owners can manage their own store, but cannot approve or publish themselves.
  await assertFails(updateDoc(doc(merchantDb, 'stores/live-store'), {
    status: 'suspended',
  }));
  const pendingOwnerDb = testEnv.authenticatedContext('merchant-pending').firestore();
  await assertFails(updateDoc(doc(pendingOwnerDb, 'stores/pending-store'), {
    status: 'approved',
    published: true,
  }));
  await assertFails(updateDoc(doc(merchantDb, 'stores/live-store'), {
    rating: 5,
    reviewCount: 999,
  }));
  await assertSucceeds(updateDoc(doc(adminDb, 'stores/live-store'), {
    rating: 4.5,
    reviewCount: 2,
  }));

  // Reviews require authentication and cannot be self-published.
  await assertFails(setDoc(doc(anonymousDb, 'reviews/review-anonymous-create'), {
    storeId: 'live-store',
    customerUid: 'anonymous',
    rating: 5,
    comment: 'Tentativa pública',
    status: 'pending',
    createdAt: '2026-10-20T12:00:00.000Z',
    updatedAt: '2026-10-20T12:00:00.000Z',
  }));
  await assertSucceeds(setDoc(doc(customerOneDb, 'reviews/review-customer-create'), {
    storeId: 'live-store',
    customerUid: 'customer-one',
    customerName: 'Cliente Um',
    rating: 5,
    comment: 'Minha avaliação',
    status: 'pending',
    createdAt: '2026-10-20T12:00:00.000Z',
    updatedAt: '2026-10-20T12:00:00.000Z',
  }));
  await assertFails(setDoc(doc(customerOneDb, 'reviews/review-self-approved'), {
    storeId: 'live-store',
    customerUid: 'customer-one',
    customerName: 'Cliente Um',
    rating: 5,
    comment: 'Tentativa de autopublicação',
    status: 'approved',
    createdAt: '2026-10-20T12:00:00.000Z',
    updatedAt: '2026-10-20T12:00:00.000Z',
  }));
  await assertSucceeds(getDoc(doc(anonymousDb, 'reviews/review-approved')));
  await assertFails(getDoc(doc(anonymousDb, 'reviews/review-pending')));
  await assertFails(updateDoc(doc(customerTwoDb, 'reviews/review-pending'), {
    comment: 'Alteração de avaliação alheia',
  }));
  await assertFails(deleteDoc(doc(customerTwoDb, 'reviews/review-pending')));

  const publicReviewQuery = query(
    collection(anonymousDb, 'reviews'),
    where('storeId', '==', 'live-store'),
    where('status', '==', 'approved'),
  );
  const approvedReviews = await assertSucceeds(getDocs(publicReviewQuery));
  assert.equal(approvedReviews.size, 1);
  assert.equal(approvedReviews.docs[0].id, 'review-approved');

  // Global option templates must be readable but writable only by the configured administrator.
  await assertSucceeds(getDoc(doc(anonymousDb, 'globalOptionGroupTemplates/shared-template')));
  await assertFails(setDoc(doc(customerOneDb, 'globalOptionGroupTemplates/forged-template'), {
    id: 'forged-template',
    name: 'Template falso',
    active: true,
  }));
  await assertSucceeds(setDoc(doc(adminDb, 'globalOptionGroupTemplates/admin-template'), {
    id: 'admin-template',
    name: 'Template do administrador',
    active: true,
  }));
  await assertFails(setDoc(doc(impostorAdminDb, 'globalOptionGroupTemplates/impostor-template'), {
    id: 'impostor-template',
    name: 'Tentativa com e-mail copiado, mas outro provedor',
    active: true,
  }));

  // Client-side order creation is intentionally disabled; customers can only read their own orders.
  await assertFails(setDoc(doc(customerOneDb, 'orders/forged-order'), {
    id: 'forged-order',
    customerUid: 'customer-one',
    storeId: 'live-store',
    subtotal: 0.01,
    total: 0.01,
    orderStatus: 'pending_confirmation',
  }));
  await assertSucceeds(getDoc(doc(customerOneDb, 'orders/order-customer-one')));
  await assertFails(getDoc(doc(customerOneDb, 'orders/order-customer-two')));
  await assertSucceeds(getDoc(doc(merchantDb, 'orders/order-customer-two')));
  await assertFails(getDocs(collection(customerOneDb, 'orders')));
  const ownOrders = await assertSucceeds(getDocs(query(
    collection(customerOneDb, 'orders'),
    where('customerUid', '==', 'customer-one'),
  )));
  assert.equal(ownOrders.size, 1);

  // A non-admin cannot read administrative records or modify an approved review.
  await assertFails(getDoc(doc(customerOneDb, 'admins/admin-mapwiser')));
  await assertFails(updateDoc(doc(customerOneDb, 'reviews/review-approved'), {
    comment: 'Tentativa de alterar avaliação publicada',
  }));
  await assertSucceeds(updateDoc(doc(adminDb, 'reviews/review-pending'), {
    status: 'approved',
    updatedAt: '2026-10-20T13:00:00.000Z',
  }));
});
