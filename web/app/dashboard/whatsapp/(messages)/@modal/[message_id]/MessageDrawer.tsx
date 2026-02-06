"use client"

import { Decrypted } from "@/ui/Decrypted"
import { Drawer } from "@/ui/Drawer"
import { InfoRow } from "@/ui/InfoRow"
import { RawJson } from "@/ui/RawJson"
import { type WhatsappMessageDetail } from "../../actions"

type Props = {
  message: WhatsappMessageDetail
}

export function MessageDrawer({ message }: Props) {
  return (
    <Drawer title="Message Details">
      <div className="space-y-4">
        <InfoRow label="Message ID" value={message.messageId} />
        <InfoRow label="Sender" value={message.senderName ?? message.senderJid ?? ""} />
        {message.senderName && message.senderJid && (
          <InfoRow label="JID" value={message.senderJid} />
        )}
        <InfoRow
          label="Direction"
          value={message.isFromMe ? "Sent" : "Received"}
        />
        <InfoRow label="Chat ID" value={message.chatId} />
        <InfoRow
          label="Date"
          value={new Date(message.timestamp).toLocaleString()}
        />
        <InfoRow
          label="Synced"
          value={new Date(message.syncTime).toLocaleString()}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-500">
            Message
          </label>
          <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
            <Decrypted showLockIcon>{message.text}</Decrypted>
          </div>
        </div>
      </div>
      <RawJson data={message} />
    </Drawer>
  )
}
