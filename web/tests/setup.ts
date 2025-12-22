import "dotenv/config"
import { beforeAll, beforeEach, afterAll } from "vitest"
import { cleanupTestData } from "./test-db"

beforeAll(async () => {
  // Cleanup any leftover test data before starting
  await cleanupTestData()
})

beforeEach(async () => {
  // Clean before each test to ensure isolation
  await cleanupTestData()
})

afterAll(async () => {
  await cleanupTestData()
})
