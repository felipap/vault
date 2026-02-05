"use client"

import { useEffect, useState, useCallback } from "react"
import { getWhatsappMessages, type WhatsappMessage, type SortBy } from "./actions"
import { getContactLookup, type ContactLookup } from "../chats/actions"
import { decryptText, isEncrypted, getEncryptionKey } from "@/lib/encryption"
import { MessagesTable, type DecryptedMessage } from "./MessagesTable"

export default function Page() {
  const [messages, setMessages] = useState<DecryptedMessage[]>([])
  const [contactLookup, setContactLookup] = useState<ContactLookup>({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState<SortBy>("timestamp")

  const decryptMessages = useCallback(
    async (msgs: WhatsappMessage[]): Promise<DecryptedMessage[]> => {
      const encryptionKey = getEncryptionKey()
      return Promise.all(
        msgs.map(async (msg) => {
          if (!msg.text || !isEncrypted(msg.text)) {
            return { ...msg, decryptedText: msg.text }
          }
          if (!encryptionKey) {
            return { ...msg, decryptedText: null }
          }
          const decrypted = await decryptText(msg.text, encryptionKey)
          return { ...msg, decryptedText: decrypted }
        })
      )
    },
    []
  )

  // Fetch contacts once on mount
  useEffect(() => {
    getContactLookup().then(setContactLookup)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getWhatsappMessages(page, 20, sortBy)
      const decrypted = await decryptMessages(data.messages)
      setMessages(decrypted)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page, sortBy, decryptMessages])

  function handleSortChange(newSortBy: SortBy) {
    setSortBy(newSortBy)
    setPage(1)
  }

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
        <SortSelector sortBy={sortBy} onChange={handleSortChange} />
      </div>
      <MessagesTable
        messages={messages}
        contactLookup={contactLookup}
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
