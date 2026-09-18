import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function requireAdmin(permission?: string) {
  const user = await getCurrentUser();
  if (!user || (user.type !== "ADMIN" && user.type !== "SUPER_ADMIN")) return null;
  if (user.type === "SUPER_ADMIN" || !permission) return user;
  const fresh = await prisma.user.findUnique({ where: { id: user.id }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
  const allowed = fresh?.role?.permissions.some((p) => p.permission.key === permission);
  return allowed ? user : null;
}