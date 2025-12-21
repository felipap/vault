"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useEffect, useState } from "react";

type DashboardStats = {
  totalScreenshots: number;
  totalStorageBytes: number;
  recentScreenshots: {
    id: string;
    width: number;
    height: number;
    sizeBytes: number;
    capturedAt: string;
  }[];
};

async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch("/api/dashboard");
  if (!response.ok) {
    throw new Error("Failed to fetch dashboard stats");
  }
  return response.json();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 Bytes";
  }
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Page() {
  const { data: session, isPending } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      fetchDashboardStats()
        .then(setStats)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [session]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="text-zinc-500">Please sign in to view the dashboard.</p>
        <a
          href="/sign-in"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold">Context Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500">{session.user.email}</span>
            <button
              onClick={() => signOut()}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading ? (
          <p className="text-zinc-500">Loading stats...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : stats ? (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Total Screenshots"
                value={stats.totalScreenshots.toLocaleString()}
              />
              <StatCard
                label="Total Storage"
                value={formatBytes(stats.totalStorageBytes)}
              />
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold">Recent Screenshots</h2>
              {stats.recentScreenshots.length === 0 ? (
                <p className="text-zinc-500">No screenshots yet.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full">
                    <thead className="bg-zinc-50 dark:bg-zinc-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                          Dimensions
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                          Size
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                          Captured
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                      {stats.recentScreenshots.map((screenshot) => (
                        <tr key={screenshot.id}>
                          <td className="px-4 py-3 text-sm font-mono">
                            {screenshot.id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {screenshot.width} × {screenshot.height}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {formatBytes(screenshot.sizeBytes)}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-500">
                            {new Date(screenshot.capturedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default Page;

