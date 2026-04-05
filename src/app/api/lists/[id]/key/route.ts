import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';

/** GET /api/lists/:id/key — Returns the ListKeyShare (encrypted LEK) for the current user */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: listId } = await params;

  const keyShare = await prisma.listKeyShare.findUnique({
    where: { listId_userId: { listId, userId } },
    include: {
      sender: { select: { publicKey: true } },
    },
  });

  if (!keyShare) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }

  return applyNewToken(
    NextResponse.json({
      encryptedLEK: keyShare.encryptedLEK,
      iv: keyShare.iv,
      senderPublicKey: keyShare.sender.publicKey,
    }),
    newAccessToken,
  );
}
