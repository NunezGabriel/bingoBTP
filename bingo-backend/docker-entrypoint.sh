#!/bin/sh
set -e

echo "[entrypoint] esperando a la base de datos..."

# Reintenta hasta que Postgres acepte conexiones (max ~60s).
i=0
until node -e "
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
p.query('select 1').then(() => p.end()).then(() => process.exit(0)).catch(() => process.exit(1));
" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "[entrypoint] la base de datos no respondio tras 60s" >&2
    exit 1
  fi
  sleep 2
done

echo "[entrypoint] base de datos lista, aplicando migraciones..."
npx prisma migrate deploy

# SEED_ON_START=true carga las preguntas si la tabla esta vacia.
if [ "$SEED_ON_START" = "true" ]; then
  echo "[entrypoint] ejecutando seed de casillas..."
  node prisma/seed.js
fi

echo "[entrypoint] arrancando backend..."
exec "$@"
