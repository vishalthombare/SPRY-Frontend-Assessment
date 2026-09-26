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
  requires_otp: false;
  user: AuthUser;
}

/** Login challenge returned instead of tokens when the account requires email 2FA. */
export interface OtpChallengeResponse {
  requires_otp: true;
  challenge_id: string;
  masked_email: string;
  expires_in_seconds: number;
}

/** The discriminator lets callers safely distinguish tokens from an OTP challenge. */
export type LoginResult = LoginResponse | OtpChallengeResponse;

/** Six-digit code submitted with the opaque challenge created during login. */
export interface VerifyOtpRequest {
  challenge_id: string;
  otp: string;
}

/** Verification returns the same authenticated response as a direct login. */
export type VerifyOtpResponse = LoginResponse;

/** Existing challenge submitted when requesting a replacement verification code. */
export interface ResendOtpRequest {
  challenge_id: string;
}

/** Metadata for the replacement challenge; the previous challenge becomes invalid. */
export interface ResendOtpResponse {
  challenge_id: string;
  masked_email: string;
  expires_in_seconds: number;
  resend_cooldown_seconds: number;
}
