import { db } from "@/db"
import * as schema from "@/db/schema"

export { db as testDb }

export async function cleanupTestData() {
  // Delete in order respecting foreign keys
  await db.delete(schema.Screenshots)
  await db.delete(schema.Devices)
}

export async function createTestDevice(
  overrides: Partial<schema.InsertDevice> = {}
) {
  const [device] = await db
    .insert(schema.Devices)
    .values({
      deviceId: `test-device-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: "Test Device",
      approved: false,
      lastSeenAt: new Date(),
      ...overrides,
    })
    .returning()

  return device
}
