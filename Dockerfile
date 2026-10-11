FROM node:26.11.1-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:26.11.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    LINGUALOCAL_CONTAINER=1 \
    LINGUALOCAL_DATA_DIR=/app/data \
    LINGUALOCAL_MEDIA_DIR=/app/data/media
RUN addgroup -S -g 1001 lingualocal && \
    adduser -S -u 1001 -G lingualocal lingualocal && \
    mkdir -p /app/data/media && chown -R lingualocal:lingualocal /app
COPY --from=builder --chown=lingualocal:lingualocal /app/.next/standalone ./
USER lingualocal
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
