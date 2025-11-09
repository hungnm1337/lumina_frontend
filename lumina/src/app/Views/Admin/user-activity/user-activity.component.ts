import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleAnalyticsService } from '../../../Services/Analytics/google-analytics.service';
import { Ga4DataService } from '../../../Services/Analytics/ga4-data.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-user-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-activity.component.html',
  styleUrl: './user-activity.component.scss'
})
export class UserActivityComponent implements OnInit {

  isLoading = true;
  errorMessage = '';

  // Key metrics
  keyMetrics = {
    totalUsers: 0,
    newUsers: 0,
    sessions: 0,
    pageViews: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    activeUsersNow: 0
  };

  // Top pages
  topPages: any[] = [];

  // Traffic sources
  trafficSources: any[] = [];

  // Devices
  devices: any[] = [];

  // Countries
  countries: any[] = [];

  // Daily traffic
  dailyTraffic: any[] = [];

  // Browsers
  browsers: any[] = [];

  constructor(
    private analyticsService: GoogleAnalyticsService,
    private ga4DataService: Ga4DataService
  ) {}

  ngOnInit(): void {
    this.analyticsService.trackEvent('view_user_activity', {
      event_category: 'Admin',
      event_label: 'User Activity Page'
    });

    this.loadAllData();
  }

  loadAllData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Dùng forkJoin để gọi tất cả API cùng lúc
    forkJoin({
      keyMetrics: this.ga4DataService.getKeyMetrics(),
      realtime: this.ga4DataService.getRealtimeUsers(),
      topPages: this.ga4DataService.getTopPages(),
      trafficSources: this.ga4DataService.getTrafficSources(),
      devices: this.ga4DataService.getDeviceStats(),
      countries: this.ga4DataService.getCountryStats(),
      dailyTraffic: this.ga4DataService.getDailyTraffic(),
      browsers: this.ga4DataService.getBrowserStats()
    }).subscribe({
      next: (results) => {
        // Key metrics
        if (results.keyMetrics.success) {
          this.keyMetrics = { ...this.keyMetrics, ...results.keyMetrics.data };
        }

        // Realtime users
        if (results.realtime.success) {
          this.keyMetrics.activeUsersNow = results.realtime.data.activeUsers;
        }

        // Top pages
        if (results.topPages.success) {
          this.topPages = results.topPages.data;
        }

        // Traffic sources
        if (results.trafficSources.success) {
          this.trafficSources = results.trafficSources.data;
        }

        // Devices
        if (results.devices.success) {
          this.devices = results.devices.data;
        }

        // Countries
        if (results.countries.success) {
          this.countries = results.countries.data;
        }

        // Daily traffic
        if (results.dailyTraffic.success) {
          this.dailyTraffic = results.dailyTraffic.data;
        }

        // Browsers
        if (results.browsers.success) {
          this.browsers = results.browsers.data;
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error loading analytics data:', err);
        this.errorMessage = 'Không thể tải dữ liệu analytics. Vui lòng thử lại sau.';
        this.isLoading = false;
      }
    });
  }

  // Format duration (seconds → mm:ss)
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Format date 
  formatDate(dateStr: string): string {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
  }

  // Get device icon
  getDeviceIcon(device: string): string {
    switch (device.toLowerCase()) {
      case 'desktop': return '💻';
      case 'mobile': return '📱';
      case 'tablet': return '📲';
      default: return '🖥️';
    }
  }

  // Get max users for chart scaling 
  getMaxUsers(): number {
    if (this.dailyTraffic.length === 0) return 1;
    return Math.max(...this.dailyTraffic.map(d => d.users));
  }

  // Refresh data
  refreshData(): void {
    this.analyticsService.trackEvent('refresh_analytics', {
      event_category: 'Admin',
      event_label: 'Refresh User Activity Data'
    });
    this.loadAllData();
  }
}
