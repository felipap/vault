import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { createTestDevice } from "../test-db"
import { db } from "@/db"
import { Devices } from "@/db/schema"
import { eq } from "drizzle-orm"

// Mock admin auth to always return authenticated for these tests
vi.mock("@/lib/admin-auth", () => ({
  isAuthenticated: vi.fn().mockResolvedValue(true),
}))

describe("POST /api/devices/register", () => {
  let handler: typeof import("@/app/api/devices/register/route").POST

  beforeEach(async () => {
    vi.resetModules()
    const module = await import("@/app/api/devices/register/route")
    handler = module.POST
  })

  it("registers a new device", async () => {
    const deviceId = `test-${Date.now()}`
    const request = new NextRequest("http://localhost/api/devices/register", {
      method: "POST",
      headers: {
        "x-device-id": deviceId,
        "x-device-name": "My Test Device",
      },
    })

    const response = await handler(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.registered).toBe(true)
    expect(data.approved).toBe(false)
    expect(data.deviceId).toBe(deviceId)

    // Verify device was created in the database
    const device = await db.query.Devices.findFirst({
      where: eq(Devices.deviceId, deviceId),
    })
    expect(device).toBeDefined()
    expect(device?.name).toBe("My Test Device")
    expect(device?.approved).toBe(false)
  })

  it("returns existing device if already registered", async () => {
    const existingDevice = await createTestDevice({ approved: true })

    const request = new NextRequest("http://localhost/api/devices/register", {
      method: "POST",
      headers: {
        "x-device-id": existingDevice.deviceId,
      },
    })

    const response = await handler(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.registered).toBe(true)
    expect(data.approved).toBe(true)
    expect(data.deviceId).toBe(existingDevice.deviceId)
  })

  it("returns 400 if device ID is missing", async () => {
    const request = new NextRequest("http://localhost/api/devices/register", {
      method: "POST",
    })

    const response = await handler(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Missing device ID")
  })

  it("updates lastSeenAt when re-registering", async () => {
    const existingDevice = await createTestDevice()
    const originalLastSeen = existingDevice.lastSeenAt

    // Wait a tiny bit to ensure time difference
    await new Promise((r) => setTimeout(r, 10))

    const request = new NextRequest("http://localhost/api/devices/register", {
      method: "POST",
      headers: {
        "x-device-id": existingDevice.deviceId,
      },
    })

    await handler(request)

    const updatedDevice = await db.query.Devices.findFirst({
      where: eq(Devices.id, existingDevice.id),
    })

    expect(updatedDevice?.lastSeenAt?.getTime()).toBeGreaterThan(
      originalLastSeen?.getTime() || 0
    )
  })
})

describe("GET /api/devices", () => {
  let handler: typeof import("@/app/api/devices/route").GET

  beforeEach(async () => {
    vi.resetModules()
    const module = await import("@/app/api/devices/route")
    handler = module.GET
  })

  it("returns all devices", async () => {
    const device1 = await createTestDevice({ name: "Device 1" })
    const device2 = await createTestDevice({ name: "Device 2" })

    const response = await handler()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThanOrEqual(2)

    const deviceIds = data.map((d: { id: string }) => d.id)
    expect(deviceIds).toContain(device1.id)
    expect(deviceIds).toContain(device2.id)
  })

  it("returns empty array when no devices exist", async () => {
    const response = await handler()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBe(0)
  })
})

describe("GET /api/devices - unauthorized", () => {
  it("returns 401 when not authenticated", async () => {
    vi.resetModules()

    // Mock auth to return false
    vi.doMock("@/lib/admin-auth", () => ({
      isAuthenticated: vi.fn().mockResolvedValue(false),
    }))

    const module = await import("@/app/api/devices/route")

    const response = await module.GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })
})
