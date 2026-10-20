import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';
import { createStore } from '../../services/storeService';
import { createProduct } from '../../services/productService';
import { Store, Product, BusinessType, PaymentMethod } from '../../types';
import { INITIAL_SEGMENTS, INITIAL_CATEGORIES } from '../../services/mockDemoData';
import { slugify, formatBRL } from '../../lib/utils';
import { 
  Building2, 
  Store as StoreIcon, 
  Clock, 
  ShoppingBag, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  Trash2, 
  AlertCircle 
} from 'lucide-react';

interface MerchantOnboardingPageProps {
  initialPlan?: string;
  onSuccess: (storeId: string) => void;
  onCancel: () => void;
}

export const MerchantOnboardingPage: React.FC<MerchantOnboardingPageProps> = ({
  initialPlan,
  onSuccess,
  onCancel
}) => {
  const { currentUser, signInWithGoogle, updateUserRole } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1: Account
  const [ownerName, setOwnerName] = useState(currentUser?.displayName || '');
  const [ownerEmail, setOwnerEmail] = useState(currentUser?.email || '');

  // Step 2: Commercial Info
  const [storeName, setStoreName] = useState('');
  const [segmentId, setSegmentId] = useState('alimentacao');
  const [categoryId, setCategoryId] = useState('cat-restaurantes');
  const [businessType, setBusinessType] = useState<BusinessType>('Restaurante');
  const [taxId, setTaxId] = useState(''); // CNPJ or CPF
  const [phone, setPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');
  const [zipCode, setZipCode] = useState('');

  const handleSegmentChange = (newSegId: string) => {
    setSegmentId(newSegId);
    const matching = INITIAL_CATEGORIES.filter(c => c.segmentId === newSegId);
    if (matching.length > 0) {
      setCategoryId(matching[0].id);
      setBusinessType(matching[0].name as BusinessType);
    }
  };

  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const cat = INITIAL_CATEGORIES.find(c => c.id === newCatId);
    if (cat) {
      setBusinessType(cat.name as BusinessType);
    }
  };

  // Step 3: Public Profile
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('/src/assets/images/hero_marketplace_banner_1792074134241.jpg');

  // Step 4: Operation
  const [deliveryFee, setDeliveryFee] = useState('5.00');
  const [minimumOrderValue, setMinimumOrderValue] = useState('25.00');
  const [serviceAreasInput, setServiceAreasInput] = useState('Centro, Bairro Jardins, Vila Nova');
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<PaymentMethod[]>(['pix_direct', 'card_on_delivery']);
  const [pixKey, setPixKey] = useState('');

  // Step 5: Initial Catalog
  const [initialProducts, setInitialProducts] = useState<Array<{ name: string; description: string; price: string }>>([
    { name: 'Prato Especial da Casa', description: 'Nossa receita artesanal mais vendida e elogiada pelos clientes.', price: '38.00' }
  ]);

  useEffect(() => {
    if (currentUser) {
      if (!ownerName && currentUser.displayName) setOwnerName(currentUser.displayName);
      if (!ownerEmail && currentUser.email) setOwnerEmail(currentUser.email);
    }
  }, [currentUser]);

  const handleStoreNameChange = (name: string) => {
    setStoreName(name);
    setSlug(slugify(name));
  };

  const handleAddProduct = () => {
    setInitialProducts([...initialProducts, { name: '', description: '', price: '20.00' }]);
  };

  const handleRemoveProduct = (index: number) => {
    setInitialProducts(initialProducts.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: string, value: string) => {
    const updated = [...initialProducts];
    updated[index] = { ...updated[index], [field]: value };
    setInitialProducts(updated);
  };

  const handleTogglePaymentMethod = (method: PaymentMethod) => {
    if (acceptedPaymentMethods.includes(method)) {
      if (acceptedPaymentMethods.length > 1) {
        setAcceptedPaymentMethods(acceptedPaymentMethods.filter(m => m !== method));
      }
    } else {
      setAcceptedPaymentMethods([...acceptedPaymentMethods, method]);
    }
  };

  const handleSubmitOnboarding = async () => {
    setErrorMsg('');
    setSubmitting(true);

    const authenticatedUser = auth.currentUser;
    if (!authenticatedUser) {
      setErrorMsg('Sessão não autenticada: É necessário estar conectado com sua conta para vincular o estabelecimento.');
      setSubmitting(false);
      return;
    }

    try {
      const storeId = `store_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const ownerUid = authenticatedUser.uid;

      const areas = serviceAreasInput.split(',').map(s => s.trim()).filter(Boolean);

      const selectedSeg = INITIAL_SEGMENTS.find(s => s.id === segmentId);
      const selectedCat = INITIAL_CATEGORIES.find(c => c.id === categoryId);

      const newStore: Store = {
        id: storeId,
        ownerUid,
        name: storeName.trim(),
        slug: slug.trim() || slugify(storeName),
        description: description.trim(),
        businessType: (selectedCat?.name || businessType) as BusinessType,
        segmentId,
        segmentName: selectedSeg?.name || 'Alimentação',
        categoryId,
        categoryName: selectedCat?.name || 'Restaurantes',
        coverUrl,
        businessAddress: businessAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim(),
        phone: phone.trim(),
        serviceAreas: areas,
        operatingHours: {
          mon: { open: '11:00', close: '23:00', closed: false },
          tue: { open: '11:00', close: '23:00', closed: false },
          wed: { open: '11:00', close: '23:00', closed: false },
          thu: { open: '11:00', close: '23:00', closed: false },
          fri: { open: '11:00', close: '23:59', closed: false },
          sat: { open: '11:00', close: '23:59', closed: false },
          sun: { open: '11:00', close: '22:00', closed: false },
        },
        deliveryFee: parseFloat(deliveryFee) || 0,
        minimumOrderValue: parseFloat(minimumOrderValue) || 0,
        acceptedPaymentMethods,
        pixKey: pixKey.trim(),
        status: 'pending_review', // Submitted for platform review
        published: false,
        isDemo: false,
        planId: initialPlan || 'essencial',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await createStore(newStore);

      // Create initial catalog products
      for (const prod of initialProducts) {
        if (prod.name.trim()) {
          const prodId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const newProd: Product = {
            id: prodId,
            storeId,
            name: prod.name.trim(),
            description: prod.description.trim(),
            basePrice: parseFloat(prod.price) || 20,
            available: true,
            isDemo: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await createProduct(newProd);
        }
      }

      // Upgrade role to merchant
      await updateUserRole('merchant');

      onSuccess(storeId);
    } catch (err: unknown) {
      console.error('Error creating store:', err);
      let displayMessage = 'Não foi possível enviar o cadastro. Tente novamente.';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.userFriendlyMessage) {
            displayMessage = parsed.userFriendlyMessage;
          } else if (parsed.error) {
            displayMessage = parsed.error;
          }
        } catch {
          displayMessage = err.message;
        }
      }
      setErrorMsg(displayMessage);
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'Conta' },
    { num: 2, title: 'Dados Comerciais' },
    { num: 3, title: 'Perfil Público' },
    { num: 4, title: 'Operação & Pagamento' },
    { num: 5, title: 'Cardápio Inicial' },
    { num: 6, title: 'Revisão & Envio' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">
                Assistente de Credenciamento
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                Cadastrar Estabelecimento no Plazzio
              </h1>
            </div>
            <button
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </button>
          </div>

          {/* Stepper Dots */}
          <div className="grid grid-cols-6 gap-2">
            {steps.map(step => (
              <div key={step.num} className="space-y-1">
                <div className={`h-1.5 rounded-full ${
                  currentStep >= step.num ? 'bg-orange-600' : 'bg-slate-200'
                }`} />
                <span className={`text-[10px] hidden sm:block truncate ${
                  currentStep === step.num ? 'font-bold text-orange-600' : 'text-slate-400'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          {/* ETAPA 1: CONTA */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Etapa 1 — Conta do Responsável</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Identifique o proprietário ou gestor responsável pelo estabelecimento.
                </p>
              </div>

              {!currentUser ? (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
                  <p className="text-xs text-orange-950 font-medium">
                    Para vincular sua loja com segurança, faça login com sua conta Google.
                  </p>
                  <button
                    type="button"
                    onClick={() => signInWithGoogle()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <span>Entrar com Google</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Conectado como <strong>{currentUser.email}</strong></span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nome completo do responsável *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Ex: Carlos Oliveira"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">E-mail para notificações comerciais *</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="contato@minhaloja.com.br"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 2: INFORMAÇÕES COMERCIAIS */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Etapa 2 — Informações Comerciais</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Dados cadastrais e endereço físico do ponto comercial.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Nome do Estabelecimento *</label>
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => handleStoreNameChange(e.target.value)}
                      placeholder="Ex: Pizzaria Forno Nobre"
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Segmento Comercial *</label>
                    <select
                      value={segmentId}
                      onChange={(e) => handleSegmentChange(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white cursor-pointer"
                    >
                      {INITIAL_SEGMENTS.map(seg => (
                        <option key={seg.id} value={seg.id}>{seg.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Categoria do Estabelecimento *</label>
                    <select
                      value={categoryId}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white cursor-pointer"
                    >
                      {INITIAL_CATEGORIES.filter(c => c.segmentId === segmentId).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">CNPJ ou CPF do responsável *</label>
                    <input
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="00.000.000/0001-00"
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Telefone WhatsApp da Loja *</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Endereço Comercial Completo *</label>
                  <input
                    type="text"
                    required
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="Rua, Número, Bairro"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-slate-700 font-medium mb-1">Cidade *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Estado *</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3: PERFIL PÚBLICO */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Etapa 3 — Perfil Público na Plataforma</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Como seus clientes visualizarão sua loja no marketplace do Plazzio.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Link amigável (slug da loja) *</label>
                  <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                    <span className="px-3 text-slate-400 font-mono text-[11px]">plazzio.app/loja/</span>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(slugify(e.target.value))}
                      className="w-full p-2 bg-transparent focus:outline-none text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Descrição resumida da sua loja *</label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Conte o que torna sua comida especial, seus diferenciais e tradição..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4: OPERAÇÃO & PAGAMENTOS */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Etapa 4 — Operação & Meios de Pagamento</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Defina taxas, pedido mínimo e formas aceitas.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Taxa de Entrega Fixa (R$) *</label>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Valor do Pedido Mínimo (R$) *</label>
                    <input
                      type="number"
                      step="1.00"
                      min="0"
                      value={minimumOrderValue}
                      onChange={(e) => setMinimumOrderValue(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Bairros ou Regiões Atendidas (separadas por vírgula) *</label>
                  <input
                    type="text"
                    value={serviceAreasInput}
                    onChange={(e) => setServiceAreasInput(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-2">Formas de Pagamento Aceitas no Local *</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedPaymentMethods.includes('pix_direct')}
                        onChange={() => handleTogglePaymentMethod('pix_direct')}
                        className="text-orange-600 rounded"
                      />
                      <span>Pix direto ao estabelecimento</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedPaymentMethods.includes('card_on_delivery')}
                        onChange={() => handleTogglePaymentMethod('card_on_delivery')}
                        className="text-orange-600 rounded"
                      />
                      <span>Cartão na entrega (Maquininha)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedPaymentMethods.includes('money_on_delivery')}
                        onChange={() => handleTogglePaymentMethod('money_on_delivery')}
                        className="text-orange-600 rounded"
                      />
                      <span>Dinheiro na entrega</span>
                    </label>
                  </div>
                </div>

                {acceptedPaymentMethods.includes('pix_direct') && (
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Sua Chave Pix (E-mail, CPF, CNPJ ou Celular)</label>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Ex: financeiro@minhaloja.com.br"
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ETAPA 5: PRIMEIRO CARDÁPIO */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Etapa 5 — Primeiro Catálogo</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Cadastre pelo menos 1 produto inicial para inauguração.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Produto</span>
                </button>
              </div>

              <div className="space-y-4">
                {initialProducts.map((p, idx) => (
                  <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Item #{idx + 1}</span>
                      {initialProducts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-slate-600 font-medium mb-1">Nome do item *</label>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => handleProductChange(idx, 'name', e.target.value)}
                          placeholder="Ex: Pizza Calabresa Especial"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Preço base (R$) *</label>
                        <input
                          type="number"
                          step="0.50"
                          value={p.price}
                          onChange={(e) => handleProductChange(idx, 'price', e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Descrição dos ingredientes</label>
                      <input
                        type="text"
                        value={p.description}
                        onChange={(e) => handleProductChange(idx, 'description', e.target.value)}
                        placeholder="Ex: Molho rústico, calabresa fatiada, cebola e azeitonas pretas..."
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ETAPA 6: REVISÃO E ENVIO */}
          {currentStep === 6 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Etapa 6 — Revisão e Envio para Análise</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Confira as informações antes de submeter sua loja para aprovação pela moderação.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Estabelecimento:</span>
                    <strong className="text-slate-900">{storeName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tipo:</span>
                    <strong className="text-slate-900">{businessType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Cidade:</span>
                    <strong className="text-slate-900">{city} - {state}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Taxa de Entrega:</span>
                    <strong className="text-slate-900">{formatBRL(parseFloat(deliveryFee) || 0)}</strong>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Itens a serem publicados:</span>
                  <ul className="list-disc list-inside text-slate-700">
                    {initialProducts.filter(p => p.name.trim()).map((p, i) => (
                      <li key={i}>{p.name} — {formatBRL(parseFloat(p.price) || 0)}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-600">
                  <span>Conta proprietária vinculada:</span>
                  <strong className="text-slate-900 font-mono text-[11px]">{auth.currentUser?.email || ownerEmail}</strong>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                <strong>Status cadastral:</strong> Ao enviar, a loja entrará em <strong>Em Análise (pending_review)</strong>. Um administrador revisará os dados para publicação no marketplace.
              </div>
            </div>
          )}

          {/* Wizard Controls */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            ) : <div />}

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1) {
                    if (!ownerName.trim()) {
                      setErrorMsg('Informe o nome do responsável.');
                      return;
                    }
                    if (!auth.currentUser) {
                      setErrorMsg('É obrigatório fazer login com sua conta Google para vincular e cadastrar o estabelecimento com segurança.');
                      return;
                    }
                  }
                  if (currentStep === 2 && !storeName.trim()) {
                    setErrorMsg('Informe o nome do estabelecimento.');
                    return;
                  }
                  setErrorMsg('');
                  setCurrentStep(currentStep + 1);
                }}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <span>Avançar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitOnboarding}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:bg-slate-400"
              >
                {submitting ? 'Enviando cadastro...' : 'Submeter Loja para Análise'}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
