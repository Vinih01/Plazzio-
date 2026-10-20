import React from 'react';
import { useCart } from '../../context/CartContext';
import { Modal } from '../ui/Modal';
import { AlertCircle } from 'lucide-react';

export const CartConflictModal: React.FC = () => {
  const { conflictItem, resolveConflict, currentStore } = useCart();

  if (!conflictItem) return null;

  return (
    <Modal
      isOpen={!!conflictItem}
      onClose={() => resolveConflict(false)}
      title="Substituir sacola atual?"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 leading-relaxed">
            Sua sacola já contém itens de <strong>{currentStore?.name}</strong>. No Plazzio, cada pedido é feito para uma única loja por vez.
          </div>
        </div>

        <p className="text-sm text-slate-600">
          Deseja esvaziar a sacola atual para adicionar <strong>{conflictItem.product.name}</strong> de <strong>{conflictItem.store.name}</strong>?
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => resolveConflict(false)}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Manter sacola atual
          </button>
          <button
            onClick={() => resolveConflict(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs transition-colors"
          >
            Limpar e adicionar
          </button>
        </div>
      </div>
    </Modal>
  );
};
