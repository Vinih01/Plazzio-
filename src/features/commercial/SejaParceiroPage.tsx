import React, { useState } from 'react';
import { PLAZZIO_PLANS, PlazzioPlan } from '../../constants/plans';
import { formatBRL } from '../../lib/utils';
import { 
  Store as StoreIcon, 
  ShoppingBag, 
  TrendingUp, 
  Receipt, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Calculator, 
  HelpCircle, 
  Building2, 
  DollarSign, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  ExternalLink,
  Users,
  Lock
} from 'lucide-react';

interface SejaParceiroPageProps {
  onNavigate: (route: string) => void;
  onSelectPlanAndRegister: (planId: string) => void;
}

export const SejaParceiroPage: React.FC<SejaParceiroPageProps> = ({ onNavigate, onSelectPlanAndRegister }) => {
  // Calculator State
  const [calcRevenue, setCalcRevenue] = useState('30000');
  const [calcCurrentChannelShare, setCalcCurrentChannelShare] = useState('80');
  const [calcCurrentCommission, setCalcCurrentCommission] = useState('22');
  const [calcCurrentPaymentFee, setCalcCurrentPaymentFee] = useState('3.5');
  const [calcCurrentMonthlySub, setCalcCurrentMonthlySub] = useState('150');
  const [calcPlazzioShare, setCalcPlazzioShare] = useState('50');
  const [selectedPlanId, setSelectedPlanId] = useState('anual-499');

  // FAQ Expanded State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Calculator Math
  const revNum = parseFloat(calcRevenue) || 0;
  const currentShareNum = (parseFloat(calcCurrentChannelShare) || 0) / 100;
  const commRateNum = (parseFloat(calcCurrentCommission) || 0) / 100;
  const payFeeNum = (parseFloat(calcCurrentPaymentFee) || 0) / 100;
  const currSubNum = parseFloat(calcCurrentMonthlySub) || 0;

  const plazzioShareNum = (parseFloat(calcPlazzioShare) || 0) / 100;
  const chosenPlan = PLAZZIO_PLANS.find(p => p.id === selectedPlanId) || PLAZZIO_PLANS[0];
  const plazzioSubNum = chosenPlan.price;

  // Current channel sales subject to commission
  const currentSalesVolume = revNum * currentShareNum;
  const currentCommissionCost = currentSalesVolume * commRateNum;
  const currentPaymentCost = revNum * payFeeNum;
  const currentTotalCost = currentCommissionCost + currentPaymentCost + currSubNum;

  // Plazzio scenario
  const plazzioSalesVolume = revNum * plazzioShareNum;
  const remainingSalesVolume = revNum - plazzioSalesVolume;
  // If remaining sales still go through current channel
  const remainingCommissionCost = remainingSalesVolume * commRateNum;
  const plazzioPaymentCost = revNum * payFeeNum;
  const plazzioTotalCost = remainingCommissionCost + plazzioPaymentCost + plazzioSubNum;

  const monthlyDifference = currentTotalCost - plazzioTotalCost;
  const annualDifference = monthlyDifference * 12;

  const faqs = [
    {
      q: 'Como cadastrar meu estabelecimento?',
      a: 'Clique em "Conhecer os planos" ou "Simular meus custos", escolha o plano desejado e clique em iniciar cadastro. Você será guiado por um assistente de 6 etapas para informar os dados do negócio, endereço, horários de funcionamento e cadastrar os primeiros produtos.'
    },
    {
      q: 'Preciso ter CNPJ para começar?',
      a: 'Não é obrigatório possuir CNPJ na etapa inicial de cadastro e testes. No entanto, recomendamos a regularização fiscal para emissão de notas e recebimentos comerciais robustos.'
    },
    {
      q: 'Como funciona a aprovação da loja?',
      a: 'Após preencher o onboarding, sua loja entra no status "Em Análise" (pending_review). Nossa equipe administrativa revisa os dados cadastrais para garantir a segurança da plataforma antes da publicação pública.'
    },
    {
      q: 'Posso editar meus produtos e cardápio?',
      a: 'Sim. Através do Painel do Comerciante, você tem acesso ao editor de cardápio completo, permitindo alterar preços, adicionar variantes (como tamanhos e sabores), complementos e pausar itens indisponíveis instantaneamente.'
    },
    {
      q: 'Como recebo os pedidos?',
      a: 'Você receberá os pedidos em tempo real no Kanban de Pedidos do seu painel administrativo, com notificações visuais e sonoras. O sistema também permite acompanhar o despacho e o histórico de cada transação.'
    },
    {
      q: 'Como funcionam as modalidades de pagamento?',
      a: 'O Plazzio suporta pagamentos diretos combinados com o estabelecimento (Dinheiro na entrega, Cartão na maquininha na entrega ou Pix Direto para a chave do lojista).'
    },
    {
      q: 'O Plazzio cobra comissão sobre as vendas?',
      a: 'Os planos do Plazzio funcionam com mensalidade fixa de software, sem comissão por venda cobrada pela plataforma sobre o seu canal direto, permitindo maior margem para o seu negócio.'
    },
    {
      q: 'Posso mudar de plano ou cancelar a qualquer momento?',
      a: 'Sim, você pode atualizar seu plano ou solicitar o cancelamento diretamente através das configurações do seu estabelecimento, sem multas ou fidelidade abusiva.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* HERO SECTION */}
      <section className="bg-slate-900 text-white py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Plataforma de Gestão e Marketplace para Negócios Locais</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto">
            Sua loja merece vender melhor. E você merece entender os números do seu negócio.
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Tenha uma página digital para seu estabelecimento, organize seus pedidos e acompanhe suas vendas e despesas em uma plataforma criada para negócios locais.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                const el = document.getElementById('planos-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-7 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Conhecer os planos</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('calculadora-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-7 py-3.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4 text-orange-400" />
              <span>Simular meus custos</span>
            </button>
          </div>

          <div className="pt-6 text-xs text-slate-400">
            Já tem uma conta?{' '}
            <button
              onClick={() => onNavigate('/painel')}
              className="text-orange-400 font-semibold hover:underline cursor-pointer ml-1"
            >
              Acesse sua loja
            </button>
          </div>
        </div>
      </section>

      {/* OPERATIONAL BENEFITS SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Tudo o que sua operação precisa em um só lugar
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Ferramentas profissionais desenvolvidas para dar autonomia e clareza financeira ao comerciante.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-orange-500 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <StoreIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Loja Digital Própria</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tenha um endereço exclusivo (`/loja/sua-loja`) com catálogo organizado, fotos, categorias, horários de atendimento e link direto para compartilhar com seus clientes.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-orange-500 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Pedidos Organizados (Kanban)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Acompanhe cada pedido desde a confirmação até a entrega em um painel operacional em tempo real, eliminando erros de atendimento e atrasos na cozinha.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-orange-500 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Módulo Financeiro & DRE</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Registre despesas operacionais, calcule custos dos produtos vendidos (CPV) com base em custos unitários e visualize o resultado operacional real do seu negócio.
            </p>
          </div>
        </div>
      </section>

      {/* SALES CHANNELS COMPARISON */}
      <section className="py-16 bg-white border-y border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Por que escolher uma plataforma de gestão própria?
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto">
              Entenda como a estrutura de custos impacta diretamente a margem de lucro do seu estabelecimento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span>Marketplaces Tradicionais de Terceiros</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Comissões elevadas por venda (muitas vezes entre 15% e 30%).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Concorrência direta com outros estabelecimentos na mesma tela.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Restrições no acesso direto aos dados e relacionamento com seus clientes.</span>
                </li>
              </ul>
            </div>

            <div className="p-6 bg-orange-50/50 rounded-2xl border border-orange-200 space-y-4">
              <div className="flex items-center gap-2 text-orange-600 font-bold text-sm">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                <span>Ecossistema Plazzio</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-800">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold">✓</span>
                  <span>Mensalidade fixa sem comissão por venda sobre seus canais próprios.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold">✓</span>
                  <span>Página de vendas com a sua marca e identidade visual.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold">✓</span>
                  <span>Controle financeiro, de estoque e operacional unificado.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE FINANCIAL CALCULATOR */}
      <section id="calculadora-section" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-bold">
            <Calculator className="w-3.5 h-3.5" />
            <span>Comparador Financeiro Interativo</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Simule a economia e a margem do seu negócio
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Insira os dados da sua operação atual e compare os custos projetados com o modelo Plazzio.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Inputs Column */}
          <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-5 text-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Parâmetros da Operação Atual
            </h3>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Faturamento Mensal Total (R$)</label>
              <input
                type="number"
                value={calcRevenue}
                onChange={(e) => setCalcRevenue(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">% de Vendas no Canal Atual</label>
                <input
                  type="number"
                  value={calcCurrentChannelShare}
                  onChange={(e) => setCalcCurrentChannelShare(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Comissão do Canal Atual (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={calcCurrentCommission}
                  onChange={(e) => setCalcCurrentCommission(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Taxa de Pagamento / Gateway (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={calcCurrentPaymentFee}
                  onChange={(e) => setCalcCurrentPaymentFee(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Assinatura / Custos Atuais (R$)</label>
                <input
                  type="number"
                  value={calcCurrentMonthlySub}
                  onChange={(e) => setCalcCurrentMonthlySub(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Premissas com o Plazzio</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">% de Vendas Movidas para o Plazzio</label>
                  <input
                    type="number"
                    value={calcPlazzioShare}
                    onChange={(e) => setCalcPlazzioShare(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Plano Plazzio Escolhido</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white font-semibold cursor-pointer"
                  >
                    {PLAZZIO_PLANS.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.displayPrice})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-6 bg-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
            <div>
              <span className="text-orange-400 font-bold uppercase tracking-wider text-[10px]">Resultado da Simulação</span>
              <h3 className="text-xl font-extrabold mt-1">Comparativo de Custos Mensais</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[11px] block">Custos Mensais Atuais</span>
                <span className="text-xl font-extrabold text-rose-400 font-mono mt-1 block">
                  {formatBRL(currentTotalCost)}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">Comissões + Gateway + Mensalidade</span>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[11px] block">Custos Mensais com Plazzio</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono mt-1 block">
                  {formatBRL(plazzioTotalCost)}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">Plano {chosenPlan.name} + Taxas</span>
              </div>
            </div>

            <div className="p-5 bg-orange-600/20 border border-orange-500/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-orange-200">Diferença Mensal Estimada:</span>
                <span className="text-lg font-mono font-extrabold text-orange-400">
                  {formatBRL(monthlyDifference)} / mês
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-orange-500/20">
                <span className="text-xs font-semibold text-orange-200">Economia Projetada (Anual):</span>
                <span className="text-xl font-mono font-extrabold text-emerald-400">
                  {formatBRL(annualDifference)} / ano
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic leading-relaxed">
              * Nota: Os valores apresentados são simulações baseadas estritamente nas premissas informadas e nos termos do plano selecionado. Não constituem promessa de faturamento garantido.
            </p>
          </div>
        </div>
      </section>

      {/* PLAZZIO PLANS SECTION */}
      <section id="planos-section" className="py-20 bg-white border-t border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900">
              Planos pensados para o seu negócio
            </h2>
            <p className="text-slate-600 text-sm">
              Escolha a melhor modalidade para começar ou escalar seu estabelecimento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Plano Anual Card */}
            <div className="bg-white rounded-3xl border border-blue-100 p-8 shadow-lg flex flex-col">
              <div className="text-center space-y-2 mb-8">
                <h3 className="text-xl font-bold text-slate-900">Plano Anual</h3>
                <p className="text-sm text-slate-500">Cadastro e plano anual incluso.</p>
                <div className="text-4xl font-extrabold text-blue-600 font-mono py-4">R$ 499,90</div>
                <button
                  onClick={() => onSelectPlanAndRegister('anual-499')}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  Contratar agora
                </button>
              </div>

              <div className="border-t border-slate-100 pt-8 flex-1">
                <h4 className="font-bold text-slate-900 mb-6 text-center">Tudo incluso no seu plano</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Página digital da loja</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Gestão de catálogo</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Painel de pedidos Kanban</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Horários e configurações</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Módulo financeiro (DRE)</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Relatórios de vendas</div>
                </div>
              </div>
            </div>

            {/* Plano Mensal Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-lg flex flex-col">
              <div className="text-center space-y-2 mb-8">
                <h3 className="text-xl font-bold text-slate-900">Plano mensal</h3>
                <p className="text-sm text-slate-500">O valor acompanha o crescimento do seu negócio.</p>
                
                <div className="py-4 space-y-3">
                  <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg text-xs">
                    <span className="font-bold">Até 150 pedidos/mês</span>
                    <span className="font-bold text-blue-600">R$ 69,90 /mês</span>
                  </div>
                  <div className="flex items-center justify-between p-3 text-xs">
                    <span className="font-semibold">151 a 250 pedidos/mês</span>
                    <span className="font-semibold text-slate-700">R$ 199,90 /mês</span>
                  </div>
                  <div className="flex items-center justify-between p-3 text-xs">
                    <span className="font-semibold">Pedidos ilimitados</span>
                    <span className="font-semibold text-slate-700">R$ 219,90 /mês</span>
                  </div>
                </div>
                
                <button
                  onClick={() => onSelectPlanAndRegister('mensal-150')}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer mt-4"
                >
                  Contratar agora
                </button>
                <p className="text-[10px] text-slate-400 mt-3">+ Taxas de pagamento online</p>
                <p className="text-[10px] text-slate-400">Sem fidelidade • Cancele quando quiser</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMMERCIAL FAQ SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Perguntas Frequentes (FAQ Comercial)
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Tire suas dúvidas sobre o funcionamento do Plazzio e o processo de onboarding.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div 
                key={idx}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* TRUST & TRANSPARENCY NOTICE */}
      <section className="py-12 bg-slate-100 border-t border-slate-200 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 space-y-2">
        <p>
          O cadastro do estabelecimento está sujeito à revisão e aprovação pela moderação do Plazzio.
        </p>
        <p className="font-medium text-slate-700">
          Plazzio — Marketplace e Plataforma de Gestão para Negócios Locais.
        </p>
      </section>
    </div>
  );
};
