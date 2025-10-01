import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../../../Services/User/user.service';
import { CommonModule, NgIf, DatePipe, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatisticService } from '../../../../Services/Statistic/statistic.service';

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
    private statisticService: StatisticService
  ) { }

  ngOnInit() {
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
        this.userService.getUserActivePackage(this.userId).subscribe({
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
}
