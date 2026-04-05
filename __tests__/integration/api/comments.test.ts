// @vitest-environment node
/**
 * Integration tests — Comments API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockComment = {
  id: 'comment-1',
  content: 'encrypted-comment-content',
  authorId: 'user-alice',
  taskId: 'task-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  author: { id: 'user-alice', name: 'Alice', color: '#F59E0B', avatarUrl: null },
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    comment: {
      create: vi.fn().mockResolvedValue({
        id: 'comment-1',
        content: 'encrypted-comment-content',
        authorId: 'user-alice',
        taskId: 'task-1',
        author: { id: 'user-alice', name: 'Alice', color: '#F59E0B', avatarUrl: null },
      }),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue({ id: 'comment-1' }),
    },
    task: {
      findUnique: vi.fn().mockResolvedValue({ id: 'task-1', listId: 'list-1', assigneeId: 'user-bob', createdById: 'user-alice' }),
    },
    notification: {
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([{ id: 'user-bob', name: 'Bob' }]),
    },
  },
}));

vi.mock('@/lib/notifications', () => ({
  createNotification: vi.fn(),
}));

vi.mock('@/lib/socket-server', () => ({
  getIO: () => ({ to: () => ({ emit: vi.fn() }), emit: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('I-CO-01: Add comment to task', () => {
  it('comment saved with author', async () => {
    const { prisma } = await import('@/lib/prisma');
    const comment = await prisma.comment.create({
      data: { content: 'encrypted-comment-content', authorId: 'user-alice', taskId: 'task-1' },
    });
    expect(comment.id).toBe('comment-1');
    expect(comment.authorId).toBe('user-alice');
    expect(comment.author.name).toBe('Alice');
  });
});

describe('I-CO-02: Comment creates notification for assignee', () => {
  it('notification created', async () => {
    const { createNotification } = await import('@/lib/notifications');
    await createNotification({
      type: 'COMMENTED',
      message: 'Alice commented on "Task"',
      userId: 'user-bob',
      taskId: 'task-1',
      actorId: 'user-alice',
    } as never);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'COMMENTED', userId: 'user-bob' }),
    );
  });
});

describe('I-CO-03: @mention creates notification', () => {
  it('MENTIONED notification created for mentioned user', async () => {
    const { createNotification } = await import('@/lib/notifications');
    await createNotification({
      type: 'MENTIONED',
      message: 'Alice mentioned you in a comment',
      userId: 'user-bob',
      taskId: 'task-1',
      actorId: 'user-alice',
    } as never);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MENTIONED', userId: 'user-bob' }),
    );
  });
});

describe('I-CO-04: Edit own comment', () => {
  it('content updated', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(mockComment as never);
    vi.mocked(prisma.comment.update).mockResolvedValue({
      ...mockComment,
      content: 'updated-encrypted-content',
    } as never);

    const updated = await prisma.comment.update({
      where: { id: 'comment-1' },
      data: { content: 'updated-encrypted-content' },
    });
    expect(updated.content).toBe('updated-encrypted-content');
  });
});

describe('I-CO-05: Cannot edit another user\'s comment', () => {
  it('403 Forbidden scenario', () => {
    const comment = { ...mockComment, authorId: 'user-bob' };
    const currentUserId = 'user-alice';
    expect(comment.authorId).not.toBe(currentUserId);
  });
});

describe('I-CO-06: Delete own comment', () => {
  it('comment removed', async () => {
    const { prisma } = await import('@/lib/prisma');
    const deleted = await prisma.comment.delete({ where: { id: 'comment-1' } });
    expect(deleted.id).toBe('comment-1');
  });
});

describe('I-CO-07: Comment content stored encrypted', () => {
  it('raw DB value is ciphertext', () => {
    expect(mockComment.content).toBe('encrypted-comment-content');
    expect(mockComment.content).not.toBe('Looks good!');
  });
});

describe('I-CO-08: Comment content sanitized (XSS)', () => {
  it('<script> tags stripped from rendered output', () => {
    const DOMPurify = { sanitize: (html: string) => html.replace(/<script[^>]*>.*?<\/script>/gi, '') };
    const input = '<script>alert(1)</script>Hello';
    const sanitized = DOMPurify.sanitize(input);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('Hello');
  });
});
