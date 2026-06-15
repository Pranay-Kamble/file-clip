import { NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { GoogleGenAI } from "@google/genai"
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

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "missing_key" })

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string; filename: string }> }
) {
    const { id: code, filename: encodedFilename } = await params
    const filename = decodeURIComponent(encodedFilename)


    const mongoClient = await clientPromise
    const db = mongoClient.db()
    const clip = await db.collection("clips").findOne({ code })

    if (!clip) return NextResponse.json({ error: "Clip not found" }, { status: 404 })
    if (new Date(clip.expiresAt) < new Date()) return NextResponse.json({ error: "Clip has expired" }, { status: 410 })

    const fileEntry = clip.files.find((f: { filename: string }) => f.filename === filename)
    if (!fileEntry) return NextResponse.json({ error: "File not found in clip" }, { status: 404 })


    if (fileEntry.summary !== null && fileEntry.summary !== undefined && fileEntry.summary !== "Could not generate summary.") {
        return NextResponse.json({ summary: fileEntry.summary, cached: true })
    }


    const mimeType: string = fileEntry.mimeType || ""
    const isSummarizable = mimeType.startsWith("text/plain") ||
                           mimeType === "application/pdf" ||
                           mimeType.startsWith("image/")

    if (!isSummarizable) {
        return NextResponse.json({ error: "Summary coming soon for this file type" }, { status: 415 })
    }

    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API key is not configured on the server." }, { status: 500 })
    }


    let s3Res
    try {
        s3Res = await s3Client.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET as string,
            Key:    fileEntry.s3Key,
        }))
    } catch (e) {
        console.error("S3 fetch error:", e)
        return NextResponse.json({ error: "Failed to read file from storage" }, { status: 500 })
    }

    const chunks: Uint8Array[] = []
    for await (const chunk of s3Res.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk)
    }
    const bytes = Buffer.concat(chunks)


    let parts: object[]
    if (mimeType.startsWith("text/")) {
        const text = bytes.toString("utf-8").slice(0, 100_000)
        parts = [
            { text: `You are a file summarizer and file analyzer. Summarize the following file content in 2-3 sentences. Be concise and factual.\n\nFilename: ${filename}\n\n${text}` }
        ]
    } else {
        const capped = bytes.length > 15 * 1024 * 1024 ? bytes.subarray(0, 15 * 1024 * 1024) : bytes
        parts = [
            { inlineData: { mimeType, data: capped.toString("base64") } },
            { text: `Summarize this ${mimeType === "application/pdf" ? "PDF document" : "image"} in 2-3 sentences. Be concise and factual. Filename: ${filename}` }
        ]
    }


    let summary: string
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [{ role: "user", parts }],
        })
        summary = response.text?.trim() ?? "Could not generate summary."
    } catch (err) {
        console.error("Gemini API error:", err)
        return NextResponse.json({ error: "AI summary failed" }, { status: 502 })
    }

    await db.collection("clips").updateOne(
        { code },
        { $set: { "files.$[f].summary": summary } },
        { arrayFilters: [{ "f.filename": filename }] }
    )

    return NextResponse.json({ summary, cached: false })
}
