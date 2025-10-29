import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../../../Services/User/user.service';
import { CommonModule, NgIf, DatePipe, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatisticService } from '../../../../Services/Statistic/statistic.service';
import { PackagesService } from '../../../../Services/Packages/packages.service';
import { RoleService } from '../../../../Services/Role/role.service';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, NgIf, DatePipe, NgFor, FormsModule],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss']
})
export class UserDetailComponent implements OnInit {
  user: any = null;
  userId!: number;
  activePackage: any = null;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  proSummary: any = {};

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private statisticService: StatisticService,
    private packagesService: PackagesService,
    private roleService: RoleService
  ) { }

ngOnInit() {
  this.initData();
}

  initData() {
  this.route.params.subscribe(params => {
    this.userId = +params['id'];
    this.loadUserDetail();
    this.loadUserProSummary();
  });
}

  loadUserDetail() {
    this.isLoading = true;
    this.errorMessage = null;

    this.userService.getUserById(this.userId).subscribe({
      next: (data) => {
        this.user = data;

        // Lấy gói active thêm
        this.packagesService.getUserActivePackage(this.userId).subscribe({
          next: (pkg) => {
            this.activePackage = pkg;
            this.isLoading = false;
          },
          error: () => {
            this.activePackage = null;
            this.isLoading = false;
          }
        });

      },
      error: (err) => {
        this.errorMessage = 'Không tải được thông tin người dùng.';
        this.isLoading = false;
      }
    });
  }

   loadUserProSummary() {
    this.statisticService.getUserProSummary(this.userId).subscribe({
      next: (summary) => {
        this.proSummary = summary;
        this.isLoading = false;
      },
      error: () => {
        this.proSummary = {};
        this.isLoading = false;
      }
    });
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

  roles: any[] = [];
selectedRoleId!: number;
showRoleModal = false;

openRoleModal() {
  this.showRoleModal = true;
  this.roleService.getAllRoles().subscribe({
    next: (data) => {
      this.roles = data;
      this.selectedRoleId = this.user.roleId; 
    }
  });
}

saveRole() {
  if (this.selectedRoleId === this.user.roleId) {
    this.showRoleModal = false;
    return; 
  }

  this.userService.updateUserRole(this.user.userId, this.selectedRoleId).subscribe({
    next: () => {
      this.user.roleId = this.selectedRoleId;
      const role = this.roles.find(r => r.roleId === this.selectedRoleId);
      if (role) this.user.roleName = role.roleName;
      this.showRoleModal = false;
      this.showMessage('Cập nhật quyền thành công!', 'success');
      this.initData();
    },
    error: () => {
      this.showMessage('Có lỗi khi cập nhật quyền!', 'error');
      this.showRoleModal = false;
    }
  });
}

message: string = '';
messageType: 'success' | 'error' = 'success';

showMessage(msg: string, type: 'success' | 'error' = 'success') {
  this.message = msg;
  this.messageType = type;
  setTimeout(() => this.message = '', 3000);
}


}
