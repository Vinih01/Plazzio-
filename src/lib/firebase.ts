import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific databaseId as required by AI Studio guidelines
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Diagnostic error handler that provides structured context without leaking secrets
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const isPermissionDenied = rawMsg.toLowerCase().includes('permission') || rawMsg.toLowerCase().includes('permissões');
  const isUnauthenticated = !auth.currentUser;

  const errInfo: FirestoreErrorInfo = {
    error: rawMsg,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  // Structured diagnostic logging for debugging
  console.error('[Firestore Error Diagnostic]', {
    operation: operationType,
    collectionPath: path,
    hasActiveSession: !isUnauthenticated,
    authUid: auth.currentUser?.uid || 'NONE',
    isPermissionDenied,
    originalMessage: rawMsg,
  });

  // Provide clear, actionable Portuguese message while retaining technical diagnostic payload
  let userFriendly = rawMsg;
  if (isPermissionDenied) {
    if (isUnauthenticated) {
      userFriendly = 'Sessão não autenticada. É necessário estar conectado para realizar esta operação.';
    } else {
      userFriendly = 'Permissão negada para esta operação. Verifique se os dados e o proprietário correspondem à sua conta.';
    }
  }

  throw new Error(JSON.stringify({ ...errInfo, userFriendlyMessage: userFriendly }));
}

// Connection test at boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline. Please check your network.');
      return false;
    }
    return true;
  }
}

export async function loginWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

export async function logoutUser() {
  return await signOut(auth);
}
