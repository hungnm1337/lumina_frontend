import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ Thêm FormsModule
import { Chart, registerables } from 'chart.js';
import { StatisticService } from '../../../Services/Statistic/statistic.service';

@Component({
  selector: 'app-system-stats',
  standalone: true,
  imports: [CommonModule, FormsModule], // ✅ Thêm FormsModule vào imports
  templateUrl: './system-stats.component.html',
  styleUrl: './system-stats.component.scss'
})
export class SystemStatsComponent implements OnInit, AfterViewInit {

  // Data properties
  dashboardStats: any = null;
  revenueChartData: any = null;
  userGrowthData: any = null;
  planDistributionData: any = null;
  dailyAnalytics: any[] = [];

  // Chart instances
  private revenueChart?: Chart;
  private userGrowthChart?: Chart;
  private planDistributionChart?: Chart;

  // Loading states
  isLoading = true;
  selectedPeriod = '30'; // 30 ngày qua

  constructor(
    private statisticService: StatisticService
  ) {
    // Register Chart.js components
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  ngAfterViewInit(): void {
  }

  // ✅ Load tất cả dữ liệu
  loadAllData(): void {
    this.isLoading = true;

    // Load dashboard stats
    this.statisticService.getDashboardStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.dashboardStats = response.data;
        }
      },
      error: (error) => console.error('Error loading dashboard stats:', error)
    });

    // Load revenue chart
    const currentYear = new Date().getFullYear();
    this.statisticService.getRevenueChart(currentYear).subscribe({
      next: (response) => {
        if (response.success) {
          this.revenueChartData = response.data;
          setTimeout(() => this.createRevenueChart(), 100);
        }
      },
      error: (error) => console.error('Error loading revenue chart:', error)
    });

    // Load user growth chart
    this.statisticService.getUserGrowthChart(6).subscribe({
      next: (response) => {
        if (response.success) {
          this.userGrowthData = response.data;
          setTimeout(() => this.createUserGrowthChart(), 100);
        }
      },
      error: (error) => console.error('Error loading user growth:', error)
    });

    // Load plan distribution
    this.statisticService.getPlanDistribution().subscribe({
      next: (response) => {
        if (response.success) {
          this.planDistributionData = response.data;
          setTimeout(() => this.createPlanDistributionChart(), 100);
        }
      },
      error: (error) => console.error('Error loading plan distribution:', error)
    });

    // Load daily analytics
    this.statisticService.getDailyAnalytics(7).subscribe({
      next: (response) => {
        if (response.success) {
          this.dailyAnalytics = response.data;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading daily analytics:', error);
        this.isLoading = false;
      }
    });
  }

  // ✅ Biểu đồ Doanh thu
  createRevenueChart(): void {
    if (!this.revenueChartData) return;

    const ctx = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (ctx) {
      // Destroy existing chart
      if (this.revenueChart) {
        this.revenueChart.destroy();
      }

      this.revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.revenueChartData.labels,
          datasets: [{
            label: 'Doanh thu Pro',
            data: this.revenueChartData.data,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.parsed.y;
                  return value !== null
                    ? 'Doanh thu: ' + value.toLocaleString('vi-VN') + ' ₫'
                    : 'Doanh thu: 0 ₫';

                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => {
                  const numValue = value as number;
                  if (numValue >= 1000000) {
                    return (numValue / 1000000).toFixed(1) + ' tr';
                  } else if (numValue >= 1000) {
                    return (numValue / 1000).toFixed(0) + 'k';
                  }
                  return numValue.toLocaleString('vi-VN');
                }
              }
            }
          }
        }
      });
    }
  }

  // ✅ Biểu đồ Tăng trưởng người dùng
  createUserGrowthChart(): void {
    if (!this.userGrowthData) return;

    const ctx = document.getElementById('userGrowthChart') as HTMLCanvasElement;
    if (ctx) {
      // Destroy existing chart
      if (this.userGrowthChart) {
        this.userGrowthChart.destroy();
      }

      this.userGrowthChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.userGrowthData.labels,
          datasets: [
            {
              label: 'Người dùng Free',
              data: this.userGrowthData.freeUsers,
              backgroundColor: 'rgb(59, 130, 246)'
            },
            {
              label: 'Người dùng Pro',
              data: this.userGrowthData.proUsers,
              backgroundColor: 'rgb(168, 85, 247)'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  }

  // ✅ Biểu đồ Phân bổ gói dịch vụ
  createPlanDistributionChart(): void {
    if (!this.planDistributionData) return;

    const ctx = document.getElementById('planDistributionChart') as HTMLCanvasElement;
    if (ctx) {
      // Destroy existing chart
      if (this.planDistributionChart) {
        this.planDistributionChart.destroy();
      }

      // Màu sắc cho từng gói
      const colors = [
        'rgb(156, 163, 175)', // Free - Gray
        'rgb(59, 130, 246)',  // Pro 1M - Blue
        'rgb(34, 197, 94)',   // Pro 6M - Green
        'rgb(168, 85, 247)'   // Pro 12M - Purple
      ];

      this.planDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: this.planDistributionData.labels,
          datasets: [{
            data: this.planDistributionData.data,
            backgroundColor: colors.slice(0, this.planDistributionData.labels.length)
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }
  }

  // ✅ Format currency VNĐ
  formatCurrency(amount: number): string {
    if (amount >= 1000000000) {
      // >= 1 tỷ
      return (amount / 1000000000).toFixed(1) + ' tỷ';
    } else if (amount >= 1000000) {
      // >= 1 triệu
      return (amount / 1000000).toFixed(1) + ' tr';
    } else if (amount >= 1000) {
      // >= 1 nghìn
      return (amount / 1000).toFixed(0) + 'k';
    }
    return amount.toLocaleString('vi-VN') + ' đ';
  }

  // ✅ Format currency đầy đủ (cho tooltip)
  formatCurrencyFull(amount: number): string {
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  }

  // ✅ Format date
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    } else {
      const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 3600 * 24));
      return `${diffDays} ngày trước`;
    }
  }

  // ✅ Get trend class
  getTrendClass(trend: number): string {
    return trend >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  // ✅ Get trend icon
  getTrendIcon(trend: number): string {
    return trend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
  }

  // ✅ Export report
  exportReport(): void {
    alert('Chức năng xuất báo cáo đang được phát triển...');
  }

  // ✅ Change period
  onPeriodChange(event: any): void {
    this.selectedPeriod = event.target.value;
    // TODO: Reload data based on selected period
  }
}