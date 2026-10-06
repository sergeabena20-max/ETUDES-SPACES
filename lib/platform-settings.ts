import { prisma } from "@/lib/prisma";

export async function getPlatformSetting(key: string) {
  const setting = await prisma.platformSetting.findUnique({ where: { key } });
  if (!setting || !setting.enabled) return null;
  return setting;
}

export async function getPlatformBoolean(key: string, fallback = false) {
  const setting = await getPlatformSetting(key);
  if (!setting || setting.type !== "BOOLEAN") return fallback;
  return setting.value === "true";
}

export async function getPlatformNumber(key: string, fallback = 0) {
  const setting = await getPlatformSetting(key);
  if (!setting || setting.type !== "NUMBER") return fallback;
  const value = Number(setting.value);
  return Number.isFinite(value) ? value : fallback;
}
