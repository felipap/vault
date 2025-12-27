import { isAuthenticated } from "@/lib/admin-auth"
import { redirect } from "next/navigation"

export default async function Page() {
  if (await isAuthenticated()) {
    redirect("/dashboard")
  }

  return redirect("/sign-in")
}
