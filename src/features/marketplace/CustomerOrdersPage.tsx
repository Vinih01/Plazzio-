import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import { getCustomerOrders } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import { formatBRL, formatDateTime, getOrderStatusMeta } from '../../lib/utils';
import { ShoppingBag, ArrowRight, Store as StoreIcon, Clock } from 'lucide-react';

interface CustomerOrdersPageProps {
  onSelectOrder: (orderId: string) => void;
  onNavigateExplore: () => void;
}

export const CustomerOrdersPage: React.FC<CustomerOrdersPageProps> = ({
  onSelectOrder,
  onNavigateExplore
}) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = currentUser?.uid || 'guest';
    getCustomerOrders(uid).then(data => {
      setOrders(data);
      setLoading(false);
    });
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Meus Pedidos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Consulte o andamento e o histórico de compras em estabelecimentos locais.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-white rounded-xl border border-slate-200 h-28 animate-pulse p-4" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-800">Você ainda não fez nenhum pedido</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Que tal experimentar as melhores pizzas, lanches ou pães artesanais da sua região?
            </p>
            <button
              onClick={onNavigateExplore}
              className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-semibold hover:bg-orange-700 transition-colors cursor-pointer"
            >
              Explorar Estabelecimentos
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const meta = getOrderStatusMeta(order.orderStatus);
              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order.id)}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {order.orderNumber}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(order.createdAt)}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900">
                      {order.storeSnapshot.name}
                    </h3>

                    <p className="text-xs text-slate-500">
                      {order.itemsSnapshot.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold ${meta.bgClass} ${meta.textClass}`}>
                      {meta.label}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900">
                        {formatBRL(order.total)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
