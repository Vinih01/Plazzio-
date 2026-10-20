import React, { useState } from 'react';
import { Store, PaymentMethod, OperatingHours, OperatingHoursDay } from '../../types';
import { updateStore, updateStoreStatus } from '../../services/storeService';
import { saveStoreImage, StoreImage } from '../../services/imageLibraryService';
import { formatBRL, getStoreStatusMeta, DAYS_OF_WEEK } from '../../lib/utils';
import { ArrowLeft, Save, CheckCircle2, AlertCircle, RefreshCw, Upload, X, Clock, Copy } from 'lucide-react';

interface MerchantSettingsPageProps {
  store: Store;
  onBackToDashboard: () => void;
  onStoreUpdated: (updatedStore: Store) => void;
}

interface DayScheduleFormState {
  open: string;
  close: string;
  closed: boolean;
}

export const MerchantSettingsPage: React.FC<MerchantSettingsPageProps> = ({
  store,
  onBackToDashboard,
  onStoreUpdated
}) => {
  const [name, setName] = useState(store.name);
  const [description, setDescription] = useState(store.description);
  const [about, setAbout] = useState(store.about || '');
  const [phone, setPhone] = useState(store.phone || '');
  const [whatsappOrderNumber, setWhatsappOrderNumber] = useState(store.whatsappOrderNumber || '');
  const [businessAddress, setBusinessAddress] = useState(store.businessAddress);
  const [number, setNumber] = useState(store.number || '');
  const [complement, setComplement] = useState(store.complement || '');
  const [neighborhood, setNeighborhood] = useState(store.neighborhood || '');
  const [city, setCity] = useState(store.city || '');
  const [state, setState] = useState(store.state || '');
  const [zipCode, setZipCode] = useState(store.zipCode || '');
  const [deliveryFee, setDeliveryFee] = useState(store.deliveryFee.toString());
  const [minimumOrderValue, setMinimumOrderValue] = useState(store.minimumOrderValue.toString());
  const [pixKey, setPixKey] = useState(store.pixKey || '');
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<PaymentMethod[]>(store.acceptedPaymentMethods);
  const [logoUrl, setLogoUrl] = useState(store.logoUrl || '');
  const [coverUrl, setCoverUrl] = useState(store.coverUrl || '');

  // Initialize operating hours from store data or empty
  const initializeHours = (): Record<string, DayScheduleFormState> => {
    const initial: Record<string, DayScheduleFormState> = {};
    DAYS_OF_WEEK.forEach(day => {
      const existing = store.operatingHours?.[day.key] || store.operatingHours?.[day.altKey];
      if (existing) {
        initial[day.key] = {
          open: existing.open || '',
          close: existing.close || '',
          closed: Boolean(existing.closed),
        };
      } else {
        initial[day.key] = {
          open: '',
          close: '',
          closed: false,
        };
      }
    });
    return initial;
  };

  const [operatingHours, setOperatingHours] = useState<Record<string, DayScheduleFormState>>(initializeHours);

  const handleDayChange = (
    dayKey: string,
    field: 'open' | 'close' | 'closed',
    value: string | boolean
  ) => {
    setOperatingHours(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value,
      },
    }));
  };

  const handleCopyMondayToWeekdays = () => {
    const mon = operatingHours.segunda;
    if (!mon.closed && (!mon.open || !mon.close)) {
      setErrorMsg('Preencha os horários de Segunda-feira antes de replicar.');
      return;
    }
    setOperatingHours(prev => ({
      ...prev,
      terca: { ...mon },
      quarta: { ...mon },
      quinta: { ...mon },
      sexta: { ...mon },
    }));
    setSuccessMsg('Horários de Segunda replicados para Terça a Sexta!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      if (type === 'logo') setLogoUrl(result);
      else setCoverUrl(result);
      
      const newImg: StoreImage = {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        storeId: store.id,
        url: result,
        fileName: file.name,
        createdAt: new Date().toISOString()
      };
      await saveStoreImage(newImg);
    };
    reader.readAsDataURL(file);
  };
  
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleTogglePaymentMethod = (method: PaymentMethod) => {
    if (acceptedPaymentMethods.includes(method)) {
      if (acceptedPaymentMethods.length > 1) {
        setAcceptedPaymentMethods(acceptedPaymentMethods.filter(m => m !== method));
      }
    } else {
      setAcceptedPaymentMethods([...acceptedPaymentMethods, method]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Validate operating hours
    const hasAnyHourConfigured = DAYS_OF_WEEK.some(d => {
      const s = operatingHours[d.key];
      return s.closed || (s.open && s.open.trim() !== '') || (s.close && s.close.trim() !== '');
    });

    if (hasAnyHourConfigured) {
      for (const day of DAYS_OF_WEEK) {
        const schedule = operatingHours[day.key];
        if (!schedule.closed) {
          if (!schedule.open || !schedule.close || schedule.open.trim() === '' || schedule.close.trim() === '') {
            setErrorMsg(`No dia ${day.label}, informe os horários de abertura e fechamento, ou marque como "Fechado neste dia".`);
            setSaving(false);
            return;
          }
          if (schedule.open.trim() === schedule.close.trim()) {
            setErrorMsg(`No dia ${day.label}, o horário de abertura (${schedule.open}) deve ser diferente do horário de fechamento.`);
            setSaving(false);
            return;
          }
        }
      }
    }

    const formattedOperatingHours: OperatingHours = {};
    DAYS_OF_WEEK.forEach(day => {
      const s = operatingHours[day.key];
      const dayData = {
        open: s.closed ? '' : s.open.trim(),
        close: s.closed ? '' : s.close.trim(),
        closed: Boolean(s.closed),
      };
      formattedOperatingHours[day.key] = dayData;
      formattedOperatingHours[day.altKey] = dayData;
    });

    try {
      const updates: Partial<Store> = {
        name: name.trim(),
        description: description.trim(),
        about: about.trim(),
        phone: phone.trim(),
        whatsappOrderNumber: whatsappOrderNumber.trim(),
        businessAddress: businessAddress.trim(),
        number: number.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim(),
        deliveryFee: parseFloat(deliveryFee) || 0,
        minimumOrderValue: parseFloat(minimumOrderValue) || 0,
        pixKey: pixKey.trim(),
        acceptedPaymentMethods,
        logoUrl: logoUrl.trim(),
        coverUrl: coverUrl.trim(),
        operatingHours: formattedOperatingHours,
      };

      await updateStore(store.id, updates);
      const updated = { ...store, ...updates };
      onStoreUpdated(updated);
      setSuccessMsg('Configurações salvas com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      console.error('Error updating store:', e);
      setErrorMsg(e?.message || 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleResubmit = async () => {
    setSaving(true);
    try {
      await updateStoreStatus(store.id, 'pending_review');
      const updated = { ...store, status: 'pending_review' as const };
      onStoreUpdated(updated);
      setSuccessMsg('Loja enviada para análise da moderação com sucesso!');
    } catch (e) {
      console.error('Error submitting store for review:', e);
      setErrorMsg('Falha ao reenviar para análise.');
    } finally {
      setSaving(false);
    }
  };

  const statusMeta = getStoreStatusMeta(store.status);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <button
            onClick={onBackToDashboard}
            className="text-xs text-slate-500 hover:text-slate-800 mb-1"
          >
            ← Voltar ao painel
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Configurações da Loja
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Edite os parâmetros de operação, taxa de entrega e chave Pix.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-bold ${statusMeta.bgClass} ${statusMeta.textClass}`}>
                {statusMeta.label}
              </span>
              {['draft', 'rejected'].includes(store.status) && (
                <button
                  type="button"
                  onClick={handleResubmit}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Enviar para Análise
                </button>
              )}
            </div>
          </div>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Identificação & Contato
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nome do Estabelecimento *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">WhatsApp para Pedidos (Ex: 5511999999999) *</label>
                <input
                  type="text"
                  value={whatsappOrderNumber}
                  onChange={(e) => setWhatsappOrderNumber(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  placeholder="5511999999999"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Descrição Comercial</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Rua/Avenida *</label>
              <input
                type="text"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Número *</label>
                <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Complemento</label>
                <input type="text" value={complement} onChange={(e) => setComplement(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Bairro *</label>
              <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Cidade</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Estado</label>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">CEP</label>
                <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Sobre a loja</label>
              <textarea
                rows={4}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Horários de Funcionamento */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Horários de Funcionamento
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure os horários de abertura e fechamento para cada dia da semana (formato 24 horas).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyMondayToWeekdays}
                className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer p-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                title="Copiar horário de Segunda-feira para Terça, Quarta, Quinta e Sexta"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Replicar Segunda p/ Ter-Sex</span>
              </button>
            </div>

            <div className="bg-slate-50/70 border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
              {DAYS_OF_WEEK.map(day => {
                const schedule = operatingHours[day.key];
                return (
                  <div
                    key={day.key}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      schedule.closed ? 'bg-slate-100/60 opacity-80' : 'hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between sm:justify-start gap-4 sm:w-56 shrink-0">
                      <span className="text-xs font-bold text-slate-900">{day.label}</span>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 select-none">
                        <input
                          type="checkbox"
                          checked={schedule.closed}
                          onChange={(e) => handleDayChange(day.key, 'closed', e.target.checked)}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer"
                        />
                        <span>Fechado neste dia</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 flex-1 sm:justify-end">
                      {schedule.closed ? (
                        <div className="text-xs font-medium text-slate-400 italic py-1">
                          Fechado
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500 font-medium">Abertura:</span>
                            <input
                              type="time"
                              disabled={schedule.closed}
                              value={schedule.open}
                              onChange={(e) => handleDayChange(day.key, 'open', e.target.value)}
                              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </div>

                          <span className="text-xs text-slate-400">às</span>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500 font-medium">Fechamento:</span>
                            <input
                              type="time"
                              disabled={schedule.closed}
                              value={schedule.close}
                              onChange={(e) => handleDayChange(day.key, 'close', e.target.value)}
                              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery & Minimum Order */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Operação de Delivery
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Taxa de Entrega Fixa (R$)</label>
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
                <label className="block text-slate-700 font-medium mb-1">Valor Mínimo do Pedido (R$)</label>
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

            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Personalizar minha loja
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-slate-700 font-medium">Logo da loja</label>
                  {logoUrl ? (
                    <div className="relative w-32 h-32 border border-slate-200 rounded-lg overflow-hidden">
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      <button type="button" onClick={() => setLogoUrl('')} className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-xs"><X className="w-4 h-4 text-red-600" /></button>
                    </div>
                  ) : (
                    <label className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                      <Upload className="w-6 h-6 text-slate-400" />
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} className="hidden" />
                    </label>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-slate-700 font-medium">Foto de capa</label>
                  {coverUrl ? (
                    <div className="relative w-full h-32 border border-slate-200 rounded-lg overflow-hidden">
                      <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setCoverUrl('')} className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-xs"><X className="w-4 h-4 text-red-600" /></button>
                    </div>
                  ) : (
                    <label className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                      <Upload className="w-6 h-6 text-slate-400" />
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payments & Pix */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Formas de Pagamento & Chave Pix
            </h2>

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

            {acceptedPaymentMethods.includes('pix_direct') && (
              <div>
                <label className="block text-slate-700 font-medium mb-1">Chave Pix Comercial</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="E-mail, CNPJ, Celular ou chave aleatória"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer disabled:bg-slate-400"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
