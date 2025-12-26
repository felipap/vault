import {
  API_READ_IP_WHITELIST,
  API_WRITE_IP_WHITELIST,
  parseWhitelist,
  validateIp,
  IpValidationResult,
} from "@/lib/ip-whitelist"
import { NextRequest } from "next/server"

export type CallerInfo = {
  ip: string | null
}

type ProtectedHandler = (
  request: NextRequest,
  caller: CallerInfo
) => Promise<Response>

type NextHandler = (request: NextRequest) => Promise<Response>

// Reading can be more sensitive than writing.
export function protectApiRead(handler: ProtectedHandler): NextHandler {
  return async (request: NextRequest): Promise<Response> => {
    const authResult = validateForRead(request)
    if (!authResult.valid) {
      return authErrorResponse(authResult)
    }
    return handler(request, { ip: authResult.ip })
  }
}

export function protectApiWrite(handler: ProtectedHandler): NextHandler {
  return async (request: NextRequest): Promise<Response> => {
    const authResult = validateForWrite(request)
    if (!authResult.valid) {
      return authErrorResponse(authResult)
    }
    return handler(request, { ip: authResult.ip })
  }
}

type AuthResult =
  | { valid: true; ip: string | null }
  | { valid: false; reason: "ip_blocked"; ip: string | null }
  | { valid: false; reason: "unauthorized" }

function authErrorResponse(
  authResult: Extract<AuthResult, { valid: false }>
): Response {
  if (authResult.reason === "ip_blocked") {
    return Response.json(
      { error: "Forbidden", message: "IP address not allowed" },
      { status: 403 }
    )
  }
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}

function validateForRead(request: NextRequest): AuthResult {
  const ip = getClientIp(request)

  // Check IP whitelist (required for read)
  const ipCheck = validateApiIpForRead(request)
  if (!ipCheck.allowed) {
    return { valid: false, reason: "ip_blocked", ip }
  }

  // Check device secret
  if (!validateDeviceSecret(request)) {
    return { valid: false, reason: "unauthorized" }
  }

  return { valid: true, ip }
}

function validateForWrite(request: NextRequest): AuthResult {
  const ip = getClientIp(request)

  // Check IP whitelist (optional for write)
  const ipCheck = validateApiIpForWrite(request)
  if (!ipCheck.allowed) {
    return { valid: false, reason: "ip_blocked", ip }
  }

  // Check device secret
  if (!validateDeviceSecret(request)) {
    return { valid: false, reason: "unauthorized" }
  }

  return { valid: true, ip }
}

function validateDeviceSecret(request: NextRequest): boolean {
  const expected = process.env.DEVICE_SECRET
  if (!expected) {
    return true
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return false
  }

  const token = authHeader.slice(7)
  return token === expected
}

function getClientIp(request: NextRequest): string | null {
  // Check common headers for real IP (when behind proxy/load balancer)
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, the first is the client
    return forwardedFor.split(",")[0].trim()
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp.trim()
  }

  // Cloudflare
  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  }

  // Fallback - this might not work in all environments
  const remoteAddr = request.headers.get("remote-addr")
  if (remoteAddr) {
    return remoteAddr.trim()
  }

  return null
}

function validateApiIpForRead(request: NextRequest): IpValidationResult {
  const whitelist = parseWhitelist(API_READ_IP_WHITELIST)
  const ip = getClientIp(request)
  return validateIp(ip, whitelist, true)
}

function validateApiIpForWrite(request: NextRequest): IpValidationResult {
  const whitelist = parseWhitelist(API_WRITE_IP_WHITELIST)
  const ip = getClientIp(request)
  return validateIp(ip, whitelist, false)
}
