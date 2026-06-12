import { NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import clientPromise from "@/lib/mongodb"

/*
  GET /api/clip/[id]/[filename]/view

  1. Decode filename from URL params
  2. Lookup clip in MongoDB — 404 or 410 if invalid/expired
  3. Verify the filename exists in this clip's file list
  4. Build S3 key: uploads/permanent/<code>/<filename>
  5. Generate presigned GET URL with Content-Disposition: inline
  6. Return { url } — client redirects or renders inline
*/

const s3Client = new S3Client({
    region:   process.env.AWS_REGION as string,
    endpoint: process.env.MINIO_ENDPOINT as string,
    credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
    forcePathStyle: true,
})

const PRESIGN_TTL = Number(process.env.PRESIGN_TTL as string)

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string; filename: string }> }
) {
    const { id: code, filename: encodedFilename } = await params
    const filename = decodeURIComponent(encodedFilename)

    const mongoClient = await clientPromise
    const db = mongoClient.db()
    const clip = await db.collection("clips").findOne({ code })

    if (!clip) {
        return NextResponse.json({ error: "Clip not found" }, { status: 404 })
    }

    if (new Date(clip.expiresAt) < new Date()) {
        return NextResponse.json({ error: "Clip has expired" }, { status: 410 })
    }

    const fileEntry = clip.files.find(
        (f: { filename: string }) => f.filename === filename
    )
    if (!fileEntry) {
        return NextResponse.json({ error: "File not found in clip" }, { status: 404 })
    }

    const s3Key = fileEntry.s3Key

    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET as string,
        Key:    s3Key,
        ResponseContentDisposition: "inline",
        ResponseContentType:        fileEntry.mimeType,
    })

    const url = await getSignedUrl(s3Client, command, { expiresIn: PRESIGN_TTL })

    return NextResponse.json({ url })
}
