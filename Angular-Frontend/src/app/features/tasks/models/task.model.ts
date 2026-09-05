export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type DueDateSort = 'asc' | 'desc';

/** Persisted task entity owned by the task store. */
export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
  createdAt: string;
}

/** FastAPI task representation kept at the data-access boundary. */
export interface TaskApiModel {
  id: number;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  due_date: string;
  completed_date: string | null;
  created_date: string;
  updated_date: string;
}

/** FastAPI write contract for task create and update requests. */
export interface TaskApiWrite {
  title: string;
  description: string | null;
  status: TaskApiModel['status'];
  due_date: string;
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

/** Query sent to the paginated task endpoint. */
export interface TaskListQuery extends TaskFilterValue {
  page: number;
  completedOnly: boolean;
}

/** One task page normalized for use by the store and page component. */
export interface TaskPage {
  tasks: Task[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

/** Summary contract returned by FastAPI before camelCase mapping. */
export interface TaskSummaryApiModel {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
}
