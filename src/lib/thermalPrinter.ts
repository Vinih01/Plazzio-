import { Order } from '../types';
import { formatBRL, formatDateTime, getPaymentMethodLabel } from './utils';

export interface ThermalPrinterConfig {
  enabled: boolean;
  paperWidth: '80mm' | '58mm';
  soundEnabled: boolean;
  copies: number;
}

const STORAGE_KEY_PREFIX = 'plazzio_thermal_config_';

export function getThermalPrinterConfig(storeId: string): ThermalPrinterConfig {
  try {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${storeId}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Error reading thermal printer config:', e);
  }
  return {
    enabled: false,
    paperWidth: '80mm',
    soundEnabled: true,
    copies: 1,
  };
}

export function saveThermalPrinterConfig(storeId: string, config: ThermalPrinterConfig): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${storeId}`, JSON.stringify(config));
  } catch (e) {
    console.warn('Error saving thermal printer config:', e);
  }
}

/**
 * Play a kitchen-bell alert chime via Web Audio API without needing external audio files.
 */
export function playOrderAlertSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(587.33, now, 0.2);        // D5
    playTone(880, now + 0.12, 0.4);      // A5
    playTone(1174.66, now + 0.28, 0.6);  // D6
  } catch (e) {
    console.warn('Audio alert could not be played:', e);
  }
}

/**
 * Generate formatted HTML for 80mm or 58mm thermal receipt printing.
 */
export function generateReceiptHtml(order: Order, paperWidth: '80mm' | '58mm' = '80mm'): string {
  const is58mm = paperWidth === '58mm';
  const widthPx = is58mm ? '48mm' : '72mm';
  const baseFontSize = is58mm ? '11px' : '12px';

  const itemsHtml = order.itemsSnapshot
    .map((item) => {
      const variantHtml = item.selectedVariant
        ? `<div style="font-size: 10px; color: #444; margin-left: 8px;">• ${escapeHtml(item.selectedVariant.name)}</div>`
        : '';
      const addOnsHtml = (item.selectedAddOns || [])
        .map((a) => `<div style="font-size: 10px; color: #555; margin-left: 8px;">+ ${a.quantity}x ${escapeHtml(a.name)}</div>`)
        .join('');
      const notesHtml = item.notes
        ? `<div style="font-size: 10px; font-weight: bold; margin-left: 8px; margin-top: 2px;">OBS: ${escapeHtml(item.notes)}</div>`
        : '';

      return `
        <div style="margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dotted #ccc;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <span style="font-weight: bold; flex: 1;">${item.quantity}x ${escapeHtml(item.name)}</span>
            <span style="font-weight: bold; margin-left: 4px; white-space: nowrap;">${formatBRL(item.itemTotal)}</span>
          </div>
          ${variantHtml}
          ${addOnsHtml}
          ${notesHtml}
        </div>
      `;
    })
    .join('');

  const deliveryHtml = order.fulfillmentMethod === 'delivery' && order.deliveryAddressSnapshot
    ? `
      <div style="border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px;">
        <div style="font-weight: bold; font-size: ${is58mm ? '11px' : '13px'}; text-align: center; margin-bottom: 4px;">*** ENTREGA EM DOMICÍLIO ***</div>
        <div><b>Cliente:</b> ${escapeHtml(order.customerSnapshot.name)}</div>
        ${order.customerSnapshot.phone ? `<div><b>Telefone:</b> ${escapeHtml(order.customerSnapshot.phone)}</div>` : ''}
        <div><b>Endereço:</b> ${escapeHtml(order.deliveryAddressSnapshot.street)}, ${escapeHtml(order.deliveryAddressSnapshot.number)}</div>
        ${order.deliveryAddressSnapshot.complement ? `<div><b>Compl:</b> ${escapeHtml(order.deliveryAddressSnapshot.complement)}</div>` : ''}
        <div><b>Bairro:</b> ${escapeHtml(order.deliveryAddressSnapshot.neighborhood)}</div>
        ${order.deliveryAddressSnapshot.zipCode ? `<div><b>CEP:</b> ${escapeHtml(order.deliveryAddressSnapshot.zipCode)}</div>` : ''}
      </div>
    `
    : `
      <div style="border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; text-align: center;">
        <div style="font-weight: bold; font-size: ${is58mm ? '12px' : '14px'};">*** RETIRADA NO BALCÃO ***</div>
        <div style="margin-top: 2px;"><b>Cliente:</b> ${escapeHtml(order.customerSnapshot.name)}</div>
        ${order.customerSnapshot.phone ? `<div><b>Telefone:</b> ${escapeHtml(order.customerSnapshot.phone)}</div>` : ''}
      </div>
    `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Pedido ${order.orderNumber}</title>
      <style>
        @page {
          size: ${paperWidth} auto;
          margin: 2mm 3mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Courier New', Courier, monospace, sans-serif;
          font-size: ${baseFontSize};
          line-height: 1.25;
          color: #000;
          background: #fff;
          width: ${widthPx};
          margin: 0 auto;
          padding: 4px 2px;
        }
        .header {
          text-align: center;
          margin-bottom: 8px;
        }
        .store-name {
          font-size: ${is58mm ? '13px' : '15px'};
          font-weight: 900;
          text-transform: uppercase;
        }
        .order-title {
          font-size: ${is58mm ? '15px' : '18px'};
          font-weight: 900;
          margin: 4px 0;
          border: 1px solid #000;
          padding: 3px;
          display: inline-block;
          width: 90%;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .double-divider {
          border-top: 2px dashed #000;
          margin: 8px 0;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .grand-total {
          font-size: ${is58mm ? '13px' : '16px'};
          font-weight: 900;
          margin-top: 4px;
          padding-top: 4px;
          border-top: 1px solid #000;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          margin-top: 12px;
          color: #333;
        }
        @media print {
          body {
            width: 100% !important;
            padding: 0 !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="store-name">${escapeHtml(order.storeSnapshot.name)}</div>
        ${order.storeSnapshot.phone ? `<div>Tel/WhatsApp: ${escapeHtml(order.storeSnapshot.phone)}</div>` : ''}
        ${order.storeSnapshot.city ? `<div>${escapeHtml(order.storeSnapshot.city)}</div>` : ''}
        <div class="divider"></div>
        <div class="order-title">PEDIDO ${escapeHtml(order.orderNumber)}</div>
        <div style="font-size: 10px;">${formatDateTime(order.createdAt)}</div>
      </div>

      ${deliveryHtml}

      <div class="double-divider"></div>
      <div style="font-weight: bold; margin-bottom: 4px; font-size: 11px;">ITENS:</div>
      ${itemsHtml}

      <div class="divider"></div>
      <div class="totals-row">
        <span>Subtotal:</span>
        <span>${formatBRL(order.subtotal)}</span>
      </div>
      ${order.deliveryFee > 0 ? `
        <div class="totals-row">
          <span>Taxa de Entrega:</span>
          <span>${formatBRL(order.deliveryFee)}</span>
        </div>
      ` : ''}
      ${order.discount > 0 ? `
        <div class="totals-row">
          <span>Desconto:</span>
          <span>-${formatBRL(order.discount)}</span>
        </div>
      ` : ''}
      <div class="totals-row grand-total">
        <span>TOTAL:</span>
        <span>${formatBRL(order.total)}</span>
      </div>

      <div class="divider"></div>
      <div><b>Forma de Pagamento:</b> ${getPaymentMethodLabel(order.paymentMethod)}</div>
      ${order.notes ? `
        <div style="margin-top: 4px; padding: 4px; border: 1px solid #000; font-size: 11px;">
          <b>OBSERVAÇÕES:</b><br />
          ${escapeHtml(order.notes)}
        </div>
      ` : ''}

      <div class="footer">
        <div>--------------------------------</div>
        <div>PLAZZIO — Gestão de Negócios Locais</div>
        <div>www.plazzio.app</div>
        <div style="margin-top: 12px; color: #fff;">.</div>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Print order receipt to connected thermal receipt printer or standard printer.
 * Uses an invisible iframe to print without redirecting or navigating away.
 */
export async function printOrderReceipt(
  order: Order, 
  paperWidth: '80mm' | '58mm' = '80mm'
): Promise<void> {
  return new Promise((resolve) => {
    const html = generateReceiptHtml(order, paperWidth);

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      // Fallback popup if iframe doc is unavailable
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
      resolve();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print error, falling back to window print:', err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          resolve();
        }, 1000);
      }
    }, 300);
  });
}
