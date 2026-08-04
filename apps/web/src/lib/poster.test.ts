import { describe, expect, it, vi } from 'vitest';

import {
  POSTER_PIXEL_SIZES,
  PosterQrUnavailableError,
  avatarInitial,
  formatPosterLink,
  generatePoster,
  getPosterLayout,
  posterFileName,
  truncateCanvasText,
  wrapCanvasText,
} from './poster';

const minimalTheme = {
  accent: '#1C1C1A',
  accentOn: '#FFFFFF',
  background: { type: 'solid', value: '#F3F3F1' },
  elevation: { cardShadow: '0 8px 30px rgba(0, 0, 0, 0.06)' },
  neutral: {
    card: '#FFFFFF',
    hairline: '#E5E5E1',
    pageBg: '#F3F3F1',
    subtext: '#666664',
    text: '#161616',
  },
  radius: { avatar: '50%', card: '20px', sticker: '50%' },
} as const;

const darkTheme = {
  ...minimalTheme,
  accent: '#E5C15C',
  accentOn: '#151310',
  background: { type: 'solid', value: '#0E0E11' },
  elevation: {
    cardShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.05), 0 10px 28px rgba(0, 0, 0, 0.40)',
  },
  neutral: {
    card: '#1A1A1F',
    hairline: '#2C2C33',
    pageBg: '#0E0E11',
    subtext: '#A0A0A8',
    text: '#F4F4F2',
  },
} as const;

const gradientTheme = {
  ...darkTheme,
  accent: '#36E4FF',
  accentOn: '#06202B',
  background: {
    type: 'gradient',
    value: 'linear-gradient(165deg, #0A0E1E 0%, #111A3C 55%, #0B1F42 100%)',
  },
} as const;

function textMeasurer(widthPerCharacter = 10) {
  return {
    measureText: (text: string) => ({ width: Array.from(text).length * widthPerCharacter }),
  };
}

function mockCanvas() {
  const gradient = { addColorStop: vi.fn() };
  const context = {
    arc: vi.fn(),
    arcTo: vi.fn(),
    beginPath: vi.fn(),
    clip: vi.fn(),
    closePath: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    fillText: vi.fn(),
    font: '',
    globalAlpha: 1,
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
    lineWidth: 1,
    measureText: vi.fn((text: string) => ({ width: Array.from(text).length * 10 })),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    shadowBlur: 0,
    shadowColor: '',
    shadowOffsetY: 0,
    stroke: vi.fn(),
    strokeStyle: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  };
  const canvas = {
    height: 0,
    getContext: vi.fn(() => context as unknown as CanvasRenderingContext2D),
    toBlob: vi.fn((callback: BlobCallback) => {
      callback(new Blob(['poster'], { type: 'image/png' }));
    }),
    width: 0,
  } as unknown as HTMLCanvasElement;
  return { canvas, context, gradient };
}

function decodedImage() {
  return {
    close: vi.fn(),
    height: 512,
    width: 512,
  } as unknown as CanvasImageSource & { close: () => void };
}

