import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contacts",
}

interface Props {
  children: React.ReactNode
}

export default function ContactsLayout({ children }: Props) {
  return children
}
