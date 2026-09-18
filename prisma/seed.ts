import { PrismaClient, UserType, PlanCode } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    ["users.read","Consulter les utilisateurs"],["users.update","Modifier les utilisateurs"],["users.delete","Supprimer les utilisateurs"],
    ["admins.create","Créer des administrateurs"],["admins.read","Consulter les administrateurs"],["admins.update","Modifier les administrateurs"],["admins.delete","Désactiver les administrateurs"],
    ["courses.create","Créer des cours"],["courses.read","Consulter les cours"],["courses.update","Modifier les cours"],["courses.delete","Supprimer les cours"],
    ["exams.create","Créer des épreuves"],["exams.read","Consulter les épreuves"],["exams.update","Modifier les épreuves"],["exams.delete","Supprimer les épreuves"],
    ["subjects.manage","Gérer les matières"],["schools.manage","Gérer les établissements"],["analytics.read","Consulter les analytics"],["settings.manage","Gérer les paramètres"],
    ["payments.read","Consulter les paiements"],["payments.manage","Gérer les paiements"]
  ];
  for (const [key, description] of permissions) await prisma.permission.upsert({ where: { key }, update: { description }, create: { key, description } });
  const superRole = await prisma.role.upsert({ where: { name: "SUPER_ADMIN" }, update: {}, create: { name: "SUPER_ADMIN" } });
  const all = await prisma.permission.findMany();
  for (const permission of all) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: superRole.id, permissionId: permission.id } }, update: {}, create: { roleId: superRole.id, permissionId: permission.id } });

  await prisma.plan.upsert({ where: { code: PlanCode.FREE }, update: {}, create: { code: PlanCode.FREE, name: "Gratuit", description: "Accès aux contenus gratuits." } });
  await prisma.plan.upsert({ where: { code: PlanCode.PREMIUM }, update: {}, create: { code: PlanCode.PREMIUM, name: "Premium", description: "Architecture réservée aux fonctionnalités futures." } });

  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    if (process.env.NODE_ENV === "production") throw new Error("SUPER_ADMIN_EMAIL et SUPER_ADMIN_PASSWORD sont requis.");
    console.log("Seed: Super Admin non créé (variables d'environnement absentes).");
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({ data: { firstName: "Super", lastName: "Admin", email, passwordHash: await hashPassword(password), type: UserType.SUPER_ADMIN } });
    console.log("Seed: Super Admin créé.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());