describe('poster layout and text helpers', () => {
  it('calculates exact 3:4 output dimensions at DPR 2', () => {
    const layout = getPosterLayout('portrait');

    expect(POSTER_PIXEL_SIZES.portrait).toEqual({ width: 1080, height: 1440 });
    expect(layout).toMatchObject({ width: 540, height: 720, footerY: 692 });
    expect(layout.identity.x + layout.identity.width).toBe(504);
    expect(layout.qr.x + layout.qr.size / 2).toBe(layout.width / 2);
  });

  it('moves content apart for the taller story layout', () => {
    const portrait = getPosterLayout('portrait');
    const story = getPosterLayout('story');

    expect(POSTER_PIXEL_SIZES.story).toEqual({ width: 1080, height: 1920 });
    expect(story.width).toBe(portrait.width);
    expect(story.height).toBe(960);
    expect(story.identity.y).toBeGreaterThan(portrait.identity.y);
    expect(story.qr.y).toBeGreaterThan(portrait.qr.y + 100);
    expect(story.footerY).toBe(932);
  });

  it('keeps short text and truncates overflow with an ellipsis', () => {
    const context = textMeasurer();

    expect(truncateCanvasText(context, '林小满', 40)).toBe('林小满');
    expect(truncateCanvasText(context, '这是一个很长的主页昵称', 50)).toBe('这是一个…');
  });

  it('wraps the bio to at most two lines and truncates the final line', () => {
    const lines = wrapCanvasText(textMeasurer(), '一二三四五六七八九十十一十二', 50, 2);

    expect(lines).toEqual(['一二三四五', '六七八九…']);
  });

  it('builds the avatar fallback, display link, and required filename', () => {
    expect(avatarInitial('  林小满')).toBe('林');
    expect(avatarInitial('  ')).toBe('一');
    expect(formatPosterLink('https://pages.example.com/lin-xiaoman/')).toBe(
      'pages.example.com/lin-xiaoman',
    );
    expect(posterFileName('lin-xiaoman')).toBe('yilink-lin-xiaoman-poster.png');
  });
});

describe('generatePoster fallbacks', () => {
  it('fetches avatar and QR as blobs and draws the initial when the avatar request fails', async () => {
    const { canvas, context } = mockCanvas();
    const qrImage = decodedImage();
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).startsWith('https://images.example.com')) {
        return new Response(null, { status: 403 });
      }
      return new Response(new Blob(['qr'], { type: 'image/png' }));
    });

    const blob = await generatePoster({
      avatarUrl: 'https://images.example.com/avatar.jpg',
      bio: '独立插画师与视觉设计师',
      pageId: 'page-1',
      publicUrl: 'https://example.com/p/lin-xiaoman',
      role: '插画师',
      runtime: {
        createCanvas: () => canvas,
        decodeImage: vi.fn(async () => qrImage),
        fetcher,
      },
      size: 'portrait',
      slug: 'lin-xiaoman',
      theme: minimalTheme,
      title: '林小满',
    });

    expect(blob.type).toBe('image/png');
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1440);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledWith(
      '/api/v1/pages/page-1/qr?format=png&size=512',
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(context.fillText).toHaveBeenCalledWith('林', expect.any(Number), expect.any(Number));
    expect(qrImage.close).toHaveBeenCalledOnce();
  });

  it('reports a typed failure and skips Canvas when the QR request fails', async () => {
    const createCanvas = vi.fn(() => mockCanvas().canvas);

    await expect(
      generatePoster({
        pageId: 'page-2',
        publicUrl: 'https://example.com/p/unavailable',
        runtime: {
          createCanvas,
          decodeImage: vi.fn(async () => decodedImage()),
          fetcher: vi.fn(async () => new Response(null, { status: 503 })),
        },
        size: 'story',
        slug: 'unavailable',
        theme: darkTheme,
        title: '不可用页面',
      }),
    ).rejects.toBeInstanceOf(PosterQrUnavailableError);
    expect(createCanvas).not.toHaveBeenCalled();
  });

  it('approximates a theme gradient with Canvas color stops', async () => {
    const { canvas, context, gradient } = mockCanvas();

    await generatePoster({
      pageId: 'page-3',
      publicUrl: 'https://example.com/p/neon',
      runtime: {
        createCanvas: () => canvas,
        decodeImage: vi.fn(async () => decodedImage()),
        fetcher: vi.fn(async () => new Response(new Blob(['image']))),
      },
      size: 'portrait',
      slug: 'neon',
      theme: gradientTheme,
      title: '霓虹主页',
    });

    expect(context.createLinearGradient).toHaveBeenCalledOnce();
    expect(gradient.addColorStop).toHaveBeenCalledTimes(3);
  });
});
