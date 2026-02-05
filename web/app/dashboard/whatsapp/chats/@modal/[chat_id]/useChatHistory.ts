"use client"

import { useEffect, useState, useTransition } from "react"
import { decryptText, isEncrypted, getEncryptionKey } from "@/lib/encryption"
import {
  type WhatsappChatMessage,
  getWhatsappChatMessages,
} from "../../actions"

export type DecryptedMessage = WhatsappChatMessage & {
  decryptedText: string | null
  decryptedSenderName: string | null
}

type UseChatHistoryOptions = {
  chatId: string
  initialMessages: WhatsappChatMessage[]
  totalCount: number
}

export function useChatHistory({
  chatId,
  initialMessages,
  totalCount,
}: UseChatHistoryOptions) {
  const [messages, setMessages] =
    useState<WhatsappChatMessage[]>(initialMessages)
  const [decryptedMessages, setDecryptedMessages] = useState<
    DecryptedMessage[]
  >([])
  const [hasMore, setHasMore] = useState(initialMessages.length < totalCount)
  const [isPending, startTransition] = useTransition()

  const remainingCount = totalCount - messages.length

  useEffect(() => {
    async function decryptMessages() {
      const key = getEncryptionKey()
      const decrypted = await Promise.all(
        messages.map(async (msg) => {
          let decryptedText: string | null = msg.text
          let decryptedSenderName: string | null = msg.senderName

          if (key) {
            if (msg.text && isEncrypted(msg.text)) {
              decryptedText = await decryptText(msg.text, key)
            }
            if (msg.senderName && isEncrypted(msg.senderName)) {
              decryptedSenderName = await decryptText(msg.senderName, key)
            }
          } else {
            if (msg.text && isEncrypted(msg.text)) {
              decryptedText = null
            }
            if (msg.senderName && isEncrypted(msg.senderName)) {
              decryptedSenderName = null
            }
          }

          return { ...msg, decryptedText, decryptedSenderName }
        })
      )
      setDecryptedMessages(decrypted)
    }
    decryptMessages()
  }, [messages])

  function loadMore() {
    startTransition(async () => {
      const result = await getWhatsappChatMessages(chatId, messages.length)
      setMessages((prev) => [...prev, ...result.messages])
      setHasMore(result.hasMore)
    })
  }

  return {
    messages: decryptedMessages,
    isLoading: decryptedMessages.length === 0,
    isPending,
    hasMore,
    remainingCount,
    loadMore,
  }
}
