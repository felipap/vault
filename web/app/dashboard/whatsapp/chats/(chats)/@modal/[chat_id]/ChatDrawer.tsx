"use client"

import { Drawer } from "@/ui/Drawer"
import { type WhatsappChatWithMessages, type ContactLookup } from "../../../actions"
import { Chat } from "./Chat"
import { resolveContactName, formatPhone } from "./utils"

type Props = {
  chat: WhatsappChatWithMessages
  contactLookup: ContactLookup
}

export function ChatDrawer({ chat, contactLookup }: Props) {
  const chatTitle = getChatTitle(chat, contactLookup)

  return (
    <Drawer title={chatTitle}>
      <div className="space-y-4">
        <ChatInfo chat={chat} contactLookup={contactLookup} />
        <Chat
          chatId={chat.chatId}
          initialMessages={chat.messages}
          totalCount={chat.messageCount}
          contactLookup={contactLookup}
        />
      </div>
    </Drawer>
  )
}

function ChatInfo({
  chat,
  contactLookup,
}: {
  chat: WhatsappChatWithMessages
  contactLookup: ContactLookup
}) {
  const isGroup = chat.participantCount > 2

  return (
    <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        <ChatAvatar chat={chat} />
        <div className="min-w-0 flex-1">
          {isGroup ? (
            <>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Group Chat ({chat.participantCount} participants)
              </p>
              <p className="truncate text-xs text-zinc-500">
                {chat.participants
                  .map((p) => resolveContactName(p, contactLookup))
                  .join(", ")}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {resolveContactName(
                  chat.participants[0] || chat.chatId,
                  contactLookup
                )}
              </p>
              <p className="text-xs text-zinc-500">
                {formatPhone(chat.participants[0] || chat.chatId)}
              </p>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-zinc-500">
        <span>{chat.messageCount.toLocaleString()} messages</span>
        {chat.lastMessageDate && (
          <span>
            Last: {new Date(chat.lastMessageDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  )
}

function ChatAvatar({ chat }: { chat: WhatsappChatWithMessages }) {
  const isGroup = chat.participantCount > 2

  if (isGroup) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
        G
      </div>
    )
  }

  const name = chat.participants[0] || "?"
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-medium text-green-600 dark:bg-green-900/30 dark:text-green-400">
      {initial}
    </div>
  )
}

function getChatTitle(
  chat: WhatsappChatWithMessages,
  contactLookup: ContactLookup
): string {
  const isGroup = chat.participantCount > 2
  if (isGroup) {
    return `Group Chat (${chat.participantCount})`
  }
  return resolveContactName(chat.participants[0] || chat.chatId, contactLookup)
}
