import { getCloudflareContext } from '@opennextjs/cloudflare';
import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from '@prisma/client';

/**
 * 数据层双形态（OpenNext 官方路径：prisma-client-js + driverAdapters，
 * 配合 next.config 的 serverExternalPackages 让 OpenNext 构建期 patch client 适配 workerd）：
 * - Cloudflare Workers：D1 绑定（binding 名固定 DB，见 wrangler.jsonc）
 * - 本地 / Docker 自部署 / vitest：SQLite 引擎（DATABASE_URL）
 * D1 与 SQLite 同方言，schema 与迁移完全复用。
 */

if (!process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = 'file:./data/yilink.db';
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

type D1Like = ConstructorParameters<typeof PrismaD1>[0];

function resolveD1Binding(): D1Like | null {
  try {
    // Workers 运行时（及 initOpenNextCloudflareForDev 后的本地 next dev）可取到绑定；
    // 其他环境调用抛错 → 走 SQLite 分支
    const env = getCloudflareContext().env as Record<string, unknown>;
    return (env.DB as D1Like | undefined) ?? null;
  } catch {
    return null;
  }
}

function createClient(): PrismaClient {
  const d1 = resolveD1Binding();
  if (d1) {
    return new PrismaClient({ adapter: new PrismaD1(d1) });
  }
  return new PrismaClient();
}

let cachedClient: PrismaClient | null = globalForPrisma.prisma ?? null;

function getClient(): PrismaClient {
  if (!cachedClient) {
    cachedClient = createClient();
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = cachedClient;
    }
  }
  return cachedClient;
}

/** 惰性代理：Workers 环境须在请求上下文内首次触达绑定，模块加载期不实例化。 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    return Reflect.get(client, prop, client);
  },
});
