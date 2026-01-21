import type { Metadata } from "next"
import { IMessagesNav } from "./IMessagesNav"

export const metadata: Metadata = {
  title: "iMessages",
}

interface Props {
  children: React.ReactNode
}

export default function MessagesLayout({ children }: Props) {
  return (
    <div>
      <IMessagesNav />
      {children}
    </div>
  )
}
