import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

/*
  GET /api/clip/[id]

  1. Look up clip by code in MongoDB
  2. 404  → code never existed
  3. 410  → code existed but expiresAt has passed
  4. 200  → return { code, expiresAt, files: [{ filename, size, mimeType }] }

  Note: We deliberately do NOT return s3Key, summary, or downloaded here.
  Presigned URLs for view/download are generated on-demand by separate endpoints.
*/

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: code } = await params

    if (code !== code.toUpperCase()) {
        return NextResponse.redirect(
            new URL(`/api/clip/${code.toUpperCase()}`, req.url),
            { status: 301 }
        )
    }

    const mongoClient = await clientPromise
    const db = mongoClient.db('file-clip')

    const clip = await db.collection("clips").findOne({ code })

    // 404 — code never existed
    if (!clip) {
        return NextResponse.json(
            { error: "Clip not found" },
            { status: 404 }
        )
    }

    // 410 — code existed but has expired
    if (new Date(clip.expiresAt) < new Date()) {
        return NextResponse.json(
            { error: "Clip has expired" },
            { status: 410 }
        )
    }

    // 200 — return public metadata only
    return NextResponse.json({
        code:      clip.code,
        expiresAt: clip.expiresAt,
        files:     clip.files.map((f: { filename: string; size: number; mimeType: string }) => ({
            filename: f.filename,
            size:     f.size,
            mimeType: f.mimeType,
        })),
    })
}
