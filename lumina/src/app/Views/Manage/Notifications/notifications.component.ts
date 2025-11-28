import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, UserNotificationDTO } from '../../../Services/Notification/notification.service';
import { SignalRService, RealtimeNotification } from '../../../Services/SignalR/signalr.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-manager-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class ManagerNotificationsComponent implements OnInit, OnDestroy {
  notifications: UserNotificationDTO[] = [];
  unreadCount = 0;
  loading = false;
  error = '';
  
  // Tabs
  activeTab: 'all' | 'unread' = 'all';
  
  // Auto refresh interval
  private refreshInterval: any;
  private signalRSubscription?: Subscription;
  private unreadCountSubscription?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private signalRService: SignalRService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.loadUnreadCount();
    
    // Subscribe to unread count updates
    this.unreadCountSubscription = this.notificationService.unreadCount$.subscribe(
      count => this.unreadCount = count
    );
    
    // Auto refresh every minute to update relative time
    this.refreshInterval = setInterval(() => {
      this.loadNotifications();
    }, 60000);

    // Listen for realtime notifications from SignalR
    this.signalRSubscription = this.signalRService.notificationReceived$.subscribe(
      (notification: RealtimeNotification) => {
        console.log('📢 Realtime notification received:', notification);
        this.loadNotifications();
        this.loadUnreadCount();
      }
    );
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.signalRSubscription) {
      this.signalRSubscription.unsubscribe();
    }
    if (this.unreadCountSubscription) {
      this.unreadCountSubscription.unsubscribe();
    }
  }

  loadNotifications(): void {
    this.loading = true;
    this.error = '';

    this.notificationService.getMyNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Không thể tải thông báo';
        console.error(err);
        this.loading = false;
      }
    });
  }

  loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (response) => {
        this.unreadCount = response.unreadCount;
      },
      error: (err) => {
        console.error('Failed to load unread count:', err);
      }
    });
  }

  get filteredNotifications(): UserNotificationDTO[] {
    if (this.activeTab === 'unread') {
      return this.notifications.filter(n => !n.isRead);
    }
    return this.notifications;
  }

  markAsRead(notification: UserNotificationDTO): void {
    if (notification.isRead) return;

    this.notificationService.markAsRead(notification.uniqueId).subscribe({
      next: () => {
        notification.isRead = true;
        this.loadUnreadCount();
      },
      error: (err) => {
        console.error('Failed to mark as read:', err);
      }
    });
  }

  markAllAsRead(): void {
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    
    unreadNotifications.forEach(notification => {
      this.notificationService.markAsRead(notification.uniqueId).subscribe({
        next: () => {
          notification.isRead = true;
        },
        error: (err) => {
          console.error('Failed to mark as read:', err);
        }
      });
    });

    this.loadUnreadCount();
  }

  getRelativeTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);

    if (diffInSeconds < 0) return 'Vừa xong';
    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} phút trước`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} giờ trước`;
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ngày trước`;
    }
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatFullDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  trackByUniqueId(index: number, item: UserNotificationDTO): number {
    return item.uniqueId;
  }
}

