"use client"

import { useEffect, useState } from "react"
import { Drawer } from "@/ui/Drawer"
import { LockIcon } from "@/ui/icons"
import {
  decryptText,
  isEncrypted,
  getEncryptionKey,
} from "@/lib/encryption"
import { type WhatsappMessageDetail } from "../../actions"

type Props = {
  message: WhatsappMessageDetail
}

export function MessageDrawer({ message }: Props) {
  const [decryptedText, setDecryptedText] = useState<string | null>(null)

  useEffect(() => {
    async function decrypt() {
      if (!message.text || !isEncrypted(message.text)) {
        setDecryptedText(message.text)
        return
      }
      const key = getEncryptionKey()
      if (!key) {
        setDecryptedText(null)
        return
      }
      const decrypted = await decryptText(message.text, key)
      setDecryptedText(decrypted)
    }
    decrypt()
  }, [message.text])

  const displayData = {
    ...message,
    decryptedText,
    isTextEncrypted: message.text ? isEncrypted(message.text) : false,
  }

  return (
    <Drawer title="Message Details">
      <div className="space-y-4">
        <InfoRow
          label="Sender"
          value={message.senderName || message.sender}
        />
        {message.senderName && (
          <InfoRow label="Phone" value={message.sender} />
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
            {decryptedText ? (
              <p className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                {displayData.isTextEncrypted && (
                  <span className="text-green-500" title="Decrypted">
                    <LockIcon size={14} />
                  </span>
                )}
                {decryptedText}
              </p>
            ) : displayData.isTextEncrypted ? (
              <p className="flex items-center gap-2 text-sm italic text-amber-500">
                <LockIcon size={14} />
                Encrypted - enter key to decrypt
              </p>
            ) : (
              <p className="text-sm italic text-zinc-400">No content</p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <label className="mb-2 block text-sm font-medium text-zinc-500">
          Raw JSON
        </label>
        <pre className="whitespace-pre-wrap break-all rounded-lg bg-zinc-50 p-4 font-mono text-sm text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
          {JSON.stringify(displayData, null, 2)}
        </pre>
      </div>
    </Drawer>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-500">
        {label}
      </label>
      <p className="text-sm text-zinc-800 dark:text-zinc-200">{value}</p>
    </div>
  )
}
