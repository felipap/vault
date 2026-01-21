import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Locations",
}

interface Props {
  children: React.ReactNode
}

export default function LocationsLayout({ children }: Props) {
  return children
}
