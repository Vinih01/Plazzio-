import { Order, OrderStatus, StoreStatus, PaymentMethod } from '../types';

/**
 * Format number to Brazilian Real (BRL)
 * Example: 24.5 -> "R$ 24,50"
 */
export function formatBRL(amount: number): string {
  if (isNaN(amount)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

/**
 * Format ISO date string to Brazilian datetime (America/Sao_Paulo)
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Format ISO date string to Brazilian short time
 */
export function formatTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Converts title into a clean URL slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^\w\s-]/g, '') // remove non-word chars
    .trim()
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

/**
 * Generate a sequential-style order number (e.g. #PLZ-8204)
 */
export function generateOrderNumber(): string {
  const chars = '0123456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `#PLZ-${rand}`;
}

/**
 * Friendly status mapping for OrderStatus
 */
export function getOrderStatusMeta(status: OrderStatus): { label: string; bgClass: string; textClass: string; stepIndex: number } {
  switch (status) {
    case 'pending_confirmation':
      return { label: 'Aguardando confirmação', bgClass: 'bg-amber-50', textClass: 'text-amber-700', stepIndex: 0 };
    case 'accepted':
      return { label: 'Pedido aceito', bgClass: 'bg-blue-50', textClass: 'text-blue-700', stepIndex: 1 };
    case 'preparing':
      return { label: 'Em preparo', bgClass: 'bg-indigo-50', textClass: 'text-indigo-700', stepIndex: 2 };
    case 'ready_for_pickup':
      return { label: 'Pronto para retirada', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', stepIndex: 3 };
    case 'out_for_delivery':
      return { label: 'Saiu para entrega', bgClass: 'bg-purple-50', textClass: 'text-purple-700', stepIndex: 3 };
    case 'delivered':
      return { label: 'Entregue', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', stepIndex: 4 };
    case 'completed':
      return { label: 'Concluído', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', stepIndex: 4 };
    case 'cancelled':
      return { label: 'Cancelado', bgClass: 'bg-red-50', textClass: 'text-red-700', stepIndex: -1 };
    default:
      return { label: 'Status desconhecido', bgClass: 'bg-slate-50', textClass: 'text-slate-700', stepIndex: 0 };
  }
}

/**
 * Store Status meta
 */
export function getStoreStatusMeta(status: StoreStatus): { label: string; bgClass: string; textClass: string } {
  switch (status) {
    case 'approved':
      return { label: 'Aprovada e Ativa', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
    case 'pending_review':
      return { label: 'Em Análise', bgClass: 'bg-amber-50', textClass: 'text-amber-700' };
    case 'draft':
      return { label: 'Rascunho', bgClass: 'bg-slate-100', textClass: 'text-slate-700' };
    case 'rejected':
      return { label: 'Reprovada', bgClass: 'bg-red-50', textClass: 'text-red-700' };
    case 'suspended':
      return { label: 'Suspensa', bgClass: 'bg-orange-50', textClass: 'text-orange-700' };
    default:
      return { label: status, bgClass: 'bg-slate-100', textClass: 'text-slate-700' };
  }
}

/**
 * Payment method label
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'pix_direct':
      return 'Pix direto ao estabelecimento';
    case 'card_on_delivery':
      return 'Cartão na entrega (Maquininha)';
    case 'money_on_delivery':
      return 'Dinheiro na entrega';
    default:
      return method;
  }
}

/**
 * Standard days of week definitions in Portuguese and English aliases
 */
export const DAYS_OF_WEEK = [
  { key: 'segunda', altKey: 'mon', label: 'Segunda-feira' },
  { key: 'terca', altKey: 'tue', label: 'Terça-feira' },
  { key: 'quarta', altKey: 'wed', label: 'Quarta-feira' },
  { key: 'quinta', altKey: 'thu', label: 'Quinta-feira' },
  { key: 'sexta', altKey: 'fri', label: 'Sexta-feira' },
  { key: 'sabado', altKey: 'sat', label: 'Sábado' },
  { key: 'domingo', altKey: 'sun', label: 'Domingo' },
] as const;

/**
 * Check if a store has actually configured operating hours (not empty / unconfigured)
 */
export function hasConfiguredHours(
  operatingHours?: Record<string, { open?: string; close?: string; closed?: boolean }>
): boolean {
  if (!operatingHours || typeof operatingHours !== 'object') return false;
  const entries = Object.entries(operatingHours);
  if (entries.length === 0) return false;

  return entries.some(([_, val]) => {
    if (!val) return false;
    if (val.closed) return true;
    return Boolean(val.open && val.close && val.open.trim() !== '' && val.close.trim() !== '');
  });
}

/**
 * Get current day and time specifically in America/Sao_Paulo timezone
 */
export function getSaoPauloCurrentTime(): { dayKey: string; altDayKey: string; timeStr: string } {
  const now = new Date();
  
  const brazilDayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
  });
  
  const brazilTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const altDayKey = brazilDayFormatter.format(now).toLowerCase(); // 'sun', 'mon', etc.
  
  const dayKeyMap: Record<string, string> = {
    mon: 'segunda',
    tue: 'terca',
    wed: 'quarta',
    thu: 'quinta',
    fri: 'sexta',
    sat: 'sabado',
    sun: 'domingo',
  };

  const dayKey = dayKeyMap[altDayKey] || altDayKey;
  const timeStr = brazilTimeFormatter.format(now); // "14:30"

  return { dayKey, altDayKey, timeStr };
}

/**
 * Check if store is currently open according to America/Sao_Paulo time.
 * If operating hours are not configured, returns false (not automatically open).
 */
export function isStoreOpen(
  operatingHours?: Record<string, { open?: string; close?: string; closed?: boolean }>
): boolean {
  if (!hasConfiguredHours(operatingHours)) {
    return false;
  }

  try {
    const { dayKey, altDayKey, timeStr } = getSaoPauloCurrentTime();

    // Check today's schedule using either portuguese key or english abbreviation
    const dayConfig = operatingHours![dayKey] || operatingHours![altDayKey];
    if (!dayConfig || dayConfig.closed) {
      return false;
    }

    const openTime = dayConfig.open?.trim();
    const closeTime = dayConfig.close?.trim();

    if (!openTime || !closeTime) {
      return false;
    }

    // Normal schedule: e.g. 08:00 to 18:00
    if (openTime <= closeTime) {
      return timeStr >= openTime && timeStr <= closeTime;
    }

    // Overnight schedule: e.g. 18:00 to 02:00
    return timeStr >= openTime || timeStr <= closeTime;
  } catch (err) {
    console.warn('Error evaluating store open status:', err);
    return false;
  }
}

export type StoreOpenStatusType = 'open' | 'closed' | 'unconfigured';

/**
 * Get full operating status for a store
 */
export function getStoreOpenStatus(
  operatingHours?: Record<string, { open?: string; close?: string; closed?: boolean }>
): {
  status: StoreOpenStatusType;
  label: string;
  badgeClass: string;
} {
  if (!hasConfiguredHours(operatingHours)) {
    return {
      status: 'unconfigured',
      label: 'Horários não informados',
      badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
    };
  }

  const open = isStoreOpen(operatingHours);
  if (open) {
    return {
      status: 'open',
      label: 'Aberto agora',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };
  }

  return {
    status: 'closed',
    label: 'Fechado agora',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
  };
}

export function formatProductMeasure(
  product: {
    measureProfile?: string;
    slicesCount?: number;
    measureValue?: number;
    measureUnit?: string;
    packagingType?: string;
    customUnitLabel?: string;
  },
  variant?: {
    slicesCount?: number;
    measureValue?: number;
    measureUnit?: string;
    packagingType?: string;
  }
): string {
  const profile = product.measureProfile || 'none';
  const slices = variant?.slicesCount ?? product.slicesCount;
  const val = variant?.measureValue ?? product.measureValue;
  const unit = variant?.measureUnit ?? product.measureUnit;
  const pkg = variant?.packagingType ?? product.packagingType;
  const custom = product.customUnitLabel;

  switch (profile) {
    case 'pizza_slices':
      return slices ? `${slices} fatias` : '';
    case 'volume':
      return val && unit ? `${val} ${unit}` : '';
    case 'weight':
      return val && unit ? `${val} ${unit}` : '';
    case 'packaging':
      return pkg && val ? `${pkg} de ${val}${unit || ''}` : pkg ? `${pkg}` : val && unit ? `${val} ${unit}` : '';
    case 'custom':
      return custom || '';
    case 'count':
      return val ? `${val} un` : '';
    default:
      return '';
  }
}

export function formatWhatsAppMessage(order: Order): string {
  const date = formatDateTime(order.createdAt);
  
  let msg = `PLAZZIO - NOVO PEDIDO\n\n`;
  msg += `Pedido: ${order.orderNumber}\n`;
  msg += `Data: ${date}\n`;
  msg += `Estabelecimento: ${order.storeSnapshot.name}\n\n`;
  
  msg += `DADOS DO CLIENTE\n`;
  msg += `Nome: ${order.customerSnapshot.name}\n`;
  if (order.customerSnapshot.phone) msg += `Telefone: ${order.customerSnapshot.phone}\n`;
  msg += `\n`;
  
  msg += `TIPO DE ATENDIMENTO\n`;
  msg += order.fulfillmentMethod === 'delivery' ? 'Entrega' : 'Retirada';
  msg += `\n`;
  
  if (order.fulfillmentMethod === 'delivery' && order.deliveryAddressSnapshot) {
    const addr = order.deliveryAddressSnapshot;
    msg += `Endereço: ${addr.street}, ${addr.number}${addr.complement ? ' - ' + addr.complement : ''}\n`;
    msg += `Bairro: ${addr.neighborhood}\n`;
    msg += `Cidade: ${addr.city}/${addr.state}\n`;
    if (addr.zipCode) msg += `CEP: ${addr.zipCode}\n`;
  }
  msg += `\nITENS DO PEDIDO\n\n`;
  
  order.itemsSnapshot.forEach(item => {
    msg += `${item.quantity}x ${item.name}\n`;
    if (item.selectedVariant) msg += `${item.selectedVariant.name}\n`;
    item.selectedAddOns?.forEach(a => msg += `+ ${a.quantity}x ${a.name}\n`);
    if (item.notes) msg += `Observação: ${item.notes}\n`;
    msg += `Valor unitário: ${formatBRL(item.basePrice + (item.selectedVariant?.price || 0))}\n`;
    msg += `Subtotal do item: ${formatBRL(item.itemTotal)}\n\n`;
  });
  
  msg += `RESUMO FINANCEIRO\n`;
  msg += `Subtotal: ${formatBRL(order.subtotal)}\n`;
  if (order.discount > 0) msg += `Descontos: ${formatBRL(order.discount)}\n`;
  msg += `Taxa de entrega: ${formatBRL(order.deliveryFee)}\n`;
  msg += `TOTAL DO PEDIDO: ${formatBRL(order.total)}\n\n`;
  
  msg += `PAGAMENTO\n`;
  msg += `Forma: ${getPaymentMethodLabel(order.paymentMethod)}\n`;
  if (order.notes?.includes('Troco para:')) {
    msg += `${order.notes.split(' | ').find(n => n.includes('Troco para:'))}\n`;
  }
  msg += `\nPedido registrado no Plazzio. Consulte o painel de pedidos para acompanhar o atendimento.`;
  
  return msg;
}

/**
 * Recursively removes any keys with `undefined` values from an object or array.
 * Preserves 0, false, "", null, Dates, arrays, and nested structures.
 * Does not mutate the input argument.
 */
export function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => removeUndefinedFields(item)) as unknown as T;
  }

  if (obj instanceof Date) {
    return obj;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (typeof val === 'object' && val !== null) {
        cleaned[key] = removeUndefinedFields(val);
      } else {
        cleaned[key] = val;
      }
    }
  }
  return cleaned as T;
}

