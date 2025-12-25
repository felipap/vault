"use server"

import { setAuthCookie } from "@/lib/admin-auth"
import { redirect } from "next/navigation"

export async function login(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const passphrase = formData.get("passphrase") as string

  if (!passphrase) {
    return { error: "Passphrase required" }
  }

  const success = await setAuthCookie(passphrase)
  if (!success) {
    return { error: "Invalid passphrase" }
  }

  redirect("/dashboard")
}
