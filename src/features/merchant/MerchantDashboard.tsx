import React, { useState, useEffect } from 'react';
import { Store, Order, Review } from '../../types';
import { getMerchantStores, updateStore, updateStoreStatus } from '../../services/storeService';
import { getStoreOrders, subscribeToStoreOrders } from '../../services/orderService';
import { getReviewsByStore, deleteReview } from '../../services/reviewService';
import { useAuth } from '../../context/AuthContext';
import { formatBRL, formatDateTime, getOrderStatusMeta, getStoreStatusMeta } from '../../lib/utils';
import { 
  ShoppingBag, 
  TrendingUp, 
  Clock, 
  Store as StoreIcon, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  PauseCircle, 
  PlayCircle, 
  UtensilsCrossed, 
  BarChart3, 
  Settings,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  DollarSign,
  Star,
  Trash2
} from 'lucide-react';

interface MerchantDashboardProps {
  activeStore?: Store;
  onSelectStore?: (store: Store) => void;
  onNavigateTab: (tab: 'kanban' | 'menu' | 'settings' | 'reports' | 'financeiro') => void;
  onSelectOrder: (orderId: string) => void;
  onPreviewStore?: (slug: string) => void;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  activeStore: initialActiveStore,
  onSelectStore,
  onNavigateTab,
  onSelectOrder,
  onPreviewStore
}) => {
  const { currentUser } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStore] = useState<Store | null>(initialActiveStore || null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingStore, setTogglingStore] = useState(false);
  const [approvingSandbox, setApprovingSandbox] = useState(false);
  const [approvalFeedback, setApprovalFeedback] = useState('');

  const loadReviews = async (storeId: string) => {
    try {
      const revs = await getReviewsByStore(storeId);
      setReviews(revs);
    } catch (err) {
      console.warn('Error loading merchant store reviews:', err);
    }
  };

  useEffect(() => {
    const ownerUid = currentUser?.uid;
    if (ownerUid) {
      getMerchantStores(ownerUid).then(async (merchantStores) => {
        setStores(merchantStores);
        if (merchantStores.length > 0) {
          // If no active store or active store is demo and user has real store, switch
          const selected = (initialActiveStore && initialActiveStore.ownerUid === ownerUid)
            ? initialActiveStore
            : merchantStores[0];
          setActiveStore(selected);
          if (onSelectStore) onSelectStore(selected);
        } else if (initialActiveStore) {
          setActiveStore(initialActiveStore);
        }
        setLoading(false);
      });
    } else {
      if (initialActiveStore) {
        setActiveStore(initialActiveStore);
      }
      setLoading(false);
    }
  }, [currentUser, initialActiveStore?.id]);

  // Subscribe to real-time orders for the active store and load reviews
  useEffect(() => {
    if (!activeStore) return;

    // Load initial orders and reviews
    getStoreOrders(activeStore.id).then(setOrders);
    loadReviews(activeStore.id);

    // Subscribe to live snapshot
    try {
      const unsubscribe = subscribeToStoreOrders(activeStore.id, (liveOrders) => {
        setOrders(liveOrders);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Real-time order subscription fallback:', e);
    }
  }, [activeStore?.id]);

  const handleSelectStore = async (store: Store) => {
    setActiveStore(store);
    if (onSelectStore) onSelectStore(store);
    const storeOrders = await getStoreOrders(store.id);
    setOrders(storeOrders);
    loadReviews(store.id);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!activeStore) return;
    setDeletingReviewId(reviewId);
    try {
      await deleteReview(reviewId, activeStore.id);
      await loadReviews(activeStore.id);
    } catch (e) {
      console.error('Error deleting review:', e);
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleToggleStoreStatus = async () => {
    if (!activeStore) return;
    setTogglingStore(true);
    try {
      const nextPublished = !activeStore.published;
      await updateStore(activeStore.id, { published: nextPublished });
      const updated = { ...activeStore, published: nextPublished };
      setActiveStore(updated);
      if (onSelectStore) onSelectStore(updated);
    } catch (e) {
      console.warn('Error toggling store:', e);
    } finally {
      setTogglingStore(false);
    }
  };

  const handleSandboxApprove = async () => {
    if (!activeStore) return;
    setApprovingSandbox(true);
    setApprovalFeedback('');
    try {
      await updateStoreStatus(activeStore.id, 'approved');
      const updated = { ...activeStore, status: 'approved' as const, published: true };
      setActiveStore(updated);
      if (onSelectStore) onSelectStore(updated);
      setApprovalFeedback('Estabelecimento aprovado com sucesso! Agora sua loja está pública e ativa no marketplace.');
      setTimeout(() => setApprovalFeedback(''), 5000);
    } catch (e) {
      console.error('Error approving store in sandbox:', e);
    } finally {
      setApprovingSandbox(false);
    }
  };

  // KPIs
  const totalOrdersCount = orders.length;
  const activeOrdersCount = orders.filter(o => 
    !['delivered', 'completed', 'cancelled'].includes(o.orderStatus)
  ).length;

  const validOrders = orders.filter(o => o.orderStatus !== 'cancelled');
  const grossSales = validOrders.reduce((sum, o) => sum + o.total, 0);
  const averageTicket = validOrders.length > 0 ? grossSales / validOrders.length : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Carregando painel do lojista...</p>
        </div>
      </div>
    );
  }

  if (!activeStore) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4">
          <StoreIcon className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Nenhum estabelecimento vinculado</h2>
          <p className="text-xs text-slate-500">
            Você ainda não tem uma loja cadastrada. Use o assistente para criar e submeter sua loja.
          </p>
          <a
            href="#/parceiro/cadastro"
            className="inline-block px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-semibold"
          >
            Cadastrar Minha Loja
          </a>
        </div>
      </div>
    );
  }

  const statusMeta = getStoreStatusMeta(activeStore.status);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Pending Review Banner with 1-click Approval for Evaluators */}
        {activeStore.status === 'pending_review' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">Estabelecimento Aguardando Moderação</p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  Sua loja foi cadastrada e está aguardando revisão pelo administrador da plataforma para exibição pública.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onPreviewStore && (
                <button
                  type="button"
                  onClick={() => onPreviewStore(activeStore.slug)}
                  className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Pré-visualizar Loja</span>
                </button>
              )}

              {currentUser?.email?.toLowerCase() === 'mapwiser@gmail.com' && (
                <button
                  type="button"
                  disabled={approvingSandbox}
                  onClick={handleSandboxApprove}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:bg-slate-400"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{approvingSandbox ? 'Aprovando...' : 'Aprovar Imediatamente (Admin)'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {approvalFeedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-900 font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{approvalFeedback}</span>
          </div>
        )}

        {/* Header with store picker, live status and fast pause toggle */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${statusMeta.bgClass} ${statusMeta.textClass}`}>
                {statusMeta.label}
              </span>
              {activeStore.published ? (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Recebendo Pedidos
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  Loja Pausada
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              {activeStore.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeStore.businessType} · {activeStore.businessAddress}, {activeStore.city}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {stores.length > 1 && (
              <select
                value={activeStore.id}
                onChange={(e) => {
                  const s = stores.find(st => st.id === e.target.value);
                  if (s) handleSelectStore(s);
                }}
                className="text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:outline-none cursor-pointer"
              >
                {stores.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            )}

            {onPreviewStore && (
              <button
                onClick={() => onPreviewStore(activeStore.slug)}
                className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Abrir página pública do estabelecimento"
              >
                <ExternalLink className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Página Pública</span>
              </button>
            )}

            <button
              onClick={handleToggleStoreStatus}
              disabled={togglingStore}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeStore.published
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {activeStore.published ? (
                <>
                  <PauseCircle className="w-4 h-4" />
                  <span>Pausar Loja</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  <span>Reabrir Loja</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Nav Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => onNavigateTab('kanban')}
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-orange-500 hover:shadow-sm text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <ShoppingBag className="w-5 h-5 text-orange-600" />
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Kanban de Pedidos</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Operação de cozinha e despacho</p>
          </button>

          <button
            onClick={() => onNavigateTab('menu')}
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-orange-500 hover:shadow-sm text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <UtensilsCrossed className="w-5 h-5 text-indigo-600" />
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Cardápio & Produtos</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Preços, itens e adicionais</p>
          </button>

          <button
            onClick={() => onNavigateTab('reports')}
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-orange-500 hover:shadow-sm text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Relatórios & Vendas</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Faturamento e ticket médio</p>
          </button>

          <button
            onClick={() => onNavigateTab('settings')}
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-orange-500 hover:shadow-sm text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <Settings className="w-5 h-5 text-slate-700" />
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Configurações</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Horários, taxas e Pix</p>
          </button>

          <button
            onClick={() => onNavigateTab('financeiro')}
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-orange-500 hover:shadow-sm text-left transition-all cursor-pointer group sm:col-span-1 col-span-2"
          >
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Módulo Financeiro</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">DRE, despesas e margens</p>
          </button>
        </div>

        {/* Real KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Pedidos em Andamento</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-orange-600 font-mono">
                {activeOrdersCount}
              </span>
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Total de Pedidos Realizados</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 font-mono">
                {totalOrdersCount}
              </span>
              <ShoppingBag className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Vendas Brutas (Período)</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-emerald-600 font-mono">
                {formatBRL(grossSales)}
              </span>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Ticket Médio</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 font-mono">
                {formatBRL(averageTicket)}
              </span>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Recent Orders Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pedidos Recentes</h2>
              <p className="text-xs text-slate-500 mt-0.5">Últimos pedidos recebidos neste estabelecimento.</p>
            </div>
            <button
              onClick={() => onNavigateTab('kanban')}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver no Kanban</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
              Nenhum pedido recebido ainda. Quando clientes finalizarem pedidos, eles aparecerão aqui instantaneamente via Cloud Firestore.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders.slice(0, 5).map(order => {
                const meta = getOrderStatusMeta(order.orderStatus);
                return (
                  <div
                    key={order.id}
                    onClick={() => onSelectOrder(order.id)}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{order.orderNumber}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-600 font-medium">{order.customerSnapshot.name}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] text-slate-400">{formatDateTime(order.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {order.itemsSnapshot.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${meta.bgClass} ${meta.textClass}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {formatBRL(order.total)}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer Reviews Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Avaliações dos Clientes</h2>
                {reviews.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{((reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length) || 0).toFixed(1)}</span>
                    <span className="text-amber-700/80 font-normal">({reviews.length})</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Feedback e notas enviadas pelos clientes na página pública do seu estabelecimento.
              </p>
            </div>

            {onPreviewStore && (
              <button
                type="button"
                onClick={() => onPreviewStore(activeStore.slug)}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Ver página pública</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
              Nenhuma avaliação recebida ainda. Quando os clientes avaliarem sua loja, os comentários e notas aparecerão aqui em tempo real.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reviews.map(review => (
                <div key={review.id} className="py-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{review.customerName || 'Cliente'}</span>
                      <span className="text-slate-300">·</span>
                      <div className="flex text-amber-400">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star 
                            key={s} 
                            className={`w-3 h-3 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-slate-300">·</span>
                      <span className="text-[11px] text-slate-400">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('pt-BR') : 'Data recente'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed max-w-2xl">
                      "{review.comment}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={deletingReviewId === review.id}
                      onClick={() => handleDeleteReview(review.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir avaliação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
