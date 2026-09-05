import { Task } from '../models/task.model';
import { filterAndSortTasks } from './task.selectors';

const tasks: Task[] = [
  {
    id: 1,
    title: 'Later pending',
    description: 'Alpha',
    status: 'pending',
    dueDate: '2026-09-09',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 2,
    title: 'Earlier active',
    description: 'Beta match',
    status: 'in-progress',
    dueDate: '2026-09-02',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 3,
    title: 'Completed item',
    description: 'Gamma',
    status: 'completed',
    dueDate: '2026-09-01',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
];

describe('filterAndSortTasks', () => {
  it('filters by status and search without mutating source tasks', () => {
    const result = filterAndSortTasks(
      tasks,
      { query: 'match', status: 'in-progress', sort: 'asc' },
      false,
    );
    expect(result.map((task) => task.id)).toEqual([2]);
    expect(tasks.map((task) => task.id)).toEqual([1, 2, 3]);
  });
  it('sorts due dates in both directions', () => {
    expect(
      filterAndSortTasks(tasks, { query: '', status: 'all', sort: 'asc' }, false).map(
        (task) => task.id,
      ),
    ).toEqual([3, 2, 1]);
    expect(
      filterAndSortTasks(tasks, { query: '', status: 'all', sort: 'desc' }, false).map(
        (task) => task.id,
      ),
    ).toEqual([1, 2, 3]);
  });
  it('forces completed-only selection for the completed route', () => {
    expect(
      filterAndSortTasks(tasks, { query: '', status: 'pending', sort: 'asc' }, true).map(
        (task) => task.id,
      ),
    ).toEqual([3]);
  });
});
