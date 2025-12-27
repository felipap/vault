// Dashboard can be protected by DASHBOARD_IP_WHITELIST. api/ MUST be protected
// by API_WRITE_IP_WHITELIST, if write endpoint, or API_READ_IP_WHITELIST,
// otherwise.

import {
  API_READ_IP_WHITELIST,
  DASHBOARD_IP_WHITELIST,
  isIpAllowed,
  parseWhitelist,
} from "@/lib/ip-whitelist"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const COOKIE_NAME = "context_admin"
const DEVICE_SECRET = process.env.DEVICE_SECRET || ""
if (!DEVICE_SECRET) {
  throw Error("DEVICE_SECRET is not set")
}

export function isDashboardIpWhitelistEnabled(): boolean {
  return Boolean(DASHBOARD_IP_WHITELIST && DASHBOARD_IP_WHITELIST.trim() !== "")
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

export function validateDashboardIp(request: NextRequest): {
  allowed: boolean
  ip: string | null
} {
  const whitelist = parseWhitelist(process.env.DASHBOARD_IP_WHITELIST)
  const ip = getClientIp(request)

  return {
    allowed: isIpAllowed(ip, whitelist),
    ip,
  }
}

function validateApiRequest(
  request: NextRequest
): { valid: true } | { valid: false; response: NextResponse } {
  const ip = getClientIp(request)

  // Check IP whitelist
  const whitelist = parseWhitelist(API_READ_IP_WHITELIST)
  if (!isIpAllowed(ip, whitelist)) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: "Forbidden", message: "IP address not allowed" },
        { status: 403 }
      ),
    }
  }

  // Check device secret
  if (DEVICE_SECRET) {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return {
        valid: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      }
    }
    const token = authHeader.slice(7)
    if (token !== DEVICE_SECRET) {
      return {
        valid: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      }
    }
  }

  return { valid: true }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes - enforce authentication at middleware level
  if (pathname.startsWith("/api/")) {
    const apiAuth = validateApiRequest(request)
    if (!apiAuth.valid) {
      return apiAuth.response
    }
    return NextResponse.next()
  }

  // Check dashboard IP whitelist first
  if (isDashboardIpWhitelistEnabled()) {
    const ipCheck = validateDashboardIp(request)
    if (!ipCheck.allowed) {
      return new NextResponse("Forbidden: IP address not allowed", {
        status: 403,
      })
    }
  } else {
    //
  }

  const token = request.cookies.get(COOKIE_NAME)?.value
  const secret = process.env.ADMIN_SECRET
  const isAuthenticated = !secret || token === secret

  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  if (pathname === "/") {
    if (isAuthenticated && secret) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/api/:path*"],
}
