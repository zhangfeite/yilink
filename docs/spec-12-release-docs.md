# Spec-12：部署文档与开源发布准备

> 工人：Codex（gpt-5.6-terra）｜验收：Claude 本体（含新目录 clean checkout 演练）｜上位：[PRD](PRD.md) §6/§9、[research/04-china-localization.md](research/04-china-localization.md) §2（合规清单事实来源）
> 工区：**只许改** `README.md`、`README.en.md`（新建）、`docs/deploy/**`（新建目录）、`NOTICE`（新建）、`CONTRIBUTING.md`（补全）、`.github/workflows/ci.yml`（加 docker build job）、`apps/web/.env.example`（查漏补缺）、`docker/**`（如有错修正）。**禁止**：改任何业务代码与依赖；不 git commit。

## 1. README.md 重写（中文主文档）

结构：一句话定位 + 核心特性清单（场景模板/8 主题/微信适配/二维码海报/统计/审核/自部署）→ 快速开始（Docker Compose 三行命令 + 源码模式）→ 配置说明（env 表格）→ 自部署合规提示（链接 docs/deploy/compliance-cn.md）→ 架构简图 → Roadmap（从 PRD §4.2/4.3 提炼）→ 贡献指引链接 → License。语气：开源项目 README 惯例，克制专业，不写营销话术。`README.en.md` 为对应英文版（内容对齐，不逐字直译）。现 README 的「文档索引」「核心结论」段落移入 `docs/README.md`（新建索引页），主 README 面向使用者而非项目组。

## 2. docs/deploy/ 三篇

1. `docker.md`：Compose 部署全流程（env 准备/初始化迁移/种子可选/升级/备份 SQLite 卷/切 Postgres）
2. `compliance-cn.md`：境内部署合规指引——ICP/公安备案要点、个人备案不可做多用户 UGC、`MULTI_USER` 开关的合规含义、内容审核 provider 配置建议；**事实以 research/04 为准引用，不新编内容**，开头声明「非法律意见」
3. `vercel.md`：海外托管部署（Postgres 环境变量、构建配置）

## 3. 工程收尾

- `NOTICE`：Apache-2.0 规范格式；致谢 simple-icons（CC0，图标数据来源）及借鉴项目（BioDrop/littlelink/librelinks，注明仅借鉴设计未复制代码——如实陈述）
- `CONTRIBUTING.md` 补全：开发环境、测试命令、工区/评审流程简述、AGPL 依赖红线（已有段落保留）、主题投稿指引占位（链接 template-system.md）
- CI 加 `docker-build` job：`docker build -f docker/Dockerfile .` 可通过（修 Dockerfile 与 .dockerignore 的现存问题——注意 `.npmrc` store-dir、`prisma generate`、standalone 输出、seed.mjs 与 scripts 的拷贝完整性）
- `.env.example` 全量核对：与代码中实际读取的 env 逐一对照（grep process.env），缺的补上、废弃的删掉，全部中文注释

## 4. 验收

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿（docs 改动不应影响，跑一遍防手滑）
- README 里每条命令逐条可执行（工人自验 shell 语法；clean checkout 演练由验收方执行）
- `git status --short` 贴报告
