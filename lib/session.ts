import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "etudes_session";
const DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + DAYS * 86400000);
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser() {
  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      select: {
        userId: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            type: true,
            isActive: true,
          },
        },
      },
    });

    if (!session) return null;

    if (session.expiresAt < new Date() || !session.user.isActive) {
      await prisma.session.deleteMany({
        where: { userId: session.userId, tokenHash: hashToken(token) },
      });
      store.delete(COOKIE);
      return null;
    }

    return session.user;
  } catch (error) {
    console.error("session_error", error instanceof Error ? error.message : "unknown");
    return null;
  }
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  store.delete(COOKIE);
}
