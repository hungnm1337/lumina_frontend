import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { tap, switchMap, startWith } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UserNotificationDTO {
  uniqueId: number;
  userId: number;
  notificationId: number;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/usernotification`;
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
    
    // Poll for new notifications every 30 seconds
    interval(30000)
      .pipe(startWith(0))
      .subscribe(() => this.loadUnreadCount());
  }

  // Get all notifications for current user
  getMyNotifications(): Observable<UserNotificationDTO[]> {
    return this.http.get<UserNotificationDTO[]>(this.apiUrl, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap(() => this.loadUnreadCount())
    );
  }

  // Get unread count
  getUnreadCount(): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>(`${this.apiUrl}/unread-count`, { 
      headers: this.getAuthHeaders() 
    });
  }

  // Mark notification as read
  markAsRead(uniqueId: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${uniqueId}/read`, {}, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap(() => this.loadUnreadCount())
    );
  }

  // Load and update unread count
  private loadUnreadCount(): void {
    this.getUnreadCount().subscribe({
      next: (response) => this.unreadCountSubject.next(response.unreadCount),
      error: (error) => console.error('Error loading unread count:', error)
    });
  }

  // Helper methods
  getNotificationIcon(type?: string): string {
    return '📢'; // System notification icon
  }

  getNotificationColor(type?: string): string {
    return 'bg-blue-100 text-blue-800'; // System notification color
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
