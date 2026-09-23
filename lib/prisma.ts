import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function normalizeDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  try {
    const parsed = new URL(url);
    // Supabase Transaction Pooler (port 6543) uses transaction pooling.
    // Prisma must disable prepared statements for this connection mode.
    if (parsed.port === "6543" && !parsed.searchParams.has("pgbouncer")) {
      parsed.searchParams.set("pgbouncer", "true");
      process.env.DATABASE_URL = parsed.toString();
    }
  } catch {
    // Let Prisma report the original DATABASE_URL validation error.
  }
}

normalizeDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
