"use client"

import { useEffect, useState, useTransition } from "react"
import { maybeDecrypt } from "@/lib/encryption"
import {
  type WhatsappChatMessage,
  getWhatsappChatMessages,
} from "../../actions"

export type DecryptedMessage = WhatsappChatMessage & {
  decryptedText: string | null
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
      const decrypted = await Promise.all(
        messages.map(async (msg) => ({
          ...msg,
          decryptedText: await maybeDecrypt(msg.text),
        }))
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
