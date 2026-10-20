export type UserRole = 'consumer' | 'merchant' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export type StoreStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended';

export type BusinessType = 
  | 'Restaurante' 
  | 'Pizzaria' 
  | 'Lanchonete' 
  | 'Padaria' 
  | 'Mercado' 
  | 'Doceria' 
  | 'Bebidas' 
  | 'Conveniência'
  | 'Outro';

export interface OperatingHoursDay {
  open: string;  // e.g. "18:00"
  close: string; // e.g. "23:00"
  closed: boolean;
}

export type OperatingHours = Record<string, OperatingHoursDay>;

export type PaymentMethod = 'money_on_delivery' | 'card_on_delivery' | 'pix_direct';

export interface CommercialSegment {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Store {
  id: string;
  ownerUid: string;
  name: string;
  slug: string;
  description: string;
  about?: string;
  businessType: BusinessType;
  segmentId?: string;
  segmentName?: string;
  categoryId?: string;
  categoryName?: string;
  logoUrl?: string;
  coverUrl?: string;
  galleryUrls?: string[];
  businessAddress: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  serviceAreas: string[];
  operatingHours: OperatingHours;
  deliveryFee: number;
  minimumOrderValue: number;
  acceptedPaymentMethods: PaymentMethod[];
  pixKey?: string;
  status: StoreStatus;
  rejectionReason?: string;
  published: boolean;
  isDemo?: boolean;
  planId?: string;
  rating?: number;
  reviewCount?: number;
  whatsappOrderNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  segmentId: string;
  name: string;
  slug: string;
  iconKey: string;
  active: boolean;
  sortOrder: number;
}

export type MeasureProfile = 'pizza_slices' | 'volume' | 'weight' | 'count' | 'packaging' | 'custom' | 'none';

export type PackagingType = 'lata' | 'garrafa' | 'caixa' | 'pacote' | 'frasco' | 'outro';

export interface ProductVariant {
  id: string;
  name: string; // e.g. "Média", "Grande", "500 ml", "250 g"
  price: number;
  unitCost?: number;
  sku?: string;
  stockQuantity?: number;
  slicesCount?: number;
  measureValue?: number;
  measureUnit?: string;
  packagingType?: PackagingType | string;
  available?: boolean;
}

export interface ProductAddOn {
  id: string;
  name: string; // e.g. "Borda de Catupiry", "Bacon Extra"
  price: number;
  maxQuantity?: number;
}

export type ProductType = 'simple' | 'prepared' | 'industrialized' | 'variant' | 'weighted' | 'combo';
export type SaleUnit = 'unidade' | 'pacote' | 'kg' | 'g' | 'l' | 'ml';

export interface StoreCategory {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  active: boolean;
}

export interface AddOnOption {
  id: string;
  name: string;
  price: number;
}

export interface AddOnGroup {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  options: AddOnOption[];
}

export interface GlobalOptionItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  active: boolean;
  sortOrder: number;
  category?: string;
  defaultAdditionalPrice?: number;
}

export interface GlobalOptionGroupTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  compatibleSegments: string[];
  compatibleProductTypes?: ProductType[];
  selectionType: 'single' | 'multiple';
  minSelect: number;
  maxSelect: number;
  required: boolean;
  active: boolean;
  sortOrder: number;
  options: GlobalOptionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductOptionItem {
  id: string;
  templateOptionId?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number; // Additional price configured by merchant
  available: boolean;
  sortOrder: number;
}

export interface ProductOptionGroup {
  id: string;
  templateId?: string;
  name: string;
  description?: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  selectionType: 'single' | 'multiple';
  sortOrder: number;
  options: ProductOptionItem[];
}

export interface ComboItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface ComboGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  items: ComboItem[];
}

