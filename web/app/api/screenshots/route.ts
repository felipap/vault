import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { Screenshots } from "@/db/schema"
import { config } from "@/lib/config"
import { logWrite } from "@/lib/activity-log"
import { SCREENSHOT_ENCRYPTED_COLUMNS } from "@/lib/encryption-schema"

// Check if buffer starts with our encryption magic bytes "CTXE"
function isEncryptedBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) {
    return false
  }
  return buffer.subarray(0, 4).toString() === "CTXE"
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || ""
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Content-Type must be multipart/form-data" },
      { status: 400 }
    )
  }

  const formData = await request.formData()
  const file = formData.get("screenshot") as File | null
  const widthParam = formData.get("width") as string | null
  const heightParam = formData.get("height") as string | null

  if (!file) {
    return NextResponse.json(
      { error: "No screenshot file provided" },
      { status: 400 }
    )
  }

  const width = widthParam ? parseInt(widthParam, 10) : 0
  const height = heightParam ? parseInt(heightParam, 10) : 0

  if (!width || !height) {
    return NextResponse.json(
      { error: "width and height are required" },
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

  if (imageBuffer.length === 0) {
    return NextResponse.json(
      { error: "Screenshot file is empty" },
      { status: 400 }
    )
  }

  if (!isEncryptedBuffer(imageBuffer)) {
    return NextResponse.json(
      { error: "Screenshot data must be encrypted" },
      { status: 400 }
    )
  }

  const outputBase64 = imageBuffer.toString("base64")
  const dataUrl = `data:application/octet-stream;base64,${outputBase64}`
  const sizeBytes = imageBuffer.length

  const [screenshot] = await db
    .insert(Screenshots)
    .values({
      data: dataUrl,
      width,
      height,
      sizeBytes,
    })
    .returning()

  await logWrite({
    type: "screenshot",
    description: "Uploaded encrypted screenshot",
    metadata: {
      sizeBytes,
      encrypted: true,
      encryptedColumns: SCREENSHOT_ENCRYPTED_COLUMNS,
    },
  })

  return NextResponse.json({
    id: screenshot.id,
    width: screenshot.width,
    height: screenshot.height,
    sizeBytes: screenshot.sizeBytes,
    capturedAt: screenshot.capturedAt,
  })
}
