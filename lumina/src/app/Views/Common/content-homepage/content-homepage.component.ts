import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from "../footer/footer.component";
import { EventPreviewComponent } from '../../User/event-preview/event-preview.component';
import { Router } from '@angular/router';
import { UserSlideDashboardComponent } from '../../User/slide-dashboard/dashboardslide.component';
import { PackagesService, Package } from '../../../Services/Packages/packages.service';

interface PackageWithDetails extends Package {
  level?: string;
  targetScore?: string;
  description?: string;
  features?: string[];
  originalPrice?: number;
  color?: string;
}
import { LeaderboardPreviewComponent } from '../../User/leaderboard-preview/leaderboard-preview.component';

@Component({
  selector: 'app-content-homepage',
  standalone: true,
  imports: [FooterComponent, EventPreviewComponent, UserSlideDashboardComponent, LeaderboardPreviewComponent],
  templateUrl: './content-homepage.component.html',
  styleUrl: './content-homepage.component.scss'
})
export class ContentHomepageComponent implements OnInit {
  packages: PackageWithDetails[] = [];
  isLoading = false;

  // Package configuration based on index
  private packageConfigs = [
    {
      level: 'Cơ bản',
      targetScore: '300-500',
      description: 'Dành cho người mới bắt đầu',
      features: [
        'Nền tảng ngữ pháp cơ bản',
        '1000+ từ vựng thiết yếu',
        'Luyện nghe cơ bản',
        '5 bài thi thử'
      ],
      color: 'green',
      originalPriceMultiplier: 2
    },
    {
      level: 'Trung cấp',
      targetScore: '500-750',
      description: 'Nâng cao kỹ năng toàn diện',
      features: [
        'Ngữ pháp nâng cao',
        '3000+ từ vựng chuyên ngành',
        'Luyện nghe chuyên sâu',
        '10 bài thi thử',
        'Hỗ trợ 1-1 với giáo viên'
      ],
      color: 'blue',
      originalPriceMultiplier: 2
    },
    {
      level: 'Nâng cao',
      targetScore: '750-990',
      description: 'Chinh phục điểm cao',
      features: [
        'Chiến lược thi chuyên nghiệp',
        '5000+ từ vựng academic',
        'Luyện tập intensive',
        '20 bài thi thử',
        'Mentor cá nhân'
      ],
      color: 'purple',
      originalPriceMultiplier: 2
    }
  ];

  constructor(
    private router: Router,
    private packagesService: PackagesService
  ) {}

  ngOnInit() {
    this.loadPackages();
  }

  loadPackages() {
    this.isLoading = true;
    this.packagesService.getActivePackages().subscribe({
      next: (data) => {
        console.log('Packages loaded:', data);
        if (data && Array.isArray(data) && data.length > 0) {
          // Lấy 3 gói đầu tiên và map với config
          this.packages = data.slice(0, 3).map((pkg, index) => {
            const config = this.packageConfigs[index] || this.packageConfigs[0];
            return {
              ...pkg,
              level: config.level,
              targetScore: config.targetScore,
              description: config.description,
              features: config.features,
              originalPrice: pkg.price ? Math.round(pkg.price * config.originalPriceMultiplier) : 0,
              color: config.color
            };
          });
          console.log('Packages displayed:', this.packages);
        } else {
          console.warn('No packages found or empty array');
          this.packages = [];
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading packages:', err);
        console.error('Error details:', err.error || err.message);
        this.packages = [];
        this.isLoading = false;
      }
    });
  }

  formatPrice(price: number | null | undefined): string {
    if (price === null || price === undefined || price === 0) return '0';
    // Format as "299K" instead of full currency
    const priceInK = Math.round(price / 1000);
    return `${priceInK}K`;
  }

  formatPriceFull(price: number | null | undefined): string {
    if (price === null || price === undefined || price === 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  formatDuration(days: number | null | undefined): string {
    if (days === null || days === undefined || days === 0) return '';
    if (days >= 30) {
      const months = Math.floor(days / 30);
      return `${months} tháng`;
    }
    return `${days} ngày`;
  }

  getPackageHeaderClass(color: string | undefined): string {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'blue':
        return 'bg-blue-500';
      case 'purple':
        return 'bg-purple-500';
      default:
        return 'bg-blue-500';
    }
  }

  getPackageCheckColor(color: string | undefined): string {
    switch (color) {
      case 'green':
        return 'text-green-500';
      case 'blue':
        return 'text-blue-500';
      case 'purple':
        return 'text-purple-500';
      default:
        return 'text-blue-500';
    }
  }

  getPackageTextColor(color: string | undefined): string {
    switch (color) {
      case 'green':
        return 'text-green-500';
      case 'blue':
        return 'text-blue-500';
      case 'purple':
        return 'text-purple-500';
      default:
        return 'text-blue-500';
    }
  }
}
