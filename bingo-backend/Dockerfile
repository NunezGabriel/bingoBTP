# Backend Express + Prisma
FROM node:22-alpine

# openssl y libc6-compat: Prisma los necesita en Alpine para el motor de migraciones.
RUN apk add --no-cache openssl libc6-compat

ENV TZ=America/Lima
WORKDIR /app

# Capa de dependencias aparte para aprovechar la cache de Docker.
COPY package.json package-lock.json ./
RUN npm ci

# El cliente de Prisma se genera en build; el esquema cambia poco.
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY src ./src
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001

# El entrypoint espera a Postgres y aplica migraciones antes de arrancar.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/app.js"]
