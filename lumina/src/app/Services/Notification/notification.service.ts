import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface NotificationDTO {
  notificationId: number;
  userId: number;
  title: string;
  message: string;
  type: 'Khuyến khích' | 'Thành tích' | 'Cảnh báo';
  isRead: boolean;
  createAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      accept: 'application/json',
      'Content-Type': 'application/json',
    });
  }

  constructor(private http: HttpClient) {
    // Load unread count on init
    this.loadUnreadCount();
  }

  // Get all notifications for current user
  getMyNotifications(unreadOnly: boolean = false): Observable<NotificationDTO[]> {
    const url = unreadOnly ? `${this.apiUrl}/unread` : this.apiUrl;
    return this.http.get<NotificationDTO[]>(url, { headers: this.getAuthHeaders() }).pipe(
      tap(() => this.loadUnreadCount())
    );
  }

  // Get unread count
  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`, { 
      headers: this.getAuthHeaders() 
    });
  }

  // Mark notification as read
  markAsRead(notificationId: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${notificationId}/read`, {}, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap(() => this.loadUnreadCount())
    );
  }

  // Mark all as read
  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/mark-all-read`, {}, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap(() => this.loadUnreadCount())
    );
  }

  // Delete notification
  delete(notificationId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${notificationId}`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap(() => this.loadUnreadCount())
    );
  }

  // Load and update unread count
  private loadUnreadCount(): void {
    this.getUnreadCount().subscribe({
      next: (response) => this.unreadCountSubject.next(response.count),
      error: (error) => console.error('Error loading unread count:', error)
    });
  }

  // Helper methods
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'Khuyến khích': return '💪';
      case 'Thành tích': return '🏆';
      case 'Cảnh báo': return '⚠️';
      default: return '📢';
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'Khuyến khích': return 'bg-blue-100 text-blue-800';
      case 'Thành tích': return 'bg-yellow-100 text-yellow-800';
      case 'Cảnh báo': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  }
}
