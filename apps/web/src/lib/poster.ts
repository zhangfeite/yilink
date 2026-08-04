import type { PublicTheme } from '@/lib/themes';

export const POSTER_DPR = 2;

export const POSTER_PIXEL_SIZES = {
  portrait: { width: 1080, height: 1440 },
  story: { width: 1080, height: 1920 },
} as const;

export type PosterSize = keyof typeof POSTER_PIXEL_SIZES;

type PosterTheme = Pick<
  PublicTheme,
  'accent' | 'accentOn' | 'background' | 'elevation' | 'neutral' | 'radius'
>;

type PosterFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type PosterImage = CanvasImageSource & { close?: () => void };

interface PosterRuntime {
  createCanvas?: () => HTMLCanvasElement;
  decodeImage?: (blob: Blob) => Promise<PosterImage>;
  fetcher?: PosterFetcher;
}

export interface GeneratePosterOptions {
  avatarUrl?: string | null;
  bio?: string | null;
  pageId: string;
  publicUrl: string;
  role?: string | null;
  runtime?: PosterRuntime;
  signal?: AbortSignal;
  size: PosterSize;
  slug: string;
  theme: PosterTheme;
  title: string;
}

export interface PosterLayout {
  footerY: number;
  height: number;
  identity: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  linkY: number;
  qr: {
    captionY: number;
    size: number;
    x: number;
    y: number;
  };
  width: number;
}

interface TextMeasurer {
  measureText: (text: string) => Pick<TextMetrics, 'width'>;
}

const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
const ELLIPSIS = '…';

export class PosterQrUnavailableError extends Error {
  readonly code = 'QR_UNAVAILABLE';

  constructor(cause?: unknown) {
    super('二维码暂时不可用，无法生成海报', { cause });
    this.name = 'PosterQrUnavailableError';
  }
}

export function getPosterLayout(size: PosterSize): PosterLayout {
  const pixelSize = POSTER_PIXEL_SIZES[size];
  const width = pixelSize.width / POSTER_DPR;
  const height = pixelSize.height / POSTER_DPR;
  const extraHeight = height - POSTER_PIXEL_SIZES.portrait.height / POSTER_DPR;
  const identityY = 38 + extraHeight * 0.1;
  const identityHeight = 294 + extraHeight * 0.05;
  const qrSize = 174;
  const qrY = 374 + extraHeight * 0.48;

  return {
    width,
    height,
    identity: { x: 36, y: identityY, width: width - 72, height: identityHeight },
    qr: {
      x: (width - qrSize) / 2,
      y: qrY,
      size: qrSize,
      captionY: qrY + qrSize + 19,
    },
    linkY: qrY + qrSize + 54,
    footerY: height - 28,
  };
}

export function avatarInitial(title: string): string {
  return Array.from(title.trim())[0] ?? '一';
}

export function posterFileName(slug: string): string {
  return `yilink-${slug}-poster.png`;
}

export function formatPosterLink(publicUrl: string): string {
  try {
    const url = new URL(publicUrl);
    return `${url.host}${decodeURIComponent(url.pathname)}`.replace(/\/$/, '');
  } catch {
    return publicUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }
}

export function truncateCanvasText(context: TextMeasurer, value: string, maxWidth: number): string {
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text || context.measureText(text).width <= maxWidth) return text;

  const characters = Array.from(text);
  let low = 0;
  let high = characters.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = `${characters.slice(0, middle).join('').trimEnd()}${ELLIPSIS}`;
    if (context.measureText(candidate).width <= maxWidth) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return `${characters.slice(0, low).join('').trimEnd()}${ELLIPSIS}`;
}

