// E2E encryption utilities using AES-256-GCM
// Compatible with Web Crypto API on the dashboard side

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  pbkdf2Sync,
  randomBytes,
} from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits for GCM
const AUTH_TAG_LENGTH = 16 // 128 bits
const KEY_LENGTH = 32 // 256 bits
const PBKDF2_ITERATIONS = 100000
const SALT = 'contexter-e2e-v1' // Fixed salt for cross-platform compatibility

const ENCRYPTED_PREFIX = 'enc:v1:'

function deriveKey(passphrase: string): Buffer {
  return pbkdf2Sync(passphrase, SALT, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
}

export function encryptText(plaintext: string, passphrase: string): string {
  if (!passphrase) {
    throw new Error('encryptText called without passphrase')
  }
  if (!plaintext) {
    return plaintext
  }

  const key = deriveKey(passphrase)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Format: enc:v1:<iv>:<authTag>:<ciphertext> (all base64)
  const ivB64 = iv.toString('base64')
  const authTagB64 = authTag.toString('base64')
  const ciphertextB64 = encrypted.toString('base64')

  return `${ENCRYPTED_PREFIX}${ivB64}:${authTagB64}:${ciphertextB64}`
}

export function decryptText(
  ciphertext: string,
  passphrase: string,
): string | null {
  if (!ciphertext || !passphrase) {
    return ciphertext
  }

  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    // Not encrypted, return as-is
    return ciphertext
  }

  const parts = ciphertext.slice(ENCRYPTED_PREFIX.length).split(':')
  if (parts.length !== 3) {
    return null
  }

  const [ivB64, authTagB64, encryptedB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const encrypted = Buffer.from(encryptedB64, 'base64')

  const key = deriveKey(passphrase)
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

export function isEncrypted(text: string | null): boolean {
  return text !== null && text.startsWith(ENCRYPTED_PREFIX)
}

// Encrypts binary data and returns a string with the enc:v1: prefix
// Use this when the encrypted result will be transmitted as a string (e.g., JSON)
export function encryptBinaryToString(
  plainBuffer: Buffer,
  passphrase: string,
): string {
  if (!passphrase) {
    throw new Error('encryptBinaryToString called without passphrase')
  }
  if (!plainBuffer || plainBuffer.length === 0) {
    return ''
  }

  const key = deriveKey(passphrase)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Same format as encryptText: enc:v1:<iv>:<authTag>:<ciphertext> (all base64)
  const ivB64 = iv.toString('base64')
  const authTagB64 = authTag.toString('base64')
  const ciphertextB64 = encrypted.toString('base64')

  return `${ENCRYPTED_PREFIX}${ivB64}:${authTagB64}:${ciphertextB64}`
}

// Decrypts a string (with enc:v1: prefix) back to binary data
export function decryptStringToBinary(
  ciphertext: string,
  passphrase: string,
): Buffer | null {
  if (!ciphertext || !passphrase) {
    return ciphertext ? Buffer.from(ciphertext, 'base64') : null
  }

  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    // Not encrypted, assume it's base64-encoded plaintext
    return Buffer.from(ciphertext, 'base64')
  }

  const parts = ciphertext.slice(ENCRYPTED_PREFIX.length).split(':')
  if (parts.length !== 3) {
    return null
  }

  const [ivB64, authTagB64, encryptedB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const encrypted = Buffer.from(encryptedB64, 'base64')

  const key = deriveKey(passphrase)
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted
}

// Binary encryption for files like screenshots
export function encryptBuffer(plainBuffer: Buffer, passphrase: string): Buffer {
  if (!passphrase) {
    throw new Error('encryptBuffer called without passphrase')
  }
  if (!plainBuffer || plainBuffer.length === 0) {
    return plainBuffer
  }

  const key = deriveKey(passphrase)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Format: 4-byte magic + 1-byte version + 12-byte IV + 16-byte authTag + ciphertext
  const MAGIC = Buffer.from('CTXE') // "Context Encrypted"
  const VERSION = Buffer.from([0x01])

  return Buffer.concat([MAGIC, VERSION, iv, authTag, encrypted])
}

export function decryptBuffer(
  encryptedBuffer: Buffer,
  passphrase: string,
): Buffer | null {
  if (!encryptedBuffer || encryptedBuffer.length === 0 || !passphrase) {
    return encryptedBuffer
  }

  // Check magic bytes
  const magic = encryptedBuffer.subarray(0, 4).toString()
  if (magic !== 'CTXE') {
    // Not encrypted, return as-is
    return encryptedBuffer
  }

  const version = encryptedBuffer[4]
  if (version !== 0x01) {
    console.error('Unknown encryption version:', version)
    return null
  }

  const iv = encryptedBuffer.subarray(5, 5 + IV_LENGTH)
  const authTag = encryptedBuffer.subarray(
    5 + IV_LENGTH,
    5 + IV_LENGTH + AUTH_TAG_LENGTH,
  )
  const encrypted = encryptedBuffer.subarray(5 + IV_LENGTH + AUTH_TAG_LENGTH)

  const key = deriveKey(passphrase)
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted
}

export function isEncryptedBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 5) {
    return false
  }
  return buffer.subarray(0, 4).toString() === 'CTXE'
}

// Blind index for searchable encrypted fields
// Uses HMAC-SHA256 with a derived key - deterministic output for same input
const INDEX_SALT = 'contexter-search-index-v1'

function deriveIndexKey(passphrase: string): Buffer {
  return pbkdf2Sync(
    passphrase,
    INDEX_SALT,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256',
  )
}

export function computeSearchIndex(
  plaintext: string,
  passphrase: string,
): string {
  if (!plaintext || !passphrase) {
    return ''
  }

  const key = deriveIndexKey(passphrase)
  const hmac = createHmac('sha256', key)
  hmac.update(plaintext)
  return hmac.digest('hex')
}
