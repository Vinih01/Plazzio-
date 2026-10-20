import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface StoreImage {
  id: string;
  storeId: string;
  url: string;
  fileName: string;
  createdAt: string;
}

export async function getStoreImages(storeId: string): Promise<StoreImage[]> {
  const path = `stores/${storeId}/images`;
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const images: StoreImage[] = [];
    snapshot.forEach(docSnap => {
      images.push({ id: docSnap.id, ...docSnap.data() } as StoreImage);
    });
    return images;
  } catch (error) {
    console.warn('Fallback fetching store images:', error);
    try {
      const fallbackSnapshot = await getDocs(collection(db, path));
      const images: StoreImage[] = [];
      fallbackSnapshot.forEach(docSnap => {
        images.push({ id: docSnap.id, ...docSnap.data() } as StoreImage);
      });
      return images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (innerError) {
      handleFirestoreError(innerError, OperationType.GET, path);
      return [];
    }
  }
}

export async function saveStoreImage(image: StoreImage): Promise<void> {
  const path = `stores/${image.storeId}/images`;
  try {
    const docRef = doc(db, path, image.id);
    await setDoc(docRef, image);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${image.id}`);
  }
}

export async function deleteStoreImage(storeId: string, imageId: string): Promise<void> {
  const path = `stores/${storeId}/images`;
  try {
    const docRef = doc(db, path, imageId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${imageId}`);
  }
}
