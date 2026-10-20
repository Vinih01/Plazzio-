import type {
  CartItem,
  GlobalOptionGroupTemplate,
  Product,
  ProductVariant,
  SelectedAddOn,
  SelectedOptionGroup,
  SelectedOptionItem,
} from '../types';
import type { CreateOrderItemRequest } from '../types';

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

function requirePrice(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`O preço cadastrado para "${label}" é inválido. Revise o cardápio.`);
  }
  return roundMoney(value);
}

function requireQuantity(value: unknown, label: string, max = 50): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`A quantidade de "${label}" é inválida.`);
  }
  return value;
}

function validateOptionCount(
  groupName: string,
  count: number,
  required: boolean,
  minSelect: number,
  maxSelect: number,
  selectionType: 'single' | 'multiple',
): void {
  const minimum = minSelect > 0 ? minSelect : (required ? 1 : 0);
  const maximum = selectionType === 'single' ? 1 : maxSelect;
  if (count < minimum) {
    throw new Error(`Selecione pelo menos ${minimum} opção(ões) em "${groupName}".`);
  }
  if (maximum > 0 && count > maximum) {
    throw new Error(`O grupo "${groupName}" permite no máximo ${maximum} opção(ões).`);
  }
}

export function getDefaultOptionTemplateIds(categoryName?: string, productName?: string): string[] {
  const category = (categoryName || '').toLowerCase().trim();
  const product = (productName || '').toLowerCase().trim();
  const matches = (...terms: string[]) => terms.some(term => category.includes(term) || product.includes(term));

  if (matches('açaí', 'acai')) {
    return ['acai-bases-sabores', 'acai-frutas-frescas', 'acai-coberturas-crocantes', 'acai-cremes-especiais', 'acai-caldas-xaropes', 'utensilios-descartaveis'];
  }
  if (matches('sorvete', 'gelat', 'gelato')) {
    return ['sorvete-quantidade-bolas', 'sorvete-sabores', 'acai-coberturas-crocantes', 'acai-caldas-xaropes', 'utensilios-descartaveis'];
  }
  if (matches('pizza')) {
    return ['pizza-sabores-salgados', 'pizza-bordas-recheadas', 'pizza-extras-ingredientes'];
  }
  if (matches('hambúrguer', 'hamburguer', 'burger', 'lanche')) {
    return ['burger-tipos-pao', 'burger-ponto-carne', 'burger-molhos-especiais', 'burger-adicionais-extras', 'burger-retirar-ingredientes'];
  }
  if (matches('marmit', 'refeiç', 'refeic', 'almoço', 'almoco', 'prato') || product.includes('prato feito')) {
    return ['marmita-proteina-principal', 'marmita-base-arroz-feijao', 'marmita-guarnicoes', 'utensilios-descartaveis'];
  }
  if (matches('salgado', 'pastel', 'esfiha') || product.includes('coxinha')) {
    return ['salgados-recheios-salgados', 'burger-molhos-especiais'];
  }
  if (matches('hot dog', 'hotdog', 'cachorro')) {
    return ['hotdog-salsichas-queijos', 'burger-molhos-especiais', 'burger-adicionais-extras'];
  }
  if (matches('bolo', 'doce', 'torta', 'confeitaria')) {
    return ['confeitaria-recheios-bolos', 'acai-caldas-xaropes', 'acai-coberturas-crocantes', 'utensilios_descartaveis'];
  }
  if (matches('porç', 'porc', 'petisco', 'aperitivo') || product.includes('batata frita')) {
    return ['porcoes-tamanhos', 'porcoes-molhos-acompanhamentos', 'utensilios_descartaveis'];
  }
  if (matches('bebida', 'refrigerante', 'suco', 'água', 'agua', 'café', 'cafe', 'cerveja') || product.includes('coca-cola') || product.includes('guaraná') || product.includes('água mineral')) {
    return ['bebidas-embalagem-volume', 'bebidas-personalizacao'];
  }
  if (matches('mercado', 'conveni', 'hortifr', 'despensa')) {
    return ['mercado-embalagens-tamanhos', 'mercado-substituicao'];
  }
  if (matches('pet', 'animal', 'ração', 'racao')) {
    return ['pet-tamanhos', 'pet-cores'];
  }
  return [];
}

function sanitizeNote(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const note = value.trim().slice(0, 500);
  return note || undefined;
}

/**
 * Rebuilds a cart line from authoritative Firestore product/template data.
 * No submitted name, image, price, total or option label is used as a source of truth.
 */
