import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CreateOrderRequest, Order, OrderStatus, OrderStatusHistoryItem, PaymentStatus } from '../types';
import { removeUndefinedFields } from '../lib/utils';

const ORDERS_COLLECTION = 'orders';

/**
 * Validates essential business constraints and normalizes optional fields,
 * guaranteeing no `undefined` values reach Firestore while preserving valid 0, false, null, and strings.
 */
export function validateAndNormalizeOrder(order: Order): Order {
  if (!order.id || typeof order.id !== 'string') {
    throw new Error('Identificador único do pedido ausente ou inválido.');
  }
  if (!order.storeId || typeof order.storeId !== 'string') {
    throw new Error('Identificador do estabelecimento é obrigatório.');
  }
  if (!order.customerUid || typeof order.customerUid !== 'string') {
    throw new Error('Identificador do cliente autenticado é obrigatório.');
  }
  if (!order.orderNumber || typeof order.orderNumber !== 'string') {
    throw new Error('Número de identificação do pedido é obrigatório.');
  }
  if (!order.storeSnapshot || !order.storeSnapshot.name || !order.storeSnapshot.slug) {
    throw new Error('Snapshot dos dados do estabelecimento incompleto.');
  }
  if (!order.customerSnapshot || !order.customerSnapshot.name) {
    throw new Error('Snapshot dos dados do cliente incompleto.');
  }
  if (!Array.isArray(order.itemsSnapshot) || order.itemsSnapshot.length === 0) {
    throw new Error('O pedido deve conter pelo menos um item válido no carrinho.');
  }
  if (typeof order.total !== 'number' || isNaN(order.total) || order.total < 0) {
    throw new Error('Valor total do pedido inválido.');
  }
  if (typeof order.subtotal !== 'number' || isNaN(order.subtotal) || order.subtotal < 0) {
    throw new Error('Subtotal do pedido inválido.');
  }

  // Deep recursive removal of all undefined fields to comply with Firestore
  const sanitized = removeUndefinedFields<Order>({
    ...order,
    deliveryFee: typeof order.deliveryFee === 'number' ? order.deliveryFee : 0,
    discount: typeof order.discount === 'number' ? order.discount : 0,
    createdAt: order.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return sanitized;
}

export async function createOrder(request: CreateOrderRequest): Promise<Order> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Entre na sua conta Google antes de finalizar o pedido.');
  }

  // The browser sends only product/option IDs and quantities. The server reconstructs
  // every price, total, product snapshot, status and order ID from trusted Firestore data.
  const token = await currentUser.getIdToken();
  let response: Response;
  try {
    response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor seguro de pedidos. Nenhum pedido foi confirmado; tente novamente.');
  }

  const payload = await response.json().catch(() => ({})) as { order?: Order; error?: string };
  if (!response.ok) {
    throw new Error(payload.error || 'Não foi possível registrar o pedido com segurança.');
  }
  if (!payload.order || payload.order.customerUid !== currentUser.uid || !payload.order.id) {
    throw new Error('O servidor não confirmou um pedido válido. Não considere a compra concluída.');
  }

  return payload.order;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Order;
    }
    // Also check local temporary store if in dev mode
    const cached = localStorage.getItem(`plazzio_order_${orderId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${ORDERS_COLLECTION}/${orderId}`);
    return null;
  }
}

export function subscribeToOrderById(
  orderId: string, 
  callback: (order: Order | null) => void
): () => void {
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as Order);
      } else {
        const cached = localStorage.getItem(`plazzio_order_${orderId}`);
        callback(cached ? JSON.parse(cached) : null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${ORDERS_COLLECTION}/${orderId}`);
    }
  );
}


export async function getStoreOrders(storeId: string): Promise<Order[]> {
  try {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      where('storeId', '==', storeId)
    );
    const snapshot = await getDocs(q);
    const orders: Order[] = [];
    snapshot.forEach(docSnap => {
      orders.push(docSnap.data() as Order);
    });
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('Store orders fetch notice:', error);
    return [];
  }
}

export function subscribeToStoreOrders(
  storeId: string,
  callback: (orders: Order[]) => void
): () => void {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('storeId', '==', storeId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach(docSnap => {
        orders.push(docSnap.data() as Order);
      });
      callback(orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `${ORDERS_COLLECTION}?storeId=${storeId}`);
    }
  );
}

export async function getAllOrdersAdmin(): Promise<Order[]> {
  try {
    const snapshot = await getDocs(collection(db, ORDERS_COLLECTION));
    const orders: Order[] = [];
    snapshot.forEach(docSnap => {
      orders.push(docSnap.data() as Order);
    });
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('Admin orders fetch notice:', error);
    return [];
  }
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  actorUid: string,
  actorName: string,
  note?: string,
  paymentStatus?: PaymentStatus
): Promise<void> {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderSnap = await getDoc(docRef);
    if (!orderSnap.exists()) {
      throw new Error('Pedido não encontrado');
    }
    const currentOrder = orderSnap.data() as Order;

    const newHistoryItem: OrderStatusHistoryItem = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      actorUid,
      actorName,
      note,
    };

    const updates: Partial<Order> = {
      orderStatus: newStatus,
      statusHistory: [...(currentOrder.statusHistory || []), newHistoryItem],
      updatedAt: new Date().toISOString(),
    };

    if (paymentStatus) {
      updates.paymentStatus = paymentStatus;
    } else if (newStatus === 'delivered' || newStatus === 'completed') {
      updates.paymentStatus = 'paid';
    }

    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ORDERS_COLLECTION}/${orderId}`);
  }
}

export async function cancelCustomerOrder(
  orderId: string,
  reason: string,
  actorUid: string
): Promise<void> {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderSnap = await getDoc(docRef);
    if (!orderSnap.exists()) {
      throw new Error('Pedido não encontrado');
    }
    const currentOrder = orderSnap.data() as Order;

    if (currentOrder.orderStatus !== 'pending_confirmation') {
      throw new Error('O pedido já começou a ser preparado e não pode ser cancelado diretamente.');
    }

    const newHistoryItem: OrderStatusHistoryItem = {
      status: 'cancelled',
      timestamp: new Date().toISOString(),
      actorUid,
      actorName: 'Cliente',
      note: reason,
    };

    await updateDoc(docRef, {
      orderStatus: 'cancelled',
      cancellationReason: reason,
      statusHistory: [...(currentOrder.statusHistory || []), newHistoryItem],
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ORDERS_COLLECTION}/${orderId}`);
  }
}

export async function getCustomerOrders(customerUid: string): Promise<Order[]> {
  const map = new Map<string, Order>();

  // 1. Try Firestore
  try {
    if (customerUid && customerUid !== 'guest') {
      const q = query(
        collection(db, ORDERS_COLLECTION),
        where('customerUid', '==', customerUid)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        const ord = docSnap.data() as Order;
        map.set(ord.id, ord);
      });
    }
  } catch (e) {
    console.warn('Could not query customer orders in Firestore:', e);
  }

  // 2. Read locally cached orders for guest / current device session
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('plazzio_order_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const ord = JSON.parse(raw) as Order;
          if (!map.has(ord.id)) {
            if (customerUid === 'guest' || ord.customerUid === customerUid || ord.customerUid === 'guest') {
              map.set(ord.id, ord);
            }
          }
        }
      }
    }
  } catch {
    // Ignore local storage parse error
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
