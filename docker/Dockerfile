# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS dependencies

WORKDIR /app

# .npmrc pins pnpm's project-local store. Copy it before install so later
# commands do not see node_modules linked against a different store.
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/icons/package.json ./packages/icons/package.json
COPY packages/moderation/package.json ./packages/moderation/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile --ignore-scripts

FROM dependencies AS builder

WORKDIR /app

COPY . .

ENV DATABASE_URL="file:./data/yilink.db"
ENV NEXT_TELEMETRY_DISABLED="1"

RUN pnpm --filter @yilink/web db:generate
RUN pnpm build

FROM base AS runner

WORKDIR /app

ENV NODE_ENV="production"
ENV NEXT_TELEMETRY_DISABLED="1"
ENV HOSTNAME="0.0.0.0"
ENV PORT="3000"
ENV DATABASE_URL="file:/data/yilink.db"
ENV XDG_CACHE_HOME="/tmp/prisma-cache"

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /data /app/.pnpm-store \
  && chown nextjs:nodejs /data /app/.pnpm-store

COPY --from=builder --chown=nextjs:nodejs /app/.npmrc /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/prisma ./apps/web/prisma
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/scripts ./apps/web/scripts
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/node_modules ./apps/web/node_modules
# Next.js standalone output is rooted at /app, so server.js remains under
# apps/web after this copy. Static assets are intentionally copied separately.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @yilink/web db:deploy && exec node apps/web/server.js"]
