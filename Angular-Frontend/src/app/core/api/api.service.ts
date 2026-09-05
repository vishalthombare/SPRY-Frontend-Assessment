import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError, timeout } from 'rxjs';
import { APP_CONSTANTS } from '../constants/app.constants';
import { API_BASE_URL } from './api.config';
import { ApiResponse } from './api-response.model';

/** Optional request metadata supported by the common API methods. */
export interface ApiRequestOptions {
  params?: HttpParams | Record<string, string | number | boolean | readonly string[]>;
  headers?: HttpHeaders | Record<string, string | string[]>;
  context?: HttpContext;
  withCredentials?: boolean;
}

/** Provides typed HTTP methods with one URL, timeout, and error policy. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Send a GET request and deserialize the standard response payload as T. */
  get<T>(endpoint: string, options?: ApiRequestOptions): Observable<ApiResponse<T>> {
    return this.request(this.http.get<ApiResponse<T>>(this.url(endpoint), options));
  }

  /** Send a typed request body with POST and return a typed response payload. */
  post<T, TBody = unknown>(
    endpoint: string,
    body: TBody,
    options?: ApiRequestOptions,
  ): Observable<ApiResponse<T>> {
    return this.request(this.http.post<ApiResponse<T>>(this.url(endpoint), body, options));
  }

  /** Fully replace a resource's editable fields using PUT. */
  put<T, TBody = unknown>(
    endpoint: string,
    body: TBody,
    options?: ApiRequestOptions,
  ): Observable<ApiResponse<T>> {
    return this.request(this.http.put<ApiResponse<T>>(this.url(endpoint), body, options));
  }

  /** Apply a partial resource action or update using PATCH. */
  patch<T, TBody = unknown>(
    endpoint: string,
    body: TBody,
    options?: ApiRequestOptions,
  ): Observable<ApiResponse<T>> {
    return this.request(this.http.patch<ApiResponse<T>>(this.url(endpoint), body, options));
  }

  /** Delete a resource while preserving the backend's standard response type. */
  delete<T>(endpoint: string, options?: ApiRequestOptions): Observable<ApiResponse<T>> {
    return this.request(this.http.delete<ApiResponse<T>>(this.url(endpoint), options));
  }

  /** Join a relative endpoint to the environment-specific API base URL. */
  private url(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`;
  }

  /** Apply shared timeout and error behavior to every standard API request. */
  private request<T>(source: Observable<ApiResponse<T>>): Observable<ApiResponse<T>> {
    return source.pipe(
      timeout(APP_CONSTANTS.apiTimeoutMs),
      catchError((error: HttpErrorResponse) => this.handleError(error)),
    );
  }

  /** Preserve the typed backend error so feature UI can show the correct message. */
  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}
