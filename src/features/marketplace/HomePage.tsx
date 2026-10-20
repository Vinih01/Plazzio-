import React, { useState, useEffect } from 'react';
import { Store, Category, Review } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getApprovedStores } from '../../services/storeService';
import { getApprovedReviews } from '../../services/reviewService';
import { INITIAL_CATEGORIES } from '../../services/mockDemoData';
import { StoreCard } from '../../components/marketplace/StoreCard';
import { 
  Search, 
  MapPin, 
  Store as StoreIcon, 
  ArrowRight, 
  ShoppingBag, 
  Utensils, 
  Pizza, 
  Sandwich, 
  Croissant, 
  Cake, 
  Wine, 
  Truck, 
  Smartphone, 
  Sparkles,
  Clock
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (route: string) => void;
  onSelectStore: (slug: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Utensils: <Utensils className="w-5 h-5" />,
  Pizza: <Pizza className="w-5 h-5" />,
  Sandwich: <Sandwich className="w-5 h-5" />,
  Croissant: <Croissant className="w-5 h-5" />,
  Cake: <Cake className="w-5 h-5" />,
  ShoppingBag: <ShoppingBag className="w-5 h-5" />,
  Wine: <Wine className="w-5 h-5" />,
  Store: <StoreIcon className="w-5 h-5" />,
};

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectStore }) => {
  const { currentUser } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('São Paulo, SP');

  useEffect(() => {
    Promise.all([getApprovedStores(), getApprovedReviews()]).then(([storesData, reviewsData]) => {
      setStores(storesData);
      setReviews(reviewsData);
      setLoading(false);
    });
  }, []);

  const [reviews, setReviews] = useState<Review[]>([]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(`/explorar?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      onNavigate('/explorar');
    }
  };

  const handleCategoryClick = (categorySlug: string) => {
    onNavigate(`/explorar?cat=${categorySlug}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-white pt-20 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold border border-orange-100 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Marketplace autêntico do seu bairro</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight mb-6">
            Seu bairro. Seus sabores.<br />
            <span className="text-orange-600">Sem intermediários.</span>
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto mb-10">
            Peça direto nos melhores estabelecimentos da sua cidade. Preços justos, entrega rápida e apoio total ao comércio local.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border border-slate-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b sm:border-b-0 sm:border-r border-slate-200 text-sm text-slate-700">
                <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-transparent font-semibold focus:outline-none w-full cursor-pointer text-slate-900"
                >
                  <option value="São Paulo, SP">São Paulo, SP</option>
                  <option value="Campinas, SP">Campinas, SP</option>
                  <option value="Curitiba, PR">Curitiba, PR</option>
                  <option value="Belo Horizonte, MG">Belo Horizonte, MG</option>
                </select>
              </div>

              <div className="flex-1 flex items-center px-4 py-2">
                <Search className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="O que vamos pedir hoje?"
                  className="w-full text-sm text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
                />
              </div>

              <button
                type="submit"
                className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Navigable Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 w-full">
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 overflow-x-auto">
          <div className="flex items-center gap-4 min-w-max pb-1">
            {INITIAL_CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.slug)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-slate-50 hover:bg-orange-50 hover:text-orange-600 text-slate-700 text-xs font-semibold border border-slate-200/80 transition-all cursor-pointer whitespace-nowrap"
              >
                <div className="p-1 rounded bg-white text-orange-500 shadow-2xs">
                  {CATEGORY_ICONS[category.iconKey] || <StoreIcon className="w-4 h-4" />}
                </div>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Stores */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Merchant Pending Notification */}
        {stores.some(s => s.ownerUid === currentUser?.uid && s.status === 'pending_review') && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-amber-950">Seu estabelecimento está cadastrado e em análise pela moderação.</span>
                <span className="text-amber-800 text-[11px] block sm:inline sm:ml-1">
                  Você já pode configurar seu cardápio, produtos e equipe.
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('/painel')}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer"
            >
              Acessar Meu Painel
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Estabelecimentos em destaque
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Negócios avaliados com nota máxima e entregas ágeis na sua vizinhança.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/explorar')}
            className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-xl border border-slate-200 h-72 animate-pulse p-4 flex flex-col justify-between">
                <div className="h-40 bg-slate-100 rounded-lg w-full" />
                <div className="space-y-2 mt-3">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <StoreIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">Nenhum estabelecimento cadastrado</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Seja o primeiro parceiro da sua cidade cadastrando sua loja no Plazzio!
            </p>
            <button
              onClick={() => onNavigate('/parceiro/cadastro')}
              className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-semibold"
            >
              Cadastrar Minha Loja
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stores.map(store => (
              <StoreCard
                key={store.id}
                store={store}
                reviews={reviews.filter(r => r.storeId === store.id)}
                onClick={() => onSelectStore(store.slug)}
              />
            ))}
          </div>
        )}
      </section>

      {/* How it helps the consumer */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">
              Pedir pelo Plazzio é mais inteligente e justo.
            </h2>
            <p className="text-sm text-slate-600">
              Conectamos você aos melhores estabelecimentos da sua região, garantindo preços melhores e apoio direto ao comerciante.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-6">
                <StoreIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Apoio ao Comércio Local</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Você compra direto do estabelecimento, sem intermediários que encarecem sua refeição ou reduzem o lucro do lojista.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Entrega Ágil e Transparente</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Acompanhe o status do seu pedido em tempo real: da cozinha até a sua porta, com controle total do preparo.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Pagamento Direto e Seguro</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Mais segurança para você. Pague via Pix direto ao estabelecimento ou utilize sua maquininha de cartão no momento da entrega.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Acquisition Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="bg-slate-900 rounded-3xl p-10 sm:p-16 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
          <div className="max-w-xl space-y-4">
            <span className="text-orange-400 font-bold text-xs uppercase tracking-wider">
              Para Estabelecimentos
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Otimize suas vendas e simplifique a gestão da sua loja.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Receba pedidos organizados em um painel simples, controle seu cardápio em minutos e construa um canal de vendas direto com seus clientes, sem comissões abusivas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <button
              onClick={() => onNavigate('/seja-parceiro')}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Cadastrar estabelecimento</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
