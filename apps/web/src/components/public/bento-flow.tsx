import type { CSSProperties } from 'react';

import { resolveBentoLayout, type BentoRenderBlock } from './bento-layout';
import styles from './public-page.module.css';

type BentoItemStyle = CSSProperties & Record<`--b-${string}`, string | number>;

/** BENTO 网格：服务端算好矩形，CSS Grid 直出，零框架 JS 增量。 */
export function BentoFlow({ blocks }: { blocks: readonly BentoRenderBlock[] }) {
  const resolved = resolveBentoLayout(blocks);
  if (resolved.length === 0) return null;

  return (
    <section aria-label="页面内容" className={styles.bentoGrid}>
      {resolved.map((block) => {
        const p = block.placement;
        if (!p) return null;
        const style: BentoItemStyle = {
          '--b-col': p.x + 1,
          '--b-row': p.y + 1,
          '--b-w': p.w,
          '--b-h': p.h,
        };
        return (
          <div className={styles.bentoItem} key={block.id} style={style}>
            {block.node}
          </div>
        );
      })}
    </section>
  );
}

export { bentoRowUnit, parsePlacement, resolveBentoLayout, type BentoRenderBlock } from './bento-layout';
