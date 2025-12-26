// Environment variables for IP whitelists (comma-separated)

export const DASHBOARD_IP_WHITELIST = process.env.DASHBOARD_IP_WHITELIST || ""
if (!DASHBOARD_IP_WHITELIST) {
  console.error("ATTENTION: DASHBOARD_IP_WHITELIST is not set")
}

export const API_WRITE_IP_WHITELIST = process.env.API_WRITE_IP_WHITELIST || ""
if (!API_WRITE_IP_WHITELIST) {
  throw Error("API_WRITE_IP_WHITELIST is not set")
}

export const API_READ_IP_WHITELIST = process.env.API_READ_IP_WHITELIST || ""
if (!API_READ_IP_WHITELIST) {
  throw Error("API_READ_IP_WHITELIST is not set")
}

export function parseWhitelist(envVar: string | undefined): string[] | null {
  if (!envVar || envVar.trim() === "") {
    return null // No whitelist = allow all
  }
  return envVar
    .split(",")
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0)
}

export type IpValidationResult =
  | { allowed: true; ip: string | null }
  | {
      allowed: false
      ip: string | null
      reason: "not_configured" | "not_whitelisted"
    }

export function validateIp(
  ip: string | null,
  whitelist: string[] | null,
  requireWhitelist: boolean
): IpValidationResult {
  // If whitelist is required but not configured, deny
  if (requireWhitelist && whitelist === null) {
    return { allowed: false, ip, reason: "not_configured" }
  }

  // No whitelist configured and not required = allow all
  if (whitelist === null) {
    return { allowed: true, ip }
  }

  // Whitelist configured but no IP detected = deny
  if (ip === null) {
    return { allowed: false, ip, reason: "not_whitelisted" }
  }

  // Check if IP is in whitelist
  if (whitelist.includes(ip)) {
    return { allowed: true, ip }
  }

  return { allowed: false, ip, reason: "not_whitelisted" }
}

export function isApiIpWhitelistEnabled(): boolean {
  const whitelist = process.env.API_READ_IP_WHITELIST
  return Boolean(whitelist && whitelist.trim() !== "")
}

export function isIpAllowed(ip: string | null, whitelist: string[] | null): boolean {
  // No whitelist configured = allow all
  if (whitelist === null) {
    return true
  }

  // Whitelist configured but no IP detected = deny
  if (ip === null) {
    return false
  }

  // Check if IP is in whitelist
  return whitelist.includes(ip)
}
