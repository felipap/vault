"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { twMerge } from "tailwind-merge"
import { Button } from "@/ui/Button"
import { TrashIcon } from "@/ui/icons"
import { deleteAllIMessages } from "./(messages)/actions"

const subTabs = [
  { href: "/dashboard/imessages", label: "Messages" },
  { href: "/dashboard/imessages/chats", label: "Chats" },
] as const

export function IMessagesNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleDeleteAll() {
    const confirmed = confirm(
      "Delete all iMessages data? This will permanently delete all iMessages and attachments from the database."
    )
    if (!confirmed) {
      return
    }
    await deleteAllIMessages()
    router.refresh()
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">iMessages</h1>
        <Button
          variant="danger"
          size="sm"
          icon={<TrashIcon size={12} />}
          onClick={handleDeleteAll}
        >
          Delete All
        </Button>
      </div>

      <div className="mb-6 flex gap-2">
        {subTabs.map((tab) => {
          const isActive =
            tab.href === "/dashboard/imessages"
              ? pathname === "/dashboard/imessages"
              : pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={twMerge(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </>
  )
}
