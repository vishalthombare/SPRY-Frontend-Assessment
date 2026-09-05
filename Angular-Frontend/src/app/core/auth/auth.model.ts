/** Credentials accepted by the FastAPI login endpoint. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Safe user information returned by authentication endpoints. */
export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  is_superuser: boolean;
  created_date: string;
}

/** Access and refresh tokens returned together by login and refresh. */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
}

/** Login adds the authenticated user to the standard token pair. */
export interface LoginResponse extends TokenPair {
  user: AuthUser;
}
