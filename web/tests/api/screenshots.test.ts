import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { createTestDevice } from "../test-db"
import { db } from "@/db"
import { Screenshots, Devices } from "@/db/schema"
import { eq } from "drizzle-orm"

// Create a minimal 1x1 PNG for testing
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

function createTestPngBlob(): Blob {
  const buffer = Buffer.from(TINY_PNG_BASE64, "base64")
  return new Blob([buffer], { type: "image/png" })
}

describe("POST /api/screenshots", () => {
  let handler: typeof import("@/app/api/screenshots/route").POST

  beforeEach(async () => {
    vi.resetModules()
    const module = await import("@/app/api/screenshots/route")
    handler = module.POST
  })

  it("rejects requests without device ID", async () => {
    const request = new NextRequest("http://localhost/api/screenshots", {
      method: "POST",
      body: createTestPngBlob(),
    })

    const response = await handler(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Missing device ID")
  })

  it("rejects requests from unregistered devices", async () => {
    const request = new NextRequest("http://localhost/api/screenshots", {
      method: "POST",
      headers: {
        "x-device-id": "non-existent-device",
      },
      body: createTestPngBlob(),
    })

    const response = await handler(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Device not registered")
  })

  it("rejects requests from unapproved devices", async () => {
    const device = await createTestDevice({ approved: false })

    const request = new NextRequest("http://localhost/api/screenshots", {
      method: "POST",
      headers: {
        "x-device-id": device.deviceId,
      },
      body: createTestPngBlob(),
    })

    const response = await handler(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Device not approved")
  })

  it("accepts screenshot from approved device (raw body)", async () => {
    const device = await createTestDevice({ approved: true })

    const request = new NextRequest("http://localhost/api/screenshots", {
      method: "POST",
      headers: {
        "x-device-id": device.deviceId,
        "content-type": "image/png",
      },
      body: createTestPngBlob(),
    })

    const response = await handler(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBeDefined()
    expect(data.width).toBeGreaterThan(0)
    expect(data.height).toBeGreaterThan(0)
    expect(data.sizeBytes).toBeGreaterThan(0)

    // Verify screenshot was saved
    const screenshot = await db.query.Screenshots.findFirst({
      where: eq(Screenshots.id, data.id),
    })
    expect(screenshot).toBeDefined()
    expect(screenshot?.deviceId).toBe(device.id)
  })

  it("accepts screenshot via multipart form", async () => {
    const device = await createTestDevice({ approved: true })

    const formData = new FormData()
    formData.append("screenshot", createTestPngBlob(), "screenshot.png")

    const request = new NextRequest("http://localhost/api/screenshots", {
      method: "POST",
      headers: {
        "x-device-id": device.deviceId,
      },
      body: formData,
    })

    const response = await handler(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBeDefined()
  })

  it("rejects files that are too large", async () => {
    const device = await createTestDevice({ approved: true })

    // Create a buffer that exceeds the limit (10MB + 1 byte)
    const largeBlob = new Blob([new ArrayBuffer(10 * 1024 * 1024 + 1)], {
      type: "image/png",
    })

    const formData = new FormData()
    formData.append("screenshot", largeBlob, "large.png")

    const request = new NextRequest("http://localhost/api/screenshots", {
      method: "POST",
      headers: {
        "x-device-id": device.deviceId,
      },
      body: formData,
    })

    const response = await handler(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain("File too large")
  })

  it("updates device lastSeenAt on upload", async () => {
    const device = await createTestDevice({ approved: true })
    const originalLastSeen = device.lastSeenAt

    await new Promise((r) => setTimeout(r, 10))

    const request = new NextRequest("http://localhost/api/screenshots", {
      method: "POST",
      headers: {
        "x-device-id": device.deviceId,
        "content-type": "image/png",
      },
      body: createTestPngBlob(),
    })

    await handler(request)

    const updatedDevice = await db.query.Devices.findFirst({
      where: eq(Devices.id, device.id),
    })

    // The device should have been updated
    expect(updatedDevice?.lastSeenAt?.getTime()).toBeGreaterThan(
      originalLastSeen?.getTime() || 0
    )
  })
})
