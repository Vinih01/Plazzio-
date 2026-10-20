import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { App } from 'firebase-admin/app';
import type {
  CreateOrderRequest,
  DeliveryAddress,
  GlobalOptionGroupTemplate,
  Order,
  Product,
  Store,
} from './src/types';
import { calculateTrustedCartItem, getDefaultOptionTemplateIds } from './src/server/orderPricing';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'loyal-defender-tw1xt';
const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-plazzio-53fc4ac7-7ba6-47aa-8e6f-60e99c984f74';
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'loyal-defender-tw1xt.firebasestorage.app';
const MAX_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024;
const ADMIN_APP_NAME = 'plazzio-server';

class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

function getAdminApp(): App {
  const existing = getApps().find(app => app.name === ADMIN_APP_NAME);
  if (existing) return existing;

  // Production must provide Application Default Credentials (e.g. the Cloud Run service account).
  // Never put service-account keys or private credentials in this repository.
  return initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
  }, ADMIN_APP_NAME);
}

function getAdminServices() {
  const app = getAdminApp();
  return {
    auth: getAuth(app),
    db: getFirestore(app, FIRESTORE_DATABASE_ID),
    bucket: getStorage(app).bucket(STORAGE_BUCKET),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new HttpError(400, `O campo "${field}" é obrigatório.`);
  const valueTrimmed = value.trim();
  if (valueTrimmed.length < min || valueTrimmed.length > max) {
    throw new HttpError(400, `O campo "${field}" deve ter entre ${min} e ${max} caracteres.`);
  }
  return valueTrimmed;
}

function validDocumentId(value: unknown, field: string): string {
  const id = cleanText(value, field, 1, 150);
  if (id.includes('/')) throw new HttpError(400, `O identificador de "${field}" é inválido.`);
  return id;
}

function validateOrderPayload(body: unknown): CreateOrderRequest {
  if (!isRecord(body)) throw new HttpError(400, 'Dados do pedido inválidos.');

  const requestId = cleanText(body.requestId, 'requestId', 12, 100);
  if (!/^[A-Za-z0-9_-]+$/.test(requestId)) {
    throw new HttpError(400, 'Identificador da solicitação inválido.');
  }
  const storeId = validDocumentId(body.storeId, 'estabelecimento');
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) {
    throw new HttpError(400, 'O pedido deve conter de 1 a 30 itens.');
  }

  const items = body.items.map((rawItem, index) => {
    if (!isRecord(rawItem)) throw new HttpError(400, `O item ${index + 1} do pedido é inválido.`);
    const productId = validDocumentId(rawItem.productId, 'produto');
    if (typeof rawItem.quantity !== 'number' || !Number.isInteger(rawItem.quantity) || rawItem.quantity < 1 || rawItem.quantity > 50) {
      throw new HttpError(400, `A quantidade do item ${index + 1} deve ser um número inteiro entre 1 e 50.`);
    }

    let selectedAddOns: Array<{ id: string; quantity: number }> | undefined;
    if (rawItem.selectedAddOns !== undefined) {
      if (!Array.isArray(rawItem.selectedAddOns) || rawItem.selectedAddOns.length > 80) {
        throw new HttpError(400, 'A lista de adicionais é inválida.');
      }
      selectedAddOns = rawItem.selectedAddOns.map(rawAddon => {
        if (!isRecord(rawAddon)) throw new HttpError(400, 'Um adicional selecionado é inválido.');
        const id = validDocumentId(rawAddon.id, 'adicional');
        if (typeof rawAddon.quantity !== 'number' || !Number.isInteger(rawAddon.quantity) || rawAddon.quantity < 1 || rawAddon.quantity > 20) {
          throw new HttpError(400, 'A quantidade de um adicional é inválida.');
        }
        return { id, quantity: rawAddon.quantity };
      });
    }

    let selectedOptionGroups: NonNullable<CreateOrderRequest['items'][number]['selectedOptionGroups']> | undefined;
    if (rawItem.selectedOptionGroups !== undefined) {
      if (!Array.isArray(rawItem.selectedOptionGroups) || rawItem.selectedOptionGroups.length > 30) {
        throw new HttpError(400, 'Os grupos de opções selecionados são inválidos.');
      }
      selectedOptionGroups = rawItem.selectedOptionGroups.map(rawGroup => {
        if (!isRecord(rawGroup)) throw new HttpError(400, 'Um grupo de opções é inválido.');
        const groupId = validDocumentId(rawGroup.groupId, 'grupo de opções');
        const templateId = rawGroup.templateId === undefined
          ? undefined
          : validDocumentId(rawGroup.templateId, 'modelo de opções');
        const rawSelected = rawGroup.selectedOptionIds === undefined ? [] : rawGroup.selectedOptionIds;
        if (!Array.isArray(rawSelected) || rawSelected.length > 50) {
          throw new HttpError(400, 'As opções selecionadas são inválidas.');
        }
        const selectedOptionIds = rawSelected.map(rawOption => {
          if (!isRecord(rawOption)) throw new HttpError(400, 'Uma opção selecionada é inválida.');
          const id = validDocumentId(rawOption.id, 'opção');
          const templateOptionId = rawOption.templateOptionId === undefined
            ? undefined
            : validDocumentId(rawOption.templateOptionId, 'opção do modelo');
          return { id, ...(templateOptionId ? { templateOptionId } : {}) };
        });
        return { groupId, ...(templateId ? { templateId } : {}), selectedOptionIds };
      });
    }

    let selectedVariantId: string | undefined;
    if (rawItem.selectedVariantId !== undefined) {
      selectedVariantId = validDocumentId(rawItem.selectedVariantId, 'variante');
    }

    let notes: string | undefined;
    if (rawItem.notes !== undefined) notes = cleanText(rawItem.notes, 'observação do item', 0, 500);

    return {
      productId,
      quantity: rawItem.quantity,
      ...(selectedVariantId ? { selectedVariantId } : {}),
      ...(selectedAddOns ? { selectedAddOns } : {}),
      ...(selectedOptionGroups ? { selectedOptionGroups } : {}),
      ...(notes ? { notes } : {}),
    };
  });

  if (body.fulfillmentMethod !== 'delivery' && body.fulfillmentMethod !== 'pickup') {
    throw new HttpError(400, 'Escolha entrega ou retirada no estabelecimento.');
  }
  if (body.paymentMethod !== 'money_on_delivery' && body.paymentMethod !== 'card_on_delivery' && body.paymentMethod !== 'pix_direct') {
    throw new HttpError(400, 'A forma de pagamento selecionada é inválida.');
  }

  const customerName = cleanText(body.customerName, 'nome do cliente', 2, 100);
  const customerPhone = cleanText(body.customerPhone, 'telefone do cliente', 8, 30);
  const phoneDigits = customerPhone.replace(/\D/g, '');
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    throw new HttpError(400, 'Informe um telefone válido para contato.');
  }

  let deliveryAddress: DeliveryAddress | undefined;
  if (body.fulfillmentMethod === 'delivery') {
    if (!isRecord(body.deliveryAddress)) throw new HttpError(400, 'Informe o endereço completo de entrega.');
    deliveryAddress = {
      street: cleanText(body.deliveryAddress.street, 'rua', 1, 150),
      number: cleanText(body.deliveryAddress.number, 'número', 1, 20),
      ...(typeof body.deliveryAddress.complement === 'string' && body.deliveryAddress.complement.trim()
        ? { complement: body.deliveryAddress.complement.trim().slice(0, 100) }
        : {}),
      neighborhood: cleanText(body.deliveryAddress.neighborhood, 'bairro', 1, 100),
      city: cleanText(body.deliveryAddress.city, 'cidade', 1, 100),
      state: cleanText(body.deliveryAddress.state, 'estado', 2, 50),
      zipCode: cleanText(body.deliveryAddress.zipCode, 'CEP', 8, 12),
    };
  }

  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : undefined;
  return {
    requestId,
    storeId,
    items,
    fulfillmentMethod: body.fulfillmentMethod,
    ...(deliveryAddress ? { deliveryAddress } : {}),
    customerName,
    customerPhone,
    paymentMethod: body.paymentMethod,
    ...(notes ? { notes } : {}),
  };
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getReadableError(error: unknown): { statusCode: number; message: string } {
  if (error instanceof HttpError) {
    return { statusCode: error.statusCode, message: error.message };
  }
  return { statusCode: 500, message: 'Não foi possível concluir a operação agora. Tente novamente.' };
}

