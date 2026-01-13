"use client"

import { GroupIcon, LockIcon } from "@/ui/icons"
import { Pagination } from "@/ui/Pagination"
import { type Chat } from "./actions"
import { isEncrypted } from "@/lib/encryption"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

export type DecryptedChat = Chat & { decryptedLastMessage: string | null }

const columnHelper = createColumnHelper<DecryptedChat>()

const columns = [
  columnHelper.display({
    id: "contact",
    header: "Contact",
    cell: ({ row }) => {
      const chat = row.original
      const displayName = chat.isGroupChat
        ? `Group (${chat.participantCount})`
        : formatContact(chat.participants[0] || chat.chatId)

      return (
        <div className="flex items-center gap-2">
          <ContactAvatar name={displayName} isGroup={chat.isGroupChat} />
          <span className="text-sm font-medium">{displayName}</span>
        </div>
      )
    },
  }),
  columnHelper.display({
    id: "lastMessage",
    header: "Last Message",
    cell: ({ row }) => {
      const chat = row.original
      const isChatEncrypted = isEncrypted(chat.lastMessageText)
      const displayText = chat.decryptedLastMessage

      return (
        <div className="max-w-[200px] truncate text-sm text-zinc-600 dark:text-zinc-400">
          {displayText ? (
            <>
              {chat.lastMessageFromMe && (
                <span className="text-zinc-400 dark:text-zinc-500">You: </span>
              )}
              {isChatEncrypted && (
                <span
                  className="mr-0.5 inline-flex items-center text-green-500"
                  title="Decrypted"
                >
                  <LockIcon size={10} />
                </span>
              )}
              {displayText}
            </>
          ) : isChatEncrypted ? (
            <span className="flex items-center gap-1 italic text-amber-500">
              <LockIcon size={10} />
              Encrypted
            </span>
          ) : (
            "No message"
          )}
        </div>
      )
    },
  }),
  columnHelper.accessor("messageCount", {
    header: "Messages",
    cell: (info) => (
      <span className="tabular-nums">{info.getValue().toLocaleString()}</span>
    ),
  }),
  columnHelper.accessor("lastMessageDate", {
    header: "Date",
    cell: (info) => {
      const date = info.getValue()
      return (
        <span className="text-zinc-500">
          {date ? formatRelativeDate(new Date(date)) : "—"}
        </span>
      )
    },
  }),
]

type Props = {
  chats: DecryptedChat[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function ChatsTable({ chats, page, totalPages, onPageChange }: Props) {
  const table = useReactTable({
    data: chats,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-medium text-zinc-500"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </>
  )
}

function ContactAvatar({ name, isGroup }: { name: string; isGroup: boolean }) {
  const initial = name.charAt(0).toUpperCase()
  const bgColor = isGroup
    ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
    : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"

  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${bgColor}`}
    >
      {isGroup ? <GroupIcon /> : initial}
    </div>
  )
}

function formatContact(contact: string): string {
  if (contact.includes("@")) {
    return contact
  }
  if (contact.startsWith("+")) {
    const digits = contact.slice(1)
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    return contact
  }
  return contact
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  }
  if (diffDays === 1) {
    return "Yesterday"
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" })
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}
