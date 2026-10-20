import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  GlobalOptionGroupTemplate, 
  GlobalOptionItem, 
  ProductOptionGroup, 
  ProductOptionItem,
  ProductType 
} from '../types';
import { removeUndefinedFields } from '../lib/utils';

export const GLOBAL_TEMPLATES_COLLECTION = 'globalOptionGroupTemplates';

export const DEFAULT_GLOBAL_OPTION_TEMPLATES: GlobalOptionGroupTemplate[] = [
  // ==========================================
  // A. SORVETES E AÇAÍ
  // ==========================================
  {
    id: 'sorvete-quantidade-bolas',
    name: 'Quantidade de Bolas de Sorvete',
    description: 'Selecione quantas bolas de sorvete deseja no copo ou na taça.',
    category: 'tamanhos',
    compatibleSegments: ['sorvete', 'gelateria', 'doceria', 'all'],
    compatibleProductTypes: ['prepared', 'simple', 'variant'],
    selectionType: 'single',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    active: true,
    sortOrder: 1,
    options: [
      { id: 'bola-1', name: '1 Bola de Sorvete (Individual)', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'bola-2', name: '2 Bolas de Sorvete', active: true, sortOrder: 2, defaultAdditionalPrice: 6.00 },
      { id: 'bola-3', name: '3 Bolas de Sorvete (Especial)', active: true, sortOrder: 3, defaultAdditionalPrice: 11.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sorvete-sabores',
    name: 'Sabores de Sorvete',
    description: 'Escolha os sabores das bolas de sorvete para a sua taça, copo ou pote.',
    category: 'sabores',
    compatibleSegments: ['sorvete', 'gelateria', 'doceria'],
    compatibleProductTypes: ['prepared', 'simple', 'variant', 'combo'],
    selectionType: 'multiple',
    minSelect: 1,
    maxSelect: 3,
    required: true,
    active: true,
    sortOrder: 1,
    options: [
      { id: 'sorv-chocolate', name: 'Chocolate Tradicional', description: 'Cremoso ao leite', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'sorv-morango', name: 'Morango Especial', description: 'Com pedacinhos de morango', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'sorv-baunilha', name: 'Baunilha de Madagascar', description: 'Toque suave de fava', active: true, sortOrder: 3, defaultAdditionalPrice: 0 },
      { id: 'sorv-creme', name: 'Creme Artesanal', description: 'Textura aveludada clássica', active: true, sortOrder: 4, defaultAdditionalPrice: 0 },
      { id: 'sorv-flocos', name: 'Flocos Crocantes', description: 'Baunilha com raspas de chocolate nobre', active: true, sortOrder: 5, defaultAdditionalPrice: 0 },
      { id: 'sorv-napolitano', name: 'Napolitano', description: 'Chocolate, creme e morango juntos', active: true, sortOrder: 6, defaultAdditionalPrice: 0 },
      { id: 'sorv-coco', name: 'Coco Branco Fresco', description: 'Feito com leite e pedacinhos de coco', active: true, sortOrder: 7, defaultAdditionalPrice: 0 },
      { id: 'sorv-limao', name: 'Limão Siciliano Refrescante', description: 'Sabor cítrico balanceado', active: true, sortOrder: 8, defaultAdditionalPrice: 0 },
      { id: 'sorv-maracuja', name: 'Maracujá com Sementes', description: 'Polpa natural da fruta', active: true, sortOrder: 9, defaultAdditionalPrice: 0 },
      { id: 'sorv-uva', name: 'Uva Roxa', description: 'Refrescância frutada intensa', active: true, sortOrder: 10, defaultAdditionalPrice: 0 },
      { id: 'sorv-abacaxi', name: 'Abacaxi ao Vinho / Francês', description: 'Doçura tropical', active: true, sortOrder: 11, defaultAdditionalPrice: 0 },
      { id: 'sorv-doce-leite', name: 'Doce de Leite Argentino', description: 'Cozido e denso', active: true, sortOrder: 12, defaultAdditionalPrice: 0 },
      { id: 'sorv-pistache', name: 'Pistache Italiano Premium', description: 'Pasta de pistache 100% pura', active: true, sortOrder: 13, defaultAdditionalPrice: 2.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acai-bases-sabores',
    name: 'Bases e Sabores de Açaí',
    description: 'Escolha a base cremosa batida do seu açaí.',
    category: 'sabores',
    compatibleSegments: ['acai_sorvetes', 'doceria', 'lanchonete', 'all'],
    compatibleProductTypes: ['prepared', 'simple', 'variant'],
    selectionType: 'single',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    active: true,
    sortOrder: 2,
    options: [
      { id: 'base-acai-tradicional', name: 'Açaí Tradicional Especial', description: 'Batido cremoso puro da polpa', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'base-acai-banana', name: 'Açaí Batido com Banana', description: 'Doçura suave e energia', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'base-acai-morango', name: 'Açaí Batido com Morango', description: 'Refrescante e frutado', active: true, sortOrder: 3, defaultAdditionalPrice: 0 },
      { id: 'base-acai-cupuacu', name: 'Açaí Casadinho com Cupuaçu', description: 'Metade açaí cremoso, metade creme de cupuaçu', active: true, sortOrder: 4, defaultAdditionalPrice: 0 },
      { id: 'base-acai-guarana', name: 'Açaí com Xarope de Guaraná', description: 'Receita clássica do Pará', active: true, sortOrder: 5, defaultAdditionalPrice: 0 },
      { id: 'base-acai-zero', name: 'Açaí Zero Adição de Açúcar', description: 'Adoçado com stevia e xilitol', active: true, sortOrder: 6, defaultAdditionalPrice: 1.50 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acai-frutas-frescas',
    name: 'Frutas Frescas Fatiadas',
    description: 'Adicione frutas frescas cortadas no momento do preparo.',
    category: 'frutas',
    compatibleSegments: ['acai_sorvetes', 'doceria', 'lanchonete', 'all'],
    compatibleProductTypes: ['prepared', 'simple'],
    selectionType: 'multiple',
    minSelect: 0,
    maxSelect: 4,
    required: false,
    active: true,
    sortOrder: 3,
    options: [
      { id: 'fruta-banana', name: 'Banana Fatiada em Rodelas', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'fruta-morango', name: 'Morango Fresco Picado', active: true, sortOrder: 2, defaultAdditionalPrice: 2.50 },
      { id: 'fruta-kiwi', name: 'Kiwi em Fatias Finas', active: true, sortOrder: 3, defaultAdditionalPrice: 2.50 },
      { id: 'fruta-manga', name: 'Manga Doce em Cubos', active: true, sortOrder: 4, defaultAdditionalPrice: 1.50 },
      { id: 'fruta-uva', name: 'Uva Sem Semente Cortada', active: true, sortOrder: 5, defaultAdditionalPrice: 2.00 },
      { id: 'fruta-abacaxi', name: 'Abacaxi Pérola em Cubos', active: true, sortOrder: 6, defaultAdditionalPrice: 1.50 },
      { id: 'fruta-coco', name: 'Lâminas de Coco Fresco', active: true, sortOrder: 7, defaultAdditionalPrice: 2.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acai-coberturas-crocantes',
    name: 'Coberturas e Crocantes',
    description: 'Escolha complementos secos e crocantes para finalizar seu açaí ou sobremesa.',
    category: 'coberturas',
    compatibleSegments: ['acai_sorvetes', 'doceria', 'lanchonete', 'all'],
    compatibleProductTypes: ['prepared', 'simple'],
    selectionType: 'multiple',
    minSelect: 0,
    maxSelect: 5,
    required: false,
    active: true,
    sortOrder: 4,
    options: [
      { id: 'cob-granola', name: 'Granola Crocante Tradicional', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'cob-pacoca', name: 'Paçoca de Amendoim Esfarelada', active: true, sortOrder: 2, defaultAdditionalPrice: 1.00 },
      { id: 'cob-amendoim', name: 'Amendoim Torrado Moído Crocante', active: true, sortOrder: 3, defaultAdditionalPrice: 1.00 },
      { id: 'cob-confeitos', name: 'Confeitos de Chocolate tipo M&Ms', active: true, sortOrder: 4, defaultAdditionalPrice: 2.00 },
      { id: 'cob-granulado', name: 'Granulado de Chocolate Nobre', active: true, sortOrder: 5, defaultAdditionalPrice: 1.00 },
      { id: 'cob-castanhas', name: 'Castanha de Caju Triturada', active: true, sortOrder: 6, defaultAdditionalPrice: 3.00 },
      { id: 'cob-biscoito', name: 'Biscoito Triturado Crocante', active: true, sortOrder: 7, defaultAdditionalPrice: 1.50 },
      { id: 'cob-cereal', name: 'Cereal de Milho / Choco Ball', active: true, sortOrder: 8, defaultAdditionalPrice: 1.00 },
      { id: 'cob-leite-po', name: 'Leite em Pó Ninho Original', active: true, sortOrder: 9, defaultAdditionalPrice: 2.00 },
      { id: 'cob-coco-ralado', name: 'Coco Ralado Fino Seco', active: true, sortOrder: 10, defaultAdditionalPrice: 1.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acai-cremes-especiais',
    name: 'Cremes e Pastas Nobres',
    description: 'Cremes densos para intercalar camadas ou aplicar como cobertura.',
    category: 'cremes',
    compatibleSegments: ['acai_sorvetes', 'doceria', 'lanchonete', 'all'],
    compatibleProductTypes: ['prepared', 'simple'],
    selectionType: 'multiple',
    minSelect: 0,
    maxSelect: 4,
    required: false,
    active: true,
    sortOrder: 5,
    options: [
      { id: 'creme-avela', name: 'Creme de Avelã Nutella Original', active: true, sortOrder: 1, defaultAdditionalPrice: 4.00 },
      { id: 'creme-chocolate', name: 'Creme de Chocolate Trufado', active: true, sortOrder: 2, defaultAdditionalPrice: 2.50 },
      { id: 'creme-morango', name: 'Creme Aveludado de Morango', active: true, sortOrder: 3, defaultAdditionalPrice: 2.50 },
      { id: 'creme-ninho', name: 'Creme Especial de Leite Ninho', active: true, sortOrder: 4, defaultAdditionalPrice: 3.00 },
      { id: 'creme-cookies', name: 'Creme de Cookies & Cream', active: true, sortOrder: 5, defaultAdditionalPrice: 3.50 },
      { id: 'creme-pacoca', name: 'Creme de Paçoca Artesanal', active: true, sortOrder: 6, defaultAdditionalPrice: 2.50 },
      { id: 'creme-amendoim', name: 'Pasta de Amendoim Integral', active: true, sortOrder: 7, defaultAdditionalPrice: 2.00 },
      { id: 'creme-caramelo', name: 'Creme de Caramelo Salgado', active: true, sortOrder: 8, defaultAdditionalPrice: 3.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acai-caldas-xaropes',
    name: 'Caldas e Xaropes Líquidos',
    description: 'Caldas deliciosas para dar o brilho e sabor final.',
    category: 'caldas',
    compatibleSegments: ['acai_sorvetes', 'doceria', 'sobremesas', 'all'],
    compatibleProductTypes: ['prepared', 'simple'],
    selectionType: 'multiple',
    minSelect: 0,
    maxSelect: 3,
    required: false,
    active: true,
    sortOrder: 6,
    options: [
      { id: 'calda-chocolate', name: 'Calda de Chocolate Suíço', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'calda-morango', name: 'Calda de Morango Silvestre', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'calda-caramelo', name: 'Calda Dourada de Caramelo Toffee', active: true, sortOrder: 3, defaultAdditionalPrice: 0 },
      { id: 'calda-doce-leite', name: 'Calda Fluida de Doce de Leite', active: true, sortOrder: 4, defaultAdditionalPrice: 0 },
      { id: 'calda-leite-condensado', name: 'Leite Condensado Original', active: true, sortOrder: 5, defaultAdditionalPrice: 1.00 },
      { id: 'calda-frutas-vermelhas', name: 'Calda Rústica de Frutas Vermelhas', active: true, sortOrder: 6, defaultAdditionalPrice: 2.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'utensilios-descartaveis',
    name: 'Utensílios e Descartáveis',
    description: 'Ajude o meio ambiente: informe se precisa de talheres e guardanapos.',
    category: 'utensilios',
    compatibleSegments: ['acai_sorvetes', 'restaurante', 'lanchonete', 'pizzaria', 'doceria', 'all'],
    compatibleProductTypes: ['prepared', 'simple', 'variant', 'combo'],
    selectionType: 'single',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    active: true,
    sortOrder: 7,
    options: [
      { id: 'ut-preciso-colher', name: 'Sim, preciso de talher / colher', description: 'Talher biodegradável ou descartável', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'ut-nao-preciso-colher', name: 'Não preciso de talher (Economizar plástico)', description: 'Já possuo talheres em casa', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'ut-preciso-guardanapo', name: 'Sim, envie guardanapos extras', active: true, sortOrder: 3, defaultAdditionalPrice: 0 },
      { id: 'ut-nao-preciso-guardanapo', name: 'Não preciso de guardanapo descartável', active: true, sortOrder: 4, defaultAdditionalPrice: 0 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // B. PIZZAS
  // ==========================================
  {
    id: 'pizza-sabores-salgados',
    name: 'Sabores Salgados Tradicionais e Especiais',
    description: 'Escolha os sabores da pizza. Em pizzas médias ou grandes, pode selecionar até 2 sabores (meio a meio).',
    category: 'sabores',
    compatibleSegments: ['pizzaria', 'restaurante', 'all'],
    compatibleProductTypes: ['prepared', 'variant'],
    selectionType: 'multiple',
    minSelect: 1,
    maxSelect: 2,
    required: true,
    active: true,
    sortOrder: 8,
    options: [
      { id: 'piz-mussarela', name: 'Mussarela Especial', description: 'Molho de tomate caseiro, mussarela farta, rodelas de tomate e orégano', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'piz-calabresa', name: 'Calabresa Acebolada', description: 'Calabresa fatiada fininha, cebola roxa e azeitonas pretas', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'piz-portuguesa', name: 'Portuguesa Completa', description: 'Presunto, queijo, ovo cozido, cebola, ervilha e azeitona', active: true, sortOrder: 3, defaultAdditionalPrice: 0 },
      { id: 'piz-marguerita', name: 'Marguerita Clássica', description: 'Mussarela de búfala, fatias de tomate fresco e folhas de manjericão fresco', active: true, sortOrder: 4, defaultAdditionalPrice: 0 },
      { id: 'piz-quatro-queijos', name: 'Quatro Queijos Selecionados', description: 'Mussarela, provolone defumado, parmesão ralado e requeijão cremoso', active: true, sortOrder: 5, defaultAdditionalPrice: 3.00 },
      { id: 'piz-frango-catupiry', name: 'Frango com Requeijão Cremoso', description: 'Frango desfiado temperado com ervas e requeijão Catupiry original', active: true, sortOrder: 6, defaultAdditionalPrice: 2.00 },
      { id: 'piz-pepperoni', name: 'Pepperoni Supreme', description: 'Mussarela e generosas fatias de salame pepperoni levemente apimentado', active: true, sortOrder: 7, defaultAdditionalPrice: 4.00 },
      { id: 'piz-bacon', name: 'Bacon Crocante', description: 'Cubos generosos de bacon defumado e queijo mussarela derretido', active: true, sortOrder: 8, defaultAdditionalPrice: 3.00 },
      { id: 'piz-napolitana', name: 'Napolitana Tradicional', description: 'Mussarela, tomate em rodelas, parmesão e alho dourado', active: true, sortOrder: 9, defaultAdditionalPrice: 0 },
      { id: 'piz-atum', name: 'Atum Sólido com Cebola', description: 'Lombo de atum conservado, cebola fatiada e azeitonas', active: true, sortOrder: 10, defaultAdditionalPrice: 2.00 },
      { id: 'piz-palmito', name: 'Palmito Macio com Queijo', description: 'Palmito nobre em rodelas e queijo derretido', active: true, sortOrder: 11, defaultAdditionalPrice: 2.00 },
      { id: 'piz-brocolis', name: 'Brócolis com Alho e Bacon', description: 'Brócolis frescos refogados, alho crocante e bacon', active: true, sortOrder: 12, defaultAdditionalPrice: 2.00 },
      { id: 'piz-milho', name: 'Milho Verde com Requeijão', description: 'Milho doce na manteiga com requeijão cremoso e mussarela', active: true, sortOrder: 13, defaultAdditionalPrice: 0 },
      { id: 'piz-presunto', name: 'Presunto e Queijo', description: 'Presunto cozido fatiado com queijo derretido', active: true, sortOrder: 14, defaultAdditionalPrice: 0 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pizza-sabores-doces',
    name: 'Sabores Doces de Pizza',
    description: 'Pizzas doces deliciosas para fechar a noite com chave de ouro.',
    category: 'sabores',
    compatibleSegments: ['pizzaria', 'doceria', 'all'],
    compatibleProductTypes: ['prepared', 'variant'],
    selectionType: 'multiple',
    minSelect: 1,
    maxSelect: 2,
    required: true,
    active: true,
    sortOrder: 9,
    options: [
      { id: 'piz-doce-chocolate', name: 'Chocolate ao Leite com Raspas', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'piz-doce-brigadeiro', name: 'Brigadeiro Artesanal com Granulado', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'piz-doce-choc-branco', name: 'Chocolate Branco Nobre', active: true, sortOrder: 3, defaultAdditionalPrice: 0 },
      { id: 'piz-doce-banana', name: 'Banana com Canela e Açúcar', active: true, sortOrder: 4, defaultAdditionalPrice: 0 },
      { id: 'piz-doce-romeu', name: 'Romeu e Julieta (Goiabada Cascão e Queijo)', active: true, sortOrder: 5, defaultAdditionalPrice: 0 },
      { id: 'piz-doce-leite', name: 'Doce de Leite com Coco Queimado', active: true, sortOrder: 6, defaultAdditionalPrice: 0 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pizza-bordas-recheadas',
    name: 'Borda Recheada',
    description: 'Escolha o recheio especial da borda da pizza.',
    category: 'bordas',
    compatibleSegments: ['pizzaria', 'restaurante', 'all'],
    compatibleProductTypes: ['prepared', 'variant'],
    selectionType: 'single',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    active: true,
    sortOrder: 10,
    options: [
      { id: 'borda-sem', name: 'Sem Borda Recheada (Massa Tradicional)', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'borda-catupiry', name: 'Borda Recheada com Catupiry Original', active: true, sortOrder: 2, defaultAdditionalPrice: 8.00 },
      { id: 'borda-cheddar', name: 'Borda Recheada com Cheddar Cremoso', active: true, sortOrder: 3, defaultAdditionalPrice: 8.00 },
      { id: 'borda-mussarela', name: 'Borda Recheada com Mussarela Derretida', active: true, sortOrder: 4, defaultAdditionalPrice: 9.00 },
      { id: 'borda-chocolate', name: 'Borda Doce de Chocolate ao Leite', active: true, sortOrder: 5, defaultAdditionalPrice: 10.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pizza-extras-ingredientes',
    name: 'Extras e Ingredientes Adicionais',
    description: 'Deseja turbinar sua pizza com ingredientes extras?',
    category: 'extras',
    compatibleSegments: ['pizzaria', 'restaurante', 'all'],
    compatibleProductTypes: ['prepared', 'variant'],
    selectionType: 'multiple',
    minSelect: 0,
    maxSelect: 6,
    required: false,
    active: true,
    sortOrder: 11,
    options: [
      { id: 'extra-queijo', name: 'Queijo Mussarela Extra', active: true, sortOrder: 1, defaultAdditionalPrice: 6.00 },
      { id: 'extra-bacon', name: 'Bacon em Cubos Extra', active: true, sortOrder: 2, defaultAdditionalPrice: 5.00 },
      { id: 'extra-calabresa', name: 'Calabresa Extra Fatiada', active: true, sortOrder: 3, defaultAdditionalPrice: 4.50 },
      { id: 'extra-frango', name: 'Frango Desfiado Extra', active: true, sortOrder: 4, defaultAdditionalPrice: 5.00 },
      { id: 'extra-cebola', name: 'Cebola Roxa Extra', active: true, sortOrder: 5, defaultAdditionalPrice: 2.00 },
      { id: 'extra-tomate', name: 'Tomate Fresco Extra', active: true, sortOrder: 6, defaultAdditionalPrice: 2.00 },
      { id: 'extra-milho', name: 'Milho Verde Cozido', active: true, sortOrder: 7, defaultAdditionalPrice: 2.00 },
      { id: 'extra-azeitona', name: 'Azeitonas Pretas sem Caroço', active: true, sortOrder: 8, defaultAdditionalPrice: 3.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // C. HAMBÚRGUERES E SANDUÍCHES
  // ==========================================
  {
    id: 'burger-tipos-pao',
    name: 'Tipos de Pão Artesanal',
    description: 'Escolha a base do pão para selar na chapa com manteiga.',
    category: 'paes',
    compatibleSegments: ['lanchonete', 'restaurante', 'hamburgueria', 'all'],
    compatibleProductTypes: ['prepared', 'simple', 'variant'],
    selectionType: 'single',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    active: true,
    sortOrder: 12,
    options: [
      { id: 'pao-brioche', name: 'Pão Brioche Selado na Manteiga', description: 'Massa amanteigada e macia', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'pao-australiano', name: 'Pão Australiano Artesanal', description: 'Toque adocicado de cacau e mel', active: true, sortOrder: 2, defaultAdditionalPrice: 1.50 },
      { id: 'pao-gergelim', name: 'Pão Tradicional com Gergelim', description: 'Clássico com gergelim tostado', active: true, sortOrder: 3, defaultAdditionalPrice: 0 },
      { id: 'pao-integral', name: 'Pão Integral 7 Grãos', description: 'Rico em fibras e leve', active: true, sortOrder: 4, defaultAdditionalPrice: 1.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'burger-ponto-carne',
    name: 'Ponto da Carne',
    description: 'Como você prefere o preparo do seu hambúrguer artesanal?',
    category: 'proteinas',
    compatibleSegments: ['lanchonete', 'restaurante', 'hamburgueria', 'all'],
    compatibleProductTypes: ['prepared', 'simple'],
    selectionType: 'single',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    active: true,
    sortOrder: 13,
    options: [
      { id: 'ponto-mal', name: 'Mal Passado (Centro bem vermelho e muito suculento)', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'ponto-rosado', name: 'Ao Ponto (Centro rosado e suculento - Recomendado)', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'ponto-bem', name: 'Bem Passado (Completamente grelhado, sem centro rosa)', active: true, sortOrder: 3, defaultAdditionalPrice: 0 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'burger-molhos-especiais',
    name: 'Molhos Especiais da Casa',
    description: 'Escolha os molhos artesanais para acompanhar seu lanche.',
    category: 'molhos',
    compatibleSegments: ['lanchonete', 'restaurante', 'hamburgueria', 'all'],
    compatibleProductTypes: ['prepared', 'simple', 'combo'],
    selectionType: 'multiple',
    minSelect: 0,
    maxSelect: 3,
    required: false,
    active: true,
    sortOrder: 14,
    options: [
      { id: 'molho-maionese-verde', name: 'Maionese Verde da Casa com Ervas', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'molho-barbecue', name: 'Molho Barbecue Defumado com Mel', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'molho-billy-jack', name: 'Molho Especial Billy Jack Creamy', active: true, sortOrder: 3, defaultAdditionalPrice: 1.50 },
      { id: 'molho-mostarda-mel', name: 'Mostarda & Mel Dijon', active: true, sortOrder: 4, defaultAdditionalPrice: 1.50 },
      { id: 'molho-geleia-pimenta', name: 'Geleia de Pimenta Biquinho Defumada', active: true, sortOrder: 5, defaultAdditionalPrice: 2.00 },
      { id: 'molho-ketchup-rustico', name: 'Ketchup Rústico com Especiarias', active: true, sortOrder: 6, defaultAdditionalPrice: 0 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'burger-adicionais-extras',
    name: 'Ingredientes Adicionais para o Hambúrguer',
    description: 'Adicione mais carne, queijo derretido ou bacon crocante.',
    category: 'adicionais',
    compatibleSegments: ['lanchonete', 'restaurante', 'hamburgueria', 'all'],
    compatibleProductTypes: ['prepared', 'simple'],
    selectionType: 'multiple',
    minSelect: 0,
    maxSelect: 5,
    required: false,
    active: true,
    sortOrder: 15,
    options: [
      { id: 'add-bacon-crispy', name: 'Tiras de Bacon Artesanal Crocante', active: true, sortOrder: 1, defaultAdditionalPrice: 4.50 },
      { id: 'add-hamburguer-extra', name: 'Hambúrguer de Costela 160g Extra', active: true, sortOrder: 2, defaultAdditionalPrice: 9.00 },
      { id: 'add-queijo-cheddar', name: 'Fatias de Queijo Cheddar Cremoso Extra', active: true, sortOrder: 3, defaultAdditionalPrice: 3.50 },
      { id: 'add-cebola-caramelizada', name: 'Cebola Caramelizada no Shoyu', active: true, sortOrder: 4, defaultAdditionalPrice: 3.00 },
      { id: 'add-ovo-frito', name: 'Ovo Caipira Frito na Manteiga', active: true, sortOrder: 5, defaultAdditionalPrice: 2.50 },
      { id: 'add-picles', name: 'Picles Crocantes em Fatias', active: true, sortOrder: 6, defaultAdditionalPrice: 2.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'burger-retirar-ingredientes',
    name: 'Retirar Ingredientes (Sem custo)',
    description: 'Alguma restrição ou preferência? Marque o que NÃO deve ir no lanche.',
    category: 'retiradas',
    compatibleSegments: ['lanchonete', 'restaurante', 'hamburgueria', 'all'],
    compatibleProductTypes: ['prepared', 'simple'],
    selectionType: 'multiple',
    minSelect: 0,
    maxSelect: 6,
    required: false,
    active: true,
    sortOrder: 16,
    options: [
      { id: 'retirar-cebola', name: 'Sem Cebola', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'retirar-picles', name: 'Sem Picles', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'retirar-tomate', name: 'Sem Tomate', active: true, sortOrder: 3, defaultAdditionalPrice: 0 },
      { id: 'retirar-alface', name: 'Sem Alface', active: true, sortOrder: 4, defaultAdditionalPrice: 0 },
      { id: 'retirar-maionese', name: 'Sem Maionese / Molhos', active: true, sortOrder: 5, defaultAdditionalPrice: 0 },
      { id: 'retirar-sal', name: 'Carne sem Sal Adicional', active: true, sortOrder: 6, defaultAdditionalPrice: 0 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // D. SALGADOS E PASTÉIS
  // ==========================================
  {
    id: 'salgados-recheios-salgados',
    name: 'Recheios Salgados para Salgados e Pastéis',
    description: 'Escolha o recheio para pasteis, coxinhas, empadas e esfihas.',
    category: 'recheios',
    compatibleSegments: ['lanchonete', 'padaria', 'salgados', 'all'],
    compatibleProductTypes: ['prepared', 'simple'],
    selectionType: 'single',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    active: true,
    sortOrder: 17,
    options: [
      { id: 'rech-frango-catupiry', name: 'Frango com Requeijão Catupiry', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'rech-carne-moida', name: 'Carne Moída Refogada Especial com Azeitonas', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'rech-carne-queijo', name: 'Carne com Queijo Mussarela', active: true, sortOrder: 3, defaultAdditionalPrice: 1.00 },
      { id: 'rech-queijo-puro', name: 'Queijo Mussarela Duplo com Orégano', active: true, sortOrder: 4, defaultAdditionalPrice: 0 },
      { id: 'rech-pizza', name: 'Pizza (Queijo, presunto, tomate e orégano)', active: true, sortOrder: 5, defaultAdditionalPrice: 0 },
      { id: 'rech-calabresa', name: 'Calabresa com Cebola e Queijo', active: true, sortOrder: 6, defaultAdditionalPrice: 0 },
      { id: 'rech-palmito', name: 'Palmito com Ervas e Queijo', active: true, sortOrder: 7, defaultAdditionalPrice: 1.50 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // E. MARMITAS E REFEIÇÕES
  // ==========================================
  {
    id: 'marmita-proteina-principal',
    name: 'Proteína Principal da Refeição',
    description: 'Escolha a carne ou prato principal da sua refeição.',
    category: 'proteinas',
    compatibleSegments: ['restaurante', 'marmitaria', 'all'],
    compatibleProductTypes: ['prepared', 'simple', 'combo'],
    selectionType: 'single',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    active: true,
    sortOrder: 18,
    options: [
      { id: 'prot-frango-grelhado', name: 'Filé de Frango Grelhado na Brasa', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'prot-alcatra-acebolada', name: 'Bife de Alcatra Macio com Cebola', active: true, sortOrder: 2, defaultAdditionalPrice: 3.00 },
      { id: 'prot-peixe-grelhado', name: 'Filé de Tilápia Grelhada ao Limão', active: true, sortOrder: 3, defaultAdditionalPrice: 3.50 },
      { id: 'prot-linguica-assada', name: 'Linguiça Toscana Assada', active: true, sortOrder: 4, defaultAdditionalPrice: 0 },
      { id: 'prot-bisteca-porco', name: 'Bisteca Suína Dourada', active: true, sortOrder: 5, defaultAdditionalPrice: 0 },
      { id: 'prot-vegetariano', name: 'Mix de Legumes Grelhados e Ovos (Vegetariano)', active: true, sortOrder: 6, defaultAdditionalPrice: 0 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'marmita-base-arroz-feijao',
    name: 'Arroz e Feijão',
    description: 'Como você deseja a base do seu prato feito ou marmita?',
    category: 'acompanhamentos',
    compatibleSegments: ['restaurante', 'marmitaria', 'all'],
    compatibleProductTypes: ['prepared', 'simple'],
    selectionType: 'multiple',
    minSelect: 1,
    maxSelect: 2,
    required: true,
    active: true,
    sortOrder: 19,
    options: [
      { id: 'arroz-branco', name: 'Arroz Branco Soltinho', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'arroz-integral', name: 'Arroz Integral Caseiro', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'feijao-carioca', name: 'Feijão Carioca Fresco com Louro', active: true, sortOrder: 3, defaultAdditionalPrice: 0 },
      { id: 'feijao-preto', name: 'Feijão Preto Temperado', active: true, sortOrder: 4, defaultAdditionalPrice: 0 },
      { id: 'sem-arroz', name: 'Sem Arroz (Dobrar salada ou legumes)', active: true, sortOrder: 5, defaultAdditionalPrice: 0 },
      { id: 'sem-feijao', name: 'Sem Feijão', active: true, sortOrder: 6, defaultAdditionalPrice: 0 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'marmita-guarnicoes',
    name: 'Guarnições e Acompanhamentos',
    description: 'Escolha até 2 guarnições inclusas no seu prato.',
    category: 'guarnicoes',
    compatibleSegments: ['restaurante', 'marmitaria', 'all'],
    compatibleProductTypes: ['prepared', 'simple'],
    selectionType: 'multiple',
    minSelect: 0,
    maxSelect: 2,
    required: false,
    active: true,
    sortOrder: 20,
    options: [
      { id: 'guar-batata-frita', name: 'Batata Frita Crocante', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'guar-pure-batata', name: 'Purê de Batatas Aveludado', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'guar-farofa-bacon', name: 'Farofa Caseira com Bacon e Alho', active: true, sortOrder: 3, defaultAdditionalPrice: 0 },
      { id: 'guar-macarrao', name: 'Macarrão Espaguete ao Alho e Óleo', active: true, sortOrder: 4, defaultAdditionalPrice: 0 },
      { id: 'guar-mandioca', name: 'Mandioca Cozida na Manteiga', active: true, sortOrder: 5, defaultAdditionalPrice: 0 },
      { id: 'guar-salada-verde', name: 'Salada Verde Fresca (Alface e Tomate)', active: true, sortOrder: 6, defaultAdditionalPrice: 0 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // F. HOT DOGS
  // ==========================================
  {
    id: 'hotdog-salsichas-queijos',
    name: 'Recheios do Pão e Coberturas do Hot Dog',
    description: 'Personalize os complementos do seu prensado ou tradicional.',
    category: 'complementos',
    compatibleSegments: ['lanchonete', 'hotdog', 'all'],
    compatibleProductTypes: ['prepared', 'simple'],
    selectionType: 'multiple',
    minSelect: 1,
    maxSelect: 6,
    required: true,
    active: true,
    sortOrder: 21,
    options: [
      { id: 'hd-pure', name: 'Purê de Batata Cremoso Quentinho', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'hd-batata-palha', name: 'Batata Palha Crocante', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'hd-milho-ervilha', name: 'Milho Doce e Ervilha Fresca', active: true, sortOrder: 3, defaultAdditionalPrice: 0 },
      { id: 'hd-vinagrete', name: 'Vinagrete Picadinho Caseiro', active: true, sortOrder: 4, defaultAdditionalPrice: 0 },
      { id: 'hd-cheddar', name: 'Cheddar Cremoso Quente', active: true, sortOrder: 5, defaultAdditionalPrice: 2.00 },
      { id: 'hd-catupiry', name: 'Catupiry Original Forneado', active: true, sortOrder: 6, defaultAdditionalPrice: 2.00 },
      { id: 'hd-bacon', name: 'Bacon em Cubos Frito', active: true, sortOrder: 7, defaultAdditionalPrice: 3.00 },
      { id: 'hd-salsicha-extra', name: 'Salsicha Extra (+1 unidade)', active: true, sortOrder: 8, defaultAdditionalPrice: 2.50 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // G. BEBIDAS E CAFÉS
  // ==========================================
  {
    id: 'bebidas-embalagem-volume',
    name: 'Tamanho e Embalagem da Bebida',
    description: 'Escolha o volume ou tipo de embalagem desejado.',
    category: 'embalagem',
    compatibleSegments: ['bebidas', 'lanchonete', 'restaurante', 'pizzaria', 'all'],
    compatibleProductTypes: ['simple', 'variant', 'industrialized'],
    selectionType: 'single',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    active: true,
    sortOrder: 21,
    options: [
      { id: 'beb-lata-350', name: 'Lata 350ml Gelada', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'beb-garrafa-600', name: 'Garrafa 600ml', active: true, sortOrder: 2, defaultAdditionalPrice: 3.00 },
      { id: 'beb-garrafa-2l', name: 'Garrafa 2 Litros (Familiar)', active: true, sortOrder: 3, defaultAdditionalPrice: 7.00 },
      { id: 'beb-copo-500', name: 'Copo 500ml com Gelo', active: true, sortOrder: 4, defaultAdditionalPrice: 2.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bebidas-personalizacao',
    name: 'Personalização da Bebida / Café',
    description: 'Adoçamento, gelo e tipo de leite para o preparo perfeito.',
    category: 'bebidas',
    compatibleSegments: ['bebidas', 'cafeteria', 'lanchonete', 'all'],
    compatibleProductTypes: ['prepared', 'simple'],
    selectionType: 'multiple',
    minSelect: 0,
    maxSelect: 3,
    required: false,
    active: true,
    sortOrder: 22,
    options: [
      { id: 'beb-sem-acucar', name: 'Sem Açúcar / Adoçante', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'beb-adocante', name: 'Adoçar com Adoçante Sucralose', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'beb-com-gelo', name: 'Com Bastante Gelo e Limão', active: true, sortOrder: 3, defaultAdditionalPrice: 0 },
      { id: 'beb-sem-gelo', name: 'Sem Gelo (Temperatura Ambiente)', active: true, sortOrder: 4, defaultAdditionalPrice: 0 },
      { id: 'beb-leite-vegetal', name: 'Substituir Leite por Bebida de Aveia / Vegetal', active: true, sortOrder: 5, defaultAdditionalPrice: 3.00 },
      { id: 'beb-chantilly', name: 'Cobertura de Chantilly Fresco no Topo', active: true, sortOrder: 6, defaultAdditionalPrice: 2.50 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // H. BOLOS, DOCES E CONFEITARIA
  // ==========================================
  {
    id: 'confeitaria-recheios-bolos',
    name: 'Massas e Recheios de Bolos Artesanais',
    description: 'Combine a massa e os recheios para tortas e bolos recheados.',
    category: 'recheios',
    compatibleSegments: ['doceria', 'padaria', 'confeitaria', 'all'],
    compatibleProductTypes: ['prepared', 'variant'],
    selectionType: 'multiple',
    minSelect: 1,
    maxSelect: 3,
    required: true,
    active: true,
    sortOrder: 23,
    options: [
      { id: 'bolo-brigadeiro-gourmet', name: 'Brigadeiro Gourmet Feito com Chocolate Belga', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'bolo-creme-ninho', name: 'Creme de Leite Ninho com Frutas Vermelhas', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'bolo-doce-leite-nozes', name: 'Doce de Leite Cozido com Nozes Trituradas', active: true, sortOrder: 3, defaultAdditionalPrice: 4.00 },
      { id: 'bolo-4-leites', name: 'Recheio Nobre de 4 Leites Cremoso', active: true, sortOrder: 4, defaultAdditionalPrice: 0 },
      { id: 'bolo-prestigio', name: 'Prestígio com Fitas de Coco Fresco e Ganache', active: true, sortOrder: 5, defaultAdditionalPrice: 0 },
      { id: 'bolo-morangos', name: 'Adicionar Pedaços de Morangos Frescos', active: true, sortOrder: 6, defaultAdditionalPrice: 5.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // I. PORÇÕES E PETISCOS
  // ==========================================
  {
    id: 'porcoes-tamanhos',
    name: 'Tamanho da Porção',
    description: 'Escolha o tamanho da porção ideal para você ou para compartilhar.',
    category: 'tamanhos',
    compatibleSegments: ['restaurante', 'lanchonete', 'bar', 'porcoes', 'all'],
    compatibleProductTypes: ['prepared', 'simple', 'variant'],
    selectionType: 'single',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    active: true,
    sortOrder: 24,
    options: [
      { id: 'porc-tam-media', name: 'Porção Média (Individual / 2 pessoas - aprox. 350g)', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'porc-tam-grande', name: 'Porção Grande (Família / 3-4 pessoas - aprox. 700g)', active: true, sortOrder: 2, defaultAdditionalPrice: 15.00 },
      { id: 'porc-tam-mega', name: 'Porção Mega / Balde Especial (aprox. 1kg)', active: true, sortOrder: 3, defaultAdditionalPrice: 28.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'porcoes-molhos-acompanhamentos',
    name: 'Molhos e Complementos para Porções',
    description: 'Escolha molhos e adicionais para petiscos, batatas e carnes.',
    category: 'molhos',
    compatibleSegments: ['restaurante', 'lanchonete', 'bar', 'all'],
    compatibleProductTypes: ['prepared', 'simple'],
    selectionType: 'multiple',
    minSelect: 0,
    maxSelect: 3,
    required: false,
    active: true,
    sortOrder: 25,
    options: [
      { id: 'porc-molho-tartaro', name: 'Molho Tártaro Cremoso Especial', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'porc-maionese-alho', name: 'Maionese Temperada com Alho Assado', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'porc-barbecue', name: 'Molho Barbecue Defumado', active: true, sortOrder: 3, defaultAdditionalPrice: 0 },
      { id: 'porc-queijo-gratinado', name: 'Cobrir com Queijo Mussarela Gratinado na Chapa', active: true, sortOrder: 4, defaultAdditionalPrice: 6.00 },
      { id: 'porc-cheddar-bacon', name: 'Cobertura de Queijo Cheddar Derretido e Bacon', active: true, sortOrder: 5, defaultAdditionalPrice: 8.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // J. FLORICULTURAS, PRESENTES E CARTÕES
  // ==========================================
  {
    id: 'presentes-embalagens-cartoes',
    name: 'Embalagem Especial e Cartão Dedicatória',
    description: 'Adicione mimos, laços de presente ou uma mensagem carinhosa.',
    category: 'presentes',
    compatibleSegments: ['floricultura', 'presentes', 'doceria', 'all'],
    compatibleProductTypes: ['prepared', 'simple', 'industrialized'],
    selectionType: 'multiple',
    minSelect: 0,
    maxSelect: 2,
    required: false,
    active: true,
    sortOrder: 26,
    options: [
      { id: 'pres-laco-cetim', name: 'Embalagem para Presente com Laço de Cetim Nobre', active: true, sortOrder: 1, defaultAdditionalPrice: 5.00 },
      { id: 'pres-cartao-dedicatoria', name: 'Cartão com Mensagem Escrita à Mão (Informar nas observações)', active: true, sortOrder: 2, defaultAdditionalPrice: 3.50 },
      { id: 'pres-sacola-kraft', name: 'Sacola Kraft Ecológica Personalizada', active: true, sortOrder: 3, defaultAdditionalPrice: 2.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // K. MERCADOS, CONVENIÊNCIA E HORTIFRÚTI
  // ==========================================
  {
    id: 'mercado-embalagens-tamanhos',
    name: 'Tamanho e Tipo de Embalagem',
    description: 'Selecione a versão, peso ou tamanho desejado do produto.',
    category: 'embalagem',
    compatibleSegments: ['mercado', 'conveniencia', 'hortifruti', 'all'],
    compatibleProductTypes: ['industrialized', 'weighted', 'simple'],
    selectionType: 'single',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    active: true,
    sortOrder: 27,
    options: [
      { id: 'merc-tam-padrao', name: 'Embalagem Padrão / Unidade Original', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'merc-tam-economico', name: 'Tamanho Econômico / Pacote Família', active: true, sortOrder: 2, defaultAdditionalPrice: 8.00 },
      { id: 'merc-tam-mini', name: 'Versão Mini / Individual', active: true, sortOrder: 3, defaultAdditionalPrice: 0 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mercado-substituicao',
    name: 'Preferência de Substituição (Se faltar item)',
    description: 'Como o estabelecimento deve proceder caso algum item ou peso não esteja disponível?',
    category: 'substituicao',
    compatibleSegments: ['mercado', 'conveniencia', 'hortifruti', 'all'],
    compatibleProductTypes: ['industrialized', 'weighted', 'simple'],
    selectionType: 'single',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    active: true,
    sortOrder: 28,
    options: [
      { id: 'subst-ligar', name: 'Ligar para mim antes de substituir qualquer item', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'subst-similar', name: 'Substituir por marca similar de igual ou maior valor', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'subst-cancelar', name: 'Não substituir (remover do pedido e estornar valor)', active: true, sortOrder: 3, defaultAdditionalPrice: 0 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ==========================================
  // L. PET SHOPS E LOJAS ESPECIALIZADAS
  // ==========================================
  {
    id: 'pet-tamanhos',
    name: 'Porte do Pet / Tamanho do Acessório',
    description: 'Selecione o tamanho adequado para o seu pet.',
    category: 'tamanhos',
    compatibleSegments: ['petshop', 'loja_especializada', 'all'],
    compatibleProductTypes: ['simple', 'variant', 'industrialized'],
    selectionType: 'single',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    active: true,
    sortOrder: 27,
    options: [
      { id: 'pet-pequeno', name: 'Porte Pequeno (P / Filhotes)', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'pet-medio', name: 'Porte Médio (M / Até 15kg)', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'pet-grande', name: 'Porte Grande (G / Acima de 15kg)', active: true, sortOrder: 3, defaultAdditionalPrice: 5.00 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pet-cores',
    name: 'Cores e Variações',
    description: 'Escolha a preferência de cor ou estampa.',
    category: 'cores',
    compatibleSegments: ['petshop', 'loja_especializada', 'all'],
    compatibleProductTypes: ['simple', 'variant'],
    selectionType: 'single',
    minSelect: 0,
    maxSelect: 1,
    required: false,
    active: true,
    sortOrder: 28,
    options: [
      { id: 'cor-azul', name: 'Azul Clássico', active: true, sortOrder: 1, defaultAdditionalPrice: 0 },
      { id: 'cor-rosa', name: 'Rosa Delicado', active: true, sortOrder: 2, defaultAdditionalPrice: 0 },
      { id: 'cor-vermelho', name: 'Vermelho Vibrante', active: true, sortOrder: 3, defaultAdditionalPrice: 0 },
      { id: 'cor-preto', name: 'Preto / Cinza Neutro', active: true, sortOrder: 4, defaultAdditionalPrice: 0 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export interface TemplateFilterParams {
  segment?: string;
  category?: string;
  productType?: ProductType;
  search?: string;
  activeOnly?: boolean;
}

/**
 * Fetch global option templates from Firestore with client-side fallback
 */
export async function getGlobalOptionTemplates(filters?: TemplateFilterParams): Promise<GlobalOptionGroupTemplate[]> {
  try {
    const colRef = collection(db, GLOBAL_TEMPLATES_COLLECTION);
    const snapshot = await getDocs(colRef);
    let templates: GlobalOptionGroupTemplate[] = [];

    snapshot.forEach(docSnap => {
      templates.push({ id: docSnap.id, ...docSnap.data() } as GlobalOptionGroupTemplate);
    });

    // If database is not yet seeded, return the predefined in-memory templates and trigger idempotent seed
    if (templates.length === 0) {
      templates = [...DEFAULT_GLOBAL_OPTION_TEMPLATES];
      // Only the platform administrator may initialize the shared catalog.
      if (auth.currentUser?.email?.toLowerCase() === 'mapwiser@gmail.com') {
        seedGlobalOptionTemplates(false).catch(e => console.warn('Background auto-seed templates:', e));
      }
    }

    // Apply sorting
    templates.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    // Filter
    if (filters) {
      if (filters.activeOnly) {
        templates = templates.filter(t => t.active !== false);
      }
      if (filters.category && filters.category !== 'all') {
        templates = templates.filter(t => t.category.toLowerCase() === filters.category!.toLowerCase());
      }
      if (filters.segment && filters.segment !== 'all') {
        const seg = filters.segment.toLowerCase();
        templates = templates.filter(t => 
          t.compatibleSegments.includes('all') || 
          t.compatibleSegments.some(s => s.toLowerCase() === seg || seg.includes(s.toLowerCase()))
        );
      }
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        templates = templates.filter(t => 
          t.name.toLowerCase().includes(q) || 
          (t.description && t.description.toLowerCase().includes(q)) ||
          t.category.toLowerCase().includes(q) ||
          t.options.some(o => o.name.toLowerCase().includes(q))
        );
      }
    }

    return templates;
  } catch (error) {
    console.warn('Could not read globalOptionGroupTemplates from Firestore, falling back to defaults:', error);
    let templates = [...DEFAULT_GLOBAL_OPTION_TEMPLATES];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      templates = templates.filter(t => t.name.toLowerCase().includes(q) || t.options.some(o => o.name.toLowerCase().includes(q)));
    }
    return templates;
  }
}

/**
 * Get a specific global template by ID
 */
export async function getGlobalOptionTemplateById(id: string): Promise<GlobalOptionGroupTemplate | null> {
  try {
    const docRef = doc(db, GLOBAL_TEMPLATES_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as GlobalOptionGroupTemplate;
    }
    const def = DEFAULT_GLOBAL_OPTION_TEMPLATES.find(t => t.id === id);
    return def || null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${GLOBAL_TEMPLATES_COLLECTION}/${id}`);
    const def = DEFAULT_GLOBAL_OPTION_TEMPLATES.find(t => t.id === id);
    return def || null;
  }
}

/**
 * Admin: Create a new template in the global catalog
 */
export async function createGlobalOptionTemplate(template: GlobalOptionGroupTemplate): Promise<void> {
  const path = `${GLOBAL_TEMPLATES_COLLECTION}/${template.id}`;
  try {
    const docRef = doc(db, GLOBAL_TEMPLATES_COLLECTION, template.id);
    const sanitized = removeUndefinedFields({
      ...template,
      createdAt: template.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Admin: Update a global template
 */
export async function updateGlobalOptionTemplate(id: string, updates: Partial<GlobalOptionGroupTemplate>): Promise<void> {
  const path = `${GLOBAL_TEMPLATES_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, GLOBAL_TEMPLATES_COLLECTION, id);
    const sanitized = removeUndefinedFields({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(docRef, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Admin: Delete a global template (or mark inactive)
 */
export async function deleteGlobalOptionTemplate(id: string): Promise<void> {
  const path = `${GLOBAL_TEMPLATES_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, GLOBAL_TEMPLATES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Idempotent Seed: Writes all default templates into Firestore if not present,
 * or updates them if force is true. Never duplicates documents because stable IDs are used.
 */
export async function seedGlobalOptionTemplates(force: boolean = false): Promise<{ seeded: number; skipped: number; total: number }> {
  let seeded = 0;
  let skipped = 0;

  for (const template of DEFAULT_GLOBAL_OPTION_TEMPLATES) {
    try {
      const docRef = doc(db, GLOBAL_TEMPLATES_COLLECTION, template.id);
      if (!force) {
        const existing = await getDoc(docRef);
        if (existing.exists()) {
          skipped++;
          continue;
        }
      }
      const sanitized = removeUndefinedFields({
        ...template,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(docRef, sanitized);
      seeded++;
    } catch (e) {
      console.error(`Error seeding template ${template.id}:`, e);
    }
  }

  return {
    seeded,
    skipped,
    total: DEFAULT_GLOBAL_OPTION_TEMPLATES.length
  };
}

/**
 * Instantiate a Global Template into a ProductOptionGroup for a specific product/store
 */
export function instantiateTemplateForProduct(
  template: GlobalOptionGroupTemplate,
  overridePrices?: Record<string, number>
): ProductOptionGroup {
  return removeUndefinedFields<ProductOptionGroup>({
    id: `pog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    templateId: template.id,
    name: template.name,
    description: template.description || '',
    required: template.required,
    minSelect: template.minSelect,
    maxSelect: template.maxSelect,
    selectionType: template.selectionType,
    sortOrder: template.sortOrder || 1,
    options: template.options.map((opt, index) => {
      const item: ProductOptionItem = {
        id: `opt_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
        templateOptionId: opt.id,
        name: opt.name,
        price: overridePrices?.[opt.id] !== undefined ? overridePrices[opt.id] : (opt.defaultAdditionalPrice || 0),
        available: opt.active !== false,
        sortOrder: opt.sortOrder || index + 1,
      };
      if (opt.description) item.description = opt.description;
      if (opt.imageUrl) item.imageUrl = opt.imageUrl;
      return item;
    })
  });
}

/**
 * Store-level custom option groups (reusable within the merchant's store)
 */
export async function getStoreCustomOptionGroups(storeId: string): Promise<ProductOptionGroup[]> {
  const path = `stores/${storeId}/optionGroups`;
  try {
    const snapshot = await getDocs(collection(db, path));
    const groups: ProductOptionGroup[] = [];
    snapshot.forEach(docSnap => {
      groups.push({ id: docSnap.id, ...docSnap.data() } as ProductOptionGroup);
    });
    return groups;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveStoreCustomOptionGroup(storeId: string, group: ProductOptionGroup): Promise<void> {
  const path = `stores/${storeId}/optionGroups/${group.id}`;
  try {
    const docRef = doc(db, `stores/${storeId}/optionGroups`, group.id);
    const sanitized = removeUndefinedFields({
      ...group,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStoreCustomOptionGroup(storeId: string, groupId: string): Promise<void> {
  const path = `stores/${storeId}/optionGroups/${groupId}`;
  try {
    const docRef = doc(db, `stores/${storeId}/optionGroups`, groupId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Intelligent Category-based Option Groups Auto-Association
 * Maps normalized category names and product titles to their exact, compatible Option Groups.
 * Ensures strict isolation (e.g. Açaí does NOT get ice cream scoops, Drinks do NOT get pizza/burger toppings).
 */
export function getDefaultOptionGroupsForCategory(categoryName?: string, productName?: string): ProductOptionGroup[] {
  const normCat = (categoryName || '').toLowerCase().trim();
  const normProd = (productName || '').toLowerCase().trim();

  // 1. AÇAÍ (Strict: bases, frutas, coberturas, cremes, caldas, descartáveis - NO ice cream scoops!)
  if (normCat.includes('açaí') || normCat.includes('acai') || normProd.includes('açaí') || normProd.includes('acai')) {
    const acaiIds = [
      'acai-bases-sabores',
      'acai-frutas-frescas',
      'acai-coberturas-crocantes',
      'acai-cremes-especiais',
      'acai-caldas-xaropes',
      'utensilios-descartaveis'
    ];
    return acaiIds
      .map(id => DEFAULT_GLOBAL_OPTION_TEMPLATES.find(t => t.id === id))
      .filter((t): t is GlobalOptionGroupTemplate => !!t)
      .map(t => instantiateTemplateForProduct(t));
  }

  // 2. SORVETES E GELATERIA (sabores, bolas, coberturas e caldas)
  if (normCat.includes('sorvete') || normCat.includes('gelat') || normProd.includes('sorvete') || normProd.includes('gelato')) {
    const sorveteIds = [
      'sorvete-quantidade-bolas',
      'sorvete-sabores',
      'acai-coberturas-crocantes',
      'acai-caldas-xaropes',
      'utensilios-descartaveis'
    ];
    return sorveteIds
      .map(id => DEFAULT_GLOBAL_OPTION_TEMPLATES.find(t => t.id === id))
      .filter((t): t is GlobalOptionGroupTemplate => !!t)
      .map(t => instantiateTemplateForProduct(t));
  }

  // 3. PIZZAS (sabores, bordas recheadas e ingredientes extras)
  if (normCat.includes('pizza') || normProd.includes('pizza')) {
    const pizzaIds = [
      'pizza-sabores-salgados',
      'pizza-bordas-recheadas',
      'pizza-extras-ingredientes'
    ];
    return pizzaIds
      .map(id => DEFAULT_GLOBAL_OPTION_TEMPLATES.find(t => t.id === id))
      .filter((t): t is GlobalOptionGroupTemplate => !!t)
      .map(t => instantiateTemplateForProduct(t));
  }

  // 4. HAMBÚRGUERES / LANCHES (pães, queijos, molhos e adicionais)
  if (
    normCat.includes('hambúrguer') || 
    normCat.includes('hamburguer') || 
    normCat.includes('burger') || 
    normCat.includes('lanche') || 
    normProd.includes('burger') || 
    normProd.includes('hambúrguer') || 
    normProd.includes('hamburguer')
  ) {
    const burgerIds = [
      'burger-tipos-pao',
      'burger-ponto-carne',
      'burger-molhos-especiais',
      'burger-adicionais-extras',
      'burger-retirar-ingredientes'
    ];
    return burgerIds
      .map(id => DEFAULT_GLOBAL_OPTION_TEMPLATES.find(t => t.id === id))
      .filter((t): t is GlobalOptionGroupTemplate => !!t)
      .map(t => instantiateTemplateForProduct(t));
  }

  // 5. MARMITAS / REFEIÇÕES / PRATOS PRINCIPAIS / ALMOÇO (proteínas, guarnições e acompanhamentos)
  if (
    normCat.includes('marmit') || 
    normCat.includes('refeiç') || 
    normCat.includes('refeic') || 
    normCat.includes('almoço') || 
    normCat.includes('almoco') || 
    normCat.includes('prato') || 
    normProd.includes('marmita') || 
    normProd.includes('prato feito')
  ) {
    const marmitaIds = [
      'marmita-proteina-principal',
      'marmita-base-arroz-feijao',
      'marmita-guarnicoes',
      'utensilios-descartaveis'
    ];
    return marmitaIds
      .map(id => DEFAULT_GLOBAL_OPTION_TEMPLATES.find(t => t.id === id))
      .filter((t): t is GlobalOptionGroupTemplate => !!t)
      .map(t => instantiateTemplateForProduct(t));
  }

  // 6. SALGADOS E PASTÉIS (sabores, recheios e molhos)
  if (
    normCat.includes('salgado') || 
    normCat.includes('pastel') || 
    normCat.includes('esfiha') || 
    normProd.includes('pastel') || 
    normProd.includes('salgado') || 
    normProd.includes('coxinha')
  ) {
    const salgadosIds = [
      'salgados-recheios-salgados',
      'burger-molhos-especiais'
    ];
    return salgadosIds
      .map(id => DEFAULT_GLOBAL_OPTION_TEMPLATES.find(t => t.id === id))
      .filter((t): t is GlobalOptionGroupTemplate => !!t)
      .map(t => instantiateTemplateForProduct(t));
  }

  // 7. HOT DOGS (ingredientes, molhos e adicionais)
  if (
    normCat.includes('hot dog') || 
    normCat.includes('hotdog') || 
    normCat.includes('cachorro') || 
    normProd.includes('hot dog') || 
    normProd.includes('hotdog')
  ) {
    const hotdogIds = [
      'hotdog-salsichas-queijos',
      'burger-molhos-especiais',
      'burger-adicionais-extras'
    ];
    return hotdogIds
      .map(id => DEFAULT_GLOBAL_OPTION_TEMPLATES.find(t => t.id === id))
      .filter((t): t is GlobalOptionGroupTemplate => !!t)
      .map(t => instantiateTemplateForProduct(t));
  }

  // 8. BOLOS E DOCES (massas, recheios e coberturas)
  if (
    normCat.includes('bolo') || 
    normCat.includes('doce') || 
    normCat.includes('torta') || 
    normCat.includes('confeitaria') || 
    normProd.includes('bolo') || 
    normProd.includes('torta')
  ) {
    const docesIds = [
      'confeitaria-recheios-bolos',
      'acai-caldas-xaropes',
      'acai-coberturas-crocantes',
      'utensilios-descartaveis'
    ];
    return docesIds
      .map(id => DEFAULT_GLOBAL_OPTION_TEMPLATES.find(t => t.id === id))
      .filter((t): t is GlobalOptionGroupTemplate => !!t)
      .map(t => instantiateTemplateForProduct(t));
  }

  // 9. PORÇÕES (tamanhos, molhos e acompanhamentos)
  if (
    normCat.includes('porç') || 
    normCat.includes('porc') || 
    normCat.includes('petisco') || 
    normCat.includes('aperitivo') || 
    normProd.includes('porção') || 
    normProd.includes('batata frita')
  ) {
    const porcoesIds = [
      'porcoes-tamanhos',
      'porcoes-molhos-acompanhamentos',
      'utensilios-descartaveis'
    ];
    return porcoesIds
      .map(id => DEFAULT_GLOBAL_OPTION_TEMPLATES.find(t => t.id === id))
      .filter((t): t is GlobalOptionGroupTemplate => !!t)
      .map(t => instantiateTemplateForProduct(t));
  }

  // 10. REFRIGERANTES E BEBIDAS (volume, embalagem e variantes — sem cremes ou recheios!)
  if (
    normCat.includes('bebida') || 
    normCat.includes('refrigerante') || 
    normCat.includes('suco') || 
    normCat.includes('água') || 
    normCat.includes('agua') || 
    normCat.includes('café') || 
    normCat.includes('cafe') || 
    normCat.includes('cerveja') ||
    normProd.includes('refrigerante') ||
    normProd.includes('coca-cola') ||
    normProd.includes('guaraná') ||
    normProd.includes('água mineral')
  ) {
    const bebidasIds = [
      'bebidas-embalagem-volume',
      'bebidas-personalizacao'
    ];
    return bebidasIds
      .map(id => DEFAULT_GLOBAL_OPTION_TEMPLATES.find(t => t.id === id))
      .filter((t): t is GlobalOptionGroupTemplate => !!t)
      .map(t => instantiateTemplateForProduct(t));
  }

  // 11. MERCADOS E CONVENIÊNCIA (tamanhos, embalagens e variantes)
  if (
    normCat.includes('mercado') || 
    normCat.includes('conveni') || 
    normCat.includes('hortifr') || 
    normCat.includes('despensa')
  ) {
    const mercadoIds = [
      'mercado-embalagens-tamanhos',
      'mercado-substituicao'
    ];
    return mercadoIds
      .map(id => DEFAULT_GLOBAL_OPTION_TEMPLATES.find(t => t.id === id))
      .filter((t): t is GlobalOptionGroupTemplate => !!t)
      .map(t => instantiateTemplateForProduct(t));
  }

  // 12. PET SHOPS E LOJAS ESPECIALIZADAS (tamanhos, modelos, cores e opções pertinentes)
  if (
    normCat.includes('pet') || 
    normCat.includes('animal') || 
    normCat.includes('ração') || 
    normCat.includes('racao')
  ) {
    const petIds = [
      'pet-tamanhos',
      'pet-cores'
    ];
    return petIds
      .map(id => DEFAULT_GLOBAL_OPTION_TEMPLATES.find(t => t.id === id))
      .filter((t): t is GlobalOptionGroupTemplate => !!t)
      .map(t => instantiateTemplateForProduct(t));
  }

  // Generic category without clear match: return empty
  return [];
}