function getImageMimeAndExtension(buffer: Buffer): { contentType: string; extension: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { contentType: 'image/jpeg', extension: 'jpg' };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { contentType: 'image/png', extension: 'png' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { contentType: 'image/webp', extension: 'webp' };
  }
  if (buffer.length >= 6 && (buffer.toString('ascii', 0, 6) === 'GIF87a' || buffer.toString('ascii', 0, 6) === 'GIF89a')) {
    return { contentType: 'image/gif', extension: 'gif' };
  }
  return null;
}

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.disable('x-powered-by');
  // 5 MiB image plus data-URL/base64 overhead. Keep JSON requests bounded.
  app.use(express.json({ limit: '7mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // Serve legacy uploads if this checkout has any, but all new review photos use persistent Storage.
  const legacyUploadsDir = path.resolve(__dirname, 'public/uploads');
  if (fs.existsSync(legacyUploadsDir)) {
    app.use('/uploads', express.static(legacyUploadsDir, { dotfiles: 'deny', index: false }));
  }

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.post('/api/orders', async (req: Request, res: Response) => {
    let services: ReturnType<typeof getAdminServices>;
    try {
      services = getAdminServices();
    } catch (error) {
      console.error('Firebase Admin initialization failed for order endpoint:', error);
      return res.status(503).json({
        error: 'O serviço seguro de pedidos ainda não está configurado no servidor. Nenhum pedido foi registrado.',
        code: 'ORDER_SERVICE_NOT_CONFIGURED',
      });
    }

    const authHeader = req.header('authorization') || '';
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) {
      return res.status(401).json({ error: 'Entre na sua conta para enviar o pedido.' });
    }

    let decodedToken;
    try {
      decodedToken = await services.auth.verifyIdToken(tokenMatch[1]);
    } catch {
      return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente e tente enviar o pedido.' });
    }

    let payload: CreateOrderRequest;
    try {
      payload = validateOrderPayload(req.body);
    } catch (error) {
      const readable = getReadableError(error);
      return res.status(readable.statusCode === 500 ? 400 : readable.statusCode).json({ error: readable.message });
    }

    try {
      const idHash = createHash('sha256')
        .update(`${decodedToken.uid}:${payload.requestId}`)
        .digest('hex')
        .slice(0, 28);
      const orderId = `ord_${idHash}`;
      const firestore = services.db;
      const storeRef = firestore.collection('stores').doc(payload.storeId);
      const orderRef = firestore.collection('orders').doc(orderId);

      const order = await firestore.runTransaction(async transaction => {
        // Check idempotency first so a retry returns the already-created order even if the live
        // catalog changed after the original transaction committed.
        const existingOrderSnapshot = await transaction.get(orderRef);
        if (existingOrderSnapshot.exists) {
          const existingOrder = existingOrderSnapshot.data() as Order;
          if (existingOrder.customerUid === decodedToken.uid && existingOrder.clientRequestId === payload.requestId) {
            return existingOrder;
          }
          throw new HttpError(409, 'Este identificador já foi utilizado. Atualize a página e tente novamente.');
        }

        const storeSnapshot = await transaction.get(storeRef);
        if (!storeSnapshot.exists) throw new HttpError(404, 'Estabelecimento não encontrado.');
        const storeData = storeSnapshot.data() as Store;
        const store: Store = { ...storeData, id: storeSnapshot.id };
        if (store.status !== 'approved' || store.published !== true || store.isDemo === true) {
          throw new HttpError(409, 'Este estabelecimento não está disponível para receber pedidos.');
        }

        const productIds = [...new Set(payload.items.map(item => item.productId))];
        const productSnapshots = await Promise.all(
          productIds.map(productId => transaction.get(firestore.collection('products').doc(productId))),
        );
        const productById = new Map<string, Product>();
        productSnapshots.forEach(snapshot => {
          if (snapshot.exists) {
            const data = snapshot.data() as Product;
            productById.set(snapshot.id, { ...data, id: snapshot.id });
          }
        });

        const templateIds = [...new Set(payload.items.flatMap(item => {
          const product = productById.get(item.productId);
          if (!product || product.storeId !== payload.storeId) return [];
          if (Array.isArray(product.optionGroups) && product.optionGroups.length > 0) return [];
          return getDefaultOptionTemplateIds(product.categoryName, product.name);
        }))];
        const templateSnapshots = await Promise.all(
          templateIds.map(templateId => transaction.get(firestore.collection('globalOptionGroupTemplates').doc(templateId))),
        );
        const templates = new Map<string, GlobalOptionGroupTemplate>();
        templateSnapshots.forEach(snapshot => {
          if (snapshot.exists) {
            templates.set(snapshot.id, { ...(snapshot.data() as GlobalOptionGroupTemplate), id: snapshot.id });
          }
        });

        const lineItems = payload.items.map((item, index) => {
          const product = productById.get(item.productId);
          if (!product || product.storeId !== payload.storeId) {
            throw new HttpError(409, 'Um produto não pertence a este estabelecimento ou foi removido do cardápio.');
          }
          return calculateTrustedCartItem(product, item, templates, store.name, index);
        });
        const subtotal = roundMoney(lineItems.reduce((sum, item) => sum + item.itemTotal, 0));
        if (!Number.isFinite(subtotal) || subtotal <= 0) {
          throw new HttpError(400, 'O total dos produtos é inválido.');
        }

        const minimumOrderValue = typeof store.minimumOrderValue === 'number' && Number.isFinite(store.minimumOrderValue)
          ? Math.max(0, store.minimumOrderValue)
          : 0;
        if (subtotal < minimumOrderValue) {
          throw new HttpError(400, `O pedido mínimo deste estabelecimento é de R$ ${minimumOrderValue.toFixed(2).replace('.', ',')}.`);
        }

        const acceptedPaymentMethods = Array.isArray(store.acceptedPaymentMethods) ? store.acceptedPaymentMethods : [];
        if (!acceptedPaymentMethods.includes(payload.paymentMethod)) {
          throw new HttpError(400, 'Esta forma de pagamento não está habilitada pelo estabelecimento. Escolha outra opção ou entre em contato com a loja.');
        }

        const rawDeliveryFee = typeof store.deliveryFee === 'number' && Number.isFinite(store.deliveryFee)
          ? store.deliveryFee
          : 0;
        if (rawDeliveryFee < 0) throw new HttpError(409, 'A taxa de entrega cadastrada pela loja é inválida.');
        const deliveryFee = payload.fulfillmentMethod === 'delivery' ? roundMoney(rawDeliveryFee) : 0;
        const total = roundMoney(subtotal + deliveryFee);

        const now = new Date().toISOString();
        const newOrder: Order = {
          id: orderId,
          clientRequestId: payload.requestId,
          orderNumber: `#PLZ-${randomInt(1000, 10000)}`,
          customerUid: decodedToken.uid,
          storeId: store.id,
          storeOwnerUid: store.ownerUid,
          storeSnapshot: {
            name: store.name,
            slug: store.slug,
            city: store.city,
            ...(store.logoUrl ? { logoUrl: store.logoUrl } : {}),
            ...(store.coverUrl ? { coverUrl: store.coverUrl } : {}),
            ...(store.phone ? { phone: store.phone } : {}),
            ...(store.pixKey ? { pixKey: store.pixKey } : {}),
            ...(store.whatsappOrderNumber ? { whatsappOrderNumber: store.whatsappOrderNumber } : {}),
            ...(store.neighborhood || store.businessAddress ? { neighborhood: store.neighborhood || store.businessAddress } : {}),
          },
          customerSnapshot: {
            name: payload.customerName,
            email: typeof decodedToken.email === 'string' ? decodedToken.email : '',
            phone: payload.customerPhone,
          },
          itemsSnapshot: lineItems,
          fulfillmentMethod: payload.fulfillmentMethod,
          ...(payload.deliveryAddress ? { deliveryAddressSnapshot: payload.deliveryAddress } : {}),
          subtotal,
          deliveryFee,
          discount: 0,
          total,
          paymentMethod: payload.paymentMethod,
          paymentStatus: 'pending',
          orderStatus: 'pending_confirmation',
          ...(payload.notes ? { notes: payload.notes } : {}),
          statusHistory: [{
            status: 'pending_confirmation',
            timestamp: now,
            actorUid: decodedToken.uid,
            actorName: payload.customerName,
            note: 'Pedido enviado pelo cliente via Plazzio',
          }],
          createdAt: now,
          updatedAt: now,
        };

        transaction.create(orderRef, newOrder);
        return newOrder;
      });

      return res.status(201).json({ order });
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Order endpoint failed:', error);
      const message = error instanceof Error && /credential|application default|permission denied|missing or insufficient permissions/i.test(error.message)
        ? 'O servidor de pedidos ainda não tem acesso ao Firebase. Configure as credenciais da conta de serviço antes de habilitar compras.'
        : 'Não foi possível registrar seu pedido com segurança. Tente novamente.';
      return res.status(503).json({ error: message });
    }
  });

  // Recalculate public store aggregates from approved reviews using trusted server access.
  app.post('/api/reviews/recalculate-rating', async (req: Request, res: Response) => {
    let services: ReturnType<typeof getAdminServices>;
    try {
      services = getAdminServices();
    } catch (error) {
      console.error('Firebase Admin initialization failed for rating recalculation:', error);
      return res.status(503).json({ error: 'O serviço de avaliações ainda não está configurado no servidor.' });
    }

    const authHeader = req.header('authorization') || '';
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) return res.status(401).json({ error: 'Entre na sua conta para atualizar as avaliações.' });

    let decodedToken;
    try {
      decodedToken = await services.auth.verifyIdToken(tokenMatch[1]);
    } catch {
      return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente e tente atualizar as avaliações.' });
    }

    try {
      if (!isRecord(req.body)) throw new HttpError(400, 'Dados da loja inválidos.');
      const storeId = validDocumentId(req.body.storeId, 'estabelecimento');
      const storeRef = services.db.collection('stores').doc(storeId);
      const storeSnapshot = await storeRef.get();
      if (!storeSnapshot.exists) throw new HttpError(404, 'Estabelecimento não encontrado.');

      const store = storeSnapshot.data() as Store;
      const isGoogleAdmin = decodedToken.email === 'mapwiser@gmail.com' &&
        decodedToken.email_verified === true &&
        decodedToken.firebase?.sign_in_provider === 'google.com';
      const isStoreOwner = store.ownerUid === decodedToken.uid;
      let hasReviewForStore = false;
      if (!isGoogleAdmin && !isStoreOwner) {
        const ownReview = await services.db.collection('reviews')
          .where('storeId', '==', storeId)
          .where('customerUid', '==', decodedToken.uid)
          .limit(1)
          .get();
        hasReviewForStore = !ownReview.empty;
      }
      if (!isGoogleAdmin && !isStoreOwner && !hasReviewForStore) {
        throw new HttpError(403, 'Você não tem permissão para atualizar as avaliações deste estabelecimento.');
      }

      const approvedSnapshot = await services.db.collection('reviews')
        .where('storeId', '==', storeId)
        .where('status', '==', 'approved')
        .get();
      let count = 0;
      let sum = 0;
      approvedSnapshot.forEach(reviewDoc => {
        const rating = reviewDoc.data().rating;
        if (typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5) {
          count += 1;
          sum += rating;
        }
      });
      const rating = count ? Math.round((sum / count) * 10) / 10 : 0;
      await storeRef.update({ rating, reviewCount: count });
      return res.json({ success: true, storeId, rating, reviewCount: count });
    } catch (error) {
      const readable = getReadableError(error);
      if (error instanceof HttpError) {
        return res.status(readable.statusCode).json({ error: readable.message });
      }
      console.error('Store rating recalculation failed:', error);
      return res.status(503).json({ error: 'Não foi possível atualizar a média das avaliações agora.' });
    }
  });

  // Authenticated review photo upload to persistent Firebase Storage.
  app.post('/api/upload-review-photo', async (req: Request, res: Response) => {
    let services: ReturnType<typeof getAdminServices>;
    try {
      services = getAdminServices();
    } catch (error) {
      console.error('Firebase Admin initialization failed for review upload:', error);
      return res.status(503).json({ error: 'O armazenamento de fotos ainda não está configurado no servidor.' });
    }

    const authHeader = req.header('authorization') || '';
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) return res.status(401).json({ error: 'Entre na sua conta para enviar fotos.' });

    let decodedToken;
    try {
      decodedToken = await services.auth.verifyIdToken(tokenMatch[1]);
    } catch {
      return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente e tente enviar a foto.' });
    }

    try {
      if (!isRecord(req.body)) throw new HttpError(400, 'Dados da imagem inválidos.');
      const storeId = validDocumentId(req.body.storeId, 'estabelecimento');
      if (typeof req.body.base64 !== 'string' || req.body.base64.length > 7 * 1024 * 1024) {
        throw new HttpError(413, 'A foto deve ter no máximo 5 MB.');
      }

      const match = req.body.base64.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/i);
      if (!match) throw new HttpError(400, 'Envie uma imagem JPEG, PNG, WebP ou GIF válida.');
      const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
      if (!buffer.length || buffer.length > MAX_REVIEW_PHOTO_BYTES) {
        throw new HttpError(413, 'A foto deve ter no máximo 5 MB.');
      }
      const detected = getImageMimeAndExtension(buffer);
      if (!detected || detected.contentType !== match[1].toLowerCase()) {
        throw new HttpError(400, 'O conteúdo do arquivo não corresponde a uma imagem válida.');
      }

      const storeSnapshot = await services.db.collection('stores').doc(storeId).get();
      if (!storeSnapshot.exists) throw new HttpError(404, 'Estabelecimento não encontrado.');
      const store = storeSnapshot.data() as Store;
      if (store.status !== 'approved' || store.published !== true || store.isDemo === true) {
        throw new HttpError(409, 'Não é possível enviar fotos para este estabelecimento.');
      }

      const token = randomUUID();
      const objectName = `review-photos/${decodedToken.uid}/${randomUUID()}.${detected.extension}`;
      const file = services.bucket.file(objectName);
      await file.save(buffer, {
        resumable: false,
        metadata: {
          contentType: detected.contentType,
          cacheControl: 'public, max-age=31536000, immutable',
          metadata: {
            firebaseStorageDownloadTokens: token,
            uploadedByUid: decodedToken.uid,
            storeId,
          },
        },
      });

      const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(services.bucket.name)}/o/${encodeURIComponent(objectName)}?alt=media&token=${token}`;
      return res.status(201).json({ success: true, url });
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.statusCode).json({ error: error.message });
      console.error('Authenticated review-photo upload failed:', error);
      return res.status(503).json({ error: 'Não foi possível salvar a foto no armazenamento persistente. Tente novamente.' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res, next: NextFunction) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'), error => {
        if (error) next(error);
      });
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Plazzio Server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start Plazzio server:', error);
  process.exit(1);
});
