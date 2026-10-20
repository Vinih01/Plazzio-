
/**
 * Optimizes/resizes an image file client-side before uploading
 * to guarantee fast uploads, low data usage, and crisp quality.
 */
export async function optimizeImageBeforeUpload(file: File, maxDimension = 1400, quality = 0.85): Promise<{ file: File; base64: string }> {
  return new Promise((resolve) => {
    // If not an image, resolve directly
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve({ file, base64: reader.result as string });
      reader.onerror = () => resolve({ file, base64: '' });
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

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
        const reader = new FileReader();
        reader.onload = () => resolve({ file, base64: reader.result as string });
        reader.readAsDataURL(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const base64 = canvas.toDataURL(mimeType, quality);

      canvas.toBlob((blob) => {
        if (blob) {
          const optimizedFile = new File([blob], file.name, { type: mimeType });
          resolve({ file: optimizedFile, base64 });
        } else {
          resolve({ file, base64 });
        }
      }, mimeType, quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve({ file, base64: reader.result as string });
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads a review photo.
 * 1. Tries Firebase Storage first (with a short timeout).
 * 2. If Firebase Storage is unavailable/unconfigured, falls back to the server upload API.
 * Returns a real accessible image URL string.
 */
export async function uploadReviewPhoto(file: File): Promise<string> {
  const { file: processedFile, base64 } = await optimizeImageBeforeUpload(file);

  // Fallback to server API directly for reliability
  try {
    const response = await fetch('/api/upload-review-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: processedFile.name,
        base64,
        contentType: processedFile.type,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Falha no upload (${response.status})`);
    }

    const data = await response.json();
    if (data.url) {
      return data.url;
    }
    throw new Error('Servidor não retornou uma URL válida.');
  } catch (apiErr: any) {
    console.error('Falha no upload da foto via servidor:', apiErr);
    throw new Error(apiErr.message || 'Não foi possível enviar a foto. Tente novamente.');
  }
}
