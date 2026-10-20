import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatBRL, formatWhatsAppMessage } from '../../lib/utils';
import { createOrder } from '../../services/orderService';
import { CreateOrderRequest, Order, PaymentMethod, FulfillmentMethod, DeliveryAddress } from '../../types';
import { 
  ArrowLeft, 
  MapPin, 
  Bike, 
  ShoppingBag, 
  CreditCard, 
  QrCode, 
  Banknote, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Copy 
} from 'lucide-react';

interface CheckoutPageProps {
  onBack: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBack, onOrderSuccess }) => {
  const { items, currentStore, subtotal, deliveryFee, total, clearCart } = useCart();
  const { currentUser, signInWithGoogle } = useAuth();

  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => currentStore?.acceptedPaymentMethods?.[0] || 'pix_direct');
  
  // Customer info
  const [customerName, setCustomerName] = useState(currentUser?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');

  // Address
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState(currentStore?.city || '');
  const [state, setState] = useState(currentStore?.state || '');
  const [zipCode, setZipCode] = useState('');
  
  // Extra
  const [orderNotes, setOrderNotes] = useState('');
  const [cashChange, setCashChange] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [requestId] = useState(() => {
    if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
  });

  if (items.length === 0 || !currentStore) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Sua sacola está vazia</h2>
          <p className="text-xs text-slate-500">
            Adicione itens de um estabelecimento antes de prosseguir com o pagamento.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-semibold"
          >
            Voltar ao Cardápio
          </button>
        </div>
      </div>
    );
  }

  const acceptedPaymentMethods = Array.isArray(currentStore.acceptedPaymentMethods) ? currentStore.acceptedPaymentMethods : [];
  const effectiveDeliveryFee = fulfillment === 'delivery' ? deliveryFee : 0;
  const effectiveTotal = subtotal + effectiveDeliveryFee;

  const handleCopyPix = () => {
    if (currentStore.pixKey) {
      navigator.clipboard.writeText(currentStore.pixKey);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentUser) {
      setErrorMsg('É necessário fazer login com sua conta Google para autenticar o pedido com segurança.');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMsg('Por favor, informe seu nome e telefone para contato.');
      return;
    }

    if (fulfillment === 'delivery') {
      if (!street.trim() || !number.trim() || !neighborhood.trim() || !city.trim() || !state.trim() || !zipCode.trim()) {
        setErrorMsg('Preencha rua, número, bairro, cidade, estado e CEP do endereço de entrega.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const deliveryAddressSnapshot: DeliveryAddress | undefined = fulfillment === 'delivery' ? {
        street: street.trim(),
        number: number.trim(),
        ...(complement.trim() ? { complement: complement.trim() } : {}),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim(),
      } : undefined;

      const orderNotesCombined = [
        orderNotes.trim(),
        paymentMethod === 'money_on_delivery' && cashChange.trim() ? `Troco para: ${cashChange.trim()}` : ''
      ].filter(Boolean).join(' | ');

      const request: CreateOrderRequest = {
        requestId,
        storeId: currentStore.id,
        fulfillmentMethod: fulfillment,
        ...(deliveryAddressSnapshot ? { deliveryAddress: deliveryAddressSnapshot } : {}),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        paymentMethod,
        ...(orderNotesCombined ? { notes: orderNotesCombined } : {}),
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          ...(item.selectedVariant?.id ? { selectedVariantId: item.selectedVariant.id } : {}),
          selectedAddOns: item.selectedAddOns.map(addon => ({
            id: addon.id,
            quantity: addon.quantity,
          })),
          ...(item.selectedOptionGroups?.length ? {
            selectedOptionGroups: item.selectedOptionGroups.map(group => ({
              groupId: group.groupId,
              ...(group.templateId ? { templateId: group.templateId } : {}),
              selectedOptionIds: group.selectedOptions.map(option => ({
                id: option.id,
                ...(option.templateOptionId ? { templateOptionId: option.templateOptionId } : {}),
              })),
            })),
          } : {}),
          ...(item.notes ? { notes: item.notes } : {}),
        })),
      };

      // The server verifies the session and recomputes all prices from the live Firestore catalog.
      const createdOrder = await createOrder(request);

      // Cache only the server-confirmed order for the existing order page fallback.
      localStorage.setItem(`plazzio_order_${createdOrder.id}`, JSON.stringify(createdOrder));

      // Open the merchant WhatsApp with the server-confirmed prices and product details.
      const rawPhone = createdOrder.storeSnapshot.whatsappOrderNumber || createdOrder.storeSnapshot.phone;
      if (rawPhone) {
        const cleanDigits = rawPhone.replace(/\D/g, '');
        if (cleanDigits.length >= 8) {
          const formattedPhone = cleanDigits.startsWith('55') ? cleanDigits : `55${cleanDigits}`;
          const message = formatWhatsAppMessage(createdOrder);
          const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
          try {
            window.open(whatsappUrl, '_blank');
          } catch (e) {
            console.warn('WhatsApp auto-open prevented by browser popup blocker:', e);
          }
        }
      }

      clearCart();
      onOrderSuccess(createdOrder.id);
    } catch (err: unknown) {
      console.error('Order placement error:', err);
      let message = 'Não foi possível registrar o pedido. Verifique os dados e tente novamente.';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.userFriendlyMessage) {
            message = parsed.userFriendlyMessage;
          } else if (parsed.error) {
            message = parsed.error;
          }
        } catch {
          message = err.message;
        }
      }
      setErrorMsg(message);
      setSubmitting(false);
    }
  };

  const handleSendWhatsApp = (order: Order) => {
    const rawPhone = order.storeSnapshot.whatsappOrderNumber || order.storeSnapshot.phone;
    if (!rawPhone) {
      alert('Este estabelecimento não possui WhatsApp configurado para recebimento de pedidos.');
      return;
    }
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const formattedPhone = cleanDigits.startsWith('55') ? cleanDigits : `55${cleanDigits}`;
    const message = formatWhatsAppMessage(order);
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao estabelecimento</span>
        </button>

        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
          Finalizar Pedido
        </h1>
        <p className="text-xs text-slate-500 mb-8">
          Revise os detalhes, endereço e método de pagamento direto ao estabelecimento.
        </p>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Fulfillment Type */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                1. Modalidade do Pedido
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFulfillment('delivery')}
                  className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    fulfillment === 'delivery'
                      ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Bike className="w-4 h-4 text-orange-600" />
                  <span>Entrega ({formatBRL(deliveryFee)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillment('pickup')}
                  className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    fulfillment === 'pickup'
                      ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-slate-700" />
                  <span>Retirada no Balcão (Grátis)</span>
                </button>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  2. Seus Dados de Contato
                </h2>
                {!currentUser && (
                  <button
                    type="button"
                    onClick={() => signInWithGoogle()}
                    className="text-xs font-semibold text-orange-600 hover:underline cursor-pointer"
                  >
                    Entrar com Google
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nome completo *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Telefone celular (WhatsApp) *</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(DDD) 99999-9999"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Address (only if delivery) */}
            {fulfillment === 'delivery' && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  3. Endereço de Entrega
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-medium mb-1">Rua / Avenida *</label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Nome da rua"
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Número *</label>
                    <input
                      type="text"
                      required
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="Ex: 120"
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Complemento</label>
                    <input
                      type="text"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Apto, Bloco"
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Bairro *</label>
                    <input
                      type="text"
                      required
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Seu bairro"
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">CEP</label>
                    <input
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="00000-000"
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                {fulfillment === 'delivery' ? '4. Forma de Pagamento' : '3. Forma de Pagamento'}
              </h2>

              <p className="text-xs text-slate-500">
                O pagamento é feito diretamente ao estabelecimento no recebimento ou via chave Pix da loja.
              </p>

              {acceptedPaymentMethods.length === 0 && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900">
                  Este estabelecimento ainda não configurou as formas de pagamento. Entre em contato com a loja para concluir o pedido.
                </div>
              )}

              <div className="space-y-2">
                {acceptedPaymentMethods.includes('pix_direct') && (
                  <label className={`block p-3.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    paymentMethod === 'pix_direct' ? 'border-orange-500 bg-orange-50/40' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="pix_direct"
                          checked={paymentMethod === 'pix_direct'}
                          onChange={() => setPaymentMethod('pix_direct')}
                          className="text-orange-600 focus:ring-orange-500"
                        />
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold text-slate-900">Pix direto ao estabelecimento</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Sem taxas
                      </span>
                    </div>

                    {paymentMethod === 'pix_direct' && currentStore.pixKey && (
                      <div className="mt-3 pt-3 border-t border-orange-200/60 bg-white p-3 rounded-md space-y-2">
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Chave Pix do estabelecimento: <strong>{currentStore.name}</strong>
                        </p>
                        <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded border border-slate-200 font-mono text-xs">
                          <span className="truncate">{currentStore.pixKey}</span>
                          <button
                            type="button"
                            onClick={handleCopyPix}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 flex items-center gap-1 shrink-0"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          * Plazzio não processa ou divide este valor. O pagamento é realizado diretamente entre você e o comerciante.
                        </p>
                      </div>
                    )}
                  </label>
                )}

                {acceptedPaymentMethods.includes('card_on_delivery') && (
                  <label className={`block p-3.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    paymentMethod === 'card_on_delivery' ? 'border-orange-500 bg-orange-50/40' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card_on_delivery"
                        checked={paymentMethod === 'card_on_delivery'}
                        onChange={() => setPaymentMethod('card_on_delivery')}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-slate-900">Cartão de Crédito ou Débito na entrega</span>
                      </div>
                    </div>
                  </label>
                )}

                {acceptedPaymentMethods.includes('money_on_delivery') && (
                  <label className={`block p-3.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    paymentMethod === 'money_on_delivery' ? 'border-orange-500 bg-orange-50/40' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="money_on_delivery"
                        checked={paymentMethod === 'money_on_delivery'}
                        onChange={() => setPaymentMethod('money_on_delivery')}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-slate-900">Dinheiro na entrega</span>
                      </div>
                    </div>

                    {paymentMethod === 'money_on_delivery' && (
                      <div className="mt-3 pt-3 border-t border-orange-200/60 flex items-center gap-2">
                        <span className="text-slate-600 text-xs">Precisa de troco para quanto?</span>
                        <input
                          type="text"
                          value={cashChange}
                          onChange={(e) => setCashChange(e.target.value)}
                          placeholder="Ex: R$ 100,00"
                          className="p-1.5 border border-slate-200 rounded text-xs w-32 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    )}
                  </label>
                )}
              </div>
            </div>

            {/* General Order Notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
              <label className="text-sm font-bold text-slate-900 uppercase tracking-wider block">
                Instruções para o entregador / restaurante
              </label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ex: Tocar o interfone 42, deixar na portaria se demorar..."
                rows={2}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 text-slate-800"
              />
            </div>
          </div>

          {/* Right Column: Order Summary Card */}
          <div>
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md space-y-4 sticky top-24">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Resumo da Compra
              </h3>

              <div className="text-xs text-slate-600 pb-3 border-b border-slate-100">
                <span>Loja:</span> <strong className="text-slate-900">{currentStore.name}</strong>
              </div>

              {/* Items List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                {items.map(item => (
                  <div key={item.id} className="py-2.5 flex justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.quantity}x {item.name}
                      </p>
                      {item.selectedVariant && (
                        <p className="text-[11px] text-slate-500">{item.selectedVariant.name}</p>
                      )}
                      {item.selectedAddOns?.map(a => (
                        <p key={a.id} className="text-[10px] text-slate-400">+ {a.name}</p>
                      ))}
                    </div>
                    <span className="font-bold text-slate-800 shrink-0">
                      {formatBRL(item.itemTotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Math totals */}
              <div className="space-y-2 pt-3 border-t border-slate-200 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-900">{formatBRL(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxa de entrega</span>
                  <span className="font-medium text-slate-900">
                    {fulfillment === 'delivery' ? formatBRL(deliveryFee) : 'Grátis'}
                  </span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span className="text-orange-600">{formatBRL(effectiveTotal)}</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pedido persistido no Firestore com integridade garantida.</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-400"
              >
                {submitting ? (
                  <span>Registrando pedido...</span>
                ) : (
                  <>
                    <span>Confirmar e Enviar Pedido</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
