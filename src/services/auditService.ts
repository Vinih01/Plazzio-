import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuditLog } from '../types';

const AUDIT_COLLECTION = 'auditLogs';

export async function logAuditEvent(
  actorUid: string,
  actorEmail: string,
  action: string,
  entityType: 'store' | 'product' | 'order' | 'category' | 'user',
  entityId: string,
  details: string
): Promise<void> {
  try {
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logItem: AuditLog = {
      id,
      actorUid,
      actorEmail,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, AUDIT_COLLECTION, id), logItem);
  } catch (error) {
    console.warn('Could not record audit log:', error);
  }
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  try {
    const snapshot = await getDocs(collection(db, AUDIT_COLLECTION));
    const logs: AuditLog[] = [];
    snapshot.forEach(docSnap => {
      logs.push(docSnap.data() as AuditLog);
    });
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.warn('Audit logs fetch notice:', error);
    return [];
  }
}
