import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTrustedCartItem, getDefaultOptionTemplateIds } from './orderPricing';
import type { CreateOrderItemRequest, GlobalOptionGroupTemplate, Product } from '../types';

const basicProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-1',
  storeId: 'store-1',
  name: 'Hambúrguer',
  description: '',
  basePrice: 10,
  available: true,
  addOns: [{ id: 'cheese', name: 'Queijo extra', price: 1.5, maxQuantity: 3 }],
  ...overrides,
});

test('recalcula o total usando preços confiáveis do produto, variante e adicional', () => {
  const product = basicProduct({
    variants: [{ id: 'large', name: 'Grande', price: 2, available: true }],
  });
  const request: CreateOrderItemRequest = {
    productId: product.id,
    quantity: 2,
    selectedVariantId: 'large',
    selectedAddOns: [{ id: 'cheese', quantity: 2 }],
  };

  const line = calculateTrustedCartItem(product, request, new Map(), 'Loja teste', 0);
  assert.equal(line.itemTotal, 30);
  assert.equal(line.basePrice, 10);
  assert.equal(line.selectedVariant?.price, 2);
  assert.equal(line.selectedAddOns[0]?.price, 1.5);
});

test('rejeita adicional inventado enviado pelo navegador', () => {
  const product = basicProduct();
  const request: CreateOrderItemRequest = {
    productId: product.id,
    quantity: 1,
    selectedAddOns: [{ id: 'forged-addon', quantity: 1 }],
  };

  assert.throws(
    () => calculateTrustedCartItem(product, request, new Map(), 'Loja teste', 0),
    /não pertence ao cardápio atual/,
  );
});

test('exige as opções obrigatórias configuradas no produto', () => {
  const product = basicProduct({
    optionGroups: [{
      id: 'group-1',
      name: 'Escolha a base',
      required: true,
      minSelect: 1,
      maxSelect: 1,
      selectionType: 'single',
      sortOrder: 1,
      options: [{ id: 'base-1', name: 'Tradicional', price: 0, available: true, sortOrder: 1 }],
    }],
  });

  assert.throws(
    () => calculateTrustedCartItem(product, { productId: product.id, quantity: 1 }, new Map(), 'Loja teste', 0),
    /Selecione pelo menos 1 opção/,
  );
});

test('usa preço do template persistido, não o preço enviado pelo cliente', () => {
  const product = basicProduct({ categoryName: 'Bebidas' });
  const template: GlobalOptionGroupTemplate = {
    id: 'bebidas-embalagem-volume',
    name: 'Embalagem',
    description: '',
    category: 'Bebidas',
    compatibleSegments: ['Alimentação'],
    selectionType: 'single',
    minSelect: 1,
    maxSelect: 1,
    required: true,
    active: true,
    sortOrder: 1,
    options: [{
      id: 'lata-350',
      name: 'Lata 350 ml',
      active: true,
      sortOrder: 1,
      defaultAdditionalPrice: 2,
    }],
    createdAt: '',
    updatedAt: '',
  };
  const request: CreateOrderItemRequest = {
    productId: product.id,
    quantity: 2,
    selectedOptionGroups: [{
      groupId: 'temporary-ui-id',
      templateId: template.id,
      selectedOptionIds: [{ id: 'temporary-option-id', templateOptionId: 'lata-350' }],
    }],
  };

  const line = calculateTrustedCartItem(product, request, new Map([[template.id, template]]), 'Loja teste', 0);
  assert.equal(line.itemTotal, 24);
  assert.equal(line.selectedOptionGroups?.[0]?.selectedOptions[0]?.price, 2);
});

test('identifica templates padrão adequados à categoria', () => {
  assert.deepEqual(getDefaultOptionTemplateIds('Açaí', 'Açaí 500 ml'), [
    'acai-bases-sabores',
    'acai-frutas-frescas',
    'acai-coberturas-crocantes',
    'acai-cremes-especiais',
    'acai-caldas-xaropes',
    'utensilios-descartaveis',
  ]);
});
