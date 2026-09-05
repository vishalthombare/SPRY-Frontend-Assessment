import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { CollectionResponse } from '../../../core/api/api-response.model';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.constants';
import { Task, TaskApiModel, TaskApiWrite, TaskFormValue, TaskStatus } from '../models/task.model';

/**
 * Handles only HTTP communication for tasks.
 * It also maps FastAPI snake_case data to the camelCase model used by the UI.
 */
@Injectable()
export class TaskApiService {
  private readonly api = inject(ApiService);

  getTasks(): Observable<Task[]> {
    return this.api
      .get<CollectionResponse<TaskApiModel>>(API_ENDPOINTS.tasks.root)
      .pipe(map(({ response }) => response.content.map((task) => this.toTask(task))));
  }

  createTask(value: TaskFormValue): Observable<Task> {
    return this.api
      .post<TaskApiModel, TaskApiWrite>(API_ENDPOINTS.tasks.root, this.toRequest(value))
      .pipe(map(({ response }) => this.toTask(response)));
  }

  updateTask(id: number, value: TaskFormValue): Observable<Task> {
    return this.api
      .put<TaskApiModel, TaskApiWrite>(API_ENDPOINTS.tasks.byId(id), this.toRequest(value))
      .pipe(map(({ response }) => this.toTask(response)));
  }

  deleteTask(id: number): Observable<void> {
    return this.api.delete<null>(API_ENDPOINTS.tasks.byId(id)).pipe(map(() => undefined));
  }

  updateStatus(id: number, status: TaskStatus): Observable<Task> {
    const endpoint =
      status === 'completed' ? API_ENDPOINTS.tasks.complete(id) : API_ENDPOINTS.tasks.restore(id);
    return this.api
      .patch<TaskApiModel, Record<string, never>>(endpoint, {})
      .pipe(map(({ response }) => this.toTask(response)));
  }

  private toTask(task: TaskApiModel): Task {
    return {
      id: task.id,
      title: task.title,
      description: task.description ?? '',
      status: task.status === 'in_progress' ? 'in-progress' : task.status,
      dueDate: task.due_date,
      createdAt: task.created_date,
    };
  }

  private toRequest(value: TaskFormValue): TaskApiWrite {
    return {
      title: value.title.trim(),
      description: value.description.trim() || null,
      status: value.status === 'in-progress' ? 'in_progress' : value.status,
      due_date: value.dueDate,
    };
  }
}