export function calculateTrustedCartItem(
  product: Product,
  request: CreateOrderItemRequest,
  templates: Map<string, GlobalOptionGroupTemplate>,
  storeName: string,
  lineIndex: number,
): CartItem {
  if (product.available !== true || product.isDemo === true) {
    throw new Error(`O produto "${product.name || product.id}" não está disponível para venda.`);
  }
  if (Array.isArray(product.comboGroups) && product.comboGroups.length > 0) {
    throw new Error(`O produto "${product.name}" usa composição de combo que ainda não está habilitada no checkout seguro. Peça ao estabelecimento para revisar esse produto.`);
  }
  if (request.productId !== product.id && request.productId !== undefined) {
    throw new Error('O produto solicitado não corresponde ao catálogo.');
  }

  const quantity = requireQuantity(request.quantity, product.name || 'produto');
  const basePrice = requirePrice(product.basePrice, product.name || 'produto');

  let selectedVariant: ProductVariant | undefined;
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    if (!request.selectedVariantId) {
      throw new Error(`Selecione o tamanho ou a variante de "${product.name}".`);
    }
    selectedVariant = product.variants.find(variant => variant.id === request.selectedVariantId);
    if (!selectedVariant || selectedVariant.available === false) {
      throw new Error(`A variante selecionada de "${product.name}" não está disponível.`);
    }
    requirePrice(selectedVariant.price, selectedVariant.name);
  } else if (request.selectedVariantId) {
    throw new Error(`A variante enviada para "${product.name}" não existe no cardápio.`);
  }

  const submittedGroups = request.selectedOptionGroups || [];
  const submittedGroupKeys = submittedGroups.map(group => group.templateId || group.groupId);
  if (new Set(submittedGroupKeys).size !== submittedGroupKeys.length) {
    throw new Error('O pedido contém grupos de opções duplicados.');
  }
  const resolvedGroups: SelectedOptionGroup[] = [];
  const optionIdsIncludedInGroups = new Set<string>();
  const templateOptionIdsIncludedInGroups = new Set<string>();
  let optionGroupsTotal = 0;

  const persistedGroups = product.optionGroups || [];
  if (persistedGroups.length > 0) {
    const unknownGroup = submittedGroups.find(selection => {
      const group = persistedGroups.find(candidate => candidate.id === selection.groupId);
      return !group || (!!selection.templateId && selection.templateId !== group.templateId);
    });
    if (unknownGroup) {
      throw new Error(`Uma opção selecionada para "${product.name}" não pertence ao cardápio atual. Atualize o cardápio e tente novamente.`);
    }

    for (const group of persistedGroups) {
      const selection = submittedGroups.find(candidate => candidate.groupId === group.id);
      const selected = selection?.selectedOptionIds || [];
      validateOptionCount(group.name, selected.length, group.required, group.minSelect, group.maxSelect, group.selectionType);
      const uniqueKeys = selected.map(option => option.templateOptionId || option.id);
      if (new Set(uniqueKeys).size !== uniqueKeys.length) {
        throw new Error(`Há opções duplicadas no grupo "${group.name}".`);
      }

      const resolvedOptions: SelectedOptionItem[] = selected.map(choice => {
        const option = group.options.find(candidate =>
          candidate.id === choice.id ||
          (!!choice.templateOptionId && candidate.templateOptionId === choice.templateOptionId)
        );
        if (!option || option.available === false) {
          throw new Error(`Uma opção de "${group.name}" não existe mais no cardápio.`);
        }
        const price = requirePrice(option.price, option.name);
        optionGroupsTotal += price;
        optionIdsIncludedInGroups.add(option.id);
        if (option.templateOptionId) templateOptionIdsIncludedInGroups.add(option.templateOptionId);
        return {
          id: option.id,
          ...(option.templateOptionId ? { templateOptionId: option.templateOptionId } : {}),
          name: option.name,
          price,
          quantity: 1,
          ...(option.imageUrl ? { imageUrl: option.imageUrl } : {}),
          groupName: group.name,
        };
      });

      if (resolvedOptions.length > 0) {
        resolvedGroups.push({
          groupId: group.id,
          ...(group.templateId ? { templateId: group.templateId } : {}),
          groupName: group.name,
          selectedOptions: resolvedOptions,
        });
      }
    }
  } else {
    const expectedTemplateIds = getDefaultOptionTemplateIds(product.categoryName, product.name);
    const unexpected = submittedGroups.find(selection => !selection.templateId || !expectedTemplateIds.includes(selection.templateId));
    if (unexpected) {
      throw new Error(`Uma opção selecionada para "${product.name}" não corresponde às opções autorizadas para esse produto.`);
    }

    for (const templateId of expectedTemplateIds) {
      const template = templates.get(templateId);
      if (!template || template.active === false) {
        throw new Error(`As opções padrão de "${product.name}" ainda não foram sincronizadas com o catálogo. O estabelecimento precisa revisar e salvar as opções do produto antes de receber pedidos.`);
      }
      const selection = submittedGroups.find(candidate => candidate.templateId === templateId);
      const selected = selection?.selectedOptionIds || [];
      validateOptionCount(template.name, selected.length, template.required, template.minSelect, template.maxSelect, template.selectionType);
      const uniqueKeys = selected.map(option => option.templateOptionId || option.id);
      if (new Set(uniqueKeys).size !== uniqueKeys.length) {
        throw new Error(`Há opções duplicadas no grupo "${template.name}".`);
      }

      const resolvedOptions: SelectedOptionItem[] = selected.map(choice => {
        const templateOptionId = choice.templateOptionId || choice.id;
        const option = template.options.find(candidate => candidate.id === templateOptionId);
        if (!option || option.active === false) {
          throw new Error(`Uma opção de "${template.name}" não existe mais no catálogo.`);
        }
        const price = requirePrice(option.defaultAdditionalPrice ?? 0, option.name);
        optionGroupsTotal += price;
        optionIdsIncludedInGroups.add(choice.id);
        optionIdsIncludedInGroups.add(option.id);
        templateOptionIdsIncludedInGroups.add(option.id);
        return {
          id: option.id,
          templateOptionId: option.id,
          name: option.name,
          price,
          quantity: 1,
          ...(option.imageUrl ? { imageUrl: option.imageUrl } : {}),
          groupName: template.name,
        };
      });

      if (resolvedOptions.length > 0) {
        resolvedGroups.push({
          groupId: template.id,
          templateId: template.id,
          groupName: template.name,
          selectedOptions: resolvedOptions,
        });
      }
    }

    if (expectedTemplateIds.length === 0 && submittedGroups.length > 0) {
      throw new Error(`"${product.name}" não possui grupos de opções autorizados no catálogo.`);
    }
  }

  const submittedAddOns = request.selectedAddOns || [];
  const selectedAddOns: SelectedAddOn[] = [];
  const seenAddOns = new Set<string>();
  let addOnsTotal = 0;

  for (const submitted of submittedAddOns) {
    // The current UI mirrors selected option-group choices into selectedAddOns for display.
    // Those items are priced from the authoritative option group above, so do not charge twice.
    if (optionIdsIncludedInGroups.has(submitted.id) || templateOptionIdsIncludedInGroups.has(submitted.id)) continue;
    if (seenAddOns.has(submitted.id)) {
      throw new Error(`O adicional "${submitted.id}" foi enviado mais de uma vez.`);
    }
    seenAddOns.add(submitted.id);

    const addon = (product.addOns || []).find(candidate => candidate.id === submitted.id);
    if (!addon) {
      throw new Error(`Um adicional de "${product.name}" não pertence ao cardápio atual. Atualize a página e tente novamente.`);
    }
    const addonQuantity = requireQuantity(submitted.quantity, addon.name, Math.min(20, addon.maxQuantity || 20));
    const price = requirePrice(addon.price, addon.name);
    addOnsTotal += price * addonQuantity;
    selectedAddOns.push({ id: addon.id, name: addon.name, price, quantity: addonQuantity });
  }

  // Keep legacy selectedAddOns display compatible while deriving every amount from trusted data.
  for (const group of resolvedGroups) {
    for (const option of group.selectedOptions) {
      selectedAddOns.push({
        id: option.id,
        name: `${group.groupName}: ${option.name}`,
        price: option.price,
        quantity: option.quantity || 1,
      });
    }
  }

  const variantPrice = selectedVariant ? requirePrice(selectedVariant.price, selectedVariant.name) : 0;
  const itemTotal = roundMoney((basePrice + variantPrice + addOnsTotal + optionGroupsTotal) * quantity);

  return {
    id: `line_${lineIndex + 1}_${product.id}`,
    productId: product.id,
    name: product.name,
    storeId: product.storeId,
    storeName,
    basePrice,
    quantity,
    ...(selectedVariant ? { selectedVariant } : {}),
    selectedAddOns,
    ...(resolvedGroups.length > 0 ? { selectedOptionGroups: resolvedGroups } : {}),
    itemTotal,
    ...(sanitizeNote(request.notes) ? { notes: sanitizeNote(request.notes) } : {}),
    ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
  };
}
