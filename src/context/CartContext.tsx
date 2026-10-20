import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem, Product, ProductVariant, SelectedAddOn, SelectedOptionGroup, Store } from '../types';

interface PendingCartItem {
  product: Product;
  store: Store;
  quantity: number;
  selectedVariant?: ProductVariant;
  selectedAddOns: SelectedAddOn[];
  selectedOptionGroups?: SelectedOptionGroup[];
  notes?: string;
}

interface CartContextType {
  items: CartItem[];
  currentStore: Store | null;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  addToCart: (
    product: Product,
    store: Store,
    quantity: number,
    selectedVariant?: ProductVariant,
    selectedAddOns?: SelectedAddOn[],
    notes?: string,
    selectedOptionGroups?: SelectedOptionGroup[]
  ) => boolean;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQuantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  conflictItem: PendingCartItem | null;
  resolveConflict: (replace: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'plazzio_cart_v1';
const STORE_STORAGE_KEY = 'plazzio_cart_store_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentStore, setCurrentStore] = useState<Store | null>(() => {
    try {
      const saved = localStorage.getItem(STORE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [conflictItem, setConflictItem] = useState<PendingCartItem | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      if (currentStore) {
        localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(currentStore));
      } else {
        localStorage.removeItem(STORE_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Could not persist cart:', e);
    }
  }, [items, currentStore]);

  const addItemInternal = (
    product: Product,
    store: Store,
    quantity: number,
    selectedVariant?: ProductVariant,
    selectedAddOns: SelectedAddOn[] = [],
    notes?: string,
    selectedOptionGroups?: SelectedOptionGroup[]
  ) => {
    // Calculate single item unit price: base + variant diff + add-ons
    let unitPrice = product.basePrice;
    if (selectedVariant) {
      unitPrice += selectedVariant.price;
    }
    const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price * a.quantity, 0);
    const itemTotal = (unitPrice + addOnsTotal) * quantity;

    const optionGroupsKey = selectedOptionGroups?.map(g => `${g.groupId}:${g.selectedOptions.map(o => o.id).sort().join(',')}`).join('|') || '';
    const cartItemId = `${product.id}_${selectedVariant?.id || 'base'}_${selectedAddOns.map(a => `${a.id}:${a.quantity}`).sort().join('_')}_${optionGroupsKey}_${notes || ''}`;

    setItems(prevItems => {
      const existingIndex = prevItems.findIndex(i => i.id === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          itemTotal: (unitPrice + addOnsTotal) * newQty,
        };
        return updated;
      }

      const newItem: CartItem = {
        id: cartItemId,
        productId: product.id,
        name: product.name,
        storeId: store.id,
        storeName: store.name,
        basePrice: product.basePrice,
        quantity,
        selectedVariant,
        selectedAddOns,
        selectedOptionGroups,
        itemTotal,
        notes,
        imageUrl: product.imageUrl,
      };
      return [...prevItems, newItem];
    });

    setCurrentStore(store);
  };

  const addToCart = (
    product: Product,
    store: Store,
    quantity: number,
    selectedVariant?: ProductVariant,
    selectedAddOns: SelectedAddOn[] = [],
    notes?: string,
    selectedOptionGroups?: SelectedOptionGroup[]
  ): boolean => {
    // Check if there are already items from a DIFFERENT store
    if (items.length > 0 && currentStore && currentStore.id !== store.id) {
      setConflictItem({
        product,
        store,
        quantity,
        selectedVariant,
        selectedAddOns,
        selectedOptionGroups,
        notes,
      });
      return false;
    }

    addItemInternal(product, store, quantity, selectedVariant, selectedAddOns, notes, selectedOptionGroups);
    return true;
  };

  const resolveConflict = (replace: boolean) => {
    if (replace && conflictItem) {
      setItems([]);
      setCurrentStore(conflictItem.store);
      addItemInternal(
        conflictItem.product,
        conflictItem.store,
        conflictItem.quantity,
        conflictItem.selectedVariant,
        conflictItem.selectedAddOns,
        conflictItem.notes,
        conflictItem.selectedOptionGroups
      );
    }
    setConflictItem(null);
  };

  const removeFromCart = (cartItemId: string) => {
    setItems(prev => {
      const remaining = prev.filter(i => i.id !== cartItemId);
      if (remaining.length === 0) {
        setCurrentStore(null);
      }
      return remaining;
    });
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setItems(prev =>
      prev.map(item => {
        if (item.id === cartItemId) {
          let unitPrice = item.basePrice;
          if (item.selectedVariant) {
            unitPrice += item.selectedVariant.price;
          }
          const addOnsTotal = item.selectedAddOns.reduce((sum, a) => sum + a.price * a.quantity, 0);
          return {
            ...item,
            quantity: newQuantity,
            itemTotal: (unitPrice + addOnsTotal) * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    setCurrentStore(null);
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
  const deliveryFee = currentStore ? currentStore.deliveryFee : 0;
  const total = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        items,
        currentStore,
        itemCount,
        subtotal,
        deliveryFee,
        total,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        conflictItem,
        resolveConflict,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