export interface Product {
  id: string;
  storeId: string;
  categoryId?: string;
  categoryName?: string;
  additionalCategoryNames?: string[];
  name: string;
  description: string;
  imageUrl?: string;
  basePrice: number;
  unitCost?: number;
  productType?: ProductType;
  saleUnit?: SaleUnit;
  measureProfile?: MeasureProfile;
  slicesCount?: number;
  measureValue?: number;
  measureUnit?: string;
  packagingType?: PackagingType | string;
  customUnitLabel?: string;
  sku?: string;
  stockQuantity?: number;
  variants?: ProductVariant[];
  addOns?: ProductAddOn[];
  addOnGroupIds?: string[];
  optionGroups?: ProductOptionGroup[];
  comboGroups?: ComboGroup[];
  available: boolean;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ExpenseCategory = 
  | 'aluguel'
  | 'agua_luz_internet'
  | 'salarios'
  | 'ingredientes_mercadorias'
  | 'embalagens'
  | 'entregas'
  | 'taxas_pagamento'
  | 'comissoes_marketplace'
  | 'marketing'
  | 'equipamentos_manutencao'
  | 'impostos'
  | 'outras';

export interface Expense {
  id: string;
  storeId: string;
  description: string;
  amount: number;
  competenceDate: string; // YYYY-MM-DD
  category: ExpenseCategory;
  notes?: string;
  status: 'confirmed' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface SelectedAddOn {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface SelectedOptionItem {
  id: string;
  /** Stable option ID from the persisted product group or global template. */
  templateOptionId?: string;
  name: string;
  price: number;
  quantity?: number;
  imageUrl?: string;
  groupName?: string;
}

export interface SelectedOptionGroup {
  groupId: string;
  /** Stable ID of the global template when this group was generated from a shared default. */
  templateId?: string;
  groupName: string;
  selectedOptions: SelectedOptionItem[];
}

export interface CartItem {
  id: string; // generated unique cart item ID
  productId: string;
  name: string;
  storeId: string;
  storeName: string;
  basePrice: number;
  quantity: number;
  selectedVariant?: ProductVariant;
  selectedAddOns: SelectedAddOn[];
  selectedOptionGroups?: SelectedOptionGroup[];
  itemTotal: number;
  notes?: string;
  imageUrl?: string;
}

export type FulfillmentMethod = 'delivery' | 'pickup';

export type OrderStatus = 
  | 'pending_confirmation' 
  | 'accepted' 
  | 'preparing' 
  | 'ready_for_pickup' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'completed' 
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  actorUid: string;
  actorName?: string;
  note?: string;
}

export interface DeliveryAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

/**
 * Untrusted checkout payload. Prices, names, images, totals, and order status are intentionally
 * omitted: the server reconstructs them from the current Firestore catalog.
 */
export interface CreateOrderItemRequest {
  productId: string;
  quantity: number;
  selectedVariantId?: string;
  selectedAddOns?: Array<{ id: string; quantity: number }>;
  selectedOptionGroups?: Array<{
    groupId: string;
    templateId?: string;
    selectedOptionIds: Array<{ id: string; templateOptionId?: string }>;
  }>;
  notes?: string;
}

export interface CreateOrderRequest {
  requestId: string;
  storeId: string;
  items: CreateOrderItemRequest[];
  fulfillmentMethod: FulfillmentMethod;
  deliveryAddress?: DeliveryAddress;
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerUid: string;
  storeId: string;
  storeOwnerUid?: string;
  storeSnapshot: {
    name: string;
    slug: string;
    logoUrl?: string;
    phone?: string;
    pixKey?: string;
    whatsappOrderNumber?: string;
    city: string;
    neighborhood?: string;
  };
  customerSnapshot: {
    name: string;
    email: string;
    phone?: string;
  };
  itemsSnapshot: CartItem[];
  fulfillmentMethod: FulfillmentMethod;
  deliveryAddressSnapshot?: DeliveryAddress;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  notes?: string;
  cancellationReason?: string;
  statusHistory: OrderStatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  customerUid: string;
  customerName: string;
  storeId: string;
  orderId?: string;
  rating: number; // 1-5
  comment: string;
  photoUrls?: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail?: string;
  action: string;
  entityType: 'store' | 'product' | 'order' | 'category' | 'user';
  entityId: string;
  details: string;
  timestamp: string;
}
