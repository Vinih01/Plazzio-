import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface CustomProductType {
  id: string;
  storeId: string;
  name: string;
  baseModel: string;
  createdAt: string;
}

export async function getCustomTypes(storeId: string): Promise<CustomProductType[]> {
  const path = `stores/${storeId}/customTypes`;
  try {
    const snapshot = await getDocs(collection(db, path));
    const types: CustomProductType[] = [];
    snapshot.forEach(docSnap => {
      types.push({ id: docSnap.id, ...docSnap.data() } as CustomProductType);
    });
    return types;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function createCustomType(customType: CustomProductType): Promise<void> {
  const path = `stores/${customType.storeId}/customTypes`;
  try {
    const docRef = doc(db, path, customType.id);
    await setDoc(docRef, customType);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${customType.id}`);
  }
}

export async function deleteCustomType(storeId: string, typeId: string): Promise<void> {
  const path = `stores/${storeId}/customTypes`;
  try {
    const docRef = doc(db, path, typeId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${typeId}`);
  }
}
