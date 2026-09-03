import { Task, TaskFilterValue } from '../models/task.model';

export function filterAndSortTasks(
  tasks: readonly Task[],
  filters: TaskFilterValue,
  completedOnly: boolean,
): Task[] {
  const query = filters.query.trim().toLowerCase();
  return tasks
    .filter((task) =>
      completedOnly
        ? task.status === 'completed'
        : filters.status === 'all' || task.status === filters.status,
    )
    .filter(
      (task) =>
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query),
    )
    .slice()
    .sort((a, b) =>
      filters.sort === 'asc'
        ? a.dueDate.localeCompare(b.dueDate)
        : b.dueDate.localeCompare(a.dueDate),
    );
}
