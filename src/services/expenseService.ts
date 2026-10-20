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
import { Expense } from '../types';

export const EXPENSE_CATEGORIES_MAP: Record<string, string> = {
  aluguel: 'Aluguel',
  agua_luz_internet: 'Água, Luz e Internet',
  salarios: 'Salários e Mão de Obra',
  ingredientes_mercadorias: 'Ingredientes ou Mercadorias',
  embalagens: 'Embalagens',
  entregas: 'Entregas',
  taxas_pagamento: 'Taxas de Pagamento',
  comissoes_marketplace: 'Comissões de Marketplaces',
  marketing: 'Marketing',
  equipamentos_manutencao: 'Equipamentos e Manutenção',
  impostos: 'Impostos',
  outras: 'Outras Despesas'
};

export async function getStoreExpenses(storeId: string): Promise<Expense[]> {
  const path = `stores/${storeId}/expenses`;
  try {
    const q = query(collection(db, path), orderBy('competenceDate', 'desc'));
    const snapshot = await getDocs(q);
    const expenses: Expense[] = [];
    snapshot.forEach(docSnap => {
      expenses.push({ id: docSnap.id, ...docSnap.data() } as Expense);
    });
    return expenses;
  } catch (error) {
    console.warn('Fallback fetching expenses or missing index:', error);
    try {
      const fallbackSnapshot = await getDocs(collection(db, path));
      const expenses: Expense[] = [];
      fallbackSnapshot.forEach(docSnap => {
        expenses.push({ id: docSnap.id, ...docSnap.data() } as Expense);
      });
      return expenses.sort((a, b) => new Date(b.competenceDate).getTime() - new Date(a.competenceDate).getTime());
    } catch (innerError) {
      handleFirestoreError(innerError, OperationType.GET, path);
      return [];
    }
  }
}

export async function createExpense(expense: Expense): Promise<void> {
  const path = `stores/${expense.storeId}/expenses`;
  try {
    const docRef = doc(db, path, expense.id);
    await setDoc(docRef, {
      ...expense,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${expense.id}`);
  }
}

export async function updateExpense(storeId: string, expenseId: string, updates: Partial<Expense>): Promise<void> {
  const path = `stores/${storeId}/expenses`;
  try {
    const docRef = doc(db, path, expenseId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${expenseId}`);
  }
}

export async function deleteExpense(storeId: string, expenseId: string): Promise<void> {
  const path = `stores/${storeId}/expenses`;
  try {
    const docRef = doc(db, path, expenseId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${expenseId}`);
  }
}
