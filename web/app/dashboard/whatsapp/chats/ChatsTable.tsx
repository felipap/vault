"use client"

import { isEncrypted } from "@/lib/encryption"
import { ContactAvatar } from "@/ui/ContactAvatar"
import { LockIcon } from "@/ui/icons"
import { Pagination } from "@/ui/Pagination"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { type WhatsappChat } from "./actions"

export type DecryptedChat = WhatsappChat & {
  decryptedChatName: string | null
  decryptedLastMessage: string | null
}

const columnHelper = createColumnHelper<DecryptedChat>()

const columns = [
  columnHelper.display({
    id: "chat",
    header: "Chat",
    size: 300,
    cell: ({ row }) => {
      const chat = row.original
      const isGroup = chat.participantCount > 2
      const displayName = chat.decryptedChatName || chat.chatId

      return (
        <div className="flex min-w-0 items-center gap-2">
          <ContactAvatar name={displayName} isGroup={isGroup} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{displayName}</span>
            <span className="truncate text-xs text-zinc-500">
              {chat.chatId}
            </span>
            {isGroup && (
              <span className="text-xs text-zinc-500">
                {chat.participantCount} participants
              </span>
            )}
          </div>
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
  columnHelper.accessor("messageCount", {
    header: "Count",
    cell: (info) => (
      <span className="tabular-nums">{info.getValue().toLocaleString()}</span>
    ),
  }),
]

type Props = {
  chats: DecryptedChat[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function ChatsTable({ chats, page, totalPages, onPageChange }: Props) {
  const router = useRouter()

  const table = useReactTable({
    data: chats,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.chatId,
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
                    style={{
                      maxWidth: header.column.getSize(),
                      width: header.column.getSize(),
                    }}
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
                onClick={() =>
                  router.push(
                    `/dashboard/whatsapp/chats/${encodeURIComponent(row.original.chatId)}`
                  )
                }
                className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 text-sm"
                    style={{
                      maxWidth: cell.column.getSize(),
                      width: cell.column.getSize(),
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  )
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
