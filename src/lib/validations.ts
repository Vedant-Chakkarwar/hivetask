import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export const createListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#F59E0B'),
  icon: z.string().max(10).optional(),
  keyShares: z
    .array(
      z.object({
        userId: z.string().uuid(),
        encryptedLEK: z.string(),
        iv: z.string(),
        senderUserId: z.string().uuid(),
      }),
    )
    .optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(2000), // encrypted ciphertext can be longer than plaintext
  description: z.string().max(20000).optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  columnId: z.string().uuid().optional(),
  assigneeIds: z.array(z.string().uuid()).max(20).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  labelIds: z.array(z.string().uuid()).max(10).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(2000).optional(),
  description: z.string().max(20000).nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  columnId: z.string().uuid().nullable().optional(),
  assigneeIds: z.array(z.string().uuid()).max(20).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  labelIds: z.array(z.string().uuid()).max(10).optional(),
});

export const createSubtaskSchema = z.object({
  title: z.string().min(1).max(2000),
  position: z.number().int().min(0).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(20000),
  mentionedUserIds: z.array(z.string().uuid()).optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().uuid(),
  keyShare: z
    .object({
      encryptedLEK: z.string(),
      iv: z.string(),
      senderUserId: z.string().uuid(),
    })
    .optional(),
});

export const createColumnSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});
