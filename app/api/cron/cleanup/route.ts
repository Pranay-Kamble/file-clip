import clientPromise from "@/lib/mongodb"
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3"
import { NextResponse } from "next/server"

const s3Client = new S3Client({
    region:   process.env.AWS_REGION as string,
    endpoint: process.env.MINIO_ENDPOINT as string,
    credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
    forcePathStyle: true,
})

export async function GET(req: Request) {
    const cron_secret = process.env.CRON_SECRET;
    const auth_header = req.headers.get("authorization");

    if (!cron_secret || auth_header !== `Bearer ${cron_secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const mongo = await clientPromise;
    const db = mongo.db("file-clip");
    const now = new Date();
    
    const clipsToClean = await db.collection("clips").find({
        expiresAt: { $lte: now },
        filesDeleted: { $ne: true }
    }).toArray();

    let s3DeletedCount = 0;
    let keysDeletedCount = 0;

    if (clipsToClean.length > 0) {
        const keysToDelete: string[] = [];
        const bucketName = process.env.S3_BUCKET as string;

        for (const clip of clipsToClean) {
            if (clip.files && Array.isArray(clip.files)) {
                for (const file of clip.files) {
                    if (file.s3Key) {
                        keysToDelete.push(file.s3Key);
                    }
                }
            }
        }

        if (keysToDelete.length > 0) {
            const chunkSize = 1000;
            for (let i = 0; i < keysToDelete.length; i += chunkSize) {
                const chunk = keysToDelete.slice(i, i + chunkSize);
                await s3Client.send(
                    new DeleteObjectsCommand({
                        Bucket: bucketName,
                        Delete: {
                            Objects: chunk.map(key => ({ Key: key })),
                            Quiet: true
                        }
                    })
                );
            }
            keysDeletedCount = keysToDelete.length;
        }

        const clipIds = clipsToClean.map(clip => clip._id);
        await db.collection("clips").updateMany(
            { _id: { $in: clipIds } },
            { $set: { filesDeleted: true } }
        );
        s3DeletedCount = clipsToClean.length;
    }

    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const deleteResult = await db.collection("clips").deleteMany({
        expiresAt: { $lte: tenDaysAgo }
    });

    return NextResponse.json({
        ok: true,
        s3CleanedClips: s3DeletedCount,
        keysDeleted: keysDeletedCount,
        dbDeletedClips: deleteResult.deletedCount,
    });
}
