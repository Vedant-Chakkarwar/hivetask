# ── Build Stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Compile custom server for production
RUN npx tsc --project tsconfig.server.json || npx tsc server/index.ts --outDir dist/server --esModuleInterop --module commonjs --target es2020 --moduleResolution node --skipLibCheck 2>/dev/null || true

# ── Production Stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL (required by Prisma)
RUN apk add --no-cache openssl

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy Next.js standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy custom server (TypeScript — use tsx in production)
COPY --from=builder /app/server ./server
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Install tsx for running TypeScript server in production
RUN npm install tsx --save-exact

EXPOSE 3000

# Run migrations then start custom server (which includes Socket.IO)
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx server/index.ts"]
