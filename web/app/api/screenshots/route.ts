import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { Screenshots } from "@/db/schema"
import { resizeScreenshot } from "@/lib/image-resize"
import { config } from "@/lib/config"
import sharp from "sharp"

function validateAuth(request: NextRequest): boolean {
  const expected = process.env.DEVICE_SECRET
  if (!expected) {
    return true
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return false
  }

  const token = authHeader.slice(7)
  return token === expected
}

export async function POST(request: NextRequest) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") || ""
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Content-Type must be multipart/form-data" },
      { status: 400 }
    )
  }

  const formData = await request.formData()
  console.log("windowTitle", formData.get("windowTitle"))

  const file = formData.get("screenshot") as File | null

  if (!file) {
    return NextResponse.json(
      { error: "No screenshot file provided" },
      { status: 400 }
    )
  }

  const maxBytes = config.upload.maxFileSizeMB * 1024 * 1024
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large. Max size: ${config.upload.maxFileSizeMB}MB` },
      { status: 400 }
    )
  }

  const imageBuffer = Buffer.from(await file.arrayBuffer())

  // Optional metadata fields - add to schema then uncomment:
  // const windowTitle = formData.get("windowTitle") as string | null
  // const appName = formData.get("appName") as string | null

  const resizedBuffer = await resizeScreenshot(imageBuffer)
  const metadata = await sharp(resizedBuffer).metadata()

  const outputBase64 = resizedBuffer.toString("base64")
  const dataUrl = `data:image/webp;base64,${outputBase64}`

  const [screenshot] = await db
    .insert(Screenshots)
    .values({
      // deviceId: deviceCheck.deviceDbId,
      data: dataUrl,
      width: metadata.width || 0,
      height: metadata.height || 0,
      sizeBytes: resizedBuffer.length,
    })
    .returning()

  return NextResponse.json({
    id: screenshot.id,
    width: screenshot.width,
    height: screenshot.height,
    sizeBytes: screenshot.sizeBytes,
    capturedAt: screenshot.capturedAt,
  })
}
