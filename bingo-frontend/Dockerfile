# Frontend Next.js (build standalone)
FROM node:22-alpine AS builder

ENV TZ=America/Lima
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Activa output: "standalone" en next.config.ts (solo para Docker).
ENV DOCKER_BUILD=true

# NEXT_PUBLIC_* se incrusta en el bundle durante el build, no en runtime.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ---- imagen final: solo lo necesario para servir ----
FROM node:22-alpine AS runner

ENV TZ=America/Lima
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# El build standalone deja un server.js con sus dependencias ya resueltas.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
