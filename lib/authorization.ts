import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function requireAdmin(permission?: string) {
  const user = await getCurrentUser();
  if (!user || (user.type !== "ADMIN" && user.type !== "SUPER_ADMIN")) return null;

  if (user.type === "SUPER_ADMIN") return user;
  if (!permission) return user;

  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      role: {
        select: {
          permissions: {
            select: { permission: { select: { key: true } } },
          },
        },
      },
    },
  });

  const allowed = fresh?.role?.permissions.some(
    ({ permission: item }) => item.key === permission,
  );

  return allowed ? user : null;
}

export async function requireSuperAdmin() {
  const user = await getCurrentUser();
  return user?.type === "SUPER_ADMIN" ? user : null;
}
