import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../../../Services/Auth/auth.service';
import { ToastService } from '../../../Services/Toast/toast.service';
import { RegisterRequest } from '../../../Interfaces/auth.interfaces';

/**
 * Custom validator to check that two fields match.
 */
export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) {
    return null;
  }

  if (confirmPassword.errors && !confirmPassword.errors['passwordMismatch']) {
    return null;
  }

  if (password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  } else {
    // Clear the error if passwords match
    confirmPassword.setErrors(null);
    return null;
  }
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  passwordVisible = false;
  confirmPasswordVisible = false; // Added for separate control

  passwordStrength = {
    width: '0%',
    text: 'Yếu',
    color: 'bg-red-500'
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
        Validators.pattern('^[a-zA-Z0-9_.-]+$')
      ]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
      confirmPassword: ['', [Validators.required]],
      // FormControl 'terms' đã được xóa bỏ hoàn toàn
    }, {
      validators: passwordMatchValidator
    });

    this.f['password'].valueChanges.subscribe(value => {
      this.updatePasswordStrength(value || '');
    });
  }

  // Convenience getter for easy access to form fields
  get f() {
    return this.registerForm.controls;
  }

  // Logic to toggle password visibility is now handled in the template with separate variables
  // (click)="passwordVisible = !passwordVisible"

  updatePasswordStrength(password: string): void {
    let score = 0;
    if (!password) {
      this.passwordStrength = { width: '0%', text: 'Yếu', color: 'bg-red-500' };
      return;
    }

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const percentage = Math.min(100, score * 20);
    let text = 'Rất yếu';
    let color = 'bg-red-500';

    if (percentage >= 80) {
      text = 'Rất mạnh';
      color = 'bg-green-500';
    } else if (percentage >= 60) {
      text = 'Mạnh';
      color = 'bg-yellow-500';
    } else if (percentage >= 40) {
      text = 'Trung bình';
      color = 'bg-orange-500';
    } else if (percentage >= 20) {
      text = 'Yếu';
      color = 'bg-red-500';
    }

    this.passwordStrength = {
      width: `${percentage}%`,
      text: text,
      color: color
    };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.toastService.error('Vui lòng kiểm tra lại các thông tin đã nhập.');
      return;
    }

    this.isLoading = true;
    const { name, username, email, password } = this.registerForm.value;
    const request: RegisterRequest = { name, username, email, password };

    this.authService.register(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.toastService.success(response.message || 'Đăng ký thành công! Vui lòng đăng nhập.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.error(err.error?.error || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    });
  }
}