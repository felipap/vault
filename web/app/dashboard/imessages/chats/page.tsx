"use client"

import { useEffect, useState, useCallback } from "react"
import { getChats, type Chat } from "./actions"
import { decryptText, isEncrypted, getEncryptionKey } from "@/lib/encryption"
import { ChatsTable, type DecryptedChat } from "./ChatsTable"

export default function Page() {
  const [chats, setChats] = useState<DecryptedChat[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const decryptChats = useCallback(
    async (chatList: Chat[]): Promise<DecryptedChat[]> => {
      const encryptionKey = getEncryptionKey()
      return Promise.all(
        chatList.map(async (chat) => {
          if (!chat.lastMessageText || !isEncrypted(chat.lastMessageText)) {
            return { ...chat, decryptedLastMessage: chat.lastMessageText }
          }
          if (!encryptionKey) {
            return { ...chat, decryptedLastMessage: null }
          }
          const decrypted = await decryptText(
            chat.lastMessageText,
            encryptionKey
          )
          return { ...chat, decryptedLastMessage: decrypted }
        })
      )
    },
    []
  )

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getChats(page)
      const decrypted = await decryptChats(data.chats)
      setChats(decrypted)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page, decryptChats])

  if (loading) {
    return <p className="text-zinc-500">Loading...</p>
  }

  if (chats.length === 0) {
    return <p className="text-zinc-500">No chats yet.</p>
  }

  return (
    <>
      <div className="mb-4 text-sm text-zinc-500">
        {total.toLocaleString()} total chats
      </div>
      <ChatsTable
        chats={chats}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </>
  )
}
