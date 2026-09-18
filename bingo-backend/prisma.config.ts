import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    // Solo lo usa `prisma migrate dev` en local; en produccion no hace falta.
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
