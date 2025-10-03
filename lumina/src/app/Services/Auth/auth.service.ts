import { environment } from './../../../environments/environment.development';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import {
  AuthUserResponse,
  ForgotPasswordRequest,
  GenericAuthResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
} from '../../Interfaces/auth.interfaces';
import { Router } from '@angular/router';
import { GoogleLoginRequest } from '../../Interfaces/auth.interfaces';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
private tokenKey = 'authToken';
  private currentUserSource = new BehaviorSubject<AuthUserResponse | null>(
    null
  );
  currentUser$ = this.currentUserSource.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadInitialUser();
  }

  private loadInitialUser() {
    const user = localStorage.getItem('lumina_user');
    if (user) {
      this.currentUserSource.next(JSON.parse(user));
    }
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, request).pipe(
      tap((response) => {
        this.setSession(response);
      })
    );
  }
  googleLogin(idToken: string): Observable<LoginResponse> {
    const request: GoogleLoginRequest = { token: idToken };
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/google-login`, request)
      .pipe(
        tap((response) => {
          this.setSession(response);
        })
      );
  }
  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, request);
  }

  forgotPassword(
    request: ForgotPasswordRequest
  ): Observable<GenericAuthResponse> {
    return this.http.post<GenericAuthResponse>(
      `${this.apiUrl}/forgot-password`,
      request
    );
  }

  resetPassword(
    request: ResetPasswordRequest
  ): Observable<GenericAuthResponse> {
    return this.http.post<GenericAuthResponse>(
      `${this.apiUrl}/forgot-password/reset`,
      request
    );
  }

 logout() {
    localStorage.removeItem('lumina_token');
    localStorage.removeItem('lumina_user');
    this.currentUserSource.next(null);
    this.router.navigate(['/login']); 
  }

  private setSession(authResponse: LoginResponse) {
    localStorage.setItem('lumina_token', authResponse.token);
    localStorage.setItem('lumina_user', JSON.stringify(authResponse.user));
    this.currentUserSource.next(authResponse.user);
  }

  getCurrentUser(): AuthUserResponse | null {
    return this.currentUserSource.value;
  }

getDecodedToken(): any | null {
  const token = localStorage.getItem('lumina_token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1] || ''));
  } catch {
    return null;
  }
}

getRoleClaim(): string | null {
  const payload = this.getDecodedToken();
  if (!payload) return null;
  return (
    payload['role'] ||
    payload['roles'] ||
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
    null
  );
}

getRoleId(): number | null {
  const payload = this.getDecodedToken();
  if (!payload) return null;
  // backend có thể đặt claim roleId hoặc map từ role name
  const byId = payload['roleId'] || payload['RoleId'];
  if (byId && !isNaN(Number(byId))) return Number(byId);
  // fallback: map từ tên role
  const role = (this.getRoleClaim() || '').toString().toLowerCase();
  if (!role) return null;
  if (role.includes('admin')) return 1;
  if (role.includes('manager')) return 2;
  if (role.includes('staff')) return 3;
  if (role.includes('user')) return 4;
  return null;
}

navigateByRole(): void {
  const roleId = this.getRoleId();
  switch (roleId) {
    case 1:
      this.router.navigate(['/admin']);
      break;
    case 2:
      this.router.navigate(['/manager']);
      break;
    case 3:
      this.router.navigate(['/staff/dashboard']);
      break;
    case 4:
    default:
      this.router.navigate(['/homepage/user-dashboard']);
      break;
  }
}
}
