import webpush from "web-push";
import { prisma } from "@/lib/prisma";

type PublishedExamNotification = {
  examId: string;
  title: string;
  slug: string;
  academicLevelIds: string[];
};

export async function notifyStudentsOfPublishedExam(exam: PublishedExamNotification) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject || !exam.academicLevelIds.length) {
    console.warn("push_notifications_skipped: configuration or class links missing");
    return;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        studentStatus: "ELEVE",
        academicLevelId: { in: exam.academicLevelIds },
        pushSubscriptions: { some: {} },
      },
      select: {
        pushSubscriptions: { select: { id: true, endpoint: true, p256dh: true, auth: true } },
      },
    });

    const payload = JSON.stringify({
      title: "Nouvelle épreuve disponible",
      body: exam.title,
      url: `/exams/${exam.slug}`,
      tag: `exam-${exam.examId}`,
    });

    const subscriptions = users.flatMap((user) => user.pushSubscriptions);
    await Promise.allSettled(subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, payload, { TTL: 86400, urgency: "high" });
      } catch (error) {
        const statusCode = error && typeof error === "object" && "statusCode" in error
          ? Number(error.statusCode)
          : 0;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
        } else {
          console.error("push_delivery_failed", statusCode || "unknown");
        }
      }
    }));
  } catch (error) {
    console.error("push_notification_error", error instanceof Error ? error.message : "unknown");
  }
}
