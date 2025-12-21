import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { devices } from "@/lib/db/schema";
import { headers } from "next/headers";
import { desc } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allDevices = await db.query.devices.findMany({
    orderBy: [desc(devices.createdAt)],
  });

  return NextResponse.json(allDevices);
}

