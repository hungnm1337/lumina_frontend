import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../../Services/Payment/payment.service';
import { PackagesService, Package } from '../../../Services/Packages/packages.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-upgrade-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upgrade-modal.component.html',
  styleUrls: ['./upgrade-modal.component.scss'],
})
export class UpgradeModalComponent implements OnChanges {
  @Input() isVisible = false;
  @Input() skill: string = '';
  @Output() close = new EventEmitter<void>();

  isLoading = false;
  errorMessage = '';

  // Package selection
  packages: Package[] = [];
  selectedPackage: Package | null = null;
  isLoadingPackages = false;

  // Premium features list
  premiumFeatures = [
    'Unlimited bài thi 4 kĩ năng',
    'AI Scoring Speaking/Writing'

  ];

  constructor(
    private paymentService: PaymentService,
    private packagesService: PackagesService,
    private router: Router
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible && this.packages.length === 0) {
      this.loadPackages();
    }
  }

  loadPackages(): void {
    this.isLoadingPackages = true;
    this.errorMessage = '';

    this.packagesService.getActivePackages().subscribe({
      next: (packages) => {
        this.packages = packages;
        // Set first package as default selected
        if (packages.length > 0) {
          this.selectedPackage = packages[0];
        }
        this.isLoadingPackages = false;
      },
      error: (error) => {
        console.error('Error loading packages:', error);
        this.errorMessage = 'Không thể tải danh sách gói. Vui lòng thử lại.';
        this.isLoadingPackages = false;
      }
    });
  }

  selectPackage(pkg: Package): void {
    this.selectedPackage = pkg;
  }

  closeModal(): void {
    this.close.emit();
    this.errorMessage = '';
  }

  async handleUpgrade(): Promise<void> {
    // Check if a package is selected
    if (!this.selectedPackage) {
      this.errorMessage = 'Vui lòng chọn một gói Premium.';
      return;
    }

    // Check if user is logged in
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
        .createPaymentLink(
          this.selectedPackage.packageId!,
          this.selectedPackage.price!
        )
        .toPromise();

      if (response?.checkoutUrl) {
        // Redirect to PayOS checkout page
        window.location.href = response.checkoutUrl;
      } else {
        this.errorMessage = 'Không thể tạo link thanh toán. Vui lòng thử lại.';
      }
    } catch (error: any) {
      console.error('Error creating payment link:', error);

      // Handle 401 Unauthorized specifically
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
}
