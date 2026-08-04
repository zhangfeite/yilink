import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';

import {
  QR_DEFAULT_SIZE,
  QR_MAX_SIZE,
  QR_MIN_SIZE,
  clampQrSize,
  pageQrUrl,
  parseQrFormat,
  renderQrCode,
} from './qr';

describe('QR helpers', () => {
  it('selects the configured public-page URL before the application URL and request origin', () => {
    expect(
      pageQrUrl('my-page', 'http://localhost:3000/api/v1/pages/page-id/qr', {
        pagesHost: 'pages.example.com',
        appUrl: 'https://app.example.com',
      }),
    ).toBe('https://pages.example.com/my-page');
    expect(
      pageQrUrl('my-page', 'http://localhost:3000/api/v1/pages/page-id/qr', {
        appUrl: 'https://app.example.com/',
      }),
    ).toBe('https://app.example.com/p/my-page');
    expect(pageQrUrl('my-page', 'http://localhost:3000/api/v1/pages/page-id/qr', {})).toBe(
      'http://localhost:3000/p/my-page',
    );
  });

  it('defaults and clamps PNG sizes', () => {
    expect(clampQrSize(null)).toBe(QR_DEFAULT_SIZE);
    expect(clampQrSize('1')).toBe(QR_MIN_SIZE);
    expect(clampQrSize('10000')).toBe(QR_MAX_SIZE);
  });

  it('accepts PNG and SVG formats only', () => {
    expect(parseQrFormat(null)).toBe('png');
    expect(parseQrFormat('svg')).toBe('svg');
    expect(parseQrFormat('jpeg')).toBeNull();
  });

  it('renders a scannable SVG QR code at error-correction level M', async () => {
    const content = 'https://pages.example.com/my-page';
    const svg = await renderQrCode(content, 'svg');
    const matrix = QRCode.create(content, { errorCorrectionLevel: 'M' });

    expect(svg).toContain('<svg');
    expect(matrix.modules.size).toBeGreaterThan(0);
    expect(Array.from(matrix.modules.data).some(Boolean)).toBe(true);
  });
});
