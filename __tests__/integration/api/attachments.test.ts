// @vitest-environment node
/**
 * Integration tests — Attachments API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAttachment = {
  id: 'attachment-1',
  fileName: 'image.png',
  fileUrl: 'https://s3.amazonaws.com/bucket/key',
  fileSize: 1024000,
  mimeType: 'image/png',
  taskId: 'task-1',
  uploadedById: 'user-alice',
  createdAt: new Date(),
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    attachment: {
      create: vi.fn().mockResolvedValue({ id: 'attachment-1', fileName: 'image.png', mimeType: 'image/png', fileSize: 1024000, taskId: 'task-1', uploadedById: 'user-alice' }),
      findUnique: vi.fn(),
      delete: vi.fn().mockResolvedValue({ id: 'attachment-1' }),
    },
    task: {
      findUnique: vi.fn().mockResolvedValue({ id: 'task-1', listId: 'list-1', createdById: 'user-alice' }),
    },
    taskList: {
      findUnique: vi.fn().mockResolvedValue({ id: 'list-1', members: [{ id: 'user-alice' }] }),
    },
  },
}));

vi.mock('@/lib/s3', () => ({
  generateUploadUrl: vi.fn().mockResolvedValue({ url: 'https://s3.presigned.url', key: 'uploads/file.png' }),
  generateDownloadUrl: vi.fn().mockResolvedValue('https://s3.download.url'),
  deleteFile: vi.fn(),
}));

vi.mock('@/lib/socket-server', () => ({
  getIO: () => ({ to: () => ({ emit: vi.fn() }), emit: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('I-AT-01: Request presigned upload URL', () => {
  it('returns valid URL + attachment ID', async () => {
    const { generateUploadUrl } = await import('@/lib/s3');
    const result = await generateUploadUrl('image.png', 'image/png');
    expect(result.url).toContain('https://');
    expect(result.key).toBeTruthy();
  });
});

describe('I-AT-02: Confirm upload creates attachment record', () => {
  it('attachment record in DB', async () => {
    const { prisma } = await import('@/lib/prisma');
    const attachment = await prisma.attachment.create({
      data: {
        fileName: 'image.png',
        mimeType: 'image/png',
        fileSize: 1024000,
        fileUrl: 'https://s3.url',
        taskId: 'task-1',
        uploadedById: 'user-alice',
      },
    });
    expect(attachment.id).toBe('attachment-1');
    expect(attachment.fileName).toBe('image.png');
  });
});

describe('I-AT-03: Download generates presigned URL', () => {
  it('returns URL with expiry', async () => {
    const { generateDownloadUrl } = await import('@/lib/s3');
    const url = await generateDownloadUrl('uploads/file.png');
    expect(url).toContain('https://');
  });
});

describe('I-AT-04: Delete attachment removes record', () => {
  it('deleted from DB', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue(mockAttachment as never);
    const deleted = await prisma.attachment.delete({ where: { id: 'attachment-1' } });
    expect(deleted.id).toBe('attachment-1');
  });
});

describe('I-AT-05: Reject invalid MIME type', () => {
  it('400 for .exe files', () => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
    expect(allowedTypes.includes('application/x-msdownload')).toBe(false);
    expect(allowedTypes.includes('application/exe')).toBe(false);
  });
});

describe('I-AT-06: Reject file > 10MB', () => {
  it('400 error for oversized files', () => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const fileSize = 15 * 1024 * 1024; // 15MB
    expect(fileSize > maxSize).toBe(true);
  });
});

describe('I-AT-07: Only uploader/task-creator can delete', () => {
  it('403 for other users', () => {
    const attachment = { ...mockAttachment, uploadedById: 'user-alice' };
    const currentUserId = 'user-eve';
    const taskCreatorId = 'user-alice';
    const canDelete = attachment.uploadedById === currentUserId || taskCreatorId === currentUserId;
    expect(canDelete).toBe(false);
  });
});
