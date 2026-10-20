import React, { useState, useEffect, useMemo } from 'react';
import { Store, Review } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getApprovedStores } from '../../services/storeService';
import { getApprovedReviews } from '../../services/reviewService';
import { INITIAL_CATEGORIES } from '../../services/mockDemoData';
import { StoreCard } from '../../components/marketplace/StoreCard';
import { isStoreOpen } from '../../lib/utils';
import { Search, Filter, Store as StoreIcon, RotateCcw } from 'lucide-react';

interface ExplorePageProps {
  initialSearchQuery?: string;
  initialCategory?: string;
  onSelectStore: (slug: string) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  initialSearchQuery = '',
  initialCategory = '',
  onSelectStore
}) => {
  const { currentUser } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [selectedCity, setSelectedCity] = useState('all');

  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    Promise.all([getApprovedStores(), getApprovedReviews()]).then(([storesData, reviewsData]) => {
      setStores(storesData);
      setReviews(reviewsData);
      setLoading(false);
    });
  }, []);

  const cities = useMemo(() => {
    const set = new Set<string>();
    stores.forEach(s => {
      if (s.city) set.add(s.city);
    });
    return Array.from(set);
  }, [stores]);

  const filteredStores = useMemo(() => {
    return stores.filter(store => {
      // Search text filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = store.name.toLowerCase().includes(q);
        const matchesDesc = store.description.toLowerCase().includes(q);
        const matchesType = store.businessType.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesType) return false;
      }

      // Category filter
      if (selectedCategory) {
        const cat = INITIAL_CATEGORIES.find(c => c.slug === selectedCategory);
        if (cat) {
          const catMatches = store.categoryId === cat.id ||
                             store.categoryName?.toLowerCase() === cat.name.toLowerCase() ||
                             store.businessType.toLowerCase().includes(cat.name.toLowerCase()) ||
                             cat.name.toLowerCase().includes(store.businessType.toLowerCase());
          if (!catMatches) return false;
        }
      }

      // City filter
      if (selectedCity !== 'all' && store.city !== selectedCity) {
        return false;
      }

      // Only open filter
      if (onlyOpen && !isStoreOpen(store.operatingHours)) {
        return false;
      }

      // Free delivery filter
      if (freeDelivery && store.deliveryFee > 0) {
        return false;
      }

      return true;
    });
  }, [stores, search, selectedCategory, selectedCity, onlyOpen, freeDelivery]);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedCity('all');
    setOnlyOpen(false);
    setFreeDelivery(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Explorar Estabelecimentos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Encontre as melhores opções locais com entrega ou retirada.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-8 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, tipo ou especialidade..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 text-slate-800"
              />
            </div>

            {/* Category Select */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white text-slate-700 cursor-pointer"
              >
                <option value="">Todas as categorias</option>
                {INITIAL_CATEGORIES.map(c => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* City Select */}
            <div>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Todas as cidades</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Toggle Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setOnlyOpen(!onlyOpen)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  onlyOpen 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Abertos agora
              </button>

              <button
                onClick={() => setFreeDelivery(!freeDelivery)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  freeDelivery 
                    ? 'bg-orange-50 text-orange-800 border-orange-300 font-semibold' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Entrega grátis
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {filteredStores.length} {filteredStores.length === 1 ? 'estabelecimento' : 'estabelecimentos'}
              </span>

              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar filtros</span>
              </button>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="bg-white rounded-xl border border-slate-200 h-72 animate-pulse p-4" />
            ))}
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <StoreIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Nenhum estabelecimento encontrado</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Tente alterar os termos de busca ou remover alguns filtros para ver mais resultados.
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Ver todos os estabelecimentos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores.map(store => (
              <StoreCard
                key={store.id}
                store={store}
                reviews={reviews.filter(r => r.storeId === store.id)}
                onClick={() => onSelectStore(store.slug)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
