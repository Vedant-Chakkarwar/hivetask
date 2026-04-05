import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';
import { deleteFile } from '@/lib/s3';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: attachmentId } = await params;

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      task: {
        include: {
          list: { include: { members: { select: { id: true } } } },
        },
      },
    },
  });

  if (!attachment) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });

  const isMember = attachment.task.list.members.some((m) => m.id === userId);
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Only uploader or task creator can delete
  if (attachment.uploadedById !== userId && attachment.task.createdById !== userId) {
    return NextResponse.json({ error: 'Only the uploader or task creator can delete this attachment' }, { status: 403 });
  }

  // Delete from S3
  try {
    await deleteFile(attachment.fileUrl);
  } catch (err) {
    console.error('S3 delete error:', err);
    // Continue to delete DB record even if S3 fails
  }

  await prisma.attachment.delete({ where: { id: attachmentId } });

  getIO()?.to(`list:${attachment.task.listId}`).emit('attachment:deleted', {
    attachmentId,
    taskId: attachment.taskId,
    actorId: userId,
  });

  return applyNewToken(NextResponse.json({ success: true }), newAccessToken);
}
