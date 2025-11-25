import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminNotificationService, NotificationDTO, CreateNotificationDTO, UpdateNotificationDTO } from '../../../Services/Notification/admin-notification.service';

@Component({
  selector: 'app-notification-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-management.component.html',
  styleUrls: ['./notification-management.component.css']
})
export class NotificationManagementComponent implements OnInit {
  // Data
  notifications: NotificationDTO[] = [];
  selectedNotification: NotificationDTO | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalItems = 0;

  // Modal states
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showDetailModal = false;

  // Form data
  createForm: CreateNotificationDTO = {
    title: '',
    content: '',
    isActive: true
  };

  editForm: UpdateNotificationDTO = {
    title: '',
    content: ''
  };

  // Loading & Error
  loading = false;
  error = '';
  success = '';

  // Tab
  activeTab: 'all' = 'all';

  constructor(private notificationService: AdminNotificationService) { }

  ngOnInit(): void {
    this.loadNotifications();
  }

  // ==================== LOAD DATA ====================

  loadNotifications(): void {
    this.loading = true;
    this.error = '';

    this.notificationService.getAll(this.currentPage, this.pageSize).subscribe({
      next: (result) => {
        this.notifications = result.items;
        this.totalPages = Math.ceil(result.total / this.pageSize);
        this.totalItems = result.total;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Không thể tải danh sách thông báo';
        console.error(err);
        this.loading = false;
      }
    });
  }

  // ==================== PAGINATION ====================

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadNotifications();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadNotifications();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadNotifications();
    }
  }

  // ==================== CREATE ====================

  openCreateModal(): void {
    this.createForm = {
      title: '',
      content: '',
      isActive: true
    };
    this.showCreateModal = true;
    this.error = '';
    this.success = '';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  createNotification(): void {
    if (!this.createForm.title || !this.createForm.content) {
      this.error = 'Vui lòng điền đầy đủ thông tin';
      return;
    }

    this.loading = true;
    this.error = '';

    this.notificationService.create(this.createForm).subscribe({
      next: () => {
        this.success = 'Tạo thông báo thành công! Thông báo đã được gửi đến tất cả người dùng.';
        this.closeCreateModal();
        this.loadNotifications();
        this.loading = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        this.error = 'Không thể tạo thông báo';
        console.error(err);
        this.loading = false;
      }
    });
  }

  // ==================== EDIT ====================

  openEditModal(notification: NotificationDTO): void {
    this.selectedNotification = notification;
    this.editForm = {
      title: notification.title,
      content: notification.content
    };
    this.showEditModal = true;
    this.error = '';
    this.success = '';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedNotification = null;
  }

  updateNotification(): void {
    if (!this.selectedNotification) return;

    if (!this.editForm.title && !this.editForm.content) {
      this.error = 'Vui lòng điền ít nhất một trường để cập nhật';
      return;
    }

    this.loading = true;
    this.error = '';

    this.notificationService.update(this.selectedNotification.notificationId, this.editForm).subscribe({
      next: () => {
        this.success = 'Cập nhật thông báo thành công!';
        this.closeEditModal();
        this.loadNotifications();
        this.loading = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        this.error = 'Không thể cập nhật thông báo';
        console.error(err);
        this.loading = false;
      }
    });
  }

  // ==================== DELETE ====================

  openDeleteModal(notification: NotificationDTO): void {
    this.selectedNotification = notification;
    this.showDeleteModal = true;
    this.error = '';
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedNotification = null;
  }

  deleteNotification(): void {
    if (!this.selectedNotification) return;

    this.loading = true;
    this.error = '';

    this.notificationService.delete(this.selectedNotification.notificationId).subscribe({
      next: () => {
        this.success = 'Xóa thông báo thành công!';
        this.closeDeleteModal();
        this.loadNotifications();
        this.loading = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        this.error = 'Không thể xóa thông báo';
        console.error(err);
        this.loading = false;
      }
    });
  }

  // ==================== DETAIL ====================

  openDetailModal(notification: NotificationDTO): void {
    this.selectedNotification = notification;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedNotification = null;
  }

  // ==================== HELPERS ====================

  formatDate(date: string): string {
    return new Date(date).toLocaleString('vi-VN');
  }

  truncateText(text: string, length: number): string {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  }
}
