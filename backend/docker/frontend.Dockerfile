# ============================================================
# Stage 1: Builder
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ============================================================
# Stage 2: Runner (Nginx)
# ============================================================
FROM nginx:alpine

# Copy built static files from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Configure Nginx to listen on port 3000 instead of 80
RUN sed -i 's/listen\(.*\)80;/listen 3000;/' /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
