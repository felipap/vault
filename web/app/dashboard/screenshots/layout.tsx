import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Screenshots",
}

interface Props {
  children: React.ReactNode
}

export default function ScreenshotsLayout({ children }: Props) {
  return children
}
