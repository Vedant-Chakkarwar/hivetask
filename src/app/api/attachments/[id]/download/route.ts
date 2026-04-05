import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { generateDownloadUrl } from '@/lib/s3';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: attachmentId } = await params;

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { task: { include: { list: { include: { members: { select: { id: true } } } } } } },
  });

  if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!attachment.task.list.members.some((m) => m.id === userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const url = await generateDownloadUrl(attachment.fileUrl);
    return applyNewToken(NextResponse.json({ url }), newAccessToken);
  } catch {
    return NextResponse.json({ error: 'Could not generate download URL' }, { status: 500 });
  }
}
