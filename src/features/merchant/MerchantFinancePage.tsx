import React, { useState, useEffect } from 'react';
import { Store, Order, Product, Expense, ExpenseCategory } from '../../types';
import { getStoreOrders } from '../../services/orderService';
import { getProductsByStore } from '../../services/productService';
import { getStoreExpenses, createExpense, updateExpense, deleteExpense, EXPENSE_CATEGORIES_MAP } from '../../services/expenseService';
import { formatBRL, formatDateTime } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Calculator, 
  Plus, 
  Trash2, 
  Edit, 
  Download, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  AlertCircle,
  HelpCircle,
  PieChart
} from 'lucide-react';

interface MerchantFinancePageProps {
  storeId: string;
  storeName: string;
  onBackToDashboard: () => void;
}

type PeriodFilter = 'today' | '7days' | '30days' | 'month' | 'custom';

export const MerchantFinancePage: React.FC<MerchantFinancePageProps> = ({
  storeId,
  storeName,
  onBackToDashboard
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('30days');

  // Expense Modal State
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('ingredientes_mercadorias');
  const [expNotes, setExpNotes] = useState('');
  const [expStatus, setExpStatus] = useState<'confirmed' | 'pending'>('confirmed');
  const [savingExpense, setSavingExpense] = useState(false);

  // Simulation Calculator State
  const [simRevenue, setSimRevenue] = useState('15000');
  const [simDiscounts, setSimDiscounts] = useState('500');
  const [simFeesPercent, setSimFeesPercent] = useState('4');
  const [simCogsPercent, setSimCogsPercent] = useState('35');
  const [simExpenses, setSimExpenses] = useState('4000');

  // Active Tab in Finance module
  const [activeTab, setActiveTab] = useState<'indicators' | 'expenses' | 'products' | 'calculator'>('indicators');

  useEffect(() => {
    loadData();
  }, [storeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedOrders, fetchedProducts, fetchedExpenses] = await Promise.all([
        getStoreOrders(storeId),
        getProductsByStore(storeId),
        getStoreExpenses(storeId)
      ]);
      setOrders(fetchedOrders);
      setProducts(fetchedProducts);
      setExpenses(fetchedExpenses);
    } catch (e) {
      console.error('Error loading finance data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Date filtering logic considering America/Sao_Paulo timezone representation
  const filterOrdersByPeriod = (allOrders: Order[]) => {
    const now = new Date();
    const saoPauloOffset = -3 * 60; // UTC-3
    const localNow = new Date(now.getTime() + (now.getTimezoneOffset() + saoPauloOffset) * 60000);

    return allOrders.filter(o => {
      const orderDate = new Date(o.createdAt);
      if (isNaN(orderDate.getTime())) return false;

      if (period === 'today') {
        return orderDate.toDateString() === localNow.toDateString();
      } else if (period === '7days') {
        const diffDays = (localNow.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      } else if (period === '30days') {
        const diffDays = (localNow.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 30;
      } else if (period === 'month') {
        return orderDate.getMonth() === localNow.getMonth() && orderDate.getFullYear() === localNow.getFullYear();
      }
      return true; // custom or all
    });
  };

  const filterExpensesByPeriod = (allExpenses: Expense[]) => {
    const now = new Date();
    return allExpenses.filter(e => {
      const expDateObj = new Date(e.competenceDate);
      if (isNaN(expDateObj.getTime())) return true;

      if (period === 'today') {
        return expDateObj.toDateString() === now.toDateString();
      } else if (period === '7days') {
        const diffDays = (now.getTime() - expDateObj.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      } else if (period === '30days') {
        const diffDays = (now.getTime() - expDateObj.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 30;
      } else if (period === 'month') {
        return expDateObj.getMonth() === now.getMonth() && expDateObj.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const periodOrders = filterOrdersByPeriod(orders);
  const periodExpenses = filterExpensesByPeriod(expenses);

  // Eligible orders rule: exclude cancelled
  const eligibleOrders = periodOrders.filter(o => o.orderStatus !== 'cancelled');
  const cancelledOrders = periodOrders.filter(o => o.orderStatus === 'cancelled');

  const grossRevenue = eligibleOrders.reduce((sum, o) => sum + (o.subtotal || o.total), 0);
  const totalDiscounts = eligibleOrders.reduce((sum, o) => sum + (o.discount || 0), 0);
  const netSales = grossRevenue - totalDiscounts;
  const refundsTotal = cancelledOrders.reduce((sum, o) => sum + o.total, 0);
  const recordedExpenses = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Calculate COGS (Custo dos Produtos Vendidos) based on historical quantities and unitCost
  let estimatedCogs = 0;
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number; unitCost: number }> = {};

  products.forEach(p => {
    productSalesMap[p.id] = {
      name: p.name,
      qty: 0,
      revenue: 0,
      unitCost: p.unitCost || 0
    };
  });

  eligibleOrders.forEach(order => {
    order.itemsSnapshot.forEach(item => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          name: item.name,
          qty: 0,
          revenue: 0,
          unitCost: 0
        };
      }
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].revenue += item.itemTotal;
    });
  });

  Object.keys(productSalesMap).forEach(prodId => {
    const stats = productSalesMap[prodId];
    estimatedCogs += stats.qty * stats.unitCost;
  });

  const averageTicket = eligibleOrders.length > 0 ? netSales / eligibleOrders.length : 0;
  const estimatedOperationalResult = netSales - estimatedCogs - recordedExpenses;

  // Expense Form Actions
  const handleOpenCreateExpense = () => {
    setEditingExpense(null);
    setExpDesc('');
    setExpAmount('');
    setExpDate(new Date().toISOString().split('T')[0]);
    setExpCategory('ingredientes_mercadorias');
    setExpNotes('');
    setExpStatus('confirmed');
    setExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpDesc(exp.description);
    setExpAmount(exp.amount.toString());
    setExpDate(exp.competenceDate);
    setExpCategory(exp.category);
    setExpNotes(exp.notes || '');
    setExpStatus(exp.status || 'confirmed');
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc.trim() || !expAmount) return;
    setSavingExpense(true);

    try {
      const expensePayload: Expense = {
        id: editingExpense ? editingExpense.id : `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        storeId,
        description: expDesc.trim(),
        amount: parseFloat(expAmount) || 0,
        competenceDate: expDate,
        category: expCategory,
        notes: expNotes.trim() || undefined,
        status: expStatus,
        createdAt: editingExpense ? editingExpense.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingExpense) {
        await updateExpense(storeId, editingExpense.id, expensePayload);
      } else {
        await createExpense(expensePayload);
      }

      setExpenseModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Error saving expense:', err);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expId: string) => {
    if (confirm('Deseja realmente excluir este lançamento de despesa?')) {
      try {
        await deleteExpense(storeId, expId);
        await loadData();
      } catch (err) {
        console.error('Error deleting expense:', err);
      }
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Tipo,Descricao,Categoria,Valor (R$),Data,Status\n';

    periodExpenses.forEach(exp => {
      csvContent += `Despesa,"${exp.description}","${EXPENSE_CATEGORIES_MAP[exp.category] || exp.category}",${exp.amount},${exp.competenceDate},${exp.status}\n`;
    });

    eligibleOrders.forEach(ord => {
      csvContent += `Venda,"Pedido #${ord.orderNumber} - ${ord.customerSnapshot.name}","Receita de Pedido",${ord.total},${ord.createdAt.split('T')[0]},Concluido\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_financeiro_${storeName.toLowerCase().replace(/\s+/g, '_')}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simulation Calculator computation
  const simRevNum = parseFloat(simRevenue) || 0;
  const simDiscNum = parseFloat(simDiscounts) || 0;
  const simNetNum = simRevNum - simDiscNum;
  const simFeesNum = (simNetNum * (parseFloat(simFeesPercent) || 0)) / 100;
  const simCogsNum = (simNetNum * (parseFloat(simCogsPercent) || 0)) / 100;
  const simExpNum = parseFloat(simExpenses) || 0;
  const simResultNum = simNetNum - simFeesNum - simCogsNum - simExpNum;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Carregando módulo financeiro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700">
                  Módulo Financeiro Real
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600 font-medium">{storeName}</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">
                Demonstrativo de Resultado & Despesas
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Period Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-slate-500 ml-2 mr-1" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-2"
              >
                <option value="today">Hoje</option>
                <option value="7days">Últimos 7 dias</option>
                <option value="30days">Últimos 30 dias</option>
                <option value="month">Mês Atual</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleOpenCreateExpense}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Despesa</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6 font-semibold">
          <button
            onClick={() => setActiveTab('indicators')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'indicators' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Indicadores & DRE</span>
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'expenses' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Despesas ({periodExpenses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'products' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Margens por Produto</span>
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'calculator' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Calculadora de Cenários</span>
          </button>
        </div>

        {/* TAB 1: INDICATORS & DRE */}
        {activeTab === 'indicators' && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Gross Revenue */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-slate-500 font-medium">Faturamento Bruto</span>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">
                  {formatBRL(grossRevenue)}
                </div>
                <p className="text-[11px] text-slate-400">Total dos pedidos elegíveis antes dos descontos.</p>
              </div>

              {/* Sales After Discounts */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-slate-500 font-medium">Vendas Líquidas (Após Descontos)</span>
                <div className="text-2xl font-extrabold text-emerald-600 font-mono">
                  {formatBRL(netSales)}
                </div>
                <p className="text-[11px] text-slate-400">Faturamento bruto menos {formatBRL(totalDiscounts)} em descontos.</p>
              </div>

              {/* Recorded Expenses */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-slate-500 font-medium">Despesas Registradas</span>
                <div className="text-2xl font-extrabold text-rose-600 font-mono">
                  {formatBRL(recordedExpenses)}
                </div>
                <p className="text-[11px] text-slate-400">Soma das despesas lançadas no período.</p>
              </div>

              {/* Estimated Operational Result */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-slate-500 font-medium">Resultado Operacional Estimado</span>
                <div className={`text-2xl font-extrabold font-mono ${estimatedOperationalResult >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatBRL(estimatedOperationalResult)}
                </div>
                <p className="text-[11px] text-slate-400">Vendas líquidas - CPV ({formatBRL(estimatedCogs)}) - Despesas.</p>
              </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 font-medium">Ticket Médio</span>
                  <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">{formatBRL(averageTicket)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 font-medium">Custo Produtos (CPV Estimado)</span>
                  <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">{formatBRL(estimatedCogs)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <PieChart className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 font-medium">Cancelamentos / Reembolsos</span>
                  <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">{formatBRL(refundsTotal)} ({cancelledOrders.length} ped.)</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* DRE Summary Table */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900">Demonstrativo de Resultado do Período (DRE Simplificado)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-2.5 font-semibold text-slate-900">(+) Faturamento Bruto de Vendas</td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900">{formatBRL(grossRevenue)}</td>
                    </tr>
                    <tr className="border-b border-slate-100 text-slate-600">
                      <td className="py-2.5 pl-4">(-) Descontos Aplicados</td>
                      <td className="py-2.5 text-right font-mono text-rose-600">- {formatBRL(totalDiscounts)}</td>
                    </tr>
                    <tr className="border-b border-slate-200 font-bold bg-slate-50">
                      <td className="py-3 text-slate-900">(=) Vendas Líquidas</td>
                      <td className="py-3 text-right font-mono text-emerald-700">{formatBRL(netSales)}</td>
                    </tr>
                    <tr className="border-b border-slate-100 text-slate-600">
                      <td className="py-2.5 pl-4">(-) Custo dos Produtos Vendidos (CPV Estimado por unitCost)</td>
                      <td className="py-2.5 text-right font-mono text-rose-600">- {formatBRL(estimatedCogs)}</td>
                    </tr>
                    <tr className="border-b border-slate-100 text-slate-600">
                      <td className="py-2.5 pl-4">(-) Despesas Operacionais Registradas</td>
                      <td className="py-2.5 text-right font-mono text-rose-600">- {formatBRL(recordedExpenses)}</td>
                    </tr>
                    <tr className="border-b border-slate-200 font-extrabold bg-orange-50 text-orange-950 text-sm">
                      <td className="py-3">(=) Resultado Operacional Estimado</td>
                      <td className="py-3 text-right font-mono">{formatBRL(estimatedOperationalResult)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXPENSES */}
        {activeTab === 'expenses' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Gerenciamento de Despesas</h2>
                <p className="text-xs text-slate-500 mt-0.5">Lance e controle todas as despesas operacionais do estabelecimento.</p>
              </div>
              <button
                onClick={handleOpenCreateExpense}
                className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Despesa</span>
              </button>
            </div>

            {periodExpenses.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                Nenhuma despesa registrada para o período selecionado. Clique em "Nova Despesa" para começar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="py-3 font-semibold">Data</th>
                      <th className="py-3 font-semibold">Descrição</th>
                      <th className="py-3 font-semibold">Categoria</th>
                      <th className="py-3 font-semibold">Valor</th>
                      <th className="py-3 font-semibold">Situação</th>
                      <th className="py-3 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {periodExpenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50">
                        <td className="py-3 font-mono text-slate-500">{exp.competenceDate}</td>
                        <td className="py-3 font-bold text-slate-900">
                          {exp.description}
                          {exp.notes && <p className="text-[11px] text-slate-400 font-normal">{exp.notes}</p>}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[11px] font-medium">
                            {EXPENSE_CATEGORIES_MAP[exp.category] || exp.category}
                          </span>
                        </td>
                        <td className="py-3 font-mono font-bold text-rose-600">{formatBRL(exp.amount)}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            exp.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {exp.status === 'confirmed' ? 'Confirmada' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditExpense(exp)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 rounded cursor-pointer inline-flex"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded cursor-pointer inline-flex"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PRODUCTS & MARGINS */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Análise de Vendas e Custos Unitários por Produto</h2>
              <p className="text-xs text-slate-500 mt-0.5">Visualize a quantidade vendida, receita e margem estimada com base no custo unitário (`unitCost`) informado no cardápio.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="py-3 font-semibold">Produto</th>
                    <th className="py-3 font-semibold text-center">Qtd Vendida</th>
                    <th className="py-3 font-semibold text-right">Preço Base</th>
                    <th className="py-3 font-semibold text-right">Custo Unit. (UnitCost)</th>
                    <th className="py-3 font-semibold text-right">Receita Total</th>
                    <th className="py-3 font-semibold text-right">Margem Est.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {products.map(p => {
                    const stats = productSalesMap[p.id] || { qty: 0, revenue: 0 };
                    const unitCost = p.unitCost || 0;
                    const totalCost = stats.qty * unitCost;
                    const margin = stats.revenue - totalCost;
                    const marginPercent = stats.revenue > 0 ? (margin / stats.revenue) * 100 : 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 font-bold text-slate-900">
                          {p.name}
                          <p className="text-[11px] text-slate-400 font-normal">{p.categoryName || 'Geral'}</p>
                        </td>
                        <td className="py-3 text-center font-mono font-bold text-slate-800">{stats.qty}</td>
                        <td className="py-3 text-right font-mono">{formatBRL(p.basePrice)}</td>
                        <td className="py-3 text-right font-mono text-slate-600">
                          {unitCost > 0 ? formatBRL(unitCost) : <span className="text-amber-600 text-[10px]">Não informado</span>}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900">{formatBRL(stats.revenue)}</td>
                        <td className="py-3 text-right font-mono font-bold text-emerald-600">
                          {unitCost > 0 ? `${formatBRL(margin)} (${marginPercent.toFixed(1)}%)` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SIMULATION CALCULATOR */}
        {activeTab === 'calculator' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Calculadora de Simulação Financeira</h2>
              <p className="text-xs text-slate-500 mt-0.5">Simule cenários hipotéticos de faturamento, custos e despesas. Os valores simulados não afetam os dados reais.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900">Parâmetros do Cenário</h3>
                
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Faturamento Bruto Estimado (R$)</label>
                  <input
                    type="number"
                    value={simRevenue}
                    onChange={(e) => setSimRevenue(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Descontos Estimados (R$)</label>
                  <input
                    type="number"
                    value={simDiscounts}
                    onChange={(e) => setSimDiscounts(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Taxas Comerciais / Pagamento (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={simFeesPercent}
                    onChange={(e) => setSimFeesPercent(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Custo Médio dos Produtos (CPV %)</label>
                  <input
                    type="number"
                    step="1"
                    value={simCogsPercent}
                    onChange={(e) => setSimCogsPercent(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Despesas Operacionais Mensais (R$)</label>
                  <input
                    type="number"
                    value={simExpenses}
                    onChange={(e) => setSimExpenses(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="p-6 bg-orange-50 rounded-xl border border-orange-200 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-orange-800 font-bold uppercase tracking-wider text-[10px]">Resultado da Simulação</span>
                  <h4 className="text-lg font-extrabold text-orange-950 mt-1">Demonstrativo Projetado</h4>
                </div>

                <div className="space-y-3 font-mono">
                  <div className="flex justify-between border-b border-orange-200 pb-2">
                    <span className="text-slate-700 font-sans">Vendas Líquidas:</span>
                    <span className="font-bold text-slate-900">{formatBRL(simNetNum)}</span>
                  </div>
                  <div className="flex justify-between border-b border-orange-200 pb-2">
                    <span className="text-slate-700 font-sans">(-) Taxas Comerciais:</span>
                    <span className="text-rose-700">- {formatBRL(simFeesNum)}</span>
                  </div>
                  <div className="flex justify-between border-b border-orange-200 pb-2">
                    <span className="text-slate-700 font-sans">(-) CPV Projetado:</span>
                    <span className="text-rose-700">- {formatBRL(simCogsNum)}</span>
                  </div>
                  <div className="flex justify-between border-b border-orange-200 pb-2">
                    <span className="text-slate-700 font-sans">(-) Despesas:</span>
                    <span className="text-rose-700">- {formatBRL(simExpNum)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-sm font-bold">
                    <span className="font-sans text-orange-950">(=) Lucro Operacional Estimado:</span>
                    <span className={simResultNum >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {formatBRL(simResultNum)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-orange-900 italic">
                  * Esta calculadora é uma ferramenta de simulação para projeção de cenários e não grava registros permanentes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expense Modal (Create/Edit) */}
        <Modal
          isOpen={expenseModalOpen}
          onClose={() => setExpenseModalOpen(false)}
          title={editingExpense ? 'Editar Despesa' : 'Nova Despesa Operacional'}
          maxWidth="md"
        >
          <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Descrição da Despesa *</label>
              <input
                type="text"
                required
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                placeholder="Ex: Compra de Queijo Mussarela 10kg"
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Data de Competência *</label>
                <input
                  type="date"
                  required
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Categoria *</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none cursor-pointer"
                >
                  {Object.entries(EXPENSE_CATEGORIES_MAP).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Situação *</label>
                <select
                  value={expStatus}
                  onChange={(e) => setExpStatus(e.target.value as 'confirmed' | 'pending')}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none cursor-pointer"
                >
                  <option value="confirmed">Confirmada / Paga</option>
                  <option value="pending">Pendente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Observações (Opcional)</label>
              <textarea
                rows={2}
                value={expNotes}
                onChange={(e) => setExpNotes(e.target.value)}
                placeholder="Fornecedor, número da nota fiscal ou detalhes..."
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingExpense}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs shadow-sm"
              >
                {savingExpense ? 'Salvando...' : 'Salvar Despesa'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};
