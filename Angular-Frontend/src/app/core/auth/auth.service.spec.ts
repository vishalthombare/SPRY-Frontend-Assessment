import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../api/api.service';
import { AuthSessionService } from './auth-session.service';
import { AuthUser, LoginResponse } from './auth.model';
import { AuthService } from './auth.service';

describe('AuthService OTP flow', () => {
  const user: AuthUser = {
    id: 7,
    email: 'reviewer@example.com',
    full_name: 'Review User',
    is_superuser: false,
    created_date: '2026-09-26T00:00:00Z',
  };
  const authenticatedResponse: LoginResponse = {
    requires_otp: false,
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    token_type: 'bearer',
    user,
  };

  let api: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  let session: {
    start: ReturnType<typeof vi.fn>;
    setUser: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    user: ReturnType<typeof signal<AuthUser | null>>;
    accessToken: string | null;
  };
  let service: AuthService;

  beforeEach(() => {
    api = { post: vi.fn(), get: vi.fn() };
    session = {
      start: vi.fn(),
      setUser: vi.fn(),
      clear: vi.fn(),
      isAuthenticated: signal(false),
      user: signal<AuthUser | null>(null),
      accessToken: null,
    };
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: api },
        { provide: AuthSessionService, useValue: session },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('does not start a session when login requires an OTP', () => {
    const challenge = {
      requires_otp: true as const,
      challenge_id: 'challenge-one',
      masked_email: 'r*******@example.com',
      expires_in_seconds: 300,
    };
    api.post.mockReturnValue(
      of({ message: 'Verification code sent.', response: challenge, status: 200 }),
    );

    service.login({ email: user.email, password: 'password123' }).subscribe();

    expect(session.start).not.toHaveBeenCalled();
  });

  it('starts a session immediately for a direct login response', () => {
    api.post.mockReturnValue(
      of({ message: 'Signed in successfully.', response: authenticatedResponse, status: 200 }),
    );

    service.login({ email: user.email, password: 'password123' }).subscribe();

    expect(session.start).toHaveBeenCalledWith(authenticatedResponse, user);
  });

  it('starts a session only after successful OTP verification', () => {
    api.post.mockReturnValue(
      of({
        message: 'Verification completed successfully.',
        response: authenticatedResponse,
        status: 200,
      }),
    );

    service.verifyOtp({ challenge_id: 'challenge-one', otp: '123456' }).subscribe();

    expect(session.start).toHaveBeenCalledWith(authenticatedResponse, user);
  });
});
