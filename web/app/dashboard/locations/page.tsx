"use client"

import { useEffect, useState } from "react"
import { getLocations, type Location } from "./actions"
import { Pagination } from "@/ui/Pagination"
import { MapPinIcon } from "@/ui/icons"

export default function Page() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getLocations(page)
      setLocations(data.locations)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page])

  let inner
  if (loading) {
    inner = <p className="text-zinc-500">Loading...</p>
  } else if (locations.length === 0) {
    inner = <p className="text-zinc-500">No locations yet.</p>
  } else {
    inner = (
      <>
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Coordinates</th>
                <th className="px-4 py-3 font-medium">Accuracy</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {locations.map((location) => (
                <LocationRow key={location.id} location={location} />
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Locations</h1>
        <span className="text-sm text-zinc-500">
          {total.toLocaleString()} total
        </span>
      </div>

      {inner}
    </div>
  )
}

function LocationRow({ location }: { location: Location }) {
  const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`

  return (
    <tr className="bg-white transition-colors hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900">
      <td className="px-4 py-3">
        <span className="text-zinc-900 dark:text-zinc-100">
          {formatDate(location.timestamp)}
        </span>
        <span className="ml-2 text-zinc-500">{formatTime(location.timestamp)}</span>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
        {location.latitude}, {location.longitude}
      </td>
      <td className="px-4 py-3">
        {location.accuracy !== null ? (
          <span className="text-zinc-600 dark:text-zinc-400">
            ±{location.accuracy}m
          </span>
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {location.source}
        </span>
      </td>
      <td className="px-4 py-3">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <MapPinIcon className="h-3.5 w-3.5" />
          View
        </a>
      </td>
    </tr>
  )
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
