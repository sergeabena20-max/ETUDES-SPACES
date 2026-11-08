import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

const COOKIE = "etudes_session";
const DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, takeOver = false) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + DAYS * 86400000);
  await prisma.$transaction(async (tx) => {
    // A user may explicitly take over their account after re-entering
    // the correct password. Otherwise only expired/stale sessions are removed.
    const now = new Date();
    const inactiveBefore = new Date(now.getTime() - 2 * 60 * 1000);
    if (takeOver) {
      await tx.session.deleteMany({ where: { userId } });
    } else {
      await tx.session.deleteMany({
        where: {
          userId,
          OR: [
            { expiresAt: { lte: now } },
            { lastSeenAt: { lte: inactiveBefore } },
          ],
        },
      });
    }
    // The unique Session.userId index rejects any second active login.
    await tx.session.create({
      data: { userId, tokenHash: hashToken(token), expiresAt },
    });
  }, { isolationLevel: "Serializable" });

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export const getCurrentUser = cache(async function getCurrentUser() {
  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return null;

    const sessionQuery = () =>
      prisma.session.findUnique({
        where: { tokenHash: hashToken(token) },
        select: {
        userId: true,
        expiresAt: true,
        lastSeenAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            type: true,
            isActive: true,
            mustChangePassword: true,
            studentStatus: true,
            school: { select: { id: true, name: true } },
            academicLevel: { select: { id: true, name: true } },
            program: { select: { id: true, name: true, kind: true } },
          },
        },
      },
      });

    let session: Awaited<ReturnType<typeof sessionQuery>>;
    try {
      session = await sessionQuery();
    } catch (firstError) {
      console.error("session_query_retry", firstError instanceof Error ? firstError.message : "unknown");
      session = await sessionQuery();
    }

    if (!session) return null;

    // A page refresh or a temporarily suspended tab must not invalidate
    // the browser's own session. The heartbeat will reactivate its timestamp.
    if (session.expiresAt < new Date() || !session.user.isActive) {
      await prisma.session.deleteMany({
        where: { userId: session.userId, tokenHash: hashToken(token) },
      });
      // Server Components may read cookies but cannot modify them.
      // The heartbeat Route Handler clears the browser cookie when it detects an expired session.
      return null;
    }

    return session.user;
  } catch (error) {
    console.error("session_error", error instanceof Error ? error.message : "unknown");
    throw error;
  }
});

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  store.delete(COOKIE);
}

/** Refreshes an active browser session. Sessions without a heartbeat for 2 minutes expire. */
export async function refreshSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return false;

  const now = new Date();
  // If this same browser returns after a refresh, sleep, or brief network loss,
  // its valid cookie can resume the session instead of being locked out.
  const refreshed = await prisma.session.updateMany({
    where: {
      tokenHash: hashToken(token),
      expiresAt: { gt: now },
    },
    data: { lastSeenAt: now },
  });

  if (refreshed.count !== 1) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    store.delete(COOKIE);
    return false;
  }
  return true;
}
