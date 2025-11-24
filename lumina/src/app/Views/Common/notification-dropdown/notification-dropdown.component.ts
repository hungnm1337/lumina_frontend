import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationDTO } from '../../../Services/Notification/notification.service';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-dropdown.component.html',
  styleUrl: './notification-dropdown.component.scss'
})
export class NotificationDropdownComponent implements OnInit {
  notifications: NotificationDTO[] = [];
  unreadCount = 0;
  isOpen = false;
  isLoading = false;

  constructor(public notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.notificationService.getMyNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.isLoading = false;
      }
    });
  }

  markAsRead(notification: NotificationDTO): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.notificationId).subscribe({
        next: () => {
          notification.isRead = true;
        },
        error: (error) => console.error('Error marking as read:', error)
      });
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
      },
      error: (error) => console.error('Error marking all as read:', error)
    });
  }

  deleteNotification(notificationId: number, event: Event): void {
    event.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa thông báo này?')) {
      this.notificationService.delete(notificationId).subscribe({
        next: () => {
          this.notifications = this.notifications.filter(n => n.notificationId !== notificationId);
        },
        error: (error) => console.error('Error deleting notification:', error)
      });
    }
  }
}
