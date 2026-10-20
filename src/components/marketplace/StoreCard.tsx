import React from 'react';
import { Store, Review } from '../../types';
import { formatBRL, isStoreOpen } from '../../lib/utils';
import { Star, Clock, Bike, Store as StoreIcon } from 'lucide-react';

interface StoreCardProps {
  store: Store;
  reviews?: Review[];
  onClick: () => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({ store, reviews, onClick }) => {
  const open = isStoreOpen(store.operatingHours);

  // Compute rating dynamically if reviews are provided
  const { rating, reviewCount } = React.useMemo(() => {
    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
      return { 
        rating: Math.round((sum / reviews.length) * 10) / 10, 
        reviewCount: reviews.length 
      };
    }
    return { rating: store.rating, reviewCount: store.reviewCount };
  }, [reviews, store.rating, store.reviewCount]);

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col"
    >
      {/* Cover Image */}
      <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
        {store.coverUrl ? (
          <img
            src={store.coverUrl}
            alt={store.name}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
            <StoreIcon className="w-10 h-10" />
          </div>
        )}

        {/* Store Status Tags */}
        {store.status === 'pending_review' ? (
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-600/90 text-white backdrop-blur-xs">
            Em Análise
          </span>
        ) : store.isDemo ? (
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-xs">
            Exemplo Demo
          </span>
        ) : null}

        {/* Status indicator: Aberto / Fechado */}
        <div className="absolute top-2.5 right-2.5">
          <span className={`px-2.5 py-0.5 rounded text-xs font-semibold backdrop-blur-xs shadow-xs ${
            open ? 'bg-emerald-600/90 text-white' : 'bg-slate-900/80 text-slate-200'
          }`}>
            {open ? 'Aberto agora' : 'Fechado'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-orange-600 transition-colors">
              {store.name}
            </h3>
            {rating ? (
              <div className="flex items-center gap-1 text-xs font-bold text-slate-800 shrink-0">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{rating.toFixed(1)}</span>
                {reviewCount !== undefined && reviewCount > 0 && (
                  <span className="text-slate-400 font-normal">({reviewCount})</span>
                )}
              </div>
            ) : null}
          </div>

          <p className="text-xs text-slate-500 line-clamp-2 mb-3">
            {store.description}
          </p>
        </div>

        {/* Metadata in clean unboxed text with · separators (Zero-Pill discipline) */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 truncate">
            <span>{store.businessType}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="truncate">{store.city}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-medium text-slate-700">
            <div className="flex items-center gap-1">
              <Bike className="w-3.5 h-3.5 text-slate-400" />
              <span>{store.deliveryFee === 0 ? 'Grátis' : formatBRL(store.deliveryFee)}</span>
            </div>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <div className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>~40-55 min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
