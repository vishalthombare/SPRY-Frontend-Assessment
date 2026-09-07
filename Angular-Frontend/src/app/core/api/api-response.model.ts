/** Standard backend envelope for one response payload. */
export interface ApiResponse<T> {
  message: string | null;
  response: T;
  status: number;
}

/** One field-level validation problem returned by FastAPI. */
export interface ApiValidationError {
  field: string;
  message: string;
  code: string;
}

/** Error envelope returned for invalid API requests. */
export interface ApiErrorResponse {
  message: string;
  response: { errors: ApiValidationError[] } | null;
  status: number;
}

/** Backend container used when a response contains an array. */
export interface CollectionResponse<T> {
  content: T[];
}

/** Backend collection shape returned by paginated endpoints. */
export interface PaginatedResponse<T> extends CollectionResponse<T> {
  page: number;
  page_size: number;
  total_elements: number;
  total_pages: number;
}
