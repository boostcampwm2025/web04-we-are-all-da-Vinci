FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY server-toss/package.json ./server-toss/
COPY packages/toss-shared ./packages/toss-shared/
COPY packages/similarity ./packages/similarity/
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN cd /app/packages/similarity && npx tsc
RUN cd /app/packages/toss-shared && npx tsc
COPY server-toss ./server-toss
WORKDIR /app/server-toss
RUN npx tsc -p tsconfig.build.json

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml /app/.npmrc ./
COPY --from=builder /app/server-toss/package.json ./server-toss/
COPY --from=builder /app/packages/toss-shared ./packages/toss-shared/
COPY --from=builder /app/packages/similarity ./packages/similarity/
RUN pnpm install --frozen-lockfile --ignore-scripts --prod
COPY --from=builder --chown=nestjs:nodejs /app/server-toss/dist ./server-toss/dist
COPY --from=builder --chown=nestjs:nodejs /app/server-toss/tsconfig.paths.json ./server-toss/tsconfig.paths.json
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
WORKDIR /app/server-toss
ENV PORT=3000
ENV TS_NODE_PROJECT=tsconfig.paths.json
CMD ["node", "-r", "tsconfig-paths/register", "dist/main.js"]
