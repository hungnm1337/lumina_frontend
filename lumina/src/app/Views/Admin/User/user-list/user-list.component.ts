import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor, CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../../Services/User/user.service';
import { RoleService } from '../../../../Services/Role/role.service';
import { RouterLink } from '@angular/router'; 

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [NgIf, NgFor, CommonModule, FormsModule, DatePipe, RouterLink],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  roles: any[] = [];
  searchTerm: string = '';
  selectedRole: string = 'Tất cả vai trò';
  isLoading: boolean = true;
  errorMessage: string | null = null;

  pageNumber: number = 1;
  totalPages: number = 1;
  pageSize: number = 6;

  constructor(
    private userService: UserService,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.roleService.getAllRoles().subscribe({
      next: (rolesData) => {
        this.roles = rolesData;
        console.log('Tải danh sách vai trò thành công:', rolesData);
      },
      error: (err) => {
        console.error('Lỗi khi tải vai trò:', err);
      }
    });

    this.loadUsersPage(this.pageNumber);
  }

filterUsers(): void {
  this.pageNumber = 1; // khi filter đổi trang về 1
  this.loadUsersPage(this.pageNumber);
}

loadUsersPage(page: number): void {
  this.isLoading = true;
  this.errorMessage = null;

  this.userService.getNonAdminUsersPaged(page, this.searchTerm, this.selectedRole)
    .subscribe({
      next: (response) => {
        this.allUsers = response.data;
        this.filteredUsers = this.allUsers;
        this.totalPages = response.totalPages;
        this.pageNumber = page;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Không thể tải dữ liệu.';
        this.isLoading = false;
      }
    });
}



applyFilters(): void {
  let users = this.allUsers;

  if (this.selectedRole !== 'Tất cả vai trò') {
    users = users.filter(user => user.roleName === this.selectedRole);
  }

  if (this.searchTerm) {
    const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
    users = users.filter(user =>
      user.fullName.toLowerCase().includes(lowerCaseSearchTerm) ||
      user.email.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }

  this.filteredUsers = users;
}

toggleStatus(user: any): void {
  const action = user.isActive ? 'khóa' : 'mở khóa';
  if (confirm(`Bạn có chắc muốn ${action} tài khoản của ${user.fullName}?`)) {
    this.userService.toggleUserStatus(user.userId).subscribe({
      next: () => {
        user.isActive = !user.isActive; // Tự cập nhật trạng thái local cho nhanh UI, load lại trang nếu muốn chắc chắn hơn
      },
      error: () => {
        alert('Có lỗi khi thay đổi trạng thái người dùng!');
      }
    });
  }
}


  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.pageNumber) {
      this.loadUsersPage(page);
    }
  }
}
