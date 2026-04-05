export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  color: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  listId: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  position: number;
  taskId: string;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: Pick<User, 'id' | 'name' | 'avatarUrl' | 'color'>;
  taskId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  taskId: string;
  uploadedById: string;
  uploadedBy: Pick<User, 'id' | 'name' | 'avatarUrl' | 'color'>;
  createdAt: string;
}

export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'avatarUrl' | 'color'>;
  completed: boolean;
  assignedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  dueDate: string | null;
  position: number;
  listId: string;
  columnId: string | null;
  assignees: TaskAssignee[];
  createdById: string;
  createdBy: Pick<User, 'id' | 'name' | 'avatarUrl' | 'color'>;
  labels: Label[];
  subtasks: Subtask[];
  comments?: Comment[];
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  assignees: string[];
  priorities: ('LOW' | 'MEDIUM' | 'HIGH')[];
  labelIds: string[];
  dueDate: 'overdue' | 'today' | 'week' | 'month' | 'none' | null;
  statuses: ('TODO' | 'IN_PROGRESS' | 'DONE')[];
}

export interface Column {
  id: string;
  name: string;
  position: number;
  color: string | null;
  listId: string;
  tasks: Task[];
}

export interface TaskList {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  createdById: string;
  members: User[];
  columns: Column[];
  labels: Label[];
  taskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: 'ASSIGNED' | 'COMMENTED' | 'DUE_SOON' | 'MENTIONED';
  message: string;
  read: boolean;
  userId: string;
  taskId: string | null;
  actorId: string | null;
  actor: Pick<User, 'id' | 'name' | 'avatarUrl' | 'color'> | null;
  createdAt: string;
}

export interface TaskListSummary {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  createdById: string;
  members: Pick<User, 'id' | 'name' | 'avatarUrl' | 'color'>[];
  taskCount: number;
  createdAt: string;
  updatedAt: string;
}
