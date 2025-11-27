import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../Services/Auth/auth.service';
import { ToastService } from '../../../Services/Toast/toast.service';
import {
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../../../Interfaces/auth.interfaces';
import { HeaderComponent } from "../../Common/header/header.component";

export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');
  return password && confirmPassword && password.value !== confirmPassword.value
    ? { passwordMismatch: true }
    : null;
};

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HeaderComponent],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  currentStep = 1; // 1: Enter email, 2: Reset password
  emailForm: FormGroup;
  resetForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.resetForm = this.fb.group(
      {
        otpCode: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordMatchValidator }
    );
  }

  onEmailSubmit(): void {
    if (this.emailForm.invalid) {
      this.toastService.error('Vui lòng nhập một địa chỉ email hợp lệ.');
      return;
    }
    this.isLoading = true;
    const request: ForgotPasswordRequest = this.emailForm.value;

    this.authService.forgotPassword(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.toastService.success(
          response.message || 'Mã OTP đã được gửi đến email của bạn.'
        );
        this.currentStep = 2;
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.error(
          err.error?.error || 'Email không tồn tại trong hệ thống.'
        );
      },
    });
  }

  onResetSubmit(): void {
    if (this.resetForm.invalid) {
      if (this.resetForm.errors?.['passwordMismatch']) {
        this.toastService.error('Mật khẩu nhập lại không khớp.');
      } else {
        this.toastService.error('Vui lòng điền đầy đủ thông tin hợp lệ.');
      }
      return;
    }
    this.isLoading = true;
    const request: ResetPasswordRequest = {
      email: this.emailForm.value.email,
      ...this.resetForm.value,
    };

    this.authService.resetPassword(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.toastService.success(
          response.message || 'Đặt lại mật khẩu thành công!'
        );
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.error(
          err.error?.error || 'Mã OTP không hợp lệ hoặc đã hết hạn.'
        );
      },
    });
  }
}
