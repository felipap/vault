// Decryption must happen client side, very important.

"use client"

import { useEffect, useState, useCallback } from "react"
import { getWhatsappChats, type WhatsappChat } from "./actions"
import { decryptText, isEncrypted, getEncryptionKey } from "@/lib/encryption"

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
      const encryptionKey = getEncryptionKey()
      return Promise.all(
        rawChats.map(async (chat) => {
          let decryptedChatName: string | null = chat.chatName
          let decryptedLastMessage: string | null = chat.lastMessageText

          if (encryptionKey) {
            if (chat.chatName && isEncrypted(chat.chatName)) {
              decryptedChatName = await decryptText(
                chat.chatName,
                encryptionKey
              )
            }
            if (chat.lastMessageText && isEncrypted(chat.lastMessageText)) {
              decryptedLastMessage = await decryptText(
                chat.lastMessageText,
                encryptionKey
              )
            }
          } else {
            if (chat.chatName && isEncrypted(chat.chatName)) {
              decryptedChatName = null
            }
            if (chat.lastMessageText && isEncrypted(chat.lastMessageText)) {
              decryptedLastMessage = null
            }
          }

          return { ...chat, decryptedChatName, decryptedLastMessage }
        })
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

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

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