export function wrapCanvasText(
  context: TextMeasurer,
  value: string,
  maxWidth: number,
  maxLines = 2,
): string[] {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized || maxLines < 1) return [];

  let remaining = Array.from(normalized);
  const lines: string[] = [];
  while (remaining.length > 0 && lines.length < maxLines) {
    const remainingText = remaining.join('');
    if (context.measureText(remainingText).width <= maxWidth) {
      lines.push(remainingText);
      break;
    }

    if (lines.length === maxLines - 1) {
      lines.push(truncateCanvasText(context, remainingText, maxWidth));
      break;
    }

    let low = 1;
    let high = remaining.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (context.measureText(remaining.slice(0, middle).join('')).width <= maxWidth) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }

    const take = Math.max(1, low);
    lines.push(remaining.slice(0, take).join('').trimEnd());
    remaining = remaining.slice(take);
    while (remaining[0] === ' ') remaining.shift();
  }

  return lines;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(Math.max(radius, 0), width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function gradientStops(value: string): Array<{ color: string; offset: number }> {
  const matches = Array.from(
    value.matchAll(/(#[\da-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))\s*(\d+(?:\.\d+)?%)?/gi),
  );
  return matches.map((match, index) => ({
    color: match[1],
    offset: match[2]
      ? Math.min(1, Math.max(0, Number.parseFloat(match[2]) / 100))
      : matches.length === 1
        ? 0
        : index / (matches.length - 1),
  }));
}

function gradientVector(
  value: string,
  width: number,
  height: number,
): [number, number, number, number] {
  const degrees = Number.parseFloat(
    value.match(/linear-gradient\(\s*(-?[\d.]+)deg/i)?.[1] ?? '180',
  );
  const radians = (degrees * Math.PI) / 180;
  const directionX = Math.sin(radians);
  const directionY = -Math.cos(radians);
  const length = Math.abs(width * directionX) + Math.abs(height * directionY);
  const centerX = width / 2;
  const centerY = height / 2;
  return [
    centerX - (directionX * length) / 2,
    centerY - (directionY * length) / 2,
    centerX + (directionX * length) / 2,
    centerY + (directionY * length) / 2,
  ];
}

function drawBackground(
  context: CanvasRenderingContext2D,
  theme: PosterTheme,
  width: number,
  height: number,
): void {
  context.fillStyle = theme.neutral.pageBg;
  context.fillRect(0, 0, width, height);
  if (theme.background.type !== 'gradient') return;

  const stops = gradientStops(theme.background.value);
  if (stops.length < 2) return;
  const gradient = context.createLinearGradient(
    ...gradientVector(theme.background.value, width, height),
  );
  stops.forEach((stop) => gradient.addColorStop(stop.offset, stop.color));
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function shadowColor(value: string): string {
  const colors = Array.from(value.matchAll(/rgba?\([^)]*\)/gi), (match) => match[0]);
  return colors.at(-1) ?? 'rgba(0, 0, 0, 0.08)';
}

function drawElevatedCard(
  context: CanvasRenderingContext2D,
  theme: PosterTheme,
  layout: PosterLayout,
): void {
  const { x, y, width, height } = layout.identity;
  const radius = Math.min(28, Math.max(16, Number.parseFloat(theme.radius.card) * 1.2 || 24));

  context.save();
  context.shadowColor = shadowColor(theme.elevation.cardShadow);
  context.shadowBlur = 18;
  context.shadowOffsetY = 8;
  context.fillStyle = theme.neutral.card;
  roundedRect(context, x, y, width, height, radius);
  context.fill();
  context.restore();

  context.save();
  context.strokeStyle = theme.neutral.hairline;
  context.lineWidth = 0.75;
  roundedRect(context, x, y, width, height, radius);
  context.stroke();
  context.restore();
}

function imageDimensions(image: CanvasImageSource): { height: number; width: number } {
  const source = image as {
    height?: number;
    naturalHeight?: number;
    naturalWidth?: number;
    videoHeight?: number;
    videoWidth?: number;
    width?: number;
  };
  return {
    width: source.naturalWidth ?? source.videoWidth ?? source.width ?? 1,
    height: source.naturalHeight ?? source.videoHeight ?? source.height ?? 1,
  };
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  size: number,
): void {
  const source = imageDimensions(image);
  const scale = Math.max(size / source.width, size / source.height);
  const sourceWidth = size / scale;
  const sourceHeight = size / scale;
  const sourceX = (source.width - sourceWidth) / 2;
  const sourceY = (source.height - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, size, size);
}

function drawAvatar(
  context: CanvasRenderingContext2D,
  image: PosterImage | null,
  title: string,
  theme: PosterTheme,
  centerX: number,
  centerY: number,
): void {
  const radius = 47;
  context.save();
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.clip();
  if (image) {
    drawCoverImage(context, image, centerX - radius, centerY - radius, radius * 2);
  } else {
    context.fillStyle = theme.accent;
    context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    context.fillStyle = theme.accentOn;
    context.font = `800 34px ${SYSTEM_FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(avatarInitial(title), centerX, centerY + 1);
  }
  context.restore();

  context.save();
  context.strokeStyle = theme.neutral.card;
  context.lineWidth = 4;
  context.beginPath();
  context.arc(centerX, centerY, radius + 1, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawIdentity(
  context: CanvasRenderingContext2D,
  options: GeneratePosterOptions,
  layout: PosterLayout,
  avatar: PosterImage | null,
): void {
  const { identity } = layout;
  const contentX = identity.x + 32;
  const avatarX = identity.x + identity.width - 70;
  const avatarY = identity.y + 70;
  const title = options.title.trim() || '一链主页';

  drawAvatar(context, avatar, title, options.theme, avatarX, avatarY);

  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillStyle = options.theme.neutral.text;
  context.font = `800 36px ${SYSTEM_FONT}`;
  context.fillText(
    truncateCanvasText(context, title, identity.width - 188),
    contentX,
    identity.y + 82,
  );

  const role = options.role?.trim();
  if (role) {
    context.fillStyle = options.theme.accent;
    context.font = `700 16px ${SYSTEM_FONT}`;
    context.fillText(
      truncateCanvasText(context, role, identity.width - 64),
      contentX,
      identity.y + 128,
    );
  }

  const bio = options.bio?.trim();
  if (bio) {
    context.fillStyle = options.theme.neutral.subtext;
    context.font = `400 14px ${SYSTEM_FONT}`;
    const lines = wrapCanvasText(context, bio, identity.width - 64, 2);
    const firstBaseline = role ? identity.y + 194 : identity.y + 171;
    lines.forEach((line, index) => {
      context.fillText(line, contentX, firstBaseline + index * 24);
    });
  }
}

function drawQr(
  context: CanvasRenderingContext2D,
  image: PosterImage,
  theme: PosterTheme,
  layout: PosterLayout,
): void {
  const { x, y, size, captionY } = layout.qr;
  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.08)';
  context.shadowBlur = 16;
  context.shadowOffsetY = 6;
  context.fillStyle = '#FFFFFF';
  roundedRect(context, x, y, size, size, 22);
  context.fill();
  context.restore();

  context.save();
  roundedRect(context, x + 13, y + 13, size - 26, size - 26, 10);
  context.clip();
  context.fillStyle = '#FFFFFF';
  context.fillRect(x + 13, y + 13, size - 26, size - 26);
  context.drawImage(image, x + 13, y + 13, size - 26, size - 26);
  context.restore();

  context.fillStyle = theme.neutral.subtext;
  context.font = `400 12px ${SYSTEM_FONT}`;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillText('打开相机扫码访问', layout.width / 2, captionY);
}

async function defaultDecodeImage(blob: Blob): Promise<PosterImage> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob);
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('图片解码失败'));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function fetchImage(
  fetcher: PosterFetcher,
  decodeImage: (blob: Blob) => Promise<PosterImage>,
  url: string,
  init: RequestInit,
): Promise<PosterImage> {
  const response = await fetcher(url, init);
  if (!response.ok) throw new Error(`图片请求失败（${response.status}）`);
  return decodeImage(await response.blob());
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('海报生成已取消', 'AbortError');
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('浏览器无法导出海报图片'));
      }
    }, 'image/png');
  });
}

export async function generatePoster(options: GeneratePosterOptions): Promise<Blob> {
  const fetcher = options.runtime?.fetcher ?? fetch;
  const decodeImage = options.runtime?.decodeImage ?? defaultDecodeImage;
  const createCanvas = options.runtime?.createCanvas ?? (() => document.createElement('canvas'));
  const qrUrl = `/api/v1/pages/${encodeURIComponent(options.pageId)}/qr?format=png&size=512`;

  const avatarPromise = options.avatarUrl
    ? fetchImage(fetcher, decodeImage, options.avatarUrl, {
        credentials: 'omit',
        signal: options.signal,
      })
    : Promise.resolve(null);
  const qrPromise = fetchImage(fetcher, decodeImage, qrUrl, {
    credentials: 'include',
    signal: options.signal,
  });
  const [avatarResult, qrResult] = await Promise.allSettled([avatarPromise, qrPromise]);

  if (options.signal?.aborted) {
    if (avatarResult.status === 'fulfilled') avatarResult.value?.close?.();
    if (qrResult.status === 'fulfilled') qrResult.value.close?.();
    throw abortReason(options.signal);
  }
  if (qrResult.status === 'rejected') {
    if (avatarResult.status === 'fulfilled') avatarResult.value?.close?.();
    throw new PosterQrUnavailableError(qrResult.reason);
  }

  const avatar = avatarResult.status === 'fulfilled' ? avatarResult.value : null;
  const qr = qrResult.value;

  try {
    const layout = getPosterLayout(options.size);
    const pixelSize = POSTER_PIXEL_SIZES[options.size];
    const canvas = createCanvas();
    canvas.width = pixelSize.width;
    canvas.height = pixelSize.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器不支持 Canvas 2D');

    context.scale(POSTER_DPR, POSTER_DPR);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    drawBackground(context, options.theme, layout.width, layout.height);
    drawElevatedCard(context, options.theme, layout);
    drawIdentity(context, options, layout, avatar);
    drawQr(context, qr, options.theme, layout);

    context.fillStyle = options.theme.accent;
    context.font = `600 15px ${SYSTEM_FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    context.fillText(
      truncateCanvasText(context, formatPosterLink(options.publicUrl), layout.width - 96),
      layout.width / 2,
      layout.linkY,
    );

    context.fillStyle = options.theme.neutral.subtext;
    context.globalAlpha = 0.72;
    context.font = `400 11px ${SYSTEM_FONT}`;
    context.fillText('Powered by 一链 YiLink', layout.width / 2, layout.footerY);
    context.globalAlpha = 1;

    return await canvasBlob(canvas);
  } finally {
    avatar?.close?.();
    qr.close?.();
  }
}
