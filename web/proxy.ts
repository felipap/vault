// Dashboard can be protected by DASHBOARD_IP_WHITELIST. api/ MUST be protected
// by API_WRITE_IP_WHITELIST, if write endpoint, or API_READ_IP_WHITELIST,
// otherwise.

import {
  DASHBOARD_IP_WHITELIST,
  isIpAllowed,
  parseWhitelist,
} from "@/lib/ip-whitelist"
import assert from "assert"
import { createHmac, timingSafeEqual } from "crypto"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const API_READ_IP_WHITELIST = process.env.API_READ_IP_WHITELIST || ""
if (!API_READ_IP_WHITELIST) {
  console.warn("API_READ_IP_WHITELIST is not set")
}

const API_WRITE_IP_WHITELIST = process.env.API_WRITE_IP_WHITELIST
if (!API_WRITE_IP_WHITELIST) {
  console.warn("API_WRITE_IP_WHITELIST is not set")
}

const API_WRITE_SECRET = process.env.API_WRITE_SECRET || ""
if (!API_WRITE_SECRET) {
  throw Error("API_WRITE_SECRET is not set")
}
assert(API_WRITE_SECRET.length > 10, "API_WRITE_SECRET is too short")

const API_READ_SECRET = process.env.API_READ_SECRET || ""
if (!API_READ_SECRET) {
  throw Error("API_READ_SECRET is not set")
}
assert(API_READ_SECRET.length > 10, "API_READ_SECRET is too short")

const DASHBOARD_SECRET = process.env.DASHBOARD_SECRET || ""
if (!DASHBOARD_SECRET) {
  throw Error("DASHBOARD_SECRET is not set")
}
assert(DASHBOARD_SECRET.length > 20, "DASHBOARD_SECRET is too short")

const COOKIE_NAME = "context_admin"

// Must match the token generation in admin-auth.ts
function generateAuthToken(secret: string): string {
  return createHmac("sha256", secret).update("context_admin_auth").digest("hex")
}

const EXPECTED_DASHBOARD_TOKEN = generateAuthToken(DASHBOARD_SECRET)

function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes
  if (pathname.startsWith("/api/")) {
    // Check if IP is whitelisted, then check the secret.
    //
    // Read and write handlers MAY be protected by IP whitelist. For writing,
    // it'd require users of the Context desktop app to be behind a fixed IP,
    // which is hard to do. Reading use-cases will depend on what users do with
    // their context.

    const isWriteEndpoint = isApiWriteRequest(request)
    if (isWriteEndpoint) {
      if (API_WRITE_IP_WHITELIST) {
        // Validate that request IP is allowed.
        const whitelist = parseWhitelist(API_WRITE_IP_WHITELIST)
        const ip = getClientIp(request)
        if (!isIpAllowed(ip, whitelist)) {
          console.debug("/api: IP address not allowed", ip)
          return NextResponse.json(
            { error: "Forbidden", message: "IP address not allowed" },
            { status: 403 }
          )
        }
      } else {
        warnUnprotected("Write endpoint is not protected by IP whitelist")
      }
    } else {
      // Read endpoints MUST be protected by
      if (API_READ_IP_WHITELIST) {
        // Validate that request IP is allowed.
        const whitelist = parseWhitelist(API_READ_IP_WHITELIST)
        const ip = getClientIp(request)
        if (!isIpAllowed(ip, whitelist)) {
          console.debug("/api: IP address not allowed", ip)
          return NextResponse.json(
            { error: "Forbidden", message: "IP address not allowed" },
            { status: 403 }
          )
        }
      } else {
        warnUnprotected("Read endpoint is not protected by IP whitelist")
      }
    }

    // We check the token after because we treat whitelists first, to give back
    // the smallest amount of information possible.

    const token = getBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (isWriteEndpoint) {
      if (!secureCompare(token, API_WRITE_SECRET)) {
        console.debug(`/api: Unauthorized (token mismatch)`)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else {
      if (!secureCompare(token, API_READ_SECRET)) {
        console.debug(`/api: Unauthorized (token mismatch)`)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    return NextResponse.next()
  }

  // Validate dashboard access
  if (pathname.startsWith("/dashboard")) {
    // if IP whitelist is enabled,
    if (DASHBOARD_IP_WHITELIST) {
      // validate that the request IP.
      const whitelist = parseWhitelist(DASHBOARD_IP_WHITELIST)
      const ip = getClientIp(request)
      if (!isIpAllowed(ip, whitelist)) {
        console.debug("/dashboard: IP address not allowed", ip)
        return NextResponse.json(
          { error: "Forbidden", message: "IP address not allowed" },
          { status: 403 }
        )
      }
    } else {
      warnUnprotected("Dashboard is not protected by IP whitelist")
    }

    const cookieToken = getDashboardTokenFromCookie(request)
    if (!cookieToken) {
      console.debug("/dashboard: Unauthorized (token missing)")
      return NextResponse.redirect(new URL("/sign-in", request.url))
    }
    if (!secureCompare(cookieToken, EXPECTED_DASHBOARD_TOKEN)) {
      console.debug("/dashboard: Unauthorized (token mismatch)")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/sign-in", "/dashboard/:path*", "/api/:path*"],
}

function isApiWriteRequest(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith("/api")) {
    throw Error("only use fn with API routes")
  }
  return (
    request.method === "POST" ||
    request.method === "PUT" ||
    request.method === "DELETE" ||
    request.method === "PATCH"
  )
}

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  return authHeader.slice(7)
}

function getDashboardTokenFromCookie(request: NextRequest): string | undefined {
  return request.cookies.get(COOKIE_NAME)?.value
}

//
//
//
//
// Get IP from request

export function getClientIp(request: NextRequest): string | null {
  // @ts-expect-error - request.ip exists on Vercel but not in types
  const ip = request.ip
  if (ip) {
    return ip
  }

  // Check common headers for real IP (when behind proxy/load balancer) https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for
  const forwardedFor = request.headers.get("x-vercel-forwarded-for")
  if (forwardedFor) {
    // x-vercel-forwarded-for can contain multiple IPs, the first is the client
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

function warnUnprotected(message: string) {
  // TODO something more dramatic
  console.error("ATTENTION:", message, "🥊".repeat(100))
}
