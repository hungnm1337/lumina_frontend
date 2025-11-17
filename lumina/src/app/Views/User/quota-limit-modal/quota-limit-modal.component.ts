import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../../Services/Payment/payment.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-quota-limit-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quota-limit-modal.component.html',
  styleUrl: './quota-limit-modal.component.scss',
})
export class QuotaLimitModalComponent {
  @Input() isVisible = false;
  @Input() skill: string = ''; // 'reading', 'listening', 'speaking', 'writing'
  @Input() message: string = '';
  @Output() close = new EventEmitter<void>();

  isLoading = false;
  errorMessage = '';

  // Package details
  premiumPackage = {
    id: 1,
    name: 'Premium Monthly',
    price: 3000,
    features: [
      'Unlimited bài thi 4 kĩ năng',
      'AI Scoring Speaking/Writing',
      'AI Generate từ vựng theo chủ đề',
      'Không giới hạn số lượng bài thi',
      'Truy cập toàn bộ tài liệu',
    ],
  };

  constructor(private paymentService: PaymentService, private router: Router) {}

  closeModal(): void {
    this.close.emit();
    this.errorMessage = '';
  }

  async handleUpgrade(): Promise<void> {
    const token = localStorage.getItem('lumina_token');
    if (!token) {
      this.errorMessage = 'Vui lòng đăng nhập để nâng cấp Premium.';
      setTimeout(() => {
        this.closeModal();
        this.router.navigate(['/login']);
      }, 2000);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await this.paymentService
        .createPaymentLink(this.premiumPackage.id, this.premiumPackage.price)
        .toPromise();

      if (response?.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      } else {
        this.errorMessage = 'Không thể tạo link thanh toán. Vui lòng thử lại.';
      }
    } catch (error: any) {
      console.error('Error creating payment link:', error);

      if (error?.status === 401) {
        this.errorMessage =
          'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        setTimeout(() => {
          this.closeModal();
          localStorage.removeItem('lumina_token');
          localStorage.removeItem('lumina_user');
          this.router.navigate(['/login']);
        }, 2000);
      } else {
        this.errorMessage =
          error?.error?.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }

  getSkillName(): string {
    const skillNames: { [key: string]: string } = {
      reading: 'Reading',
      listening: 'Listening',
      speaking: 'Speaking',
      writing: 'Writing',
    };
    return skillNames[this.skill.toLowerCase()] || this.skill;
  }
}
