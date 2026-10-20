import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AddOnGroup } from '../types';

export async function getAddOnGroups(storeId: string): Promise<AddOnGroup[]> {
  const path = `stores/${storeId}/addOnGroups`;
  try {
    const snapshot = await getDocs(collection(db, path));
    const groups: AddOnGroup[] = [];
    snapshot.forEach(docSnap => {
      groups.push({ id: docSnap.id, ...docSnap.data() } as AddOnGroup);
    });
    return groups;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function createAddOnGroup(group: AddOnGroup): Promise<void> {
  const path = `stores/${group.storeId}/addOnGroups`;
  try {
    const docRef = doc(db, path, group.id);
    await setDoc(docRef, {
      ...group,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${group.id}`);
  }
}

export async function updateAddOnGroup(storeId: string, groupId: string, updates: Partial<AddOnGroup>): Promise<void> {
  const path = `stores/${storeId}/addOnGroups`;
  try {
    const docRef = doc(db, path, groupId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${groupId}`);
  }
}

export async function deleteAddOnGroup(storeId: string, groupId: string): Promise<void> {
  const path = `stores/${storeId}/addOnGroups`;
  try {
    const docRef = doc(db, path, groupId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${groupId}`);
  }
}
