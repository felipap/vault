"use client"

import { type SortBy } from "./actions"
import { useMessageList } from "./useMessageList"
import { MessagesTable } from "./MessagesTable"

export default function Page() {
  const {
    messages,
    loading,
    page,
    totalPages,
    total,
    sortBy,
    setPage,
    setSortBy,
  } = useMessageList()

  if (loading) {
    return <p className="text-zinc-500">Loading...</p>
  }

  if (messages.length === 0) {
    return <p className="text-zinc-500">No WhatsApp messages yet.</p>
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-zinc-500">
          {total.toLocaleString()} total messages
        </span>
        <SortSelector sortBy={sortBy} onChange={setSortBy} />
      </div>
      <MessagesTable
        messages={messages}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        sortBy={sortBy}
      />
    </>
  )
}

function SortSelector({
  sortBy,
  onChange,
}: {
  sortBy: SortBy
  onChange: (sortBy: SortBy) => void
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500">Sort by:</span>
      <select
        value={sortBy}
        onChange={(e) => onChange(e.target.value as SortBy)}
        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
      >
        <option value="syncTime">Time received</option>
        <option value="timestamp">Message date</option>
      </select>
    </div>
  )
}
