import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';
import memoryQueue from '@opennextjs/cloudflare/overrides/queue/memory-queue';

/**
 * Cloudflare Workers 缓存拓扑：
 * - incrementalCache → R2（unstable_cache 的跨隔离持久层）
 * - tagCache → D1（保住 revalidateTag(tag, {expire:0}) 的读己之写语义——
 *   审核隐藏/发布必须立即生效，这是产品 SLA 不是优化项）
 * - queue → 内存（我们无 ISR 定时再生需求，页面失效全部走显式 tag）
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: memoryQueue,
});
