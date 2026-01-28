import { vi } from "vitest"

// Mock the activity log to avoid side effects in tests
vi.mock("@/lib/activity-log", () => ({
  logRead: vi.fn(),
  logWrite: vi.fn(),
}))
