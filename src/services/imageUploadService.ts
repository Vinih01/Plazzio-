import { auth } from '../lib/firebase';

/**
 * Optimizes a photo client-side, then sends it to the authenticated server endpoint.
 * The server verifies the Firebase ID token, validates the actual image bytes, and stores it persistently.
 */
export async function optimizeImageBeforeUpload(file: File, maxDimension = 1400, quality = 0.85): Promise<{ file: File; base64: string }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('A imagem original deve ter no máximo 10 MB.');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (!width || !height) {
        reject(new Error('Não foi possível ler esta imagem.'));
        return;
      }

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível processar esta imagem no dispositivo.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const base64 = canvas.toDataURL(mimeType, quality);
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Não foi possível otimizar esta imagem.'));
          return;
        }
        const optimizedFile = new File([blob], file.name, { type: mimeType });
        if (optimizedFile.size > 5 * 1024 * 1024) {
          reject(new Error('A foto continua maior que 5 MB após a otimização. Escolha outra imagem.'));
          return;
        }
        resolve({ file: optimizedFile, base64 });
      }, mimeType, quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
    };
    img.src = objectUrl;
  });
}

/**
 * Uploads only to the authenticated server route. There is no unauthenticated or local-disk fallback.
 */
export async function uploadReviewPhoto(file: File, storeId: string): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Entre na sua conta Google antes de enviar fotos para a avaliação.');
  }
  if (!storeId.trim()) {
    throw new Error('Não foi possível identificar o estabelecimento desta avaliação.');
  }

  const { file: processedFile, base64 } = await optimizeImageBeforeUpload(file);
  const token = await currentUser.getIdToken();

  const response = await fetch('/api/upload-review-photo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      storeId,
      filename: processedFile.name,
      base64,
      contentType: processedFile.type,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `Falha no envio da foto (${response.status}).`);
  }
  if (typeof data.url !== 'string' || !data.url.startsWith('https://firebasestorage.googleapis.com/')) {
    throw new Error('O servidor não retornou uma URL válida para a foto.');
  }
  return data.url;
}
