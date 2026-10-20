import React, { useState, useEffect } from 'react';
import { 
  GlobalOptionGroupTemplate, 
  ProductOptionGroup, 
  ProductOptionItem, 
  ProductType,
  Store
} from '../../types';
import { 
  getGlobalOptionTemplates, 
  instantiateTemplateForProduct,
  getStoreCustomOptionGroups,
  saveStoreCustomOptionGroup
} from '../../services/optionTemplateService';
import { Modal } from '../ui/Modal';
import { formatBRL } from '../../lib/utils';
import { 
  Plus, 
  Trash2, 
  Check, 
  Search, 
  Sparkles, 
  Layers, 
  Store as StoreIcon, 
  Sliders, 
  Edit3, 
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  Image as ImageIcon
} from 'lucide-react';

interface OptionGroupSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  productType?: ProductType;
  onSelectGroup: (group: ProductOptionGroup) => void;
  existingGroups?: ProductOptionGroup[];
}

export const OptionGroupSelectorModal: React.FC<OptionGroupSelectorModalProps> = ({
  isOpen,
  onClose,
  store,
  productType = 'prepared',
  onSelectGroup,
  existingGroups = []
}) => {
  const [activeTab, setActiveTab] = useState<'recommended' | 'catalog' | 'store_saved' | 'custom'>('recommended');
  const [templates, setTemplates] = useState<GlobalOptionGroupTemplate[]>([]);
  const [storeSavedGroups, setStoreSavedGroups] = useState<ProductOptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Currently editing/customizing group before applying
  const [editingGroup, setEditingGroup] = useState<ProductOptionGroup | null>(null);
  const [saveToStoreLibrary, setSaveToStoreLibrary] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setEditingGroup(null);
    }
  }, [isOpen, store.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allTemplates, customGroups] = await Promise.all([
        getGlobalOptionTemplates(),
        getStoreCustomOptionGroups(store.id)
      ]);
      setTemplates(allTemplates);
      setStoreSavedGroups(customGroups);
    } catch (e) {
      console.warn('Error loading templates:', e);
    } finally {
      setLoading(false);
    }
  };

  // Determine recommended templates based on store type & product type
  const recommendedTemplates = templates.filter(t => {
    const businessType = (store.businessType || '').toLowerCase();
    const segment = (store.segmentName || '').toLowerCase();

    const isAcaiOrDoceria = businessType.includes('doceria') || businessType.includes('sorvete') || segment.includes('açaí') || segment.includes('açai') || segment.includes('sorvete');
    const isPizzaria = businessType.includes('pizza') || segment.includes('pizza');
    const isBurger = businessType.includes('lanchonete') || businessType.includes('hamburguer') || segment.includes('hamburguer');
    const isRestaurante = businessType.includes('restaurante') || segment.includes('refeição') || segment.includes('marmita');
    const isBebidas = businessType.includes('bebidas') || businessType.includes('cafeteria');

    if (isAcaiOrDoceria && (t.id.startsWith('acai-') || t.id.startsWith('confeitaria-') || t.id === 'utensilios-descartaveis')) return true;
    if (isPizzaria && (t.id.startsWith('pizza-') || t.id === 'utensilios-descartaveis')) return true;
    if (isBurger && (t.id.startsWith('burger-') || t.id.startsWith('hotdog-') || t.id.startsWith('porcoes-') || t.id === 'utensilios-descartaveis')) return true;
    if (isRestaurante && (t.id.startsWith('marmita-') || t.id.startsWith('porcoes-') || t.id === 'utensilios-descartaveis')) return true;
    if (isBebidas && (t.id.startsWith('bebidas-') || t.id === 'utensilios-descartaveis')) return true;

    // Default to popular ones if generic
    return t.id.startsWith('acai-') || t.id.startsWith('burger-') || t.id.startsWith('pizza-') || t.id === 'utensilios-descartaveis';
  });

  const filteredCatalog = templates.filter(t => {
    if (categoryFilter !== 'all' && t.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return t.name.toLowerCase().includes(q) || 
             (t.description && t.description.toLowerCase().includes(q)) ||
             t.options.some(o => o.name.toLowerCase().includes(q));
    }
    return true;
  });

  const handleSelectTemplate = (template: GlobalOptionGroupTemplate) => {
    const instantiated = instantiateTemplateForProduct(template);
    setEditingGroup(instantiated);
  };

  const handleSelectStoreCustom = (group: ProductOptionGroup) => {
    // Clone with fresh IDs
    const cloned: ProductOptionGroup = {
      ...group,
      id: `pog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      options: group.options.map((opt, i) => ({
        ...opt,
        id: `opt_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`
      }))
    };
    setEditingGroup(cloned);
  };

  const handleStartCustomGroup = () => {
    const custom: ProductOptionGroup = {
      id: `pog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: '',
      description: '',
      required: false,
      minSelect: 0,
      maxSelect: 1,
      selectionType: 'single',
      sortOrder: (existingGroups.length || 0) + 1,
      options: [
        {
          id: `opt_${Date.now()}_0`,
          name: '',
          price: 0,
          available: true,
          sortOrder: 1
        }
      ]
    };
    setEditingGroup(custom);
  };

  const handleApplyGroup = async () => {
    if (!editingGroup) return;
    if (!editingGroup.name.trim()) {
      alert('Por favor, informe o nome do grupo de opções.');
      return;
    }
    const validOptions = editingGroup.options.filter(o => o.name.trim().length > 0);
    if (validOptions.length === 0) {
      alert('Adicione ao menos uma opção válida.');
      return;
    }

    const finalGroup: ProductOptionGroup = {
      ...editingGroup,
      options: validOptions
    };

    console.log("Final group to be applied:", finalGroup);

    if (saveToStoreLibrary) {
      try {
        await saveStoreCustomOptionGroup(store.id, finalGroup);
      } catch (e) {
        console.warn('Could not save to store library:', e);
      }
    }

    onSelectGroup(finalGroup);
    onClose();
  };

  // Option mutation helpers
  const handleUpdateOption = (index: number, updates: Partial<ProductOptionItem>) => {
    if (!editingGroup) return;
    const nextOptions = [...editingGroup.options];
    nextOptions[index] = { ...nextOptions[index], ...updates };
    setEditingGroup({ ...editingGroup, options: nextOptions });
  };

  const handleAddOption = () => {
    if (!editingGroup) return;
    const newOpt: ProductOptionItem = {
      id: `opt_${Date.now()}_${editingGroup.options.length}`,
      name: '',
      price: 0,
      available: true,
      sortOrder: editingGroup.options.length + 1
    };
    setEditingGroup({
      ...editingGroup,
      options: [...editingGroup.options, newOpt]
    });
  };

  const handleRemoveOption = (index: number) => {
    if (!editingGroup) return;
    const nextOptions = editingGroup.options.filter((_, i) => i !== index);
    setEditingGroup({ ...editingGroup, options: nextOptions });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingGroup ? `Configurar Grupo: ${editingGroup.name || 'Novo Grupo'}` : "Adicionar Grupo de Opções e Sabores"}
      maxWidth="2xl"
    >
      {editingGroup ? (
        // ==========================================
        // STEP 2: CUSTOMIZE & PRICE THE SELECTED GROUP
        // ==========================================
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <button
              onClick={() => setEditingGroup(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar aos modelos</span>
            </button>
            <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
              Configuração Local do Produto
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Nome do Grupo de Escolha *
              </label>
              <input
                type="text"
                value={editingGroup.name}
                onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                placeholder="Ex: Sabores, Coberturas, Cremes, Borda..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-semibold text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Instrução ao Cliente (Descrição)
              </label>
              <input
                type="text"
                value={editingGroup.description || ''}
                onChange={e => setEditingGroup({ ...editingGroup, description: e.target.value })}
                placeholder="Ex: Escolha até 3 bolas ou 1 sabor..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 text-slate-700"
              />
            </div>
          </div>

          {/* Rule settings */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tipo de Seleção
              </label>
              <select
                value={editingGroup.selectionType}
                onChange={e => {
                  const sel = e.target.value as 'single' | 'multiple';
                  setEditingGroup({
                    ...editingGroup,
                    selectionType: sel,
                    maxSelect: sel === 'single' ? 1 : Math.max(editingGroup.maxSelect, 2),
                    minSelect: sel === 'single' && editingGroup.required ? 1 : editingGroup.minSelect
                  });
                }}
                className="w-full bg-white p-2 border border-slate-200 rounded-lg font-semibold text-slate-800"
              >
                <option value="single">Seleção Única (1 opção)</option>
                <option value="multiple">Múltipla Seleção (Várias)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Obrigatório?
              </label>
              <select
                value={editingGroup.required ? 'yes' : 'no'}
                onChange={e => {
                  const isReq = e.target.value === 'yes';
                  setEditingGroup({
                    ...editingGroup,
                    required: isReq,
                    minSelect: isReq ? Math.max(1, editingGroup.minSelect) : 0
                  });
                }}
                className="w-full bg-white p-2 border border-slate-200 rounded-lg font-semibold text-slate-800"
              >
                <option value="yes">Sim (Obrigatório)</option>
                <option value="no">Não (Opcional)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Mínimo de Escolhas
              </label>
              <input
                type="number"
                min="0"
                max={editingGroup.maxSelect}
                value={editingGroup.minSelect}
                onChange={e => setEditingGroup({ ...editingGroup, minSelect: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full bg-white p-2 border border-slate-200 rounded-lg font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Máximo de Escolhas
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={editingGroup.maxSelect}
                onChange={e => setEditingGroup({ ...editingGroup, maxSelect: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full bg-white p-2 border border-slate-200 rounded-lg font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Opções Disponíveis e Preço Adicional ({editingGroup.options.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Defina o preço adicional que sua loja cobrará por cada opção (deixe 0 para opções inclusas).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddOption}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Opção</span>
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 border border-slate-200 rounded-xl p-3 bg-white">
              {editingGroup.options.map((opt, index) => (
                <div
                  key={opt.id || index}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-[11px] font-bold text-slate-400 w-5 text-center">
                    {index + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={opt.name}
                      onChange={e => handleUpdateOption(index, { name: e.target.value })}
                      placeholder="Nome da opção (Ex: Creme de Ninho, Chocolate, etc.)"
                      className="w-full text-xs font-medium bg-white p-1.5 border border-slate-200 rounded focus:border-orange-500 text-slate-900"
                    />
                  </div>

                  <div className="w-28">
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">R$</span>
                      <input
                        type="number"
                        step="0.50"
                        min="0"
                        value={opt.price}
                        onChange={e => handleUpdateOption(index, { price: Math.max(0, parseFloat(e.target.value) || 0) })}
                        placeholder="0.00"
                        className="w-full text-xs font-bold pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded text-slate-900 focus:border-orange-500 text-right"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opt.available !== false}
                      onChange={e => handleUpdateOption(index, { available: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span>Ativo</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Remover opção"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToStoreLibrary}
                onChange={e => setSaveToStoreLibrary(e.target.checked)}
                className="rounded text-orange-600 focus:ring-orange-500"
              />
              <span>Salvar também na biblioteca da loja (reutilizável em outros produtos)</span>
            </label>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyGroup}
                className="flex-1 sm:flex-none px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Aplicar Grupo ao Produto
              </button>
            </div>
          </div>
        </div>
      ) : (
        // ==========================================
        // STEP 1: CHOOSE A TEMPLATE OR START CUSTOM
        // ==========================================
        <div className="space-y-4">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('recommended')}
              className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'recommended'
                  ? 'border-orange-600 text-orange-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Sugeridos ({recommendedTemplates.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('catalog')}
              className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'border-orange-600 text-orange-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Biblioteca Global ({templates.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('store_saved')}
              className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'store_saved'
                  ? 'border-orange-600 text-orange-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <StoreIcon className="w-4 h-4" />
              <span>Salvos da Minha Loja ({storeSavedGroups.length})</span>
            </button>

            <button
              onClick={handleStartCustomGroup}
              className="pb-2.5 ml-auto flex items-center gap-1.5 text-slate-700 hover:text-orange-600 transition-colors cursor-pointer whitespace-nowrap font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Grupo do Zero</span>
            </button>
          </div>

          {/* Search bar when viewing Catalog */}
          {activeTab === 'catalog' && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Pesquisar por sabores, coberturas, cremes, recheios..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-xs p-2 border border-slate-200 rounded-lg bg-white font-medium text-slate-700"
              >
                <option value="all">Todas as Categorias</option>
                <option value="sabores">Sabores</option>
                <option value="coberturas">Coberturas</option>
                <option value="cremes">Cremes e Pastas</option>
                <option value="frutas">Frutas</option>
                <option value="caldas">Caldas</option>
                <option value="bordas">Bordas de Pizza</option>
                <option value="paes">Pães</option>
                <option value="molhos">Molhos</option>
                <option value="proteinas">Proteínas</option>
                <option value="recheios">Recheios</option>
                <option value="utensilios">Utensílios</option>
              </select>
            </div>
          )}

          {/* Content Lists */}
          <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Carregando catálogo de opções...
              </div>
            ) : activeTab === 'recommended' ? (
              recommendedTemplates.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Nenhum modelo específico sugerido para este segmento. Veja a aba "Biblioteca Global".
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recommendedTemplates.map(template => (
                    <div
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-orange-500 bg-white hover:bg-orange-50/20 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                            {template.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                            {template.options.length} opções
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {template.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">
                          {template.required ? 'Obrigatório' : 'Opcional'} • {template.selectionType === 'single' ? 'Escolha 1' : `Até ${template.maxSelect}`}
                        </span>
                        <span className="font-bold text-orange-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Selecionar</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : activeTab === 'catalog' ? (
              filteredCatalog.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Nenhum modelo encontrado com estes filtros.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredCatalog.map(template => (
                    <div
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-orange-500 bg-white hover:bg-orange-50/20 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                            {template.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                            {template.options.length} opções
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {template.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">
                          {template.required ? 'Obrigatório' : 'Opcional'} • {template.selectionType === 'single' ? 'Escolha 1' : `Até ${template.maxSelect}`}
                        </span>
                        <span className="font-bold text-orange-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Usar modelo</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Store saved groups
              storeSavedGroups.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                  <p>Sua loja ainda não possui grupos salvos na biblioteca própria.</p>
                  <p className="text-[11px] text-slate-400">
                    Você pode escolher um modelo global ou criar um novo grupo e marcar a opção "Salvar na biblioteca da loja".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {storeSavedGroups.map(group => (
                    <div
                      key={group.id}
                      onClick={() => handleSelectStoreCustom(group)}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-orange-500 bg-white hover:bg-orange-50/20 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                            {group.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                            {group.options.length} opções salvas
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {group.description || 'Grupo salvo pela loja'}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">
                          {group.required ? 'Obrigatório' : 'Opcional'}
                        </span>
                        <span className="font-bold text-orange-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Reutilizar</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
