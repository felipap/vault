"use client"

import { useEffect, useState } from "react"
import { Drawer } from "@/ui/Drawer"
import { maybeDecrypt } from "@/lib/encryption"
import { type WhatsappChatWithMessages } from "../../actions"
import { Chat } from "./Chat"

type Props = {
  chat: WhatsappChatWithMessages
}

export function ChatDrawer({ chat }: Props) {
  const [decryptedChatName, setDecryptedChatName] = useState<string | null>(null)

  useEffect(() => {
    maybeDecrypt(chat.chatName).then(setDecryptedChatName)
  }, [chat.chatName])

  const displayName = decryptedChatName || chat.chatId

  return (
    <Drawer title={displayName}>
      <div className="space-y-4">
        <ChatInfo chat={chat} displayName={displayName} />
        <Chat
          chatId={chat.chatId}
          initialMessages={chat.messages}
          totalCount={chat.messageCount}
        />
      </div>
    </Drawer>
  )
}

function ChatInfo({
  chat,
  displayName,
}: {
  chat: WhatsappChatWithMessages
  displayName: string
}) {
  const isGroup = chat.isGroupChat

  return (
    <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        <ChatAvatar chat={chat} displayName={displayName} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {displayName}
          </p>
          {isGroup && (
            <p className="text-xs text-zinc-500">
              {chat.participantCount} participants
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 space-y-1 text-xs text-zinc-500">
        <div className="flex gap-4">
          <span>{chat.messageCount.toLocaleString()} messages</span>
          {chat.lastMessageDate && (
            <span>
              Last: {new Date(chat.lastMessageDate).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="font-mono text-zinc-400">{chat.chatId}</div>
      </div>
    </div>
  )
}

function ChatAvatar({
  chat,
  displayName,
}: {
  chat: WhatsappChatWithMessages
  displayName: string
}) {
  const isGroup = chat.isGroupChat

  if (isGroup) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
        G
      </div>
    )
  }

  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-medium text-green-600 dark:bg-green-900/30 dark:text-green-400">
      {initial}
    </div>
  )
}
