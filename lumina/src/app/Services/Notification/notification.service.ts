import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { tap, switchMap, startWith } from 'rxjs/operators';
import { SignalRService } from '../SignalR/signalr.service';
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

  constructor(
    private http: HttpClient,
    private signalRService: SignalRService
  ) {
    // Load unread count on init
    this.loadUnreadCount();
    
    // Poll for new notifications every 30 seconds
    interval(30000)
      .pipe(startWith(0))
      .subscribe(() => this.loadUnreadCount());

    // ✅ Listen for realtime notifications and refresh count
    this.signalRService.notificationReceived$.subscribe(() => {
      // console.log('Notification received, refreshing count...');
      this.loadUnreadCount();
    });
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
      next: (response) => {
        // console.log('[NotificationService] Unread count loaded:', response.unreadCount);
        this.unreadCountSubject.next(response.unreadCount);
      },
      error: (error) => {
        // console.error('[NotificationService] Error loading unread count:', error);
      }
    });
  }

  // Public method to force refresh unread count
  public refreshUnreadCount(): void {
    // console.log('[NotificationService] Force refreshing unread count...');
    this.loadUnreadCount();
  }

  // Helper methods
  getNotificationIcon(type?: string): string {
    return '📢'; // System notification icon
  }

  getNotificationColor(type?: string): string {
    return 'bg-blue-100 text-blue-800'; // System notification color
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Không xác định';
    
    const now = new Date();
    
    // Parse date - handle both UTC and local time formats
    let date: Date;
    
    // If string doesn't end with 'Z' but looks like ISO format, treat as UTC
    if (dateString.includes('T') && !dateString.endsWith('Z') && !dateString.includes('+')) {
      date = new Date(dateString + 'Z'); // Force UTC parsing
    } else {
      date = new Date(dateString);
    }
    
    // If date is invalid, try alternative parsing
    if (isNaN(date.getTime())) {
      date = new Date(dateString.replace(' ', 'T'));
    }
    
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 0) return 'Vừa xong';
    if (diffSeconds < 60) return 'Vừa xong';
    
    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    
    const hours = Math.floor(diffSeconds / 3600);
    if (hours < 24) return `${hours} giờ trước`;
    
    const days = Math.floor(diffSeconds / 86400);
    if (days < 7) return `${days} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  }
}
