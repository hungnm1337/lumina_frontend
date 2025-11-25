import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NotificationDTO {
  notificationId: number;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationDTO {
  title: string;
  content: string;
  isActive: boolean;
}

export interface UpdateNotificationDTO {
  title?: string;
  content?: string;
  isActive?: boolean;
}

export interface PaginatedResultDTO<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminNotificationService {
  private apiUrl = `${environment.apiUrl}/admin/notification`;

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      accept: 'application/json',
      'Content-Type': 'application/json',
    });
  }

  constructor(private http: HttpClient) {}

  // Get paginated notifications
  getAll(page: number = 1, pageSize: number = 10): Observable<PaginatedResultDTO<NotificationDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PaginatedResultDTO<NotificationDTO>>(this.apiUrl, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  // Get notification by ID
  getById(id: number): Observable<NotificationDTO> {
    return this.http.get<NotificationDTO>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Create notification
  create(dto: CreateNotificationDTO): Observable<NotificationDTO> {
    return this.http.post<NotificationDTO>(this.apiUrl, dto, {
      headers: this.getAuthHeaders()
    });
  }

  // Update notification
  update(id: number, dto: UpdateNotificationDTO): Observable<NotificationDTO> {
    return this.http.put<NotificationDTO>(`${this.apiUrl}/${id}`, dto, {
      headers: this.getAuthHeaders()
    });
  }

  // Delete notification
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }
}
