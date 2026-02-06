import { Decrypted } from "@/ui/Decrypted"

type Message = {
  text: string | null
  hasAttachments?: boolean
}

type Props = {
  message: Message
}

export function MessageCell({ message }: Props) {
  if (!message.text) {
    return (
      <span className="italic text-zinc-400">
        {message.hasAttachments ? "📎 Attachment" : "No content"}
      </span>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="min-w-0 truncate">
        <Decrypted showLockIcon>{message.text}</Decrypted>
      </span>
    </div>
  )
}
