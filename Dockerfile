# ─── شركة ديما الحياة - نظام إدارة التوصيل ───
# Build stage
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# ─── Production stage ───
FROM node:20-slim

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates && rm -rf /var/lib/apt/lists/* \
    && groupadd -g 1001 nodejs && useradd -r -u 1001 -g nodejs nodejs

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

CMD ["node", "server.js"]
