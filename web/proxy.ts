import { DASHBOARD_IP_WHITELIST, isIpAllowed, parseWhitelist } from "@/lib/ip-whitelist"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const COOKIE_NAME = "context_admin"

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

export function proxy(request: NextRequest) {
  // Check dashboard IP whitelist first
  if (isDashboardIpWhitelistEnabled()) {
    const ipCheck = validateDashboardIp(request)
    if (!ipCheck.allowed) {
      return new NextResponse("Forbidden: IP address not allowed", {
        status: 403,
      })
    }
  }

  const token = request.cookies.get(COOKIE_NAME)?.value
  const secret = process.env.ADMIN_SECRET
  const isAuthenticated = !secret || token === secret

  const { pathname } = request.nextUrl

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
  matcher: ["/", "/dashboard/:path*"],
}
