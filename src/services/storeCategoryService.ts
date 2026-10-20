import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { StoreCategory } from '../types';

export async function getStoreCategories(storeId: string): Promise<StoreCategory[]> {
  const path = `stores/${storeId}/categories`;
  try {
    const q = query(collection(db, path), orderBy('sortOrder', 'asc'));
    const snapshot = await getDocs(q);
    const categories: StoreCategory[] = [];
    snapshot.forEach(docSnap => {
      categories.push({ id: docSnap.id, ...docSnap.data() } as StoreCategory);
    });
    return categories;
  } catch (error) {
    console.warn('Fallback fetching store categories:', error);
    try {
      const fallbackSnapshot = await getDocs(collection(db, path));
      const categories: StoreCategory[] = [];
      fallbackSnapshot.forEach(docSnap => {
        categories.push({ id: docSnap.id, ...docSnap.data() } as StoreCategory);
      });
      return categories.sort((a, b) => a.sortOrder - b.sortOrder);
    } catch (innerError) {
      handleFirestoreError(innerError, OperationType.GET, path);
      return [];
    }
  }
}

export async function createStoreCategory(category: StoreCategory): Promise<void> {
  const path = `stores/${category.storeId}/categories`;
  try {
    const docRef = doc(db, path, category.id);
    await setDoc(docRef, {
      ...category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${category.id}`);
  }
}

export async function updateStoreCategory(storeId: string, categoryId: string, updates: Partial<StoreCategory>): Promise<void> {
  const path = `stores/${storeId}/categories`;
  try {
    const docRef = doc(db, path, categoryId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${categoryId}`);
  }
}

export async function deleteStoreCategory(storeId: string, categoryId: string): Promise<void> {
  const path = `stores/${storeId}/categories`;
  try {
    const docRef = doc(db, path, categoryId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${categoryId}`);
  }
}
