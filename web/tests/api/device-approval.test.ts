import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { createTestDevice } from "../test-db"
import { db } from "@/db"
import { Devices } from "@/db/schema"
import { eq } from "drizzle-orm"

// Mock admin auth
vi.mock("@/lib/admin-auth", () => ({
  isAuthenticated: vi.fn().mockResolvedValue(true),
}))

describe("POST /api/devices/[id]/approve", () => {
  let handler: typeof import("@/app/api/devices/[id]/approve/route").POST

  beforeEach(async () => {
    vi.resetModules()
    const module = await import("@/app/api/devices/[id]/approve/route")
    handler = module.POST
  })

  it("approves a device", async () => {
    const device = await createTestDevice({ approved: false })

    const request = new NextRequest(
      `http://localhost/api/devices/${device.id}/approve`,
      { method: "POST" }
    )

    const response = await handler(request, {
      params: Promise.resolve({ id: device.id }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.approved).toBe(true)

    // Verify in database
    const updatedDevice = await db.query.Devices.findFirst({
      where: eq(Devices.id, device.id),
    })
    expect(updatedDevice?.approved).toBe(true)
  })

  it("returns 404 for non-existent device", async () => {
    const request = new NextRequest(
      "http://localhost/api/devices/00000000-0000-0000-0000-000000000000/approve",
      { method: "POST" }
    )

    const response = await handler(request, {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Device not found")
  })
})

describe("DELETE /api/devices/[id]/approve", () => {
  let handler: typeof import("@/app/api/devices/[id]/approve/route").DELETE

  beforeEach(async () => {
    vi.resetModules()
    const module = await import("@/app/api/devices/[id]/approve/route")
    handler = module.DELETE
  })

  it("deletes a device", async () => {
    const device = await createTestDevice()

    const request = new NextRequest(
      `http://localhost/api/devices/${device.id}/approve`,
      { method: "DELETE" }
    )

    const response = await handler(request, {
      params: Promise.resolve({ id: device.id }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Verify device was deleted
    const deletedDevice = await db.query.Devices.findFirst({
      where: eq(Devices.id, device.id),
    })
    expect(deletedDevice).toBeUndefined()
  })

  it("returns 404 for non-existent device", async () => {
    const request = new NextRequest(
      "http://localhost/api/devices/00000000-0000-0000-0000-000000000000/approve",
      { method: "DELETE" }
    )

    const response = await handler(request, {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Device not found")
  })
})

describe("Device approval - unauthorized", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.doMock("@/lib/admin-auth", () => ({
      isAuthenticated: vi.fn().mockResolvedValue(false),
    }))
  })

  it("POST returns 401 when not authenticated", async () => {
    const module = await import("@/app/api/devices/[id]/approve/route")

    const request = new NextRequest(
      "http://localhost/api/devices/some-id/approve",
      { method: "POST" }
    )

    const response = await module.POST(request, {
      params: Promise.resolve({ id: "some-id" }),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("DELETE returns 401 when not authenticated", async () => {
    const module = await import("@/app/api/devices/[id]/approve/route")

    const request = new NextRequest(
      "http://localhost/api/devices/some-id/approve",
      { method: "DELETE" }
    )

    const response = await module.DELETE(request, {
      params: Promise.resolve({ id: "some-id" }),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })
})
