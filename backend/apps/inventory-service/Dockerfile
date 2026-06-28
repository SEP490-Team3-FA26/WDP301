FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the inventory-service
RUN npx nest build inventory-service

FROM node:20-alpine

WORKDIR /app

# Copy built files and dependencies from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Start the microservice
CMD ["node", "dist/apps/inventory-service/main.js"]
