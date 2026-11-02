import { AppShell } from "@/app/_components/app-shell";
import { PageHeader } from "@/app/_components/ui";
import { listNotifications, notificationLink } from "@/lib/notifications";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { NotificationList } from "./notification-list";

export default async function NotificationsPage() {
  const appUser = await requirePageUser();
  const notifications = await listNotifications(prisma, appUser);

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <PageHeader eyebrow="Account" title="Notifications" description="Reports sent to you, returned for correction, accepted or finalized. The same messages are also sent by email." />
        <NotificationList
          initial={notifications.map((notification) => ({
            id: notification.id,
            title: notification.title,
            message: notification.message,
            createdAt: notification.createdAt.toISOString(),
            read: notification.readAt !== null,
            link: notificationLink(notification.metadata),
          }))}
        />
      </div>
    </AppShell>
  );
}
