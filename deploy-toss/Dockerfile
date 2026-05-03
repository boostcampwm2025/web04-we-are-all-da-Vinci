FROM node:22-alpine AS base

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS builder

COPY pnpm-workspace.yaml package.json .npmrc pnpm-lock.yaml ./
COPY server-toss/package.json ./server-toss/
COPY packages/toss-shared/package.json ./packages/toss-shared/
COPY packages/similarity/package.json ./packages/similarity/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
pnpm install --frozen-lockfile --ignore-scripts

COPY packages/toss-shared ./packages/toss-shared
COPY packages/similarity ./packages/similarity
COPY server-toss ./server-toss

RUN pnpm --filter ./packages/toss-shared build
RUN pnpm --filter ./packages/similarity build
RUN pnpm --filter server-toss build
  

FROM builder AS migration
WORKDIR /app/server-toss

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

ENV NODE_ENV=production
CMD ["pnpm", "run", "migration:up", "--config", "mikro-orm.migration.config.cjs"]

FROM base AS deploy

WORKDIR /app 

COPY --from=builder /app/packages ./packages 
COPY --from=builder /app/server-toss ./server-toss

RUN pnpm deploy --filter server-toss --prod /prod/server-toss --legacy --ignore-scripts


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV TS_NODE_PROJECT=tsconfig.paths.json
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
adduser --system --uid 1001 nestjs

COPY --from=deploy --chown=nestjs:nodejs /prod/server-toss ./
COPY --chown=nestjs:nodejs server-toss/certs ./certs
COPY --chown=nestjs:nodejs server-toss/data ./data
  
USER nestjs
  
EXPOSE 3000
  
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]