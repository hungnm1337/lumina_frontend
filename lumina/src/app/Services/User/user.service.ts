import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface UserDto {
  userId: number;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  phone?: string | null;
  isActive?: boolean | null;
  joinDate?: string | null;
}

export interface UpdateUserProfileRequest {
  fullName: string;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {

  baseUrl = `${environment.apiUrl}/User`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    // Đọc đúng key token
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'application/json',
    });
  }

  getNonAdminUsersPaged(
    pageNumber: number,
    searchTerm: string = '',
    role: string = ''
  ): Observable<{ data: any[]; totalPages: number }> {
    let url = `${this.baseUrl}/non-admin-users?pageNumber=${pageNumber}`;
    if (searchTerm) url += `&searchTerm=${encodeURIComponent(searchTerm)}`;
    if (role && role !== 'Tất cả vai trò') url += `&roleName=${encodeURIComponent(role)}`;
    return this.http.get<{ data: any[]; totalPages: number }>(url, {
      headers: this.getAuthHeaders(),
    });
  }

  // Profile
  getProfile(): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.baseUrl}/profile`, {
      headers: this.getAuthHeaders(),
    });
  }

  updateProfile(body: UpdateUserProfileRequest): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.baseUrl}/profile`, body, {
      headers: this.getAuthHeaders(),
    });
  }

  changePassword(body: { currentPassword: string; newPassword: string }) {
    return this.http.put<void>(`${this.baseUrl}/profile/change-password`, body, {
      headers: this.getAuthHeaders(),
    });
  }

toggleUserStatus(userId: number): Observable<any> {
  return this.http.patch(
    `${this.baseUrl}/${userId}/toggle-status`,
    {},
    { headers: this.getAuthHeaders() }
  );
}

getUserById(userId: number): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/${userId}`, { headers: this.getAuthHeaders() });
}


updateUserRole(userId: number, roleId: number): Observable<any> {
  return this.http.put(
    `${this.baseUrl}/update-role?userId=${userId}&roleId=${roleId}`,
    {},
    { headers: this.getAuthHeaders() }
  );
}


}

