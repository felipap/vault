import type { Metadata } from "next"
import { WhatsappNav } from "./WhatsappNav"

export const metadata: Metadata = {
  title: "WhatsApp",
}

interface Props {
  children: React.ReactNode
}

export default function WhatsappLayout({ children }: Props) {
  return (
    <div>
      <WhatsappNav />
      {children}
    </div>
  )
}
