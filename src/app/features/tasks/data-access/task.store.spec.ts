import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Task, TaskFormValue } from '../models/task.model';
import { TASK_REPOSITORY, TaskRepository } from './task.repository';
import { TaskStore } from './task.store';

class MemoryRepository implements TaskRepository {
  saved: readonly Task[] = [];
  constructor(private tasks: Task[]) {}
  load(): Task[] {
    return this.tasks.map((task) => ({ ...task }));
  }
  save(tasks: readonly Task[]): void {
    this.saved = tasks.map((task) => ({ ...task }));
    this.tasks = [...this.saved];
  }
}

const seed: Task[] = [
  { id: '1', title: 'Pending', description: '', status: 'pending', dueDate: '2026-09-03' },
  { id: '2', title: 'Active', description: '', status: 'in-progress', dueDate: '2026-09-02' },
  { id: '3', title: 'Done', description: '', status: 'completed', dueDate: '2026-09-01' },
];
const value: TaskFormValue = {
  title: 'New task',
  description: 'Description',
  status: 'pending',
  dueDate: '2026-09-04',
};

describe('TaskStore', () => {
  let repository: MemoryRepository;
  let store: TaskStore;
  beforeEach(() => {
    repository = new MemoryRepository(seed);
    TestBed.configureTestingModule({
      providers: [TaskStore, { provide: TASK_REPOSITORY, useValue: repository }],
    });
    store = TestBed.inject(TaskStore);
  });

  it('calculates all summary counts from the same collection', async () => {
    await expect(firstValueFrom(store.counts$)).resolves.toEqual({
      total: 3,
      pending: 1,
      inProgress: 1,
      completed: 1,
    });
  });
  it('adds and edits tasks with immutable persisted updates', async () => {
    expect(store.add(value)).toBe(true);
    const added = repository.saved[0];
    expect(added.title).toBe('New task');
    expect(store.update(added.id, { ...value, title: 'Updated task' })).toBe(true);
    expect(repository.saved.find((task) => task.id === added.id)?.title).toBe('Updated task');
    expect(seed).toHaveLength(3);
  });
  it('deletes only the selected task', () => {
    expect(store.remove('2')).toBe(true);
    expect(repository.saved.map((task) => task.id)).toEqual(['1', '3']);
  });
  it('completes and restores tasks', () => {
    store.setStatus('1', 'completed');
    expect(repository.saved.find((task) => task.id === '1')?.status).toBe('completed');
    store.setStatus('1', 'in-progress');
    expect(repository.saved.find((task) => task.id === '1')?.status).toBe('in-progress');
  });
});
