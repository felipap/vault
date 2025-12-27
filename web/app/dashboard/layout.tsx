import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/admin-auth"
import { isDashboardIpWhitelistEnabled } from "@/lib/ip-whitelist"
import { DashboardNav } from "./DashboardNav"

type Props = {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: Props) {
  if (!(await isAuthenticated())) {
    redirect("/")
  }

  const isWhitelistEnabled = isDashboardIpWhitelistEnabled()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <DashboardNav />
      {!isWhitelistEnabled && <IpWhitelistWarningBanner />}
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}

function IpWhitelistWarningBanner() {
  return (
    <div className="bg-red-600 px-4 py-3 text-center text-white">
      <span className="font-medium">Security Warning:</span> Dashboard IP
      whitelisting is not configured. Set{" "}
      <code className="rounded bg-red-700 px-1.5 py-0.5 font-mono text-sm">
        DASHBOARD_IP_WHITELIST
      </code>{" "}
      in your environment variables to restrict access.
    </div>
  )
}

