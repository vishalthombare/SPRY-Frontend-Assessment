import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, of } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '../../../core/api/api-response.model';
import { ApiRequestOptions, ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.constants';
import { TaskApiModel } from '../models/task.model';
import { TaskApiService } from './task-api.service';

class FakeApiService {
  endpoint = '';
  options?: ApiRequestOptions;

  get<T>(endpoint: string, options?: ApiRequestOptions): Observable<ApiResponse<T>> {
    this.endpoint = endpoint;
    this.options = options;
    const response: PaginatedResponse<TaskApiModel> = {
      content: [
        {
          id: 7,
          title: 'API task',
          description: null,
          status: 'in_progress',
          due_date: '2026-09-10',
          completed_date: null,
          created_date: '2026-09-06T00:00:00Z',
          updated_date: '2026-09-06T00:00:00Z',
        },
      ],
      page: 2,
      page_size: 10,
      total_elements: 12,
      total_pages: 2,
    };
    return of({ message: null, response, status: 200 } as ApiResponse<T>);
  }
}

describe('TaskApiService', () => {
  it('sends pagination and filters and maps the FastAPI response', async () => {
    const api = new FakeApiService();
    TestBed.configureTestingModule({
      providers: [TaskApiService, { provide: ApiService, useValue: api }],
    });

    const result = await firstValueFrom(
      TestBed.inject(TaskApiService).getTasks({
        query: ' API ',
        status: 'in-progress',
        sort: 'desc',
        page: 2,
        completedOnly: false,
      }),
    );

    expect(api.endpoint).toBe(API_ENDPOINTS.tasks.root);
    expect(api.options?.params).toEqual({
      page: 2,
      page_size: 10,
      order: 'desc',
      search: 'API',
      status: 'in_progress',
    });
    expect(result.tasks[0]).toEqual({
      id: 7,
      title: 'API task',
      description: '',
      status: 'in-progress',
      dueDate: '2026-09-10',
      createdAt: '2026-09-06T00:00:00Z',
    });
    expect(result.totalElements).toBe(12);
    expect(result.totalPages).toBe(2);
  });
});
