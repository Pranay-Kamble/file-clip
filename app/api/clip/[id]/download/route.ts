import { NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { Readable } from "stream"
import type { Archiver, ArchiverError, ArchiverOptions } from "archiver"
import clientPromise from "@/lib/mongodb"

const s3Client = new S3Client({
    region:   process.env.AWS_REGION as string,
    endpoint: process.env.MINIO_ENDPOINT as string,
    credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
    forcePathStyle: true,
})

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: code } = await params

    const mongoClient = await clientPromise
    const db          = mongoClient.db()
    const clip        = await db.collection("clips").findOne({ code })

    if (!clip) {
        return NextResponse.json({ error: "Clip not found" }, { status: 404 })
    }
    if (new Date(clip.expiresAt) < new Date()) {
        return NextResponse.json({ error: "Clip has expired" }, { status: 410 })
    }

    const archiverFn = require("archiver")
    const createArchive = (typeof archiverFn === "function" ? archiverFn : archiverFn.default) as (
        format: "zip" | "tar",
        opts?: ArchiverOptions
    ) => Archiver

    const { readable, writable } = new TransformStream<Uint8Array>()
    const writer = writable.getWriter()

    const archive = createArchive("zip", { zlib: { level: 6 } })
    archive.on("data",  (chunk: Buffer)       => writer.write(chunk))
    archive.on("end",   ()                    => writer.close())
    archive.on("error", (err: ArchiverError)  => writer.abort(err))

    ;(async () => {
        for (const file of clip.files) {
            try {
                const s3Res = await s3Client.send(
                    new GetObjectCommand({
                        Bucket: process.env.S3_BUCKET as string,
                        Key:    file.s3Key,
                    })
                )
                const nodeStream = Readable.from(s3Res.Body as AsyncIterable<Uint8Array>)
                archive.append(nodeStream, { name: file.filename })
            } catch {
                archive.append(
                    `This file (${file.filename}) was unavailable at the time of download.`,
                    { name: `ERROR - ${file.filename}.txt` }
                )
            }
        }
        archive.finalize()
    })()

    const encoded = encodeURIComponent(`fileclip-${code}.zip`)
    return new Response(readable, {
        headers: {
            "Content-Type":        "application/zip",
            "Content-Disposition": `attachment; filename="fileclip-${code}.zip"; filename*=UTF-8''${encoded}`,
        },
    })
}
