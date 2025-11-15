import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50"
    >
      <div class="max-w-md w-full mx-4">
        <div class="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <!-- Success Icon -->
          <div class="mb-6">
            <div
              class="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
            >
              <svg
                class="w-12 h-12 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <!-- Success Message -->
          <h1 class="text-3xl font-bold text-gray-900 mb-4">
            Thanh Toán Thành Công! 🎉
          </h1>

          <p class="text-gray-600 mb-6">
            Bạn đã nâng cấp lên
            <span class="font-semibold text-blue-600">Premium</span> thành
            công!<br />
            Giờ bạn có thể truy cập unlimited tất cả các tính năng.
          </p>

          <!-- Premium Features -->
          <div
            class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 mb-6 text-left"
          >
            <p class="font-semibold text-gray-800 mb-3">✨ Bạn vừa mở khóa:</p>
            <ul class="space-y-2 text-sm text-gray-700">
              <li class="flex items-center gap-2">
                <span class="text-green-500">✓</span> Unlimited Reading &
                Listening
              </li>
              <li class="flex items-center gap-2">
                <span class="text-green-500">✓</span> Unlimited Speaking &
                Writing
              </li>
              <li class="flex items-center gap-2">
                <span class="text-green-500">✓</span> AI Scoring & Feedback
              </li>
              <li class="flex items-center gap-2">
                <span class="text-green-500">✓</span> AI Vocabulary Generator
              </li>
            </ul>
          </div>

          <!-- Actions -->
          <div class="space-y-3">
            <button
              (click)="startPractice()"
              class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 
                     text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            >
              Bắt đầu luyện tập ngay! 🚀
            </button>

            <button
              (click)="goToProfile()"
              class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl
                     transition-colors duration-200"
            >
              Xem hồ sơ Premium
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PaymentSuccessComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    // Optional: Refresh user subscription status
    this.refreshSubscriptionStatus();
  }

  startPractice(): void {
    this.router.navigate(['/homepage/user-dashboard/exams']);
  }

  goToProfile(): void {
    this.router.navigate(['/homepage/user-dashboard/profile']);
  }

  private refreshSubscriptionStatus(): void {
    // Force reload user data to update Premium status
    // You might want to call a service here to refresh user info
    console.log('Payment successful - refreshing subscription status');
  }
}
