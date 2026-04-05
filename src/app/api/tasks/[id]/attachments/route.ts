import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';
import { generateUploadUrl } from '@/lib/s3';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const createAttachmentSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE, 'File must be ≤ 10MB'),
  mimeType: z.string(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: taskId } = await params;

  // Verify task exists and user is a member
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { list: { include: { members: { select: { id: true } } } } },
  });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (!task.list.members.some((m) => m.id === userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = createAttachmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { fileName, fileSize, mimeType } = parsed.data;

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }

  // Generate presigned S3 upload URL
  let uploadUrl: string;
  let fileKey: string;
  try {
    const result = await generateUploadUrl(taskId, fileName, mimeType);
    uploadUrl = result.uploadUrl;
    fileKey = result.fileKey;
  } catch (err) {
    console.error('S3 presign error:', err);
    return NextResponse.json({ error: 'Could not generate upload URL' }, { status: 500 });
  }

  // Create DB record (fileUrl stores the S3 key)
  const attachment = await prisma.attachment.create({
    data: {
      fileName,
      fileUrl: fileKey,
      fileSize,
      mimeType,
      taskId,
      uploadedById: userId,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, avatarUrl: true, color: true } },
    },
  });

  // Emit real-time event
  getIO()?.to(`list:${task.listId}`).emit('attachment:added', {
    attachment,
    taskId,
    actorId: userId,
  });

  return applyNewToken(NextResponse.json({ attachment, uploadUrl }, { status: 201 }), newAccessToken);
}
