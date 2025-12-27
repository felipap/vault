"use client"

import { ArrowDownIcon, ArrowUpIcon, GroupIcon } from "@/ui/icons"
import { Pagination } from "@/ui/Pagination"
import { useEffect, useState } from "react"
import { twMerge } from "tailwind-merge"
import { getMessages, type Message } from "./actions"
import { getChats, type Chat } from "../chats/actions"

type TabType = "messages" | "chats"

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabType>("messages")

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Messages</h1>
      </div>

      <div className="mb-6 flex gap-2">
        <TabButton
          active={activeTab === "messages"}
          onClick={() => setActiveTab("messages")}
        >
          iMessages
        </TabButton>
        <TabButton
          active={activeTab === "chats"}
          onClick={() => setActiveTab("chats")}
        >
          Chats
        </TabButton>
      </div>

      {activeTab === "messages" ? <MessagesView /> : <ChatsView />}
    </div>
  )
}

type TabButtonProps = {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
      )}
    >
      {children}
    </button>
  )
}

function MessagesView() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getMessages(page)
      setMessages(data.messages)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page])

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
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                Direction
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                Message
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {messages.map((message) => (
              <MessageRow key={message.id} message={message} />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}

function ChatsView() {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getChats(page)
      setChats(data.chats)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page])

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
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                Last Message
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                Messages
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {chats.map((chat) => (
              <ChatRow key={chat.chatId} chat={chat} />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}

function MessageRow({ message }: { message: Message }) {
  return (
    <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <td className="px-4 py-3">
        <DirectionBadge isFromMe={message.isFromMe} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ServiceIcon service={message.service} />
          <span className="text-sm">{formatContact(message.contact)}</span>
        </div>
      </td>
      <td className="max-w-[300px] truncate px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
        {message.text || (
          <span className="italic text-zinc-400">
            {message.hasAttachments ? "📎 Attachment" : "No content"}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-500">
        {message.date ? new Date(message.date).toLocaleString() : "—"}
      </td>
    </tr>
  )
}

function ChatRow({ chat }: { chat: Chat }) {
  const displayName = chat.isGroupChat
    ? `Group (${chat.participantCount})`
    : formatContact(chat.participants[0] || chat.chatId)

  return (
    <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ContactAvatar name={displayName} isGroup={chat.isGroupChat} />
          <span className="text-sm font-medium">{displayName}</span>
        </div>
      </td>
      <td className="max-w-[200px] truncate px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
        {chat.lastMessageFromMe && (
          <span className="text-zinc-400 dark:text-zinc-500">You: </span>
        )}
        {chat.lastMessageText || "No message"}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums">
        {chat.messageCount.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-500">
        {chat.lastMessageDate
          ? formatRelativeDate(new Date(chat.lastMessageDate))
          : "—"}
      </td>
    </tr>
  )
}

function DirectionBadge({ isFromMe }: { isFromMe: boolean }) {
  if (isFromMe) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <ArrowUpIcon />
        Sent
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
      <ArrowDownIcon />
      Received
    </span>
  )
}

function ServiceIcon({ service }: { service: string }) {
  const isIMessage = service === "iMessage"

  return (
    <div
      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
        isIMessage ? "bg-blue-500 text-white" : "bg-green-500 text-white"
      }`}
      title={service}
    >
      {isIMessage ? "i" : "S"}
    </div>
  )
}

function ContactAvatar({ name, isGroup }: { name: string; isGroup: boolean }) {
  const initial = name.charAt(0).toUpperCase()
  const bgColor = isGroup
    ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
    : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"

  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${bgColor}`}
    >
      {isGroup ? <GroupIcon /> : initial}
    </div>
  )
}

function formatContact(contact: string): string {
  if (contact.includes("@")) {
    return contact
  }
  if (contact.startsWith("+")) {
    const digits = contact.slice(1)
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    return contact
  }
  return contact
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  }
  if (diffDays === 1) {
    return "Yesterday"
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" })
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}
