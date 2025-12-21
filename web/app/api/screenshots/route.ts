import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { screenshots } from "@/lib/db/schema";
import { resizeScreenshot } from "@/lib/image-resize";
import { config } from "@/lib/config";
import { headers } from "next/headers";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  let imageBuffer: Buffer;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("screenshot") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxBytes = config.upload.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File too large. Max size: ${config.upload.maxFileSizeMB}MB` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  } else {
    const body = await request.arrayBuffer();
    imageBuffer = Buffer.from(body);
  }

  const resizedBuffer = await resizeScreenshot(imageBuffer);
  const metadata = await sharp(resizedBuffer).metadata();

  const base64Data = resizedBuffer.toString("base64");
  const dataUrl = `data:image/webp;base64,${base64Data}`;

  const [screenshot] = await db
    .insert(screenshots)
    .values({
      userId: session.user.id,
      data: dataUrl,
      width: metadata.width || 0,
      height: metadata.height || 0,
      sizeBytes: resizedBuffer.length,
    })
    .returning();

  return NextResponse.json({
    id: screenshot.id,
    width: screenshot.width,
    height: screenshot.height,
    sizeBytes: screenshot.sizeBytes,
    capturedAt: screenshot.capturedAt,
  });
}

