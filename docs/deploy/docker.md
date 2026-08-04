# Docker Compose 部署

本文面向在单台服务器或本机自托管一链 YiLink 的部署者。当前镜像使用 SQLite，并把数据库文件持久化到 Docker named volume。

## 前置条件

- Docker Engine 与 Docker Compose plugin 可用。
- 一个可用于外部访问的域名和 HTTPS 终止方案（生产环境建议）。
- 仓库已检出，且以下命令从仓库根目录执行。

为避免不同目录名产生不同的 volume 名称，本文固定使用 Compose 项目名 <code>yilink</code>。命令中的 <code>--env-file docker/.env</code> 让 Compose 使用部署专用配置，而不是源码开发配置。

## 1. 准备环境变量

```bash
cp docker/.env.example docker/.env
openssl rand -base64 48
```

将第二条命令的输出填入 <code>docker/.env</code> 的 <code>AUTH_SECRET</code>，并至少确认以下值：

| 变量                                                                                     | 部署时的处理                                                          |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| <code>DATABASE_URL</code>                                                                | 保持为 <code>file:/data/yilink.db</code>，该文件位于 named volume。   |
| <code>AUTH_SECRET</code>                                                                 | 替换模板占位值；不要提交或分享。                                      |
| <code>AUTH_URL</code>                                                                    | 改为应用的完整外部地址；本机试用可保留 localhost。                    |
| <code>PAGES_HOST</code>                                                                  | 可选的公开主页独立域名，不填写时使用主域名下的 <code>/p/slug</code>。 |
| <code>NEXT_PUBLIC_APP_URL</code>                                                         | 可选的二维码回退地址；通常与 <code>AUTH_URL</code> 相同。             |
| <code>GITHUB_ID</code> / <code>GITHUB_SECRET</code>                                      | 可选；同时填写时启用 GitHub 登录。                                    |
| <code>LEMONSQUEEZY_WEBHOOK_SECRET</code>                                                 | 可选；启用 LemonSqueezy webhook 时填写 HMAC-SHA256 密钥。             |
| <code>LEMONSQUEEZY_VARIANT_MINI</code> / <code>LEMONSQUEEZY_VARIANT_PRO</code>           | 可选；分别填写基础与完整买断套餐的 variant ID。                       |
| <code>LEMONSQUEEZY_CHECKOUT_URL_MINI</code> / <code>LEMONSQUEEZY_CHECKOUT_URL_PRO</code> | 可选；填写两个 HTTPS 结账链接后，用户设置页显示升级入口。             |
| <code>NEXT_PUBLIC_PRICE_MINI</code> / <code>NEXT_PUBLIC_PRICE_PRO</code>                 | 可选；设置页显示的价格文案。                                          |

## 2. 初始化 migration 并启动

镜像的启动命令会先执行 <code>pnpm --filter @yilink/web db:deploy</code>。首次部署也可以显式执行一次，再启动常驻服务：

```bash
docker compose --project-name yilink --env-file docker/.env -f docker/docker-compose.yml run --rm web pnpm --filter @yilink/web db:deploy
docker compose --project-name yilink --env-file docker/.env -f docker/docker-compose.yml up -d --build
docker compose --project-name yilink --env-file docker/.env -f docker/docker-compose.yml logs --follow web
```

看到应用开始监听后，可用下面的命令检查健康接口：

```bash
curl --fail http://127.0.0.1:3000/api/health
```

## 3. 写入可选演示数据

以下命令会创建演示用户和三个公开主页。生产实例通常应跳过这一步。

```bash
docker compose --project-name yilink --env-file docker/.env -f docker/docker-compose.yml run --rm web pnpm --filter @yilink/web db:seed
```

## 4. 升级

升级前先完成备份。随后拉取目标版本、重建镜像并替换服务；启动时会自动应用已提交的 migration。

```bash
git pull --ff-only
docker compose --project-name yilink --env-file docker/.env -f docker/docker-compose.yml build --pull
docker compose --project-name yilink --env-file docker/.env -f docker/docker-compose.yml up -d
```

升级后检查日志与健康接口：

```bash
docker compose --project-name yilink --env-file docker/.env -f docker/docker-compose.yml logs --tail=100 web
curl --fail http://127.0.0.1:3000/api/health
```

## 5. 备份 SQLite volume

默认 volume 名称为 <code>yilink_yilink_data</code>。下面的命令将其压缩到仓库根目录的 <code>backups</code>。备份应在升级前和任何人工数据库操作前执行。

```bash
mkdir -p backups
docker run --rm -v yilink_yilink_data:/data:ro -v "$PWD/backups:/backup" alpine:3.22 sh -c 'tar -czf /backup/yilink-$(date +%Y%m%d-%H%M%S).tgz -C /data .'
```

请将生成的归档复制到独立于服务器的安全位置。恢复会覆盖现有数据库，操作前应先停止服务并另做一次当前数据备份。

## 6. 切换到 PostgreSQL

当前版本不能通过修改 <code>DATABASE_URL</code> 直接切换 PostgreSQL：Prisma schema 的 datasource 仍是 SQLite，现有 migration 也按 SQLite 生成。仓库中的 PostgreSQL Compose 注释块仅是未来部署形态的占位，不应在当前版本启用。

在 PostgreSQL 支持落地前，请继续使用 SQLite Compose 路径。切换实现至少需要：

1. 将 Prisma datasource 与 migration 策略改为 PostgreSQL。
2. 为现有 SQLite 数据准备并验证导出、导入和回滚方案。
3. 在 PostgreSQL 环境通过 migration、构建、登录、公开页和统计回归测试。
4. 为数据库凭据设置部署平台的密钥管理与备份策略。

完成这些改造后，再将 Compose 的数据库连接改为 PostgreSQL URL，并以 <code>pnpm --filter @yilink/web db:deploy</code> 初始化目标数据库。
