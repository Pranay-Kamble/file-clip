import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { customAlphabet } from "nanoid"
import jwt from "jsonwebtoken"

/*
What this does:
    1. Generates a 6 digit code, for each file
    2. Generates a presigned S3 url for upload
    3. Generates a signedToken for backend to verify later

Future Tasks: Check if the 6 digit code is unique in the mongodb
*/

const s3Client = new S3Client ({
    region: process.env.AWS_REGION as string,
    endpoint: process.env.MINIO_ENDPOINT as string,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
    forcePathStyle: true
})

const customAlphabets = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const digitGenerator = customAlphabet(customAlphabets)

function generateConfirmToken(stagingKey: string, TTL: number) {
    const confirmToken = jwt.sign({stagingKey}, process.env.JWT_SECRET as string, {expiresIn: TTL})

    return confirmToken
}

async function generatePresignedURL(stagingKey: string, mimeType: string, TTL: number) {
    const putCommand = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET as string,
        Key: stagingKey,
        ContentType: mimeType
    })

    const presignedURL = await getSignedUrl(s3Client, putCommand, { expiresIn: TTL })
    return presignedURL
}


export async function POST(req: Request) {
    const body = await req.json()
    const code = digitGenerator(6)
    const responseFiles = []
    const TTL = Number(process.env.TTL as string)

    for (const file of body.files) {
        const stagingKey = `uploads/staging/${code}/${file.name}`
        const presignedPutURL = await generatePresignedURL(stagingKey, file.mimeType, TTL)
        const confirmToken = generateConfirmToken(stagingKey, TTL)

        responseFiles.push({
            filename: file.name,
            stagingKey,
            presignedPutURL,
            confirmToken
        })
    }

    return NextResponse.json({ code, files: responseFiles }, { status: 201 })
}