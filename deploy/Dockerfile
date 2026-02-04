FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY server/package.json ./server/
COPY packages/shared ./packages/shared/
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY server ./server
WORKDIR /app/server
RUN npm install -g @nestjs/cli && nest build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml /app/.npmrc ./
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/packages/shared ./packages/shared/
RUN pnpm install --frozen-lockfile --ignore-scripts --prod
COPY --from=builder --chown=nestjs:nodejs /app/server/dist ./server/dist
COPY --from=builder --chown=nestjs:nodejs /app/server/data ./server/data
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
WORKDIR /app/server
CMD ["node", "-r", "tsconfig-paths/register", "dist/main"]
