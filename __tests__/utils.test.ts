/**
 * Utils tests — date formatting and priority/status display helpers
 */
import { describe, it, expect } from 'vitest';

// Inline helpers that mirror what the app uses (format, isPast, etc. from date-fns)
import { format, isPast, parseISO, isToday, isTomorrow } from 'date-fns';

describe('Date helpers', () => {
  it('formats a date correctly', () => {
    const date = new Date('2025-06-15T00:00:00Z');
    const formatted = format(date, 'MMM d, yyyy');
    expect(formatted).toBe('Jun 15, 2025');
  });

  it('detects past dates', () => {
    const past = new Date(Date.now() - 100_000);
    expect(isPast(past)).toBe(true);
  });

  it('detects future dates as not past', () => {
    const future = new Date(Date.now() + 100_000);
    expect(isPast(future)).toBe(false);
  });

  it('parses ISO strings to Date objects', () => {
    const iso = '2025-01-01T12:00:00.000Z';
    const parsed = parseISO(iso);
    expect(parsed instanceof Date).toBe(true);
    expect(parsed.getFullYear()).toBe(2025);
  });
});

describe('Priority labels', () => {
  const priorityLabel: Record<string, string> = {
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
  };

  it('maps HIGH priority correctly', () => {
    expect(priorityLabel['HIGH']).toBe('High');
  });

  it('maps MEDIUM priority correctly', () => {
    expect(priorityLabel['MEDIUM']).toBe('Medium');
  });

  it('maps LOW priority correctly', () => {
    expect(priorityLabel['LOW']).toBe('Low');
  });
});

describe('Status labels', () => {
  const statusLabel: Record<string, string> = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done',
  };

  it('maps TODO status correctly', () => {
    expect(statusLabel['TODO']).toBe('To Do');
  });

  it('maps IN_PROGRESS status correctly', () => {
    expect(statusLabel['IN_PROGRESS']).toBe('In Progress');
  });

  it('maps DONE status correctly', () => {
    expect(statusLabel['DONE']).toBe('Done');
  });
});
