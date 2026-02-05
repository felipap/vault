"use client"

import { useEffect, useState, useCallback } from "react"
import { getWhatsappMessages, type WhatsappMessage, type SortBy } from "./actions"
import { decryptText, isEncrypted, getEncryptionKey } from "@/lib/encryption"

export type DecryptedMessage = WhatsappMessage & {
  decryptedText: string | null
  decryptedChatName: string | null
  decryptedSenderName: string | null
}

type UseMessageListOptions = {
  pageSize?: number
  initialSortBy?: SortBy
}

export function useMessageList(options: UseMessageListOptions = {}) {
  const { pageSize = 20, initialSortBy = "timestamp" } = options

  const [messages, setMessages] = useState<DecryptedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState<SortBy>(initialSortBy)

  const decryptMessages = useCallback(
    async (msgs: WhatsappMessage[]): Promise<DecryptedMessage[]> => {
      const encryptionKey = getEncryptionKey()
      return Promise.all(
        msgs.map(async (msg) => {
          const base = {
            ...msg,
            decryptedText: msg.text,
            decryptedChatName: msg.chatName,
            decryptedSenderName: msg.senderName,
          }

          if (!encryptionKey) {
            return {
              ...base,
              decryptedText: isEncrypted(msg.text) ? null : msg.text,
              decryptedChatName: isEncrypted(msg.chatName) ? null : msg.chatName,
              decryptedSenderName: isEncrypted(msg.senderName) ? null : msg.senderName,
            }
          }

          const [decryptedText, decryptedChatName, decryptedSenderName] = await Promise.all([
            msg.text && isEncrypted(msg.text) ? decryptText(msg.text, encryptionKey) : msg.text,
            msg.chatName && isEncrypted(msg.chatName) ? decryptText(msg.chatName, encryptionKey) : msg.chatName,
            msg.senderName && isEncrypted(msg.senderName) ? decryptText(msg.senderName, encryptionKey) : msg.senderName,
          ])

          return {
            ...base,
            decryptedText,
            decryptedChatName,
            decryptedSenderName,
          }
        })
      )
    },
    []
  )

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getWhatsappMessages(page, pageSize, sortBy)
      const decrypted = await decryptMessages(data.messages)
      setMessages(decrypted)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page, pageSize, sortBy, decryptMessages])

  function handleSortChange(newSortBy: SortBy) {
    setSortBy(newSortBy)
    setPage(1)
  }

  return {
    messages,
    loading,
    page,
    totalPages,
    total,
    sortBy,
    setPage,
    setSortBy: handleSortChange,
  }
}
