import { Task } from '../models/task.model';
import { LocalStorageTaskRepository, TASK_STORAGE_KEY } from './local-storage-task.repository';

describe('LocalStorageTaskRepository', () => {
  const repository = new LocalStorageTaskRepository();
  beforeEach(() => localStorage.clear());
  it('persists tasks across repository instances', () => {
    const tasks: Task[] = [
      { id: 'x', title: 'Persisted', description: '', status: 'pending', dueDate: '2026-09-03' },
    ];
    repository.save(tasks);
    expect(new LocalStorageTaskRepository().load()).toEqual(tasks);
    expect(localStorage.getItem(TASK_STORAGE_KEY)).toContain('Persisted');
  });
});
