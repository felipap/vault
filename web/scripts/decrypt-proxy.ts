// Decrypt proxy: decrypts API responses so the AI can read plaintext.
// You hold the key; the AI only needs an expirable token when DECRYPT_TOKEN_SECRET is set.
//
// Without token (local dev):
//   ENCRYPTION_KEY=your-key bun scripts/decrypt-proxy.ts
//
// With expirable token (give AI only the token, not the key):
//   ENCRYPTION_KEY=... DECRYPT_TOKEN_SECRET=... bun scripts/decrypt-proxy.ts
//   Issue token: DECRYPT_TOKEN_SECRET=... npx tsx scripts/issue-decrypt-token.ts --expires-in 24h
//   AI calls proxy with header: X-Decrypt-Token: <token>

import { createHmac } from "crypto"
import { createServer, IncomingMessage, ServerResponse } from "http"

const PROXY_PORT = 3001
const TARGET_HOST = process.env.TARGET_HOST || "http://localhost:3030"
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ""
const DECRYPT_TOKEN_SECRET = process.env.DECRYPT_TOKEN_SECRET || ""

if (!ENCRYPTION_KEY) {
  console.error("❌ ENCRYPTION_KEY environment variable is required")
  process.exit(1)
}

const AUD = "contexter-decrypt"

function base64UrlDecode(str: string): Buffer {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  const pad = base64.length % 4
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64
  return Buffer.from(padded, "base64")
}

function verifyDecryptToken(token: string): boolean {
  if (!DECRYPT_TOKEN_SECRET) {
    return true
  }
  if (!token) {
    return false
  }
  const parts = token.split(".")
  if (parts.length !== 3) {
    return false
  }
  const [headerB64, payloadB64, sigB64] = parts
  const signatureInput = `${headerB64}.${payloadB64}`
  const expectedSig = createHmac("sha256", DECRYPT_TOKEN_SECRET)
    .update(signatureInput)
    .digest()
  const expectedB64 = expectedSig
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
  if (sigB64 !== expectedB64) {
    return false
  }
  let payload: { aud?: string; exp?: number }
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"))
  } catch {
    return false
  }
  if (payload.aud !== AUD || typeof payload.exp !== "number") {
    return false
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return false
  }
  return true
}

const ALGORITHM = "AES-GCM"
const KEY_LENGTH = 256
const PBKDF2_ITERATIONS = 100000
const SALT = "contexter-e2e-v1"
const ENCRYPTED_PREFIX = "enc:v1:"

const MAX_DEPTH = 2

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passphraseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  )

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passphraseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["decrypt"]
  )
}

async function decryptText(
  ciphertext: string,
  passphrase: string
): Promise<string | null> {
  if (!ciphertext || !passphrase) {
    return ciphertext
  }

  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    return ciphertext
  }

  const parts = ciphertext.slice(ENCRYPTED_PREFIX.length).split(":")
  if (parts.length !== 3) {
    return null
  }

  const [ivB64, authTagB64, encryptedB64] = parts

  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0))
  const authTag = Uint8Array.from(atob(authTagB64), (c) => c.charCodeAt(0))
  const encrypted = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0))

  const combined = new Uint8Array(encrypted.length + authTag.length)
  combined.set(encrypted)
  combined.set(authTag, encrypted.length)

  const key = await deriveKey(passphrase)

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    combined
  )

  return new TextDecoder().decode(decrypted)
}

async function decryptObject(obj: unknown, depth = 0): Promise<unknown> {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return Promise.all(obj.map((item) => decryptObject(item, depth)))
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX)) {
        result[key] = await decryptText(value, ENCRYPTION_KEY)
      } else if (
        typeof value === "object" &&
        value !== null &&
        depth < MAX_DEPTH
      ) {
        result[key] = await decryptObject(value, depth + 1)
      } else {
        result[key] = value
      }
    }
    return result
  }

  return obj
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "/", `http://localhost:${PROXY_PORT}`)
  const targetUrl = `${TARGET_HOST}${url.pathname}${url.search}`

  console.log(`→ ${req.method} ${url.pathname}`)

  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (value && key.toLowerCase() !== "host") {
      headers[key] = Array.isArray(value) ? value.join(", ") : value
    }
  }

  let body: string | undefined
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    body = await new Promise<string>((resolve) => {
      let data = ""
      req.on("data", (chunk) => (data += chunk))
      req.on("end", () => resolve(data))
    })
  }

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
  })

  const contentType = response.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    const json = await response.json()
    const decrypted = await decryptObject(json)

    res.writeHead(response.status, {
      "Content-Type": "application/json",
      "X-Decrypted-By": "decrypt-proxy",
    })
    res.end(JSON.stringify(decrypted, null, 2))
    console.log(`← ${response.status} (decrypted)`)
  } else {
    const buffer = await response.arrayBuffer()
    res.writeHead(response.status, {
      "Content-Type": contentType,
    })
    res.end(Buffer.from(buffer))
    console.log(`← ${response.status} (passthrough)`)
  }
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error("Error:", err.message)
    res.writeHead(500, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: err.message }))
  })
})

server.listen(PROXY_PORT, () => {
  console.log(`\n🔓 Decrypt proxy running on http://localhost:${PROXY_PORT}`)
  console.log(`   Forwarding to ${TARGET_HOST}`)
  console.log(
    `\n   Example: curl http://localhost:${PROXY_PORT}/api/whatsapp/messages\n`
  )
})
