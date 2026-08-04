# 参与贡献

感谢你帮助改进一链 YiLink。欢迎提交 issue、文档修正、测试、主题和代码改进；请先确认变更与当前路线图或已有 issue 的范围一致。

## 开发环境

使用 Node.js 20 或更高版本，以及仓库 <code>packageManager</code> 字段声明的 pnpm 版本。在仓库根目录执行：

```bash
corepack enable
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env
pnpm db:migrate
pnpm dev
```

需要演示数据时可额外运行 <code>pnpm db:seed</code>。不要提交本地 <code>.env</code>、SQLite 数据库、构建产物或 Playwright 报告。

## 检查命令

提交变更前，请依次运行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

涉及 Prisma schema 或 migration 的变更，还应在本地验证 <code>pnpm db:migrate</code>；涉及 Docker 的变更，请运行 <code>docker build -f docker/Dockerfile .</code>。

## 工区与评审流程

1. 先在 issue 或讨论中说明问题、预期行为和影响范围。
2. 保持一个变更集聚焦。若任务或规格定义了工区，只修改其中列出的文件；发现需要越过工区时，先与维护者确认。
3. 行为变化应附带相应测试；文档或配置变化应说明验证方式。
4. 提交拉取请求时，说明动机、用户可见影响、已运行的检查，以及任何迁移或部署注意事项。
5. 维护者会关注范围、测试、可维护性、安全性和许可证；通过评审后再合并。

## 依赖 License 红线

新增依赖及复制进入仓库的代码，只允许使用 MIT、Apache-2.0、BSD、ISC 或 CC0 许可证。严禁引入 GPL、AGPL、LGPL 或其他传染性许可证的依赖或代码；LinkStack（AGPL）只能用于产品对照，任何代码都不得复制。提交依赖变更时，请在评审说明中列出新依赖及其许可证，并检查直接和传递依赖。

## 主题投稿

主题投稿通道尚在建设中。提交前请先阅读 [主题与模板系统说明](docs/design/template-system.md)；后续会补充主题 JSON 格式、可访问性校验和预览要求。
