export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type DueDateSort = 'asc' | 'desc';

/** Persisted task entity owned by the task store. */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
  createdAt: string;
}

/** Editable values emitted by the shared add/edit form. */
export interface TaskFormValue {
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
}

/** Search, status, and ordering options used by the task selector. */
export interface TaskFilterValue {
  query: string;
  status: TaskStatus | 'all';
  sort: DueDateSort;
}

/** Derived summary values calculated from one task collection. */
export interface TaskCounts {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}
