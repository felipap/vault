"use client"

import { useEffect, useState, useCallback } from "react"
import { getMessages, type Message } from "./actions"
import { decryptText, isEncrypted, getEncryptionKey } from "@/lib/encryption"
import { MessagesTable, type DecryptedMessage } from "./MessagesTable"

export default function Page() {
  const [messages, setMessages] = useState<DecryptedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const decryptMessages = useCallback(
    async (msgs: Message[]): Promise<DecryptedMessage[]> => {
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

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getMessages(page)
      const decrypted = await decryptMessages(data.messages)
      setMessages(decrypted)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page, decryptMessages])

  if (loading) {
    return <p className="text-zinc-500">Loading...</p>
  }

  if (messages.length === 0) {
    return <p className="text-zinc-500">No messages yet.</p>
  }

  return (
    <>
      <div className="mb-4 text-sm text-zinc-500">
        {total.toLocaleString()} total messages
      </div>
      <MessagesTable
        messages={messages}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </>
  )
}
