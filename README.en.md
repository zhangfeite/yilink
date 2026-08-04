# YiLink

[简体中文](README.md)

YiLink is an open-source link-in-bio and digital profile application for creators and teams. It can be self-hosted for publishing profile pages, QR codes, and curated links.

## Features

- Scenario templates: eight starting points for creator and personal-brand pages.
- Themes and layouts: eight themes with list and grid layouts.
- WeChat-aware distribution: public pages are designed for in-app browsing, link copying, and QR-code sharing.
- QR and poster workflow: download page QR codes and generate themed share posters in the browser.
- Analytics: public-page visits and link clicks are collected into a 30-day summary.
- Moderation: publishing runs the bundled local-word check and records review activity for administrators.
- Self-hosting: SQLite is the default database and Docker Compose is provided.

## Quick start

### Docker Compose

Run these commands from the repository root. Before starting the service, edit <code>docker/.env</code>: generate a strong <code>AUTH_SECRET</code> and set <code>AUTH_URL</code> to the public address of the deployment.

```bash
cp docker/.env.example docker/.env
docker compose --project-name yilink --env-file docker/.env -f docker/docker-compose.yml up -d --build
docker compose --project-name yilink --env-file docker/.env -f docker/docker-compose.yml ps
```

The container applies committed Prisma migrations before the application starts. The default address is <http://localhost:3000>. See the [Docker deployment guide](docs/deploy/docker.md) for initialization, upgrades, and backups.

### From source

Node.js 20+ and the pnpm version declared by the repository are required.

```bash
corepack enable
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

<code>pnpm db:seed</code> is optional and creates three demo pages. After the development server starts, visit <http://localhost:3000/p/demo-photographer>.

## Configuration

For source development, configure <code>apps/web/.env</code>. Docker Compose reads <code>docker/.env</code>; its template uses the persistent SQLite volume path.

| Variable                                                                                 | Required      | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| <code>DATABASE_URL</code>                                                                | Yes           | Prisma database connection. Source development uses a relative SQLite path; Docker uses the SQLite file mounted at <code>/data</code>. |
| <code>AUTH_SECRET</code>                                                                 | In production | Auth.js session secret. Use a random value of at least 32 bytes in production.                                                         |
| <code>AUTH_URL</code>                                                                    | Recommended   | External application URL, for example <code>https://links.example.com</code>.                                                          |
| <code>GITHUB_ID</code>                                                                   | No            | GitHub OAuth App Client ID. GitHub sign-in is enabled only when the matching secret is set.                                            |
| <code>GITHUB_SECRET</code>                                                               | No            | GitHub OAuth App Client Secret.                                                                                                        |
| <code>PAGES_HOST</code>                                                                  | No            | Dedicated host for public pages. Its root and single-segment paths are routed to public pages.                                         |
| <code>NEXT_PUBLIC_APP_URL</code>                                                         | No            | Public app URL used for QR-code generation when <code>PAGES_HOST</code> is unset.                                                      |
| <code>LEMONSQUEEZY_WEBHOOK_SECRET</code>                                                 | No            | HMAC-SHA256 secret for LemonSqueezy webhooks. Without it, the callback endpoint rejects requests.                                      |
| <code>LEMONSQUEEZY_VARIANT_MINI</code> / <code>LEMONSQUEEZY_VARIANT_PRO</code>           | No            | LemonSqueezy variant IDs for the two lifetime plans, used to map a paid order to a plan.                                               |
| <code>LEMONSQUEEZY_CHECKOUT_URL_MINI</code> / <code>LEMONSQUEEZY_CHECKOUT_URL_PRO</code> | No            | HTTPS checkout links for the two plans. The upgrade area appears only when both URLs are valid.                                        |
| <code>NEXT_PUBLIC_PRICE_MINI</code> / <code>NEXT_PUBLIC_PRICE_PRO</code>                 | No            | Price text shown in settings; defaults are <code>$12</code> and <code>$25</code>.                                                      |

The current Prisma datasource is SQLite. Read [Vercel and hosted deployment](docs/deploy/vercel.md) before choosing PostgreSQL or Vercel: PostgreSQL support must be implemented before a connection string alone can make that deployment work.

## China deployment notice

For deployments in mainland China, read the [China compliance guide](docs/deploy/compliance-cn.md). It covers ICP and public-security filings, the boundary of multi-user UGC operation, and deployment guidance for content moderation. The guide is not legal advice; operators should verify requirements for their service, region, and operating model.

## Architecture

```text
Browser / QR-code visit
          │
          ▼
Next.js application (apps/web)
 ├─ Public pages, editor, authentication, and API
 ├─ packages/shared: schemas and shared utilities
 ├─ packages/icons: platform icons
 └─ packages/moderation: moderation-provider interface
          │
          ▼
Prisma ── SQLite (Docker named volume)
```

## Roadmap

The [PRD](docs/PRD.md) is the source of truth. Planned work includes:

- V1.x: custom domains, mutable QR codes, a free-form grid editor, a template gallery, theme contributions, media-kit cards, and richer analytics.
- V2: a WeChat mini-program profile card, booking and form blocks, third-party payment links, AI-assisted page drafts, and team or creator-network management.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, verification commands, review expectations, and dependency-license requirements.

## License

YiLink is released under the [Apache License 2.0](LICENSE). Third-party notices are in [NOTICE](NOTICE).
