import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock('../../../../../../lib/auth', () => ({ auth: authMock }));

import { db } from '../../../../../../lib/db';
import { GET } from './route';

const userId = 'qr-owner';
const otherUserId = 'qr-other-user';
const originalPagesHost = process.env.PAGES_HOST;
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

async function clearDatabase() {
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

function pageContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function pngDimensions(response: Response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { height: view.getUint32(20), width: view.getUint32(16) };
}

describe('/api/v1/pages/:id/qr', () => {
  beforeEach(async () => {
    await clearDatabase();
    await db.user.create({ data: { id: userId, email: 'qr-owner@example.com' } });
    await db.user.create({ data: { id: otherUserId, email: 'qr-other@example.com' } });
    authMock.mockReset();
    authMock.mockResolvedValue({ user: { id: userId } });
    delete process.env.PAGES_HOST;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    if (originalPagesHost === undefined) {
      delete process.env.PAGES_HOST;
    } else {
      process.env.PAGES_HOST = originalPagesHost;
    }

    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }
  });

  it('downloads a PNG at the default size', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'qr-png', title: '二维码 PNG' },
    });
    const response = await GET(
      new Request(`http://localhost/api/v1/pages/${page.id}/qr`),
      pageContext(page.id),
    );
    const bytes = new Uint8Array(await response.clone().arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="yilink-qr-png.png"',
    );
    expect(response.headers.get('cache-control')).toBe('private, max-age=3600');
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
    await expect(pngDimensions(response)).resolves.toEqual({ height: 512, width: 512 });
  });

  it('renders SVG and ignores the PNG-only size parameter', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'qr-svg', title: '二维码 SVG' },
    });
    const response = await GET(
      new Request(`http://localhost/api/v1/pages/${page.id}/qr?format=svg&size=1024`),
      pageContext(page.id),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/svg+xml');
    await expect(response.text()).resolves.toContain('<svg');
  });

  it('clamps PNG sizes to the supported range', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'qr-size', title: '二维码大小' },
    });
    const smallResponse = await GET(
      new Request(`http://localhost/api/v1/pages/${page.id}/qr?size=1`),
      pageContext(page.id),
    );
    const largeResponse = await GET(
      new Request(`http://localhost/api/v1/pages/${page.id}/qr?size=10000`),
      pageContext(page.id),
    );

    await expect(pngDimensions(smallResponse)).resolves.toEqual({ height: 256, width: 256 });
    await expect(pngDimensions(largeResponse)).resolves.toEqual({ height: 1024, width: 1024 });
  });

  it('returns 404 for a page owned by someone else', async () => {
    const page = await db.page.create({
      data: { userId: otherUserId, slug: 'other-qr', title: '其他人的二维码' },
    });

    const response = await GET(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
  });

  it('returns 401 without a session', async () => {
    authMock.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost'), pageContext('missing-page'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('reserves logo composition for the client poster flow', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'qr-logo', title: '二维码 Logo' },
    });

    const response = await GET(
      new Request(`http://localhost/api/v1/pages/${page.id}/qr?logo`),
      pageContext(page.id),
    );

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'NOT_IMPLEMENTED' },
    });
  });
});
