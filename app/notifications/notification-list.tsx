"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Item = { id: string; title: string; message: string; createdAt: string; read: boolean; link: string | null };

export function NotificationList({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const unread = items.filter((item) => !item.read).length;

  async function markRead(id: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => undefined);
  }

  if (!items.length) {
    return <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">You have no notifications.</p>;
  }

  return (
    <>
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{unread ? `${unread} unread` : "All read"}</span>
        {unread ? (
          <button
            type="button"
            onClick={async () => {
              setItems((current) => current.map((item) => ({ ...item, read: true })));
              await fetch("/api/notifications", { method: "PATCH" }).catch(() => undefined);
              router.refresh();
            }}
            className="font-semibold text-cyan-700 hover:text-cyan-900"
          >
            Mark all as read
          </button>
        ) : null}
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className={`rounded-3xl border p-5 shadow-sm ${item.read ? "border-slate-200 bg-white" : "border-cyan-200 bg-cyan-50"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm text-slate-700">{item.message}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("en-GB")}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 text-xs font-semibold">
                {item.link ? (
                  <Link href={item.link} onClick={() => void markRead(item.id)} className="rounded-xl bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800">
                    Open
                  </Link>
                ) : null}
                {!item.read ? (
                  <button type="button" onClick={() => void markRead(item.id)} className="text-cyan-700 hover:text-cyan-900">
                    Mark as read
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
