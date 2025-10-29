import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, UserMilestoneNotificationDTO } from '../../../Services/Notification/notification.service';

@Component({
  selector: 'app-user-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-notifications.component.html',
  styleUrls: ['./user-notifications.component.scss']
})
export class UserNotificationsComponent implements OnInit {
  notifications: UserMilestoneNotificationDTO[] = [];
  isLoading = false;
  error: string | null = null;
  userId: number | null = null;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    // Get user ID from localStorage or auth service
    const userStr = localStorage.getItem('lumina_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.userId = user.userId;
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    if (!this.userId) return;
    
    this.isLoading = true;
    this.error = null;
    
    this.notificationService.getUserNotifications(this.userId).subscribe({
      next: (notifications) => {
        this.notifications = notifications || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Không thể tải thông báo';
        this.isLoading = false;
      }
    });
  }

  markAsRead(notificationId: number): void {
    this.notificationService.markNotificationAsRead(notificationId).subscribe({
      next: () => {
        const notification = this.notifications.find(n => n.notificationId === notificationId);
        if (notification) {
          notification.isRead = true;
        }
      },
      error: (err) => {
        console.error('Error marking notification as read:', err);
      }
    });
  }

  getNotificationIcon(notificationType: string): string {
    switch (notificationType) {
      case 'achievement':
        return 'fas fa-trophy text-yellow-500';
      case 'encouragement':
        return 'fas fa-heart text-red-500';
      case 'warning':
        return 'fas fa-exclamation-triangle text-orange-500';
      default:
        return 'fas fa-bell text-blue-500';
    }
  }

  getNotificationClass(notificationType: string): string {
    switch (notificationType) {
      case 'achievement':
        return 'bg-yellow-50 border-yellow-200';
      case 'encouragement':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  }
}


