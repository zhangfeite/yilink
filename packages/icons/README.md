# @yilink/icons

Chinese-platform brand glyphs and circular social-link stickers for YiLink. The
registry is generated from the repository's verified platform data; it contains
only approved simple-icons paths and explicitly marks artwork still awaiting
custom drawing.

一链的国内平台品牌图标与圆形社交贴纸。图标注册表由仓库内的已核验平台数据生成；
只收录已确认的 simple-icons 路径，并明确标注仍待自绘的图标。

## Use / 使用

```tsx
import { PlatformGlyph, PlatformSticker, platformRegistry } from '@yilink/icons';

export function Links() {
  return (
    <>
      <PlatformGlyph id="wechat" size={24} />
      <PlatformSticker id="bilibili" size={56} />
      <span>{platformRegistry.length} platforms</span>
    </>
  );
}
```

`PlatformGlyph` uses `currentColor` unless given `fill`. It intentionally renders
`null` for a platform without an approved path. `PlatformSticker` always renders:
pending entries receive a neutral circle with the first Chinese character of the
platform name, so social grids never break. Sticker colours come directly from
the verified data; no colour is inferred for pending entries.

`PlatformGlyph` 默认继承 `currentColor`，也可传入 `fill`。无核验路径的平台会返回
`null`；`PlatformSticker` 则始终可渲染，待补平台会回退为中性圆底和平台中文首字，
因此社交图标阵列不会破碎。贴纸色值直接来自已核验数据，待补项不会猜测品牌色。

## Generate / 生成注册表

```bash
pnpm --filter @yilink/icons generate
```

This reads `docs/design/platform-icons-verified.json` and the optional files in
`src/custom/`, then writes `src/generated/registry.ts`. Do not edit the generated
file by hand. The source JSON is the sole authority for IDs, names, categories,
aliases, simple-icons slugs, and sticker colours.

该命令读取 `docs/design/platform-icons-verified.json` 与可选的 `src/custom/`
文件，生成 `src/generated/registry.ts`。请勿手动编辑生成文件。平台 ID、名称、
分类、别名、simple-icons slug 与贴纸颜色均以该 JSON 为唯一来源。

## Contribute a custom glyph / 贡献自绘图标

For a pending platform, create `src/custom/{platform-id}.ts`:

```ts
export const path = 'M...Z';
export const viewBox = '0 0 24 24'; // optional
```

Run the generator afterwards. The generator validates the ID and changes that
entry's source from `pending` to `custom`; it never permits custom artwork to
replace a verified simple-icons entry. See [`src/custom/README.md`](src/custom/README.md)
for the supported default-export form and additional rules.

对待补平台新增 `src/custom/{platform-id}.ts` 后重跑生成器。生成器会校验 ID，并将
该条目的来源从 `pending` 改为 `custom`；它不会允许自绘路径覆盖已核验的
simple-icons 图标。更多格式说明见 [`src/custom/README.md`](src/custom/README.md)。

## Trademark notice / 商标声明

Platform names and marks belong to their respective owners. This package provides
reference artwork solely to identify supported destinations and does not imply
endorsement, affiliation, or a grant of trademark rights. Please follow each
platform's current brand-use guidelines when publishing a product that uses these
marks.

平台名称与商标归各自权利人所有。本包仅为标识受支持的跳转目标而提供参考图形，
不代表认可、合作关系或商标权授权。发布使用这些图标的产品前，请遵守各平台现行的
品牌使用规范。
