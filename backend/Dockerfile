FROM node:20-alpine AS builder

ARG DB_PROVIDER=postgresql

WORKDIR /app

# Install dependencies first (leverages Docker cache)
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and utility to switch DB
COPY prisma ./prisma/
COPY switch-db.js ./

# Switch Prisma datasource to the target provider and generate client
RUN node switch-db.js $DB_PROVIDER && npx prisma generate

# Copy source code and build it
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    ALGOSPHERE_ENVIRONMENT=production \
    PORT=8000

# Install runtime dependencies (e.g. openssl for Prisma, ca-certificates)
RUN apk add --no-cache openssl ca-certificates

# Copy package metadata and production node_modules
COPY package*.json ./
RUN npm ci --only=production

# Copy generated prisma client and schema
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/switch-db.js ./

# Copy built JavaScript files
COPY --from=builder /app/dist ./dist

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]

