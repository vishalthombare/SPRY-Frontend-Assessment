export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type DueDateSort = 'asc' | 'desc';
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
}
export interface TaskFormValue {
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
}
export interface TaskFilterValue {
  query: string;
  status: TaskStatus | 'all';
  sort: DueDateSort;
}
export interface TaskCounts {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}
