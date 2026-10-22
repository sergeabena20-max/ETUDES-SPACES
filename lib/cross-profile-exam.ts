import { prisma } from "@/lib/prisma";

export async function getCrossProfileExamPrice() {
  const setting = await prisma.platformSetting.findUnique({ where: { key: "CROSS_PROFILE_EXAM_PRICE" } });
  if (!setting?.enabled) return null;
  const price = Number(setting.value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

export function examMatchesUserProfile(
  user: { studentStatus?: string | null; academicLevelId?: string | null; programId?: string | null; academicLevel?: { id: string } | null; program?: { id: string } | null },
  exam: { academicLevelId?: string | null; programId?: string | null },
) {
  if (user.studentStatus === "ETUDIANT") {
    if (!user.academicLevelId || !user.programId) return false;
    return exam.academicLevelId === user.academicLevelId && exam.programId === user.programId;
  }
  if (user.studentStatus === "ELEVE") {
    if (!user.academicLevelId) return false;
    return exam.academicLevelId === user.academicLevelId && !exam.programId;
  }
  return true;
}
