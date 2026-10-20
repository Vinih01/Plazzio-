import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Product, ProductVariant, ProductAddOn, StoreCategory, AddOnGroup, ProductType, SaleUnit, MeasureProfile, PackagingType, ProductOptionGroup, ProductOptionItem, Store } from '../../types';
import { getProductsByStore, createProduct, updateProduct, deleteProduct, migrateStoreProductsWithCategoryOptions } from '../../services/productService';
import { getStoreCategories, createStoreCategory, deleteStoreCategory } from '../../services/storeCategoryService';
import { getAddOnGroups, createAddOnGroup, deleteAddOnGroup } from '../../services/addOnGroupService';
import { getStoreImages, saveStoreImage, deleteStoreImage, StoreImage } from '../../services/imageLibraryService';
import { getCustomTypes, createCustomType, deleteCustomType, CustomProductType } from '../../services/customTypeService';
import { getStoreById } from '../../services/storeService';
import { getStoreCustomOptionGroups, deleteStoreCustomOptionGroup, getDefaultOptionGroupsForCategory, seedGlobalOptionTemplates } from '../../services/optionTemplateService';
import { OptionGroupSelectorModal } from '../../components/merchant/OptionGroupSelectorModal';
import { formatBRL, slugify } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { 
  Plus, 
  Edit, 
  Trash2, 
  UtensilsCrossed, 
  Check, 
  X, 
  Search, 
  Upload, 
  Copy, 
  Layers, 
  Tag, 
  AlertCircle, 
  ArrowLeft,
  Package,
  Image as ImageIcon,
  Camera,
  FolderOpen,
  FileSpreadsheet,
  Sliders,
  Sparkles,
  Settings2,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

interface MerchantMenuPageProps {
  storeId: string;
  storeName: string;
  onBackToDashboard: () => void;
}

type TabType = 'products' | 'categories' | 'addons' | 'import';

const SUGGESTED_CATEGORIES = [
  'Pratos Principais', 'Pizzas', 'Hambúrgueres', 'Açaí', 'Bebidas', 'Refrigerantes', 'Sucos', 'Sobremesas', 'Porções', 'Combos', 'Especiais da casa'
];

export const MerchantMenuPage: React.FC<MerchantMenuPageProps> = ({
  storeId,
  storeName,
  onBackToDashboard
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [storeData, setStoreData] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [addOnGroups, setAddOnGroups] = useState<AddOnGroup[]>([]);
  const [storeCustomOptionGroups, setStoreCustomOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [storeImages, setStoreImages] = useState<StoreImage[]>([]);
  const [customTypes, setCustomTypes] = useState<CustomProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [pOptionGroups, setPOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [optionGroupSelectorOpen, setOptionGroupSelectorOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Product Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Form Fields
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pCategory, setPCategory] = useState('Pratos Principais');
  const [pType, setPType] = useState<string>('simple');
  const [pBasePrice, setPBasePrice] = useState('25.00');
  const [pUnitCost, setPUnitCost] = useState('10.00');
  const [pImageUrl, setPImageUrl] = useState('');
  const [pAvailable, setPAvailable] = useState(true);

  // Measurement Profile state
  const [pMeasureProfile, setPMeasureProfile] = useState<MeasureProfile>('none');
  const [pSlicesCount, setPSlicesCount] = useState<string>('');
  const [pMeasureValue, setPMeasureValue] = useState<string>('');
  const [pMeasureUnit, setPMeasureUnit] = useState<string>('ml');
  const [pPackagingType, setPPackagingType] = useState<string>('lata');
  const [pCustomUnitLabel, setPCustomUnitLabel] = useState<string>('');

  const [pVariants, setPVariants] = useState<ProductVariant[]>([]);
  const [pAddons, setPAddons] = useState<ProductAddOn[]>([]);
  const [newVarName, setNewVarName] = useState('');
  const [newVarPrice, setNewVarPrice] = useState('0');
  const [newVarSlices, setNewVarSlices] = useState('');
  const [newVarMeasureVal, setNewVarMeasureVal] = useState('');
  const [newVarMeasureUnit, setNewVarMeasureUnit] = useState('ml');
  const [newVarPkg, setNewVarPkg] = useState('lata');

  // Image Library Modal State
  const [imageLibraryOpen, setImageLibraryOpen] = useState(false);

  // Category Modal State
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');

  // Custom Type Modal State
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [typeBaseModel, setTypeBaseModel] = useState('simple');

  // Add-on Group Modal State
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMin, setGroupMin] = useState('0');
  const [groupMax, setGroupMax] = useState('1');
  const [groupRequired, setGroupRequired] = useState(false);
  const [groupOptions, setGroupOptions] = useState<{ id: string; name: string; price: number }[]>([]);
  const [optName, setOptName] = useState('');
  const [optPrice, setOptPrice] = useState('0');

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importReport, setImportReport] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [storeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedProducts, fetchedCategories, fetchedGroups, fetchedImages, fetchedTypes, fetchedStore, fetchedCustomOptions] = await Promise.all([
        getProductsByStore(storeId),
        getStoreCategories(storeId),
        getAddOnGroups(storeId),
        getStoreImages(storeId),
        getCustomTypes(storeId),
        getStoreById(storeId),
        getStoreCustomOptionGroups(storeId)
      ]);
      setProducts(fetchedProducts);
      setCategories(fetchedCategories);
      setAddOnGroups(fetchedGroups);
      setStoreImages(fetchedImages);
      setCustomTypes(fetchedTypes);
      setStoreData(fetchedStore);
      setStoreCustomOptionGroups(fetchedCustomOptions);

      if (fetchedCategories.length === 0) {
        // Seed initial default category
        const defaultCat: StoreCategory = {
          id: `cat_default`,
          storeId,
          name: 'Pratos Principais',
          sortOrder: 1,
          active: true
        };
        await createStoreCategory(defaultCat);
        setCategories([defaultCat]);
      }
    } catch (e) {
      console.error('Error loading merchant menu data:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === 'all' || p.categoryName === filterCategory;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'available' ? p.available : !p.available);
    return matchesSearch && matchesCat && matchesStatus;
  });

  const parseRawPrice = (val: unknown): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const s = String(val).replace(/R\$/g, '').trim();
    if (s.includes(',') && s.includes('.')) {
      return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    }
    if (s.includes(',')) {
      return parseFloat(s.replace(',', '.')) || 0;
    }
    return parseFloat(s) || 0;
  };

  const handleFileSelected = (file: File) => {
    setImportFile(file);
    const isCsvOrText = file.name.endsWith('.csv') || file.name.endsWith('.txt');

    const processJsonRows = (jsonData: any[][]) => {
      if (!jsonData || jsonData.length === 0) return;
      
      const firstRow = jsonData[0];
      if (!Array.isArray(firstRow)) return;

      const headers = firstRow.map(h => String(h || '').trim().toLowerCase());
      const nameIdx = headers.findIndex(h => /nome|produto|item|titulo/i.test(h));
      const descIdx = headers.findIndex(h => /descri|detalhe|ingrediente/i.test(h));
      const catIdx = headers.findIndex(h => /cat|secao|grupo/i.test(h));
      const priceIdx = headers.findIndex(h => /pre|valor|preco|custo/i.test(h));

      const hasHeader = nameIdx !== -1 || priceIdx !== -1 || catIdx !== -1;
      const rows = hasHeader ? jsonData.slice(1) : jsonData;

      const finalNameIdx = nameIdx !== -1 ? nameIdx : 0;
      const finalDescIdx = descIdx !== -1 ? descIdx : 1;
      const finalCatIdx = catIdx !== -1 ? catIdx : 2;
      const finalPriceIdx = priceIdx !== -1 ? priceIdx : 3;

      const parsed = rows
        .map((row: any) => {
          if (!row || !Array.isArray(row)) return null;
          const name = String(row[finalNameIdx] || '').trim();
          if (!name || /^(nome|produto|item)/i.test(name)) return null;

          return {
            name,
            description: String(row[finalDescIdx] || '').trim(),
            categoryName: String(row[finalCatIdx] || '').trim() || 'Geral',
            basePrice: parseRawPrice(row[finalPriceIdx]),
          };
        })
        .filter(Boolean) as Array<{ name: string; description: string; categoryName: string; basePrice: number }>;

      setImportPreview(parsed);
    };

    if (isCsvOrText) {
      // Read as text to handle Brazilian semicolon or comma CSV encoding cleanly
      const textReader = new FileReader();
      textReader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length === 0) return;

        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
        const rows = lines.map(line => line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, '')));
        processJsonRows(rows);
      };
      textReader.readAsText(file, 'utf-8');
    } else {
      // Excel files (.xlsx, .xls)
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          processJsonRows(jsonData);
        } catch (err) {
          console.error('Error reading Excel spreadsheet:', err);
          alert('Não foi possível ler o arquivo Excel. Verifique se o formato é válido.');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const [syncingOptions, setSyncingOptions] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSyncCategoryOptionsAcrossStore = async () => {
    if (!confirm('Deseja associar automaticamente os grupos de opções padrão às categorias dos produtos compatíveis que ainda não possuem complementos? Produtos já configurados não serão alterados.')) {
      return;
    }
    setSyncingOptions(true);
    setSyncFeedback(null);
    try {
      await seedGlobalOptionTemplates(false);
      const res = await migrateStoreProductsWithCategoryOptions(storeId);
      await loadData();
      setSyncFeedback(
        res.migratedCount > 0 
          ? `Sucesso: ${res.migratedCount} produto(s) atualizados com complementos compatíveis de suas categorias!`
          : 'Todos os produtos compatíveis já possuem grupos de opções configurados.'
      );
    } catch (err) {
      console.error('Error during options sync:', err);
      setSyncFeedback('Ocorreu um erro ao sincronizar os grupos de opções.');
    } finally {
      setSyncingOptions(false);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setPName('');
    setPDesc('');
    const initialCategory = categories[0]?.name || 'Pratos Principais';
    setPCategory(initialCategory);
    setPType('simple');
    setPBasePrice('25.00');
    setPUnitCost('10.00');
    setPImageUrl('');
    setPAvailable(true);
    setPMeasureProfile('none');
    setPSlicesCount('');
    setPMeasureValue('');
    setPMeasureUnit('ml');
    setPPackagingType('lata');
    setPCustomUnitLabel('');
    setPVariants([]);
    setPAddons([]);
    // Automatic category association: populate initial compatible default groups
    const defaults = getDefaultOptionGroupsForCategory(initialCategory, '');
    setPOptionGroups(defaults);
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setPName(p.name);
    setPDesc(p.description);
    const cat = p.categoryName || categories[0]?.name || 'Pratos Principais';
    setPCategory(cat);
    setPType(p.productType || 'simple');
    setPBasePrice(p.basePrice.toString());
    setPUnitCost((p.unitCost ?? 10).toString());
    setPImageUrl(p.imageUrl || '');
    setPAvailable(p.available);
    setPMeasureProfile(p.measureProfile || 'none');
    setPSlicesCount(p.slicesCount?.toString() || '');
    setPMeasureValue(p.measureValue?.toString() || '');
    setPMeasureUnit(p.measureUnit || 'ml');
    setPPackagingType(p.packagingType || 'lata');
    setPCustomUnitLabel(p.customUnitLabel || '');
    setPVariants(p.variants || []);
    setPAddons(p.addOns || []);
    // If existing product already has groups, keep them. Otherwise, if compatible defaults exist, auto-suggest them
    if (p.optionGroups && p.optionGroups.length > 0) {
      setPOptionGroups(p.optionGroups);
    } else {
      const defaults = getDefaultOptionGroupsForCategory(cat, p.name);
      setPOptionGroups(defaults);
    }
    setProductModalOpen(true);
  };

  const handleCategoryChange = (newCat: string) => {
    setPCategory(newCat);
    // If no option groups currently configured, auto-apply compatible default option groups
    if (pOptionGroups.length === 0) {
      const defaults = getDefaultOptionGroupsForCategory(newCat, pName);
      if (defaults.length > 0) {
        setPOptionGroups(defaults);
      }
    }
  };

  const handleAddManualGroup = () => {
    const newGroup: ProductOptionGroup = {
      id: `pog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Novo Grupo de Opções',
      description: '',
      required: false,
      selectionType: 'multiple',
      minSelect: 0,
      maxSelect: 3,
      sortOrder: pOptionGroups.length + 1,
      options: [
        {
          id: `opt_${Date.now()}_1`,
          name: 'Opção 1',
          price: 0,
          available: true,
          sortOrder: 1,
        }
      ]
    };
    setPOptionGroups(prev => [...prev, newGroup]);
  };

  const handleUpdateGroup = (groupIndex: number, updates: Partial<ProductOptionGroup>) => {
    setPOptionGroups(prev => {
      const next = [...prev];
      next[groupIndex] = { ...next[groupIndex], ...updates };
      return next;
    });
  };

  const handleDeleteGroup = (groupIndex: number) => {
    console.log("handleDeleteGroup called with index:", groupIndex);
    setPOptionGroups(prev => {
      console.log("Current groups:", prev);
      const filtered = prev.filter((_, idx) => idx !== groupIndex);
      console.log("Filtered groups:", filtered);
      return filtered;
    });
  };

  const handleMoveGroup = (groupIndex: number, direction: 'up' | 'down') => {
    setPOptionGroups(prev => {
      if (direction === 'up' && groupIndex === 0) return prev;
      if (direction === 'down' && groupIndex === prev.length - 1) return prev;
      const target = direction === 'up' ? groupIndex - 1 : groupIndex + 1;
      const next = [...prev];
      const temp = next[groupIndex];
      next[groupIndex] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const handleAddOptionToGroup = (groupIndex: number) => {
    setPOptionGroups(prev => {
      const next = [...prev];
      const grp = { ...next[groupIndex] };
      const newOpt: ProductOptionItem = {
        id: `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: `Nova Opção ${grp.options.length + 1}`,
        price: 0,
        available: true,
        sortOrder: grp.options.length + 1,
      };
      grp.options = [...grp.options, newOpt];
      next[groupIndex] = grp;
      return next;
    });
  };

  const handleUpdateOptionInGroup = (groupIndex: number, optIndex: number, updates: Partial<ProductOptionItem>) => {
    setPOptionGroups(prev => {
      const next = [...prev];
      const grp = { ...next[groupIndex] };
      const opts = [...grp.options];
      opts[optIndex] = { ...opts[optIndex], ...updates };
      grp.options = opts;
      next[groupIndex] = grp;
      return next;
    });
  };

  const handleDeleteOptionFromGroup = (groupIndex: number, optIndex: number) => {
    setPOptionGroups(prev => {
      const next = [...prev];
      const grp = { ...next[groupIndex] };
      grp.options = grp.options.filter((_, idx) => idx !== optIndex);
      next[groupIndex] = grp;
      return next;
    });
  };

  const handleMoveOptionInGroup = (groupIndex: number, optIndex: number, direction: 'up' | 'down') => {
    setPOptionGroups(prev => {
      const next = [...prev];
      const grp = { ...next[groupIndex] };
      const opts = [...grp.options];
      if (direction === 'up' && optIndex === 0) return prev;
      if (direction === 'down' && optIndex === opts.length - 1) return prev;
      const target = direction === 'up' ? optIndex - 1 : optIndex + 1;
      const temp = opts[optIndex];
      opts[optIndex] = opts[target];
      opts[target] = temp;
      grp.options = opts;
      next[groupIndex] = grp;
      return next;
    });
  };

  const handleApplyCategoryDefaults = () => {
    const defaults = getDefaultOptionGroupsForCategory(pCategory, pName);
    if (defaults.length === 0) {
      alert(`Nenhum modelo padrão pré-configurado encontrado para a categoria "${pCategory}". Você pode adicionar modelos da biblioteca ou criar grupos manualmente.`);
      return;
    }
    const existingNames = new Set(pOptionGroups.map(g => g.name.toLowerCase()));
    const nonDuplicates = defaults.filter(d => !existingNames.has(d.name.toLowerCase()));
    
    if (pOptionGroups.length === 0) {
      setPOptionGroups(defaults);
    } else if (nonDuplicates.length === 0) {
      alert('Os grupos padrão desta categoria já estão presentes na lista deste produto.');
    } else {
      setPOptionGroups(prev => [...prev, ...nonDuplicates]);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;
    setSaving(true);

    try {
      const payload: Product = {
        id: editingProduct ? editingProduct.id : `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        storeId,
        categoryName: pCategory.trim() || 'Pratos Principais',
        name: pName.trim(),
        description: pDesc.trim(),
        imageUrl: pImageUrl.trim() || undefined,
        basePrice: parseFloat(pBasePrice) || 0,
        unitCost: parseFloat(pUnitCost) || 0,
        productType: pType as ProductType,
        measureProfile: pMeasureProfile,
        slicesCount: pSlicesCount ? parseInt(pSlicesCount, 10) : undefined,
        measureValue: pMeasureValue ? parseFloat(pMeasureValue) : undefined,
        measureUnit: pMeasureProfile === 'volume' || pMeasureProfile === 'weight' || pMeasureProfile === 'packaging' ? pMeasureUnit : undefined,
        packagingType: pMeasureProfile === 'packaging' ? pPackagingType : undefined,
        customUnitLabel: pMeasureProfile === 'custom' ? pCustomUnitLabel.trim() || undefined : undefined,
        variants: pVariants.length > 0 ? pVariants : undefined,
        addOns: pAddons.length > 0 ? pAddons : undefined,
        optionGroups: pOptionGroups.length > 0 ? pOptionGroups : undefined,
        available: pAvailable,
        isDemo: false,
        createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await createProduct(payload);
      }

      setProductModalOpen(false);
      await loadData();
    } catch (e) {
      console.error('Error saving product:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Deseja realmente remover este produto?')) {
      try {
        await deleteProduct(productId);
        await loadData();
      } catch (e) {
        console.error('Error deleting product:', e);
      }
    }
  };

  // Image Upload Simulation / Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Read as Data URL or Object URL for local persistence
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      setPImageUrl(result);

      // Save to store image library
      const newImg: StoreImage = {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        storeId,
        url: result,
        fileName: file.name,
        createdAt: new Date().toISOString()
      };
      await saveStoreImage(newImg);
      setStoreImages(prev => [newImg, ...prev]);
    };
    reader.readAsDataURL(file);
  };

  // Category Creation
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      const trimmedName = catName.trim();
      const existing = categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
      if (existing) {
        setPCategory(existing.name);
        setCatName('');
        setCatModalOpen(false);
        return;
      }
      const newCat: StoreCategory = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        storeId,
        name: trimmedName,
        sortOrder: categories.length + 1,
        active: true
      };
      await createStoreCategory(newCat);
      setCategories(prev => [...prev, newCat]);
      setPCategory(newCat.name);
      setCatName('');
      setCatModalOpen(false);
      await loadData();
    } catch (e) {
      console.error('Error creating category:', e);
      alert('Erro ao criar categoria. Tente novamente.');
    }
  };

  // Custom Type Creation
  const handleSaveCustomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;
    try {
      const newType: CustomProductType = {
        id: `type_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        storeId,
        name: typeName.trim(),
        baseModel: typeBaseModel,
        createdAt: new Date().toISOString()
      };
      await createCustomType(newType);
      setPType(newType.id);
      setTypeName('');
      setTypeModalOpen(false);
      loadData();
    } catch (e) {
      console.error('Error creating custom type:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Carregando catálogo profissional...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                  Catálogo Profissional
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600 font-medium">{storeName}</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">
                Cardápio & Gestão de Produtos
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSyncCategoryOptionsAcrossStore}
              disabled={syncingOptions}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300 disabled:opacity-50"
              title="Adiciona os grupos de opções padrão às categorias dos produtos que ainda não possuem complementos"
            >
              <Sparkles className={`w-3.5 h-3.5 text-orange-500 ${syncingOptions ? 'animate-spin' : ''}`} />
              <span>{syncingOptions ? 'Sincronizando...' : 'Auto-Aplicar Opções por Categoria'}</span>
            </button>
            <button
              onClick={handleOpenCreateProduct}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto</span>
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
            <button onClick={() => setSyncFeedback(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-6 font-semibold">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'products' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Produtos ({products.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'categories' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Categorias ({categories.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'import' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Importação em Lote</span>
          </button>
        </div>

        {/* TAB 1: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar produto por nome..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                Nenhum produto cadastrado. Clique em "Novo Produto" para começar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="py-3 font-semibold">Produto</th>
                      <th className="py-3 font-semibold">Categoria</th>
                      <th className="py-3 font-semibold text-right">Preço</th>
                      <th className="py-3 font-semibold text-center">Status</th>
                      <th className="py-3 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredProducts.map(product => (
                      <tr key={product.id} className="hover:bg-slate-50">
                        <td className="py-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <UtensilsCrossed className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{product.name}</span>
                            <span className="text-[11px] text-slate-500 truncate max-w-xs block">{product.description}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[11px] font-medium">
                            {product.categoryName || 'Geral'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900">
                          {formatBRL(product.basePrice)}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            product.available ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {product.available ? 'Ativo' : 'Indisponível'}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEditProduct(product)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 rounded cursor-pointer inline-flex"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded cursor-pointer inline-flex"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Categorias da Loja</h2>
                <p className="text-xs text-slate-500 mt-0.5">Gerencie as categorias exibidas no seu cardápio público.</p>
              </div>
              <button
                onClick={() => setCatModalOpen(true)}
                className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Categoria</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {categories.map((cat, idx) => (
                <div key={cat.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-3 rounded-lg">
                  <span className="font-bold text-slate-900">{cat.name}</span>
                  <button
                    onClick={async () => {
                      if (confirm('Excluir categoria?')) {
                        await deleteStoreCategory(storeId, cat.id);
                        loadData();
                      }
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: IMPORT */}
        {activeTab === 'import' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Importação em Lote</h2>
              <p className="text-xs text-slate-500 mt-0.5">Importe vários produtos de uma vez usando uma planilha Excel, CSV ou texto colado.</p>
            </div>

            {/* Drag & Drop Area */}
            <div 
              className={`p-8 border-2 border-dashed rounded-xl text-center transition-colors ${importFile ? 'border-orange-500 bg-orange-50' : 'border-slate-300 bg-slate-50 hover:border-orange-400'}`}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileSelected(file);
              }}
            >
              {importFile ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="w-10 h-10 text-orange-600 mx-auto" />
                  <p className="font-bold text-slate-900">{importFile.name}</p>
                  <p className="text-[11px] text-slate-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                  <button onClick={() => { setImportFile(null); setImportPreview([]); }} className="text-xs text-red-600 font-semibold underline">Remover arquivo</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-900">Arraste seu arquivo para cá</p>
                  <p className="text-xs text-slate-500">ou selecione um arquivo do dispositivo</p>
                  <label className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-xs">
                    <input type="file" accept=".csv, .xlsx, .xls, .txt" className="hidden" onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])} />
                    Selecionar arquivo
                  </label>
                </div>
              )}
            </div>

            {/* Text Paste */}
            <div className="space-y-2">
              <label className="block text-slate-800 font-bold text-xs">Ou cole os dados aqui</label>
              <textarea
                rows={3}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Nome, Descrição, Categoria, Preço&#10;Açaí 500ml, Creme de açaí, Açaí, 22.00"
                className="w-full p-3 border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => { 
                  const csvContent = "data:text/csv;charset=utf-8,Nome,Descrição,Categoria,Preço\nAçaí 300ml,Creme de açaí,Açaí,16.00\nAçaí 500ml,Creme de açaí,Açaí,22.00\nRefrigerante lata 350ml,Bebida gaseificada,Refrigerantes,6.00\nÁgua mineral 500ml,Água sem gás,Bebidas,3.50\nPudim individual,Sobremesa,Sobremesas,9.00";
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", "modelo_importacao_plazzio.csv");
                  document.body.appendChild(link);
                  link.click();
                }} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Baixar modelo
              </button>
              <button 
                onClick={async () => {
                  setSaving(true);
                  try {
                    let productsToImport = importPreview;

                    if (productsToImport.length === 0 && csvText.trim()) {
                      const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
                      const parsedFromText = lines
                        .map(line => {
                          const delimiter = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ',';
                          const parts = line.split(delimiter).map(s => s.trim().replace(/^["']|["']$/g, ''));
                          if (!parts[0] || /^(nome|produto|item|title)/i.test(parts[0])) return null;
                          return {
                            name: parts[0],
                            description: parts[1] || '',
                            categoryName: parts[2] || 'Geral',
                            basePrice: parseRawPrice(parts[3]),
                          };
                        })
                        .filter(Boolean) as Array<{ name: string; description: string; categoryName: string; basePrice: number }>;
                      
                      productsToImport = parsedFromText;
                    }

                    if (productsToImport.length === 0) {
                      alert('Nenhum produto válido encontrado para importação. Verifique o arquivo ou texto colado.');
                      setSaving(false);
                      return;
                    }

                    let importedCount = 0;
                    for (const p of productsToImport) {
                      if (!p.name) continue;
                      
                      // Match or create category
                      const catName = p.categoryName || 'Geral';
                      const existingCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
                      const categoryId = existingCat ? existingCat.id : `cat_${slugify(catName)}`;

                      if (!existingCat) {
                        try {
                          await createStoreCategory({
                            id: categoryId,
                            storeId,
                            name: catName,
                            sortOrder: categories.length + 1,
                            active: true,
                          });
                        } catch (catErr) {
                          console.warn('Could not auto-create category:', catErr);
                        }
                      }

                      await createProduct({
                        id: `prod_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                        storeId,
                        categoryId,
                        name: p.name,
                        description: p.description || '',
                        categoryName: catName,
                        basePrice: p.basePrice || 0,
                        available: true,
                        measureProfile: 'none',
                        variants: [],
                        addOns: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      });
                      importedCount++;
                    }

                    setCsvText('');
                    setImportFile(null);
                    setImportPreview([]);
                    await loadData();
                    alert(`Importação concluída com sucesso! ${importedCount} produto(s) adicionados ao cardápio.`);
                  } catch (err) {
                    console.error('Batch import error:', err);
                    alert('Ocorreu um erro ao importar os produtos. Verifique o console para detalhes.');
                  } finally {
                    setSaving(false);
                  }
                }} 
                disabled={saving}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:bg-slate-400"
              >
                {saving ? 'Processando...' : 'Processar Importação'}
              </button>
            </div>
            
            {/* Preview table */}
            {importPreview.length > 0 && (
              <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-2">Nome</th>
                      <th className="p-2">Categoria</th>
                      <th className="p-2">Preço</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.map((p, i) => (
                      <tr key={i}>
                        <td className="p-2">{p.name}</td>
                        <td className="p-2">{p.categoryName}</td>
                        <td className="p-2">{formatBRL(p.basePrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REBUILT PRODUCT MODAL (MATCHING DESIRED UX & SCREENSHOT) */}
        <Modal
          isOpen={productModalOpen}
          onClose={() => setProductModalOpen(false)}
          title={editingProduct ? 'Editar Produto' : 'Novo produto — experiência desejada'}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveProduct} className="space-y-6 text-xs">
            {/* 1. FOTO DO PRODUTO */}
            <div className="space-y-2">
              <label className="block text-slate-800 font-bold">1. Foto do produto</label>
              <div className="p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center space-y-3">
                {pImageUrl ? (
                  <div className="relative w-32 h-32 mx-auto rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <img src={pImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPImageUrl('')}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Arraste suas fotos para cá</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Ou escolha arquivos do computador ou celular.</p>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-center gap-3 pt-2">
                  <label className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer shadow-xs inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Enviar fotos</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onClick={() => setImageLibraryOpen(true)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Escolher da biblioteca</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. NOME DO PRODUTO */}
            <div className="space-y-1">
              <label className="block text-slate-800 font-bold">2. Nome do produto *</label>
              <input
                type="text"
                required
                value={pName}
                onChange={(e) => {
                  const val = e.target.value;
                  setPName(val);
                  if (pOptionGroups.length === 0) {
                    const defaults = getDefaultOptionGroupsForCategory(pCategory, val);
                    if (defaults.length > 0) {
                      setPOptionGroups(defaults);
                    }
                  }
                }}
                placeholder="Ex.: Açaí tradicional 500 ml"
                className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:border-orange-500 text-sm font-medium"
              />
            </div>

            {/* 3. CATEGORIA DO PRODUTO */}
            <div className="space-y-1">
              <label className="block text-slate-800 font-bold">3. Categoria do produto *</label>
              <div className="flex gap-2">
                <select
                  value={pCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="flex-1 p-3 border border-slate-300 rounded-xl bg-white focus:outline-none cursor-pointer"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  {SUGGESTED_CATEGORIES.map(sc => (
                    !categories.some(c => c.name === sc) && <option key={sc} value={sc}>{sc}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setCatModalOpen(true)}
                  className="px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center justify-center cursor-pointer shadow-xs"
                  title="Nova Categoria"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500">As categorias sugeridas aparecem automaticamente conforme o segmento da loja. O botão + permite criar uma nova categoria.</p>
            </div>

            {/* 4. TIPO DE PRODUTO */}
            <div className="space-y-1">
              <label className="block text-slate-800 font-bold">4. Tipo de produto *</label>
              <div className="flex gap-2">
                <select
                  value={pType}
                  onChange={(e) => setPType(e.target.value)}
                  className="flex-1 p-3 border border-slate-300 rounded-xl bg-white focus:outline-none cursor-pointer"
                >
                  <option value="simple">Produto simples</option>
                  <option value="prepared">Preparado ou personalizável (Açaí, Hambúrguer, Pizza...)</option>
                  <option value="variant">Com variantes e tamanhos</option>
                  <option value="weighted">Vendido por peso ou volume</option>
                  <option value="combo">Combo ou kit</option>
                  <option value="industrialized">Industrializado / Revenda</option>
                  {customTypes.map(ct => (
                    <option key={ct.id} value={ct.id}>{ct.name} (Personalizado)</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setTypeModalOpen(true)}
                  className="px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center justify-center cursor-pointer shadow-xs"
                  title="Novo Tipo"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500">Também permite criar tipos personalizados, selecionando o comportamento básico adequado.</p>
            </div>

            {/* 5. PERFIL DE MEDIDAS E UNIDADES INTELIGENTES */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-slate-800 font-bold">5. Perfil de Medidas e Unidades Inteligentes</label>
              <select
                value={pMeasureProfile}
                onChange={(e) => setPMeasureProfile(e.target.value as MeasureProfile)}
                className="w-full p-3 border border-slate-300 rounded-xl bg-white focus:outline-none cursor-pointer font-medium"
              >
                <option value="none">Nenhum / Não se aplica</option>
                <option value="pizza_slices">Pizza — Quantidade de Fatias (Ex: 6 ou 8 fatias)</option>
                <option value="volume">Volume (ml ou L) — Açaí, Sucos, Bebidas servidas</option>
                <option value="packaging">Embalagem e Volume — Refrigerantes (Lata, Garrafa...)</option>
                <option value="weight">Peso / Porção (g ou kg) — Batata frita, Carnes, A granel</option>
                <option value="count">Contagem por Unidade</option>
                <option value="custom">Unidade Personalizada (Bandeja, Pacote, Caixa, Frasco...)</option>
              </select>

              {pMeasureProfile === 'pizza_slices' && (
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Quantidade de Fatias (Padrão)</label>
                  <input
                    type="number"
                    min="1"
                    value={pSlicesCount}
                    onChange={(e) => setPSlicesCount(e.target.value)}
                    placeholder="Ex: 8"
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Se a pizza tiver tamanhos diferentes (Broto, Grande), configure nas variantes abaixo.</p>
                </div>
              )}

              {pMeasureProfile === 'volume' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Valor numérico</label>
                    <input
                      type="number"
                      min="1"
                      value={pMeasureValue}
                      onChange={(e) => setPMeasureValue(e.target.value)}
                      placeholder="Ex: 500"
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Unidade</label>
                    <select
                      value={pMeasureUnit}
                      onChange={(e) => setPMeasureUnit(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="ml">ml (Mililitros)</option>
                      <option value="L">L (Litros)</option>
                    </select>
                  </div>
                </div>
              )}

              {pMeasureProfile === 'packaging' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Tipo de Embalagem</label>
                    <select
                      value={pPackagingType}
                      onChange={(e) => setPPackagingType(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="lata">Lata</option>
                      <option value="garrafa">Garrafa</option>
                      <option value="caixa">Caixa</option>
                      <option value="pacote">Pacote</option>
                      <option value="frasco">Frasco</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Volume/Quantidade</label>
                      <input
                        type="number"
                        min="1"
                        value={pMeasureValue}
                        onChange={(e) => setPMeasureValue(e.target.value)}
                        placeholder="Ex: 350 ou 600"
                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Unidade</label>
                      <select
                        value={pMeasureUnit}
                        onChange={(e) => setPMeasureUnit(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="ml">ml</option>
                        <option value="L">L</option>
                        <option value="un">un</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {pMeasureProfile === 'weight' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Peso / Porção</label>
                    <input
                      type="number"
                      min="1"
                      value={pMeasureValue}
                      onChange={(e) => setPMeasureValue(e.target.value)}
                      placeholder="Ex: 250 ou 500"
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Unidade de Peso</label>
                    <select
                      value={pMeasureUnit}
                      onChange={(e) => setPMeasureUnit(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="g">g (Gramas)</option>
                      <option value="kg">kg (Quilogramas)</option>
                    </select>
                  </div>
                </div>
              )}

              {pMeasureProfile === 'custom' && (
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nome da Unidade Personalizada</label>
                  <input
                    type="text"
                    value={pCustomUnitLabel}
                    onChange={(e) => setPCustomUnitLabel(e.target.value)}
                    placeholder="Ex: Bandeja, Pacote, Caixa, Kit, Frasco"
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              )}
            </div>

            {/* 6. PREÇO E CONFIGURAÇÕES */}
            <div className="space-y-2">
              <label className="block text-slate-800 font-bold">6. Preço e configurações</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Preço de venda</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-500 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      required
                      value={pBasePrice}
                      onChange={(e) => setPBasePrice(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Custo privado (opcional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-500 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={pUnitCost}
                      onChange={(e) => setPUnitCost(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 7. GRUPOS DE OPÇÕES (Sabores, Complementos e Adicionais) */}
            <div className="space-y-4 border-t border-slate-200 pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="block text-slate-800 font-bold text-sm">
                      7. Grupos de Opções (Sabores, Complementos e Adicionais)
                    </label>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-800 font-bold rounded text-[10px]">
                      {pOptionGroups.length} grupo(s)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Configure os grupos que o consumidor pode personalizar (sabores, frutas, recheios, caldas, coberturas, etc.).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOptionGroupSelectorOpen(true)}
                    className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                    title="Adicionar da Biblioteca Universal de Opções"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Biblioteca de Opções</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddManualGroup}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                    title="Criar um novo grupo vazio para este produto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Criar Grupo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyCategoryDefaults}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                    title={`Carregar modelos padrão para ${pCategory}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sugerir da Categoria</span>
                  </button>
                </div>
              </div>

              {pOptionGroups.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-3">
                  <Sliders className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="max-w-md mx-auto">
                    <p className="font-bold text-slate-700">Nenhum grupo de opções configurado</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Você pode adicionar grupos pré-configurados da biblioteca (sabores de açaí, frutas, bordas de pizza, etc.) ou criar um grupo personalizado.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setOptionGroupSelectorOpen(true)}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 text-xs shadow-xs"
                    >
                      <Sparkles className="w-4 h-4" />
                      Abrir Biblioteca Universal
                    </button>
                    <button
                      type="button"
                      onClick={handleAddManualGroup}
                      className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-lg cursor-pointer flex items-center gap-1.5 text-xs"
                    >
                      <Plus className="w-4 h-4" />
                      Criar Grupo Manual
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {pOptionGroups.map((group, gIdx) => (
                    <div 
                      key={group.id} 
                      className="p-4 bg-slate-50/70 border border-slate-300 rounded-xl space-y-3 shadow-2xs hover:border-slate-400 transition-colors"
                    >
                      {/* Grupo Top Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Reorder Buttons */}
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveGroup(gIdx, 'up')}
                              disabled={gIdx === 0}
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveGroup(gIdx, 'down')}
                              disabled={gIdx === pOptionGroups.length - 1}
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Group Name */}
                          <div className="flex-1">
                            <input
                              type="text"
                              value={group.name}
                              onChange={(e) => handleUpdateGroup(gIdx, { name: e.target.value })}
                              placeholder="Nome do Grupo (Ex: Frutas Frescas, Coberturas...)"
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-xs focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>

                        {/* Rules: Required, Selection Type, Min/Max */}
                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-semibold select-none">
                            <input
                              type="checkbox"
                              checked={group.required}
                              onChange={(e) => handleUpdateGroup(gIdx, { 
                                required: e.target.checked,
                                minSelect: e.target.checked && group.minSelect < 1 ? 1 : group.minSelect
                              })}
                              className="rounded text-orange-600 focus:ring-orange-500"
                            />
                            <span>Obrigatório</span>
                          </label>

                          <div className="flex items-center gap-1.5">
                            <label className="text-slate-500 font-medium">Tipo:</label>
                            <select
                              value={group.selectionType}
                              onChange={(e) => {
                                const selType = e.target.value as 'single' | 'multiple';
                                handleUpdateGroup(gIdx, { 
                                  selectionType: selType,
                                  maxSelect: selType === 'single' ? 1 : Math.max(group.maxSelect, 1),
                                  minSelect: selType === 'single' ? (group.required ? 1 : 0) : group.minSelect
                                });
                              }}
                              className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium text-xs cursor-pointer"
                            >
                              <option value="single">Escolha 1 (Única)</option>
                              <option value="multiple">Múltipla Escolha</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <label className="text-slate-500 font-medium">Mín:</label>
                            <input
                              type="number"
                              min="0"
                              max={group.maxSelect}
                              value={group.minSelect}
                              onChange={(e) => handleUpdateGroup(gIdx, { minSelect: parseInt(e.target.value, 10) || 0 })}
                              className="w-14 p-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-xs text-center"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <label className="text-slate-500 font-medium">Máx:</label>
                            <input
                              type="number"
                              min="1"
                              value={group.maxSelect}
                              onChange={(e) => handleUpdateGroup(gIdx, { maxSelect: parseInt(e.target.value, 10) || 1 })}
                              className="w-14 p-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-xs text-center"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              console.log("Delete button clicked for index:", gIdx);
                              handleDeleteGroup(gIdx);
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Remover Grupo do Produto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Group Description */}
                      <div>
                        <input
                          type="text"
                          value={group.description || ''}
                          onChange={(e) => handleUpdateGroup(gIdx, { description: e.target.value })}
                          placeholder="Descrição de ajuda para o consumidor (Ex: Escolha até 3 complementos inclusos)"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-[11px] focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      {/* Options List */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            Opções Cadastradas ({group.options.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddOptionToGroup(gIdx)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Plus className="w-3 h-3 text-orange-600" />
                            <span>Adicionar Opção</span>
                          </button>
                        </div>

                        {group.options.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic p-3 text-center bg-white rounded-lg border border-slate-200">
                            Nenhuma opção neste grupo. Clique em "Adicionar Opção" acima.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {group.options.map((opt, oIdx) => (
                              <div
                                key={opt.id}
                                className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg border transition-all ${
                                  opt.available !== false
                                    ? 'bg-white border-slate-200'
                                    : 'bg-slate-100/70 border-slate-200 opacity-60'
                                }`}
                              >
                                {/* Option Reorder */}
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveOptionInGroup(gIdx, oIdx, 'up')}
                                    disabled={oIdx === 0}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                    title="Subir"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveOptionInGroup(gIdx, oIdx, 'down')}
                                    disabled={oIdx === group.options.length - 1}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                    title="Descer"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Option Name */}
                                <div className="flex-1 min-w-0">
                                  <input
                                    type="text"
                                    value={opt.name}
                                    onChange={(e) => handleUpdateOptionInGroup(gIdx, oIdx, { name: e.target.value })}
                                    placeholder="Nome da opção (Ex: Morango)"
                                    className="w-full p-1.5 bg-transparent border border-slate-200 rounded font-medium text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-orange-500"
                                  />
                                </div>

                                {/* Option Description (optional) */}
                                <div className="sm:w-48">
                                  <input
                                    type="text"
                                    value={opt.description || ''}
                                    onChange={(e) => handleUpdateOptionInGroup(gIdx, oIdx, { description: e.target.value })}
                                    placeholder="Detalhe (opcional)"
                                    className="w-full p-1.5 bg-transparent border border-slate-200 rounded text-slate-500 text-[11px] focus:bg-white focus:outline-none focus:border-orange-500"
                                  />
                                </div>

                                {/* Option Additional Price */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-slate-400 font-bold text-xs">+R$</span>
                                  <input
                                    type="number"
                                    step="0.50"
                                    min="0"
                                    value={opt.price}
                                    onChange={(e) => handleUpdateOptionInGroup(gIdx, oIdx, { price: parseFloat(e.target.value) || 0 })}
                                    placeholder="0.00"
                                    className="w-18 p-1.5 bg-transparent border border-slate-200 rounded font-mono font-bold text-slate-900 text-xs text-right focus:bg-white focus:outline-none focus:border-orange-500"
                                  />
                                </div>

                                {/* Option Available Toggle */}
                                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none shrink-0 px-2 py-1 rounded hover:bg-slate-50">
                                  <input
                                    type="checkbox"
                                    checked={opt.available !== false}
                                    onChange={(e) => handleUpdateOptionInGroup(gIdx, oIdx, { available: e.target.checked })}
                                    className="rounded text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span>{opt.available !== false ? 'Disponível' : 'Esgotado'}</span>
                                </label>

                                {/* Option Delete */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOptionFromGroup(gIdx, oIdx)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0"
                                  title="Remover Opção"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 8. VARIANTES E TAMANHOS COM MEDIDAS */}
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <label className="block text-slate-800 font-bold">8. Variantes e Tamanhos (Opcional)</label>
                <span className="text-[11px] text-slate-500">Ex: Broto, Média, Grande / 300ml, 500ml</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Nome (Ex: Grande / 500ml)"
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    className="p-2 border border-slate-300 rounded-lg bg-white text-xs"
                  />
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.50"
                      placeholder="Preço Adicional"
                      value={newVarPrice}
                      onChange={(e) => setNewVarPrice(e.target.value)}
                      className="w-full pl-8 p-2 border border-slate-300 rounded-lg bg-white text-xs font-mono"
                    />
                  </div>
                  {pMeasureProfile === 'pizza_slices' && (
                    <input
                      type="number"
                      placeholder="Qtd Fatias"
                      value={newVarSlices}
                      onChange={(e) => setNewVarSlices(e.target.value)}
                      className="p-2 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                  )}
                  {(pMeasureProfile === 'volume' || pMeasureProfile === 'weight' || pMeasureProfile === 'packaging') && (
                    <input
                      type="number"
                      placeholder="Medida (Ex: 500)"
                      value={newVarMeasureVal}
                      onChange={(e) => setNewVarMeasureVal(e.target.value)}
                      className="p-2 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newVarName.trim()) return;
                    const variant: ProductVariant = {
                      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                      name: newVarName.trim(),
                      price: parseFloat(newVarPrice) || 0,
                      slicesCount: newVarSlices ? parseInt(newVarSlices, 10) : undefined,
                      measureValue: newVarMeasureVal ? parseFloat(newVarMeasureVal) : undefined,
                      measureUnit: pMeasureUnit,
                      packagingType: pPackagingType,
                    };
                    setPVariants([...pVariants, variant]);
                    setNewVarName('');
                    setNewVarPrice('0');
                    setNewVarSlices('');
                    setNewVarMeasureVal('');
                  }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                >
                  Adicionar Variante
                </button>
              </div>

              {pVariants.length > 0 && (
                <div className="space-y-2">
                  {pVariants.map((v, idx) => (
                    <div key={v.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{v.name}</span>
                        <span className="text-slate-500 font-mono">+{formatBRL(v.price)}</span>
                        {v.slicesCount && <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px] font-bold">{v.slicesCount} fatias</span>}
                        {v.measureValue && <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold">{v.measureValue} {v.measureUnit || pMeasureUnit}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPVariants(pVariants.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <label className="block text-slate-800 font-bold">Descrição (Opcional)</label>
              <textarea
                rows={2}
                value={pDesc}
                onChange={(e) => setPDesc(e.target.value)}
                placeholder="Descreva os ingredientes, sabor e porção..."
                className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer disabled:bg-slate-400"
              >
                {saving ? 'Salvando...' : 'Salvar Produto'}
              </button>
            </div>
          </form>
        </Modal>

        {/* IMAGE LIBRARY MODAL */}
        <Modal
          isOpen={imageLibraryOpen}
          onClose={() => setImageLibraryOpen(false)}
          title="Biblioteca de Imagens do Estabelecimento"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-500">Selecione uma imagem enviada anteriormente para reutilizar neste produto:</p>
            {storeImages.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                Nenhuma imagem na biblioteca. Envie fotos ao cadastrar produtos.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-1">
                {storeImages.map(img => (
                  <div
                    key={img.id}
                    onClick={() => {
                      setPImageUrl(img.url);
                      setImageLibraryOpen(false);
                    }}
                    className="group relative aspect-square rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all bg-slate-100"
                  >
                    <img src={img.url} alt={img.fileName} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/70 text-white p-1 text-[9px] truncate text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      Selecionar
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>

        {/* QUICK CATEGORY MODAL */}
        <Modal
          isOpen={catModalOpen}
          onClose={() => setCatModalOpen(false)}
          title="Criar Nova Categoria"
          maxWidth="sm"
        >
          <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Nome da Categoria *</label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Ex: Porções Especiais"
                className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCatModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-orange-600 text-white font-bold rounded-xl shadow-xs"
              >
                Salvar Categoria
              </button>
            </div>
          </form>
        </Modal>

        {/* QUICK CUSTOM TYPE MODAL */}
        <Modal
          isOpen={typeModalOpen}
          onClose={() => setTypeModalOpen(false)}
          title="Criar Novo Tipo Personalizado"
          maxWidth="sm"
        >
          <form onSubmit={handleSaveCustomType} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Nome do Tipo *</label>
              <input
                type="text"
                required
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder="Ex: Açaí Artesanal"
                className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Comportamento Base *</label>
              <select
                value={typeBaseModel}
                onChange={(e) => setTypeBaseModel(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl bg-white font-medium"
              >
                <option value="simple">Produto simples</option>
                <option value="prepared">Preparado / Personalizável</option>
                <option value="variant">Com variantes</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTypeModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-orange-600 text-white font-bold rounded-xl shadow-xs"
              >
                Salvar Tipo
              </button>
            </div>
          </form>
        </Modal>

        {/* UNIVERSAL OPTION GROUP SELECTOR MODAL */}
        {storeData && (
          <OptionGroupSelectorModal
            isOpen={optionGroupSelectorOpen}
            onClose={() => setOptionGroupSelectorOpen(false)}
            store={storeData}
            productType={pType as ProductType}
            existingGroups={pOptionGroups}
            onSelectGroup={(newGroup) => {
              console.log("Selected group in MerchantMenuPage:", newGroup);
              setPOptionGroups(prev => [...prev, newGroup]);
              setOptionGroupSelectorOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};
