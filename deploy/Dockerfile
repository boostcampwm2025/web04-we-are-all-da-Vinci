FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY server/package.json ./server/
COPY packages/shared ./packages/shared/
RUN pnpm install --frozen-lockfile --filter server...

FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/packages ./packages
COPY server ./server
WORKDIR /app/server
RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/server/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/server/data ./data
COPY --from=builder --chown=nestjs:nodejs /app/server/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/server/package.json ./package.json
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
CMD ["node", "-r", "tsconfig-paths/register", "dist/main"]
