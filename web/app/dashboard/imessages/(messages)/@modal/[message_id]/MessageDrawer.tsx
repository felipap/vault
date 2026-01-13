"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CloseIcon, LockIcon } from "@/ui/icons"
import { decryptText, isEncrypted, getEncryptionKey } from "@/lib/encryption"
import { type Message } from "../../actions"

type Props = {
  message: Message
}

export function MessageDrawer({ message }: Props) {
  const router = useRouter()
  const drawerRef = useRef<HTMLDivElement>(null)
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

  const handleClose = () => {
    router.back()
  }

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose()
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    document.addEventListener("mousedown", handleClickOutside)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = ""
    }
  }, [])

  const displayData = {
    ...message,
    decryptedText,
    isTextEncrypted: message.text ? isEncrypted(message.text) : false,
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        ref={drawerRef}
        className="relative w-full max-w-lg animate-slide-in bg-white shadow-2xl dark:bg-zinc-900"
        style={{
          animation: "slideIn 0.2s ease-out",
        }}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Message Details
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="h-[calc(100vh-73px)] overflow-auto p-6">
          <div className="space-y-4">
            <InfoRow label="Contact" value={message.contact} />
            <InfoRow
              label="Direction"
              value={message.isFromMe ? "Sent" : "Received"}
            />
            <InfoRow label="Service" value={message.service} />
            <InfoRow
              label="Date"
              value={message.date ? new Date(message.date).toLocaleString() : "—"}
            />
            <InfoRow
              label="Has Attachments"
              value={message.hasAttachments ? "Yes" : "No"}
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
                  <p className="text-sm italic text-zinc-400">
                    {message.hasAttachments ? "📎 Attachment" : "No content"}
                  </p>
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
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
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
