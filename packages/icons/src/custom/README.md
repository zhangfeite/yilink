# 自绘平台图标 / Custom platform glyphs

当 `docs/design/platform-icons-verified.json` 中的平台尚无可用 simple-icons 图标时，
在此目录新增与平台 `id` 同名的 TypeScript 文件，例如 `wechat-channels.ts`：

```ts
export const path = 'M...Z';
export const viewBox = '0 0 24 24'; // 可选，默认 0 0 24 24
```

也支持导出默认对象：

```ts
export default { path: 'M...Z', viewBox: '0 0 24 24' };
```

随后运行 `pnpm --filter @yilink/icons generate`。生成器只接受
`platform-icons-verified.json` 中已存在且没有 simple-icons 图标的平台 ID，并将其
`source` 更新为 `custom`。请勿把未经核验的品牌色写入生成结果；贴纸在颜色尚未
核验时会使用中性底色。

---

For a platform without a verified simple-icons glyph, add a TypeScript file named
after its existing platform ID. Export a non-empty SVG `path` and, optionally, a
`viewBox`, then rerun the generator. Custom files may only fill pending verified
platforms; they cannot override a verified simple-icons mark.
