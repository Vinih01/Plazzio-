import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Store, StoreStatus } from '../types';
import { DEMO_STORES, INITIAL_CATEGORIES, DEMO_PRODUCTS } from './mockDemoData';

import { removeUndefinedFields } from '../lib/utils';

const STORES_COLLECTION = 'stores';
const CATEGORIES_COLLECTION = 'categories';
const PRODUCTS_COLLECTION = 'products';

/**
 * Fetch approved and published stores for the public marketplace.
 * Universally visible to all visitors and users regardless of who created them.
 * Does not depend on currentUser.uid.
 */
export async function getApprovedStores(): Promise<Store[]> {
  try {
    const storesMap = new Map<string, Store>();

    // 1. Fetch published and approved stores from Firestore
    try {
      const q = query(
        collection(db, STORES_COLLECTION),
        where('published', '==', true),
        where('status', '==', 'approved')
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        const store = docSnap.data() as Store;
        // Verify approval status for public discovery
        if (store.status === 'approved') {
          storesMap.set(store.id, store);
        }
      });
    } catch (queryErr) {
      console.warn('Published stores query fallback:', queryErr);
    }

    // 2. Merge demonstration Brazilian stores if not already customized in Firestore
    for (const demo of DEMO_STORES) {
      if (!storesMap.has(demo.id)) {
        storesMap.set(demo.id, demo);
      }
    }

    return Array.from(storesMap.values());
  } catch (error) {
    console.warn('Fallback fetching stores:', error);
    return DEMO_STORES;
  }
}

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  try {
    const q = query(
      collection(db, STORES_COLLECTION),
      where('slug', '==', slug),
      where('published', '==', true),
      where('status', '==', 'approved')
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as Store;
    }
    // Check demo stores
    const demo = DEMO_STORES.find(s => s.slug === slug);
    return demo || null;
  } catch (error) {
    console.warn('Error fetching store by slug, checking demo stores:', error);
    const demo = DEMO_STORES.find(s => s.slug === slug);
    return demo || null;
  }
}

export async function getStoreById(id: string): Promise<Store | null> {
  try {
    const docRef = doc(db, STORES_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Store;
    }
    const demo = DEMO_STORES.find(s => s.id === id);
    return demo || null;
  } catch (error) {
    console.warn('Error fetching store by id, checking demo stores:', error);
    const demo = DEMO_STORES.find(s => s.id === id);
    return demo || null;
  }
}

export async function getMerchantStores(ownerUid: string): Promise<Store[]> {
  try {
    const q = query(
      collection(db, STORES_COLLECTION),
      where('ownerUid', '==', ownerUid)
    );
    const snapshot = await getDocs(q);
    const stores: Store[] = [];
    snapshot.forEach(docSnap => {
      stores.push(docSnap.data() as Store);
    });
    return stores;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `${STORES_COLLECTION}?owner=${ownerUid}`);
    return [];
  }
}

export async function getAllStoresAdmin(): Promise<Store[]> {
  try {
    const snapshot = await getDocs(collection(db, STORES_COLLECTION));
    const storesMap = new Map<string, Store>();

    snapshot.forEach(docSnap => {
      const store = docSnap.data() as Store;
      storesMap.set(store.id, store);
    });

    // Merge demo stores for complete administrative overview
    for (const demo of DEMO_STORES) {
      if (!storesMap.has(demo.id)) {
        storesMap.set(demo.id, demo);
      }
    }

    return Array.from(storesMap.values());
  } catch (error) {
    console.warn('Admin store fetch fallback:', error);
    return DEMO_STORES;
  }
}

export async function createStore(store: Store): Promise<void> {
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser) {
    throw new Error('Sessão não encontrada: Você precisa estar autenticado com uma conta válida para cadastrar um estabelecimento.');
  }

  if (store.ownerUid !== currentAuthUser.uid) {
    throw new Error('Divergência de segurança: O proprietário do estabelecimento deve corresponder ao seu usuário autenticado.');
  }

  const payload: Store = removeUndefinedFields<Store>({
    ...store,
    ownerUid: currentAuthUser.uid,
    status: store.status || 'pending_review',
    published: false, // Initial state always unpublished until admin approval
    createdAt: store.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  try {
    const docRef = doc(db, STORES_COLLECTION, payload.id);
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${STORES_COLLECTION}/${payload.id}`);
  }
}

export async function updateStore(storeId: string, updates: Partial<Store>): Promise<void> {
  const sanitized = removeUndefinedFields<Partial<Store>>({
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  try {
    const docRef = doc(db, STORES_COLLECTION, storeId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, sanitized);
    } else {
      const demo = DEMO_STORES.find(s => s.id === storeId);
      await setDoc(docRef, removeUndefinedFields({
        ...(demo || {}),
        id: storeId,
        ...sanitized,
        createdAt: demo?.createdAt || new Date().toISOString(),
      }), { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${STORES_COLLECTION}/${storeId}`);
    throw error;
  }
}

export async function updateStoreStatus(
  storeId: string, 
  status: StoreStatus, 
  rejectionReason?: string
): Promise<void> {
  try {
    const docRef = doc(db, STORES_COLLECTION, storeId);
    const snap = await getDoc(docRef);

    const payload = removeUndefinedFields({
      status,
      rejectionReason: rejectionReason || '',
      published: status === 'approved',
      updatedAt: new Date().toISOString(),
    });

    if (snap.exists()) {
      await updateDoc(docRef, payload);
    } else {
      // If store is a demo store being approved or suspended, persist it with status
      const demo = DEMO_STORES.find(s => s.id === storeId);
      if (demo) {
        await setDoc(docRef, removeUndefinedFields({
          ...demo,
          ...payload,
          createdAt: demo.createdAt || new Date().toISOString(),
        }));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${STORES_COLLECTION}/${storeId}`);
  }
}

/**
 * Seed initial categories, demo stores and products into Firestore
 */
export async function seedMarketplaceData(): Promise<void> {
  try {
    // Seed Categories
    for (const cat of INITIAL_CATEGORIES) {
      const catRef = doc(db, CATEGORIES_COLLECTION, cat.id);
      await setDoc(catRef, cat, { merge: true });
    }

    // Seed Stores
    for (const store of DEMO_STORES) {
      const storeRef = doc(db, STORES_COLLECTION, store.id);
      await setDoc(storeRef, store, { merge: true });
    }

    // Seed Products
    for (const prod of DEMO_PRODUCTS) {
      const prodRef = doc(db, PRODUCTS_COLLECTION, prod.id);
      await setDoc(prodRef, prod, { merge: true });
    }
    console.log('Plazzio marketplace successfully seeded!');
  } catch (e) {
    console.warn('Seeding note:', e);
  }
}
