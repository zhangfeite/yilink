import QRCode from 'qrcode';

export const QR_DEFAULT_SIZE = 512;
export const QR_MIN_SIZE = 256;
export const QR_MAX_SIZE = 1024;

export type QrFormat = 'png' | 'svg';

export interface PageQrUrlOptions {
  pagesHost?: string;
  appUrl?: string;
}

function configuredValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function configuredPagesHost(value: string): string {
  return value.replace(/^https?:\/\//i, '').split(/[/?#]/, 1)[0] ?? value;
}

export function parseQrFormat(value: string | null): QrFormat | null {
  if (!value) {
    return 'png';
  }

  return value === 'png' || value === 'svg' ? value : null;
}

export function clampQrSize(value: string | null): number {
  if (!value?.trim()) {
    return QR_DEFAULT_SIZE;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return QR_DEFAULT_SIZE;
  }

  return Math.min(QR_MAX_SIZE, Math.max(QR_MIN_SIZE, Math.round(parsed)));
}

export function pageQrUrl(
  slug: string,
  requestUrl: string,
  {
    pagesHost = process.env.PAGES_HOST,
    appUrl = process.env.NEXT_PUBLIC_APP_URL,
  }: PageQrUrlOptions = {},
): string {
  const encodedSlug = encodeURIComponent(slug);
  const pagesHostValue = configuredValue(pagesHost);
  if (pagesHostValue) {
    return `https://${configuredPagesHost(pagesHostValue)}/${encodedSlug}`;
  }

  const appUrlValue = configuredValue(appUrl);
  if (appUrlValue) {
    return `${appUrlValue.replace(/\/+$/, '')}/p/${encodedSlug}`;
  }

  return new URL(`/p/${encodedSlug}`, requestUrl).toString();
}

export async function renderQrCode(
  content: string,
  format: QrFormat,
  size = QR_DEFAULT_SIZE,
): Promise<Buffer | string> {
  const options = { errorCorrectionLevel: 'M' as const };

  if (format === 'svg') {
    return QRCode.toString(content, { ...options, type: 'svg' });
  }

  return QRCode.toBuffer(content, { ...options, width: size });
}
