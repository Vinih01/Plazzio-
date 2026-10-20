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
import { INITIAL_CATEGORIES } from './mockDemoData';

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
    const q = query(
      collection(db, STORES_COLLECTION),
      where('published', '==', true),
      where('status', '==', 'approved')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as Store))
      .filter(store => store.status === 'approved' && store.published === true && store.isDemo !== true);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, STORES_COLLECTION);
    return [];
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
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    const store = { ...docSnap.data(), id: docSnap.id } as Store;
    return store.isDemo === true ? null : store;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `${STORES_COLLECTION}?slug=${slug}`);
    return null;
  }
}

export async function getStoreById(id: string): Promise<Store | null> {
  try {
    const snap = await getDoc(doc(db, STORES_COLLECTION, id));
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as Store;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${STORES_COLLECTION}/${id}`);
    return null;
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
    return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as Store));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, STORES_COLLECTION);
    return [];
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
    if (!snap.exists()) {
      throw new Error('Estabelecimento não encontrado. Atualize a página e selecione uma loja cadastrada.');
    }
    await updateDoc(docRef, sanitized);
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

    if (!snap.exists()) {
      throw new Error('Estabelecimento não encontrado; não é possível alterar seu status.');
    }
    await updateDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${STORES_COLLECTION}/${storeId}`);
  }
}

/**
 * Seed the shared category catalog only. Demo stores/products must never be written into production.
 */
export async function seedMarketplaceData(): Promise<void> {
  try {
    for (const category of INITIAL_CATEGORIES) {
      await setDoc(doc(db, CATEGORIES_COLLECTION, category.id), category, { merge: true });
    }
  } catch (error) {
    console.warn('Category seeding requires administrator permission:', error);
    throw error;
  }
}
