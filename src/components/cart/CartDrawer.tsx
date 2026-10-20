import React from 'react';
import { useCart } from '../../context/CartContext';
import { formatBRL } from '../../lib/utils';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Store as StoreIcon } from 'lucide-react';

interface CartDrawerProps {
  onNavigateToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onNavigateToCheckout }) => {
  const { 
    isCartOpen, 
    setIsCartOpen, 
    items, 
    currentStore, 
    subtotal, 
    deliveryFee, 
    total, 
    updateQuantity, 
    removeFromCart, 
    clearCart 
  } = useCart();

  if (!isCartOpen) return null;

  const isBelowMinimum = currentStore && subtotal < currentStore.minimumOrderValue;
  const differenceToMinimum = currentStore ? currentStore.minimumOrderValue - subtotal : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              <h2 className="text-base font-bold text-slate-900">Sua Sacola</h2>
              <span className="text-xs font-semibold text-slate-500">
                ({items.reduce((s, i) => s + i.quantity, 0)})
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Fechar sacola"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Store Info Banner */}
          {currentStore && (
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <StoreIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-700 truncate">
                  Pedido em: <strong className="text-slate-900">{currentStore.name}</strong>
                </span>
              </div>
              <button
                onClick={clearCart}
                className="text-xs text-red-600 hover:text-red-700 hover:underline shrink-0"
              >
                Limpar
              </button>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  Sua sacola está vazia
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mb-6">
                  Explore os estabelecimentos da sua região e adicione itens deliciosos.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Explorar lojas
                </button>
              </div>
            ) : (
              items.map(item => (
                <div key={item.id} className="py-4 flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 leading-tight">
                        {item.name}
                      </h4>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {item.selectedVariant && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.selectedVariant.name}
                      </p>
                    )}

                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.selectedAddOns.map(addon => (
                          <p key={addon.id} className="text-xs text-slate-500">
                            + {addon.quantity}x {addon.name} ({formatBRL(addon.price)})
                          </p>
                        ))}
                      </div>
                    )}
                    
                    {item.selectedOptionGroups && item.selectedOptionGroups.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.selectedOptionGroups.map(group => (
                          <div key={group.groupId}>
                            <p className="text-xs font-semibold text-slate-700 mt-1">{group.groupName}:</p>
                            {group.selectedOptions.map(opt => (
                              <p key={opt.id} className="text-xs text-slate-500 ml-2">
                                + {opt.name} {opt.price > 0 ? `(${formatBRL(opt.price)})` : ''}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {item.notes && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 inline-block">
                        Obs: {item.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-slate-100 text-slate-600 transition-colors"
                          aria-label="Diminuir quantidade"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-semibold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-slate-100 text-slate-600 transition-colors"
                          aria-label="Aumentar quantidade"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-bold text-slate-900">
                        {formatBRL(item.itemTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-900">{formatBRL(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxa de entrega configurada</span>
                  <span className="font-medium text-slate-900">{formatBRL(deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total estimado</span>
                  <span className="text-orange-600 font-extrabold">{formatBRL(total)}</span>
                </div>
              </div>

              {isBelowMinimum && currentStore && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  Pedido mínimo da loja é de <strong>{formatBRL(currentStore.minimumOrderValue)}</strong>. Adicione mais <strong>{formatBRL(differenceToMinimum)}</strong> para continuar.
                </div>
              )}

              <button
                disabled={Boolean(isBelowMinimum)}
                onClick={() => {
                  setIsCartOpen(false);
                  onNavigateToCheckout();
                }}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-colors ${
                  isBelowMinimum
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm'
                }`}
              >
                <span>Finalizar Pedido</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
