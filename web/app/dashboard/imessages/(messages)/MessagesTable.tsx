"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpIcon, LockIcon } from "@/ui/icons"
import { Pagination } from "@/ui/Pagination"
import { isEncrypted } from "@/lib/encryption"
import { type Message, type SortBy } from "./actions"
import { type ContactLookup } from "../chats/actions"

export type DecryptedMessage = Message & { decryptedText: string | null }

type Props = {
  messages: DecryptedMessage[]
  contactLookup: ContactLookup
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  sortBy: SortBy
}

const columnHelper = createColumnHelper<DecryptedMessage>()

export function MessagesTable({
  messages,
  contactLookup,
  page,
  totalPages,
  onPageChange,
  sortBy,
}: Props) {
  const router = useRouter()

  const columns = useMemo(
    () => [
      columnHelper.accessor("isFromMe", {
        header: "Direction",
        cell: (info) => <DirectionBadge isFromMe={info.getValue()} />,
      }),
      columnHelper.accessor("contact", {
        header: "Contact",
        cell: (info) => {
          const contact = info.getValue()
          const resolvedName = resolveContactName(contact, contactLookup)
          const hasContactName = resolvedName !== formatContact(contact)

          return (
            <div className="flex items-center gap-2">
              <ServiceIcon service={info.row.original.service} />
              <div className="flex flex-col">
                <span className="text-sm">{resolvedName}</span>
                {hasContactName && (
                  <span className="text-xs text-zinc-500">
                    {formatContact(contact)}
                  </span>
                )}
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor("text", {
        header: "Message",
        cell: (info) => <MessageCell message={info.row.original} />,
      }),
      columnHelper.accessor(sortBy === "syncTime" ? "syncTime" : "date", {
        id: "dateColumn",
        header: sortBy === "syncTime" ? "Received" : "Message Date",
        cell: (info) => <DateCell message={info.row.original} sortBy={sortBy} />,
      }),
    ],
    [sortBy, contactLookup]
  )

  const table = useReactTable({
    data: messages,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
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
                onClick={() => router.push(`/dashboard/imessages/${row.id}`)}
                className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-4 py-3 text-sm ${
                      cell.column.id === "text"
                        ? "max-w-[300px] truncate text-zinc-600 dark:text-zinc-400"
                        : ""
                    }`}
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

function DateCell({ message, sortBy }: { message: DecryptedMessage; sortBy: SortBy }) {
  const primaryDate = sortBy === "syncTime" ? message.syncTime : message.date
  const secondaryDate = sortBy === "syncTime" ? message.date : message.syncTime
  const secondaryLabel = sortBy === "syncTime" ? "sent" : "received"

  return (
    <div className="flex flex-col">
      <span className="text-zinc-700 dark:text-zinc-300">
        {primaryDate ? new Date(primaryDate).toLocaleString() : "—"}
      </span>
      {secondaryDate && (
        <span className="text-xs text-zinc-400">
          {secondaryLabel}: {new Date(secondaryDate).toLocaleString()}
        </span>
      )}
    </div>
  )
}

function MessageCell({ message }: { message: DecryptedMessage }) {
  const isMessageEncrypted = isEncrypted(message.text)
  const displayText = message.decryptedText

  if (displayText) {
    return (
      <span className="flex items-center gap-1.5">
        {isMessageEncrypted && (
          <span className="text-green-500" title="Decrypted">
            <LockIcon size={12} />
          </span>
        )}
        {displayText}
      </span>
    )
  }

  if (isMessageEncrypted) {
    return (
      <span className="flex items-center gap-1.5 italic text-amber-500">
        <LockIcon size={12} />
        Encrypted - enter key to decrypt
      </span>
    )
  }

  return (
    <span className="italic text-zinc-400">
      {message.hasAttachments ? "📎 Attachment" : "No content"}
    </span>
  )
}

function DirectionBadge({ isFromMe }: { isFromMe: boolean }) {
  if (isFromMe) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <ArrowUpIcon />
        Sent
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
      <ArrowDownIcon />
      Received
    </span>
  )
}

function ServiceIcon({ service }: { service: string }) {
  const isIMessage = service === "iMessage"

  return (
    <div
      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
        isIMessage ? "bg-blue-500 text-white" : "bg-green-500 text-white"
      }`}
      title={service}
    >
      {isIMessage ? "i" : "S"}
    </div>
  )
}

function resolveContactName(contact: string, contactLookup: ContactLookup): string {
  // Try lookup by email (lowercase)
  if (contact.includes("@")) {
    const name = contactLookup[contact.toLowerCase().trim()]
    if (name) {
      return name
    }
    return contact
  }

  // Try lookup by normalized phone number
  const normalizedPhone = contact.replace(/\D/g, "")
  const name = contactLookup[normalizedPhone]
  if (name) {
    return name
  }

  // Fall back to formatted contact
  return formatContact(contact)
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
