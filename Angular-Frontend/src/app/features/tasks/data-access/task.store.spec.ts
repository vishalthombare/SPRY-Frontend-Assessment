import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, of } from 'rxjs';
import { Task, TaskFormValue } from '../models/task.model';
import { TASK_REPOSITORY, TaskRepository } from './task.repository';
import { TaskStore } from './task.store';

class MemoryRepository implements TaskRepository {
  constructor(private tasks: Task[]) {}
  load(): Observable<Task[]> {
    return of(this.tasks.map((task) => ({ ...task })));
  }
  create(formValue: TaskFormValue): Observable<Task> {
    const task = { ...formValue, id: 4, createdAt: '2026-09-01T00:00:00.000Z' };
    this.tasks = [task, ...this.tasks];
    return of(task);
  }
  update(id: number, formValue: TaskFormValue): Observable<Task> {
    const original = this.tasks.find((task) => task.id === id)!;
    const task = { ...original, ...formValue };
    this.tasks = this.tasks.map((item) => (item.id === id ? task : item));
    return of(task);
  }
  remove(id: number): Observable<void> {
    this.tasks = this.tasks.filter((task) => task.id !== id);
    return of(undefined);
  }
  setStatus(id: number, status: Task['status']): Observable<Task> {
    const original = this.tasks.find((task) => task.id === id)!;
    const task = { ...original, status };
    this.tasks = this.tasks.map((item) => (item.id === id ? task : item));
    return of(task);
  }
}

const seed: Task[] = [
  {
    id: 1,
    title: 'Pending',
    description: '',
    status: 'pending',
    dueDate: '2026-09-03',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 2,
    title: 'Active',
    description: '',
    status: 'in-progress',
    dueDate: '2026-09-02',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 3,
    title: 'Done',
    description: '',
    status: 'completed',
    dueDate: '2026-09-01',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
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
    expect(await firstValueFrom(store.add(value))).toBe(true);
    const added = (await firstValueFrom(store.tasks$))[0];
    expect(added.title).toBe('New task');
    expect(await firstValueFrom(store.update(added.id, { ...value, title: 'Updated task' }))).toBe(
      true,
    );
    expect((await firstValueFrom(store.tasks$)).find((task) => task.id === added.id)?.title).toBe(
      'Updated task',
    );
    expect(seed).toHaveLength(3);
  });
  it('deletes only the selected task', async () => {
    expect(await firstValueFrom(store.remove(2))).toBe(true);
    expect((await firstValueFrom(store.tasks$)).map((task) => task.id)).toEqual([1, 3]);
  });
  it('completes and restores tasks', async () => {
    await firstValueFrom(store.setStatus(1, 'completed'));
    expect((await firstValueFrom(store.tasks$)).find((task) => task.id === 1)?.status).toBe(
      'completed',
    );
    await firstValueFrom(store.setStatus(1, 'in-progress'));
    expect((await firstValueFrom(store.tasks$)).find((task) => task.id === 1)?.status).toBe(
      'in-progress',
    );
  });
});
