import React, { useState, useEffect, useMemo } from 'react';
import { Store, Product, ProductVariant, SelectedAddOn, ProductOptionGroup, ProductOptionItem, SelectedOptionGroup, Review } from '../../types';
import { getStoreBySlug } from '../../services/storeService';
import { getProductsByStore } from '../../services/productService';
import { getReviewsByStore, getUserReviewForStore, submitOrUpdateReview } from '../../services/reviewService';
import { formatBRL, isStoreOpen, getStoreOpenStatus, hasConfiguredHours, DAYS_OF_WEEK, getSaoPauloCurrentTime, formatProductMeasure } from '../../lib/utils';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { ProductItem } from '../../components/marketplace/ProductItem';
import { 
  Star, 
  Clock, 
  Bike, 
  MapPin, 
  Search, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Check, 
  Store as StoreIcon, 
  Phone, 
  Info, 
  ArrowLeft,
  AlertCircle,
  Navigation,
  ExternalLink,
  MessageSquare,
  Send,
  Edit2,
  CheckCircle2,
  ImageIcon,
  X
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { uploadReviewPhoto } from '../../services/imageUploadService';

interface StorePageProps {
  slug: string;
  onBack?: () => void;
}

export const StorePage: React.FC<StorePageProps> = ({ slug, onBack }) => {
  const { currentUser, signInWithGoogle } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'menu' | 'about' | 'reviews'>('menu');
  const [productSearch, setProductSearch] = useState('');
  
  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewerName, setReviewerName] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string>('');
  const [reviewErrorMsg, setReviewErrorMsg] = useState<string>('');
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState<boolean>(false);
  const [previewingPhoto, setPreviewingPhoto] = useState<string | null>(null);

  const getCustomerUid = () => {
    if (currentUser?.uid) return currentUser.uid;
    let stored = localStorage.getItem('plazzio_client_uid');
    if (!stored) {
      stored = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('plazzio_client_uid', stored);
    }
    return stored;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => file.type.startsWith('image/') && file.size < 5 * 1024 * 1024); // 5MB limit
      if (validFiles.length < files.length) {
        setReviewErrorMsg('Algumas imagens foram ignoradas (apenas imagens menores que 5MB são permitidas).');
      }
      setReviewImages(prev => [...prev, ...validFiles]);
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setReviewImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Product Selection Modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [modalQuantity, setModalQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(undefined);
  const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOn[]>([]);
  const [selectedOptionsByGroup, setSelectedOptionsByGroup] = useState<Record<string, ProductOptionItem[]>>({});
  const [productNotes, setProductNotes] = useState('');

  const { addToCart, setIsCartOpen } = useCart();

  const loadStoreReviews = async (storeId: string) => {
    try {
      const revs = await getReviewsByStore(storeId);
      setReviews(revs);
      const clientUid = getCustomerUid();
      const myReview = await getUserReviewForStore(storeId, clientUid);
      setUserReview(myReview);
      if (myReview) {
        setReviewRating(myReview.rating);
        setReviewComment(myReview.comment);
        setReviewerName(myReview.customerName || '');
      }
    } catch (err) {
      console.warn('Error loading reviews in StorePage:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    getStoreBySlug(slug).then(async (storeData) => {
      setStore(storeData);
      if (storeData) {
        const prods = await getProductsByStore(storeData.id);
        setProducts(prods);
        await loadStoreReviews(storeData.id);
      }
      setLoading(false);
    });
  }, [slug, currentUser?.uid]);

  const handleOpenReviewModal = () => {
    setReviewErrorMsg('');
    setReviewSuccessMsg('');
    if (userReview) {
      setReviewRating(userReview.rating);
      setReviewComment(userReview.comment);
      setReviewerName(userReview.customerName || '');
    } else {
      setReviewRating(5);
      setReviewComment('');
      const defaultName = currentUser?.displayName || 
        (currentUser?.email ? currentUser.email.split('@')[0] : '') || 
        localStorage.getItem('plazzio_client_name') || 
        '';
      setReviewerName(defaultName);
    }
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    if (!currentUser) {
      setReviewErrorMsg('Entre na sua conta Google para enviar uma avaliação.');
      return;
    }
    
    const clientUid = currentUser.uid;
    const finalName = reviewerName.trim() || 
      currentUser?.displayName || 
      (currentUser?.email ? currentUser.email.split('@')[0] : '') || 
      localStorage.getItem('plazzio_client_name') ||
      'Cliente';

    if (!finalName || finalName.trim().length < 2) {
      setReviewErrorMsg('Por favor, informe seu nome para a avaliação.');
      return;
    }
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      setReviewErrorMsg('Por favor, selecione uma nota de 1 a 5 estrelas.');
      return;
    }
    if (!reviewComment.trim() || reviewComment.trim().length < 3) {
      setReviewErrorMsg('Por favor, escreva um comentário (mínimo de 3 caracteres) sobre sua experiência.');
      return;
    }

    setSubmittingReview(true);
    setReviewErrorMsg('');
    setReviewSuccessMsg('');

    try {
      localStorage.setItem('plazzio_client_name', finalName.trim());

      let photoUrls: string[] = userReview?.photoUrls ? [...userReview.photoUrls] : [];

      if (reviewImages.length > 0) {
        setUploadingImages(true);
        const uploadedUrls: string[] = [];

        for (let i = 0; i < reviewImages.length; i++) {
          const file = reviewImages[i];
          setReviewSuccessMsg(`Processando e enviando foto ${i + 1} de ${reviewImages.length}...`);
          try {
            const url = await uploadReviewPhoto(file);
            uploadedUrls.push(url);
          } catch (uploadErr: any) {
            console.error(`Erro ao enviar foto ${file.name}:`, uploadErr);
            throw new Error(`Não foi possível enviar a foto "${file.name}". ${uploadErr?.message || 'Tente novamente.'}`);
          }
        }

        photoUrls = [...photoUrls, ...uploadedUrls];
      }

      setReviewSuccessMsg('Salvando sua avaliação para moderação...');

      const saved = await submitOrUpdateReview({
        id: userReview?.id,
        storeId: store.id,
        customerUid: clientUid,
        customerName: finalName.trim(),
        rating: reviewRating,
        comment: reviewComment.trim(),
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined
      });

      setUserReview(saved);
      setReviewImages([]);
      setImagePreviews([]);
      setReviewSuccessMsg('Sua avaliação foi enviada e aguarda aprovação.');
      
      // Refresh approved reviews immediately
      const updatedRevs = await getReviewsByStore(store.id);
      setReviews(updatedRevs);

      setTimeout(() => {
        setReviewModalOpen(false);
        setReviewSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setReviewErrorMsg(err?.message || 'Não foi possível enviar a avaliação. Verifique sua conexão e tente novamente.');
    } finally {
      setSubmittingReview(false);
      setUploadingImages(false);
    }
  };

  // Computed average rating and count
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return store?.rating || 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews, store?.rating]);

  const totalReviewsCount = useMemo(() => {
    return reviews.length > 0 ? reviews.length : (store?.reviewCount || 0);
  }, [reviews, store?.reviewCount]);

  // Menu categories computed from existing products
  const menuCategories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => {
      const catName = p.categoryName || 'Outros';
      map.set(catName, catName);
    });
    return Array.from(map.values()).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.available) return false;
      if (activeCategory !== 'all' && (p.categoryName || 'Outros') !== activeCategory) {
        return false;
      }
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, activeCategory, productSearch]);

  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    products.filter(p => p.available).forEach(p => {
      const cat = p.categoryName || 'Outros';
      if (!groups[cat]) groups[cat] = [];
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        if (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) {
            groups[cat].push(p);
        }
      } else {
        groups[cat].push(p);
      }
    });
    Object.keys(groups).forEach(cat => {
      if (groups[cat].length === 0) delete groups[cat];
    });
    return groups;
  }, [products, productSearch]);

  const handleOpenProduct = (product: Product) => {
    if (!product.available) return;
    setSelectedProduct(product);
    setModalQuantity(1);
    setSelectedVariant(product.variants && product.variants.length > 0 ? product.variants[0] : undefined);
    setSelectedAddOns([]);
    setSelectedOptionsByGroup({});
    setProductNotes('');
  };

  const handleAddOnToggle = (addon: { id: string; name: string; price: number }) => {
    setSelectedAddOns(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) {
        return prev.filter(a => a.id !== addon.id);
      } else {
        return [...prev, { id: addon.id, name: addon.name, price: addon.price, quantity: 1 }];
      }
    });
  };

  const handleOptionToggle = (group: ProductOptionGroup, option: ProductOptionItem) => {
    setSelectedOptionsByGroup(prev => {
      const current = prev[group.id] || [];
      const isSingle = group.selectionType === 'single' || group.maxSelect === 1;

      if (isSingle) {
        if (current.some(o => o.id === option.id)) {
          return group.required ? prev : { ...prev, [group.id]: [] };
        }
        return { ...prev, [group.id]: [option] };
      }

      const exists = current.some(o => o.id === option.id);
      if (exists) {
        return { ...prev, [group.id]: current.filter(o => o.id !== option.id) };
      } else {
        if (current.length >= group.maxSelect) return prev;
        return { ...prev, [group.id]: [...current, option] };
      }
    });
  };

  const validateOptionGroups = (): { isValid: boolean; errorMessage?: string } => {
    if (!selectedProduct || !selectedProduct.optionGroups) return { isValid: true };
    for (const group of selectedProduct.optionGroups) {
      const selected = selectedOptionsByGroup[group.id] || [];
      const count = selected.length;
      if (group.required && count === 0) return { isValid: false, errorMessage: `Selecione ao menos ${group.minSelect || 1} opção em "${group.name}".` };
      if (group.minSelect > 0 && count < group.minSelect) return { isValid: false, errorMessage: `O grupo "${group.name}" requer no mínimo ${group.minSelect} escolha(s).` };
      if (group.maxSelect > 0 && count > group.maxSelect) return { isValid: false, errorMessage: `O grupo "${group.name}" permite no máximo ${group.maxSelect} escolha(s).` };
    }
    return { isValid: true };
  };

  const calculateModalTotal = () => {
    if (!selectedProduct) return 0;
    let unit = selectedProduct.basePrice;
    if (selectedVariant) unit += selectedVariant.price;
    const legacyAddonsSum = selectedAddOns.reduce((s, a) => s + a.price * a.quantity, 0);
    let optionsSum = 0;
    Object.values(selectedOptionsByGroup).forEach(groupOpts => {
      groupOpts.forEach(opt => { optionsSum += opt.price || 0; });
    });
    return (unit + legacyAddonsSum + optionsSum) * modalQuantity;
  };

  const handleConfirmAddToCart = () => {
    if (!selectedProduct || !store) return;
    const validation = validateOptionGroups();
    if (!validation.isValid) {
      alert(validation.errorMessage || 'Verifique as opções obrigatórias.');
      return;
    }
    const formattedOptionGroups: SelectedOptionGroup[] = [];
    const combinedAddOns: SelectedAddOn[] = [...selectedAddOns];
    if (selectedProduct.optionGroups) {
      selectedProduct.optionGroups.forEach(group => {
        const opts = selectedOptionsByGroup[group.id] || [];
        if (opts.length > 0) {
          formattedOptionGroups.push({
            groupId: group.id,
            groupName: group.name,
            selectedOptions: opts.map(o => ({
              id: o.id, name: o.name, price: o.price || 0, quantity: 1, imageUrl: o.imageUrl, groupName: group.name
            }))
          });
          opts.forEach(o => {
            combinedAddOns.push({ id: o.id, name: `${group.name}: ${o.name}`, price: o.price || 0, quantity: 1 });
          });
        }
      });
    }
    const added = addToCart(
      selectedProduct,
      store,
      modalQuantity,
      selectedVariant,
      combinedAddOns,
      productNotes.trim() || undefined,
      formattedOptionGroups.length > 0 ? formattedOptionGroups : undefined
    );
    setSelectedProduct(null);
    if (added) setIsCartOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
          <StoreIcon className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Estabelecimento não encontrado</h2>
          <button onClick={onBack} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors">Voltar para o marketplace</button>
        </div>
      </div>
    );
  }

  const openNow = isStoreOpen(store.operatingHours);
  const storeOpenStatus = getStoreOpenStatus(store.operatingHours);
  const { dayKey: currentDayKey, altDayKey: currentAltDayKey } = getSaoPauloCurrentTime();

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar aos estabelecimentos</span>
          </button>
          <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${storeOpenStatus.badgeClass}`}>
            {storeOpenStatus.status === 'open' && 'Aberto para pedidos'}
            {storeOpenStatus.status === 'closed' && 'Fechado no momento'}
            {storeOpenStatus.status === 'unconfigured' && 'Horários não informados'}
          </span>
        </div>
      </div>
      <div className="relative h-60 sm:h-72 w-full bg-slate-900 overflow-hidden">
        {store.coverUrl ? <img src={store.coverUrl} alt={store.name} className="w-full h-full object-cover opacity-90" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-slate-800" />}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md flex gap-4 items-start sm:items-center">
          {store.logoUrl ? (
            <div className="w-20 h-20 rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
              <img src={store.logoUrl} alt={store.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl border border-slate-200 bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-bold text-2xl shadow-xs shrink-0">
              {store.name ? store.name.charAt(0).toUpperCase() : 'L'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">{store.businessType}</span>
                  <span className="text-slate-300">·</span>
                  {totalReviewsCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('reviews')}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded text-xs font-bold text-amber-900 transition-colors cursor-pointer"
                      title="Ver avaliações deste estabelecimento"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{averageRating.toFixed(1)}</span>
                      <span className="text-amber-700/80 font-normal">({totalReviewsCount} {totalReviewsCount === 1 ? 'avaliação' : 'avaliações'})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setActiveTab('reviews'); handleOpenReviewModal(); }}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-orange-600 cursor-pointer font-medium"
                      title="Seja o primeiro a avaliar esta loja"
                    >
                      <Star className="w-3.5 h-3.5 text-slate-300" />
                      <span>Avaliar loja</span>
                    </button>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 truncate">{store.name}</h1>
                <p className="text-xs text-slate-600 mt-1.5 max-w-2xl leading-relaxed">{store.description}</p>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80 shrink-0">
                <div className="text-center px-2">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Taxa</span>
                  <span className="text-sm font-bold text-slate-900">{store.deliveryFee === 0 ? 'Grátis' : formatBRL(store.deliveryFee)}</span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center px-2">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Mínimo</span>
                  <span className="text-sm font-bold text-slate-900">{formatBRL(store.minimumOrderValue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tabs - Added here */}
        <div className="flex gap-6 border-b border-slate-200 mt-6 mb-6">
          {(['menu', 'about', 'reviews'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-semibold text-sm capitalize transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab ? 'text-orange-600 border-b-2 border-orange-600 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab === 'menu' ? 'Cardápio' : tab === 'about' ? 'Sobre a loja' : 'Avaliações'}</span>
              {tab === 'reviews' && reviews.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                  {reviews.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="min-h-[300px]">
          {activeTab === 'menu' && (
            <div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-2xl">
                  <button onClick={() => setActiveCategory('all')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${activeCategory === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Todos os itens</button>
                  {menuCategories.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${activeCategory === cat ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{cat}</button>
                  ))}
                </div>
                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Buscar no cardápio..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 text-slate-800" />
                </div>
              </div>
              {Object.keys(activeCategory === 'all' ? groupedProducts : (groupedProducts[activeCategory] ? {[activeCategory]: groupedProducts[activeCategory]} : {})).length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <p className="text-sm font-semibold text-slate-700">Nenhum produto encontrado</p>
                </div>
              ) : (
                Object.entries(activeCategory === 'all' ? groupedProducts : (groupedProducts[activeCategory] ? {[activeCategory]: groupedProducts[activeCategory]} : {})).map(([cat, prods]) => (
                  <div key={cat} className="mb-8">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">{cat}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {prods.map(p => <ProductItem key={p.id} product={p} onClick={() => handleOpenProduct(p)} />)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-6">
              {/* Apresentação */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <StoreIcon className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Sobre o estabelecimento</h2>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {store.about || store.description || 'Nenhuma descrição detalhada cadastrada pelo estabelecimento.'}
                </p>
              </div>

              {/* Endereço & Rota Google Maps */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Localização & Endereço</h3>
                    </div>
                    <p className="text-sm text-slate-700 font-medium pt-1">
                      {[store.businessAddress, store.number, store.complement].filter(Boolean).join(', ')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[store.neighborhood, store.city, store.state, store.zipCode ? `CEP: ${store.zipCode}` : ''].filter(Boolean).join(', ')}
                    </p>
                  </div>

                  {/* Botão Ver Rota no Google Maps */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      [store.businessAddress, store.number, store.neighborhood, store.city, store.state, 'Brasil'].filter(Boolean).join(', ')
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs shrink-0 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4 fill-white" />
                    <span>Ver localização no Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                </div>
              </div>

              {/* Horários de Funcionamento */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${
                      storeOpenStatus.status === 'open' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : storeOpenStatus.status === 'closed'
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Horários de Funcionamento</h3>
                      <p className="text-[11px] text-slate-400">Horário oficial de Brasília (America/Sao_Paulo)</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${storeOpenStatus.badgeClass}`}>
                    {storeOpenStatus.status === 'open' && '● Aberto agora'}
                    {storeOpenStatus.status === 'closed' && '○ Fechado agora'}
                    {storeOpenStatus.status === 'unconfigured' && '— Horários não informados'}
                  </span>
                </div>

                {!hasConfiguredHours(store.operatingHours) ? (
                  <div className="p-5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                    O estabelecimento ainda não cadastrou os horários semanais de funcionamento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    {DAYS_OF_WEEK.map(day => {
                      const schedule = store.operatingHours?.[day.key] || store.operatingHours?.[day.altKey];
                      const isClosed = !schedule || schedule.closed || !schedule.open || !schedule.close;
                      const isToday = currentDayKey === day.key || currentAltDayKey === day.altKey;

                      return (
                        <div
                          key={day.key}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                            isToday
                              ? 'bg-orange-50/70 border-orange-200 shadow-2xs'
                              : 'bg-slate-50 border-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={isToday ? 'font-bold text-orange-950' : 'font-semibold text-slate-700'}>
                              {day.label}
                            </span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold tracking-wider bg-orange-200 text-orange-900 rounded">
                                Hoje
                              </span>
                            )}
                          </div>
                          <span className={`font-mono text-xs ${
                            isClosed ? 'text-slate-400 font-medium' : isToday ? 'text-orange-900 font-bold' : 'text-slate-900 font-semibold'
                          }`}>
                            {isClosed ? 'Fechado' : `${schedule.open} às ${schedule.close}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Contatos & Informações */}
              {(store.phone || store.whatsappOrderNumber) && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <Phone className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Canais de Contato</h3>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    {store.phone && (
                      <a
                        href={`tel:${store.phone.replace(/\D/g, '')}`}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-800 text-xs font-semibold transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{store.phone}</span>
                      </a>
                    )}
                    {store.whatsappOrderNumber && (
                      <a
                        href={`https://wa.me/${store.whatsappOrderNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Gostaria de saber mais sobre a loja ${store.name} no Plazzio.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-200 hover:border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>WhatsApp: {store.whatsappOrderNumber}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Header de Avaliações com Nota Média e Botão Avaliar */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="text-center sm:text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-4xl sm:text-5xl font-black text-slate-900">
                          {totalReviewsCount > 0 ? averageRating.toFixed(1) : '—'}
                        </span>
                        <div>
                          <div className="flex text-amber-400">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  totalReviewsCount > 0 && star <= Math.round(averageRating)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-200 fill-slate-100'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {totalReviewsCount > 0
                              ? `${totalReviewsCount} ${totalReviewsCount === 1 ? 'avaliação aprovada' : 'avaliações aprovadas'}`
                              : 'Nenhuma avaliação publicada'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botão de Avaliar ou Editar */}
                  <button
                    type="button"
                    onClick={handleOpenReviewModal}
                    className="px-5 py-3 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    <Star className="w-4 h-4 fill-white" />
                    <span>{userReview ? 'Editar minha avaliação' : 'Avaliar esta loja'}</span>
                  </button>
                </div>
              </div>

              {/* Status da avaliação do próprio usuário autenticado */}
              {userReview && (
                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  userReview.status === 'approved' 
                    ? 'bg-emerald-50/80 border-emerald-200' 
                    : userReview.status === 'rejected'
                    ? 'bg-rose-50/80 border-rose-200'
                    : 'bg-amber-50/80 border-amber-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 sm:mt-0 ${
                      userReview.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {userReview.status === 'approved' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">
                          {userReview.status === 'approved' 
                            ? 'Sua avaliação está publicada' 
                            : userReview.status === 'rejected'
                            ? 'Sua avaliação precisa de ajustes'
                            : 'Sua avaliação foi enviada e está aguardando aprovação'}
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          userReview.status === 'approved'
                            ? 'bg-emerald-200 text-emerald-900'
                            : userReview.status === 'rejected'
                            ? 'bg-rose-200 text-rose-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}>
                          {userReview.status === 'approved' ? 'Aprovada' : userReview.status === 'rejected' ? 'Revisar' : 'Em moderação'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs">
                        <div className="flex text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= userReview.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-slate-700 italic">"{userReview.comment}"</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenReviewModal}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Editar avaliação</span>
                  </button>
                </div>
              )}

              {/* Lista de Avaliações Aprovadas */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                      <Star className="w-6 h-6" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="text-sm font-bold text-slate-900">Nenhuma avaliação publicada ainda</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Seja o primeiro a compartilhar sua experiência e ajude a comunidade a conhecer a qualidade deste estabelecimento!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenReviewModal}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                    >
                      <Star className="w-3.5 h-3.5 fill-white" />
                      <span>Avaliar esta loja</span>
                    </button>
                  </div>
                ) : (
                  reviews.map(review => (
                    <div key={review.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                            {review.customerName ? review.customerName.charAt(0) : 'U'}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block">{review.customerName}</span>
                            <span className="text-[10px] text-slate-400">
                              {review.createdAt ? new Date(review.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Data não informada'}
                            </span>
                          </div>
                        </div>

                        <div className="flex text-amber-400" aria-label={`Nota: ${review.rating} de 5 estrelas`}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star 
                              key={i} 
                              className={`w-3.5 h-3.5 ${i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'}`} 
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">{review.comment}</p>

                      {/* Fotos enviadas pelo cliente */}
                      {review.photoUrls && review.photoUrls.length > 0 && (
                        <div className="pt-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Fotos do cliente ({review.photoUrls.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {review.photoUrls.map((pUrl, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => setPreviewingPhoto(pUrl)}
                                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 hover:ring-2 hover:ring-orange-500 hover:opacity-95 transition-all cursor-pointer group shrink-0 bg-slate-100 shadow-2xs"
                                title="Clique para ampliar a foto"
                              >
                                <img 
                                  src={pUrl} 
                                  alt={`Foto ${pIdx + 1} enviada por ${review.customerName}`} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  loading="lazy"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
      {selectedProduct && (
        <Modal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title={selectedProduct.name} maxWidth="lg">
          <div className="space-y-6">
            {selectedProduct.imageUrl && (
              <div className="h-44 w-full rounded-lg overflow-hidden bg-slate-100">
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            )}
            <p className="text-xs text-slate-600 leading-relaxed">{selectedProduct.description}</p>
            {/* Variants */}
            {selectedProduct.variants && selectedProduct.variants.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Escolha uma opção:</h4>
                <div className="space-y-1.5">
                  {selectedProduct.variants.map(variant => (
                    <label key={variant.id} className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${selectedVariant?.id === variant.id ? 'border-orange-500 bg-orange-50/50 text-slate-900 font-semibold' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                      <div className="flex items-center gap-2">
                        <input type="radio" name="productVariant" checked={selectedVariant?.id === variant.id} onChange={() => setSelectedVariant(variant)} className="text-orange-600 focus:ring-orange-500" />
                        <span className="font-semibold">{variant.name}</span>
                        {formatProductMeasure(selectedProduct, variant) && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 text-[10px] font-bold rounded">{formatProductMeasure(selectedProduct, variant)}</span>}
                      </div>
                      <span className="font-bold">{variant.price > 0 ? `+ ${formatBRL(variant.price)}` : 'Incluso'}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {/* Options */}
            {selectedProduct.optionGroups && selectedProduct.optionGroups.length > 0 && (
              <div className="space-y-5">
                {selectedProduct.optionGroups.map(group => {
                  const selectedInGroup = selectedOptionsByGroup[group.id] || [];
                  const count = selectedInGroup.length;
                  const isSingle = group.selectionType === 'single' || group.maxSelect === 1;
                  const isSatisfied = (!group.required && count === 0) || (count >= (group.minSelect || (group.required ? 1 : 0)) && count <= group.maxSelect);
                  const isMaxReached = !isSingle && count >= group.maxSelect;
                  return (
                    <div key={group.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{group.name}</h4>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${group.required ? 'bg-orange-100 text-orange-800' : 'bg-slate-200 text-slate-700'}`}>{group.required ? 'Obrigatório' : 'Opcional'}</span>
                          </div>
                          {group.description && <p className="text-[11px] text-slate-500 mt-0.5">{group.description}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                            {isSingle ? 'Escolha 1' : group.minSelect > 0 ? `${count}/${group.maxSelect} (mín. ${group.minSelect})` : `${count}/${group.maxSelect}`}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {group.options.filter(o => o.available !== false).map(opt => {
                          const isSelected = selectedInGroup.some(o => o.id === opt.id);
                          const isDisabled = !isSelected && isMaxReached;
                          return (
                            <label key={opt.id} onClick={(e) => { if (isDisabled) { e.preventDefault(); return; } handleOptionToggle(group, opt); }} className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all ${isSelected ? 'border-orange-500 bg-orange-50/60 text-slate-900 font-semibold shadow-2xs' : isDisabled ? 'border-slate-100 bg-slate-100/60 text-slate-400 opacity-60 cursor-not-allowed' : 'border-slate-200 hover:bg-white text-slate-700 cursor-pointer'}`}>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input type={isSingle ? "radio" : "checkbox"} name={`group_${group.id}`} checked={isSelected} disabled={isDisabled} readOnly className={`rounded text-orange-600 focus:ring-orange-500 ${isSingle ? 'rounded-full' : ''}`} />
                                {opt.imageUrl && <img src={opt.imageUrl} alt={opt.name} className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0" />}
                                <div className="min-w-0"><span className="block truncate text-slate-900">{opt.name}</span>{opt.description && <span className="block text-[10px] text-slate-400 truncate">{opt.description}</span>}</div>
                              </div>
                              <span className="font-bold shrink-0 ml-2">{opt.price > 0 ? `+ ${formatBRL(opt.price)}` : 'Incluso'}</span>
                            </label>
                          );
                        })}
                      </div>
                      {!isSatisfied && <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>Selecione ao menos {group.minSelect || 1} opção neste grupo</span></p>}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Add-ons */}
            {selectedProduct.addOns && selectedProduct.addOns.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Adicionais e complementos:</h4>
                <div className="space-y-1.5">
                  {selectedProduct.addOns.map(addon => {
                    const isSelected = selectedAddOns.some(a => a.id === addon.id);
                    return (
                      <label key={addon.id} className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${isSelected ? 'border-orange-500 bg-orange-50/50 text-slate-900 font-semibold' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={isSelected} onChange={() => handleAddOnToggle(addon)} className="rounded text-orange-600 focus:ring-orange-500" />
                          <span>{addon.name}</span>
                        </div>
                        <span className="font-bold">+ {formatBRL(addon.price)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Alguma observação?</label>
              <textarea value={productNotes} onChange={(e) => setProductNotes(e.target.value)} placeholder="Ex: Sem cebola..." rows={2} maxLength={200} className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 text-slate-800" />
            </div>
            <div className="pt-4 border-t border-slate-200 space-y-2">
              {!validateOptionGroups().isValid && <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-medium flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0 text-amber-600" /><span>{validateOptionGroups().errorMessage}</span></div>}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <button onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))} className="p-2 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"><Minus className="w-4 h-4" /></button>
                  <span className="px-4 text-xs font-bold text-slate-900">{modalQuantity}</span>
                  <button onClick={() => setModalQuantity(modalQuantity + 1)} className="p-2 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"><Plus className="w-4 h-4" /></button>
                </div>
                <button onClick={handleConfirmAddToCart} disabled={!validateOptionGroups().isValid} className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs flex items-center justify-between shadow-sm transition-all ${validateOptionGroups().isValid ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                  <span>Adicionar à Sacola</span>
                  <span>{formatBRL(calculateModalTotal())}</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Review Modal */}
      {reviewModalOpen && (
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => {
            if (!submittingReview) {
              setReviewModalOpen(false);
              setReviewErrorMsg('');
              setReviewSuccessMsg('');
            }
          }}
          title={userReview ? "Editar avaliação da loja" : `Avaliar ${store.name}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Identificação do Cliente */}
              {currentUser ? (
                <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {currentUser.displayName ? currentUser.displayName.charAt(0) : 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      Avaliando com sua conta conectada
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      Seu nome ou apelido *
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await signInWithGoogle();
                        } catch (err) {
                          console.error('Login error:', err);
                        }
                      }}
                      className="text-[11px] text-orange-600 hover:text-orange-700 font-medium cursor-pointer"
                    >
                      Ou entrar com Google
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="Ex: Mariana Silva"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-orange-500 text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400">
                    Este nome aparecerá publicamente junto ao seu feedback
                  </p>
                </div>
              )}

              {/* Seleção de estrelas com acessibilidade total */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Sua nota para este estabelecimento *
                </label>
                <div 
                  className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  role="radiogroup" 
                  aria-label="Avalie de 1 a 5 estrelas"
                >
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = (hoverRating || reviewRating) >= starValue;
                    const starLabels: Record<number, string> = {
                      1: 'Péssimo (1 estrela)',
                      2: 'Ruim (2 estrelas)',
                      3: 'Regular (3 estrelas)',
                      4: 'Muito bom (4 estrelas)',
                      5: 'Excelente (5 estrelas)',
                    };
                    return (
                      <button
                        key={starValue}
                        type="button"
                        role="radio"
                        aria-checked={reviewRating === starValue}
                        aria-label={starLabels[starValue]}
                        onClick={() => setReviewRating(starValue)}
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 rounded-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            isFilled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-bold text-slate-700 ml-2">
                    {hoverRating === 1 || (!hoverRating && reviewRating === 1) ? '1 estrela — Péssimo' : null}
                    {hoverRating === 2 || (!hoverRating && reviewRating === 2) ? '2 estrelas — Ruim' : null}
                    {hoverRating === 3 || (!hoverRating && reviewRating === 3) ? '3 estrelas — Regular' : null}
                    {hoverRating === 4 || (!hoverRating && reviewRating === 4) ? '4 estrelas — Muito bom' : null}
                    {hoverRating === 5 || (!hoverRating && reviewRating === 5) ? '5 estrelas — Excelente!' : null}
                  </span>
                </div>
              </div>

              {/* Comentário */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Conte como foi sua experiência *
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Conte sobre os produtos, sabor, atendimento, embalagem e pontualidade..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-orange-500 leading-relaxed text-slate-800"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Mínimo de 3 caracteres</span>
                  <span>{reviewComment.length} caracteres</span>
                </div>
              </div>

              {/* Upload Fotos */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Adicionar fotos
                </label>
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleRemoveImage(index)} className="absolute top-0 right-0 p-0.5 bg-rose-500 text-white rounded-bl cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-50">
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Mensagens de feedback */}
              {reviewSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{reviewSuccessMsg}</span>
                </div>
              )}

              {reviewErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{reviewErrorMsg}</span>
                </div>
              )}

              {/* Ações */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingReview || uploadingImages || !reviewComment.trim()}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview || uploadingImages ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{submittingReview ? 'Enviando avaliação...' : 'Enviando fotos...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{userReview ? 'Salvar alterações' : 'Enviar avaliação'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Lightbox Modal para fotos das avaliações */}
      {previewingPhoto && (
        <Modal
          isOpen={!!previewingPhoto}
          onClose={() => setPreviewingPhoto(null)}
          title="Foto da avaliação"
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-center p-2 bg-slate-900 rounded-xl overflow-hidden min-h-[250px] max-h-[75vh]">
              <img 
                src={previewingPhoto} 
                alt="Foto ampliada da avaliação" 
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewingPhoto(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Fechar visualização
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>

  );
};
