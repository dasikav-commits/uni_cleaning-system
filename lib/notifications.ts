import type { NotificationEvent, Prisma, PrismaClient, UserRole } from "@/app/generated/prisma/client";
import type { EmailMessage } from "@/lib/email";

export type NotificationRecipient = { id: string; email: string; name: string };

export type NotificationInput = {
  event: NotificationEvent;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  /** App path for the "Open" link in the e-mail. */
  link?: string;
  /** Unique per event occurrence; the recipient id is appended. */
  dedupeKey: string;
  metadata?: Prisma.InputJsonValue;
};

export class NotificationError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "NotificationError";
    this.code = code;
    this.status = status;
  }
}

type NotificationDb = Pick<PrismaClient, "notification">;

/**
 * Creates one in-app notification per recipient (inside the caller's
 * transaction) and returns the matching e-mails, which the route handler
 * sends after the transaction has committed (see queueEmails).
 */
export async function notifyUsers(
  db: NotificationDb,
  recipients: readonly NotificationRecipient[],
  input: NotificationInput,
): Promise<EmailMessage[]> {
  const unique = [...new Map(recipients.map((recipient) => [recipient.id, recipient])).values()];
  if (!unique.length) return [];

  await db.notification.createMany({
    data: unique.map((recipient) => ({
      recipientUserId: recipient.id,
      event: input.event,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      dedupeKey: `${input.dedupeKey}:${recipient.id}`,
      metadata: input.metadata ?? ({ link: input.link ?? null } as Prisma.InputJsonValue),
    })),
    skipDuplicates: true,
  });

  return unique.map((recipient) => ({
    to: recipient.email,
    subject: input.title,
    text: `Dear ${recipient.name},\n\n${input.message}`,
    link: input.link,
  }));
}

export async function activeUsersWithRole(db: Pick<PrismaClient, "user">, role: UserRole): Promise<NotificationRecipient[]> {
  return db.user.findMany({ where: { role, active: true }, select: { id: true, email: true, name: true } });
}

type Actor = { id: string };

export async function listNotifications(db: NotificationDb, actor: Actor, filter: "all" | "read" | "unread" = "all") {
  const readAt = filter === "unread" ? null : filter === "read" ? { not: null } : undefined;
  return db.notification.findMany({
    where: { recipientUserId: actor.id, ...(readAt !== undefined ? { readAt } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, event: true, title: true, message: true, entityType: true, entityId: true, readAt: true, createdAt: true, metadata: true },
  });
}

export async function unreadNotificationCount(db: NotificationDb, actor: Actor) {
  return db.notification.count({ where: { recipientUserId: actor.id, readAt: null } });
}

export async function markNotificationRead(db: NotificationDb, actor: Actor, id: string) {
  const result = await db.notification.updateMany({ where: { id, recipientUserId: actor.id }, data: { readAt: new Date() } });
  if (!result.count) throw new NotificationError("NOT_FOUND", "Notification not found.", 404);
  return { success: true };
}

export async function markAllNotificationsRead(db: NotificationDb, actor: Actor) {
  const result = await db.notification.updateMany({ where: { recipientUserId: actor.id, readAt: null }, data: { readAt: new Date() } });
  return { updated: result.count };
}

/** Link stored in the notification metadata, if any. */
export function notificationLink(metadata: unknown) {
  if (metadata && typeof metadata === "object" && "link" in metadata) {
    const link = (metadata as { link?: unknown }).link;
    if (typeof link === "string" && link.startsWith("/") && !link.startsWith("//") && !link.includes("\\")) return link;
  }
  return null;
}
