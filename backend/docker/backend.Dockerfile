# ============================================================
# Stage 1: Dependencies
# ============================================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --legacy-peer-deps

# ============================================================
# Stage 2: Runner
# ============================================================
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY backend/ .

EXPOSE 4000

CMD ["npm", "run", "dev:all"]
