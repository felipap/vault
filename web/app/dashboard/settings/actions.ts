"use server"

import {
  createAccessToken,
  listAccessTokens,
  revokeAccessToken,
} from "@/lib/access-tokens"
import { isAuthenticated } from "@/lib/admin-auth"

export async function getAccessTokens() {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const tokens = await listAccessTokens()
  return tokens.map((t) => ({
    id: t.id,
    name: t.name,
    tokenPrefix: t.tokenPrefix,
    expiresAt: t.expiresAt?.toISOString() ?? null,
    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }))
}

export async function createToken(name: string, expiresInDays?: number) {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : undefined

  const { token, record } = await createAccessToken(name, expiresAt)

  return {
    token,
    id: record.id,
    name: record.name,
    tokenPrefix: record.tokenPrefix,
    expiresAt: record.expiresAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  }
}

export async function revokeToken(id: string) {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const revoked = await revokeAccessToken(id)
  if (!revoked) {
    throw new Error("Token not found")
  }

  return { success: true }
}
