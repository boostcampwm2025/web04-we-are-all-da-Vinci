FROM node:24-alpine AS base

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_DEFAULT_TO_LATEST=0

ARG PNPM_VERSION=10.20.0

RUN corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate

FROM base AS builder

COPY pnpm-workspace.yaml package.json .npmrc pnpm-lock.yaml ./
COPY server/package.json ./server/
COPY packages/shared/package.json ./packages/shared/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
pnpm install --frozen-lockfile --ignore-scripts

COPY packages/shared ./packages/shared
COPY server ./server

RUN pnpm --filter ./packages/shared build
RUN pnpm --filter server build

RUN pnpm deploy --filter server --prod /prod/server --legacy --ignore-scripts

FROM node:24-alpine AS runner

WORKDIR /app

ENV TS_NODE_PROJECT=tsconfig.paths.json
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /prod/server ./

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "-r", "tsconfig-paths/register", "dist/main.js"]
