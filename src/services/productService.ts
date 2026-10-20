import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product } from '../types';

import { removeUndefinedFields } from '../lib/utils';
import { getDefaultOptionGroupsForCategory } from './optionTemplateService';

const PRODUCTS_COLLECTION = 'products';

export async function getProductsByStore(storeId: string): Promise<Product[]> {
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('storeId', '==', storeId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(docSnap => {
        const data = { ...docSnap.data(), id: docSnap.id } as Product;
        // Resolve default groups for the UI only; final pricing is recalculated against Firestore by the server.
        if (!data.optionGroups || data.optionGroups.length === 0) {
          const defaults = getDefaultOptionGroupsForCategory(data.categoryName, data.name);
          if (defaults.length > 0) data.optionGroups = defaults;
        }
        return data;
      })
      .filter(product => product.available === true && product.isDemo !== true);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `${PRODUCTS_COLLECTION}?storeId=${storeId}`);
    return [];
  }
}

/**
 * Migration helper: Iterates through all store products and persists category option groups
 * to Firestore for any product that does not have options configured yet.
 */
export async function migrateStoreProductsWithCategoryOptions(storeId: string): Promise<{ migratedCount: number }> {
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('storeId', '==', storeId)
    );
    const snapshot = await getDocs(q);
    let migratedCount = 0;

    for (const docSnap of snapshot.docs) {
      const prod = docSnap.data() as Product;
      if (!prod.optionGroups || prod.optionGroups.length === 0) {
        const defaults = getDefaultOptionGroupsForCategory(prod.categoryName, prod.name);
        if (defaults.length > 0) {
          try {
            await updateDoc(doc(db, PRODUCTS_COLLECTION, prod.id), {
              optionGroups: defaults,
              updatedAt: new Date().toISOString()
            });
            migratedCount++;
          } catch (err) {
            console.warn(`Failed to auto-migrate product ${prod.id}:`, err);
          }
        }
      }
    }

    return { migratedCount };
  } catch (e) {
    console.warn('Migration error:', e);
    return { migratedCount: 0 };
  }
}

export async function createProduct(product: Product): Promise<void> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
    const sanitized = removeUndefinedFields<Product>({
      ...product,
      createdAt: product.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PRODUCTS_COLLECTION}/${product.id}`);
  }
}

export async function updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    const sanitized = removeUndefinedFields<Partial<Product>>({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(docRef, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}
