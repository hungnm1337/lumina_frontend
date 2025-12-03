import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminNotificationService, NotificationDTO, CreateNotificationDTO, UpdateNotificationDTO } from '../../../Services/Notification/admin-notification.service';
import { RoleService } from '../../../Services/Role/role.service';
import { UserService } from '../../../Services/User/user.service';

interface Role {
  id: number;
  name: string;
}

interface User {
  userId: number;
  fullName: string;
  email: string;
  roleName: string;
}

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

  // Recipient selection
  recipientType: 'all' | 'roles' | 'users' = 'all';
  allRoles: Role[] = [];
  allUsers: User[] = [];
  selectedRoleIds: number[] = [];
  selectedUserIds: number[] = [];
  loadingRoles = false;
  loadingUsers = false;
  userSearchTerm = '';
  userCurrentPage = 1;
  userTotalPages = 1;

  constructor(
    private notificationService: AdminNotificationService,
    private roleService: RoleService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.loadNotifications();
    this.loadRoles();
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

  // ==================== LOAD ROLES & USERS ====================

  loadRoles(): void {
    this.loadingRoles = true;
    this.roleService.getAllRoles().subscribe({
      next: (roles) => {
        this.allRoles = roles.map((r: any) => ({ id: r.id, name: r.name }));
        this.loadingRoles = false;
      },
      error: (err) => {
        console.error('Error loading roles:', err);
        this.loadingRoles = false;
      }
    });
  }

  loadUsers(): void {
    this.loadingUsers = true;
    this.userService.getNonAdminUsersPaged(this.userCurrentPage, this.userSearchTerm, '').subscribe({
      next: (response) => {
        this.allUsers = response.data;
        this.userTotalPages = response.totalPages;
        this.loadingUsers = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.loadingUsers = false;
      }
    });
  }

  searchUsers(): void {
    this.userCurrentPage = 1;
    this.loadUsers();
  }

  loadMoreUsers(): void {
    if (this.userCurrentPage < this.userTotalPages) {
      this.userCurrentPage++;
      this.userService.getNonAdminUsersPaged(this.userCurrentPage, this.userSearchTerm, '').subscribe({
        next: (response) => {
          this.allUsers = [...this.allUsers, ...response.data];
          this.userTotalPages = response.totalPages;
        },
        error: (err) => {
          console.error('Error loading more users:', err);
        }
      });
    }
  }

  toggleRoleSelection(roleId: number): void {
    const index = this.selectedRoleIds.indexOf(roleId);
    if (index > -1) {
      this.selectedRoleIds.splice(index, 1);
    } else {
      this.selectedRoleIds.push(roleId);
    }
  }

  toggleUserSelection(userId: number): void {
    const index = this.selectedUserIds.indexOf(userId);
    if (index > -1) {
      this.selectedUserIds.splice(index, 1);
    } else {
      this.selectedUserIds.push(userId);
    }
  }

  isRoleSelected(roleId: number): boolean {
    return this.selectedRoleIds.includes(roleId);
  }

  isUserSelected(userId: number): boolean {
    return this.selectedUserIds.includes(userId);
  }

  onRecipientTypeChange(): void {
    if (this.recipientType === 'users' && this.allUsers.length === 0) {
      this.loadUsers();
    }
    // Reset selections when changing type
    this.selectedRoleIds = [];
    this.selectedUserIds = [];
  }

  // ==================== CREATE ====================

  openCreateModal(): void {
    this.createForm = {
      title: '',
      content: '',
      isActive: true
    };
    this.recipientType = 'all';
    this.selectedRoleIds = [];
    this.selectedUserIds = [];
    this.userSearchTerm = '';
    this.userCurrentPage = 1;
    this.showCreateModal = true;
    this.error = '';
    this.success = '';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.recipientType = 'all';
    this.selectedRoleIds = [];
    this.selectedUserIds = [];
    this.userSearchTerm = '';
    this.userCurrentPage = 1;
  }

  createNotification(): void {
    if (!this.createForm.title || !this.createForm.content) {
      this.error = 'Vui lòng điền đầy đủ thông tin';
      return;
    }

    // Validate recipient selection
    if (this.recipientType === 'roles' && this.selectedRoleIds.length === 0) {
      this.error = 'Vui lòng chọn ít nhất một vai trò';
      return;
    }

    if (this.recipientType === 'users' && this.selectedUserIds.length === 0) {
      this.error = 'Vui lòng chọn ít nhất một người dùng';
      return;
    }

    // Prepare form data based on recipient type
    const formData: CreateNotificationDTO = {
      title: this.createForm.title,
      content: this.createForm.content,
      isActive: this.createForm.isActive
    };

    if (this.recipientType === 'roles') {
      formData.roleIds = this.selectedRoleIds;
    } else if (this.recipientType === 'users') {
      formData.userIds = this.selectedUserIds;
    }
    // If 'all', don't set roleIds or userIds (will send to all users)

    this.loading = true;
    this.error = '';

    this.notificationService.create(formData).subscribe({
      next: () => {
        let successMessage = 'Tạo thông báo thành công! ';
        if (this.recipientType === 'all') {
          successMessage += 'Thông báo đã được gửi đến tất cả người dùng.';
        } else if (this.recipientType === 'roles') {
          successMessage += `Thông báo đã được gửi đến ${this.selectedRoleIds.length} vai trò đã chọn.`;
        } else {
          successMessage += `Thông báo đã được gửi đến ${this.selectedUserIds.length} người dùng đã chọn.`;
        }
        this.success = successMessage;
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
