import React, { useState, useEffect } from 'react';
import { Store, Order, StoreStatus, AuditLog, Review } from '../../types';
import { getAllStoresAdmin, updateStoreStatus, seedMarketplaceData } from '../../services/storeService';
import { getAllOrdersAdmin } from '../../services/orderService';
import { logAuditEvent, getAuditLogs } from '../../services/auditService';
import { getAllReviewsAdmin, updateReviewStatus } from '../../services/reviewService';
import { useAuth } from '../../context/AuthContext';
import { formatBRL, formatDateTime, getOrderStatusMeta, getStoreStatusMeta } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { 
  ShieldCheck, 
  Store as StoreIcon, 
  ShoppingBag, 
  TrendingUp, 
  AlertTriangle, 
  Check, 
  X, 
  PauseCircle, 
  PlayCircle, 
  Eye, 
  Search, 
  Database, 
  History, 
  Sparkles,
  Star,
  MessageSquare
} from 'lucide-react';

interface AdminDashboardProps {
  onSelectOrder: (orderId: string) => void;
  onPreviewStore?: (slug: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSelectOrder, onPreviewStore }) => {
  const { currentUser } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminReviews, setAdminReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdminUser = currentUser?.email?.toLowerCase() === 'mapwiser@gmail.com';

  if (!isAdminUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Acesso Restrito ao Administrador</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            O painel de administração central do Plazzio é exclusivo para a conta oficial <span className="font-semibold text-slate-800">mapwiser@gmail.com</span>. Sua conta atual (<span className="font-semibold text-slate-800">{currentUser?.email || 'Não autenticado'}</span>) não possui privilégios administrativos.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => window.location.hash = '#/'}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Voltar à página inicial
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tabs
  const [activeTab, setActiveTab] = useState<'stores' | 'orders' | 'reviews' | 'audit'>('stores');
  const [storeFilter, setStoreFilter] = useState<'all' | StoreStatus>('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchStore, setSearchStore] = useState('');

  // Modals
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionTargetStoreId, setRejectionTargetStoreId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedingSuccess, setSeedingSuccess] = useState(false);

  const fetchAdminData = async () => {
    try {
      const [storesData, ordersData, logsData, reviewsData] = await Promise.all([
        getAllStoresAdmin(),
        getAllOrdersAdmin(),
        getAuditLogs(),
        getAllReviewsAdmin()
      ]);
      setStores(storesData);
      setOrders(ordersData);
      setAuditLogs(logsData);
      setAdminReviews(reviewsData);
    } catch (e) {
      console.warn('Error loading admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleApproveReview = async (review: Review) => {
    try {
      await updateReviewStatus(review.id, 'approved', review.storeId);
      await logAuditEvent(
        currentUser?.uid || 'admin',
        currentUser?.email || 'admin@plazzio.app',
        'APPROVE_REVIEW',
        'store',
        review.storeId,
        `Avaliação de "${review.customerName}" (Nota: ${review.rating}) aprovada para publicação.`
      );
      await fetchAdminData();
    } catch (err) {
      console.error('Error approving review:', err);
    }
  };

  const handleRejectReview = async (review: Review) => {
    try {
      await updateReviewStatus(review.id, 'rejected', review.storeId);
      await logAuditEvent(
        currentUser?.uid || 'admin',
        currentUser?.email || 'admin@plazzio.app',
        'REJECT_REVIEW',
        'store',
        review.storeId,
        `Avaliação de "${review.customerName}" rejeitada pela moderação.`
      );
      await fetchAdminData();
    } catch (err) {
      console.error('Error rejecting review:', err);
    }
  };

  const handleApproveStore = async (store: Store) => {
    try {
      await updateStoreStatus(store.id, 'approved');
      await logAuditEvent(
        currentUser?.uid || 'admin',
        currentUser?.email || 'admin@plazzio.app',
        'APPROVE_STORE',
        'store',
        store.id,
        `Estabelecimento "${store.name}" aprovado para publicação no marketplace.`
      );
      await fetchAdminData();
      if (selectedStore?.id === store.id) setSelectedStore(null);
    } catch (e) {
      console.error('Error approving store:', e);
    }
  };

  const handleOpenRejectModal = (storeId: string) => {
    setRejectionTargetStoreId(storeId);
    setRejectionReason('');
    setRejectionModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectionTargetStoreId || !rejectionReason.trim()) return;
    try {
      await updateStoreStatus(rejectionTargetStoreId, 'rejected', rejectionReason.trim());
      await logAuditEvent(
        currentUser?.uid || 'admin',
        currentUser?.email || 'admin@plazzio.app',
        'REJECT_STORE',
        'store',
        rejectionTargetStoreId,
        `Reprovado pelo motivo: ${rejectionReason.trim()}`
      );
      setRejectionModalOpen(false);
      await fetchAdminData();
      if (selectedStore?.id === rejectionTargetStoreId) setSelectedStore(null);
    } catch (e) {
      console.error('Error rejecting store:', e);
    }
  };

  const handleSuspendStore = async (store: Store) => {
    try {
      const nextStatus: StoreStatus = store.status === 'suspended' ? 'approved' : 'suspended';
      await updateStoreStatus(store.id, nextStatus);
      await logAuditEvent(
        currentUser?.uid || 'admin',
        currentUser?.email || 'admin@plazzio.app',
        nextStatus === 'suspended' ? 'SUSPEND_STORE' : 'REACTIVATE_STORE',
        'store',
        store.id,
        `Estabelecimento "${store.name}" alterado para status ${nextStatus}.`
      );
      await fetchAdminData();
      if (selectedStore?.id === store.id) setSelectedStore(null);
    } catch (e) {
      console.error('Error suspending store:', e);
    }
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    try {
      await seedMarketplaceData();
      await fetchAdminData();
      setSeedingSuccess(true);
      setTimeout(() => setSeedingSuccess(false), 4000);
    } catch (e) {
      console.error('Error seeding data:', e);
    } finally {
      setSeeding(false);
    }
  };

  // KPIs
  const approvedStoresCount = stores.filter(s => s.status === 'approved').length;
  const pendingStoresCount = stores.filter(s => s.status === 'pending_review').length;
  const suspendedStoresCount = stores.filter(s => s.status === 'suspended' || s.status === 'rejected').length;
  const totalGrossMarketplace = orders
    .filter(o => o.orderStatus !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const filteredStores = stores.filter(s => {
    if (storeFilter !== 'all' && s.status !== storeFilter) return false;
    if (searchStore.trim()) {
      const q = searchStore.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.businessType.toLowerCase().includes(q) || s.city.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Admin Header */}
        <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Painel de Controle da Plataforma</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Administração Central Plazzio
            </h1>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Moderação de novos estabelecimentos, fiscalização de pedidos e auditoria do marketplace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSeedDemoData}
              disabled={seeding}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-white/10"
            >
              <Database className="w-4 h-4 text-orange-400" />
              <span>{seeding ? 'Populando dados...' : 'Semear Dados Demo'}</span>
            </button>
          </div>
        </div>

        {seedingSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-medium">
            Dados de demonstração (lojas, produtos e categorias) semeados no Firestore com sucesso!
          </div>
        )}

        {/* Global KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Lojas Aprovadas e Ativas</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-emerald-600 font-mono">
                {approvedStoresCount}
              </span>
              <StoreIcon className="w-5 h-5 text-emerald-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Lojas Aguardando Revisão</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-amber-600 font-mono">
                {pendingStoresCount}
              </span>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Pedidos na Plataforma</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 font-mono">
                {orders.length}
              </span>
              <ShoppingBag className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Transacionado no Marketplace</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-orange-600 font-mono">
                {formatBRL(totalGrossMarketplace)}
              </span>
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="border-b border-slate-200 flex gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('stores')}
            className={`pb-3 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'stores' ? 'text-orange-600 border-orange-500' : 'text-slate-500 border-transparent hover:text-slate-900'
            }`}
          >
            Moderação de Estabelecimentos ({stores.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'orders' ? 'text-orange-600 border-orange-500' : 'text-slate-500 border-transparent hover:text-slate-900'
            }`}
          >
            Supervisão de Pedidos ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'audit' ? 'text-orange-600 border-orange-500' : 'text-slate-500 border-transparent hover:text-slate-900'
            }`}
          >
            Trilha de Auditoria ({auditLogs.length})
          </button>
        </div>

        {/* TAB 1: MODERAÇÃO DE ESTABELECIMENTOS */}
        {activeTab === 'stores' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchStore}
                  onChange={(e) => setSearchStore(e.target.value)}
                  placeholder="Buscar loja por nome, cidade ou tipo..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  onClick={() => setStoreFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    storeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setStoreFilter('pending_review')}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    storeFilter === 'pending_review' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Em Análise ({pendingStoresCount})
                </button>
                <button
                  onClick={() => setStoreFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    storeFilter === 'approved' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Aprovadas
                </button>
                <button
                  onClick={() => setStoreFilter('suspended')}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    storeFilter === 'suspended' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
                  }`}
                >
                  Suspensas
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Estabelecimento</th>
                      <th className="py-3 px-4">Cidade / Bairro</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Cadastro</th>
                      <th className="py-3 px-4 text-right">Ações de Moderação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStores.map(store => {
                      const meta = getStoreStatusMeta(store.status);
                      return (
                        <tr key={store.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <span className="font-bold text-slate-900 block">{store.name}</span>
                              <span className="text-slate-400 text-[11px]">{store.businessType}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {store.city} - {store.state}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${meta.bgClass} ${meta.textClass}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {formatDateTime(store.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedStore(store)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                                title="Ver Detalhes Cadastrais"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {store.status === 'pending_review' && (
                                <>
                                  <button
                                    onClick={() => handleApproveStore(store)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Aprovar</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenRejectModal(store.id)}
                                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Reprovar</span>
                                  </button>
                                </>
                              )}

                              {store.status === 'approved' && (
                                <button
                                  onClick={() => handleSuspendStore(store)}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[11px] font-semibold"
                                >
                                  Suspender
                                </button>
                              )}

                              {store.status === 'suspended' && (
                                <button
                                  onClick={() => handleSuspendStore(store)}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[11px] font-semibold"
                                >
                                  Reativar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUPERVISÃO DE PEDIDOS */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Identificador</th>
                    <th className="py-3 px-4">Loja</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Valor Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Data/Hora</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map(order => {
                    const meta = getOrderStatusMeta(order.orderStatus);
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {order.storeSnapshot.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {order.customerSnapshot.name}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {formatBRL(order.total)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${meta.bgClass} ${meta.textClass}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {formatDateTime(order.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onSelectOrder(order.id)}
                            className="p-1 text-slate-500 hover:text-slate-900"
                            title="Inspecionar Pedido"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: TRILHA DE AUDITORIA */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
              Registro Imutável de Decisões e Moderações
            </div>
            <div className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Nenhuma ação registrada na trilha de auditoria até o momento.
                </div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono">{log.action}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">{log.entityType} ({log.entityId})</span>
                      </div>
                      <p className="text-slate-600 mt-1">{log.details}</p>
                    </div>
                    <div className="text-right text-[11px] text-slate-400 shrink-0">
                      <p>{log.actorEmail || log.actorUid}</p>
                      <p>{formatDateTime(log.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Store Inspection Modal */}
      {selectedStore && (
        <Modal
          isOpen={!!selectedStore}
          onClose={() => setSelectedStore(null)}
          title={`Inspeção: ${selectedStore.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
              <div>
                <span className="text-slate-500 block">Segmento:</span>
                <strong className="text-slate-900">{selectedStore.businessType}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Status Atual:</span>
                <strong className="text-slate-900">{getStoreStatusMeta(selectedStore.status).label}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Endereço Comercial:</span>
                <strong className="text-slate-900">{selectedStore.businessAddress}, {selectedStore.city}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Telefone:</span>
                <strong className="text-slate-900">{selectedStore.phone || 'Não informado'}</strong>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block mb-1">Descrição Pública:</span>
              <p className="text-slate-800 bg-white p-2.5 border border-slate-200 rounded-lg leading-relaxed">
                {selectedStore.description}
              </p>
            </div>

            {selectedStore.pixKey && (
              <div>
                <span className="text-slate-500 block mb-1">Chave Pix Cadastrada:</span>
                <span className="font-mono bg-slate-100 p-2 rounded block">{selectedStore.pixKey}</span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              {selectedStore.status === 'pending_review' && (
                <>
                  <button
                    onClick={() => handleOpenRejectModal(selectedStore.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                  >
                    Reprovar com Motivo
                  </button>
                  <button
                    onClick={() => handleApproveStore(selectedStore)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                  >
                    Aprovar Estabelecimento
                  </button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Rejection Modal with Motive */}
      <Modal
        isOpen={rejectionModalOpen}
        onClose={() => setRejectionModalOpen(false)}
        title="Reprovar Estabelecimento"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Informe o motivo da reprovação que será registrado no histórico e comunicado ao lojista:
          </p>
          <textarea
            required
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Ex: Endereço comercial inconsistente, fotos inadequadas..."
            className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRejectionModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              disabled={!rejectionReason.trim()}
              onClick={handleConfirmReject}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50"
            >
              Confirmar Reprovação
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
