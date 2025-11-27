import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../Services/Auth/auth.service';
import { ToastService } from '../../../Services/Toast/toast.service';
import {
  RegisterRequest,
  VerifyRegistrationRequest,
  ResendRegistrationOtpRequest,
} from '../../../Interfaces/auth.interfaces';
import { HeaderComponent } from '../../Common/header/header.component';

/**
 * Custom validator to check that two fields match.
 */
export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
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
    confirmPassword.setErrors(null);
    return null;
  }
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HeaderComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  otpForm!: FormGroup;

  currentStep: 'register' | 'verify' = 'register';
  isLoading = false;
  passwordVisible = false;
  confirmPasswordVisible = false;

  // OTP related
  otpInputs: string[] = ['', '', '', '', '', ''];
  countdown = 600; // 10 minutes in seconds
  countdownInterval: any;
  canResend = false;
  resendCooldown = 60; // 1 minute cooldown for resend
  resendCountdown = 0;
  resendInterval: any;

  // Store registration data for verification
  registrationData: RegisterRequest | null = null;

  passwordStrength = {
    width: '0%',
    text: 'Yếu',
    color: 'bg-red-500',
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.maxLength(50)]],
        username: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(20),
            Validators.pattern('^[a-zA-Z0-9_.-]+$'),
          ],
        ],
        email: [
          '',
          [Validators.required, Validators.email, Validators.maxLength(50)],
        ],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.maxLength(100),
            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/
            ),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: passwordMatchValidator,
      }
    );

    this.otpForm = this.fb.group({
      otp0: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      otp1: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      otp2: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      otp3: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      otp4: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      otp5: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
    });

    this.f['password'].valueChanges.subscribe((value) => {
      this.updatePasswordStrength(value || '');
    });
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    this.stopResendCooldown();
  }

  get f() {
    return this.registerForm.controls;
  }

  get formattedCountdown(): string {
    const minutes = Math.floor(this.countdown / 60);
    const seconds = this.countdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

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
      color: color,
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

    // Store for verification step (we'll send these only after OTP verified)
    this.registrationData = { name, username, email, password };

    // Step 1: request OTP (backend will validate email & username availability)
    this.authService.register({ email, username }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.toastService.success(response.message);
        this.currentStep = 'verify';
        this.startCountdown();
        // Auto focus first OTP input
        setTimeout(() => {
          const firstInput = document.getElementById('otp-0');
          if (firstInput) firstInput.focus();
        }, 100);
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.error(
          err.error?.error || 'Đã có lỗi xảy ra. Vui lòng thử lại.'
        );
      },
    });
  }

  onOtpInput(event: any, index: number): void {
    const input = event.target;
    const value = input.value;

    // Only allow single digit
    if (value.length > 1) {
      input.value = value.charAt(0);
      this.otpInputs[index] = input.value;
    } else {
      this.otpInputs[index] = value;
    }

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    // Auto submit when all filled
    if (index === 5 && value) {
      const allFilled = this.otpInputs.every((v) => v.length === 1);
      if (allFilled) {
        this.verifyOtp();
      }
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    // Handle backspace
    if (event.key === 'Backspace' && !this.otpInputs[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        this.otpInputs[index - 1] = '';
      }
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digits.length === 6) {
      for (let i = 0; i < 6; i++) {
        this.otpInputs[i] = digits[i];
        const input = document.getElementById(`otp-${i}`) as HTMLInputElement;
        if (input) input.value = digits[i];
      }

      // Focus last input
      const lastInput = document.getElementById('otp-5');
      if (lastInput) lastInput.focus();

      // Auto verify
      this.verifyOtp();
    }
  }

  verifyOtp(): void {
    const otpCode = this.otpInputs.join('');

    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      this.toastService.error('Vui lòng nhập đầy đủ mã OTP (6 chữ số)');
      return;
    }

    if (!this.registrationData) {
      this.toastService.error('Đã xảy ra lỗi. Vui lòng đăng ký lại.');
      this.currentStep = 'register';
      return;
    }

    this.isLoading = true;

    const request: VerifyRegistrationRequest = {
      email: this.registrationData.email,
      otpCode: otpCode,
      name: this.registrationData.name,
      username: this.registrationData.username,
      password: this.registrationData.password,
    };

    this.authService.verifyRegistration(request).subscribe({
      next: (response) => {
        console.log('✅ Verify OTP Response:', response);
        this.isLoading = false;
        this.stopCountdown();

        // AuthService đã tự động set session và update currentUser$
        this.toastService.success(response.message + ' Đang chuyển hướng...');

        // Navigate based on role (AuthService sẽ tự detect)
        setTimeout(() => {
          this.authService.navigateByRole();
        }, 1500);
      },
      error: (err) => {
        this.isLoading = false;
        const errorMessage =
          err.error?.error || 'Mã OTP không hợp lệ. Vui lòng thử lại.';
        this.toastService.error(errorMessage);

        // Clear OTP inputs
        this.otpInputs = ['', '', '', '', '', ''];
        for (let i = 0; i < 6; i++) {
          const input = document.getElementById(`otp-${i}`) as HTMLInputElement;
          if (input) input.value = '';
        }

        // Focus first input
        const firstInput = document.getElementById('otp-0');
        if (firstInput) firstInput.focus();
      },
    });
  }

  resendOtp(): void {
    if (!this.canResend || this.resendCountdown > 0 || !this.registrationData) {
      return;
    }

    this.isLoading = true;

    const request: ResendRegistrationOtpRequest = {
      email: this.registrationData.email,
    };

    this.authService.resendRegistrationOtp(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.toastService.success(response.message);

        // Reset countdown
        this.stopCountdown();
        this.countdown = 600; // Reset to 10 minutes
        this.startCountdown();

        // Start resend cooldown
        this.startResendCooldown();

        // Clear OTP inputs
        this.otpInputs = ['', '', '', '', '', ''];
        for (let i = 0; i < 6; i++) {
          const input = document.getElementById(`otp-${i}`) as HTMLInputElement;
          if (input) input.value = '';
        }

        // Focus first input
        const firstInput = document.getElementById('otp-0');
        if (firstInput) firstInput.focus();
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.error(
          err.error?.error || 'Không thể gửi lại mã OTP. Vui lòng thử lại.'
        );
      },
    });
  }

  backToRegister(): void {
    this.currentStep = 'register';
    this.stopCountdown();
    this.stopResendCooldown();
    this.otpInputs = ['', '', '', '', '', ''];
    this.registrationData = null;
  }

  private startCountdown(): void {
    this.canResend = false;
    this.countdownInterval = setInterval(() => {
      this.countdown--;

      if (this.countdown <= 0) {
        this.stopCountdown();
        this.canResend = true;
        this.toastService.error('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private startResendCooldown(): void {
    this.canResend = false;
    this.resendCountdown = this.resendCooldown;

    this.resendInterval = setInterval(() => {
      this.resendCountdown--;

      if (this.resendCountdown <= 0) {
        this.stopResendCooldown();
        this.canResend = true;
      }
    }, 1000);
  }

  private stopResendCooldown(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
      this.resendInterval = null;
    }
  }

  get hasEmptyOtpInputs(): boolean {
    return this.otpInputs.some((v) => !v);
  }
}
