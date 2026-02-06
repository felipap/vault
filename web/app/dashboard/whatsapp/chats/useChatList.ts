// Decryption must happen client side, very important.

"use client"

import { useEffect, useState, useCallback } from "react"
import { getWhatsappChats, type WhatsappChat } from "./actions"
import { maybeDecrypt } from "@/lib/encryption"

export type DecryptedChat = WhatsappChat & {
  decryptedChatName: string | null
  decryptedLastMessage: string | null
}

type UseChatListOptions = {
  pageSize?: number
}

export function useChatList(options: UseChatListOptions = {}) {
  const { pageSize = 20 } = options

  const [chats, setChats] = useState<DecryptedChat[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")

  const decryptChats = useCallback(
    async (rawChats: WhatsappChat[]): Promise<DecryptedChat[]> => {
      return Promise.all(
        rawChats.map(async (chat) => ({
          ...chat,
          decryptedChatName: await maybeDecrypt(chat.chatName),
          decryptedLastMessage: await maybeDecrypt(chat.lastMessageText),
        }))
      )
    },
    []
  )

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getWhatsappChats(page, pageSize, search)
      const decrypted = await decryptChats(data.chats)
      setChats(decrypted)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page, pageSize, search, decryptChats])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  return {
    chats,
    loading,
    page,
    totalPages,
    total,
    search,
    setPage,
    setSearch: handleSearchChange,
  }
}
