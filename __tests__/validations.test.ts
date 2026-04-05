/**
 * Validation schema tests — Zod schemas accept valid data and reject invalid data
 */
import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  createListSchema,
  createTaskSchema,
  updateTaskSchema,
  createSubtaskSchema,
  createCommentSchema,
  createLabelSchema,
  createColumnSchema,
  addMemberSchema,
} from '@/lib/validations';

describe('U-VA-01: Create task — valid input passes', () => {
  it('accepts { title: "Test" }', () => {
    const result = createTaskSchema.safeParse({ title: 'Test' });
    expect(result.success).toBe(true);
  });
});

describe('U-VA-02: Create task — empty title fails', () => {
  it('rejects empty title', () => {
    const result = createTaskSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });
});

describe('U-VA-03: Create task — title > 2000 chars fails', () => {
  it('rejects overly long title', () => {
    const result = createTaskSchema.safeParse({ title: 'A'.repeat(2001) });
    expect(result.success).toBe(false);
  });
});

describe('U-VA-04: Create list — valid input passes', () => {
  it('accepts { name: "Board", color: "#F59E0B" }', () => {
    const result = createListSchema.safeParse({ name: 'Board', color: '#F59E0B' });
    expect(result.success).toBe(true);
  });

  it('defaults color when not provided', () => {
    const result = createListSchema.safeParse({ name: 'Board' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.color).toBe('#F59E0B');
  });
});

describe('U-VA-05: Create list — invalid hex color fails', () => {
  it('rejects "notacolor"', () => {
    const result = createListSchema.safeParse({ name: 'Board', color: 'notacolor' });
    expect(result.success).toBe(false);
  });

  it('rejects partial hex', () => {
    const result = createListSchema.safeParse({ name: 'Board', color: '#FFF' });
    expect(result.success).toBe(false);
  });
});

describe('U-VA-06: Create comment — empty content fails', () => {
  it('rejects empty content', () => {
    const result = createCommentSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });
});

describe('U-VA-07: Update task — at least one field required', () => {
  it('accepts partial update with one field', () => {
    const result = updateTaskSchema.safeParse({ status: 'DONE' });
    expect(result.success).toBe(true);
  });

  it('accepts valid title update', () => {
    const result = updateTaskSchema.safeParse({ title: 'Updated title' });
    expect(result.success).toBe(true);
  });
});

describe('U-VA-08: Priority enum validation', () => {
  it('accepts LOW, MEDIUM, HIGH', () => {
    for (const priority of ['LOW', 'MEDIUM', 'HIGH']) {
      const result = createTaskSchema.safeParse({ title: 'Task', priority });
      expect(result.success).toBe(true);
    }
  });

  it('rejects CRITICAL', () => {
    const result = createTaskSchema.safeParse({ title: 'Task', priority: 'CRITICAL' });
    expect(result.success).toBe(false);
  });

  it('rejects URGENT', () => {
    const result = createTaskSchema.safeParse({ title: 'Task', priority: 'URGENT' });
    expect(result.success).toBe(false);
  });
});

describe('U-VA-09: UUID format validation', () => {
  it('rejects invalid UUIDs for assigneeId', () => {
    const result = createTaskSchema.safeParse({ title: 'Task', assigneeId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('accepts valid v4 UUID', () => {
    const result = createTaskSchema.safeParse({
      title: 'Task',
      assigneeId: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for addMember', () => {
    const result = addMemberSchema.safeParse({ userId: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('U-VA-10: Label validation', () => {
  it('accepts valid label', () => {
    const result = createLabelSchema.safeParse({ name: 'Bug', color: '#EF4444' });
    expect(result.success).toBe(true);
  });

  it('rejects empty label name', () => {
    const result = createLabelSchema.safeParse({ name: '', color: '#EF4444' });
    expect(result.success).toBe(false);
  });

  it('rejects label without color', () => {
    const result = createLabelSchema.safeParse({ name: 'Bug' });
    expect(result.success).toBe(false);
  });
});

describe('U-VA-11: Additional validations', () => {
  it('login rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'pass' });
    expect(result.success).toBe(false);
  });

  it('login accepts valid email + password', () => {
    const result = loginSchema.safeParse({ email: 'alice@hivetask.com', password: 'changeme123' });
    expect(result.success).toBe(true);
  });

  it('createSubtask rejects empty title', () => {
    const result = createSubtaskSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('createSubtask accepts valid title', () => {
    const result = createSubtaskSchema.safeParse({ title: 'Write tests' });
    expect(result.success).toBe(true);
  });

  it('createColumn rejects empty name', () => {
    const result = createColumnSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('createColumn accepts valid name', () => {
    const result = createColumnSchema.safeParse({ name: 'Review' });
    expect(result.success).toBe(true);
  });

  it('task full data accepted', () => {
    const result = createTaskSchema.safeParse({
      title: 'Fix bug',
      description: 'Details here',
      priority: 'HIGH',
      assigneeId: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
      dueDate: '2026-06-15T12:00:00.000Z',
      labelIds: [],
    });
    expect(result.success).toBe(true);
  });

  it('update task accepts all status values', () => {
    for (const status of ['TODO', 'IN_PROGRESS', 'DONE']) {
      const result = updateTaskSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('update task rejects invalid status', () => {
    const result = updateTaskSchema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('comment with mentions accepted', () => {
    const result = createCommentSchema.safeParse({
      content: '@alice check this',
      mentionedUserIds: ['a3bb189e-8bf9-3888-9912-ace4e6543002'],
    });
    expect(result.success).toBe(true);
  });
});
