FROM node:18-alpine

WORKDIR /app

# Install curl for health checks and debugging
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S village -u 1001

# Create logs directory and set permissions
RUN mkdir -p logs && chown -R village:nodejs /app

USER village

EXPOSE 3001

# Health check that also validates Moto connection
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Production command
CMD ["npm", "start"]
