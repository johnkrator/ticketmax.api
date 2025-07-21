# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /usr/src/app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Change ownership to non-root user
RUN chown -R nestjs:nodejs /usr/src/app
USER nestjs

# Expose port
EXPOSE 3000

# Start in development mode
CMD ["dumb-init", "npm", "run", "start:dev"]

# Build stage
FROM base AS build

# Install all dependencies
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev && npm cache clean --force

# Production stage
FROM base AS production

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from build stage
COPY --from=build /usr/src/app/dist ./dist

# Copy production package.json
COPY package*.json ./

# Create uploads directory
RUN mkdir -p uploads/documents && chown -R nestjs:nodejs uploads

# Change ownership to non-root user
RUN chown -R nestjs:nodejs /usr/src/app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js || exit 1

# Start the application
CMD ["dumb-init", "node", "dist/main"]
