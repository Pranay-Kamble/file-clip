import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import jwt from "jsonwebtoken"
import {
    S3Client,
    HeadObjectCommand,
    CopyObjectCommand,
} from "@aws-sdk/client-s3"

/*
  What this does:
    1. Validates file count and size limits (mirrors frontend enforcement)
    2. Verify each confirmToken (JWT) — proves the stagingKey was issued by us
    3. Guard against path injection — stagingKey must start with "uploads/staging/"
    4. HeadObject — verify file actually exists in S3 and get its real size + mimeType
    5. CopyObject — move file from staging → permanent prefix
    6. Save clip document to MongoDB, return { code, expiresAt }

  Security: code is derived from the verified stagingKey, never trusted from client.
*/

const s3Client = new S3Client({
    region: process.env.AWS_REGION as string,
    endpoint: process.env.MINIO_ENDPOINT as string,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
    forcePathStyle: true,
})

const EXPIRY_MAP: Record<string, number> = {
    "1h":  1 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "3d":  3 * 24 * 60 * 60 * 1000,
    "7d":  7 * 24 * 60 * 60 * 1000,
}

const MAX_FILE_COUNT    = 15
const MAX_FILE_SIZE_MB  = 100
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

interface FileEntry {
    stagingKey:   string
    confirmToken: string
}

interface VerifiedFile {
    filename:  string
    stagingKey: string
    size:       number
    mimeType:   string
    s3Key:      string
}

export async function POST(req: Request) {
    const { files, expiry }: { files: FileEntry[]; expiry: string } = await req.json()

    if (!Array.isArray(files) || files.length === 0) {
        return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }
    if (files.length > MAX_FILE_COUNT) {
        return NextResponse.json(
            { error: `Too many files. Maximum is ${MAX_FILE_COUNT}.` },
            { status: 400 }
        )
    }

    const expiryMs = EXPIRY_MAP[expiry]
    if (!expiryMs) {
        return NextResponse.json({ error: "Invalid expiry value" }, { status: 400 })
    }

    const verifiedFiles: VerifiedFile[] = []
    let derivedCode: string | null = null

    for (const file of files) {
        const { stagingKey, confirmToken } = file

        let payload: { stagingKey: string }
        try {
            payload = jwt.verify(confirmToken, process.env.JWT_SECRET as string) as { stagingKey: string }
        } catch {
            return NextResponse.json(
                { error: "Invalid or expired confirmToken" },
                { status: 400 }
            )
        }


        if (payload.stagingKey !== stagingKey) {
            return NextResponse.json(
                { error: "confirmToken does not match stagingKey" },
                { status: 400 }
            )
        }

        if (!stagingKey.startsWith("uploads/staging/")) {
            return NextResponse.json(
                { error: "Invalid stagingKey prefix" },
                { status: 400 }
            )
        }


        // stagingKey format: uploads/staging/<code>/<filename>
        const segments = stagingKey.split("/")
        if (segments.length < 4) {
            return NextResponse.json({ error: "Malformed stagingKey" }, { status: 400 })
        }
        const keyCode = segments[2]

        if (derivedCode === null) {
            derivedCode = keyCode
        } else if (derivedCode !== keyCode) {
            return NextResponse.json(
                { error: "All files must belong to the same clip" },
                { status: 400 }
            )
        }

        let size: number
        let mimeType: string
        try {
            const head = await s3Client.send(
                new HeadObjectCommand({
                    Bucket: process.env.S3_BUCKET as string,
                    Key: stagingKey,
                })
            )
            size     = head.ContentLength ?? 0
            mimeType = head.ContentType   ?? "application/octet-stream"
        } catch {
            return NextResponse.json(
                { error: `File not found in S3 staging: ${stagingKey}` },
                { status: 422 }
            )
        }

        if (size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
                { error: `File exceeds ${MAX_FILE_SIZE_MB} MB limit: ${stagingKey.split("/").pop()}` },
                { status: 400 }
            )
        }

        const filename   = stagingKey.split("/").pop()!
        const permanentKey = stagingKey.replace("uploads/staging/", "uploads/permanent/")

        verifiedFiles.push({ filename, stagingKey, size, mimeType, s3Key: permanentKey })
    }

    const code = derivedCode!


    const names = verifiedFiles.map(f => f.filename)
    if (new Set(names).size !== names.length) {
        return NextResponse.json(
            { error: "Duplicate filenames are not allowed in a single clip" },
            { status: 409 }
        )
    }

    for (const file of verifiedFiles) {
        try {
            await s3Client.send(
                new CopyObjectCommand({
                    Bucket:     process.env.S3_BUCKET as string,
                    CopySource: `${process.env.S3_BUCKET}/${file.stagingKey}`,
                    Key:        file.s3Key,
                })
            )
        } catch {
            return NextResponse.json(
                { error: "Failed to move file to permanent storage" },
                { status: 500 }
            )
        }
    }

    const expiresAt = new Date(Date.now() + expiryMs)

    const clipDocument = {
        code,
        createdAt: new Date(),
        expiresAt,
        files: verifiedFiles.map(f => ({
            filename:   f.filename,
            size:       f.size,
            mimeType:   f.mimeType,
            s3Key:      f.s3Key,
            summary:    null,
            downloaded: false,
        })),
    }

    const mongoClient = await clientPromise
    const db = mongoClient.db()
    await db.collection("clips").insertOne(clipDocument)

    return NextResponse.json({ code, expiresAt: expiresAt.toISOString() }, { status: 201 })
}
