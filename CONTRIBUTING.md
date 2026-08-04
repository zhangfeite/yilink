# 参与贡献

感谢你帮助改进一链 YiLink。提交变更前，请使用 Node.js 20 或更高版本和仓库声明的 pnpm 版本，并依次运行：

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 依赖 License 红线

新增依赖及复制进入仓库的代码，只允许使用 MIT、Apache-2.0、BSD、ISC 或 CC0 许可证。严禁引入 GPL、AGPL、LGPL 或其他传染性许可证的依赖或代码；LinkStack（AGPL）只能用于产品对照，任何代码都不得复制。提交依赖变更时，请在评审说明中列出新依赖及其许可证，并检查直接和传递依赖。

## 变更范围

保持提交聚焦，新增行为应附测试。不要提交本地 `.env`、SQLite 数据库、构建产物或 Playwright 报告。
