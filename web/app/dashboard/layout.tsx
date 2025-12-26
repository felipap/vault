import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/admin-auth"
import { DashboardNav } from "./DashboardNav"

type Props = {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: Props) {
  if (!(await isAuthenticated())) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <DashboardNav />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}

