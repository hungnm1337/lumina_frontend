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
import { UploadService } from '../../../Services/Upload/upload.service';
import { QuotaService } from '../../../Services/Quota/quota.service';
import { SubscriptionStatus } from '../../../Interfaces/quota.interfaces';

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
  @ViewChild('cropCanvas') cropCanvas!: ElementRef<HTMLCanvasElement>;

  loading = signal(false);
  passwordLoading = signal(false);
  editing = signal(false);
  profile = signal<UserDto | null>(null);
  subscriptionStatus: SubscriptionStatus | null = null;
  avatarStatus = '';
  passwordStatus = '';
  passwordMessage = '';

  // Custom canvas-based cropper states
  showCropperModal = false;
  uploadingAvatar = false;

  // Image and canvas properties
  sourceImage: HTMLImageElement | null = null;
  scale = 1.5;
  rotation = 0;
  offsetX = 0;
  offsetY = 0;

  // Drag properties
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;
  dragStartOffsetX = 0;
  dragStartOffsetY = 0;

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
    private router: Router,
    private uploadService: UploadService,
    private quotaService: QuotaService
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
      this.loadSubscriptionStatus();
    });
  }

  loadSubscriptionStatus(): void {
    this.quotaService.getSubscriptionStatus().subscribe({
      next: (status) => {
        this.subscriptionStatus = status;
      },
      error: (err) => {
        console.error('Error loading subscription status:', err);
      },
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
      this.toast.error('Vui lòng chọn file ảnh');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      this.toast.error('File quá lớn, vui lòng chọn file nhỏ hơn 5MB');
      return;
    }

    // Load image and show cropper
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        this.scale = 1.5;
        this.rotation = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.showCropperModal = true;
        document.body.style.overflow = 'hidden';

        // Draw on next tick to ensure canvas is ready
        setTimeout(() => this.drawCanvas(), 0);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  drawCanvas(): void {
    if (!this.sourceImage || !this.cropCanvas) return;

    const canvas = this.cropCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (display size)
    const containerSize = 400; // Size of the crop area
    canvas.width = containerSize;
    canvas.height = containerSize;

    // Clear canvas
    ctx.clearRect(0, 0, containerSize, containerSize);

    // Save context state
    ctx.save();

    // Translate to center
    ctx.translate(containerSize / 2, containerSize / 2);

    // Apply rotation
    ctx.rotate((this.rotation * Math.PI) / 180);

    // Apply scale
    ctx.scale(this.scale, this.scale);

    // Calculate image dimensions to fit canvas
    const imgWidth = this.sourceImage.width;
    const imgHeight = this.sourceImage.height;
    const scale = Math.max(containerSize / imgWidth, containerSize / imgHeight);
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;

    // Draw image with offset (for dragging)
    ctx.drawImage(
      this.sourceImage,
      -scaledWidth / 2 + this.offsetX,
      -scaledHeight / 2 + this.offsetY,
      scaledWidth,
      scaledHeight
    );

    // Restore context
    ctx.restore();

    // Draw circular crop overlay
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(
      containerSize / 2,
      containerSize / 2,
      containerSize / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  // Drag handlers
  onCanvasMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartOffsetX = this.offsetX;
    this.dragStartOffsetY = this.offsetY;
    event.preventDefault();
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;

    this.offsetX = this.dragStartOffsetX + deltaX / this.scale;
    this.offsetY = this.dragStartOffsetY + deltaY / this.scale;

    this.drawCanvas();
  }

  onCanvasMouseUp(): void {
    this.isDragging = false;
  }

  // Touch handlers for mobile
  onCanvasTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.isDragging = true;
      this.dragStartX = event.touches[0].clientX;
      this.dragStartY = event.touches[0].clientY;
      this.dragStartOffsetX = this.offsetX;
      this.dragStartOffsetY = this.offsetY;
      event.preventDefault();
    }
  }

  onCanvasTouchMove(event: TouchEvent): void {
    if (!this.isDragging || event.touches.length !== 1) return;

    const deltaX = event.touches[0].clientX - this.dragStartX;
    const deltaY = event.touches[0].clientY - this.dragStartY;

    this.offsetX = this.dragStartOffsetX + deltaX / this.scale;
    this.offsetY = this.dragStartOffsetY + deltaY / this.scale;

    this.drawCanvas();
    event.preventDefault();
  }

  onCanvasTouchEnd(): void {
    this.isDragging = false;
  }

  // Zoom functions
  zoomIn(): void {
    if (this.scale < 3) {
      this.scale += 0.1;
      this.drawCanvas();
    }
  }

  zoomOut(): void {
    if (this.scale > 0.5) {
      this.scale -= 0.1;
      this.drawCanvas();
    }
  }

  onWheelZoom(event: WheelEvent): void {
    event.preventDefault();

    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  onZoomSlider(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.scale = parseInt(target.value) / 100;
    this.drawCanvas();
  }

  resetPosition(): void {
    this.scale = 1.5;
    this.offsetX = 0;
    this.offsetY = 0;
    this.rotation = 0;
    this.drawCanvas();
  }

  rotateImage(): void {
    this.rotation = (this.rotation + 90) % 360;
    this.drawCanvas();
  }

  async cropAndUpload(): Promise<void> {
    if (!this.sourceImage || !this.cropCanvas) {
      this.toast.error('Không có ảnh để upload');
      return;
    }

    this.uploadingAvatar = true;
    this.avatarStatus = 'Đang upload ảnh...';

    try {
      // Create final cropped image at 256x256
      const finalSize = 256;
      const canvas = document.createElement('canvas');
      canvas.width = finalSize;
      canvas.height = finalSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');

      // Draw the same way as preview but at final size
      ctx.save();
      ctx.translate(finalSize / 2, finalSize / 2);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.scale(this.scale, this.scale);

      const imgWidth = this.sourceImage.width;
      const imgHeight = this.sourceImage.height;
      const scale = Math.max(finalSize / imgWidth, finalSize / imgHeight);
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;

      ctx.drawImage(
        this.sourceImage,
        -scaledWidth / 2 + this.offsetX * (finalSize / 400),
        -scaledHeight / 2 + this.offsetY * (finalSize / 400),
        scaledWidth,
        scaledHeight
      );

      ctx.restore();

      // Apply circular mask
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      ctx.arc(finalSize / 2, finalSize / 2, finalSize / 2, 0, Math.PI * 2);
      ctx.fill();

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png', 0.95);
      });

      const file = new File([blob], 'avatar.png', { type: 'image/png' });

      // Upload to Cloudinary
      const response = await this.uploadService.uploadFile(file).toPromise();

      if (response && response.url) {
        this.form.avatarUrl = response.url;
        const currentProfile = this.profile();
        if (currentProfile) {
          this.profile.set({ ...currentProfile, avatarUrl: response.url });
        }

        await this.saveProfileAfterUpload();

        // Update AuthService currentUser to reflect in header
        this.authService.updateCurrentUser({ avatarUrl: response.url });

        this.avatarStatus = 'Đã cập nhật ảnh đại diện';
        this.toast.success('Upload ảnh thành công!');
        this.closeCropperModal();
      } else {
        throw new Error('Upload failed: No URL returned');
      }
    } catch (error) {
      console.error('Upload avatar error:', error);
      this.avatarStatus = 'Upload thất bại';
      this.toast.error('Upload ảnh thất bại, vui lòng thử lại');
    } finally {
      this.uploadingAvatar = false;
    }
  }

  closeCropperModal(): void {
    this.showCropperModal = false;
    this.sourceImage = null;
    this.scale = 1.5;
    this.rotation = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    document.body.style.overflow = '';
    if (this.avatarInput) {
      this.avatarInput.nativeElement.value = '';
    }
  }

  private async saveProfileAfterUpload(): Promise<void> {
    try {
      const updatedUser = await this.userService
        .updateProfile(this.form)
        .toPromise();
      if (updatedUser) {
        this.profile.set(updatedUser);
      }
    } catch (error) {
      console.error('Auto-save profile error:', error);
      this.toast.warning('Ảnh đã upload nhưng lưu profile thất bại');
    }
  }
}
