# ─── شركة ديما الحياة - نظام إدارة التوصيل ───
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# ─── Production stage ───
FROM node:20-alpine

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY server.js server-driver.js server-employee.js ./
COPY database ./database
COPY public ./public
COPY driver-web ./driver-web
COPY employee-web ./employee-web
COPY services ./services
COPY fonts ./fonts

RUN mkdir -p data && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000 3001 3002

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=5 \
    CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
