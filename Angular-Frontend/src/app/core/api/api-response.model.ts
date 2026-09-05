/** Standard backend envelope for one response payload. */
export interface ApiResponse<T> {
  message: string | null;
  response: T;
  status: number;
}

/** Backend container used when a response contains an array. */
export interface CollectionResponse<T> {
  content: T[];
}
