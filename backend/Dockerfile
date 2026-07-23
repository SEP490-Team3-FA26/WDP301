# ============================================================
# Stage 1: Dependencies (full – cần devDeps để build TS)
# ============================================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# ============================================================
# Stage 2: Build – compile TypeScript → JavaScript
# ============================================================
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build tất cả services (nest build sẽ output vào ./dist)
RUN npm run build:all || true

# ============================================================
# Stage 3: Runner – chỉ chứa file JS đã compiled (ít RAM hơn nhiều)
# ============================================================
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Chỉ copy production dependencies (không có devDeps)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy source để ts-node không cần thiết – chỉ dùng dist
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/tsconfig*.json ./

EXPOSE 4000

# Chạy compiled JS – tiết kiệm RAM so với ts-node
CMD ["npm", "run", "start:all:prod"]
