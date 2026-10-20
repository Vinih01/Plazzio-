import React, { useState, useEffect, useMemo } from 'react';
import { Order } from '../../types';
import { getStoreOrders } from '../../services/orderService';
import { formatBRL, formatDateTime } from '../../lib/utils';
import { BarChart3, TrendingUp, ShoppingBag, ArrowLeft, Calendar } from 'lucide-react';

interface MerchantReportsPageProps {
  storeId: string;
  storeName: string;
  onBackToDashboard: () => void;
}

export const MerchantReportsPage: React.FC<MerchantReportsPageProps> = ({
  storeId,
  storeName,
  onBackToDashboard
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | '7days' | '30days' | 'all'>('all');

  useEffect(() => {
    getStoreOrders(storeId).then(data => {
      setOrders(data);
      setLoading(false);
    });
  }, [storeId]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(o => {
      if (o.orderStatus === 'cancelled') return false;
      const orderDate = new Date(o.createdAt);
      if (period === 'today') {
        return orderDate.toDateString() === now.toDateString();
      }
      if (period === '7days') {
        const diff = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diff <= 7;
      }
      if (period === '30days') {
        const diff = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diff <= 30;
      }
      return true;
    });
  }, [orders, period]);

  const grossSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const averageTicket = filteredOrders.length > 0 ? grossSales / filteredOrders.length : 0;

  // Top selling products computation
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    filteredOrders.forEach(o => {
      o.itemsSnapshot.forEach(item => {
        const existing = map.get(item.productId) || { name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.itemTotal;
        map.set(item.productId, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [filteredOrders]);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={onBackToDashboard}
              className="text-xs text-slate-500 hover:text-slate-800 mb-1"
            >
              ← Voltar ao painel
            </button>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Relatório de Desempenho & Vendas
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Métricas calculadas a partir dos pedidos reais de <strong>{storeName}</strong>.
            </p>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-2xs">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                period === 'today' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                period === '7days' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setPeriod('30days')}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                period === '30days' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                period === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Faturamento Bruto</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-emerald-600 font-mono">
                {formatBRL(grossSales)}
              </span>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Valor acumulado dos pedidos elegíveis</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Volume de Pedidos Concluídos</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 font-mono">
                {filteredOrders.length}
              </span>
              <ShoppingBag className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Excluindo cancelamentos</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Ticket Médio por Pedido</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-orange-600 font-mono">
                {formatBRL(averageTicket)}
              </span>
              <BarChart3 className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Faturamento dividido pelos pedidos</p>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Itens Mais Vendidos no Período
          </h2>

          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Nenhuma venda registrada no período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Item</th>
                    <th className="py-2.5 px-4 text-center">Quantidade Vendida</th>
                    <th className="py-2.5 px-4 text-right">Receita Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {p.quantity} un.
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatBRL(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
