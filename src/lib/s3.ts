import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET = process.env.AWS_S3_BUCKET!;

export async function generateUploadUrl(taskId: string, fileName: string, mimeType: string) {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileKey = `attachments/${taskId}/${crypto.randomUUID()}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    ContentType: mimeType,
    ServerSideEncryption: 'aws:kms',
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 900 });
  return { uploadUrl, fileKey };
}

export async function generateDownloadUrl(fileKey: string) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: fileKey });
  return getSignedUrl(getS3Client(), command, { expiresIn: 900 });
}

export async function deleteFile(fileKey: string) {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: fileKey });
  await getS3Client().send(command);
}
