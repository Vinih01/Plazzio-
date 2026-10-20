import React from 'react';
import { Product } from '../../types';
import { formatBRL, formatProductMeasure } from '../../lib/utils';
import { ShoppingBag } from 'lucide-react';

interface ProductItemProps {
  product: Product;
  onClick: () => void;
}

export const ProductItem: React.FC<ProductItemProps> = ({ product, onClick }) => {
  const measure = formatProductMeasure(product);

  return (
    <div 
      onClick={onClick}
      className="flex gap-4 p-3 bg-white border border-slate-200 rounded-xl hover:border-orange-500 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
    >
      <div className="w-20 h-20 shrink-0 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <ShoppingBag className="w-8 h-8" />
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center flex-1 min-w-0">
        <h3 className="text-xs font-bold text-slate-900 truncate">{product.name}</h3>
        {measure && <p className="text-[10px] text-slate-500 mt-0.5">{measure}</p>}
        <div className="mt-1.5">
          <span className="text-sm font-bold text-slate-900">{formatBRL(product.basePrice)}</span>
        </div>
      </div>
    </div>
  );
};
