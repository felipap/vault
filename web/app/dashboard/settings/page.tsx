import type { Metadata } from "next"
import { AccessTokens } from "./AccessTokens"

export const metadata: Metadata = {
  title: "Settings",
}

export default function Page() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <AccessTokens />
    </div>
  )
}
