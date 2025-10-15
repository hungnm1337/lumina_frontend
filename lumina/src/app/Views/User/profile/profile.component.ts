import {
  Component,
  OnInit,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  UserService,
  UserDto,
  UpdateUserProfileRequest,
} from '../../../Services/User/user.service';
import { ToastrService } from 'ngx-toastr';
import { HeaderComponent } from '../../Common/header/header.component';
import { AuthService } from '../../../Services/Auth/auth.service';
import { Router } from '@angular/router';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  loading = signal(false);
  passwordLoading = signal(false);
  editing = signal(false);
  profile = signal<UserDto | null>(null);
  avatarStatus = '';
  passwordStatus = '';
  passwordMessage = '';

  form: UpdateUserProfileRequest = {
    fullName: '',
    phone: '',
    bio: '',
    avatarUrl: '',
  };

  passwordForm: PasswordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  constructor(
    private userService: UserService,
    private toast: ToastrService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Kiểm tra xem user đã đăng nhập chưa
    this.authService.currentUser$.subscribe((user) => {
      if (!user) {
        // Nếu chưa đăng nhập, chuyển hướng đến trang login
        this.router.navigate(['/login']);
        return;
      }
      // Nếu đã đăng nhập, tải thông tin profile
      this.fetch();
    });
  }

  fetch(): void {
    this.loading.set(true);
    this.userService.getProfile().subscribe({
      next: (u) => {
        this.profile.set(u);
        this.form = {
          fullName: u.fullName ?? '',
          phone: u.phone ?? '',
          bio: u.bio ?? '',
          avatarUrl: u.avatarUrl ?? '',
        };
      },
      error: () => this.toast.error('Không thể tải hồ sơ'),
      complete: () => this.loading.set(false),
    });
  }

  startEdit(): void {
    this.editing.set(true);
  }

  cancel(): void {
    const u = this.profile();
    if (u) {
      this.form = {
        fullName: u.fullName ?? '',
        phone: u.phone ?? '',
        bio: u.bio ?? '',
        avatarUrl: u.avatarUrl ?? '',
      };
    }
    this.editing.set(false);
    this.avatarStatus = '';
  }

  save(): void {
    if (!this.editing()) {
      this.startEdit();
      return;
    }

    // Validate fullName
    if (!this.form.fullName || this.form.fullName.trim().length === 0) {
      this.toast.error('Tên không được để trống');
      return;
    }

    this.loading.set(true);
    this.userService.updateProfile(this.form).subscribe({
      next: (u) => {
        this.profile.set(u);
        this.editing.set(false);
        this.avatarStatus = '';
        this.toast.success('Cập nhật hồ sơ thành công');
      },
      error: (err) => {
        console.error('Update profile error:', err);
        const errorMessage = err.error?.message || 'Cập nhật thất bại';
        const errors = err.error?.errors;
        if (errors && errors.length > 0) {
          this.toast.error(`${errorMessage}: ${errors.join(', ')}`);
        } else {
          this.toast.error(errorMessage);
        }
      },
      complete: () => this.loading.set(false),
    });
  }

  changePassword(): void {
    // Validation
    if (!this.passwordForm.currentPassword) {
      this.passwordStatus = 'error';
      this.passwordMessage = 'Vui lòng nhập mật khẩu hiện tại';
      return;
    }

    if (!this.passwordForm.newPassword) {
      this.passwordStatus = 'error';
      this.passwordMessage = 'Vui lòng nhập mật khẩu mới';
      return;
    }

    if (this.passwordForm.newPassword.length < 8) {
      this.passwordStatus = 'error';
      this.passwordMessage = 'Mật khẩu mới phải có ít nhất 8 ký tự';
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordStatus = 'error';
      this.passwordMessage = 'Mật khẩu xác nhận không khớp';
      return;
    }

    if (this.passwordForm.newPassword === this.passwordForm.currentPassword) {
      this.passwordStatus = 'error';
      this.passwordMessage = 'Mật khẩu mới phải khác mật khẩu hiện tại';
      return;
    }

    this.passwordLoading.set(true);
    this.passwordStatus = '';
    this.passwordMessage = '';

    this.userService
      .changePassword({
        currentPassword: this.passwordForm.currentPassword,
        newPassword: this.passwordForm.newPassword,
      })
      .subscribe({
        next: () => {
          this.passwordStatus = 'success';
          this.passwordMessage = 'Đổi mật khẩu thành công';
          this.passwordForm = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          };
          this.toast.success('Đổi mật khẩu thành công');
          this.passwordLoading.set(false);
        },
        error: (error) => {
          this.passwordStatus = 'error';
          if (error.error?.message) {
            this.passwordMessage = error.error.message;
          } else {
            this.passwordMessage =
              'Đổi mật khẩu thất bại. Vui lòng kiểm tra mật khẩu hiện tại.';
          }
          this.toast.error(this.passwordMessage);
          this.passwordLoading.set(false);
        },
      });
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.avatarStatus = 'File không hợp lệ';
      this.toast.error('Vui lòng chọn file ảnh');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      this.avatarStatus = 'File quá lớn (tối đa 5MB)';
      this.toast.error('File quá lớn, vui lòng chọn file nhỏ hơn 5MB');
      return;
    }

    this.avatarStatus = 'Đang tải ảnh...';

    // Tạo URL tạm thời để preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.form.avatarUrl = result;
      this.avatarStatus = 'Đã cập nhật ảnh đại diện';

      // Cập nhật profile để hiển thị ảnh mới
      const currentProfile = this.profile();
      if (currentProfile) {
        this.profile.set({ ...currentProfile, avatarUrl: result });
      }
    };
    reader.readAsDataURL(file);
  }
}
