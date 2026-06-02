# ============================================================
# Stage 1: Dependencies
# ============================================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --legacy-peer-deps

# ============================================================
# Stage 2: Builder
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY backend/ .

RUN npm run build

# ============================================================
# Stage 3: Runner (Production)
# ============================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY backend/package.json ./

USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["npx", "concurrently", "node dist/apps/api-gateway/src/main.js", "node dist/apps/auth-service/src/main.js"]
