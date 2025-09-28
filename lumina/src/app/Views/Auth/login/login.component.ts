import { Component, OnInit, NgZone } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../Services/Auth/auth.service';
import { ToastService } from '../../../Services/Toast/toast.service';
import { LoginRequest } from '../../../Interfaces/auth.interfaces';
import { environment } from '../../../../environments/environment';

// Khai báo biến global 'google' để TypeScript không báo lỗi
declare var google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  passwordVisible = false;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private zone: NgZone // Đảm bảo NgZone đã được inject
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false],
    });
  }

  ngOnInit(): void {
    // Khởi tạo Google Sign-In
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: this.handleGoogleSignIn.bind(this),
    });

    // Render nút Google
    google.accounts.id.renderButton(document.getElementById('googleBtn'), {
      theme: 'outline',
      size: 'large',
      width: '300',
      text: 'signin_with',
    });
  }

  // === PHẦN ĐƯỢC SỬA LẠI CHO ĐÚNG ===
  handleGoogleSignIn(response: any): void {
    this.isLoading = true;
    const idToken = response.credential;

    // Gọi phương thức googleLogin từ authService
    this.authService.googleLogin(idToken).subscribe({
      next: () => {
        // NgZone.run() rất quan trọng vì callback của Google chạy bên ngoài "zone" của Angular.
        // Lệnh này đảm bảo việc điều hướng diễn ra bên trong zone để Angular cập nhật giao diện.
        this.zone.run(() => {
          this.isLoading = false;
          this.toastService.success('Đăng nhập bằng Google thành công!');
          this.router.navigate(['/homepage/user-dashboard']);
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.isLoading = false;
          this.toastService.error(
            err.error?.error || 'Đăng nhập bằng Google thất bại.'
          );
        });
      },
    });
  }
  // === KẾT THÚC PHẦN SỬA ===

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.toastService.error('Vui lòng điền đầy đủ thông tin hợp lệ.');
      return;
    }

    this.isLoading = true;
    const request: LoginRequest = this.loginForm.value;

    this.authService.login(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.toastService.success('Đăng nhập thành công!');
        this.router.navigate(['/homepage/user-dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.error(
          err.error?.error || 'Đã có lỗi xảy ra. Vui lòng thử lại.'
        );
      },
    });
  }
}
