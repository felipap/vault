"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { Locations } from "@/db/schema"
import { desc, sql } from "drizzle-orm"
import { unauthorized } from "next/navigation"

export type Location = {
  id: string
  latitude: string
  longitude: string
  accuracy: number | null
  source: string
  placeId: string | null
  timestamp: Date
}

export type LocationsPage = {
  locations: Location[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getLocations(
  page: number = 1,
  pageSize: number = 20
): Promise<LocationsPage> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const offset = (page - 1) * pageSize

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(Locations)

  const total = countResult.count

  const results = await db.query.Locations.findMany({
    orderBy: desc(Locations.timestamp),
    limit: pageSize,
    offset,
  })

  const locations = results.map((row) => ({
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    source: row.source,
    placeId: row.placeId,
    timestamp: row.timestamp,
  }))

  return {
    locations,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
