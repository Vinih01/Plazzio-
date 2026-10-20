export interface PlazzioPlan {
  id: string;
  name: string;
  price: number; // monthly in BRL
  displayPrice: string;
  description: string;
  features: string[];
  variableFee?: string;
  recommended?: boolean;
}

export const PLAZZIO_PLANS: PlazzioPlan[] = [
  {
    id: 'anual-499',
    name: 'Plano Anual Plazzio',
    price: 41.65,
    displayPrice: 'R$ 499,90 / ano',
    description: 'Acesso completo à plataforma, cadastro e plano anual incluso.',
    features: [
      'Página digital do estabelecimento',
      'Gestão completa de catálogo e produtos',
      'Painel de pedidos (Kanban) em tempo real',
      'Configurações comerciais e horários',
      'Módulo financeiro (DRE e Despesas)',
      'Relatórios de vendas e desempenho',
      'Suporte prioritário na configuração'
    ],
    recommended: true
  },
  {
    id: 'mensal-150',
    name: 'Plano Mensal (Até 150 pedidos)',
    price: 69.90,
    displayPrice: 'R$ 69,90 / mês',
    description: 'Para quem está começando a crescer.',
    features: [
      'Até 150 pedidos/mês',
      'Página digital da loja',
      'Gestão de catálogo',
      'Painel de pedidos',
      'Relatórios básicos'
    ]
  },
  {
    id: 'mensal-250',
    name: 'Plano Mensal (151 a 250 pedidos)',
    price: 199.90,
    displayPrice: 'R$ 199,90 / mês',
    description: 'Para operações em crescimento.',
    features: [
      '151 a 250 pedidos/mês',
      'Todos os recursos do plano anterior',
      'Relatórios avançados',
      'Suporte aprimorado'
    ]
  },
  {
    id: 'mensal-acima',
    name: 'Plano Mensal (Pedidos ilimitados)',
    price: 219.90,
    displayPrice: 'R$ 219,90 / mês',
    description: 'Para operações de alto volume.',
    features: [
      'Pedidos ilimitados',
      'Todos os recursos Pro',
      'Módulo financeiro completo',
      'Suporte prioritário'
    ]
  }
];
