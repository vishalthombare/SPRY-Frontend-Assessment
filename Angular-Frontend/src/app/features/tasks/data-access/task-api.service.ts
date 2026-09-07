import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { PaginatedResponse } from '../../../core/api/api-response.model';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.constants';
import { APP_CONSTANTS } from '../../../core/constants/app.constants';
import {
  Task,
  TaskApiModel,
  TaskApiWrite,
  TaskCounts,
  TaskFormValue,
  TaskListQuery,
  TaskPage,
  TaskStatus,
  TaskSummaryApiModel,
} from '../models/task.model';

/**
 * Handles only HTTP communication for tasks.
 * It also maps FastAPI snake_case data to the camelCase model used by the UI.
 */
@Injectable()
export class TaskApiService {
  private readonly api = inject(ApiService);

  getTasks(query: TaskListQuery): Observable<TaskPage> {
    const status = query.completedOnly ? 'completed' : query.status;
    const sortByDueDate = query.sort.startsWith('due-');
    const params: Record<string, string | number> = {
      page: query.page,
      page_size: APP_CONSTANTS.defaultPageSize,
      sort: sortByDueDate ? 'due_date' : 'created_date',
      order: query.sort.endsWith('asc') ? 'asc' : 'desc',
    };
    if (query.query.trim()) params['search'] = query.query.trim();
    if (status !== 'all') params['status'] = status === 'in-progress' ? 'in_progress' : status;

    return this.api.get<PaginatedResponse<TaskApiModel>>(API_ENDPOINTS.tasks.root, { params }).pipe(
      map(({ response }) => ({
        tasks: response.content.map((task) => this.toTask(task)),
        page: response.page,
        pageSize: response.page_size,
        totalElements: response.total_elements,
        totalPages: response.total_pages,
      })),
    );
  }

  getSummary(): Observable<TaskCounts> {
    return this.api.get<TaskSummaryApiModel>(API_ENDPOINTS.tasks.summary).pipe(
      map(({ response }) => ({
        total: response.total,
        pending: response.pending,
        inProgress: response.in_progress,
        completed: response.completed,
      })),
    );
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
