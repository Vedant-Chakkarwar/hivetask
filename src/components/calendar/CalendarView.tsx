'use client';

import { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, SlotInfo, EventProps } from 'react-big-calendar';
import withDragAndDrop, { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { TaskList, Task } from '@/types';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Task;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar as any);

type ColorMode = 'priority' | 'label';

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#10B981',
};

interface CalendarViewProps {
  list: TaskList;
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  onQuickAdd?: (date: Date) => void;
}

export function CalendarView({ list, onTaskClick, onTaskUpdate, onQuickAdd }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<string>(Views.MONTH);
  const [colorMode, setColorMode] = useState<ColorMode>('priority');

  // All tasks with a due date
  const allTasks = useMemo(
    () => list.columns.flatMap((c) => c.tasks),
    [list.columns]
  );

  const tasksWithDate = useMemo(() => allTasks.filter((t) => t.dueDate), [allTasks]);
  const tasksWithoutDate = useMemo(() => allTasks.filter((t) => !t.dueDate), [allTasks]);

  const events: CalendarEvent[] = useMemo(
    () =>
      tasksWithDate.map((task) => {
        const date = parseISO(task.dueDate!);
        return {
          id: task.id,
          title: task.title,
          start: date,
          end: date,
          resource: task,
        };
      }),
    [tasksWithDate]
  );

  function getEventColor(task: Task): string {
    if (colorMode === 'priority') {
      return PRIORITY_COLORS[task.priority] ?? '#9CA3AF';
    }
    // Color by first label
    const firstLabel = task.labels[0];
    return firstLabel?.color ?? '#9CA3AF';
  }

  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      const color = getEventColor(event.resource);
      return {
        style: {
          backgroundColor: color,
          borderColor: color,
          borderRadius: '6px',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 500,
          border: 'none',
          padding: '1px 4px',
        },
      };
    },
    [colorMode]
  );

  async function handleEventDrop({ event, start }: EventInteractionArgs<CalendarEvent>) {
    const newDate = start instanceof Date ? start : new Date(start);
    try {
      await onTaskUpdate(event.id, { dueDate: newDate.toISOString() });
    } catch {
      // silently ignore — UI won't update since state is in parent
    }
  }

  function handleSelectSlot({ start }: SlotInfo) {
    onQuickAdd?.(start instanceof Date ? start : new Date(start));
  }

  function CustomEventComponent({ event }: EventProps<CalendarEvent>) {
    return (
      <span
        className="block truncate"
        onClick={(e) => {
          e.stopPropagation();
          onTaskClick(event.resource);
        }}
        title={event.resource.title}
      >
        {event.resource.title}
      </span>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* Calendar toolbar extras */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Color mode toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 text-xs">
          <button
            type="button"
            onClick={() => setColorMode('priority')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              colorMode === 'priority'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Color by Priority
          </button>
          <button
            type="button"
            onClick={() => setColorMode('label')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              colorMode === 'label'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Color by Label
          </button>
        </div>

        {/* Tasks without due date banner */}
        {tasksWithoutDate.length > 0 && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
            {tasksWithoutDate.length} task{tasksWithoutDate.length !== 1 ? 's' : ''} have no due date
          </span>
        )}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm" style={{ height: 'calc(100vh - 220px)' }}>
        <DnDCalendar
          localizer={localizer}
          events={events}
          date={currentDate}
          view={currentView as never}
          onNavigate={setCurrentDate}
          onView={(view) => setCurrentView(view)}
          onEventDrop={handleEventDrop}
          onSelectSlot={handleSelectSlot}
          selectable
          resizable={false}
          eventPropGetter={eventStyleGetter}
          components={{
            event: CustomEventComponent as never,
          }}
          popup
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}
