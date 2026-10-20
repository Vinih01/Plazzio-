import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus } from '../../types';
import { getStoreOrders, subscribeToStoreOrders, updateOrderStatus } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import { formatBRL, formatTime, formatDateTime, getPaymentMethodLabel, formatWhatsAppMessage } from '../../lib/utils';
import { 
  printOrderReceipt, 
  playOrderAlertSound, 
  getThermalPrinterConfig, 
  saveThermalPrinterConfig, 
  ThermalPrinterConfig 
} from '../../lib/thermalPrinter';
import { Modal } from '../../components/ui/Modal';
import { 
  ShoppingBag, 
  Clock, 
  MapPin, 
  Bike, 
  User, 
  Phone, 
  QrCode, 
  Check, 
  X, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle,
  Printer,
  MessageSquare,
  Volume2,
  VolumeX,
  Sliders
} from 'lucide-react';

interface MerchantOrdersKanbanProps {
  storeId: string;
  storeName: string;
  onBackToDashboard: () => void;
}

export const MerchantOrdersKanban: React.FC<MerchantOrdersKanbanProps> = ({
  storeId,
  storeName,
  onBackToDashboard
}) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [printerConfig, setPrinterConfig] = useState<ThermalPrinterConfig>(() => getThermalPrinterConfig(storeId));
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  const fetchOrders = async () => {
    try {
      const data = await getStoreOrders(storeId);
      setOrders(data);
    } catch (e) {
      console.warn('Error fetching store orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    isInitialLoadRef.current = true;
    knownOrderIdsRef.current.clear();

    // Real-time listener for orders
    const unsubscribe = subscribeToStoreOrders(storeId, (data) => {
      if (isInitialLoadRef.current) {
        data.forEach(o => knownOrderIdsRef.current.add(o.id));
        isInitialLoadRef.current = false;
      } else {
        // Detect newly arrived pending orders
        const newPendingOrders = data.filter(
          o => !knownOrderIdsRef.current.has(o.id) && o.orderStatus === 'pending_confirmation'
        );

        if (newPendingOrders.length > 0) {
          if (printerConfig.soundEnabled) {
            playOrderAlertSound();
          }
          if (printerConfig.enabled) {
            newPendingOrders.forEach(newOrder => {
              printOrderReceipt(newOrder, printerConfig.paperWidth);
            });
          }
        }

        data.forEach(o => knownOrderIdsRef.current.add(o.id));
      }

      setOrders(data);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [storeId, printerConfig.enabled, printerConfig.soundEnabled, printerConfig.paperWidth]);

  const handleUpdatePrinterConfig = (updated: ThermalPrinterConfig) => {
    setPrinterConfig(updated);
    saveThermalPrinterConfig(storeId, updated);
  };

  const handlePrint = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    printOrderReceipt(order, printerConfig.paperWidth);
  };

  const handleAdvanceStatus = async (orderId: string, nextStatus: OrderStatus, note?: string) => {
    setActionLoading(true);
    try {
      await updateOrderStatus(
        orderId,
        nextStatus,
        currentUser?.uid || 'merchant',
        currentUser?.displayName || 'Comerciante',
        note || `Atualizado para ${nextStatus}`
      );
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, orderStatus: nextStatus } : null);
      }
    } catch (e) {
      console.error('Error advancing status:', e);
    } finally {
      setActionLoading(false);
    }
  };

  // Group orders into columns
  const pendingOrders = orders.filter(o => o.orderStatus === 'pending_confirmation');
  const acceptedOrders = orders.filter(o => o.orderStatus === 'accepted');
  const preparingOrders = orders.filter(o => o.orderStatus === 'preparing');
  const readyOrders = orders.filter(o => ['ready_for_pickup', 'out_for_delivery'].includes(o.orderStatus));
  const completedOrders = orders.filter(o => ['delivered', 'completed'].includes(o.orderStatus));
  const cancelledOrders = orders.filter(o => o.orderStatus === 'cancelled');

  const renderKanbanCard = (order: Order) => (
    <div
      key={order.id}
      onClick={() => setSelectedOrder(order)}
      className="p-3.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer space-y-2 text-xs group relative"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-slate-900">{order.orderNumber}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">{formatTime(order.createdAt)}</span>
          <button
            onClick={(e) => handlePrint(e, order)}
            title="Imprimir via térmica"
            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate">{order.customerSnapshot.name}</span>
      </div>

      <div className="text-slate-500 line-clamp-2">
        {order.itemsSnapshot.map(i => `${i.quantity}x ${i.name}`).join(', ')}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="font-bold text-slate-900">{formatBRL(order.total)}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
          order.fulfillmentMethod === 'delivery' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-700'
        }`}>
          {order.fulfillmentMethod === 'delivery' ? 'Entrega' : 'Retirada'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Kanban Topbar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            onClick={onBackToDashboard}
            className="text-xs text-slate-500 hover:text-slate-800 mb-1"
          >
            ← Voltar ao painel
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-slate-900">
              Operação de Pedidos (Kanban)
            </h1>
            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
              {storeName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-print status badge & quick toggle */}
          <button
            onClick={() => handleUpdatePrinterConfig({ ...printerConfig, enabled: !printerConfig.enabled })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-colors ${
              printerConfig.enabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title={printerConfig.enabled ? 'Impressão automática ativada' : 'Impressão automática desligada'}
          >
            <Printer className={`w-3.5 h-3.5 ${printerConfig.enabled ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Auto-Impressão: {printerConfig.enabled ? 'Ligada' : 'Desligada'}</span>
          </button>

          <button
            onClick={() => setPrinterModalOpen(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Configurar impressora térmica"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Configurar Impressora</span>
          </button>

          <button
            onClick={fetchOrders}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Kanban Columns Strip */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-6">
        <div className="flex gap-4 min-w-max pb-4">
          {/* Col 1: Novos */}
          <div className="w-72 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col max-h-[calc(100vh-140px)]">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-amber-50 rounded-t-xl">
              <span className="text-xs font-bold text-amber-900">Novos ({pendingOrders.length})</span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {pendingOrders.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-6">Sem novos pedidos</p>
              ) : (
                pendingOrders.map(renderKanbanCard)
              )}
            </div>
          </div>

          {/* Col 2: Confirmados */}
          <div className="w-72 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col max-h-[calc(100vh-140px)]">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-blue-50 rounded-t-xl">
              <span className="text-xs font-bold text-blue-900">Confirmados ({acceptedOrders.length})</span>
            </div>
            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {acceptedOrders.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-6">Nenhum aguardando</p>
              ) : (
                acceptedOrders.map(renderKanbanCard)
              )}
            </div>
          </div>

          {/* Col 3: Em Preparo */}
          <div className="w-72 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col max-h-[calc(100vh-140px)]">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-indigo-50 rounded-t-xl">
              <span className="text-xs font-bold text-indigo-900">Em Preparo ({preparingOrders.length})</span>
            </div>
            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {preparingOrders.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-6">Cozinha livre</p>
              ) : (
                preparingOrders.map(renderKanbanCard)
              )}
            </div>
          </div>

          {/* Col 4: Prontos / Em Entrega */}
          <div className="w-72 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col max-h-[calc(100vh-140px)]">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-purple-50 rounded-t-xl">
              <span className="text-xs font-bold text-purple-900">Prontos / Entrega ({readyOrders.length})</span>
            </div>
            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {readyOrders.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-6">Nenhum em trânsito</p>
              ) : (
                readyOrders.map(renderKanbanCard)
              )}
            </div>
          </div>

          {/* Col 5: Concluídos */}
          <div className="w-72 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col max-h-[calc(100vh-140px)]">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-emerald-50 rounded-t-xl">
              <span className="text-xs font-bold text-emerald-900">Concluídos ({completedOrders.length})</span>
            </div>
            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {completedOrders.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-6">Nenhum concluído hoje</p>
              ) : (
                completedOrders.slice(0, 15).map(renderKanbanCard)
              )}
            </div>
          </div>

          {/* Col 6: Cancelados */}
          <div className="w-72 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col max-h-[calc(100vh-140px)]">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-red-50 rounded-t-xl">
              <span className="text-xs font-bold text-red-900">Cancelados ({cancelledOrders.length})</span>
            </div>
            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {cancelledOrders.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-6">Nenhum cancelamento</p>
              ) : (
                cancelledOrders.map(renderKanbanCard)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Details & Workflow Action Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Pedido ${selectedOrder.orderNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-5 text-xs">
            {/* Top row */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="font-semibold text-slate-900">{selectedOrder.customerSnapshot.name}</p>
                <p className="text-slate-500">{selectedOrder.customerSnapshot.phone} · {selectedOrder.customerSnapshot.email}</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900 text-sm">{formatBRL(selectedOrder.total)}</span>
                <p className="text-slate-500">{getPaymentMethodLabel(selectedOrder.paymentMethod)}</p>
              </div>
            </div>

            {/* Address */}
            {selectedOrder.fulfillmentMethod === 'delivery' && selectedOrder.deliveryAddressSnapshot && (
              <div className="p-3 border border-slate-200 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                  <span>Endereço de Entrega</span>
                </div>
                <p className="text-slate-600">
                  {selectedOrder.deliveryAddressSnapshot.street}, {selectedOrder.deliveryAddressSnapshot.number}
                  {selectedOrder.deliveryAddressSnapshot.complement ? ` (${selectedOrder.deliveryAddressSnapshot.complement})` : ''}
                </p>
                <p className="text-slate-500">{selectedOrder.deliveryAddressSnapshot.neighborhood} · {selectedOrder.deliveryAddressSnapshot.city}</p>
              </div>
            )}

            {/* Items */}
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Itens Solicitados</h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg p-3">
                {selectedOrder.itemsSnapshot.map(item => (
                  <div key={item.id} className="py-2 flex justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{item.quantity}x {item.name}</p>
                      {item.selectedVariant && <p className="text-[11px] text-slate-500">{item.selectedVariant.name}</p>}
                      {item.selectedAddOns?.map(a => (
                        <p key={a.id} className="text-[10px] text-slate-400">+ {a.name}</p>
                      ))}
                      {item.notes && <p className="text-amber-700 italic mt-0.5">Obs: {item.notes}</p>}
                    </div>
                    <span className="font-bold text-slate-800">{formatBRL(item.itemTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="p-2.5 bg-amber-50 rounded-lg text-amber-900 border border-amber-200">
                <strong>Instruções do cliente:</strong> {selectedOrder.notes}
              </div>
            )}

            {/* Workflow Action Buttons */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Ações da Cozinha</h3>
              <div className="flex flex-wrap gap-2">
                {selectedOrder.orderStatus === 'pending_confirmation' && (
                  <>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAdvanceStatus(selectedOrder.id, 'accepted', 'Pedido aceito pela cozinha')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aceitar Pedido</span>
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAdvanceStatus(selectedOrder.id, 'cancelled', 'Recusado pelo estabelecimento')}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Recusar</span>
                    </button>
                  </>
                )}

                {selectedOrder.orderStatus === 'accepted' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAdvanceStatus(selectedOrder.id, 'preparing', 'Iniciou preparação dos pratos')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Iniciar Preparo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {selectedOrder.orderStatus === 'preparing' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAdvanceStatus(
                      selectedOrder.id, 
                      selectedOrder.fulfillmentMethod === 'delivery' ? 'out_for_delivery' : 'ready_for_pickup',
                      'Pedido pronto para entrega ou retirada'
                    )}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{selectedOrder.fulfillmentMethod === 'delivery' ? 'Despachar Entrega' : 'Pronto para Retirada'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {['ready_for_pickup', 'out_for_delivery'].includes(selectedOrder.orderStatus) && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAdvanceStatus(selectedOrder.id, 'delivered', 'Pedido entregue com sucesso ao cliente')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar Entrega / Concluir</span>
                  </button>
                )}

                {!['delivered', 'completed', 'cancelled'].includes(selectedOrder.orderStatus) && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAdvanceStatus(selectedOrder.id, 'cancelled', 'Cancelado pela loja')}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-semibold ml-auto"
                  >
                    Cancelar Pedido
                  </button>
                )}
              </div>

              {/* Utility buttons: Print & WhatsApp */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => printOrderReceipt(selectedOrder, printerConfig.paperWidth)}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Via Térmica ({printerConfig.paperWidth})</span>
                </button>

                {selectedOrder.customerSnapshot.phone && (
                  <button
                    type="button"
                    onClick={() => {
                      const phone = selectedOrder.customerSnapshot.phone?.replace(/\D/g, '') || '';
                      if (!phone) return;
                      const msg = `Olá ${selectedOrder.customerSnapshot.name}! Aqui é do ${storeName}. Sobre o seu pedido ${selectedOrder.orderNumber}: `;
                      window.open(`https://wa.me/55${phone.startsWith('55') ? phone.slice(2) : phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp do Cliente</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Printer Configuration Modal */}
      {printerModalOpen && (
        <Modal
          isOpen={printerModalOpen}
          onClose={() => setPrinterModalOpen(false)}
          title="Configuração de Impressão Térmica"
          maxWidth="md"
        >
          <div className="space-y-5 text-xs">
            <p className="text-slate-600">
              Configure a impressão automática para emitir as comandas diretamente na impressora de produção da sua cozinha ou balcão (compatível com impressoras 80mm e 58mm via navegador).
            </p>

            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {/* Toggle Auto-Print */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printerConfig.enabled}
                  onChange={(e) => handleUpdatePrinterConfig({ ...printerConfig, enabled: e.target.checked })}
                  className="mt-0.5 w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-900 block text-sm">Impressão Automática de Novos Pedidos</span>
                  <span className="text-slate-500 text-[11px]">
                    Quando ativado, cada novo pedido que chegar nesta tela acionará a impressão da comanda imediatamente sem cliques manuais.
                  </span>
                </div>
              </label>

              {/* Toggle Sound Alert */}
              <label className="flex items-start gap-3 cursor-pointer pt-3 border-t border-slate-200">
                <input
                  type="checkbox"
                  checked={printerConfig.soundEnabled}
                  onChange={(e) => handleUpdatePrinterConfig({ ...printerConfig, soundEnabled: e.target.checked })}
                  className="mt-0.5 w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-900 block text-sm">Alerta Sonoro (Campainha da Cozinha)</span>
                  <span className="text-slate-500 text-[11px]">
                    Toca um aviso sonoro sempre que um novo pedido for detectado pelo sistema.
                  </span>
                </div>
              </label>

              {/* Format / Paper Width */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <label className="block font-bold text-slate-900 text-sm">Formato da Bobina Térmica</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleUpdatePrinterConfig({ ...printerConfig, paperWidth: '80mm' })}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      printerConfig.paperWidth === '80mm'
                        ? 'bg-orange-50 border-orange-500 text-orange-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs">80mm (Padrão PDV)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Epson, Bematech, Elgin i9, Daruma, Sunmi</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdatePrinterConfig({ ...printerConfig, paperWidth: '58mm' })}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      printerConfig.paperWidth === '58mm'
                        ? 'bg-orange-50 border-orange-500 text-orange-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs">58mm (Bobina Compacta)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Mini impressoras portáteis Bluetooth/USB</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Test buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playOrderAlertSound()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Testar Som</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (orders.length > 0) {
                      printOrderReceipt(orders[0], printerConfig.paperWidth);
                    } else {
                      // Generate demo order for test
                      const testOrder: Order = {
                        id: 'test_print',
                        orderNumber: '#TESTE-01',
                        customerUid: 'test',
                        storeId,
                        storeSnapshot: { name: storeName, slug: 'loja', city: 'São Paulo' },
                        customerSnapshot: { name: 'Cliente Teste de Impressão', phone: '(11) 99999-9999', email: 'teste@plazzio.app' },
                        itemsSnapshot: [
                          {
                            id: 'cart_test_1',
                            productId: 'prod_test_1',
                            storeId,
                            storeName,
                            name: 'Item Teste de Comanda',
                            basePrice: 28.5,
                            quantity: 1,
                            selectedAddOns: [],
                            itemTotal: 28.5
                          }
                        ],
                        fulfillmentMethod: 'delivery',
                        deliveryAddressSnapshot: {
                          street: 'Rua das Flores',
                          number: '123',
                          neighborhood: 'Centro',
                          city: 'São Paulo',
                          state: 'SP',
                          zipCode: '01000-000'
                        },
                        subtotal: 28.5,
                        deliveryFee: 5.0,
                        discount: 0,
                        total: 33.5,
                        paymentMethod: 'pix_direct',
                        paymentStatus: 'pending',
                        orderStatus: 'pending_confirmation',
                        notes: 'Teste de impressão comanda térmica',
                        statusHistory: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      };
                      printOrderReceipt(testOrder, printerConfig.paperWidth);
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Testar Impressão</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPrinterModalOpen(false)}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold cursor-pointer"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
