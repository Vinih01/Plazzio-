import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import { getOrderById, subscribeToOrderById, cancelCustomerOrder } from '../../services/orderService';
import { formatBRL, formatDateTime, getOrderStatusMeta, getPaymentMethodLabel, formatWhatsAppMessage } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Bike, 
  ShoppingBag, 
  ArrowLeft, 
  AlertTriangle, 
  Store as StoreIcon, 
  Phone, 
  QrCode, 
  RefreshCw,
  MessageSquare
} from 'lucide-react';

interface OrderPageProps {
  orderId: string;
  onBack: () => void;
  onNavigateHome: () => void;
}

export const OrderPage: React.FC<OrderPageProps> = ({ orderId, onBack, onNavigateHome }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState('');

  const { currentUser } = useAuth();

  const loadOrder = async () => {
    try {
      const data = await getOrderById(orderId);
      if (data) setOrder(data);
    } catch (e) {
      console.warn('Error loading order:', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    // Subscribe to live order status updates
    const unsubscribe = subscribeToOrderById(orderId, (liveOrder) => {
      setOrder(liveOrder);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!order || !cancelReason.trim()) return;
    setCancelling(true);
    setActionError('');
    try {
      await cancelCustomerOrder(order.id, cancelReason.trim(), currentUser?.uid || 'guest');
      setCancelModalOpen(false);
      await loadOrder();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível cancelar o pedido.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Localizando seu pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Pedido não encontrado</h2>
          <p className="text-xs text-slate-500">
            Não conseguimos localizar as informações deste pedido no momento.
          </p>
          <button
            onClick={onNavigateHome}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  const statusMeta = getOrderStatusMeta(order.orderStatus);
  const canCancel = order.orderStatus === 'pending_confirmation';

  const orderStages = [
    { key: 'pending_confirmation', label: 'Enviado' },
    { key: 'accepted', label: 'Aceito' },
    { key: 'preparing', label: 'Em Preparo' },
    { key: 'ready', label: order.fulfillmentMethod === 'delivery' ? 'Saiu para entrega' : 'Pronto p/ retirada' },
    { key: 'delivered', label: 'Entregue' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar aos meus pedidos</span>
          </button>

          <button
            onClick={loadOrder}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar status</span>
          </button>
        </div>

        {/* Order Status Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-500">
                  {order.orderNumber}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-500">
                  {formatDateTime(order.createdAt)}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                {order.storeSnapshot.name}
              </h1>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${statusMeta.bgClass} ${statusMeta.textClass}`}>
                <span className="w-2 h-2 rounded-full bg-current" />
                <span>{statusMeta.label}</span>
              </div>
              
              <button
                onClick={() => {
                  const rawPhone = order.storeSnapshot.whatsappOrderNumber || order.storeSnapshot.phone;
                  if (!rawPhone) {
                    alert('Este estabelecimento não possui WhatsApp configurado.');
                    return;
                  }
                  const cleanDigits = rawPhone.replace(/\D/g, '');
                  const formattedPhone = cleanDigits.startsWith('55') ? cleanDigits : `55${cleanDigits}`;
                  const message = formatWhatsAppMessage(order);
                  const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
                  window.open(url, '_blank');
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Stepper Progress Bar (unless cancelled) */}
          {order.orderStatus !== 'cancelled' ? (
            <div className="pt-6">
              <div className="grid grid-cols-5 gap-2 text-center">
                {orderStages.map((stage, idx) => {
                  const isDone = statusMeta.stepIndex >= idx;
                  const isCurrent = statusMeta.stepIndex === idx;
                  return (
                    <div key={stage.key} className="space-y-2">
                      <div className={`h-1.5 rounded-full transition-colors ${
                        isDone ? 'bg-orange-600' : 'bg-slate-200'
                      }`} />
                      <span className={`text-[11px] block font-medium leading-tight ${
                        isCurrent ? 'text-orange-600 font-bold' : isDone ? 'text-slate-900' : 'text-slate-400'
                      }`}>
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="pt-6 text-center py-4 bg-red-50/50 rounded-lg mt-4 border border-red-100">
              <p className="text-xs font-bold text-red-700">Este pedido foi cancelado.</p>
              {order.cancellationReason && (
                <p className="text-xs text-red-600 mt-1">Motivo: {order.cancellationReason}</p>
              )}
            </div>
          )}

          {canCancel && (
            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                O restaurante ainda não começou o preparo.
              </span>
              <button
                onClick={() => setCancelModalOpen(true)}
                className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
              >
                Cancelar este pedido
              </button>
            </div>
          )}
        </div>

        {/* WhatsApp Notification Card */}
        {(order.storeSnapshot.whatsappOrderNumber || order.storeSnapshot.phone) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-900 text-xs">Confirmar ou conversar pelo WhatsApp</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Envie o resumo do pedido diretamente ao WhatsApp do estabelecimento para agilizar o preparo e tirar dúvidas.
              </p>
            </div>
            <button
              onClick={() => {
                const rawPhone = order.storeSnapshot.whatsappOrderNumber || order.storeSnapshot.phone;
                if (!rawPhone) return;
                const cleanDigits = rawPhone.replace(/\D/g, '');
                const formattedPhone = cleanDigits.startsWith('55') ? cleanDigits : `55${cleanDigits}`;
                const message = formatWhatsAppMessage(order);
                const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-2 shrink-0 cursor-pointer shadow-xs transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Abrir WhatsApp</span>
            </button>
          </div>
        )}

        {/* Order Details & Items Snapshot */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Itens do Pedido (Snapshot)
          </h2>

          <div className="divide-y divide-slate-100">
            {order.itemsSnapshot.map(item => (
              <div key={item.id} className="py-3 flex justify-between gap-4 text-xs">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {item.quantity}x {item.name}
                  </h3>
                  {item.selectedVariant && (
                    <p className="text-slate-500 mt-0.5">{item.selectedVariant.name}</p>
                  )}
                  {item.selectedAddOns?.map(a => (
                    <p key={a.id} className="text-slate-400 text-[11px]">+ {a.name}</p>
                  ))}
                  {item.notes && (
                    <p className="text-amber-700 mt-0.5 italic">Obs: {item.notes}</p>
                  )}
                </div>
                <span className="font-bold text-slate-900 shrink-0">
                  {formatBRL(item.itemTotal)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium text-slate-900">{formatBRL(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxa de entrega</span>
              <span className="font-medium text-slate-900">{formatBRL(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total do Pedido</span>
              <span className="text-orange-600 font-extrabold">{formatBRL(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Delivery & Payment Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Delivery Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              <span>Modalidade e Endereço</span>
            </h3>

            {order.fulfillmentMethod === 'delivery' && order.deliveryAddressSnapshot ? (
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900">Entrega no endereço:</p>
                <p>
                  {order.deliveryAddressSnapshot.street}, {order.deliveryAddressSnapshot.number}
                  {order.deliveryAddressSnapshot.complement ? ` - ${order.deliveryAddressSnapshot.complement}` : ''}
                </p>
                <p>{order.deliveryAddressSnapshot.neighborhood} · {order.deliveryAddressSnapshot.city}/{order.deliveryAddressSnapshot.state}</p>
              </div>
            ) : (
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900">Retirada no Balcão</p>
                <p>Retirar diretamente no estabelecimento {order.storeSnapshot.name}.</p>
              </div>
            )}
          </div>

          {/* Payment Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-orange-500" />
              <span>Pagamento</span>
            </h3>

            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-900">
                {getPaymentMethodLabel(order.paymentMethod)}
              </p>
              <p>
                Status: <span className="font-medium text-slate-800">{order.paymentStatus === 'paid' ? 'Pago' : 'Pendente no recebimento'}</span>
              </p>
              {order.paymentMethod === 'pix_direct' && order.storeSnapshot.pixKey && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] mt-2 font-mono">
                  Chave Pix: {order.storeSnapshot.pixKey}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status History Trail */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Histórico de Atualizações</span>
            </h3>

            <div className="space-y-2 text-xs">
              {order.statusHistory.map((item, i) => (
                <div key={i} className="flex items-start justify-between py-1 border-b border-slate-100 last:border-b-0">
                  <div>
                    <span className="font-semibold text-slate-800">
                      {getOrderStatusMeta(item.status).label}
                    </span>
                    {item.note && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.note}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {formatDateTime(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancelar Pedido"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Você está cancelando o pedido <strong>{order.orderNumber}</strong>. Por favor, informe o motivo do cancelamento:
          </p>

          {actionError && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
              {actionError}
            </p>
          )}

          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Ex: Pedi no endereço errado, desisti da compra..."
            rows={3}
            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500"
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Voltar
            </button>
            <button
              disabled={!cancelReason.trim() || cancelling}
              onClick={handleCancelOrder}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
            >
              {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
